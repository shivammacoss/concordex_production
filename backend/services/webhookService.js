/**
 * Webhook Service for Concordex
 * 
 * Sends webhook events to Corecen when:
 * - User book type changes (A-Book / B-Book)
 * - A-Book user opens a trade
 * - A-Book trade is closed
 * - A-Book trade is updated (SL/TP)
 */

// Corecen webhook configuration
const CORECEN_WEBHOOK_URL = process.env.CORECEN_WEBHOOK_URL || 'http://localhost:3001/api/webhooks/concordex'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'concordex_webhook_secret_2024'

// Event types
export const WebhookEvents = {
  USER_BOOK_CHANGED: 'user.book_changed',
  TRADE_OPENED: 'trade.opened',
  TRADE_CLOSED: 'trade.closed',
  TRADE_UPDATED: 'trade.updated',
}

/**
 * Send webhook to Corecen
 * @param {string} event - Event type
 * @param {Object} data - Event data
 * @returns {Promise<Object>} Response
 */
const sendWebhook = async (event, data) => {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    source: 'CONCORDEX',
    data,
  }

  try {
    console.log(`[Webhook] Sending ${event} to Corecen...`)
    
    const response = await fetch(CORECEN_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (response.ok && result.success) {
      console.log(`[Webhook] ${event} sent successfully`)
      return { success: true, message: 'Webhook sent' }
    } else {
      console.error(`[Webhook] Failed: ${result.message || response.status}`)
      return { success: false, error: result.message || `HTTP ${response.status}` }
    }
  } catch (error) {
    console.error(`[Webhook] Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Send user.book_changed event when user is transferred to A-Book or B-Book
 * @param {Object} user - User document
 * @param {string} bookType - New book type ('A' or 'B')
 */
export const sendUserBookChanged = async (user, bookType) => {
  const data = {
    user_id: user._id.toString(),
    email: user.email || '',
    first_name: user.firstName || '',
    last_name: user.lastName || '',
    book_type: bookType,
    changed_at: new Date().toISOString(),
  }

  return sendWebhook(WebhookEvents.USER_BOOK_CHANGED, data)
}

/**
 * Send trade.opened event when A-Book user opens a trade
 * @param {Object} trade - Trade document
 * @param {Object} user - User document
 */
export const sendTradeOpened = async (trade, user) => {
  const data = {
    trade_id: trade._id.toString(),
    user_id: trade.userId?.toString() || '',
    user_email: user?.email || '',
    user_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    symbol: trade.symbol,
    side: trade.side?.toUpperCase() || 'BUY',
    volume: trade.quantity || 0,
    price: trade.openPrice || 0,
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    commission: trade.commission || 0,
    trading_account_id: trade.tradingAccountId?.toString() || '',
    opened_at: trade.openedAt?.toISOString() || new Date().toISOString(),
  }

  return sendWebhook(WebhookEvents.TRADE_OPENED, data)
}

/**
 * Send trade.closed event when A-Book trade is closed
 * @param {Object} trade - Trade document
 */
export const sendTradeClosed = async (trade) => {
  const data = {
    trade_id: trade._id.toString(),
    close_price: trade.closePrice || 0,
    pnl: trade.realizedPnl || 0,
    closed_by: trade.closedBy || 'USER',
    closed_at: trade.closedAt?.toISOString() || new Date().toISOString(),
  }

  return sendWebhook(WebhookEvents.TRADE_CLOSED, data)
}

/**
 * Send trade.updated event when A-Book trade SL/TP is modified
 * @param {Object} trade - Trade document
 */
export const sendTradeUpdated = async (trade) => {
  const data = {
    trade_id: trade._id.toString(),
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    pnl: trade.floatingPnl || 0,
  }

  return sendWebhook(WebhookEvents.TRADE_UPDATED, data)
}

export default {
  WebhookEvents,
  sendWebhook,
  sendUserBookChanged,
  sendTradeOpened,
  sendTradeClosed,
  sendTradeUpdated,
}
