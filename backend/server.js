import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import accountTypesRoutes from './routes/accountTypes.js'
import tradingAccountsRoutes from './routes/tradingAccounts.js'
import walletRoutes from './routes/wallet.js'
import paymentMethodsRoutes from './routes/paymentMethods.js'
import tradeRoutes from './routes/trade.js'
import walletTransferRoutes from './routes/walletTransfer.js'
import adminTradeRoutes from './routes/adminTrade.js'
import copyTradingRoutes from './routes/copyTrading.js'
import ibRoutes from './routes/ibNew.js'
import propTradingRoutes from './routes/propTrading.js'
import chargesRoutes from './routes/charges.js'
import pricesRoutes from './routes/prices.js'
import earningsRoutes from './routes/earnings.js'
import supportRoutes from './routes/support.js'
import kycRoutes from './routes/kyc.js'
import themeRoutes from './routes/theme.js'
import adminManagementRoutes from './routes/adminManagement.js'
import uploadRoutes from './routes/upload.js'
import emailTemplatesRoutes from './routes/emailTemplates.js'
import bookManagementRoutes from './routes/bookManagement.js'
import tradingviewWebhookRoutes from './routes/tradingviewWebhook.js'
import algoStrategyRoutes from './routes/algoStrategy.js'
import externalApiRoutes from './routes/externalApi.js'
import lpIntegrationRoutes, { getAllLpPrices } from './routes/lpIntegration.js'
import corecenSocketClient from './services/corecenSocketClient.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

// Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Store connected clients
const connectedClients = new Map()
const priceSubscribers = new Set()

// Price cache - now populated by Corecen LP via /api/lp/prices endpoints
// Fallback to direct Binance for crypto if LP prices not available
const BINANCE_SYMBOLS = {
  'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT', 'BNBUSD': 'BNBUSDT',
  'SOLUSD': 'SOLUSDT', 'XRPUSD': 'XRPUSDT', 'ADAUSD': 'ADAUSDT',
  'MATICUSD': 'POLUSDT', 'POLUSD': 'POLUSDT',
  'DOGEUSD': 'DOGEUSDT', 'DOTUSD': 'DOTUSDT', 'LTCUSD': 'LTCUSDT'
}

// Background price streaming - now uses LP prices from Corecen
// Only fetches from Binance as fallback if LP prices are not available
async function streamPrices() {
  if (priceSubscribers.size === 0) return
  
  const now = Date.now()
  const lpPrices = getAllLpPrices()
  
  // If we have LP prices from Corecen, use them
  if (lpPrices.size > 0) {
    const prices = {}
    const updated = {}
    for (const [symbol, data] of lpPrices) {
      prices[symbol] = { bid: data.bid, ask: data.ask, time: data.time || now }
      // Mark as updated if recent (within last 2 seconds)
      if (data.time && (now - data.time) < 2000) {
        updated[symbol] = prices[symbol]
      }
    }
    
    io.to('prices').emit('priceStream', {
      prices,
      updated,
      timestamp: now,
      source: 'CORECEN_LP'
    })
    return
  }
  
  // Fallback: fetch from Binance directly for crypto only
  const updatedPrices = {}
  const priceCache = new Map()
  
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker')
    if (response.ok) {
      const tickers = await response.json()
      const tickerMap = {}
      tickers.forEach(t => { tickerMap[t.symbol] = t })
      
      Object.keys(BINANCE_SYMBOLS).forEach(symbol => {
        const ticker = tickerMap[BINANCE_SYMBOLS[symbol]]
        if (ticker) {
          const price = { bid: parseFloat(ticker.bidPrice), ask: parseFloat(ticker.askPrice), time: now }
          priceCache.set(symbol, price)
          updatedPrices[symbol] = price
        }
      })
    }
  } catch (e) {
    console.error('Binance fallback error:', e.message)
  }
  
  if (priceCache.size > 0) {
    io.to('prices').emit('priceStream', {
      prices: Object.fromEntries(priceCache),
      updated: updatedPrices,
      timestamp: now,
      source: 'BINANCE_FALLBACK'
    })
  }
}

