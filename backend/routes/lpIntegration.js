/**
 * LP Integration Routes
 * 
 * Endpoints for Corecen LP to push data to Concordex:
 * - Instruments (from Infoway API)
 * - Real-time prices
 * - Order execution results
 */

import express from 'express'
import crypto from 'crypto'
import Instrument from '../models/Instrument.js'

const router = express.Router()

// LP API credentials (should match Corecen's config)
const LP_API_KEY = process.env.LP_API_KEY || 'concordex_lp_api_key'
const LP_API_SECRET = process.env.LP_API_SECRET || 'concordex_lp_api_secret'

// Price cache for real-time distribution
const lpPriceCache = new Map()

/**
 * HMAC Authentication Middleware
 * Validates requests from Corecen LP
 */
function validateLpRequest(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key']
    const timestamp = req.headers['x-timestamp']
    const signature = req.headers['x-signature']

    if (!apiKey || !timestamp || !signature) {
      return res.status(401).json({ success: false, message: 'Missing authentication headers' })
    }

    if (apiKey !== LP_API_KEY) {
      return res.status(401).json({ success: false, message: 'Invalid API key' })
    }

    // Check timestamp (5 minute window)
    const now = Date.now()
    const requestTime = parseInt(timestamp, 10)
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ success: false, message: 'Request expired' })
    }

    // Verify HMAC signature
    const body = req.body ? JSON.stringify(req.body) : ''
    const method = req.method.toUpperCase()
    const path = req.originalUrl
    const message = `${method}${path}${timestamp}${body}`
    const expectedSignature = crypto.createHmac('sha256', LP_API_SECRET).update(message).digest('hex')

    if (signature !== expectedSignature) {
      return res.status(401).json({ success: false, message: 'Invalid signature' })
    }

    next()
  } catch (error) {
    console.error('LP auth error:', error)
    res.status(500).json({ success: false, message: 'Authentication error' })
  }
}

// ═══════════════════════════════════════════════════════════════
// INSTRUMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/lp/instruments/bulk
 * Receive bulk instruments from Corecen (synced from Infoway)
 */
router.post('/instruments/bulk', validateLpRequest, async (req, res) => {
  try {
    const { brokerId, instruments } = req.body

    if (!instruments || !Array.isArray(instruments)) {
      return res.status(400).json({ success: false, message: 'instruments array required' })
    }

    const results = []
    const bulkOps = []

    for (const inst of instruments) {
      bulkOps.push({
        updateOne: {
          filter: { symbol: inst.symbol },
          update: {
            $set: {
              symbol: inst.symbol,
              name: inst.name || inst.symbol,
              assetClass: inst.assetClass || 'CFD',
              bookType: inst.bookType || 'B_BOOK',
              markupBps: inst.markupBps || 0,
              commissionPerLot: inst.commissionPerLot || 7,
              precision: inst.precision || 5,
              contractSize: inst.contractSize || 100000,
              minLotSize: inst.minLotSize || 0.01,
              maxLotSize: inst.maxLotSize || 100,
              lotStep: inst.lotStep || 0.01,
              marginPercent: inst.marginPercent || 1,
              enabled: inst.enabled !== false,
              source: 'CORECEN_LP',
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      })

      results.push({ symbol: inst.symbol, status: 'UPDATED' })
    }

    if (bulkOps.length > 0) {
      await Instrument.bulkWrite(bulkOps, { ordered: false })
    }

    console.log(`[LP] Received ${instruments.length} instruments from Corecen`)

    res.json({
      success: true,
      results,
      message: `Processed ${instruments.length} instruments`,
    })
  } catch (error) {
    console.error('LP instruments bulk error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * POST /api/lp/instruments
 * Receive single instrument from Corecen
 */
router.post('/instruments', validateLpRequest, async (req, res) => {
  try {
    const { brokerId, symbol, ...instrumentData } = req.body

    if (!symbol) {
      return res.status(400).json({ success: false, message: 'symbol required' })
    }

    await Instrument.findOneAndUpdate(
      { symbol },
      {
        $set: {
          symbol,
          ...instrumentData,
          source: 'CORECEN_LP',
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    )

    console.log(`[LP] Received instrument ${symbol} from Corecen`)

    res.json({ success: true, symbol, status: 'UPDATED' })
  } catch (error) {
    console.error('LP instrument error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// PRICE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/lp/prices/batch
 * Receive batch price updates from Corecen (100ms intervals)
 */
router.post('/prices/batch', validateLpRequest, (req, res) => {
  try {
    const { brokerId, ticks, timestamp } = req.body

    if (!ticks || !Array.isArray(ticks)) {
      return res.status(400).json({ success: false, message: 'ticks array required' })
    }

    const now = Date.now()

    for (const tick of ticks) {
      lpPriceCache.set(tick.symbol, {
        bid: tick.bid,
        ask: tick.ask,
        spread: tick.spread || (tick.ask - tick.bid),
        timestamp: tick.timestamp || now,
        source: 'CORECEN_LP',
      })
    }

    // Emit to connected WebSocket clients (if io is available)
    if (global.io) {
      global.io.emit('prices:update', { ticks, timestamp: now })
    }

    res.json({ success: true, received: ticks.length })
  } catch (error) {
    console.error('LP prices batch error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * POST /api/lp/prices
 * Receive single price update from Corecen
 */
router.post('/prices', validateLpRequest, (req, res) => {
  try {
    const { brokerId, symbol, bid, ask, spread, timestamp } = req.body

    if (!symbol || bid === undefined || ask === undefined) {
      return res.status(400).json({ success: false, message: 'symbol, bid, ask required' })
    }

    const now = Date.now()

    lpPriceCache.set(symbol, {
      bid,
      ask,
      spread: spread || (ask - bid),
      timestamp: timestamp || now,
      source: 'CORECEN_LP',
    })

    res.json({ success: true, symbol })
  } catch (error) {
    console.error('LP price error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

/**
 * GET /api/lp/prices
 * Get all LP prices (for internal use)
 */
router.get('/prices', (req, res) => {
  const prices = {}
  for (const [symbol, data] of lpPriceCache) {
    prices[symbol] = data
  }
  res.json({ success: true, prices, count: lpPriceCache.size })
})

/**
 * GET /api/lp/prices/:symbol
 * Get single LP price (for internal use)
 */
router.get('/prices/:symbol', (req, res) => {
  const { symbol } = req.params
  const price = lpPriceCache.get(symbol)

  if (price) {
    res.json({ success: true, price })
  } else {
    res.status(404).json({ success: false, message: 'Price not available' })
  }
})

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    priceCount: lpPriceCache.size,
    timestamp: Date.now(),
  })
})

// Export price cache for use in other modules
export const getLpPrice = (symbol) => lpPriceCache.get(symbol)
export const getAllLpPrices = () => lpPriceCache

export default router
