/**
 * Trade Router Service
 * 
 * Handles routing of trades based on book type (A-Book vs B-Book)
 * A-Book trades are sent to Liquidity Provider (Corecen)
 * B-Book trades are handled internally by Concordex
 * 
 * Data Flow:
 * 1. Trade created → Check user's bookType
 * 2. If A-Book → Set trade.bookType='A', emit to LP, mark sync status
 * 3. If B-Book → Set trade.bookType='B', handle internally
 */

import User from '../models/User.js'
import Trade from '../models/Trade.js'
import corecenSocketClient from './corecenSocketClient.js'
import lpIntegration from './lpIntegration.js'

// Status mapping for LP communication
const STATUS_MAP = {
  'OPEN': 'open',
  'CLOSED': 'closed',
  'PENDING': 'pending',
  'CANCELLED': 'cancelled'
}

const CLOSED_BY_MAP = {
  'SL': 'stop_loss',
  'TP': 'take_profit',
  'USER': 'manual',
  'ADMIN': 'admin',
  'STOP_OUT': 'stop_out',
  'ALGO': 'algo'
}

/**
 * Determine book type for a trade based on user's book assignment
 * @param {string} userId - User ID
 * @returns {Promise<'A'|'B'>} Book type
 */
export const getBookTypeForUser = async (userId) => {
  try {
    const user = await User.findById(userId).select('bookType')
    if (!user) {
      console.warn(`[TradeRouter] User not found: ${userId}, defaulting to B-Book`)
      return 'B'
    }
    return user.bookType || 'B'
  } catch (error) {
    console.error('[TradeRouter] Error getting book type:', error)
    return 'B'
  }
}

/**
 * Format trade data for LP (Corecen) consumption
 * @param {Object} trade - Trade document
 * @param {Object} user - User document
 * @returns {Object} Formatted trade for LP
 */
export const formatTradeForLP = (trade, user) => {
  return {
    externalTradeId: trade._id.toString(),
    tradeId: trade.tradeId,
    symbol: trade.symbol,
    segment: trade.segment,
    side: trade.side?.toLowerCase() || 'buy',
    volume: trade.quantity || 0,
    openPrice: trade.openPrice || 0,
    closePrice: trade.closePrice || null,
    currentPrice: trade.currentPrice || trade.openPrice || 0,
    stopLoss: trade.stopLoss || null,
    takeProfit: trade.takeProfit || null,
    margin: trade.marginUsed || 0,
    leverage: trade.leverage || 1,
    commission: trade.commission || 0,
    swap: trade.swap || 0,
    pnl: trade.status === 'CLOSED' ? trade.realizedPnl : trade.floatingPnl,
    status: STATUS_MAP[trade.status] || 'open',
    closedBy: trade.closedBy ? CLOSED_BY_MAP[trade.closedBy] : null,
    openedAt: trade.openedAt || trade.createdAt,
    closedAt: trade.closedAt || null,
    user: {
      id: user?._id?.toString() || trade.userId?.toString(),
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
      email: user?.email || 'unknown'
    },
    accountId: trade.tradingAccountId?.toString() || null,
    bookType: trade.bookType || 'B',
    brokerId: trade.brokerId || 'default'
  }
}

/**
 * Route a new trade based on book type
 * Called when a trade is created
 * @param {Object} trade - Trade document
 * @param {Object} io - Socket.IO instance for real-time updates
 * @returns {Promise<Object>} Updated trade with routing info
 */
export const routeNewTrade = async (trade, io = null) => {
  try {
    const bookType = await getBookTypeForUser(trade.userId)
    
    // Update trade with book type
    trade.bookType = bookType
    
    if (bookType === 'A') {
      // A-Book: Route to Liquidity Provider (Corecen)
      trade.lpSyncStatus = 'PENDING'
      await trade.save()
      
      // Get user details for LP
      const user = await User.findById(trade.userId).select('firstName lastName email')
      const formattedTrade = formatTradeForLP(trade, user)
      
      // Emit WebSocket event for real-time sync (local)
      if (io) {
        io.emit('abook:trade:new', formattedTrade)
        console.log(`[TradeRouter] A-Book trade emitted: ${trade.tradeId}`)
      }
      
      // PRIMARY: Push trade via HMAC-secured REST API to LP
      if (lpIntegration.isConfigured()) {
        try {
          const lpResult = await lpIntegration.pushTrade(trade, user)
          if (lpResult.success) {
            trade.lpSyncStatus = 'SYNCED'
            trade.lpSyncedAt = new Date()
            console.log(`[TradeRouter] Trade synced to LP via REST: ${trade.tradeId}`)
          } else {
            trade.lpSyncStatus = 'FAILED'
            console.error(`[TradeRouter] LP REST sync failed: ${lpResult.error}`)
          }
        } catch (lpError) {
          trade.lpSyncStatus = 'FAILED'
          console.error(`[TradeRouter] LP REST error: ${lpError.message}`)
        }
      } else {
        console.warn(`[TradeRouter] LP integration not configured, skipping REST sync`)
      }
      
      // SECONDARY: Emit Socket.IO event to Corecen for real-time UI updates
      try {
        corecenSocketClient.emitTradeOpened(trade, user)
      } catch (socketError) {
        console.error(`[TradeRouter] Socket error: ${socketError.message}`)
      }
      await trade.save()
      
      console.log(`[TradeRouter] Trade ${trade.tradeId} routed to A-Book (LP)`)
    } else {
      // B-Book: Handle internally
      trade.lpSyncStatus = 'NOT_APPLICABLE'
      await trade.save()
      
      console.log(`[TradeRouter] Trade ${trade.tradeId} routed to B-Book (Internal)`)
    }
    
    return trade
  } catch (error) {
    console.error('[TradeRouter] Error routing trade:', error)
    throw error
  }
}

