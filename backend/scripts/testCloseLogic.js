import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

async function testCloseLogic() {
  await mongoose.connect(process.env.MONGODB_URI)
  
  const MasterTrader = mongoose.model('MasterTrader', new mongoose.Schema({}, { strict: false }))
  const AlgoStrategy = mongoose.model('AlgoStrategy', new mongoose.Schema({}, { strict: false }))
  const Trade = mongoose.model('Trade', new mongoose.Schema({}, { strict: false }))
  
  // Get strategy with copy trading enabled
  const strategy = await AlgoStrategy.findOne({ copyTradingEnabled: true }).lean()
  console.log('Strategy:', strategy.name)
  console.log('masterTraderIds:', strategy.masterTraderIds)
  
  // Map IDs
  const masterTraderIds = strategy.masterTraderIds.map(m => m._id || m)
  console.log('Mapped masterTraderIds:', masterTraderIds)
  
  // Query masters
  const masters = await MasterTrader.find({ _id: { $in: masterTraderIds } }).lean()
  console.log('Found masters:', masters.length)
  
  for (const m of masters) {
    console.log(`\nMaster: ${m.displayName}`)
    console.log(`  tradingAccountId: ${m.tradingAccountId}`)
    
    // Find open trades
    const trades = await Trade.find({
      tradingAccountId: m.tradingAccountId,
      symbol: { $regex: /^ethusd$/i },
      status: 'OPEN'
    }).lean()
    
    console.log(`  Open ETHUSD trades: ${trades.length}`)
    trades.forEach(t => {
      console.log(`    - Trade ${t._id}: ${t.side} ${t.quantity} @ ${t.openPrice}`)
    })
  }
  
  process.exit(0)
}

testCloseLogic().catch(err => {
  console.error(err)
  process.exit(1)
})
