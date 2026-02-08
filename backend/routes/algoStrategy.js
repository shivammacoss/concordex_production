import express from 'express'
import AlgoStrategy from '../models/AlgoStrategy.js'
import MasterTrader from '../models/MasterTrader.js'

const router = express.Router()

// Get master traders for dropdown
router.get('/masters/list', async (req, res) => {
  try {
    const masters = await MasterTrader.find({ status: { $in: ['ACTIVE', 'PENDING'] } })
      .populate('userId', 'fullName email')
      .select('displayName userId stats status')

    res.json({
      success: true,
      masters
    })
  } catch (error) {
    console.error('Error fetching master traders:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch master traders'
    })
  }
})

// Get all strategies
router.get('/', async (req, res) => {
  try {
    // Auto-generate missing buy/sell secrets for existing strategies
    const needSecrets = await AlgoStrategy.find({
      $or: [{ buyWebhookSecret: { $exists: false } }, { sellWebhookSecret: { $exists: false } }, { buyWebhookSecret: null }, { sellWebhookSecret: null }]
    })
    for (const s of needSecrets) {
      await s.save() // pre-save hook generates missing secrets
    }

    const strategies = await AlgoStrategy.find()
      .populate({
        path: 'masterTraderIds',
        select: 'displayName userId status',
        populate: {
          path: 'userId',
          select: 'fullName email'
        }
      })
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      strategies
    })
  } catch (error) {
    console.error('Error fetching strategies:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strategies'
    })
  }
})

// Get single strategy
router.get('/:id', async (req, res) => {
  try {
    const strategy = await AlgoStrategy.findById(req.params.id)
      .populate({
        path: 'masterTraderIds',
        select: 'displayName userId status',
        populate: {
          path: 'userId',
          select: 'fullName email'
        }
      })

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      })
    }

    res.json({
      success: true,
      strategy
    })
  } catch (error) {
    console.error('Error fetching strategy:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strategy'
    })
  }
})

// Create new strategy
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      symbol,
      timeframe,
      defaultQuantity,
      copyTradingEnabled,
      masterTraderIds // Now accepts array of IDs
    } = req.body

    // Validate required fields
    if (!name || !symbol) {
      return res.status(400).json({
        success: false,
        message: 'Name and symbol are required'
      })
    }

    // Check if strategy name already exists
    const existingStrategy = await AlgoStrategy.findOne({ name })
    if (existingStrategy) {
      return res.status(400).json({
        success: false,
        message: 'Strategy with this name already exists'
      })
    }

    // Validate master traders if copy trading is enabled
    let validMasterIds = []
    if (copyTradingEnabled && masterTraderIds && masterTraderIds.length > 0) {
      for (const masterId of masterTraderIds) {
        const masterTrader = await MasterTrader.findById(masterId)
        // Accept ACTIVE or PENDING masters
        if (masterTrader && (masterTrader.status === 'ACTIVE' || masterTrader.status === 'PENDING')) {
          validMasterIds.push(masterId)
        }
      }
      if (validMasterIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid master traders found'
        })
      }
    }

    const strategy = new AlgoStrategy({
      name,
      description,
      symbol: symbol.toUpperCase(),
      timeframe: timeframe || '1H',
      defaultQuantity: defaultQuantity || 0.01,
      copyTradingEnabled: copyTradingEnabled || false,
      masterTraderIds: copyTradingEnabled ? validMasterIds : []
    })

    await strategy.save()

    res.status(201).json({
      success: true,
      message: 'Strategy created successfully',
      strategy,
      webhookSecret: strategy.webhookSecret,
      buyWebhookSecret: strategy.buyWebhookSecret,
      sellWebhookSecret: strategy.sellWebhookSecret
    })
  } catch (error) {
    console.error('Error creating strategy:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create strategy'
    })
  }
})

// Update strategy
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      symbol,
      timeframe,
      defaultQuantity,
      copyTradingEnabled,
      masterTraderIds,
      status
    } = req.body

    const strategy = await AlgoStrategy.findById(req.params.id)
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      })
    }

    // Check for name uniqueness if changing name
    if (name && name !== strategy.name) {
      const existingStrategy = await AlgoStrategy.findOne({ name })
      if (existingStrategy) {
        return res.status(400).json({
          success: false,
          message: 'Strategy with this name already exists'
        })
      }
    }

    // Validate master traders if copy trading is enabled
    let validMasterIds = []
    if (copyTradingEnabled && masterTraderIds && masterTraderIds.length > 0) {
      for (const masterId of masterTraderIds) {
        const masterTrader = await MasterTrader.findById(masterId)
        if (masterTrader && masterTrader.status === 'ACTIVE') {
          validMasterIds.push(masterId)
        }
      }
    }

    // Update fields
    if (name) strategy.name = name
    if (description !== undefined) strategy.description = description
    if (symbol) strategy.symbol = symbol.toUpperCase()
    if (timeframe) strategy.timeframe = timeframe
    if (defaultQuantity) strategy.defaultQuantity = defaultQuantity
    if (copyTradingEnabled !== undefined) strategy.copyTradingEnabled = copyTradingEnabled
    if (copyTradingEnabled && validMasterIds.length > 0) {
      strategy.masterTraderIds = validMasterIds
    } else if (!copyTradingEnabled) {
      strategy.masterTraderIds = []
    }
    if (status) strategy.status = status

    await strategy.save()

    res.json({
      success: true,
      message: 'Strategy updated successfully',
      strategy
    })
  } catch (error) {
    console.error('Error updating strategy:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update strategy'
    })
  }
})

// Toggle strategy status (pause/resume)
router.post('/:id/toggle', async (req, res) => {
  try {
    const strategy = await AlgoStrategy.findById(req.params.id)
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      })
    }

    strategy.status = strategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    await strategy.save()

    res.json({
      success: true,
      message: `Strategy ${strategy.status === 'ACTIVE' ? 'resumed' : 'paused'}`,
      strategy
    })
  } catch (error) {
    console.error('Error toggling strategy:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to toggle strategy'
    })
  }
})

// Delete strategy
router.delete('/:id', async (req, res) => {
  try {
    const strategy = await AlgoStrategy.findById(req.params.id)
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      })
    }

    await AlgoStrategy.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Strategy deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting strategy:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete strategy'
    })
  }
})

// Regenerate webhook secret
router.post('/:id/regenerate-secret', async (req, res) => {
  try {
    const strategy = await AlgoStrategy.findById(req.params.id)
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      })
    }

    // Force regeneration by removing current secret
    strategy.webhookSecret = undefined
    await strategy.save()

    res.json({
      success: true,
      message: 'Webhook secret regenerated',
      webhookSecret: strategy.webhookSecret
    })
  } catch (error) {
    console.error('Error regenerating secret:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate secret'
    })
  }
})

export default router
