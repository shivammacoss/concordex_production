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
import SupportTicket from '../models/SupportTicket.js'
import AlgoStrategy from '../models/AlgoStrategy.js'
import TradingViewSignal from '../models/TradingViewSignal.js'
import IBUser from '../models/IBUser.js'
import IBWallet from '../models/IBWallet.js'
import IBCommission from '../models/IBCommission.js'
import IBReferral from '../models/IBReferral.js'
import UserCryptoWallet from '../models/UserCryptoWallet.js'
import UserBankAccount from '../models/UserBankAccount.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'

async function resetDashboardStats() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const [transactionCount, tradeCount, walletCount, masterCount, followerCount, copyTradeCount, commissionCount, ticketCount, strategyCount, signalCount, ibUserCount, ibWalletCount, ibCommissionCount, ibReferralCount, cryptoWalletCount, bankAccountCount] = await Promise.all([
      Transaction.countDocuments(),
      Trade.countDocuments(),
      Wallet.countDocuments(),
      MasterTrader.countDocuments(),
      CopyFollower.countDocuments(),
      CopyTrade.countDocuments(),
      CopyCommission.countDocuments(),
      SupportTicket.countDocuments(),
      AlgoStrategy.countDocuments(),
      TradingViewSignal.countDocuments(),
      IBUser.countDocuments(),
      IBWallet.countDocuments(),
      IBCommission.countDocuments(),
      IBReferral.countDocuments(),
      UserCryptoWallet.countDocuments(),
      UserBankAccount.countDocuments()
    ])

    console.log(`\nCurrent counts:`)
    console.log(`  Transactions: ${transactionCount}`)
    console.log(`  Trades: ${tradeCount}`)
    console.log(`  Wallets: ${walletCount}`)
    console.log(`  Master Traders: ${masterCount}`)
    console.log(`  Copy Followers: ${followerCount}`)
    console.log(`  Copy Trades: ${copyTradeCount}`)
    console.log(`  Copy Commissions: ${commissionCount}`)
    console.log(`  Support Tickets: ${ticketCount}`)
    console.log(`  Algo Strategies: ${strategyCount}`)
    console.log(`  TradingView Signals: ${signalCount}`)
    console.log(`  IB Users: ${ibUserCount}`)
    console.log(`  IB Wallets: ${ibWalletCount}`)
    console.log(`  IB Commissions: ${ibCommissionCount}`)
    console.log(`  IB Referrals: ${ibReferralCount}`)
    console.log(`  User Crypto Wallet Requests: ${cryptoWalletCount}`)
    console.log(`  User Bank Accounts: ${bankAccountCount}`)

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

    const deletedTickets = await SupportTicket.deleteMany({})
    console.log(`Deleted ${deletedTickets.deletedCount} support tickets`)

    const [deletedAlgoStrategies, deletedSignals] = await Promise.all([
      AlgoStrategy.deleteMany({}),
      TradingViewSignal.deleteMany({})
    ])

    console.log(`Deleted ${deletedAlgoStrategies.deletedCount} algo strategies`)
    console.log(`Deleted ${deletedSignals.deletedCount} TradingView signals`)

    console.log('\n--- Resetting IB data ---')
    const [deletedIbUsers, deletedIbWallets, deletedIbCommissions, deletedIbReferrals, deletedCryptoWallets, deletedBankAccounts] = await Promise.all([
      IBUser.deleteMany({}),
      IBWallet.deleteMany({}),
      IBCommission.deleteMany({}),
      IBReferral.deleteMany({}),
      UserCryptoWallet.deleteMany({}),
      UserBankAccount.deleteMany({})
    ])

    console.log(`Deleted ${deletedIbUsers.deletedCount} IB users`)
    console.log(`Deleted ${deletedIbWallets.deletedCount} IB wallets`)
    console.log(`Deleted ${deletedIbCommissions.deletedCount} IB commission entries`)
    console.log(`Deleted ${deletedIbReferrals.deletedCount} IB referrals`)
    console.log(`Deleted ${deletedCryptoWallets.deletedCount} user crypto wallets`)
    console.log(`Deleted ${deletedBankAccounts.deletedCount} user bank/local withdrawal requests`)

    console.log('\nDashboard stats should now read zero (no deposits, withdrawals, support tickets, active trades, algo stats, IB metrics, crypto wallet requests, or local withdrawal/bank requests).')
    console.log('Copy trading dashboard should now show zero masters, followers, trades, and admin pool, algo dashboard should have no strategies/signals, IB dashboard should have zero counts/commissions, and all Bank Settings tabs should be empty.')

    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  } catch (error) {
    console.error('Error resetting dashboard stats:', error)
    process.exit(1)
  }
}

resetDashboardStats()