// Start price streaming interval (broadcasts LP prices or fallback)
setInterval(streamPrices, 500)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Subscribe to real-time price stream
  socket.on('subscribePrices', async () => {
    socket.join('prices')
    priceSubscribers.add(socket.id)
    
    const now = Date.now()
    const lpPrices = getAllLpPrices()
    
    // If LP prices available from Corecen, use them
    if (lpPrices.size > 0) {
      const prices = {}
      for (const [symbol, data] of lpPrices) {
        prices[symbol] = { bid: data.bid, ask: data.ask, time: data.time || now }
      }
      socket.emit('priceStream', {
        prices,
        updated: {},
        timestamp: now,
        source: 'CORECEN_LP'
      })
      console.log(`Socket ${socket.id} subscribed to price stream (LP), cache size: ${lpPrices.size}`)
      return
    }
    
    // Fallback: fetch from Binance for crypto
    const priceCache = new Map()
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/bookTicker')
      if (response.ok) {
        const tickers = await response.json()
        const tickerMap = {}
        tickers.forEach(t => { tickerMap[t.symbol] = t })
        Object.keys(BINANCE_SYMBOLS).forEach(symbol => {
          const ticker = tickerMap[BINANCE_SYMBOLS[symbol]]
          if (ticker) {
            priceCache.set(symbol, { bid: parseFloat(ticker.bidPrice), ask: parseFloat(ticker.askPrice), time: now })
          }
        })
      }
    } catch (e) { console.error('Initial Binance fetch error:', e.message) }
    
    socket.emit('priceStream', {
      prices: Object.fromEntries(priceCache),
      updated: {},
      timestamp: now,
      source: 'BINANCE_FALLBACK'
    })
    console.log(`Socket ${socket.id} subscribed to price stream (fallback), cache size: ${priceCache.size}`)
  })

  // Unsubscribe from price stream
  socket.on('unsubscribePrices', () => {
    socket.leave('prices')
    priceSubscribers.delete(socket.id)
  })

  // Subscribe to account updates
  socket.on('subscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.join(`account:${tradingAccountId}`)
      connectedClients.set(socket.id, tradingAccountId)
      console.log(`Socket ${socket.id} subscribed to account ${tradingAccountId}`)
    }
  })

  // Unsubscribe from account updates
  socket.on('unsubscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.leave(`account:${tradingAccountId}`)
      connectedClients.delete(socket.id)
    }
  })

  // Handle price updates from client (for PnL calculation)
  socket.on('priceUpdate', async (data) => {
    const { tradingAccountId, prices } = data
    if (tradingAccountId && prices) {
      // Broadcast updated account summary to all subscribers
      io.to(`account:${tradingAccountId}`).emit('accountUpdate', {
        tradingAccountId,
        prices,
        timestamp: Date.now()
      })
    }
  })

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id)
    priceSubscribers.delete(socket.id)
    console.log('Client disconnected:', socket.id)
  })
})

// Make io accessible to routes
app.set('io', io)

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'
if (!process.env.MONGODB_URI) {
  console.warn('[MongoDB] MONGODB_URI is not set. Falling back to local mongodb://localhost:27017/concorddex_trading')
}
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/account-types', accountTypesRoutes)
app.use('/api/trading-accounts', tradingAccountsRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/payment-methods', paymentMethodsRoutes)
app.use('/api/trade', tradeRoutes)
app.use('/api/wallet-transfer', walletTransferRoutes)
app.use('/api/admin/trade', adminTradeRoutes)
app.use('/api/copy', copyTradingRoutes)
app.use('/api/ib', ibRoutes)
app.use('/api/prop', propTradingRoutes)
app.use('/api/charges', chargesRoutes)
app.use('/api/prices', pricesRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/theme', themeRoutes)
app.use('/api/admin-mgmt', adminManagementRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/email-templates', emailTemplatesRoutes)
app.use('/api/book', bookManagementRoutes)
app.use('/api/lp', lpIntegrationRoutes)

// Make io globally accessible for LP price updates
global.io = io
app.use('/api/tradingview', tradingviewWebhookRoutes)
app.use('/api/algo-strategies', algoStrategyRoutes)
app.use('/api/external', externalApiRoutes)

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Concorddex API is running' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Concorddex API is running', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  
  // Initialize Socket.IO connection to Corecen for real-time A-Book sync
  corecenSocketClient.initConnection()
})
