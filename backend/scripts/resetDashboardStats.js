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
import TradingAccount from '../models/TradingAccount.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import AdminLog from '../models/AdminLog.js'
import lpIntegration from '../services/lpIntegration.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const resetDashboardStats = async () => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    console.log('Starting dashboard stats reset...')

    // Step 1: Close all open A-Book trades in LP before local deletion
    console.log('Step 1: Closing A-Book trades in LP...')
    const openABookTrades = await Trade.find({ status: 'OPEN', bookType: 'A' }).session(session)
    
    if (openABookTrades.length > 0 && lpIntegration.isConfigured()) {
      console.log(`Found ${openABookTrades.length} open A-Book trades to close in LP`)
      
      // Group trades by user for batch processing
      const tradesByUser = {}
      for (const trade of openABookTrades) {
        const userId = trade.userId.toString()
        if (!tradesByUser[userId]) {
          tradesByUser[userId] = []
        }
        tradesByUser[userId].push(trade)
      }
      
      // Close trades user by user
      for (const [userId, trades] of Object.entries(tradesByUser)) {
        console.log(`Closing ${trades.length} trades for user ${userId} in LP`)
        const closeResult = await lpIntegration.closeAllUserTrades(userId)
        
        if (!closeResult.success) {
          console.error(`Failed to close trades for user ${userId}: ${closeResult.error}`)
          // Continue with other users even if one fails
        } else {
          console.log(`Closed ${closeResult.closed}/${closeResult.total} trades for user ${userId}`)
        }
      }
    } else {
      console.log('No open A-Book trades found or LP not configured')
    }

    // Step 2: Remove all A-Book users from LP
    console.log('Step 2: Removing A-Book users from LP...')
    const aBookUsers = await User.aggregate([
      { $lookup: { from: 'trades', localField: '_id', foreignField: 'userId', as: 'userTrades' } },
      { $match: { 'userTrades.bookType': 'A' } },
      { $group: { _id: '$_id', user: { $first: '$$ROOT' } } }
    ]).session(session)
    
    if (aBookUsers.length > 0 && lpIntegration.isConfigured()) {
      console.log(`Found ${aBookUsers.length} A-Book users to remove from LP`)
      
      for (const { user } of aBookUsers) {
        try {
          const removeResult = await lpIntegration.removeABookUser(user)
          if (!removeResult.success) {
            console.error(`Failed to remove user ${user.email} from LP: ${removeResult.error}`)
          } else {
            console.log(`Removed user ${user.email} from LP`)
          }
        } catch (error) {
          console.error(`Error removing user ${user.email} from LP: ${error.message}`)
        }
      }
    } else {
      console.log('No A-Book users found or LP not configured')
    }
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
