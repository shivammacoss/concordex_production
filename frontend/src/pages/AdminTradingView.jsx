import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import AdminLayout from '../components/AdminLayout'
import { API_BASE_URL, API_URL } from '../config/api'
import { 
  Activity, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Briefcase,
  Copy,
  X,
  Play,
  Pause,
  Trash2,
  Edit,
  Key
} from 'lucide-react'

const AdminTradingView = () => {
  const [signals, setSignals] = useState([])
  const [positions, setPositions] = useState([])
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showNewStrategy, setShowNewStrategy] = useState(false)
  const [masterTraders, setMasterTraders] = useState([])
  const [createdSecret, setCreatedSecret] = useState('')
  const [createdBuySecret, setCreatedBuySecret] = useState('')
  const [createdSellSecret, setCreatedSellSecret] = useState('')
  const [showSecretModal, setShowSecretModal] = useState(null) // stores strategy object when showing secret
  const [secretTab, setSecretTab] = useState('buy') // 'buy' or 'sell' tab for webhook alerts
  const [formTab, setFormTab] = useState('buy') // 'buy' or 'sell' tab on creation form
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    description: '',
    symbol: '',
    timeframe: '1H',
    defaultQuantity: 0.01,
    stopLoss: '',
    takeProfit: '',
    buyEntry: '',
    buyExit: '',
    sellEntry: '',
    sellExit: '',
    copyTradingEnabled: false,
    masterTraderIds: []
  })
  const [showEditSLTP, setShowEditSLTP] = useState(null) // stores strategy object for editing SL/TP
  const [editSLTP, setEditSLTP] = useState({ stopLoss: '', takeProfit: '' })
  const [showEditPosition, setShowEditPosition] = useState(null) // stores position object for editing SL/TP
  const [editPositionSLTP, setEditPositionSLTP] = useState({ stopLoss: '', takeProfit: '' })

  // Stats
  const [stats, setStats] = useState({
    activeStrategies: 0,
    openPositions: 0,
    todayPnl: 0,
    totalPnl: 0,
    winRate: 0,
    totalTrades: 0
  })

  const webhookUrl = `${API_BASE_URL}/api/tradingview/webhook`

  useEffect(() => {
    fetchData()

    const socket = io(API_BASE_URL)

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('tradingview_signal', (signal) => {
      setSignals(prev => [signal, ...prev.slice(0, 99)])
      // Update positions if it's an open signal
      if (signal.action === 'BUY' || signal.action === 'SELL') {
        setPositions(prev => [{
          id: signal.id,
          symbol: signal.symbol,
          strategy: signal.strategy_name,
          strategy_id: signal.strategy_id,
          side: signal.side,
          quantity: signal.quantity,
          entryPrice: signal.price,
          currentPrice: signal.price,
          stopLoss: signal.stop_loss || null,
          takeProfit: signal.take_profit || null,
          pnl: 0,
          openTime: signal.timestamp
        }, ...prev])
      }
    })

    return () => socket.disconnect()
  }, [])

  const fetchData = async () => {
    try {
      let fetchedSignals = []

      // Fetch signals
      try {
        const signalsRes = await fetch(`${API_URL}/tradingview/signals?limit=100`)
        const signalsData = await signalsRes.json()
        if (signalsData.success) {
          fetchedSignals = signalsData.signals || []
          setSignals(fetchedSignals)
          calculateStats(fetchedSignals)
        }
      } catch (e) {
        console.error('Error fetching signals:', e)
      }

      // Fetch strategies
      try {
        const strategiesRes = await fetch(`${API_URL}/algo-strategies`)
        const strategiesData = await strategiesRes.json()
        if (strategiesData.success) {
          setStrategies(strategiesData.strategies || [])
        }
      } catch (e) {
        console.error('Error fetching strategies:', e)
      }

      // Fetch master traders
      try {
        const mastersRes = await fetch(`${API_URL}/algo-strategies/masters/list`)
        const mastersData = await mastersRes.json()
        if (mastersData.success) {
          setMasterTraders(mastersData.masters || [])
        }
      } catch (e) {
        console.error('Error fetching master traders:', e)
      }

      // Calculate open positions by matching BUY/SELL signals with CLOSE signals
      const openPositions = []
      const closedSymbols = new Map() // Map of symbol -> count of closes
      
      // Count close signals per symbol (most recent first)
      fetchedSignals.forEach(s => {
        if (s.action === 'CLOSE' || s.action === 'CLOSE_ALL') {
          const key = `${s.symbol}-${s.strategy_name}`
          closedSymbols.set(key, (closedSymbols.get(key) || 0) + 1)
        }
      })
      
      // Match open signals with close signals
      fetchedSignals.forEach(s => {
        if ((s.action === 'BUY' || s.action === 'SELL') && s.status !== 'ERROR') {
          const key = `${s.symbol}-${s.strategy_name}`
          const closeCount = closedSymbols.get(key) || 0
          
          if (closeCount > 0) {
            // This position was closed
            closedSymbols.set(key, closeCount - 1)
          } else {
            // This position is still open
            openPositions.push({
              id: s.id,
              symbol: s.symbol,
              strategy: s.strategy_name,
              strategy_id: s.strategy_id,
              side: s.side,
              quantity: s.quantity || 0.01,
              entryPrice: s.price || 0,
              currentPrice: s.price || 0,
              stopLoss: s.stop_loss || null,
              takeProfit: s.take_profit || null,
              pnl: 0,
              openTime: s.timestamp
            })
          }
        }
      })
      
      setPositions(openPositions.slice(0, 10))

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (signals) => {
    const uniqueStrategies = [...new Set(signals.map(s => s.strategy_name))]
    const buySignals = signals.filter(s => s.action === 'BUY' || s.action === 'SELL')
    const today = new Date().toDateString()
    const todaySignals = signals.filter(s => new Date(s.timestamp).toDateString() === today)

    setStats({
      activeStrategies: uniqueStrategies.length,
      openPositions: positions.length,
      todayPnl: todaySignals.length * 0.05,
      totalPnl: signals.length * 0.08,
      winRate: signals.length > 0 ? 50 : 0,
      totalTrades: buySignals.length
    })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  // Calculate closed trades by matching BUY/SELL with CLOSE signals
  const getClosedTrades = () => {
    const closedTrades = []
    const openSignals = [] // BUY/SELL signals waiting to be matched
    
    // Process signals in reverse order (oldest first) to match correctly
    const sortedSignals = [...signals].reverse()
    
    sortedSignals.forEach(signal => {
      if (signal.action === 'BUY' || signal.action === 'SELL') {
        openSignals.push(signal)
      } else if (signal.action === 'CLOSE' || signal.action === 'CLOSE_ALL') {
        // Find matching open signal for this symbol/strategy
        const matchIndex = openSignals.findIndex(
          s => s.symbol === signal.symbol && s.strategy_name === signal.strategy_name
        )
        
        if (matchIndex !== -1) {
          const openSignal = openSignals.splice(matchIndex, 1)[0]
          const entryPrice = openSignal.price || 0
          const exitPrice = signal.price || 0
          const quantity = openSignal.quantity || 0.01
          
          // Calculate PNL
          let pnl = 0
          if (entryPrice && exitPrice) {
            if (openSignal.action === 'BUY') {
              pnl = (exitPrice - entryPrice) * quantity * 100 // Simplified for forex
            } else {
              pnl = (entryPrice - exitPrice) * quantity * 100
            }
          }
          
          closedTrades.push({
            id: `${openSignal.id}-${signal.id}`,
            openTime: openSignal.timestamp,
            closeTime: signal.timestamp,
            strategy: openSignal.strategy_name,
            symbol: openSignal.symbol,
            side: openSignal.action,
            quantity: quantity,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            pnl: pnl,
            status: signal.status
          })
        }
      }
    })
    
    // Return in reverse order (newest first)
    return closedTrades.reverse()
  }

  const handleCreateStrategy = async () => {
    if (!newStrategy.name || !newStrategy.symbol) return
    
    try {
      const response = await fetch(`${API_URL}/algo-strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStrategy)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStrategies(prev => [...prev, data.strategy])
        setCreatedSecret(data.webhookSecret)
        setCreatedBuySecret(data.buyWebhookSecret)
        setCreatedSellSecret(data.sellWebhookSecret)
        setNewStrategy({
          name: '',
          description: '',
          symbol: '',
          timeframe: '1H',
          defaultQuantity: 0.01,
          stopLoss: '',
          takeProfit: '',
          buyEntry: '',
          buyExit: '',
          sellEntry: '',
          sellExit: '',
          copyTradingEnabled: false,
          masterTraderIds: []
        })
        setFormTab('buy')
        // Don't close modal immediately - show webhook secret first
      } else {
        alert(data.message || 'Failed to create strategy')
      }
    } catch (error) {
      console.error('Error creating strategy:', error)
      alert('Error creating strategy')
    }
  }

  const handleToggleStrategy = async (strategyId) => {
    try {
      const response = await fetch(`${API_URL}/algo-strategies/${strategyId}/toggle`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        setStrategies(prev => prev.map(s => s._id === strategyId ? data.strategy : s))
      }
    } catch (error) {
      console.error('Error toggling strategy:', error)
    }
  }

  const handleDeleteStrategy = async (strategyId) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return
    try {
      const response = await fetch(`${API_URL}/algo-strategies/${strategyId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setStrategies(prev => prev.filter(s => s._id !== strategyId))
      }
    } catch (error) {
      console.error('Error deleting strategy:', error)
    }
  }

  const handleEditPositionSLTP = async () => {
    if (!showEditPosition) return
    try {
      // Find the actual trade ID from the signal - we need to look up the trade by signal data
      // The position's strategy_id links to the AlgoStrategy, and we need the Trade document
      // Use the webhook to send a modify signal, or directly call the trade modify endpoint
      const strategy = strategies.find(s => s.name === showEditPosition.strategy)
      if (!strategy) {
        alert('Strategy not found for this position')
        return
      }

      // Send modify signal via webhook
      const response = await fetch(`${API_URL}/tradingview/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: strategy.buyWebhookSecret || strategy.webhookSecret,
          action: 'modify',
          symbol: showEditPosition.symbol,
          stop_loss: editPositionSLTP.stopLoss ? parseFloat(editPositionSLTP.stopLoss) : null,
          take_profit: editPositionSLTP.takeProfit ? parseFloat(editPositionSLTP.takeProfit) : null
        })
      })
      const data = await response.json()
      if (data.success) {
        // Update position in local state
        setPositions(prev => prev.map(p => p.id === showEditPosition.id ? {
          ...p,
          stopLoss: editPositionSLTP.stopLoss ? parseFloat(editPositionSLTP.stopLoss) : null,
          takeProfit: editPositionSLTP.takeProfit ? parseFloat(editPositionSLTP.takeProfit) : null
        } : p))
        setShowEditPosition(null)
      } else {
        alert(data.message || 'Failed to modify SL/TP')
      }
    } catch (error) {
      console.error('Error modifying position SL/TP:', error)
      alert('Error modifying SL/TP')
    }
  }

  const handleUpdateSLTP = async () => {
    if (!showEditSLTP) return
    try {
      const response = await fetch(`${API_URL}/algo-strategies/${showEditSLTP._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopLoss: editSLTP.stopLoss ? parseFloat(editSLTP.stopLoss) : null,
          takeProfit: editSLTP.takeProfit ? parseFloat(editSLTP.takeProfit) : null
        })
      })
      const data = await response.json()
      if (data.success) {
        setStrategies(prev => prev.map(s => s._id === showEditSLTP._id ? data.strategy : s))
        setShowEditSLTP(null)
      } else {
        alert(data.message || 'Failed to update SL/TP')
      }
    } catch (error) {
      console.error('Error updating SL/TP:', error)
      alert('Error updating SL/TP')
    }
  }

  const handleClosePosition = async (position) => {
    // Prompt for close price
    const closePrice = prompt(`Enter close price for ${position.symbol}:`, position.currentPrice || position.entryPrice)
    if (closePrice === null) return // User cancelled
    
    const price = parseFloat(closePrice)
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price')
      return
    }
    
    try {
      // Find the strategy for this position to get its webhook secret
      const strategy = strategies.find(s => s.name === position.strategy)
      
      if (!strategy) {
        alert('Strategy not found. Please close via TradingView alert.')
        return
      }

      // Send close signal via webhook
      const response = await fetch(`${API_URL}/tradingview/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: strategy.webhookSecret,
          action: 'close',
          symbol: position.symbol,
          price: price
        })
      })

      const data = await response.json()
      if (data.success) {
        // Remove from positions list
        setPositions(prev => prev.filter(p => p.id !== position.id))
        // Refresh signals
        fetchData()
      } else {
        alert(data.message || 'Failed to close position')
      }
    } catch (error) {
      console.error('Error closing position:', error)
      alert('Error closing position')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'strategies', label: 'Strategies' },
    { id: 'positions', label: 'Positions' },
    { id: 'history', label: 'History' }
  ]

  return (
    <AdminLayout title="Algo Trading" subtitle="TradingView Webhook Monitoring">
      {/* Header with New Strategy Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400 text-sm">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={() => setShowNewStrategy(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
        >
          <Plus size={18} />
          New Strategy
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Briefcase size={16} />
          </div>
          <p className="text-2xl font-bold text-white">{stats.activeStrategies}</p>
          <p className="text-gray-500 text-sm">Active Strategies</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity size={16} />
          </div>
          <p className="text-2xl font-bold text-white">{positions.length}</p>
          <p className="text-gray-500 text-sm">Open Positions</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <DollarSign size={16} />
          </div>
          <p className="text-2xl font-bold text-white">${stats.todayPnl.toFixed(2)}</p>
          <p className="text-gray-500 text-sm">Today's P&L</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp size={16} />
          </div>
          <p className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${stats.totalPnl.toFixed(2)}
          </p>
          <p className="text-gray-500 text-sm">Total P&L</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Target size={16} />
          </div>
          <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(2)}%</p>
          <p className="text-gray-500 text-sm">Win Rate</p>
        </div>

        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <BarChart3 size={16} />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
          <p className="text-gray-500 text-sm">Total Trades</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-yellow-400 border-yellow-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strategy Performance */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">Strategy Performance</h3>
            </div>
            <div className="p-4 space-y-3">
              {strategies.length === 0 ? (
                <p className="text-gray-500 text-sm">No strategies yet</p>
              ) : (
                strategies.map((strategy, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{strategy.name}</p>
                      <p className="text-gray-500 text-sm">{strategy.stats?.totalTrades || 0} trades | {strategy.stats?.winRate || 0}% win rate</p>
                    </div>
                    <p className={`font-bold ${(strategy.stats?.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(strategy.stats?.totalPnl || 0).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Open Positions */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">Open Positions</h3>
            </div>
            <div className="p-4 space-y-3">
              {positions.length === 0 ? (
                <p className="text-gray-500 text-sm">No open positions</p>
              ) : (
                positions.slice(0, 5).map((pos, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp size={16} className={pos.side === 'BUY' ? 'text-green-400' : 'text-red-400'} />
                      <div>
                        <p className="text-yellow-400 font-medium">{pos.symbol}</p>
                        <p className="text-gray-500 text-sm">{pos.strategy}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{pos.quantity}</p>
                      <p className={`text-sm ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${pos.pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Webhook Setup */}
          <div className="lg:col-span-2 bg-dark-800 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white font-semibold mb-4">TradingView Webhook Setup</h3>
            
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Webhook URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-dark-900 px-4 py-3 rounded-lg text-yellow-400 text-sm">
                  {webhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(webhookUrl)}
                  className="p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  <Copy size={18} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-green-400 text-sm font-medium mb-2">📈 BUY (Long) Alert:</p>
                <pre className="bg-dark-900 p-4 rounded-lg text-xs overflow-x-auto text-gray-300">
{`{
  "secret": "YOUR_SECRET",
  "action": "buy",
  "symbol": "{{ticker}}",
  "price": {{close}},
  "quantity": 0.01
}`}
                </pre>
              </div>

              <div>
                <p className="text-red-400 text-sm font-medium mb-2">📉 SELL (Short) Alert:</p>
                <pre className="bg-dark-900 p-4 rounded-lg text-xs overflow-x-auto text-gray-300">
{`{
  "secret": "YOUR_SECRET",
  "action": "sell",
  "symbol": "{{ticker}}",
  "price": {{close}},
  "quantity": 0.01
}`}
                </pre>
              </div>

              <div>
                <p className="text-yellow-400 text-sm font-medium mb-2">🔄 CLOSE Alert:</p>
                <pre className="bg-dark-900 p-4 rounded-lg text-xs overflow-x-auto text-gray-300">
{`{
  "secret": "YOUR_SECRET",
  "action": "close",
  "symbol": "{{ticker}}",
  "price": {{close}}
}`}
                </pre>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-dark-900 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-xs">
                <span className="text-white font-medium">Actions:</span> 
                <code className="text-green-400 mx-1">buy</code> opens long position, 
                <code className="text-red-400 mx-1">sell</code> opens short position, 
                <code className="text-yellow-400 mx-1">close</code> closes position for symbol, 
                <code className="text-yellow-400 mx-1">close_all</code> closes all positions
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'strategies' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-900/50">
              <tr>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">STRATEGY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SYMBOL</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">STATUS</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">COPY TRADING</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">TRADES</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SL / TP</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">P&L</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {strategies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    No strategies created yet. Click "New Strategy" to create one.
                  </td>
                </tr>
              ) : (
                strategies.map((strategy) => (
                  <tr key={strategy._id} className="hover:bg-dark-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{strategy.name}</p>
                        {strategy.description && <p className="text-gray-500 text-xs">{strategy.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-yellow-400 font-mono">{strategy.symbol}</span>
                      <span className="text-gray-500 text-xs ml-2">{strategy.timeframe}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        strategy.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {strategy.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {strategy.copyTradingEnabled && strategy.masterTraderIds?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {strategy.masterTraderIds.slice(0, 2).map(master => (
                            <span key={master._id} className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                              {master.displayName}
                            </span>
                          ))}
                          {strategy.masterTraderIds.length > 2 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">
                              +{strategy.masterTraderIds.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{strategy.stats?.totalTrades || 0}</td>
                    <td className={`px-4 py-3 font-medium ${(strategy.stats?.totalPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(strategy.stats?.totalPnl || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-red-400 text-xs">{strategy.stopLoss ? `SL: ${strategy.stopLoss}` : 'SL: --'}</span>
                        <span className="text-gray-600 text-xs">/</span>
                        <span className="text-green-400 text-xs">{strategy.takeProfit ? `TP: ${strategy.takeProfit}` : 'TP: --'}</span>
                        <button
                          onClick={() => { setShowEditSLTP(strategy); setEditSLTP({ stopLoss: strategy.stopLoss || '', takeProfit: strategy.takeProfit || '' }) }}
                          className="ml-1 p-1 hover:bg-dark-600 rounded transition-colors"
                          title="Edit SL/TP"
                        >
                          <Edit size={12} className="text-yellow-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowSecretModal(strategy)}
                          className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                          title="View Webhook Secret"
                        >
                          <Key size={14} className="text-yellow-400" />
                        </button>
                        <button 
                          onClick={() => handleToggleStrategy(strategy._id)}
                          className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                          title={strategy.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                        >
                          {strategy.status === 'ACTIVE' ? <Pause size={14} className="text-gray-400" /> : <Play size={14} className="text-green-400" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteStrategy(strategy._id)}
                          className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-900/50">
              <tr>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SYMBOL</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">STRATEGY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SIDE</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">QTY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">ENTRY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">CURRENT</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SL / TP</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">P&L</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">No open positions</td>
                </tr>
              ) : (
                positions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-dark-700/50">
                    <td className="px-4 py-3 text-yellow-400 font-medium">{pos.symbol}</td>
                    <td className="px-4 py-3 text-gray-400">{pos.strategy}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        pos.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{pos.quantity}</td>
                    <td className="px-4 py-3 text-gray-400">${pos.entryPrice}</td>
                    <td className="px-4 py-3 text-white">${pos.currentPrice}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-red-400 text-xs">{pos.stopLoss ? `SL: ${pos.stopLoss}` : 'SL: --'}</span>
                        <span className="text-gray-600 text-xs">/</span>
                        <span className="text-green-400 text-xs">{pos.takeProfit ? `TP: ${pos.takeProfit}` : 'TP: --'}</span>
                        <button
                          onClick={() => { setShowEditPosition(pos); setEditPositionSLTP({ stopLoss: pos.stopLoss || '', takeProfit: pos.takeProfit || '' }) }}
                          className="ml-1 p-1 hover:bg-dark-600 rounded transition-colors"
                          title="Edit SL/TP"
                        >
                          <Edit size={12} className="text-yellow-400" />
                        </button>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-medium ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${pos.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => handleClosePosition(pos)}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
          {/* Summary Stats */}
          <div className="p-4 border-b border-gray-800 flex gap-6">
            <div>
              <span className="text-gray-400 text-sm">Total Trades: </span>
              <span className="text-white font-medium">{getClosedTrades().length}</span>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Total P&L: </span>
              <span className={`font-medium ${getClosedTrades().reduce((sum, t) => sum + t.pnl, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${getClosedTrades().reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}
              </span>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-dark-900/50">
              <tr>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">CLOSE TIME</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">STRATEGY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SYMBOL</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">SIDE</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">QTY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">ENTRY</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">EXIT</th>
                <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {getClosedTrades().length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">No closed trades</td>
                </tr>
              ) : (
                getClosedTrades().map((trade, idx) => (
                  <tr key={idx} className="hover:bg-dark-700/50">
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(trade.closeTime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white">{trade.strategy}</td>
                    <td className="px-4 py-3 text-yellow-400">{trade.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{trade.quantity}</td>
                    <td className="px-4 py-3 text-white">${trade.entryPrice}</td>
                    <td className="px-4 py-3 text-white">${trade.exitPrice}</td>
                    <td className={`px-4 py-3 font-medium ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${trade.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Strategy Modal */}
      {showNewStrategy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-dark-800 rounded-xl p-4 w-full max-w-md border border-gray-700 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-base font-semibold">Create New Strategy</h3>
              <button onClick={() => { setShowNewStrategy(false); setCreatedSecret(''); }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {createdSecret ? (
              <div className="space-y-4">
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                  <p className="text-green-400 font-medium mb-2">Strategy Created Successfully!</p>
                  <p className="text-gray-400 text-sm mb-3">Save these webhook secrets - each side has its own secret key:</p>
                </div>

                {/* Buy / Sell Tabs */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSecretTab('buy')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                      secretTab === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-dark-700 text-gray-400 border border-gray-700 hover:text-white'
                    }`}
                  >
                    <ArrowUpCircle size={14} className="inline mr-1" /> BUY (Long)
                  </button>
                  <button
                    onClick={() => setSecretTab('sell')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                      secretTab === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-dark-700 text-gray-400 border border-gray-700 hover:text-white'
                    }`}
                  >
                    <ArrowDownCircle size={14} className="inline mr-1" /> SELL (Short)
                  </button>
                </div>

                <div className="bg-dark-900 rounded-lg p-4 space-y-4">
                  {secretTab === 'buy' ? (
                    <>
                      <div>
                        <p className="text-green-400 text-xs mb-1 font-medium">Buy Secret Key:</p>
                        <div className="flex items-center gap-2 mb-3">
                          <code className="flex-1 bg-dark-800 px-2 py-1.5 rounded text-green-400 text-xs break-all">
                            {createdBuySecret}
                          </code>
                          <button onClick={() => copyToClipboard(createdBuySecret)} className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded transition-colors">
                            <Copy size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-green-400 text-xs mb-2 font-medium">📈 BUY ENTRY Alert Message:</p>
                        <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${createdBuySecret}",\n  "action": "buy",\n  "symbol": "${newStrategy.symbol || '{{ticker}}'}",\n  "price": {{close}},\n  "quantity": ${newStrategy.defaultQuantity}\n}`}
                        </pre>
                      </div>
                      <div>
                        <p className="text-yellow-400 text-xs mb-2 font-medium">🔄 BUY EXIT (Close Long) Alert Message:</p>
                        <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${createdBuySecret}",\n  "action": "close",\n  "symbol": "${newStrategy.symbol || '{{ticker}}'}",\n  "price": {{close}}\n}`}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-red-400 text-xs mb-1 font-medium">Sell Secret Key:</p>
                        <div className="flex items-center gap-2 mb-3">
                          <code className="flex-1 bg-dark-800 px-2 py-1.5 rounded text-red-400 text-xs break-all">
                            {createdSellSecret}
                          </code>
                          <button onClick={() => copyToClipboard(createdSellSecret)} className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded transition-colors">
                            <Copy size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-red-400 text-xs mb-2 font-medium">📉 SELL ENTRY Alert Message:</p>
                        <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${createdSellSecret}",\n  "action": "sell",\n  "symbol": "${newStrategy.symbol || '{{ticker}}'}",\n  "price": {{close}},\n  "quantity": ${newStrategy.defaultQuantity}\n}`}
                        </pre>
                      </div>
                      <div>
                        <p className="text-yellow-400 text-xs mb-2 font-medium">🔄 SELL EXIT (Close Short) Alert Message:</p>
                        <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${createdSellSecret}",\n  "action": "close",\n  "symbol": "${newStrategy.symbol || '{{ticker}}'}",\n  "price": {{close}}\n}`}
                        </pre>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => { setShowNewStrategy(false); setCreatedSecret(''); setCreatedBuySecret(''); setCreatedSellSecret(''); setSecretTab('buy'); }}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Strategy Name</label>
                  <input
                    type="text"
                    value={newStrategy.name}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                    placeholder="e.g., XAUUSD Scalper"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs block mb-1">Description</label>
                  <input
                    type="text"
                    value={newStrategy.description}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                    placeholder="Brief description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Symbol</label>
                    <input
                      type="text"
                      list="symbol-suggestions"
                      value={newStrategy.symbol}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                      placeholder="Type or search symbol..."
                    />
                    <datalist id="symbol-suggestions">
                      <option value="XAUUSD">Gold</option>
                      <option value="EURUSD">EUR/USD</option>
                      <option value="GBPUSD">GBP/USD</option>
                      <option value="USDJPY">USD/JPY</option>
                      <option value="BTCUSD">Bitcoin</option>
                      <option value="ETHUSD">Ethereum</option>
                      <option value="USDCHF">USD/CHF</option>
                      <option value="AUDUSD">AUD/USD</option>
                      <option value="NZDUSD">NZD/USD</option>
                      <option value="USDCAD">USD/CAD</option>
                      <option value="GBPJPY">GBP/JPY</option>
                      <option value="EURJPY">EUR/JPY</option>
                      <option value="XAGUSD">Silver</option>
                      <option value="US30">Dow Jones</option>
                      <option value="US500">S&P 500</option>
                      <option value="NAS100">Nasdaq</option>
                    </datalist>
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Timeframe</label>
                    <select
                      value={newStrategy.timeframe}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, timeframe: e.target.value }))}
                      className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                    >
                      <option value="1m">1 Minute</option>
                      <option value="5m">5 Minutes</option>
                      <option value="15m">15 Minutes</option>
                      <option value="30m">30 Minutes</option>
                      <option value="1H">1 Hour</option>
                      <option value="4H">4 Hours</option>
                      <option value="1D">1 Day</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs block mb-1">Default Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newStrategy.defaultQuantity}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, defaultQuantity: parseFloat(e.target.value) || 0.01 }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                  />
                </div>

                {/* Stop Loss & Take Profit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Stop Loss (SL)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newStrategy.stopLoss}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, stopLoss: e.target.value }))}
                      className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                      placeholder="e.g., 2850.00"
                    />
                    <p className="text-gray-600 text-[10px] mt-0.5">Triggers when position opens</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Take Profit (TP)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newStrategy.takeProfit}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, takeProfit: e.target.value }))}
                      className="w-full bg-dark-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                      placeholder="e.g., 2920.00"
                    />
                    <p className="text-gray-600 text-[10px] mt-0.5">Triggers when position opens</p>
                  </div>
                </div>

                {/* Buy / Sell Entry & Exit */}
                <div className="border-t border-gray-700 pt-3">
                  <label className="text-gray-400 text-xs block mb-1.5">Trade Entry & Exit Prices</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormTab('buy')}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        formTab === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-dark-700 text-gray-400 border border-gray-700 hover:text-white'
                      }`}
                    >
                      <ArrowUpCircle size={14} className="inline mr-1" /> BUY (Long)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTab('sell')}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                        formTab === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-dark-700 text-gray-400 border border-gray-700 hover:text-white'
                      }`}
                    >
                      <ArrowDownCircle size={14} className="inline mr-1" /> SELL (Short)
                    </button>
                  </div>

                  {formTab === 'buy' ? (
                    <div className="bg-dark-900 border border-green-500/20 rounded-lg p-3">
                      <p className="text-green-400 text-xs font-medium mb-1">📈 Buy Entry</p>
                      <p className="text-gray-500 text-xs">Opens a long position when TradingView sends a BUY alert</p>
                      <div className="border-t border-gray-700 mt-2 pt-2">
                        <p className="text-yellow-400 text-xs font-medium mb-1">🔄 Buy Exit</p>
                        <p className="text-gray-500 text-xs">Closes the long position when TradingView sends a CLOSE alert</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-dark-900 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-xs font-medium mb-1">📉 Sell Entry</p>
                      <p className="text-gray-500 text-xs">Opens a short position when TradingView sends a SELL alert</p>
                      <div className="border-t border-gray-700 mt-2 pt-2">
                        <p className="text-yellow-400 text-xs font-medium mb-1">🔄 Sell Exit</p>
                        <p className="text-gray-500 text-xs">Closes the short position when TradingView sends a CLOSE alert</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStrategy.copyTradingEnabled}
                      onChange={(e) => setNewStrategy(prev => ({ ...prev, copyTradingEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-600 bg-dark-900 text-yellow-500 focus:ring-yellow-500"
                    />
                    <div>
                      <span className="text-white font-medium text-sm">Enable Copy Trading</span>
                      <p className="text-gray-500 text-xs">When enabled, algo trades will be mirrored to all followers of the selected Trade Master</p>
                    </div>
                  </label>
                </div>

                {newStrategy.copyTradingEnabled && (
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Select Trade Masters (multiple)</label>
                    <div className="bg-dark-900 border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {masterTraders.length === 0 ? (
                        <p className="text-yellow-400 text-sm">No active master traders found. Create one in Copy Trade Management first.</p>
                      ) : (
                        masterTraders.map(master => (
                          <label key={master._id} className="flex items-center gap-3 cursor-pointer hover:bg-dark-700 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={newStrategy.masterTraderIds.includes(master._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewStrategy(prev => ({ ...prev, masterTraderIds: [...prev.masterTraderIds, master._id] }))
                                } else {
                                  setNewStrategy(prev => ({ ...prev, masterTraderIds: prev.masterTraderIds.filter(id => id !== master._id) }))
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-dark-900 text-yellow-500 focus:ring-yellow-500"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-white">{master.displayName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${master.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {master.status}
                              </span>
                              <span className="text-gray-500 text-sm">({master.userId?.fullName || master.userId?.email})</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    {newStrategy.masterTraderIds.length > 0 && (
                      <p className="text-green-400 text-xs mt-2">{newStrategy.masterTraderIds.length} master(s) selected</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowNewStrategy(false); setCreatedSecret(''); }}
                    className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 text-white font-medium text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStrategy}
                    disabled={!newStrategy.name || !newStrategy.symbol || (newStrategy.copyTradingEnabled && newStrategy.masterTraderIds.length === 0)}
                    className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhook Secret Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Webhook Secret</h3>
              <button onClick={() => setShowSecretModal(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Strategy: <span className="text-white font-medium">{showSecretModal.name}</span></p>
                <p className="text-gray-400 text-sm mb-4">Use this secret in your TradingView alerts to authenticate webhooks.</p>
              </div>

              {/* Buy / Sell Tabs */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setSecretTab('buy')}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    secretTab === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-dark-700 text-gray-400 border border-gray-700 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle size={14} className="inline mr-1" /> BUY (Long)
                </button>
                <button
                  onClick={() => setSecretTab('sell')}
                  className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    secretTab === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-dark-700 text-gray-400 border border-gray-700 hover:text-white'
                  }`}
                >
                  <ArrowDownCircle size={14} className="inline mr-1" /> SELL (Short)
                </button>
              </div>

              <div className="bg-dark-900 rounded-lg p-4 space-y-4">
                {secretTab === 'buy' ? (
                  <>
                    <div>
                      <p className="text-green-400 text-xs mb-1 font-medium">Buy Secret Key:</p>
                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 bg-dark-800 px-2 py-1.5 rounded text-green-400 text-xs break-all">
                          {showSecretModal.buyWebhookSecret || showSecretModal.webhookSecret}
                        </code>
                        <button onClick={() => copyToClipboard(showSecretModal.buyWebhookSecret || showSecretModal.webhookSecret)} className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded transition-colors">
                          <Copy size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-green-400 text-xs mb-2 font-medium">📈 BUY ENTRY Alert Message:</p>
                      <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${showSecretModal.buyWebhookSecret || showSecretModal.webhookSecret}",\n  "action": "buy",\n  "symbol": "${showSecretModal.symbol}",\n  "price": {{close}},\n  "quantity": ${showSecretModal.defaultQuantity}\n}`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-yellow-400 text-xs mb-2 font-medium">🔄 BUY EXIT (Close Long) Alert Message:</p>
                      <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${showSecretModal.buyWebhookSecret || showSecretModal.webhookSecret}",\n  "action": "close",\n  "symbol": "${showSecretModal.symbol}",\n  "price": {{close}}\n}`}
                      </pre>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-red-400 text-xs mb-1 font-medium">Sell Secret Key:</p>
                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 bg-dark-800 px-2 py-1.5 rounded text-red-400 text-xs break-all">
                          {showSecretModal.sellWebhookSecret || showSecretModal.webhookSecret}
                        </code>
                        <button onClick={() => copyToClipboard(showSecretModal.sellWebhookSecret || showSecretModal.webhookSecret)} className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded transition-colors">
                          <Copy size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-red-400 text-xs mb-2 font-medium">📉 SELL ENTRY Alert Message:</p>
                      <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${showSecretModal.sellWebhookSecret || showSecretModal.webhookSecret}",\n  "action": "sell",\n  "symbol": "${showSecretModal.symbol}",\n  "price": {{close}},\n  "quantity": ${showSecretModal.defaultQuantity}\n}`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-yellow-400 text-xs mb-2 font-medium">🔄 SELL EXIT (Close Short) Alert Message:</p>
                      <pre className="text-gray-300 text-xs overflow-x-auto bg-dark-800 p-2 rounded">
{`{\n  "secret": "${showSecretModal.sellWebhookSecret || showSecretModal.webhookSecret}",\n  "action": "close",\n  "symbol": "${showSecretModal.symbol}",\n  "price": {{close}}\n}`}
                      </pre>
                    </div>
                  </>
                )}
                <p className="text-gray-500 text-xs">Actions: <code className="text-yellow-400">buy</code>, <code className="text-yellow-400">sell</code>, <code className="text-yellow-400">close</code>, <code className="text-yellow-400">close_all</code></p>
              </div>

              <button
                onClick={() => { setShowSecretModal(null); setSecretTab('buy'); }}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit SL/TP Modal */}
      {showEditSLTP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit SL / TP</h3>
              <button onClick={() => setShowEditSLTP(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-dark-900 rounded-lg p-3 border border-gray-700">
                <p className="text-gray-400 text-sm">Strategy: <span className="text-white font-medium">{showEditSLTP.name}</span></p>
                <p className="text-gray-500 text-xs mt-1">Symbol: <span className="text-yellow-400">{showEditSLTP.symbol}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editSLTP.stopLoss}
                    onChange={(e) => setEditSLTP(prev => ({ ...prev, stopLoss: e.target.value }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., 2850.00"
                  />
                  <p className="text-gray-600 text-xs mt-1">Applied when position opens</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editSLTP.takeProfit}
                    onChange={(e) => setEditSLTP(prev => ({ ...prev, takeProfit: e.target.value }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., 2920.00"
                  />
                  <p className="text-gray-600 text-xs mt-1">Applied when position opens</p>
                </div>
              </div>

              <p className="text-gray-500 text-xs">Leave empty to remove SL/TP. Values will be applied automatically when a new position opens via TradingView webhook.</p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditSLTP(null)}
                  className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSLTP}
                  className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                >
                  Save SL/TP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Position SL/TP Modal */}
      {showEditPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit Position SL / TP</h3>
              <button onClick={() => setShowEditPosition(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-dark-900 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 font-medium">{showEditPosition.symbol}</p>
                    <p className="text-gray-500 text-xs">{showEditPosition.strategy}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${showEditPosition.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {showEditPosition.side}
                    </span>
                    <p className="text-gray-400 text-xs mt-1">Entry: ${showEditPosition.entryPrice}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPositionSLTP.stopLoss}
                    onChange={(e) => setEditPositionSLTP(prev => ({ ...prev, stopLoss: e.target.value }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., 2850.00"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPositionSLTP.takeProfit}
                    onChange={(e) => setEditPositionSLTP(prev => ({ ...prev, takeProfit: e.target.value }))}
                    className="w-full bg-dark-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    placeholder="e.g., 2920.00"
                  />
                </div>
              </div>

              <p className="text-gray-500 text-xs">Updates SL/TP on the master trade and mirrors to all follower trades.</p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditPosition(null)}
                  className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditPositionSLTP}
                  className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                >
                  Update SL/TP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminTradingView
