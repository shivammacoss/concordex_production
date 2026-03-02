import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import Transaction from '../models/Transaction.js'
import Trade from '../models/Trade.js'
import Wallet from '../models/Wallet.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'

async function resetDashboardStats() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const [transactionCount, tradeCount, walletCount] = await Promise.all([
      Transaction.countDocuments(),
      Trade.countDocuments(),
      Wallet.countDocuments()
    ])

    console.log(`\nCurrent counts:`)
    console.log(`  Transactions: ${transactionCount}`)
    console.log(`  Trades: ${tradeCount}`)
    console.log(`  Wallets: ${walletCount}`)

    console.log('\n--- Resetting dashboard data ---')
    const deletedTransactions = await Transaction.deleteMany({})
    console.log(`Deleted ${deletedTransactions.deletedCount} transactions`)

    const deletedTrades = await Trade.deleteMany({})
    console.log(`Deleted ${deletedTrades.deletedCount} trades`)

    if (walletCount > 0) {
      const walletUpdate = await Wallet.updateMany({}, { $set: { balance: 0, pendingDeposits: 0, pendingWithdrawals: 0 } })
      console.log(`Reset balances on ${walletUpdate.modifiedCount} wallets`)
    }

    console.log('\nDashboard stats should now read zero (no deposits, withdrawals, or active trades).')

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('Error resetting dashboard stats:', error)
    process.exit(1)
  }
}

resetDashboardStats()
