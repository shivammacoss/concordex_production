import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { API_URL } from '../config/api'
import priceStreamService from '../services/priceStream'

const AdminABookOrders = () => {
  const [trades, setTrades] = useState([])
  const [stats, setStats] = useState({
    aBookUsers: 0,
    openTrades: 0,
    closedTrades: 0,
    totalVolume: 0,
    totalPnl: 0,
    totalCommission: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('open')
  const [livePrices, setLivePrices] = useState({})

  useEffect(() => {
    fetchTrades()
  }, [activeTab])

  useEffect(() => {
    const unsubscribe = priceStreamService.subscribe('aBookOrders', (prices) => {
      if (!prices || Object.keys(prices).length === 0) return
      setLivePrices(prev => {
        const merged = { ...prev }
        Object.entries(prices).forEach(([symbol, price]) => {
          if (price && price.bid) {
            merged[symbol] = price
          }
        })
        return merged
      })
    })
    return () => unsubscribe()
  }, [])

  const fetchTrades = async () => {
    setLoading(true)
    try {
      const status = activeTab === 'open' ? 'OPEN' : 'CLOSED'
      const res = await fetch(`${API_URL}/book/a-book/trades?status=${status}&limit=100`)
      const data = await res.json()
      if (data.success) {
        setTrades(data.trades)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching A Book trades:', error)
    }
    setLoading(false)
  }

  const getDefaultContractSize = (symbol) => {
    if (symbol === 'XAUUSD') return 100
    if (symbol === 'XAGUSD') return 5000
    if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD'].includes(symbol)) return 1
    return 100000
  }

  const calculateFloatingPnl = (trade) => {
    if (trade.status !== 'OPEN') return trade.realizedPnl || 0
    const prices = livePrices[trade.symbol]
    if (!prices || !prices.bid) return trade._lastPnl || 0
    
    const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask
    if (!currentPrice || currentPrice <= 0) return trade._lastPnl || 0
    
    const contractSize = trade.contractSize || getDefaultContractSize(trade.symbol)
    const pnl = trade.side === 'BUY'
      ? (currentPrice - trade.openPrice) * trade.quantity * contractSize
      : (trade.openPrice - currentPrice) * trade.quantity * contractSize
    
    const finalPnl = pnl - (trade.commission || 0) - (trade.swap || 0)
    trade._lastPnl = finalPnl
    return finalPnl
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
  }

  return (
    <AdminLayout title="A Book Orders" subtitle="View-only access to A Book trades (Liquidity Provider)">
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={fetchTrades}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">A Book Users</p>
          <p className="text-green-500 text-xl font-bold">{stats.aBookUsers}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Open Trades</p>
          <p className="text-white text-xl font-bold">{stats.openTrades}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Closed Trades</p>
          <p className="text-white text-xl font-bold">{stats.closedTrades}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Total Volume</p>
          <p className="text-white text-xl font-bold">{stats.totalVolume.toFixed(2)}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Total P&L</p>
          <p className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${stats.totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-500 text-xs mb-1">Total Commission</p>
          <p className="text-white text-xl font-bold">${stats.totalCommission.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'open' 
              ? 'bg-primary-500 text-white' 
              : 'bg-dark-800 text-gray-400 hover:text-white border border-gray-700'
          }`}
        >
          <TrendingUp size={16} />
          Open Positions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'history' 
              ? 'bg-primary-500 text-white' 
              : 'bg-dark-800 text-gray-400 hover:text-white border border-gray-700'
          }`}
        >
          <Clock size={16} />
          Trade History
        </button>
      </div>

      {/* View Only Warning */}
      <div className="bg-dark-800 rounded-xl p-4 border border-yellow-500/30 mb-6">
        <div className="flex items-center gap-3">
          <Eye size={20} className="text-yellow-500 flex-shrink-0" />
          <p className="text-gray-400 text-sm">
            <strong className="text-yellow-500">View Only:</strong> A Book trades cannot be modified. These trades are processed through the liquidity provider.
          </p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No {activeTab === 'open' ? 'open' : 'closed'} trades found</div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-3">
              {trades.map((trade) => (
                <div key={trade._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 font-medium">{trade.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        trade.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {trade.side}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      trade.status === 'OPEN' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {trade.status === 'OPEN' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {trade.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">User</p>
                      <p className="text-white">{trade.userId?.firstName || 'N/A'}</p>
                      <p className="text-gray-500 text-xs">{trade.userId?.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Account</p>
                      <p className="text-white font-mono text-xs">{trade.tradingAccountId?.accountId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Volume</p>
                      <p className="text-white">{trade.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Entry Price</p>
                      <p className="text-white">{trade.openPrice?.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Commission</p>
                      <p className="text-green-500">${trade.commission?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">P&L</p>
                      <p className={`font-semibold ${calculateFloatingPnl(trade) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${calculateFloatingPnl(trade).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Opened: {formatDate(trade.openedAt)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Account</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Symbol</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Type</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Volume</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Entry Price</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Commission</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Swap</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">P&L</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Open Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                      <td className="py-4 px-4">
                        <p className="text-white font-medium">{trade.userId?.firstName || 'N/A'}</p>
                        <p className="text-gray-500 text-xs">{trade.userId?.email}</p>
                      </td>
                      <td className="py-4 px-4 text-gray-400 font-mono text-sm">
                        {trade.tradingAccountId?.accountId || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-green-500 font-medium">{trade.symbol}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white">{trade.quantity}</td>
                      <td className="py-4 px-4 text-white">{trade.openPrice?.toFixed(5)}</td>
                      <td className="py-4 px-4 text-green-500">${trade.commission?.toFixed(2) || '0.00'}</td>
                      <td className="py-4 px-4 text-gray-400">${trade.swap?.toFixed(2) || '-'}</td>
                      <td className={`py-4 px-4 font-medium ${calculateFloatingPnl(trade) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${calculateFloatingPnl(trade).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {formatDate(trade.openedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminABookOrders
