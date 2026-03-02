import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import TradingAccount from '../models/TradingAccount.js'
import KYC from '../models/KYC.js'
import Trade from '../models/Trade.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'
const KEEP_USER_EMAILS = (process.env.KEEP_USER_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

async function deleteAllUsers() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Get count before deletion
    const userCount = await User.countDocuments()
    console.log(`\nFound ${userCount} users in the database`)

    if (userCount === 0) {
      console.log('No users to delete.')
      await mongoose.disconnect()
      return
    }

    // Get all user IDs for related data cleanup
    const users = await User.find({}, '_id email')
    const deletableUsers = KEEP_USER_EMAILS.length
      ? users.filter((u) => !KEEP_USER_EMAILS.includes((u.email || '').toLowerCase()))
      : users
    const userIds = deletableUsers.map((u) => u._id)
    const skippedUsers = users.length - deletableUsers.length
    
    if (skippedUsers > 0) {
      console.log(`\nSkipping ${skippedUsers} users listed in KEEP_USER_EMAILS`)
    }

    if (deletableUsers.length === 0) {
      console.log('\nNo users eligible for deletion (all are protected).')
      await mongoose.disconnect()
      return
    }

    console.log('\nUsers to be deleted:')
    deletableUsers.forEach((u) => console.log(`  - ${u.email}`))

    // Delete related data
    console.log('\n--- Deleting related data ---')
    
    const walletResult = await Wallet.deleteMany({ userId: { $in: userIds } })
    console.log(`Deleted ${walletResult.deletedCount} wallets`)

    const tradingAccountResult = await TradingAccount.deleteMany({ userId: { $in: userIds } })
    console.log(`Deleted ${tradingAccountResult.deletedCount} trading accounts`)

    const kycResult = await KYC.deleteMany({ userId: { $in: userIds } })
    console.log(`Deleted ${kycResult.deletedCount} KYC records`)

    const tradeResult = await Trade.deleteMany({ userId: { $in: userIds } })
    console.log(`Deleted ${tradeResult.deletedCount} trades`)

    // Delete all users
    console.log('\n--- Deleting all users ---')
    const result = await User.deleteMany({ _id: { $in: userIds } })
    console.log(`\n✅ Successfully deleted ${result.deletedCount} users`)

    // Verify
    const remainingUsers = await User.countDocuments()
    console.log(`Remaining users in database: ${remainingUsers}`)

    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
    
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

deleteAllUsers()
