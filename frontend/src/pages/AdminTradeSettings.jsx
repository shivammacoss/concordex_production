import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Plus,
  X,
  Trash2
} from 'lucide-react'
import { adminFetch } from '../config/api'

const AdminTradeSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [settings, setSettings] = useState({
    stopOutLevel: 50,
    marginCallLevel: 80,
    swapTime: '17:00',
    swapTimezone: 'America/New_York',
    tripleSwapDay: 'Wednesday',
    tradingEnabled: true,
    maxLeverageGlobal: 500,
    availableLeverageOptions: ['1:10', '1:20', '1:50', '1:100', '1:200', '1:300', '1:400', '1:500'],
    defaultLeverage: '1:100',
    maxOpenTradesPerUser: 100,
    maxOpenLotsPerUser: 100
  })

  const [newLeverage, setNewLeverage] = useState('')

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/admin/trade/settings')
      const data = await res.json()
      if (data.success && data.settings) {
        setSettings({
          stopOutLevel: data.settings.stopOutLevel || 50,
          marginCallLevel: data.settings.marginCallLevel || 80,
          swapTime: data.settings.swapTime || '17:00',
          swapTimezone: data.settings.swapTimezone || 'America/New_York',
          tripleSwapDay: data.settings.tripleSwapDay || 'Wednesday',
          tradingEnabled: data.settings.tradingEnabled !== false,
          maxLeverageGlobal: data.settings.maxLeverageGlobal || 500,
          availableLeverageOptions: data.settings.availableLeverageOptions || ['1:10', '1:20', '1:50', '1:100', '1:200', '1:300', '1:400', '1:500'],
          defaultLeverage: data.settings.defaultLeverage || '1:100',
          maxOpenTradesPerUser: data.settings.maxOpenTradesPerUser || 100,
          maxOpenLotsPerUser: data.settings.maxOpenLotsPerUser || 100
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      const res = await adminFetch('/admin/trade/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...settings,
          adminId: adminUser._id
        })
      })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' })
    }
    setSaving(false)
  }

  const addLeverageOption = () => {
    if (!newLeverage) return
    
    // Format the leverage properly
    let formatted = newLeverage
    if (!formatted.startsWith('1:')) {
      formatted = `1:${formatted.replace(/[^0-9]/g, '')}`
    }
    
    if (settings.availableLeverageOptions.includes(formatted)) {
      setMessage({ type: 'error', text: 'This leverage option already exists' })
      return
    }
    
    // Sort leverage options numerically
    const newOptions = [...settings.availableLeverageOptions, formatted].sort((a, b) => {
      const numA = parseInt(a.replace('1:', ''))
      const numB = parseInt(b.replace('1:', ''))
      return numA - numB
    })
    
    setSettings({ ...settings, availableLeverageOptions: newOptions })
    setNewLeverage('')
  }

  const removeLeverageOption = (option) => {
    if (settings.availableLeverageOptions.length <= 1) {
      setMessage({ type: 'error', text: 'At least one leverage option is required' })
      return
    }
    
    const newOptions = settings.availableLeverageOptions.filter(o => o !== option)
    
    // If removing the default, set a new default
    let newDefault = settings.defaultLeverage
    if (option === settings.defaultLeverage) {
      newDefault = newOptions[0]
    }
    
    setSettings({ 
      ...settings, 
      availableLeverageOptions: newOptions,
      defaultLeverage: newDefault
    })
  }

  if (loading) {
    return (
      <AdminLayout title="Trade Settings" subtitle="Configure global trading parameters">
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="text-gray-500 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Trade Settings" subtitle="Configure global trading parameters">
      <div className="max-w-4xl">
        {message.text && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${
            message.type === 'error' 
              ? 'bg-red-500/20 text-red-500' 
              : 'bg-green-500/20 text-green-500'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Leverage Settings */}
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Leverage Settings</h3>
              <p className="text-gray-500 text-sm">Configure available leverage options for users</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Available Leverage Options */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Available Leverage Options</label>
              <p className="text-gray-500 text-xs mb-3">These options will be shown to users on the trading terminal</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.availableLeverageOptions.map(option => (
                  <div 
                    key={option} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                      option === settings.defaultLeverage 
                        ? 'bg-accent-green/20 border-accent-green text-accent-green' 
                        : 'bg-dark-700 border-gray-700 text-white'
                    }`}
                  >
                    <span className="text-sm font-medium">{option}</span>
                    {option === settings.defaultLeverage && (
                      <span className="text-xs bg-accent-green/30 px-1.5 py-0.5 rounded">Default</span>
                    )}
                    <button 
                      onClick={() => removeLeverageOption(option)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Leverage */}
              <div className="flex gap-2">
                <div className="flex items-center bg-dark-700 border border-gray-700 rounded-lg overflow-hidden">
                  <span className="px-3 text-gray-400 text-sm">1:</span>
                  <input
                    type="number"
                    value={newLeverage}
                    onChange={(e) => setNewLeverage(e.target.value)}
                    placeholder="e.g. 1000"
                    className="bg-transparent border-none py-2 pr-3 text-white placeholder-gray-500 focus:outline-none w-24"
                  />
                </div>
                <button
                  onClick={addLeverageOption}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  <Plus size={16} />
                  <span className="text-sm">Add</span>
                </button>
              </div>
            </div>

            {/* Default Leverage */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Default Leverage</label>
              <p className="text-gray-500 text-xs mb-2">Default leverage for new trading accounts</p>
              <select
                value={settings.defaultLeverage}
                onChange={(e) => setSettings({ ...settings, defaultLeverage: e.target.value })}
                className="w-full max-w-xs bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              >
                {settings.availableLeverageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Max Leverage Global */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Maximum Leverage (Global Limit)</label>
              <p className="text-gray-500 text-xs mb-2">Maximum leverage allowed across the platform</p>
              <div className="flex items-center bg-dark-700 border border-gray-700 rounded-lg overflow-hidden w-full max-w-xs">
                <span className="px-3 text-gray-400 text-sm">1:</span>
                <input
                  type="number"
                  value={settings.maxLeverageGlobal}
                  onChange={(e) => setSettings({ ...settings, maxLeverageGlobal: parseInt(e.target.value) || 500 })}
                  className="bg-transparent border-none py-2.5 pr-4 text-white focus:outline-none flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Settings */}
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <AlertCircle size={20} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Risk Management</h3>
              <p className="text-gray-500 text-sm">Configure stop-out and margin call levels</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Stop Out Level (%)</label>
              <input
                type="number"
                value={settings.stopOutLevel}
                onChange={(e) => setSettings({ ...settings, stopOutLevel: parseInt(e.target.value) || 50 })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              />
              <p className="text-gray-500 text-xs mt-1">Trades will be closed when margin level falls below this</p>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Margin Call Level (%)</label>
              <input
                type="number"
                value={settings.marginCallLevel}
                onChange={(e) => setSettings({ ...settings, marginCallLevel: parseInt(e.target.value) || 80 })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              />
              <p className="text-gray-500 text-xs mt-1">Warning will be shown when margin level falls below this</p>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Max Open Trades Per User</label>
              <input
                type="number"
                value={settings.maxOpenTradesPerUser}
                onChange={(e) => setSettings({ ...settings, maxOpenTradesPerUser: parseInt(e.target.value) || 100 })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Max Open Lots Per User</label>
              <input
                type="number"
                value={settings.maxOpenLotsPerUser}
                onChange={(e) => setSettings({ ...settings, maxOpenLotsPerUser: parseInt(e.target.value) || 100 })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Swap Settings */}
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Settings size={20} className="text-purple-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Swap Settings</h3>
              <p className="text-gray-500 text-sm">Configure overnight swap/rollover settings</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Swap Time</label>
              <input
                type="time"
                value={settings.swapTime}
                onChange={(e) => setSettings({ ...settings, swapTime: e.target.value })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Swap Timezone</label>
              <select
                value={settings.swapTimezone}
                onChange={(e) => setSettings({ ...settings, swapTimezone: e.target.value })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              >
                <option value="America/New_York">New York (EST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Triple Swap Day</label>
              <select
                value={settings.tripleSwapDay}
                onChange={(e) => setSettings({ ...settings, tripleSwapDay: e.target.value })}
                className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Trading Status */}
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                settings.tradingEnabled ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <Settings size={20} className={settings.tradingEnabled ? 'text-green-500' : 'text-red-500'} />
              </div>
              <div>
                <h3 className="text-white font-semibold">Trading Status</h3>
                <p className="text-gray-500 text-sm">Enable or disable trading globally</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, tradingEnabled: !settings.tradingEnabled })}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.tradingEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                settings.tradingEnabled ? 'left-8' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-accent-green text-black rounded-lg font-medium hover:bg-accent-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </AdminLayout>
  )
}

export default AdminTradeSettings
