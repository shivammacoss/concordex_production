import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Users,
  BookOpen,
  Search,
  RefreshCw,
  Info,
  CheckCircle,
  Settings,
  Key,
  Link,
  Wifi,
  Eye,
  EyeOff,
  Save,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminBookManagement = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ aBookUsers: 0, bBookUsers: 0, totalUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBook, setFilterBook] = useState('all')
  const [transferring, setTransferring] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [bulkTransferring, setBulkTransferring] = useState(false)
  
  // LP Connection Settings
  const [showLpSettings, setShowLpSettings] = useState(false)
  const [lpSettings, setLpSettings] = useState({
    lpApiKey: '',
    lpApiSecret: '',
    lpApiUrl: '',
    corecenWsUrl: ''
  })
  const [showSecrets, setShowSecrets] = useState({ key: false, secret: false })
  const [savingLpSettings, setSavingLpSettings] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null) // 'success' | 'error' | null
  const [connectionMessage, setConnectionMessage] = useState('')
  const [lpConnected, setLpConnected] = useState(false)
  const [checkingLpStatus, setCheckingLpStatus] = useState(true)

  useEffect(() => {
    fetchUsers()
    fetchLpSettings()
    checkLpConnectionStatus()
  }, [filterBook])

  // Check LP connection status on mount and periodically
  const checkLpConnectionStatus = async () => {
    setCheckingLpStatus(true)
    try {
      const res = await fetch(`${API_URL}/book/lp-status`)
      const data = await res.json()
      setLpConnected(data.connected === true)
    } catch (error) {
      console.error('Error checking LP status:', error)
      setLpConnected(false)
    }
    setCheckingLpStatus(false)
  }

  // Fetch LP settings on mount
  const fetchLpSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/book/lp-settings`)
      const data = await res.json()
      if (data.success && data.fullSettings) {
        setLpSettings({
          lpApiKey: data.fullSettings.lpApiKey || '',
          lpApiSecret: data.fullSettings.lpApiSecret || '',
          lpApiUrl: data.fullSettings.lpApiUrl || '',
          corecenWsUrl: data.fullSettings.corecenWsUrl || ''
        })
      }
    } catch (error) {
      console.error('Error fetching LP settings:', error)
    }
  }

  // Save LP settings
  const saveLpSettings = async () => {
    setSavingLpSettings(true)
    setConnectionStatus(null)
    try {
      const res = await fetch(`${API_URL}/book/lp-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lpSettings)
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('success')
        setConnectionMessage('LP settings saved successfully!')
        setTimeout(() => setConnectionStatus(null), 3000)
      } else {
        setConnectionStatus('error')
        setConnectionMessage(data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving LP settings:', error)
      setConnectionStatus('error')
      setConnectionMessage('Error saving settings')
    }
    setSavingLpSettings(false)
  }

  // Test LP connection
  const testLpConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus(null)
    try {
      const res = await fetch(`${API_URL}/book/test-lp-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lpSettings)
      })
      const data = await res.json()
      if (data.success) {
        setConnectionStatus('success')
        setConnectionMessage(data.message || 'Connection successful!')
        setLpConnected(true)
      } else {
        setConnectionStatus('error')
        setConnectionMessage(data.message || 'Connection failed')
        setLpConnected(false)
      }
    } catch (error) {
      console.error('Error testing LP connection:', error)
      setConnectionStatus('error')
      setConnectionMessage('Error testing connection')
      setLpConnected(false)
    }
    setTestingConnection(false)
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterBook !== 'all') params.append('bookType', filterBook)
      if (searchTerm) params.append('search', searchTerm)
      
      const res = await fetch(`${API_URL}/book/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    setLoading(false)
  }

  const handleTransfer = async (userId, bookType) => {
    setTransferring(userId)
    try {
      const res = await fetch(`${API_URL}/book/users/${userId}/transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookType })
      })
      const data = await res.json()
      if (data.success) {
        fetchUsers()
      } else {
        alert(data.message || 'Failed to transfer user')
      }
    } catch (error) {
      console.error('Error transferring user:', error)
      alert('Error transferring user')
    }
    setTransferring(null)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u._id))
    }
  }

  const handleBulkTransfer = async (bookType) => {
    if (selectedUsers.length === 0) {
      alert('Please select users to transfer')
      return
    }
    
    setBulkTransferring(true)
    try {
      const res = await fetch(`${API_URL}/book/users/bulk-transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, bookType })
      })
      const data = await res.json()
      if (data.success) {
        setSelectedUsers([])
        fetchUsers()
      } else {
        alert(data.message || 'Failed to transfer users')
      }
    } catch (error) {
      console.error('Error bulk transferring users:', error)
      alert('Error transferring users')
    }
    setBulkTransferring(false)
  }

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    return user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getStatusColor = (user) => {
    if (user.isBanned) return 'bg-red-500/20 text-red-500'
    if (user.isBlocked) return 'bg-yellow-500/20 text-yellow-500'
    return 'bg-green-500/20 text-green-500'
  }

  const getStatusText = (user) => {
    if (user.isBanned) return 'Banned'
    if (user.isBlocked) return 'Blocked'
    return 'Active'
  }

  return (
    <AdminLayout title="Book Management" subtitle="Manage A Book and B Book users">
      {/* LP Connection Status Banner */}
      <div className={`mb-4 p-4 rounded-xl flex items-center justify-between ${
        checkingLpStatus 
          ? 'bg-yellow-500/10 border border-yellow-500/30' 
          : lpConnected 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-red-500/10 border border-red-500/30'
      }`}>
        <div className="flex items-center gap-3">
          {checkingLpStatus ? (
            <RefreshCw size={20} className="text-yellow-500 animate-spin" />
          ) : lpConnected ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : (
            <XCircle size={20} className="text-red-500" />
          )}
          <div>
            <p className={`font-medium ${checkingLpStatus ? 'text-yellow-400' : lpConnected ? 'text-green-400' : 'text-red-400'}`}>
              {checkingLpStatus ? 'Checking LP Connection...' : lpConnected ? 'LP Connected' : 'LP Not Connected'}
            </p>
            <p className="text-gray-500 text-sm">
              {checkingLpStatus 
                ? 'Verifying connection to Liquidity Provider' 
                : lpConnected 
                  ? 'A-Book trades will be routed to LP automatically' 
                  : 'Configure LP settings below to enable A-Book routing'}
            </p>
          </div>
        </div>
        <button
          onClick={checkLpConnectionStatus}
          disabled={checkingLpStatus}
          className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={checkingLpStatus ? 'animate-spin' : ''} />
          Check Status
        </button>
      </div>

      {/* Warning if LP not connected */}
      {!checkingLpStatus && !lpConnected && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
          <Info size={18} className="text-orange-500 flex-shrink-0" />
          <p className="text-orange-400 text-sm">
            <strong>Warning:</strong> Users cannot be moved to A-Book while LP is disconnected. Please configure and test the LP connection first.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowLpSettings(!showLpSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            lpConnected 
              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30' 
              : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30'
          }`}
        >
          <Settings size={16} />
          LP Connection Settings
          {showLpSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* LP Connection Settings Panel */}
      {showLpSettings && (
        <div className="bg-dark-800 rounded-xl p-6 border border-purple-500/30 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Wifi size={20} className="text-purple-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Liquidity Provider Connection</h3>
              <p className="text-gray-500 text-sm">Configure connection to Corcen LP for A-Book trade routing</p>
            </div>
          </div>

          {/* Connection Status Message */}
          {connectionStatus && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              connectionStatus === 'success' 
                ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}>
              {connectionStatus === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
              <span>{connectionMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* LP API URL */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Link size={14} className="inline mr-2" />
                LP API URL
              </label>
              <input
                type="text"
                value={lpSettings.lpApiUrl}
                onChange={(e) => setLpSettings({ ...lpSettings, lpApiUrl: e.target.value })}
                placeholder="http://localhost:3001"
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* WebSocket URL */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Wifi size={14} className="inline mr-2" />
                WebSocket URL
              </label>
              <input
                type="text"
                value={lpSettings.corecenWsUrl}
                onChange={(e) => setLpSettings({ ...lpSettings, corecenWsUrl: e.target.value })}
                placeholder="http://localhost:3001"
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* LP API Key */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Key size={14} className="inline mr-2" />
                LP API Key
              </label>
              <div className="relative">
                <input
                  type={showSecrets.key ? 'text' : 'password'}
                  value={lpSettings.lpApiKey}
                  onChange={(e) => setLpSettings({ ...lpSettings, lpApiKey: e.target.value })}
                  placeholder="lpk_xxxxxxxxxxxxxxxx"
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets({ ...showSecrets, key: !showSecrets.key })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showSecrets.key ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* LP API Secret */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                <Key size={14} className="inline mr-2" />
                LP API Secret
              </label>
              <div className="relative">
                <input
                  type={showSecrets.secret ? 'text' : 'password'}
                  value={lpSettings.lpApiSecret}
                  onChange={(e) => setLpSettings({ ...lpSettings, lpApiSecret: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets({ ...showSecrets, secret: !showSecrets.secret })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showSecrets.secret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={testLpConnection}
              disabled={testingConnection || !lpSettings.lpApiUrl}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Wifi size={16} />
              )}
              Test Connection
            </button>
            <button
              onClick={saveLpSettings}
              disabled={savingLpSettings}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingLpSettings ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Settings
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-dark-700 rounded-lg">
            <p className="text-gray-500 text-xs">
              <strong className="text-gray-400">Note:</strong> These settings configure the connection to your Corcen Liquidity Provider. 
              A-Book trades will be automatically routed to the LP using these credentials. 
              Make sure to test the connection before saving.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <BookOpen size={24} className="text-green-500" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">A Book Users</p>
            <p className="text-white text-2xl font-bold">{stats.aBookUsers}</p>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <BookOpen size={24} className="text-blue-500" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">B Book Users</p>
            <p className="text-white text-2xl font-bold">{stats.bBookUsers}</p>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Users size={24} className="text-purple-500" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Users</p>
            <p className="text-white text-2xl font-bold">{stats.totalUsers}</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-dark-800 rounded-xl p-4 border border-gray-800 mb-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-yellow-500 font-semibold mb-2">A Book vs B Book</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• <strong className="text-white">A Book:</strong> Trades go to liquidity provider. Admin cannot modify trades. Only charges are deducted.</li>
              <li>• <strong className="text-white">B Book:</strong> Trades are managed internally. Admin has full control over trades, P&L, and modifications.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
          </form>
          <select
            value={filterBook}
            onChange={(e) => setFilterBook(e.target.value)}
            className="bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-600"
          >
            <option value="all">All Books</option>
            <option value="A">A Book</option>
            <option value="B">B Book</option>
          </select>
          {selectedUsers.length > 0 && (
            <>
              <span className="text-gray-400 text-sm whitespace-nowrap">{selectedUsers.length} selected</span>
              <button
                onClick={() => handleBulkTransfer('A')}
                disabled={bulkTransferring || !lpConnected}
                title={!lpConnected ? 'LP must be connected to move users to A-Book' : ''}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                  !lpConnected 
                    ? 'bg-gray-500/20 text-gray-500 border border-gray-500/30' 
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/30'
                }`}
              >
                Move to A Book
              </button>
              <button
                onClick={() => handleBulkTransfer('B')}
                disabled={bulkTransferring}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Move to B Book
              </button>
            </>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found</div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-3">
              {filteredUsers.map((user) => (
                <div key={user._id} className={`bg-dark-700 rounded-xl p-4 border ${selectedUsers.includes(user._id) ? 'border-primary-500' : 'border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                        className="rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500 cursor-pointer" 
                      />
                      <div>
                        <p className="text-white font-medium">{user.firstName || 'N/A'}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user)}`}>
                      {getStatusText(user)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-gray-500 text-xs">Current Book</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.bookType === 'A' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {user.bookType || 'B'} Book
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Changed At</p>
                      <p className="text-gray-400 text-sm">
                        {user.bookChangedAt ? new Date(user.bookChangedAt).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTransfer(user._id, 'A')}
                      disabled={user.bookType === 'A' || transferring === user._id || !lpConnected}
                      title={!lpConnected ? 'LP must be connected to move users to A-Book' : ''}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        user.bookType === 'A'
                          ? 'bg-green-500/20 text-green-500 opacity-50 cursor-not-allowed'
                          : !lpConnected
                            ? 'bg-gray-500/20 text-gray-500 opacity-50 cursor-not-allowed'
                            : 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30'
                      }`}
                    >
                      A Book
                    </button>
                    <button
                      onClick={() => handleTransfer(user._id, 'B')}
                      disabled={user.bookType === 'B' || !user.bookType || transferring === user._id}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        user.bookType === 'B' || !user.bookType
                          ? 'bg-blue-500/20 text-blue-500 opacity-50 cursor-not-allowed'
                          : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30'
                      }`}
                    >
                      B Book
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500 cursor-pointer" 
                      />
                    </th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Email</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Current Book</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Changed At</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className={`border-b border-gray-800 hover:bg-dark-700/50 ${selectedUsers.includes(user._id) ? 'bg-dark-700/30' : ''}`}>
                      <td className="py-4 px-4">
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => handleSelectUser(user._id)}
                          className="rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500 cursor-pointer" 
                        />
                      </td>
                      <td className="py-4 px-4 text-white font-medium">{user.firstName || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-400">{user.email}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.bookType === 'A' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          {user.bookType || 'B'} Book
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {user.bookChangedAt ? new Date(user.bookChangedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user)}`}>
                          {getStatusText(user)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTransfer(user._id, 'A')}
                            disabled={user.bookType === 'A' || transferring === user._id || !lpConnected}
                            title={!lpConnected ? 'LP must be connected to move users to A-Book' : ''}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.bookType === 'A'
                                ? 'bg-green-500/20 text-green-500 opacity-50 cursor-not-allowed'
                                : !lpConnected
                                  ? 'bg-gray-500/20 text-gray-500 opacity-50 cursor-not-allowed'
                                  : 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30'
                            }`}
                          >
                            A Book
                          </button>
                          <button
                            onClick={() => handleTransfer(user._id, 'B')}
                            disabled={user.bookType === 'B' || !user.bookType || transferring === user._id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.bookType === 'B' || !user.bookType
                                ? 'bg-blue-500/20 text-blue-500 opacity-50 cursor-not-allowed'
                                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30'
                            }`}
                          >
                            B Book
                          </button>
                        </div>
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

export default AdminBookManagement
