import express from 'express'
import User from '../models/User.js'
import Trade from '../models/Trade.js'
import corecenSocketClient from '../services/corecenSocketClient.js'
import lpIntegration from '../services/lpIntegration.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Helper to read/write LP settings to a JSON file (or could use DB)
const LP_SETTINGS_FILE = path.join(__dirname, '../config/lp-settings.json')

const getLpSettingsFromFile = () => {
  try {
    if (fs.existsSync(LP_SETTINGS_FILE)) {
      const data = fs.readFileSync(LP_SETTINGS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading LP settings file:', error)
  }
  // Return defaults from env
  return {
    lpApiKey: process.env.LP_API_KEY || '',
    lpApiSecret: process.env.LP_API_SECRET || '',
    lpApiUrl: process.env.LP_API_URL || 'http://localhost:3001',
    corecenWsUrl: process.env.CORECEN_WS_URL || 'http://localhost:3001'
  }
}

const saveLpSettingsToFile = (settings) => {
  try {
    const configDir = path.dirname(LP_SETTINGS_FILE)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(LP_SETTINGS_FILE, JSON.stringify(settings, null, 2))
    return true
  } catch (error) {
    console.error('Error saving LP settings file:', error)
    return false
  }
}

// GET /api/book/users - Get all users with book type info
router.get('/users', async (req, res) => {
  try {
    const { bookType, search } = req.query
    
    let query = {}
    let conditions = []
    
    if (bookType && bookType !== 'all') {
      if (bookType === 'B') {
        // B Book includes users with bookType 'B' or null/undefined
        conditions.push({ $or: [{ bookType: 'B' }, { bookType: { $exists: false } }, { bookType: null }] })
      } else {
        conditions.push({ bookType: bookType })
      }
    }
    if (search) {
      conditions.push({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      })
    }
    
    if (conditions.length > 0) {
      query = conditions.length === 1 ? conditions[0] : { $and: conditions }
    }
    
    const users = await User.find(query)
      .select('firstName email bookType bookChangedAt isBlocked isBanned createdAt')
      .sort({ createdAt: -1 })
    
    // Count stats - users without bookType or with 'B' are B Book users
    const aBookUsers = await User.countDocuments({ bookType: 'A' })
    const bBookUsers = await User.countDocuments({ $or: [{ bookType: 'B' }, { bookType: { $exists: false } }, { bookType: null }] })
    const totalUsers = await User.countDocuments()
    
    res.json({
      success: true,
      users,
      stats: {
        aBookUsers,
        bBookUsers,
        totalUsers
      }
    })
  } catch (error) {
    console.error('Error fetching book users:', error)
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message })
  }
})

// PUT /api/book/users/:id/transfer - Transfer user to A or B book
router.put('/users/:id/transfer', async (req, res) => {
  try {
    const { bookType } = req.body
    
    if (!bookType || !['A', 'B'].includes(bookType)) {
      return res.status(400).json({ success: false, message: 'Invalid book type. Must be A or B' })
    }
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    const previousBookType = user.bookType
    user.bookType = bookType
    user.bookChangedAt = new Date()
    await user.save()
    
    console.log(`[Book Management] User ${user.email} transferred from ${previousBookType || 'B'} Book to ${bookType} Book`)
    
    // Emit Socket.IO event to Corecen for real-time sync
    try {
      if (bookType === 'A') {
        corecenSocketClient.emitUserAdded(user)
      } else if (bookType === 'B' && previousBookType === 'A') {
        corecenSocketClient.emitUserRemoved(user)
      }
    } catch (socketError) {
      console.error(`[Book Management] Socket emit failed: ${socketError.message}`)
      // Don't fail the request, just log the error
    }
    
    res.json({
      success: true,
      message: `User transferred to ${bookType} Book successfully`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        bookType: user.bookType,
        bookChangedAt: user.bookChangedAt
      }
    })
  } catch (error) {
    console.error('Error transferring user:', error)
    res.status(500).json({ success: false, message: 'Error transferring user', error: error.message })
  }
})

