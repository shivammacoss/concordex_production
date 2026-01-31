import mongoose from 'mongoose'

const userCryptoWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  network: {
    type: String,
    required: true,
    enum: ['TRC20', 'ERC20', 'BEP20', 'BTC', 'ETH', 'LTC', 'LOCAL']
  },
  walletAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, { timestamps: true })

// Index for efficient queries
userCryptoWalletSchema.index({ userId: 1, status: 1 })

export default mongoose.model('UserCryptoWallet', userCryptoWalletSchema)
