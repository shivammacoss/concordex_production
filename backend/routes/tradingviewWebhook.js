import express from 'express'
import mongoose from 'mongoose'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import AlgoStrategy from '../models/AlgoStrategy.js'
import MasterTrader from '../models/MasterTrader.js'
import TradingViewSignal from '../models/TradingViewSignal.js'
import tradeEngine from '../services/tradeEngine.js'
import copyTradingEngine from '../services/copyTradingEngine.js'

const router = express.Router()

// In-memory cache for real-time dashboard (also saved to DB)
const recentSignals = []
const MAX_SIGNALS = 100

// POST /api/tradingview/webhook - Receive TradingView alerts
router.post('/webhook', async (req, res) => {
  console.log('[TradingView Webhook] Received request:', JSON.stringify(req.body))
  
  try {
    const {
      secret,
      strategy_name,
      action,
      symbol,
      side,
      quantity,
      price,
      order_type,
      take_profit,
      stop_loss,
      comment,
      close_all,
      alert_message
    } = req.body

    // Validate required fields
    if (!action || !symbol) {
      console.log('[TradingView Webhook] Missing required fields')
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: action, symbol'
      })
    }

    // Find strategy by webhook secret or global secret
    let strategy = null
    if (secret) {
      strategy = await AlgoStrategy.findOne({ webhookSecret: secret, status: 'ACTIVE' })
        .populate({
          path: 'masterTraderIds',
          populate: {
            path: 'tradingAccountId'
          }
        })
      
      // If not found by strategy secret, check global webhook secret
      if (!strategy && secret === process.env.TRADINGVIEW_WEBHOOK_SECRET) {
        // Valid global secret, continue without strategy-specific features
        console.log('[TradingView] Using global webhook secret')
      } else if (!strategy) {
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook secret'
        })
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Webhook secret required'
      })
    }

    // Create signal record
    const masterNames = strategy?.masterTraderIds?.map(m => m.displayName).join(', ') || null
    const signal = {
      id: `SIG${Date.now()}`,
      timestamp: new Date(),
      strategy_name: strategy?.name || strategy_name || 'Unknown',
      strategy_id: strategy?._id || null,
      action: action.toUpperCase(),
      symbol: symbol.toUpperCase(),
      side: side?.toUpperCase() || (action.toUpperCase() === 'BUY' ? 'BUY' : action.toUpperCase() === 'SELL' ? 'SELL' : null),
      quantity: parseFloat(quantity) || strategy?.defaultQuantity || 0.01,
      price: parseFloat(price) || 0,
      order_type: order_type?.toUpperCase() || 'MARKET',
      take_profit: take_profit ? parseFloat(take_profit) : null,
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      comment: comment || alert_message || '',
      close_all: close_all || false,
      status: 'RECEIVED',
      processed_at: null,
      error: null,
      copyTradingEnabled: strategy?.copyTradingEnabled || false,
      masterTraders: masterNames
    }

    // Store signal for dashboard
    recentSignals.unshift(signal)
    if (recentSignals.length > MAX_SIGNALS) {
      recentSignals.pop()
    }

    // Get Socket.IO instance from app
    const io = req.app.get('io')

    // Emit signal to all connected clients
    if (io) {
      io.emit('tradingview_signal', signal)
      io.emit('trade_alert', {
        type: 'TRADINGVIEW',
        signal,
        message: `${signal.strategy_name}: ${action} ${symbol} @ ${price || 'MARKET'}`
      })
    }

    // Process the signal based on action type
    let tradeResult = null
    let copyResults = []
    
    const actionUpper = action.toUpperCase()
    console.log('ACTION RECEIVED:', action, '-> actionUpper:', actionUpper)
    
    // OPEN TRADE (BUY/SELL)
    if (actionUpper === 'BUY' || actionUpper === 'SELL' || actionUpper === 'OPEN') {
      const tradeSide = actionUpper === 'OPEN' ? (side?.toUpperCase() || 'BUY') : actionUpper
      
      // DEBUG: Log copy trading status
      console.log(`[Algo] Strategy: ${strategy?.name}`)
      console.log(`[Algo] copyTradingEnabled: ${strategy?.copyTradingEnabled}`)
      console.log(`[Algo] masterTraderIds count: ${strategy?.masterTraderIds?.length || 0}`)
      if (strategy?.masterTraderIds?.length > 0) {
        strategy.masterTraderIds.forEach((m, i) => {
          console.log(`[Algo] Master ${i+1}: ${m.displayName}, Account: ${m.tradingAccountId?._id}, Status: ${m.tradingAccountId?.status}`)
        })
      }
      
      // If strategy has copy trading enabled, execute via all master traders
      if (strategy?.copyTradingEnabled && strategy?.masterTraderIds?.length > 0) {
        try {
          const tradePrice = signal.price || 0
          let totalMasterTrades = 0
          let totalCopySuccess = 0
          let totalCopyTotal = 0
          
          // Process each master trader
          for (const master of strategy.masterTraderIds) {
            const masterAccount = master.tradingAccountId
            
            if (!masterAccount || masterAccount.status !== 'Active') {
              console.log(`[Algo] Skipping inactive master ${master._id}`)
              continue
            }
            
            // Open trade for this master
            console.log(`[Algo] Opening master trade for ${master.displayName}: ${tradeSide} ${signal.quantity} ${signal.symbol}`)
            const masterTrade = await tradeEngine.openTrade(
              master.userId,
              masterAccount._id,
              signal.symbol,
              'Forex',
              tradeSide,
              'MARKET',
              signal.quantity,
              tradePrice,
              tradePrice,
              signal.stop_loss,
              signal.take_profit
            )
            
            totalMasterTrades++
            
            // Copy trade to all followers of this master
            console.log(`[Algo] Copying trade to followers of master ${master._id}`)
            const masterCopyResults = await copyTradingEngine.copyTradeToFollowers(masterTrade, master._id)
            copyResults.push(...masterCopyResults)
            
            const successCount = masterCopyResults.filter(r => r.status === 'SUCCESS').length
            totalCopySuccess += successCount
            totalCopyTotal += masterCopyResults.length
          }
          
          if (totalMasterTrades > 0) {
            signal.status = 'EXECUTED'
            signal.copyResults = {
              masters: totalMasterTrades,
              total: totalCopyTotal,
              success: totalCopySuccess,
              failed: totalCopyTotal - totalCopySuccess
            }
            signal.message = `Opened trades for ${totalMasterTrades} master(s), copied to ${totalCopySuccess}/${totalCopyTotal} followers`
            
            // Update strategy stats
            strategy.stats.totalSignals += 1
            strategy.stats.buySignals += tradeSide === 'BUY' ? 1 : 0
            strategy.stats.sellSignals += tradeSide === 'SELL' ? 1 : 0
            strategy.stats.totalTrades += totalMasterTrades
            strategy.stats.openPositions += totalMasterTrades
            strategy.lastSignal = {
              action: tradeSide,
              side: tradeSide,
              price: tradePrice,
              timestamp: new Date()
            }
            await strategy.save()
          } else {
            signal.status = 'ERROR'
            signal.error = 'No active master trading accounts found'
          }
        } catch (execError) {
          console.error('[Algo] Error executing trade:', execError)
          signal.status = 'ERROR'
          signal.error = execError.message
        }
      } else {
        signal.status = 'SIGNAL_ONLY'
        signal.message = 'Copy trading not enabled - signal logged only'
      }
    }
    // CLOSE TRADE
    else if (actionUpper === 'CLOSE' || actionUpper === 'EXIT') {
      console.log('========== CLOSE SIGNAL START ==========')
      console.log('Symbol:', signal.symbol)
      console.log('Strategy:', strategy?.name)
      console.log('copyTradingEnabled:', strategy?.copyTradingEnabled)
      console.log('masterTraderIds:', strategy?.masterTraderIds)
      
      // Debug: List all open trades in DB for this symbol (case-insensitive)
      const allOpenTrades = await Trade.find({ 
        symbol: { $regex: new RegExp(`^${signal.symbol}$`, 'i') }, 
        status: 'OPEN' 
      })
      console.log(`[Algo] Total open trades in DB for ${signal.symbol}: ${allOpenTrades.length}`)
      allOpenTrades.forEach(t => {
        console.log(`[Algo]   - Trade ${t._id}: symbol=${t.symbol}, accountId=${t.tradingAccountId}, qty=${t.quantity}, side=${t.side}`)
      })
      
      if (strategy?.copyTradingEnabled && strategy?.masterTraderIds?.length > 0) {
        try {
          const closePrice = signal.price || 0
          let totalClosed = 0
          
          // Get master trader IDs from strategy (handles both populated and unpopulated)
          const masterTraderIds = strategy.masterTraderIds.map(m => m._id || m)
          console.log(`[Algo] Looking up master traders: ${masterTraderIds}`)
          
          // Directly query MasterTrader collection to get tradingAccountIds
          const masterTraders = await MasterTrader.find({ _id: { $in: masterTraderIds } }).lean()
          console.log(`[Algo] Found ${masterTraders.length} master traders`)
          
          for (const master of masterTraders) {
            const accountId = master.tradingAccountId
            console.log(`[Algo] Master ${master.displayName}: tradingAccountId=${accountId}`)
            
            if (!accountId) {
              console.log(`[Algo] Master ${master.displayName} has no trading account, skipping`)
              continue
            }
            
            // Find open trades for this symbol from this master (case-insensitive)
            // Convert accountId to ObjectId if it's a string
            const accountObjectId = typeof accountId === 'string' 
              ? new mongoose.Types.ObjectId(accountId) 
              : accountId
            
            const openMasterTrades = await Trade.find({
              tradingAccountId: accountObjectId,
              symbol: { $regex: new RegExp(`^${signal.symbol}$`, 'i') },
              status: 'OPEN'
            })
            console.log(`[Algo] Found ${openMasterTrades.length} open trades for ${signal.symbol} on master account ${accountId}`)
            
            for (const masterTrade of openMasterTrades) {
              console.log(`[Algo] Closing master trade ${masterTrade._id} at price ${closePrice}`)
              try {
                await tradeEngine.closeTrade(masterTrade._id, closePrice, closePrice, 'ALGO')
                console.log(`[Algo] Master trade ${masterTrade._id} closed successfully`)
                await copyTradingEngine.closeFollowerTrades(masterTrade._id, closePrice)
                console.log(`[Algo] Follower trades closed for master trade ${masterTrade._id}`)
                totalClosed++
              } catch (tradeCloseErr) {
                console.error(`[Algo] Error closing trade ${masterTrade._id}:`, tradeCloseErr.message)
              }
            }
          }
          
          if (totalClosed > 0) {
            signal.status = 'CLOSED'
            signal.message = `Closed ${totalClosed} position(s) for all masters and followers`
            strategy.stats.openPositions = Math.max(0, strategy.stats.openPositions - totalClosed)
            await strategy.save()
          } else {
            signal.status = 'NO_POSITION'
            const accountIds = masterTraders.map(m => String(m.tradingAccountId))
            signal.message = `No open positions found. Debug: masters=${masterTraders.length}, symbol=${signal.symbol}, accountIds=${accountIds.join(',')}`
          }
        } catch (closeError) {
          console.error('[Algo] Error closing trades:', closeError)
          signal.status = 'ERROR'
          signal.error = closeError.message
        }
      } else {
        signal.status = 'SIGNAL_ONLY'
        signal.message = 'Copy trading not enabled - close signal logged only'
      }
    }
    // CLOSE ALL
    else if (actionUpper === 'CLOSE_ALL' || close_all === true) {
      if (strategy?.copyTradingEnabled && strategy?.masterTraderIds?.length > 0) {
        try {
          const closePrice = signal.price || 0
          let totalClosed = 0
          
          // Get master trader IDs and query directly
          const masterTraderIds = strategy.masterTraderIds.map(m => m._id || m)
          const masterTraders = await MasterTrader.find({ _id: { $in: masterTraderIds } }).lean()
          
          // Close ALL trades for all master traders
          for (const master of masterTraders) {
            const accountId = master.tradingAccountId
            if (!accountId) continue
            
            const accountObjectId = typeof accountId === 'string' 
              ? new mongoose.Types.ObjectId(accountId) 
              : accountId
            
            const openMasterTrades = await Trade.find({
              tradingAccountId: accountObjectId,
              status: 'OPEN'
            })
            
            for (const masterTrade of openMasterTrades) {
              await tradeEngine.closeTrade(masterTrade._id, closePrice, closePrice, 'ALGO')
              await copyTradingEngine.closeFollowerTrades(masterTrade._id, closePrice)
              totalClosed++
            }
          }
          
          if (totalClosed > 0) {
            signal.status = 'CLOSED_ALL'
            signal.message = `Closed all ${totalClosed} position(s) for all masters and followers`
            strategy.stats.openPositions = 0
            await strategy.save()
          } else {
            signal.status = 'NO_POSITION'
            signal.message = 'No open positions found'
          }
        } catch (closeError) {
          console.error('[Algo] Error closing all trades:', closeError)
          signal.status = 'ERROR'
          signal.error = closeError.message
        }
      } else {
        signal.status = 'SIGNAL_ONLY'
        signal.message = 'Copy trading not enabled - close all signal logged only'
      }
    }
    // ALERT ONLY
    else if (actionUpper === 'ALERT') {
      signal.status = 'ALERT'
      signal.message = 'Alert notification received'
    }

    signal.processed_at = new Date()

    // Save signal to database for persistence
    try {
      await TradingViewSignal.create({
        signalId: signal.id,
        strategy_name: signal.strategy_name,
        strategy_id: signal.strategy_id,
        action: signal.action,
        symbol: signal.symbol,
        side: signal.side,
        quantity: signal.quantity,
        price: signal.price,
        order_type: signal.order_type,
        take_profit: signal.take_profit,
        stop_loss: signal.stop_loss,
        comment: signal.comment,
        close_all: signal.close_all,
        status: signal.status,
        message: signal.message,
        error: signal.error,
        copyTradingEnabled: signal.copyTradingEnabled,
        masterTraders: signal.masterTraders,
        copyResults: signal.copyResults || { masters: 0, total: 0, success: 0, failed: 0 },
        processed_at: signal.processed_at
      })
      console.log(`[TradingView Webhook] Signal ${signal.id} saved to database`)
    } catch (saveError) {
      console.error('[TradingView Webhook] Error saving signal to database:', saveError.message)
    }

    // Emit updated signal status
    if (io) {
      io.emit('signal_processed', signal)
    }

    console.log(`[TradingView Webhook] ${signal.strategy_name}: ${action} ${symbol} - Status: ${signal.status}`)

    res.json({
      success: true,
      message: 'Webhook received and processed',
      signal_id: signal.id,
      status: signal.status,
      copyResults: signal.copyResults || null
    })

  } catch (error) {
    console.error('[TradingView Webhook] Error:', error)
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    })
  }
})

