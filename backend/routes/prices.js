import express from 'express'
import { getAllLpPrices } from './lpIntegration.js'

const router = express.Router()

// Binance symbol mapping for crypto (fallback only)
const BINANCE_SYMBOLS = {
  'BTCUSD': 'BTCUSDT',
  'ETHUSD': 'ETHUSDT',
  'BNBUSD': 'BNBUSDT',
  'SOLUSD': 'SOLUSDT',
  'XRPUSD': 'XRPUSDT',
  'ADAUSD': 'ADAUSDT',
  'DOGEUSD': 'DOGEUSDT',
  'DOTUSD': 'DOTUSDT',
  'MATICUSD': 'POLUSDT',
  'POLUSD': 'POLUSDT',
  'LTCUSD': 'LTCUSDT',
  'AVAXUSD': 'AVAXUSDT',
  'LINKUSD': 'LINKUSDT'
}

// GET /api/prices/instruments - Get all available trading instruments
router.get('/instruments', (req, res) => {
  const instruments = [
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
    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals' },
    { symbol: 'XAGUSD', name: 'Silver', category: 'Metals' },
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
      res.json({ success: true, price: { bid: priceData.bid, ask: priceData.ask } })
    } else {
      // Fallback to Binance for crypto only
      if (BINANCE_SYMBOLS[symbol]) {
        try {
          const binanceSymbol = BINANCE_SYMBOLS[symbol]
          const response = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${binanceSymbol}`)
          if (response.ok) {
            const data = await response.json()
            res.json({ success: true, price: { bid: parseFloat(data.bidPrice), ask: parseFloat(data.askPrice) } })
            return
          }
        } catch (e) {
          console.error(`Binance fallback error for ${symbol}:`, e.message)
        }
      }
      res.status(404).json({ success: false, message: 'Price not available' })
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
    const missingCrypto = []
    
    // Get prices from LP cache first
    for (const symbol of symbols) {
      const priceData = lpPrices.get(symbol)
      if (priceData && priceData.bid) {
        prices[symbol] = { bid: priceData.bid, ask: priceData.ask }
      } else if (BINANCE_SYMBOLS[symbol]) {
        missingCrypto.push(symbol)
      }
    }
    
    // Fallback: fetch missing crypto from Binance
    if (missingCrypto.length > 0) {
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker')
        if (response.ok) {
          const allTickers = await response.json()
          const tickerMap = {}
          allTickers.forEach(t => { tickerMap[t.symbol] = t })
          
          missingCrypto.forEach(symbol => {
            const binanceSymbol = BINANCE_SYMBOLS[symbol]
            const ticker = tickerMap[binanceSymbol]
            if (ticker) {
              prices[symbol] = { bid: parseFloat(ticker.bidPrice), ask: parseFloat(ticker.askPrice) }
            }
          })
        }
      } catch (e) {
        console.error('Binance batch fallback error:', e.message)
      }
    }
    
    res.json({ success: true, prices })
  } catch (error) {
    console.error('Error fetching batch prices:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
