import mongoose from 'mongoose'

const tradingViewSignalSchema = new mongoose.Schema({
  signalId: {
    type: String,
    required: true,
    unique: true
  },
  strategy_name: {
    type: String,
    required: true
  },
  strategy_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlgoStrategy',
    default: null
  },
  action: {
    type: String,
    required: true,
    uppercase: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  side: {
    type: String,
    enum: ['BUY', 'SELL', null],
    default: null
  },
  quantity: {
    type: Number,
    default: 0.01
  },
  price: {
    type: Number,
    default: 0
  },
  order_type: {
    type: String,
    enum: ['MARKET', 'LIMIT', 'STOP'],
    default: 'MARKET'
  },
  take_profit: {
    type: Number,
    default: null
  },
  stop_loss: {
    type: Number,
    default: null
  },
  comment: {
    type: String,
    default: ''
  },
  close_all: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['RECEIVED', 'EXECUTED', 'CLOSED', 'CLOSED_ALL', 'NO_POSITION', 'ERROR', 'SIGNAL_ONLY'],
    default: 'RECEIVED'
  },
  message: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  copyTradingEnabled: {
    type: Boolean,
    default: false
  },
  masterTraders: {
    type: String,
    default: null
  },
  copyResults: {
    masters: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  processed_at: {
    type: Date,
    default: null
  }
}, { timestamps: true })

// Indexes for efficient queries
tradingViewSignalSchema.index({ strategy_id: 1 })
tradingViewSignalSchema.index({ strategy_name: 1 })
tradingViewSignalSchema.index({ symbol: 1 })
tradingViewSignalSchema.index({ action: 1 })
tradingViewSignalSchema.index({ status: 1 })
tradingViewSignalSchema.index({ createdAt: -1 })

export default mongoose.model('TradingViewSignal', tradingViewSignalSchema)