// GET /api/book/a-book/trades - Get all A Book trades (view only)
router.get('/a-book/trades', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query
    
    // Get all A Book users
    const aBookUsers = await User.find({ bookType: 'A' }).select('_id')
    const aBookUserIds = aBookUsers.map(u => u._id)
    
    // Build query for trades
    let query = { userId: { $in: aBookUserIds } }
    if (status && status !== 'all') {
      query.status = status.toUpperCase()
    }
    
    const trades = await Trade.find(query)
      .populate('userId', 'firstName email bookType')
      .populate('tradingAccountId', 'accountId balance')
      .sort({ openedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
    
    const total = await Trade.countDocuments(query)
    
    // Calculate stats
    const openTrades = await Trade.countDocuments({ ...query, status: 'OPEN' })
    const closedTrades = await Trade.countDocuments({ ...query, status: 'CLOSED' })
    
    // Calculate totals
    const allTrades = await Trade.find(query)
    const totalVolume = allTrades.reduce((sum, t) => sum + (t.quantity || 0), 0)
    const totalPnl = allTrades
      .filter(t => t.status === 'CLOSED')
      .reduce((sum, t) => sum + (t.realizedPnl || 0), 0)
    const totalCommission = allTrades.reduce((sum, t) => sum + (t.commission || 0), 0)
    
    res.json({
      success: true,
      trades,
      total,
      stats: {
        aBookUsers: aBookUsers.length,
        openTrades,
        closedTrades,
        totalVolume,
        totalPnl,
        totalCommission
      }
    })
  } catch (error) {
    console.error('Error fetching A Book trades:', error)
    res.status(500).json({ success: false, message: 'Error fetching trades', error: error.message })
  }
})

// PUT /api/book/users/bulk-transfer - Bulk transfer users to A or B book
router.put('/users/bulk-transfer', async (req, res) => {
  try {
    const { userIds, bookType } = req.body
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected' })
    }
    
    if (!bookType || !['A', 'B'].includes(bookType)) {
      return res.status(400).json({ success: false, message: 'Invalid book type. Must be A or B' })
    }
    
    // Get users before update to know their previous book types
    const usersBeforeUpdate = await User.find({ _id: { $in: userIds } }).select('_id email firstName lastName bookType')
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { 
        $set: { 
          bookType: bookType,
          bookChangedAt: new Date()
        }
      }
    )
    
    console.log(`[Book Management] Bulk transferred ${result.modifiedCount} users to ${bookType} Book`)
    
    // Emit Socket.IO events to Corecen for each user
    try {
      const updatedUsers = await User.find({ _id: { $in: userIds } })
      for (const user of updatedUsers) {
        const previousUser = usersBeforeUpdate.find(u => u._id.toString() === user._id.toString())
        const previousBookType = previousUser?.bookType
        
        if (bookType === 'A') {
          corecenSocketClient.emitUserAdded(user)
        } else if (bookType === 'B' && previousBookType === 'A') {
          corecenSocketClient.emitUserRemoved(user)
        }
      }
    } catch (socketError) {
      console.error(`[Book Management] Socket emit failed: ${socketError.message}`)
    }
    
    res.json({
      success: true,
      message: `${result.modifiedCount} users transferred to ${bookType} Book successfully`,
      modifiedCount: result.modifiedCount
    })
  } catch (error) {
    console.error('Error bulk transferring users:', error)
    res.status(500).json({ success: false, message: 'Error transferring users', error: error.message })
  }
})

// GET /api/book/user/:id/book-type - Get user's book type
router.get('/user/:id/book-type', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('bookType')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    res.json({
      success: true,
      bookType: user.bookType || 'B'
    })
  } catch (error) {
    console.error('Error fetching user book type:', error)
    res.status(500).json({ success: false, message: 'Error fetching book type', error: error.message })
  }
})

// GET /api/book/lp-status - Check LP connection status
router.get('/lp-status', async (req, res) => {
  try {
    const settings = getLpSettingsFromFile()
    
    if (!settings.lpApiUrl) {
      return res.json({
        success: true,
        connected: false,
        message: 'LP API URL not configured'
      })
    }
    
    // Try to connect to LP health endpoint
    const healthUrl = `${settings.lpApiUrl}/api/health`
    
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      })
      
      if (response.ok) {
        res.json({
          success: true,
          connected: true,
          message: 'LP is connected and responding',
          lpUrl: settings.lpApiUrl
        })
      } else {
        res.json({
          success: true,
          connected: false,
          message: `LP returned status ${response.status}`
        })
      }
    } catch (fetchError) {
      res.json({
        success: true,
        connected: false,
        message: fetchError.code === 'ECONNREFUSED' 
          ? 'LP server is not running' 
          : fetchError.name === 'TimeoutError' 
            ? 'LP connection timed out' 
            : fetchError.message
      })
    }
  } catch (error) {
    console.error('Error checking LP status:', error)
    res.json({
      success: false,
      connected: false,
      message: 'Error checking LP status'
    })
  }
})

