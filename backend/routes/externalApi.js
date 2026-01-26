import express from 'express'
import crypto from 'crypto'
import User from '../models/User.js'
import Trade from '../models/Trade.js'
import tradeRouter from '../services/tradeRouter.js'

const router = express.Router()

// HMAC Authentication Middleware for external API calls
const hmacAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key']
    const timestamp = req.headers['x-timestamp']
    const signature = req.headers['x-signature']

    if (!apiKey || !timestamp || !signature) {
      return res.status(401).json({ 
        success: false, 
        message: 'Missing authentication headers (X-API-Key, X-Timestamp, X-Signature)' 
      })
    }

    // Check timestamp is within 5 minutes
    const now = Date.now()
    const requestTime = parseInt(timestamp)
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ 
        success: false, 
        message: 'Request timestamp expired' 
      })
    }

    // Verify API key (should be stored in env/database in production)
    const validApiKey = process.env.EXTERNAL_API_KEY || 'concordex_external_api_key'
    const apiSecret = process.env.EXTERNAL_API_SECRET || 'concordex_external_api_secret'

    if (apiKey !== validApiKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API key' 
      })
    }

    // Verify HMAC signature
    const method = req.method.toUpperCase()
    const path = req.originalUrl.split('?')[0]
    const body = req.method === 'GET' ? '' : JSON.stringify(req.body)
    const message = timestamp + method + path + body

    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex')

    if (signature !== expectedSignature) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature' 
      })
    }

    next()
  } catch (error) {
    console.error('HMAC Auth Error:', error)
    res.status(500).json({ success: false, message: 'Authentication error' })
  }
}

// GET /api/external/a-book/trades - Get all A-Book trades for external platforms (Corecen)
// This endpoint is called by Corecen to fetch A-Book trades (read-only)
// Queries by user.bookType='A' for backward compatibility with existing trades
router.get('/a-book/trades', hmacAuth, async (req, res) => {
  try {
    const { status, limit = 100, skip = 0, brokerId } = req.query

    // Use tradeRouter service for consistent formatting
    const formattedTrades = await tradeRouter.getABookTrades({
      status,
      limit: parseInt(limit),
      skip: parseInt(skip),
      brokerId
    })

    // Get stats - query by user's bookType for backward compatibility
    const aBookUsers = await User.find({ bookType: 'A' }).select('_id')
    const aBookUserIds = aBookUsers.map(u => u._id)
    const total = await Trade.countDocuments({ userId: { $in: aBookUserIds } })

    res.json({
      success: true,
      data: formattedTrades,
      total,
      aBookUsers: aBookUsers.length,
      limit: parseInt(limit),
      skip: parseInt(skip)
    })
  } catch (error) {
    console.error('Error fetching A-Book trades for external API:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching trades', 
      error: error.message 
    })
  }
})

// GET /api/external/a-book/trade/:tradeId - Get single A-Book trade by ID
router.get('/a-book/trade/:tradeId', hmacAuth, async (req, res) => {
  try {
    const trade = await Trade.findOne({ 
      _id: req.params.tradeId,
      bookType: 'A'
    }).populate('userId', 'firstName lastName email')

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'A-Book trade not found'
      })
    }

    const formattedTrade = tradeRouter.formatTradeForLP(trade, trade.userId)

    res.json({
      success: true,
      data: formattedTrade
    })
  } catch (error) {
    console.error('Error fetching A-Book trade:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching trade', 
      error: error.message 
    })
  }
})

// GET /api/external/a-book/users - Get all A-Book users
router.get('/a-book/users', hmacAuth, async (req, res) => {
  try {
    const users = await User.find({ bookType: 'A' })
      .select('firstName lastName email bookType bookChangedAt createdAt')
      .sort({ bookChangedAt: -1 })

    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      bookType: user.bookType,
      bookChangedAt: user.bookChangedAt,
      createdAt: user.createdAt
    }))

    res.json({
      success: true,
      data: formattedUsers,
      total: users.length
    })
  } catch (error) {
    console.error('Error fetching A-Book users for external API:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users', 
      error: error.message 
    })
  }
})

// GET /api/external/a-book/stats - Get A-Book statistics
// Queries by user.bookType='A' for backward compatibility with existing trades
router.get('/a-book/stats', hmacAuth, async (req, res) => {
  try {
    // Get A-Book users
    const aBookUsers = await User.find({ bookType: 'A' }).select('_id')
    const aBookUserIds = aBookUsers.map(u => u._id)

    const openTrades = await Trade.countDocuments({ 
      userId: { $in: aBookUserIds }, 
      status: 'OPEN' 
    })
    
    const closedTrades = await Trade.countDocuments({ 
      userId: { $in: aBookUserIds }, 
      status: 'CLOSED' 
    })

    // Aggregate for performance - query by userId instead of bookType
    const aggregateStats = await Trade.aggregate([
      { $match: { userId: { $in: aBookUserIds } } },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$quantity' },
          totalPnl: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'CLOSED'] }, '$realizedPnl', 0] 
            } 
          },
          totalCommission: { $sum: '$commission' }
        }
      }
    ])

    const stats = aggregateStats[0] || { totalVolume: 0, totalPnl: 0, totalCommission: 0 }

    res.json({
      success: true,
      data: {
        aBookUsers: aBookUsers.length,
        openTrades,
        closedTrades,
        totalTrades: openTrades + closedTrades,
        totalVolume: stats.totalVolume || 0,
        totalPnl: stats.totalPnl || 0,
        totalCommission: stats.totalCommission || 0
      }
    })
  } catch (error) {
    console.error('Error fetching A-Book stats for external API:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats', 
      error: error.message 
    })
  }
})

// POST /api/external/migrate - Migrate existing trades to book type system (run once)
router.post('/migrate', hmacAuth, async (req, res) => {
  try {
    const result = await tradeRouter.migrateExistingTrades()
    res.json({
      success: true,
      message: 'Migration completed',
      ...result
    })
  } catch (error) {
    console.error('Error migrating trades:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    })
  }
})

export default router
