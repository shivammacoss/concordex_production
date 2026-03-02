import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import Transaction from '../models/Transaction.js'
import Trade from '../models/Trade.js'
import Wallet from '../models/Wallet.js'
import MasterTrader from '../models/MasterTrader.js'
import CopyFollower from '../models/CopyFollower.js'
import CopyTrade from '../models/CopyTrade.js'
import CopyCommission from '../models/CopyCommission.js'
import CopySettings from '../models/CopySettings.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'

async function resetDashboardStats() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const [transactionCount, tradeCount, walletCount, masterCount, followerCount, copyTradeCount, commissionCount] = await Promise.all([
      Transaction.countDocuments(),
      Trade.countDocuments(),
      Wallet.countDocuments(),
      MasterTrader.countDocuments(),
      CopyFollower.countDocuments(),
      CopyTrade.countDocuments(),
      CopyCommission.countDocuments()
    ])

    console.log(`\nCurrent counts:`)
    console.log(`  Transactions: ${transactionCount}`)
    console.log(`  Trades: ${tradeCount}`)
    console.log(`  Wallets: ${walletCount}`)
    console.log(`  Master Traders: ${masterCount}`)
    console.log(`  Copy Followers: ${followerCount}`)
    console.log(`  Copy Trades: ${copyTradeCount}`)
    console.log(`  Copy Commissions: ${commissionCount}`)

    console.log('\n--- Resetting dashboard data ---')
    const deletedTransactions = await Transaction.deleteMany({})
    console.log(`Deleted ${deletedTransactions.deletedCount} transactions`)

    const deletedTrades = await Trade.deleteMany({})
    console.log(`Deleted ${deletedTrades.deletedCount} trades`)

    if (walletCount > 0) {
      const walletUpdate = await Wallet.updateMany({}, { $set: { balance: 0, pendingDeposits: 0, pendingWithdrawals: 0 } })
      console.log(`Reset balances on ${walletUpdate.modifiedCount} wallets`)
    }

    console.log('\n--- Resetting copy trading data ---')
    const [deletedMasters, deletedFollowers, deletedCopyTrades, deletedCommissions] = await Promise.all([
      MasterTrader.deleteMany({}),
      CopyFollower.deleteMany({}),
      CopyTrade.deleteMany({}),
      CopyCommission.deleteMany({})
    ])

    console.log(`Deleted ${deletedMasters.deletedCount} master traders`)
    console.log(`Deleted ${deletedFollowers.deletedCount} copy followers`)
    console.log(`Deleted ${deletedCopyTrades.deletedCount} copy trades`)
    console.log(`Deleted ${deletedCommissions.deletedCount} copy commission records`)

    const settings = await CopySettings.getSettings()
    if (settings) {
      settings.adminCopyPool = 0
      await settings.save()
      console.log('Reset admin copy pool to $0')
    }

    console.log('\nDashboard stats should now read zero (no deposits, withdrawals, or active trades).')
    console.log('Copy trading dashboard should now show zero masters, followers, trades, and admin pool.')

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('Error resetting dashboard stats:', error)
    process.exit(1)
  }
}

resetDashboardStats()
