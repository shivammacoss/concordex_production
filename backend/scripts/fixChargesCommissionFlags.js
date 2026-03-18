// Script to fix existing charges that have undefined commissionOnBuy/commissionOnSell/commissionOnClose
// Run with: node scripts/fixChargesCommissionFlags.js

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concordex'

async function fixCharges() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const Charges = mongoose.connection.collection('charges')

    // Find all charges where commissionOnBuy or commissionOnSell is not set
    const chargesWithMissingFlags = await Charges.find({
      $or: [
        { commissionOnBuy: { $exists: false } },
        { commissionOnSell: { $exists: false } },
        { commissionOnClose: { $exists: false } }
      ]
    }).toArray()

    console.log(`Found ${chargesWithMissingFlags.length} charges with missing commission flags`)

    for (const charge of chargesWithMissingFlags) {
      const update = {}
      
      // Default commissionOnBuy to true if not set
      if (charge.commissionOnBuy === undefined) {
        update.commissionOnBuy = true
      }
      
      // Default commissionOnSell to true if not set
      if (charge.commissionOnSell === undefined) {
        update.commissionOnSell = true
      }
      
      // Default commissionOnClose to false if not set
      if (charge.commissionOnClose === undefined) {
        update.commissionOnClose = false
      }

      if (Object.keys(update).length > 0) {
        await Charges.updateOne(
          { _id: charge._id },
          { $set: update }
        )
        console.log(`Fixed charge ${charge._id} (level: ${charge.level}, commission: ${charge.commissionValue}): set ${JSON.stringify(update)}`)
      }
    }

    console.log('Done fixing charges')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixCharges()
