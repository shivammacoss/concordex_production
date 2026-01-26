/**
 * Corecen Socket.IO Client Service
 * 
 * Connects Concordex to Corecen's WebSocket server for real-time A-Book sync.
 * 
 * Events emitted to Corecen:
 * - abook:user:added - When user is assigned to A-Book
 * - abook:user:removed - When user is removed from A-Book
 * - abook:trade:opened - When A-Book user opens a trade
 * - abook:trade:closed - When A-Book trade is closed
 * - abook:trade:updated - When A-Book trade SL/TP is modified
 */

import { io } from 'socket.io-client'
import dotenv from 'dotenv'

// Ensure env vars are loaded
dotenv.config()

// Corecen WebSocket server configuration
const CORECEN_WS_URL = process.env.CORECEN_WS_URL || 'http://localhost:3001'
const PLATFORM_KEY = process.env.CORECEN_PLATFORM_KEY || 'concordex_secure_platform_key_2024'

let socket = null
let isConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

/**
 * Initialize Socket.IO connection to Corecen
 */
export const initConnection = () => {
  if (socket && isConnected) {
    console.log('[CorecenSocket] Already connected')
    return socket
  }

  console.log(`[CorecenSocket] Connecting to Corecen at ${CORECEN_WS_URL}...`)

  socket = io(CORECEN_WS_URL, {
    transports: ['websocket', 'polling'],
    auth: {
      platform: 'CONCORDEX',
      platformKey: PLATFORM_KEY,
    },
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  })

  // Connection events
  socket.on('connect', () => {
    isConnected = true
    reconnectAttempts = 0
    console.log(`[CorecenSocket] Connected to Corecen (ID: ${socket.id})`)
    
    // Authenticate with Corecen
    socket.emit('platform:authenticate', {
      platform: 'CONCORDEX',
      platformKey: PLATFORM_KEY,
    })
  })

  socket.on('disconnect', (reason) => {
    isConnected = false
    console.log(`[CorecenSocket] Disconnected from Corecen: ${reason}`)
  })

  socket.on('connect_error', (error) => {
    reconnectAttempts++
    console.error(`[CorecenSocket] Connection error (attempt ${reconnectAttempts}): ${error.message}`)
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[CorecenSocket] Max reconnection attempts reached. Giving up.')
    }
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log(`[CorecenSocket] Reconnected after ${attemptNumber} attempts`)
  })

  // Acknowledgment from Corecen
  socket.on('platform:authenticated', (data) => {
    console.log(`[CorecenSocket] Authenticated with Corecen: ${data.message}`)
  })

  return socket
}

/**
 * Get socket instance (initialize if not connected)
 */
export const getSocket = () => {
  if (!socket) {
    initConnection()
  }
  return socket
}

/**
 * Check if connected to Corecen
 */
export const isConnectedToCorecen = () => isConnected

/**
 * Emit A-Book user added event
 * @param {Object} user - User document
 */
export const emitUserAdded = (user) => {
  const socket = getSocket()
  if (!socket || !isConnected) {
    console.warn('[CorecenSocket] Not connected, cannot emit user added event')
    return false
  }

  const payload = {
    external_user_id: user._id.toString(),
    email: user.email || '',
    first_name: user.firstName || '',
    last_name: user.lastName || '',
    book_type: 'A_BOOK',
    source_platform: 'CONCORDEX',
    timestamp: new Date().toISOString(),
  }

  socket.emit('abook:user:added', payload)
  console.log(`[CorecenSocket] Emitted abook:user:added for ${user.email}`)
  return true
}

/**
 * Emit A-Book user removed event
 * @param {Object} user - User document
 */
export const emitUserRemoved = (user) => {
  const socket = getSocket()
  if (!socket || !isConnected) {
    console.warn('[CorecenSocket] Not connected, cannot emit user removed event')
    return false
  }

  const payload = {
    external_user_id: user._id.toString(),
    email: user.email || '',
    source_platform: 'CONCORDEX',
    timestamp: new Date().toISOString(),
  }

  socket.emit('abook:user:removed', payload)
  console.log(`[CorecenSocket] Emitted abook:user:removed for ${user.email}`)
  return true
}

/**
 * Emit A-Book trade opened event
 * @param {Object} trade - Trade document
 * @param {Object} user - User document
 */
export const emitTradeOpened = (trade, user) => {
  const socket = getSocket()
  if (!socket || !isConnected) {
    console.warn('[CorecenSocket] Not connected, cannot emit trade opened event')
    return false
  }

  const payload = {
    external_trade_id: trade._id.toString(),
    trade_id: trade.tradeId,
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
    margin: trade.marginUsed || 0,
    leverage: trade.leverage || 1,
    book_type: 'A_BOOK',
    source_platform: 'CONCORDEX',
    trading_account_id: trade.tradingAccountId?.toString() || '',
    opened_at: trade.openedAt?.toISOString() || new Date().toISOString(),
    timestamp: new Date().toISOString(),
  }

  socket.emit('abook:trade:opened', payload)
  console.log(`[CorecenSocket] Emitted abook:trade:opened for ${trade.tradeId}`)
  return true
}

/**
 * Emit A-Book trade closed event
 * @param {Object} trade - Trade document
 */
export const emitTradeClosed = (trade) => {
  const socket = getSocket()
  if (!socket || !isConnected) {
    console.warn('[CorecenSocket] Not connected, cannot emit trade closed event')
    return false
  }

  const payload = {
    external_trade_id: trade._id.toString(),
    trade_id: trade.tradeId,
    close_price: trade.closePrice || 0,
    pnl: trade.realizedPnl || 0,
    closed_by: trade.closedBy || 'USER',
    source_platform: 'CONCORDEX',
    closed_at: trade.closedAt?.toISOString() || new Date().toISOString(),
    timestamp: new Date().toISOString(),
  }

  socket.emit('abook:trade:closed', payload)
  console.log(`[CorecenSocket] Emitted abook:trade:closed for ${trade.tradeId}`)
  return true
}

/**
 * Emit A-Book trade updated event (SL/TP modified)
 * @param {Object} trade - Trade document
 */
export const emitTradeUpdated = (trade) => {
  const socket = getSocket()
  if (!socket || !isConnected) {
    console.warn('[CorecenSocket] Not connected, cannot emit trade updated event')
    return false
  }

  const payload = {
    external_trade_id: trade._id.toString(),
    trade_id: trade.tradeId,
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    pnl: trade.floatingPnl || 0,
    source_platform: 'CONCORDEX',
    timestamp: new Date().toISOString(),
  }

  socket.emit('abook:trade:updated', payload)
  console.log(`[CorecenSocket] Emitted abook:trade:updated for ${trade.tradeId}`)
  return true
}

/**
 * Disconnect from Corecen
 */
export const disconnect = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    isConnected = false
    console.log('[CorecenSocket] Disconnected from Corecen')
  }
}

export default {
  initConnection,
  getSocket,
  isConnectedToCorecen,
  emitUserAdded,
  emitUserRemoved,
  emitTradeOpened,
  emitTradeClosed,
  emitTradeUpdated,
  disconnect,
}