/**
 * Route trade update (modify, close) based on book type
 * @param {Object} trade - Trade document
 * @param {string} action - Action type: 'modify', 'close'
 * @param {Object} io - Socket.IO instance
 * @returns {Promise<Object>} Updated trade
 */
export const routeTradeUpdate = async (trade, action, io = null) => {
  try {
    if (trade.bookType !== 'A') {
      // B-Book trades don't need LP sync
      return trade
    }
    
    const user = await User.findById(trade.userId).select('firstName lastName email')
    const formattedTrade = formatTradeForLP(trade, user)
    
    // Emit WebSocket event for real-time sync (local)
    if (io) {
      const eventName = action === 'close' ? 'abook:trade:closed' : 'abook:trade:updated'
      io.emit(eventName, formattedTrade)
      console.log(`[TradeRouter] A-Book trade ${action}: ${trade.tradeId}`)
    }
    
    // PRIMARY: Push update via HMAC-secured REST API to LP
    if (lpIntegration.isConfigured()) {
      try {
        let lpResult
        if (action === 'close') {
          lpResult = await lpIntegration.closeTrade(trade)
        } else {
          lpResult = await lpIntegration.updateTrade(trade)
        }
        if (lpResult.success) {
          trade.lpSyncedAt = new Date()
          console.log(`[TradeRouter] Trade ${action} synced to LP via REST: ${trade.tradeId}`)
        } else {
          console.error(`[TradeRouter] LP REST ${action} failed: ${lpResult.error}`)
        }
      } catch (lpError) {
        console.error(`[TradeRouter] LP REST error: ${lpError.message}`)
      }
    }
    
    // SECONDARY: Emit Socket.IO event to Corecen for real-time UI updates
    try {
      if (action === 'close') {
        corecenSocketClient.emitTradeClosed(trade)
      } else {
        corecenSocketClient.emitTradeUpdated(trade)
      }
    } catch (socketError) {
      console.error(`[TradeRouter] Socket error: ${socketError.message}`)
    }
    
    // Update sync timestamp
    trade.lpSyncedAt = new Date()
    await trade.save()
    
    return trade
  } catch (error) {
    console.error('[TradeRouter] Error routing trade update:', error)
    throw error
  }
}

/**
 * Validate if a trade can be routed to A-Book
 * @param {string} userId - User ID
 * @returns {Promise<{valid: boolean, reason: string}>}
 */
export const validateABookRouting = async (userId) => {
  try {
    const user = await User.findById(userId).select('bookType isBlocked isBanned')
    
    if (!user) {
      return { valid: false, reason: 'User not found' }
    }
    
    if (user.isBlocked || user.isBanned) {
      return { valid: false, reason: 'User is blocked or banned' }
    }
    
    if (user.bookType !== 'A') {
      return { valid: false, reason: 'User is not assigned to A-Book' }
    }
    
    return { valid: true, reason: 'OK' }
  } catch (error) {
    console.error('[TradeRouter] Validation error:', error)
    return { valid: false, reason: 'Validation error' }
  }
}

/**
 * Get all A-Book trades for LP sync
 * Queries by BOTH trade.bookType='A' AND user.bookType='A' for backward compatibility
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Formatted trades
 */
export const getABookTrades = async (options = {}) => {
  const { status, limit = 100, skip = 0, brokerId } = options
  
  // Get all A-Book users first
  const aBookUsers = await User.find({ bookType: 'A' }).select('_id')
  const aBookUserIds = aBookUsers.map(u => u._id)
  
  // Query trades that belong to A-Book users (regardless of trade.bookType field)
  // This handles both new trades with bookType='A' and old trades without it
  let query = { userId: { $in: aBookUserIds } }
  
  if (status && status !== 'all') {
    query.status = status.toUpperCase()
  }
  
  if (brokerId) {
    query.brokerId = brokerId
  }
  
  const trades = await Trade.find(query)
    .populate('userId', 'firstName lastName email bookType')
    .sort({ openedAt: -1 })
    .skip(skip)
    .limit(limit)
  
  return trades.map(trade => formatTradeForLP(trade, trade.userId))
}

/**
 * Sync existing trades to new book type system
 * Run this once to migrate existing trades
 */
export const migrateExistingTrades = async () => {
  try {
    console.log('[TradeRouter] Starting trade migration...')
    
    // Get all users with their book types
    const users = await User.find().select('_id bookType')
    const userBookTypes = {}
    users.forEach(u => {
      userBookTypes[u._id.toString()] = u.bookType || 'B'
    })
    
    // Update trades without bookType
    const trades = await Trade.find({ bookType: { $exists: false } })
    
    for (const trade of trades) {
      const bookType = userBookTypes[trade.userId.toString()] || 'B'
      trade.bookType = bookType
      trade.lpSyncStatus = bookType === 'A' ? 'SYNCED' : 'NOT_APPLICABLE'
      await trade.save()
    }
    
    console.log(`[TradeRouter] Migrated ${trades.length} trades`)
    return { migrated: trades.length }
  } catch (error) {
    console.error('[TradeRouter] Migration error:', error)
    throw error
  }
}

export default {
  getBookTypeForUser,
  formatTradeForLP,
  routeNewTrade,
  routeTradeUpdate,
  validateABookRouting,
  getABookTrades,
  migrateExistingTrades
}
