import fetch from 'node-fetch'

const OXAPAY_API_URL = 'https://api.oxapay.com/merchants'

/**
 * OxaPay Crypto Payment Service
 * Handles crypto payment invoice creation and webhook processing
 */
class OxaPayService {
  constructor() {
    this.apiKey = process.env.OXAPAY_API_KEY
    this.callbackUrl = process.env.OXAPAY_CALLBACK_URL || `${process.env.BACKEND_URL}/api/oxapay/webhook`
    this.returnUrl = process.env.OXAPAY_RETURN_URL || `${process.env.FRONTEND_URL}/wallet?payment=success`
  }

  /**
   * Create a crypto payment invoice
   * @param {Object} params - Invoice parameters
   * @param {number} params.amount - Payment amount in USD
   * @param {string} params.userId - User ID for tracking
   * @param {string} params.orderId - Unique order/transaction ID
   * @param {string} params.description - Payment description
   * @param {string} params.currency - Crypto currency (optional, defaults to user choice)
   * @returns {Promise<Object>} - OxaPay invoice response
   */
  async createInvoice({ amount, userId, orderId, description, currency }) {
    if (!this.apiKey) {
      throw new Error('OxaPay API key not configured')
    }

    const payload = {
      merchant: this.apiKey,
      amount: parseFloat(amount),
      currency: currency || 'USDT', // Default to USDT if not specified
      orderId: orderId,
      description: description || `Deposit for user ${userId}`,
      callbackUrl: this.callbackUrl,
      returnUrl: this.returnUrl,
      feePaidByPayer: 1, // Customer pays the blockchain fee
      lifeTime: 60 // Invoice expires in 60 minutes
    }

    console.log('[OxaPay] Creating invoice:', { orderId, amount, currency: payload.currency })

    try {
      const response = await fetch(`${OXAPAY_API_URL}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('[OxaPay] Invoice response:', data)

      if (data.result !== 100) {
        throw new Error(data.message || 'Failed to create OxaPay invoice')
      }

      return {
        success: true,
        trackId: data.trackId,
        payLink: data.payLink,
        address: data.address,
        expiredAt: data.expiredAt,
        amount: data.amount,
        currency: data.currency
      }
    } catch (error) {
      console.error('[OxaPay] Create invoice error:', error.message)
      throw error
    }
  }

  /**
   * Get payment status by track ID
   * @param {string} trackId - OxaPay track ID
   * @returns {Promise<Object>} - Payment status
   */
  async getPaymentStatus(trackId) {
    if (!this.apiKey) {
      throw new Error('OxaPay API key not configured')
    }

    try {
      const response = await fetch(`${OXAPAY_API_URL}/inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchant: this.apiKey,
          trackId: trackId
        })
      })

      const data = await response.json()
      console.log('[OxaPay] Payment status:', data)

      return {
        success: data.result === 100,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        payAmount: data.payAmount,
        payCurrency: data.payCurrency,
        trackId: data.trackId,
        orderId: data.orderId
      }
    } catch (error) {
      console.error('[OxaPay] Get status error:', error.message)
      throw error
    }
  }

  /**
   * Get supported cryptocurrencies
   * @returns {Promise<Array>} - List of supported currencies
   */
  async getSupportedCurrencies() {
    try {
      const response = await fetch(`${OXAPAY_API_URL}/allowedCoins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchant: this.apiKey
        })
      })

      const data = await response.json()
      
      if (data.result === 100 && data.allowed) {
        return data.allowed
      }
      
      // Return default supported currencies if API fails
      return ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'TRX', 'BNB']
    } catch (error) {
      console.error('[OxaPay] Get currencies error:', error.message)
      return ['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'TRX', 'BNB']
    }
  }

  /**
   * Validate webhook signature/data
   * @param {Object} webhookData - Webhook payload from OxaPay
   * @returns {boolean} - Whether the webhook is valid
   */
  validateWebhook(webhookData) {
    // OxaPay sends status updates via webhook
    // Basic validation - check required fields exist
    if (!webhookData.trackId || !webhookData.status) {
      return false
    }
    return true
  }

  /**
   * Parse webhook status to internal status
   * @param {string} oxapayStatus - OxaPay status string
   * @returns {string} - Internal status
   */
  parseWebhookStatus(oxapayStatus) {
    const statusMap = {
      'Waiting': 'Pending',
      'Confirming': 'Processing',
      'Confirmed': 'Completed',
      'Paid': 'Completed',
      'Sending': 'Processing',
      'Complete': 'Completed',
      'Failed': 'Failed',
      'Expired': 'Expired',
      'Refunded': 'Refunded'
    }
    return statusMap[oxapayStatus] || 'Pending'
  }
}

export default new OxaPayService()
