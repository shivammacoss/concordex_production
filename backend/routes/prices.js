import express from 'express'
import { getAllLpPrices } from './lpIntegration.js'

const router = express.Router()

// All prices come from Corecen LP (Infoway) - no fallback needed

// GET /api/prices/instruments - Get all available trading instruments
router.get('/instruments', (req, res) => {
  const instruments = [
    // Forex
    { symbol: 'EURUSD', name: 'EUR/USD', category: 'Forex' },
    { symbol: 'GBPUSD', name: 'GBP/USD', category: 'Forex' },
    { symbol: 'USDJPY', name: 'USD/JPY', category: 'Forex' },
    { symbol: 'USDCHF', name: 'USD/CHF', category: 'Forex' },
    { symbol: 'AUDUSD', name: 'AUD/USD', category: 'Forex' },
    { symbol: 'NZDUSD', name: 'NZD/USD', category: 'Forex' },
    { symbol: 'USDCAD', name: 'USD/CAD', category: 'Forex' },
    { symbol: 'EURGBP', name: 'EUR/GBP', category: 'Forex' },
    { symbol: 'EURJPY', name: 'EUR/JPY', category: 'Forex' },
    { symbol: 'GBPJPY', name: 'GBP/JPY', category: 'Forex' },
    // Metals
    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals' },
    { symbol: 'XAGUSD', name: 'Silver', category: 'Metals' },
    // Crypto
    { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto' },
    { symbol: 'ETHUSD', name: 'Ethereum', category: 'Crypto' },
    { symbol: 'BNBUSD', name: 'BNB', category: 'Crypto' },
    { symbol: 'SOLUSD', name: 'Solana', category: 'Crypto' },
    { symbol: 'XRPUSD', name: 'XRP', category: 'Crypto' },
    { symbol: 'ADAUSD', name: 'Cardano', category: 'Crypto' },
    { symbol: 'DOGEUSD', name: 'Dogecoin', category: 'Crypto' },
    { symbol: 'DOTUSD', name: 'Polkadot', category: 'Crypto' },
    { symbol: 'MATICUSD', name: 'Polygon', category: 'Crypto' },
    { symbol: 'LTCUSD', name: 'Litecoin', category: 'Crypto' },
    { symbol: 'AVAXUSD', name: 'Avalanche', category: 'Crypto' },
    { symbol: 'LINKUSD', name: 'Chainlink', category: 'Crypto' },
  ]
  res.json({ success: true, instruments })
})

// GET /api/prices/:symbol - Get single symbol price from LP cache
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const lpPrices = getAllLpPrices()
    const priceData = lpPrices.get(symbol)
    
    if (priceData && priceData.bid) {
      res.json({ success: true, price: { bid: priceData.bid, ask: priceData.ask }, source: 'CORECEN_LP' })
    } else {
      res.status(404).json({ success: false, message: 'Price not available from LP' })
    }
  } catch (error) {
    console.error('Error fetching price:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prices/batch - Get multiple symbol prices from LP cache
router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, message: 'symbols array required' })
    }
    
    const prices = {}
    const lpPrices = getAllLpPrices()
    
    // Get all prices from LP cache
    for (const symbol of symbols) {
      const priceData = lpPrices.get(symbol)
      if (priceData && priceData.bid) {
        prices[symbol] = { bid: priceData.bid, ask: priceData.ask }
      }
    }
    
    res.json({ success: true, prices, source: 'CORECEN_LP' })
  } catch (error) {
    console.error('Error fetching batch prices:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
