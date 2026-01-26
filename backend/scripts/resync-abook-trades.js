/**
 * Script to re-sync failed A-Book trades to Corcen LP
 * Run with: node scripts/resync-abook-trades.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Trade from '../models/Trade.js'
import User from '../models/User.js'
import * as lpIntegration from '../services/lpIntegration.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Concorddex'

async function resyncTrades() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Check if LP integration is configured
    if (!lpIntegration.isConfigured()) {
      console.error('LP Integration is not configured. Please set LP_API_KEY and LP_API_SECRET in .env')
      process.exit(1)
    }

    console.log('LP Integration is configured')

    // Find all A-Book trades that failed to sync or haven't been synced
    const failedTrades = await Trade.find({
      bookType: 'A',
      $or: [
        { lpSyncStatus: 'FAILED' },
        { lpSyncStatus: 'PENDING' },
        { lpSyncStatus: { $exists: false } }
      ]
    }).populate('userId')

    console.log(`Found ${failedTrades.length} trades to re-sync`)

    let successCount = 0
    let failCount = 0

    for (const trade of failedTrades) {
      const user = trade.userId
      console.log(`\nRe-syncing trade: ${trade.tradeId} (${trade.symbol})`)

      try {
        if (trade.status === 'OPEN') {
          // Push open trade
          const result = await lpIntegration.pushTrade(trade, user)
          if (result.success) {
            trade.lpSyncStatus = 'SYNCED'
            trade.lpSyncedAt = new Date()
            await trade.save()
            console.log(`  ✓ Trade synced successfully`)
            successCount++
          } else {
            console.log(`  ✗ Failed: ${result.error}`)
            failCount++
          }
        } else if (trade.status === 'CLOSED') {
          // First push the trade, then close it
          const pushResult = await lpIntegration.pushTrade(trade, user)
          if (pushResult.success) {
            // Now close it
            const closeResult = await lpIntegration.closeTrade(trade)
            if (closeResult.success) {
              trade.lpSyncStatus = 'SYNCED'
              trade.lpSyncedAt = new Date()
              await trade.save()
              console.log(`  ✓ Trade synced and closed successfully`)
              successCount++
            } else {
              console.log(`  ✗ Push succeeded but close failed: ${closeResult.error}`)
              failCount++
            }
          } else {
            console.log(`  ✗ Failed to push: ${pushResult.error}`)
            failCount++
          }
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`)
        failCount++
      }
    }

    console.log(`\n========== Summary ==========`)
    console.log(`Total trades: ${failedTrades.length}`)
    console.log(`Successful: ${successCount}`)
    console.log(`Failed: ${failCount}`)
    console.log(`==============================`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
  }
}

resyncTrades()