// GET /api/book/lp-settings - Get LP connection settings
router.get('/lp-settings', async (req, res) => {
  try {
    const settings = getLpSettingsFromFile()
    
    // Mask the secret for security (only show last 8 chars)
    const maskedSettings = {
      ...settings,
      lpApiKey: settings.lpApiKey ? `${settings.lpApiKey.substring(0, 8)}...${settings.lpApiKey.slice(-8)}` : '',
      lpApiSecret: settings.lpApiSecret ? `${'*'.repeat(32)}...${settings.lpApiSecret.slice(-8)}` : ''
    }
    
    res.json({
      success: true,
      settings: maskedSettings,
      // Also send full settings for form (frontend will handle masking display)
      fullSettings: settings
    })
  } catch (error) {
    console.error('Error fetching LP settings:', error)
    res.status(500).json({ success: false, message: 'Error fetching LP settings', error: error.message })
  }
})

// PUT /api/book/lp-settings - Save LP connection settings
router.put('/lp-settings', async (req, res) => {
  try {
    const { lpApiKey, lpApiSecret, lpApiUrl, corecenWsUrl } = req.body
    
    const settings = {
      lpApiKey: lpApiKey || '',
      lpApiSecret: lpApiSecret || '',
      lpApiUrl: lpApiUrl || 'http://localhost:3001',
      corecenWsUrl: corecenWsUrl || 'http://localhost:3001'
    }
    
    const saved = saveLpSettingsToFile(settings)
    
    if (saved) {
      // Update the LP integration service with new settings
      lpIntegration.updateConfig({
        apiUrl: settings.lpApiUrl,
        apiKey: settings.lpApiKey,
        apiSecret: settings.lpApiSecret
      })
      
      // Reconnect WebSocket with new settings
      corecenSocketClient.reconnect()
      
      console.log('[Book Management] LP settings updated and WebSocket reconnected')
      
      res.json({
        success: true,
        message: 'LP settings saved successfully'
      })
    } else {
      res.status(500).json({ success: false, message: 'Failed to save LP settings' })
    }
  } catch (error) {
    console.error('Error saving LP settings:', error)
    res.status(500).json({ success: false, message: 'Error saving LP settings', error: error.message })
  }
})

// POST /api/book/test-lp-connection - Test LP connection
router.post('/test-lp-connection', async (req, res) => {
  try {
    const { lpApiKey, lpApiSecret, lpApiUrl } = req.body
    
    if (!lpApiUrl) {
      return res.status(400).json({ success: false, message: 'LP API URL is required' })
    }
    
    // Test the connection by making a health check request to the LP
    const healthUrl = `${lpApiUrl}/api/health`
    
    console.log(`[Book Management] Testing LP connection to ${healthUrl}`)
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Also test authenticated endpoint if credentials provided
      if (lpApiKey && lpApiSecret) {
        try {
          // Create HMAC signature for test
          const crypto = await import('crypto')
          const timestamp = Date.now().toString()
          const payload = JSON.stringify({ test: true })
          const signatureData = `${timestamp}.${payload}`
          const signature = crypto.createHmac('sha256', lpApiSecret)
            .update(signatureData)
            .digest('hex')
          
          const authTestUrl = `${lpApiUrl}/api/broker-api/health`
          const authResponse = await fetch(authTestUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': lpApiKey,
              'X-Timestamp': timestamp,
              'X-Signature': signature
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (authResponse.ok) {
            res.json({
              success: true,
              message: 'Connection successful! LP is reachable and credentials are valid.',
              lpStatus: data
            })
          } else {
            res.json({
              success: true,
              message: 'LP is reachable but authentication may need verification. Check your API key and secret.',
              lpStatus: data,
              authStatus: 'unverified'
            })
          }
        } catch (authError) {
          res.json({
            success: true,
            message: 'LP is reachable. Authentication test skipped.',
            lpStatus: data
          })
        }
      } else {
        res.json({
          success: true,
          message: 'Connection successful! LP is reachable. Add API credentials for full integration.',
          lpStatus: data
        })
      }
    } else {
      res.json({
        success: false,
        message: `LP returned status ${response.status}. Check the URL and ensure LP is running.`
      })
    }
  } catch (error) {
    console.error('Error testing LP connection:', error)
    
    let message = 'Connection failed. '
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      message += 'Request timed out. Check if the LP server is running and accessible.'
    } else if (error.code === 'ECONNREFUSED') {
      message += 'Connection refused. Ensure the LP server is running on the specified URL.'
    } else {
      message += error.message
    }
    
    res.json({
      success: false,
      message
    })
  }
})

export default router
