/**
 * Corecen API Client Service
 * 
 * Handles pushing A-Book trades to Corecen LP platform
 * Uses server-to-server API with X-PLATFORM-KEY authentication
 * 
 * Endpoints:
 * - POST /api/v1/trades/receive - Push new/updated trade
 * - POST /api/v1/trades/update-status - Update trade status
 */

// Corecen API configuration
const CORECEN_API_URL = process.env.CORECEN_API_URL || 'http://localhost:3001'
const CORECEN_PLATFORM_KEY = process.env.CORECEN_PLATFORM_KEY || 'concordex_secure_platform_key_2024'

/**
 * Make authenticated request to Corecen API
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
const makeRequest = async (endpoint, data) => {
  const url = `${CORECEN_API_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PLATFORM-KEY': CORECEN_PLATFORM_KEY,
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error(`[CorecenClient] API Error: ${result.message || response.status}`)
      return { success: false, error: result.message || `HTTP ${response.status}` }
    }

    return result
  } catch (error) {
    console.error(`[CorecenClient] Request failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Push a new A-Book trade to Corecen
 * @param {Object} trade - Trade document
 * @param {Object} user - User document
 * @returns {Promise<Object>} Result
 */
export const pushNewTrade = async (trade, user) => {
  const payload = {
    external_trade_id: trade._id.toString(),
    user_id: trade.userId?.toString() || '',
    user_email: user?.email || '',
    user_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    symbol: trade.symbol,
    order_type: trade.side?.toUpperCase() || 'BUY',
    volume: trade.quantity || 0,
    price: trade.openPrice || 0,
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    pnl: 0,
    commission: trade.commission || 0,
    status: 'OPEN',
    book_type: 'A_BOOK',
    source_platform: 'CONCORDEX',
    trading_account_id: trade.tradingAccountId?.toString() || '',
    opened_at: trade.openedAt?.toISOString() || new Date().toISOString(),
  }

  console.log(`[CorecenClient] Pushing new A-Book trade: ${trade.tradeId}`)
  const result = await makeRequest('/api/v1/trades/receive', payload)
  
  if (result.success) {
    console.log(`[CorecenClient] Trade pushed successfully: ${trade.tradeId}`)
  } else {
    console.error(`[CorecenClient] Failed to push trade: ${result.error}`)
  }

  return result
}

/**
 * Update trade status in Corecen (OPEN → CLOSED / SL / TP)
 * @param {Object} trade - Trade document
 * @param {string} status - New status (CLOSED, SL, TP)
 * @returns {Promise<Object>} Result
 */
export const updateTradeStatus = async (trade, status) => {
  const payload = {
    external_trade_id: trade._id.toString(),
    status: status,
    close_price: trade.closePrice || 0,
    pnl: trade.realizedPnl || 0,
    closed_at: trade.closedAt?.toISOString() || new Date().toISOString(),
    source_platform: 'CONCORDEX',
  }

  console.log(`[CorecenClient] Updating trade status: ${trade.tradeId} → ${status}`)
  const result = await makeRequest('/api/v1/trades/update-status', payload)
  
  if (result.success) {
    console.log(`[CorecenClient] Trade status updated: ${trade.tradeId}`)
  } else {
    console.error(`[CorecenClient] Failed to update trade status: ${result.error}`)
  }

  return result
}

/**
 * Push trade update (SL/TP modification) to Corecen
 * @param {Object} trade - Trade document
 * @param {Object} user - User document
 * @returns {Promise<Object>} Result
 */
export const pushTradeUpdate = async (trade, user) => {
  const payload = {
    external_trade_id: trade._id.toString(),
    user_id: trade.userId?.toString() || '',
    user_email: user?.email || '',
    user_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    symbol: trade.symbol,
    order_type: trade.side?.toUpperCase() || 'BUY',
    volume: trade.quantity || 0,
    price: trade.openPrice || 0,
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    pnl: trade.floatingPnl || 0,
    commission: trade.commission || 0,
    status: trade.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    book_type: 'A_BOOK',
    source_platform: 'CONCORDEX',
    trading_account_id: trade.tradingAccountId?.toString() || '',
    opened_at: trade.openedAt?.toISOString() || new Date().toISOString(),
    closed_at: trade.closedAt?.toISOString() || null,
  }

  console.log(`[CorecenClient] Pushing trade update: ${trade.tradeId}`)
  const result = await makeRequest('/api/v1/trades/receive', payload)
  
  if (result.success) {
    console.log(`[CorecenClient] Trade update pushed: ${trade.tradeId}`)
  }

  return result
}

/**
 * Test connection to Corecen
 * @returns {Promise<boolean>} Connection status
 */
export const testConnection = async () => {
  try {
    const response = await fetch(`${CORECEN_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return response.ok
  } catch (error) {
    console.error(`[CorecenClient] Connection test failed: ${error.message}`)
    return false
  }
}

/**
 * Push A-Book user to Corecen when book type is changed to A-Book
 * @param {Object} user - User document
 * @returns {Promise<Object>} Result
 */
export const pushABookUser = async (user) => {
  const payload = {
    external_user_id: user._id.toString(),
    email: user.email || '',
    first_name: user.firstName || '',
    last_name: user.lastName || '',
    book_type: 'A_BOOK',
    source_platform: 'CONCORDEX',
    book_changed_at: user.bookChangedAt?.toISOString() || new Date().toISOString(),
  }

  console.log(`[CorecenClient] Pushing A-Book user: ${user.email}`)
  const result = await makeRequest('/api/v1/trades/receive-user', payload)
  
  if (result.success) {
    console.log(`[CorecenClient] User pushed successfully: ${user.email}`)
  } else {
    console.error(`[CorecenClient] Failed to push user: ${result.error}`)
  }

  return result
}

/**
 * Remove user from Corecen A-Book when book type is changed to B-Book
 * @param {Object} user - User document
 * @returns {Promise<Object>} Result
 */
export const removeABookUser = async (user) => {
  const payload = {
    external_user_id: user._id.toString(),
    source_platform: 'CONCORDEX',
  }

  console.log(`[CorecenClient] Removing user from A-Book: ${user.email}`)
  const result = await makeRequest('/api/v1/trades/remove-user', payload)
  
  if (result.success) {
    console.log(`[CorecenClient] User removed successfully: ${user.email}`)
  } else {
    console.error(`[CorecenClient] Failed to remove user: ${result.error}`)
  }

  return result
}

export default {
  pushNewTrade,
  updateTradeStatus,
  pushTradeUpdate,
  testConnection,
  pushABookUser,
  removeABookUser,
}
