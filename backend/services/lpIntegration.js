/**
 * LP Integration Service
 * 
 * Handles secure communication with Corecen LP Platform via HMAC-authenticated REST API.
 * This is the PRIMARY method for pushing A-Book trades to the LP.
 * 
 * The existing corecenSocketClient.js remains unchanged and handles real-time WebSocket events.
 * This service uses REST API with HMAC-SHA256 authentication for reliable trade sync.
 * 
 * Environment Variables Required:
 * - LP_API_URL: Corecen backend URL (default: http://localhost:3001)
 * - LP_API_KEY: Broker API key from Corecen (e.g., lpk_xxx)
 * - LP_API_SECRET: Broker API secret from Corecen
 */

import crypto from 'crypto'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env file explicitly to ensure env vars are available
dotenv.config()

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// LP Settings file path
const LP_SETTINGS_FILE = path.join(__dirname, '..', 'config', 'lp-settings.json')

// Function to get LP settings from file
const getLpSettingsFromFile = () => {
  try {
    if (fs.existsSync(LP_SETTINGS_FILE)) {
      const data = fs.readFileSync(LP_SETTINGS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('[LPIntegration] Could not read LP settings file:', error.message)
  }
  return null
}

// Load settings from file first, then fallback to env vars
const fileSettings = getLpSettingsFromFile()

// LP API Configuration (mutable for dynamic updates)
let LP_API_URL = fileSettings?.lpApiUrl || process.env.LP_API_URL || 'http://localhost:3001'
let LP_API_KEY = fileSettings?.lpApiKey || process.env.LP_API_KEY || ''
let LP_API_SECRET = fileSettings?.lpApiSecret || process.env.LP_API_SECRET || ''

// Log configuration status on module load
if (LP_API_KEY && LP_API_SECRET) {
  const source = fileSettings?.lpApiKey ? 'settings file' : '.env'
  console.log(`[LPIntegration] ✓ Configured from ${source} - URL: ${LP_API_URL}, API Key: ${LP_API_KEY.substring(0, 10)}...`)
} else {
  console.warn(`[LPIntegration] ✗ NOT CONFIGURED - Configure LP settings in Book Management or .env`)
}

/**
 * Generate HMAC-SHA256 signature for LP API requests
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} path - API endpoint path (e.g., /api/v1/broker/trades/push)
 * @param {string} body - JSON stringified request body (empty string for GET)
 * @returns {{ timestamp: string, signature: string }}
 */
export const generateSignature = (method, path, body = '') => {
  const timestamp = Date.now().toString()
  const message = timestamp + method.toUpperCase() + path + body
  
  const signature = crypto
    .createHmac('sha256', LP_API_SECRET)
    .update(message)
    .digest('hex')
  
  return { timestamp, signature }
}

/**
 * Make authenticated request to Corecen LP API
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @param {Object|null} data - Request body (null for GET)
 * @returns {Promise<Object>} Response data
 */
const makeRequest = async (method, path, data = null) => {
  if (!LP_API_KEY || !LP_API_SECRET) {
    console.warn('[LPIntegration] LP_API_KEY or LP_API_SECRET not configured, skipping LP sync')
    return { success: false, error: 'LP credentials not configured' }
  }

  const body = data ? JSON.stringify(data) : ''
  const { timestamp, signature } = generateSignature(method, path, body)
  const url = `${LP_API_URL}${path}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LP_API_KEY,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: method !== 'GET' ? body : undefined,
    })

    const result = await response.json()

    if (!response.ok) {
      console.error(`[LPIntegration] API Error: ${result.message || response.status}`)
      return { success: false, error: result.message || `HTTP ${response.status}` }
    }

    return result
  } catch (error) {
    console.error(`[LPIntegration] Request failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Push a new A-Book trade to LP
 * Called when an A-Book user opens a trade
 * @param {Object} trade - Trade document from MongoDB
 * @param {Object} user - User document from MongoDB
 * @returns {Promise<Object>} Result with success status
 */
export const pushTrade = async (trade, user) => {
  const payload = {
    external_trade_id: trade._id.toString(),
    user_id: trade.userId?.toString() || '',
    user_email: user?.email || '',
    user_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    symbol: trade.symbol,
    side: trade.side?.toUpperCase() || 'BUY',
    volume: trade.quantity || 0,
    open_price: trade.openPrice || 0,
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    margin: trade.marginUsed || 0,
    leverage: trade.leverage || 100,
    commission: trade.commission || 0,
    trading_account_id: trade.tradingAccountId?.toString() || '',
    opened_at: trade.openedAt?.toISOString() || new Date().toISOString(),
  }

  console.log(`[LPIntegration] Pushing A-Book trade: ${trade.tradeId}`)
  const result = await makeRequest('POST', '/api/v1/broker/trades/push', payload)

  if (result.success) {
    console.log(`[LPIntegration] Trade pushed successfully: ${trade.tradeId}`)
  } else {
    console.error(`[LPIntegration] Failed to push trade: ${result.error}`)
  }

  return result
}

/**
 * Close an A-Book trade in LP
 * Called when an A-Book trade is closed (by user, SL, TP, stop-out, or admin)
 * @param {Object} trade - Trade document with close data
 * @returns {Promise<Object>} Result with success status
 */
export const closeTrade = async (trade) => {
  const payload = {
    external_trade_id: trade._id.toString(),
    close_price: trade.closePrice || 0,
    pnl: trade.realizedPnl || 0,
    closed_by: trade.closedBy || 'USER',
    closed_at: trade.closedAt?.toISOString() || new Date().toISOString(),
  }

  console.log(`[LPIntegration] Closing A-Book trade: ${trade.tradeId}`)
  const result = await makeRequest('POST', '/api/v1/broker/trades/close', payload)

  if (result.success) {
    console.log(`[LPIntegration] Trade closed in LP: ${trade.tradeId}`)
  } else {
    console.error(`[LPIntegration] Failed to close trade in LP: ${result.error}`)
  }

  return result
}

/**
 * Update trade SL/TP in LP
 * Called when an A-Book trade's SL or TP is modified
 * @param {Object} trade - Trade document with updated SL/TP
 * @returns {Promise<Object>} Result with success status
 */
export const updateTrade = async (trade) => {
  const payload = {
    external_trade_id: trade._id.toString(),
    sl: trade.stopLoss || 0,
    tp: trade.takeProfit || 0,
    pnl: trade.floatingPnl || 0,
  }

  console.log(`[LPIntegration] Updating A-Book trade: ${trade.tradeId}`)
  const result = await makeRequest('POST', '/api/v1/broker/trades/update', payload)

  if (result.success) {
    console.log(`[LPIntegration] Trade updated in LP: ${trade.tradeId}`)
  } else {
    console.error(`[LPIntegration] Failed to update trade in LP: ${result.error}`)
  }

  return result
}

/**
 * Test connection to LP
 * @returns {Promise<boolean>} True if connection successful
 */
export const testConnection = async () => {
  if (!LP_API_KEY || !LP_API_SECRET) {
    console.warn('[LPIntegration] LP credentials not configured')
    return false
  }

  try {
    const result = await makeRequest('GET', '/api/v1/broker/trades/stats')
    return result.success === true
  } catch (error) {
    console.error(`[LPIntegration] Connection test failed: ${error.message}`)
    return false
  }
}

/**
 * Check if LP integration is configured
 * @returns {boolean} True if LP_API_KEY and LP_API_SECRET are set
 */
export const isConfigured = () => {
  return !!(LP_API_KEY && LP_API_SECRET)
}

/**
 * Get LP configuration status (for admin dashboard)
 * @returns {Object} Configuration status
 */
export const getConfigStatus = () => {
  return {
    configured: isConfigured(),
    apiUrl: LP_API_URL,
    apiKeySet: !!LP_API_KEY,
    apiSecretSet: !!LP_API_SECRET,
  }
}

/**
 * Update LP configuration dynamically
 * Called when admin updates LP settings from the UI
 * @param {Object} config - New configuration
 * @param {string} config.apiUrl - LP API URL
 * @param {string} config.apiKey - LP API Key
 * @param {string} config.apiSecret - LP API Secret
 */
export const updateConfig = (config) => {
  if (config.apiUrl) {
    LP_API_URL = config.apiUrl
  }
  if (config.apiKey) {
    LP_API_KEY = config.apiKey
  }
  if (config.apiSecret) {
    LP_API_SECRET = config.apiSecret
  }
  
  console.log(`[LPIntegration] Configuration updated - URL: ${LP_API_URL}, API Key: ${LP_API_KEY ? LP_API_KEY.substring(0, 10) + '...' : 'not set'}`)
}

export default {
  generateSignature,
  pushTrade,
  closeTrade,
  updateTrade,
  testConnection,
  isConfigured,
  getConfigStatus,
  updateConfig,
}