// GET /api/tradingview/signals - Get recent signals (for admin dashboard)
router.get('/signals', async (req, res) => {
  try {
    const { limit = 50, strategy, status } = req.query
    
    // Build query
    const query = {}
    if (strategy) {
      query.strategy_name = strategy
    }
    if (status) {
      query.status = status.toUpperCase()
    }
    
    // Fetch from database
    const signals = await TradingViewSignal.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean()
    
    // Transform to match expected format
    const formattedSignals = signals.map(s => ({
      id: s.signalId,
      timestamp: s.createdAt,
      strategy_name: s.strategy_name,
      strategy_id: s.strategy_id,
      action: s.action,
      symbol: s.symbol,
      side: s.side,
      quantity: s.quantity,
      price: s.price,
      order_type: s.order_type,
      take_profit: s.take_profit,
      stop_loss: s.stop_loss,
      comment: s.comment,
      close_all: s.close_all,
      status: s.status,
      message: s.message,
      error: s.error,
      copyTradingEnabled: s.copyTradingEnabled,
      masterTraders: s.masterTraders,
      copyResults: s.copyResults,
      processed_at: s.processed_at
    }))
    
    const total = await TradingViewSignal.countDocuments(query)
    
    res.json({
      success: true,
      signals: formattedSignals,
      total
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/tradingview/strategies - Get unique strategy names from signals
router.get('/strategies', async (req, res) => {
  try {
    // Fetch unique strategy names from database
    const strategies = await TradingViewSignal.distinct('strategy_name')
    res.json({
      success: true,
      strategies
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/tradingview/test - Test webhook (no auth required for testing)
router.post('/test', async (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is reachable',
    timestamp: new Date(),
    received_data: req.body
  })
})

export default router
