import express from 'express'
import oxapayService from '../services/oxapayService.js'
import Transaction from '../models/Transaction.js'
import Wallet from '../models/Wallet.js'
import User from '../models/User.js'

const router = express.Router()

/**
 * POST /api/oxapay/create-invoice
 * Create a crypto payment invoice for deposit
 */
router.post('/create-invoice', async (req, res) => {
  try {
    const { userId, amount, currency, description } = req.body

    console.log('[OxaPay] Create invoice request:', { userId, amount, currency })

    if (!userId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and amount are required' 
      })
    }

    if (parseFloat(amount) < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Minimum deposit amount is $10' 
      })
    }

    // Verify user exists - handle invalid ObjectId
    let user
    try {
      user = await User.findById(userId)
    } catch (dbError) {
      console.error('[OxaPay] Invalid user ID format:', userId)
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      })
    }
    
    if (!user) {
      console.error('[OxaPay] User not found:', userId)
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      })
    }

    // Generate unique order ID
    const orderId = `DEP-${userId.slice(-6)}-${Date.now()}`

    // Create pending transaction record
    const transaction = await Transaction.create({
      userId,
      type: 'Deposit',
      amount: parseFloat(amount),
      paymentMethod: 'Crypto',
      status: 'Pending',
      transactionRef: orderId,
      notes: `Crypto deposit via OxaPay - ${currency || 'USDT'}`
    })

    // Create OxaPay invoice
    const invoice = await oxapayService.createInvoice({
      amount: parseFloat(amount),
      userId,
      orderId,
      description: description || `Deposit to Concorddex wallet`,
      currency: currency || 'USDT'
    })

    // Update transaction with OxaPay track ID
    transaction.externalRef = invoice.trackId
    transaction.metadata = {
      oxapayTrackId: invoice.trackId,
      payLink: invoice.payLink,
      cryptoCurrency: invoice.currency,
      cryptoAmount: invoice.amount
    }
    await transaction.save()

    console.log('[OxaPay] Invoice created:', { orderId, trackId: invoice.trackId })

    res.json({
      success: true,
      message: 'Payment invoice created',
      data: {
        trackId: invoice.trackId,
        payLink: invoice.payLink,
        address: invoice.address,
        amount: invoice.amount,
        currency: invoice.currency,
        expiredAt: invoice.expiredAt,
        transactionId: transaction._id
      }
    })
  } catch (error) {
    console.error('[OxaPay] Create invoice error:', error.message)
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create payment invoice' 
    })
  }
})

/**
 * POST /api/oxapay/webhook
 * Handle OxaPay payment status webhooks
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body
    console.log('[OxaPay Webhook] Received:', webhookData)

    // Validate webhook
    if (!oxapayService.validateWebhook(webhookData)) {
      console.warn('[OxaPay Webhook] Invalid webhook data')
      return res.status(400).json({ status: 'invalid' })
    }

    const { trackId, status, amount, orderId } = webhookData

    // Find the transaction by external reference (trackId) or orderId
    let transaction = await Transaction.findOne({ 
      $or: [
        { externalRef: trackId },
        { transactionRef: orderId }
      ]
    })

    if (!transaction) {
      console.warn('[OxaPay Webhook] Transaction not found:', { trackId, orderId })
      return res.status(404).json({ status: 'transaction_not_found' })
    }

    // Parse OxaPay status to internal status
    const internalStatus = oxapayService.parseWebhookStatus(status)
    
    console.log('[OxaPay Webhook] Processing:', { 
      trackId, 
      oxapayStatus: status, 
      internalStatus,
      transactionId: transaction._id 
    })

    // Update transaction status
    const previousStatus = transaction.status
    transaction.status = internalStatus
    transaction.metadata = {
      ...transaction.metadata,
      oxapayStatus: status,
      lastWebhookAt: new Date(),
      paidAmount: amount
    }
    await transaction.save()

    // If payment is completed and wasn't already completed, credit the wallet
    if (internalStatus === 'Completed' && previousStatus !== 'Completed') {
      const wallet = await Wallet.findOne({ userId: transaction.userId })
      
      if (wallet) {
        wallet.balance += transaction.amount
        await wallet.save()
        console.log('[OxaPay Webhook] Wallet credited:', { 
          userId: transaction.userId, 
          amount: transaction.amount,
          newBalance: wallet.balance 
        })
      } else {
        // Create wallet if doesn't exist
        await Wallet.create({
          userId: transaction.userId,
          balance: transaction.amount
        })
        console.log('[OxaPay Webhook] New wallet created with balance:', transaction.amount)
      }
    }

    res.json({ status: 'ok' })
  } catch (error) {
    console.error('[OxaPay Webhook] Error:', error.message)
    res.status(500).json({ status: 'error', message: error.message })
  }
})

/**
 * GET /api/oxapay/status/:trackId
 * Check payment status by track ID
 */
router.get('/status/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params

    const status = await oxapayService.getPaymentStatus(trackId)
    
    // Also get transaction from DB
    const transaction = await Transaction.findOne({ externalRef: trackId })

    res.json({
      success: true,
      data: {
        ...status,
        transaction: transaction ? {
          _id: transaction._id,
          status: transaction.status,
          amount: transaction.amount,
          createdAt: transaction.createdAt
        } : null
      }
    })
  } catch (error) {
    console.error('[OxaPay] Get status error:', error.message)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get payment status' 
    })
  }
})

/**
 * GET /api/oxapay/currencies
 * Get supported cryptocurrencies
 */
router.get('/currencies', async (req, res) => {
  try {
    const currencies = await oxapayService.getSupportedCurrencies()
    
    // Return with display names and icons
    const currencyList = [
      { code: 'USDT', name: 'Tether (USDT)', icon: '💵' },
      { code: 'BTC', name: 'Bitcoin (BTC)', icon: '₿' },
      { code: 'ETH', name: 'Ethereum (ETH)', icon: 'Ξ' },
      { code: 'USDC', name: 'USD Coin (USDC)', icon: '💲' },
      { code: 'LTC', name: 'Litecoin (LTC)', icon: 'Ł' },
      { code: 'TRX', name: 'Tron (TRX)', icon: '◈' },
      { code: 'BNB', name: 'BNB', icon: '🔶' }
    ].filter(c => currencies.includes(c.code))

    res.json({
      success: true,
      currencies: currencyList
    })
  } catch (error) {
    console.error('[OxaPay] Get currencies error:', error.message)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get supported currencies' 
    })
  }
})

export default router
