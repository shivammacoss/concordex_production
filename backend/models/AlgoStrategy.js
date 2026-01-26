import mongoose from 'mongoose'
import crypto from 'crypto'

const algoStrategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  symbol: {
    type: String,
    required: true
  },
  timeframe: {
    type: String,
    enum: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
    default: '1H'
  },
  defaultQuantity: {
    type: Number,
    default: 0.01,
    min: 0.01
  },
  // Webhook secret for this strategy (auto-generated in pre-save hook)
  webhookSecret: {
    type: String,
    unique: true
  },
  // Copy trading integration
  copyTradingEnabled: {
    type: Boolean,
    default: false
  },
  // Support multiple master traders
  masterTraderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterTrader'
  }],
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'STOPPED'],
    default: 'ACTIVE'
  },
  // Statistics
  stats: {
    totalSignals: { type: Number, default: 0 },
    buySignals: { type: Number, default: 0 },
    sellSignals: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 },
    openPositions: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    totalPnl: { type: Number, default: 0 },
    todayPnl: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }
  },
  // Track last signal
  lastSignal: {
    action: String,
    side: String,
    price: Number,
    timestamp: Date
  },
  // Created by admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true })

// Generate unique webhook secret before saving
algoStrategySchema.pre('save', function(next) {
  if (!this.webhookSecret) {
    this.webhookSecret = crypto.randomBytes(32).toString('hex')
  }
  next()
})

// Index for efficient queries (webhookSecret already has unique: true which creates an index)
algoStrategySchema.index({ status: 1 })
algoStrategySchema.index({ masterTraderId: 1 })

export default mongoose.model('AlgoStrategy', algoStrategySchema)
