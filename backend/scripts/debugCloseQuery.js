import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Trade from '../models/Trade.js'
import MasterTrader from '../models/MasterTrader.js'
import AlgoStrategy from '../models/AlgoStrategy.js'

dotenv.config()

async function debugCloseQuery() {
  await mongoose.connect(process.env.MONGODB_URI)
  
  // Get strategy
  const strategy = await AlgoStrategy.findOne({ copyTradingEnabled: true }).lean()
  console.log('Strategy:', strategy.name)
  
  // Get master trader IDs
  const masterTraderIds = strategy.masterTraderIds.map(m => m._id || m)
  console.log('masterTraderIds:', masterTraderIds)
  
  // Query masters with .lean()
  const masterTraders = await MasterTrader.find({ _id: { $in: masterTraderIds } }).lean()
  console.log('Found masters:', masterTraders.length)
  
  for (const master of masterTraders) {
    const accountId = master.tradingAccountId
    console.log(`\nMaster: ${master.displayName}`)
    console.log(`  accountId: ${accountId}`)
    console.log(`  accountId type: ${typeof accountId}`)
    console.log(`  accountId instanceof ObjectId: ${accountId instanceof mongoose.Types.ObjectId}`)
    
    // Convert to ObjectId
    const accountObjectId = typeof accountId === 'string' 
      ? new mongoose.Types.ObjectId(accountId) 
      : accountId
    console.log(`  accountObjectId: ${accountObjectId}`)
    console.log(`  accountObjectId type: ${typeof accountObjectId}`)
    
    // Try query with converted ObjectId
    const trades1 = await Trade.find({
      tradingAccountId: accountObjectId,
      symbol: { $regex: /^ethusd$/i },
      status: 'OPEN'
    })
    console.log(`  Query with ObjectId: ${trades1.length} trades`)
    
    // Try query with string
    const trades2 = await Trade.find({
      tradingAccountId: String(accountId),
      symbol: { $regex: /^ethusd$/i },
      status: 'OPEN'
    })
    console.log(`  Query with String: ${trades2.length} trades`)
    
    // Try query with just accountId as-is
    const trades3 = await Trade.find({
      tradingAccountId: accountId,
      symbol: { $regex: /^ethusd$/i },
      status: 'OPEN'
    })
    console.log(`  Query with original accountId: ${trades3.length} trades`)
    
    // Check what trades exist for this account
    const allTrades = await Trade.find({ tradingAccountId: accountObjectId }).lean()
    console.log(`  All trades for this account: ${allTrades.length}`)
    allTrades.forEach(t => {
      console.log(`    - ${t._id}: ${t.symbol} ${t.side} ${t.status}`)
    })
  }
  
  process.exit(0)
}

debugCloseQuery().catch(err => {
  console.error(err)
  process.exit(1)
})
