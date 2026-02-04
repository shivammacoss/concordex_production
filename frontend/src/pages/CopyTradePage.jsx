import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import concorddexLogo from '../assets/concorddex.png'
import { 
  LayoutDashboard, User, Wallet, Users, Copy, UserCircle, HelpCircle, FileText, LogOut,
  TrendingUp, Star, UserPlus, Pause, Play, X, Search, Filter, ChevronRight, Trophy, Crown, DollarSign,
  ArrowLeft, Home, Sun, Moon
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'

const CopyTradePage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('discover')
  const [masters, setMasters] = useState([])
  const [mySubscriptions, setMySubscriptions] = useState([])
  const [myCopyTrades, setMyCopyTrades] = useState([])
  const [myFollowers, setMyFollowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [selectedMaster, setSelectedMaster] = useState(null)
  const [copyMode, setCopyMode] = useState('FIXED_LOT')
  const [copyValue, setCopyValue] = useState('0.01')
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  
  // Master trader states
  const [myMasterProfile, setMyMasterProfile] = useState(null)
  const [myMasterProfiles, setMyMasterProfiles] = useState([]) // All strategies
  const [selectedMasterProfile, setSelectedMasterProfile] = useState(null) // Currently selected strategy
  const [showMasterModal, setShowMasterModal] = useState(false)
  const [showMultipleMasterModal, setShowMultipleMasterModal] = useState(false) // Multiple master modal
  const [masterForm, setMasterForm] = useState({
    displayName: '',
    description: '',
    strategyName: '',
    tradingAccountId: '',
    requestedCommissionPercentage: 10,
    commissionPaymentFrequency: 'daily' // 'daily' or 'weekly'
  })
  // Multiple master form - array of strategies
  const [multipleMasterForms, setMultipleMasterForms] = useState([
    { displayName: '', description: '', tradingAccountId: '', requestedCommissionPercentage: 10 }
  ])
  const [applyingMaster, setApplyingMaster] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // Commission settings from backend
  const [commissionSettings, setCommissionSettings] = useState({ minCommissionPercentage: 5, maxCommissionPercentage: 50 })
  
  // Edit subscription states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState(null)
  const [editAccount, setEditAccount] = useState('')
  const [editCopyMode, setEditCopyMode] = useState('FIXED_LOT')
  const [editCopyValue, setEditCopyValue] = useState('0.01')

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Account', icon: User, path: '/account' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Orders', icon: FileText, path: '/orders' },
    { name: 'IB', icon: Users, path: '/ib' },
    { name: 'Copytrade', icon: Copy, path: '/copytrade' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
    { name: 'Support', icon: HelpCircle, path: '/support' },
    { name: 'Instructions', icon: FileText, path: '/instructions' },
  ]

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
    fetchMasters()
    fetchMySubscriptions()
    fetchMyCopyTrades()
    fetchAccounts()
    fetchMyMasterProfile()
    fetchCommissionSettings()
  }, [])

  // Fetch my followers when selected master profile changes
  useEffect(() => {
    if (selectedMasterProfile?._id && selectedMasterProfile?.status === 'ACTIVE') {
      fetchMyFollowers()
    }
  }, [selectedMasterProfile])

  const fetchMyFollowers = async () => {
    if (!selectedMasterProfile?._id) return
    try {
      const res = await fetch(`${API_URL}/copy/my-followers/${selectedMasterProfile._id}`)
      const data = await res.json()
      setMyFollowers(data.followers || [])
    } catch (error) {
      console.error('Error fetching my followers:', error)
    }
  }

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) setChallengeModeEnabled(data.enabled)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchCommissionSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/settings`)
      const data = await res.json()
      if (data.success && data.settings?.commissionSettings) {
        setCommissionSettings(data.settings.commissionSettings)
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error)
    }
  }

  const fetchMasters = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/masters`)
      const data = await res.json()
      setMasters(data.masters || [])
    } catch (error) {
      console.error('Error fetching masters:', error)
    }
    setLoading(false)
  }

  const fetchMySubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/my-subscriptions/${user._id}`)
      const data = await res.json()
      setMySubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    }
  }

  const fetchMyCopyTrades = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/my-copy-trades/${user._id}?limit=50`)
      const data = await res.json()
      setMyCopyTrades(data.copyTrades || [])
    } catch (error) {
      console.error('Error fetching copy trades:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/trading-accounts/user/${user._id}`)
      const data = await res.json()
      // Filter out demo accounts for copy trading (only real accounts allowed)
      const realAccounts = (data.accounts || []).filter(acc => !acc.isDemo)
      setAccounts(realAccounts)
      if (realAccounts.length > 0) {
        setSelectedAccount(realAccounts[0]._id)
        setMasterForm(prev => ({ ...prev, tradingAccountId: realAccounts[0]._id }))
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchMyMasterProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/copy/master/my-profile/${user._id}`)
      const data = await res.json()
      if (data.master) {
        setMyMasterProfile(data.master)
        setSelectedMasterProfile(data.master)
      }
      if (data.masters) {
        setMyMasterProfiles(data.masters)
      }
    } catch (error) {
      // User is not a master - that's okay
      console.log('No master profile found')
    }
  }

  const handleApplyMaster = async () => {
    const accountId = masterForm.tradingAccountId || (accounts.length > 0 ? accounts[0]._id : '')
    
    if (!masterForm.displayName.trim()) {
      alert('Please enter a display name')
      return
    }
    if (!accountId) {
      alert('Please select a trading account')
      return
    }
    if (masterForm.requestedCommissionPercentage < commissionSettings.minCommissionPercentage || masterForm.requestedCommissionPercentage > commissionSettings.maxCommissionPercentage) {
      alert(`Commission must be between ${commissionSettings.minCommissionPercentage}% and ${commissionSettings.maxCommissionPercentage}%`)
      return
    }
    
    // Update form with selected account if not set
    const formData = {
      ...masterForm,
      tradingAccountId: accountId
    }

    setApplyingMaster(true)
    try {
      const res = await fetch(`${API_URL}/copy/master/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          ...formData
        })
      })

      const data = await res.json()
      if (data.master) {
        alert('Strategy submitted successfully! Please wait for admin approval.')
        setShowMasterModal(false)
        // Reset form for next strategy
        setMasterForm({
          displayName: '',
          description: '',
          strategyName: '',
          tradingAccountId: '',
          requestedCommissionPercentage: 10,
          commissionPaymentFrequency: 'daily'
        })
        fetchMyMasterProfile()
      } else {
        alert(data.message || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Error applying as master:', error)
      alert('Failed to submit application')
    }
    setApplyingMaster(false)
  }

  // Handle multiple master accounts submission
  const handleApplyMultipleMasters = async () => {
    // Validate all forms
    for (let i = 0; i < multipleMasterForms.length; i++) {
      const form = multipleMasterForms[i]
      if (!form.displayName.trim()) {
        alert(`Strategy ${i + 1}: Please enter a display name`)
        return
      }
      if (!form.tradingAccountId && accounts.length === 0) {
        alert(`Strategy ${i + 1}: Please select a trading account`)
        return
      }
      if (form.requestedCommissionPercentage < commissionSettings.minCommissionPercentage || 
          form.requestedCommissionPercentage > commissionSettings.maxCommissionPercentage) {
        alert(`Strategy ${i + 1}: Commission must be between ${commissionSettings.minCommissionPercentage}% and ${commissionSettings.maxCommissionPercentage}%`)
        return
      }
    }

    // Check if total strategies would exceed limit
    if (myMasterProfiles.length + multipleMasterForms.length > 5) {
      alert(`You can only have 5 strategies. You have ${myMasterProfiles.length} and trying to add ${multipleMasterForms.length}.`)
      return
    }

    setApplyingMaster(true)
    let successCount = 0
    let failedCount = 0

    for (const form of multipleMasterForms) {
      try {
        const accountId = form.tradingAccountId || (accounts.length > 0 ? accounts[0]._id : '')
        const res = await fetch(`${API_URL}/copy/master/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user._id,
            displayName: form.displayName,
            description: form.description,
            tradingAccountId: accountId,
            requestedCommissionPercentage: form.requestedCommissionPercentage,
            strategyName: form.displayName
          })
        })
        const data = await res.json()
        if (data.master) {
          successCount++
        } else {
          failedCount++
        }
      } catch (error) {
        console.error('Error creating strategy:', error)
        failedCount++
      }
    }

    if (successCount > 0) {
      alert(`Successfully created ${successCount} strategies!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`)
      setShowMultipleMasterModal(false)
      setMultipleMasterForms([{ displayName: '', description: '', tradingAccountId: '', requestedCommissionPercentage: 10 }])
      fetchMyMasterProfile()
    } else {
      alert('Failed to create strategies')
    }
    setApplyingMaster(false)
  }

  // Add new strategy form
  const addStrategyForm = () => {
    if (myMasterProfiles.length + multipleMasterForms.length >= 5) {
      alert('Maximum 5 strategies allowed')
      return
    }
    setMultipleMasterForms([...multipleMasterForms, { displayName: '', description: '', tradingAccountId: '', requestedCommissionPercentage: 10 }])
  }

  // Remove strategy form
  const removeStrategyForm = (index) => {
    if (multipleMasterForms.length === 1) return
    setMultipleMasterForms(multipleMasterForms.filter((_, i) => i !== index))
  }

  // Update strategy form
  const updateStrategyForm = (index, field, value) => {
    const updated = [...multipleMasterForms]
    updated[index][field] = value
    setMultipleMasterForms(updated)
  }

  const handleFollow = async () => {
    if (!selectedMaster || !selectedAccount) return

    try {
      const res = await fetch(`${API_URL}/copy/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerUserId: user._id,
          masterId: selectedMaster._id,
          followerAccountId: selectedAccount,
          copyMode,
          copyValue: parseFloat(copyValue)
        })
      })

      const data = await res.json()
      if (data.follower) {
        alert('Successfully following master!')
        setShowFollowModal(false)
        fetchMySubscriptions()
      } else {
        alert(data.message || 'Failed to follow')
      }
    } catch (error) {
      console.error('Error following master:', error)
      alert('Failed to follow master')
    }
  }

  const handlePauseResume = async (subscriptionId, currentStatus) => {
    const action = currentStatus === 'ACTIVE' ? 'pause' : 'resume'
    try {
      const res = await fetch(`${API_URL}/copy/follow/${subscriptionId}/${action}`, {
        method: 'PUT'
      })
      const data = await res.json()
      if (data.follower) {
        fetchMySubscriptions()
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
    }
  }

  const handleStop = async (subscriptionId) => {
    if (!confirm('Are you sure you want to stop following this master?')) return

    try {
      const res = await fetch(`${API_URL}/copy/follow/${subscriptionId}/stop`, {
        method: 'PUT'
      })
      const data = await res.json()
      if (data.follower) {
        fetchMySubscriptions()
      }
    } catch (error) {
      console.error('Error stopping subscription:', error)
    }
  }

  const handleEditSubscription = (sub) => {
    setEditingSubscription(sub)
    setEditAccount(sub.followerAccountId?._id || sub.followerAccountId || '')
    setEditCopyMode(sub.copyMode || 'FIXED_LOT')
    setEditCopyValue(sub.copyValue?.toString() || '0.01')
    setShowEditModal(true)
  }

  const handleSaveSubscription = async () => {
    if (!editingSubscription) return

    try {
      const res = await fetch(`${API_URL}/copy/follow/${editingSubscription._id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerAccountId: editAccount,
          copyMode: editCopyMode,
          copyValue: parseFloat(editCopyValue)
        })
      })
      const data = await res.json()
      if (data.success || data.follower) {
        alert('Subscription updated successfully!')
        setShowEditModal(false)
        setEditingSubscription(null)
        fetchMySubscriptions()
      } else {
        alert(data.message || 'Failed to update subscription')
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      alert('Failed to update subscription')
    }
  }

  const handleUnfollow = async (subscriptionId) => {
    if (!confirm('Are you sure you want to unfollow this master? This will stop all future copy trades.')) return

    try {
      const res = await fetch(`${API_URL}/copy/follow/${subscriptionId}/unfollow`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        alert('Successfully unfollowed master')
        fetchMySubscriptions()
      } else {
        alert(data.message || 'Failed to unfollow')
      }
    } catch (error) {
      console.error('Error unfollowing:', error)
      alert('Failed to unfollow master')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  const filteredMasters = masters.filter(m => 
    m.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Copy Trading</h1>
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => navigate('/mobile')} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <Home size={20} className="text-gray-400" />
          </button>
        </header>
      )}

      {/* Sidebar - Hidden on Mobile */}
      {!isMobile && (
        <aside 
          className={`${sidebarExpanded ? 'w-48' : 'w-16'} ${isDarkMode ? 'bg-dark-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          <div className="p-4 flex items-center justify-center">
            <img src={concorddexLogo} alt="Concorddex" className="w-8 h-8 rounded object-cover" />
          </div>
          <nav className="flex-1 px-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  item.name === 'Copytrade' ? 'bg-accent-green text-black' : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarExpanded && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>
          <div className={`p-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button onClick={toggleDarkMode} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${isDarkMode ? 'text-yellow-400 hover:bg-dark-700' : 'text-blue-500 hover:bg-gray-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {sidebarExpanded && <span className="text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <LogOut size={18} />
              {sidebarExpanded && <span className="text-sm">Log Out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-14' : ''}`}>
        {!isMobile && (
          <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Copy Trading</h1>
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          {/* Master Account Buttons - Always show both */}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 mb-4`}>
            <button
              onClick={() => setShowMasterModal(true)}
              className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-black ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm'} rounded-lg font-medium hover:from-yellow-400 hover:to-orange-400 flex items-center justify-center gap-2 ${myMasterProfiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={myMasterProfiles.length >= 5}
            >
              <Crown size={16} />
              Open Master Account
            </button>
            <button
              onClick={() => setShowMultipleMasterModal(true)}
              className={`bg-gradient-to-r from-purple-500 to-blue-500 text-white ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-sm'} rounded-lg font-medium hover:from-purple-400 hover:to-blue-400 flex items-center justify-center gap-2 ${myMasterProfiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={myMasterProfiles.length >= 5}
            >
              <Users size={16} />
              Multiple Master Account
            </button>
          </div>

          {/* My Strategies Section */}
          <div className={`bg-dark-800 rounded-xl ${isMobile ? 'p-4' : 'p-5'} border border-gray-700 mb-4`}>
            <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} mb-4`}>
              <div className="flex items-center gap-3">
                <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-yellow-500/20 rounded-full flex items-center justify-center`}>
                  <Crown size={isMobile ? 20 : 24} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>My Trading Strategies</h3>
                  <p className="text-gray-400 text-xs">{myMasterProfiles.length}/5 strategies • Share your trades and earn commission</p>
                </div>
              </div>
            </div>
            
            {/* Strategy Cards */}
            {myMasterProfiles.length > 0 ? (
              <div className="space-y-3">
                {myMasterProfiles.map((profile) => (
                  <div 
                    key={profile._id}
                    onClick={() => setSelectedMasterProfile(profile)}
                    className={`rounded-lg p-3 border cursor-pointer transition-all ${
                      selectedMasterProfile?._id === profile._id 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-gray-700 bg-dark-700 hover:border-gray-600'
                    } ${
                      profile.status === 'ACTIVE' ? 'border-l-4 border-l-green-500' :
                      profile.status === 'PENDING' ? 'border-l-4 border-l-yellow-500' :
                      profile.status === 'REJECTED' ? 'border-l-4 border-l-red-500' :
                      profile.status === 'SUSPENDED' ? 'border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium text-sm">{profile.displayName}</h4>
                        <p className="text-gray-400 text-xs">
                          <span className={
                            profile.status === 'ACTIVE' ? 'text-green-500' :
                            profile.status === 'PENDING' ? 'text-yellow-500' :
                            profile.status === 'SUSPENDED' ? 'text-orange-500' : 'text-red-500'
                          }>{profile.status}</span>
                          {profile.status === 'ACTIVE' && ` • ${profile.stats?.activeFollowers || 0} followers • ${profile.approvedCommissionPercentage}% commission`}
                        </p>
                      </div>
                      {profile.status === 'ACTIVE' && (
                        <div className="text-right">
                          <p className="text-green-500 text-sm font-medium">${(profile.totalCommissionEarned || 0).toFixed(2)}</p>
                          <p className="text-gray-500 text-xs">earned</p>
                        </div>
                      )}
                    </div>
                    {profile.status === 'REJECTED' && profile.rejectionReason && (
                      <p className="text-red-400 text-xs mt-2">Reason: {profile.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No strategies yet. Create your first trading strategy!</p>
              </div>
            )}
          </div>

          {/* Tabs - Scrollable on mobile */}
          <div className={`flex ${isMobile ? 'gap-2 overflow-x-auto pb-2' : 'gap-4'} mb-4`}>
            {['discover', 'subscriptions', 'trades', ...(myMasterProfiles.some(p => p.status === 'ACTIVE') ? ['my-followers'] : [])].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${isMobile ? 'px-3 py-1.5 text-xs whitespace-nowrap' : 'px-4 py-2'} rounded-lg font-medium transition-colors ${
                  activeTab === tab ? 'bg-accent-green text-black' : isDarkMode ? 'bg-dark-800 text-gray-400 hover:text-white' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                }`}
              >
                {tab === 'discover' ? 'Discover' : 
                 tab === 'subscriptions' ? 'Subscriptions' : 
                 tab === 'trades' ? 'Trades' : 'Followers'}
              </button>
            ))}
          </div>

          {/* Discover Masters */}
          {activeTab === 'discover' && (
            <div>
              <div className={`flex ${isMobile ? 'gap-2' : 'gap-4'} mb-4`}>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search masters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full rounded-lg pl-9 pr-3 ${isMobile ? 'py-2 text-sm' : 'py-2'} ${isDarkMode ? 'bg-dark-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} border`}
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading masters...</div>
              ) : filteredMasters.length === 0 ? (
                <div className="text-center py-12">
                  <Copy size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No master traders available yet</p>
                  <p className="text-gray-600 text-sm mt-2">Check back later for trading experts to follow</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMasters.map(master => {
                    const isFollowing = mySubscriptions.some(sub => sub.masterId?._id === master._id || sub.masterId === master._id)
                    return (
                      <div key={master._id} className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-5 border`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center">
                            <span className="text-accent-green font-bold">{master.displayName?.charAt(0)}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{master.displayName}</h3>
                            <p className="text-gray-500 text-sm">{master.stats?.activeFollowers || 0} followers</p>
                          </div>
                          {isFollowing && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full font-medium">
                              Following
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className={`${isDarkMode ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg p-3`}>
                            <p className="text-gray-500 text-xs">Win Rate</p>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{master.stats?.winRate?.toFixed(1) || 0}%</p>
                          </div>
                          <div className={`${isDarkMode ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg p-3`}>
                            <p className="text-gray-500 text-xs">Total Trades</p>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{master.stats?.totalTrades || 0}</p>
                          </div>
                          <div className={`${isDarkMode ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg p-3`}>
                            <p className="text-gray-500 text-xs">Commission</p>
                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{master.approvedCommissionPercentage || 0}%</p>
                          </div>
                          <div className={`${isDarkMode ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg p-3`}>
                            <p className="text-gray-500 text-xs">Profit</p>
                            <p className="text-accent-green font-semibold">${master.stats?.totalProfitGenerated?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                        {isFollowing ? (
                          <button
                            onClick={() => setActiveTab('subscriptions')}
                            className="w-full bg-green-500/20 text-green-500 py-2 rounded-lg font-medium border border-green-500/50 hover:bg-green-500/30"
                          >
                            ✓ Following
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedMaster(master); setShowFollowModal(true) }}
                            className="w-full bg-accent-green text-black py-2 rounded-lg font-medium hover:bg-accent-green/90"
                          >
                            Follow
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* My Subscriptions */}
          {activeTab === 'subscriptions' && (
            <div>
              {mySubscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">You're not following any masters yet</p>
                  <button onClick={() => setActiveTab('discover')} className="mt-4 text-accent-green hover:underline">
                    Discover Masters →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mySubscriptions.map(sub => (
                    <div key={sub._id} className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-5 border`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center">
                            <span className="text-accent-green font-bold">{sub.masterId?.displayName?.charAt(0)}</span>
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{sub.masterId?.displayName}</h3>
                            <p className="text-gray-500 text-sm">
                              {sub.copyMode === 'FIXED_LOT' && `Fixed: ${sub.copyValue} lots`}
                              {sub.copyMode === 'BALANCE_BASED' && 'Balance Based'}
                              {sub.copyMode === 'EQUITY_BASED' && 'Equity Based'}
                              {sub.copyMode === 'MULTIPLIER' && `Multiplier: ${sub.copyValue}x`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            sub.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 
                            sub.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {sub.status}
                          </span>
                          <button
                            onClick={() => handleEditSubscription(sub)}
                            className="p-2 bg-dark-700 rounded-lg hover:bg-blue-500/20"
                            title="Edit Settings"
                          >
                            <Star size={16} className="text-blue-500" />
                          </button>
                          <button
                            onClick={() => handlePauseResume(sub._id, sub.status)}
                            className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600"
                            title={sub.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                          >
                            {sub.status === 'ACTIVE' ? <Pause size={16} className="text-yellow-500" /> : <Play size={16} className="text-green-500" />}
                          </button>
                          <button
                            onClick={() => handleUnfollow(sub._id)}
                            className="p-2 bg-dark-700 rounded-lg hover:bg-red-500/20"
                            title="Unfollow"
                          >
                            <X size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div>
                          <p className="text-gray-500 text-xs">Total Trades</p>
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{sub.stats?.totalCopiedTrades || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Open / Closed</p>
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="text-blue-400">{sub.stats?.openTrades || 0}</span>
                            {' / '}
                            <span className="text-gray-400">{sub.stats?.closedTrades || 0}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Total Profit</p>
                          <p className="text-green-500 font-semibold">+${(sub.stats?.totalProfit || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Total Loss</p>
                          <p className="text-red-500 font-semibold">-${(sub.stats?.totalLoss || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Net P&L</p>
                          <p className={`font-semibold ${(sub.stats?.netPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(sub.stats?.netPnl || 0) >= 0 ? '+' : ''}${(sub.stats?.netPnl || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Copy Trades History */}
          {activeTab === 'trades' && (
            <div>
              {myCopyTrades.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No copy trades yet</p>
                </div>
              ) : (
                <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl border overflow-hidden`}>
                  <table className="w-full">
                    <thead className={isDarkMode ? 'bg-dark-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Master</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Symbol</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Side</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lots</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Open Price</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Close Price</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>P/L</th>
                        <th className={`text-left text-xs font-medium px-4 py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myCopyTrades.map(trade => (
                        <tr key={trade._id} className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                          <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{trade.masterId?.displayName || '-'}</td>
                          <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{trade.symbol}</td>
                          <td className={`px-4 py-3 text-sm ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{trade.side}</td>
                          <td className="px-4 py-3 text-white text-sm">{trade.followerLotSize}</td>
                          <td className="px-4 py-3 text-white text-sm">{trade.followerOpenPrice?.toFixed(5)}</td>
                          <td className="px-4 py-3 text-white text-sm">{trade.followerClosePrice?.toFixed(5) || '-'}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${trade.followerPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${trade.followerPnl?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.status === 'OPEN' ? 'bg-blue-500/20 text-blue-500' :
                              trade.status === 'CLOSED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                              {trade.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* My Followers (for Master Traders) */}
          {activeTab === 'my-followers' && myMasterProfiles.some(p => p.status === 'ACTIVE') && (
            <div>
              {myFollowers.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No followers yet</p>
                  <p className="text-gray-600 text-sm mt-2">Share your profile to attract followers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myFollowers.map(follower => (
                    <div key={follower._id} className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-5 border`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-blue-500 font-bold">{follower.followerId?.firstName?.charAt(0) || 'U'}</span>
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{follower.followerId?.firstName} {follower.followerId?.lastName}</h3>
                            <p className="text-gray-500 text-sm">{follower.followerId?.email}</p>
                            <p className="text-gray-600 text-xs mt-1">
                              {follower.copyMode === 'FIXED_LOT' && `Fixed: ${follower.copyValue} lots`}
                              {follower.copyMode === 'BALANCE_BASED' && 'Balance Based'}
                              {follower.copyMode === 'EQUITY_BASED' && 'Equity Based'}
                              {follower.copyMode === 'MULTIPLIER' && `Multiplier: ${follower.copyValue}x`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            follower.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 
                            follower.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {follower.status}
                          </span>
                          <p className="text-gray-500 text-xs mt-2">Account: {follower.followerAccountId?.accountId}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                        <div>
                          <p className="text-gray-500 text-xs">Copied Trades</p>
                          <p className="text-white font-semibold">{follower.stats?.totalCopiedTrades || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Their Profit</p>
                          <p className="text-accent-green font-semibold">${follower.stats?.totalProfit?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Their Loss</p>
                          <p className="text-red-500 font-semibold">${follower.stats?.totalLoss?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Commission Earned</p>
                          <p className="text-purple-400 font-semibold">${follower.stats?.totalCommissionPaid?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Follow Modal */}
      {showFollowModal && selectedMaster && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Follow {selectedMaster.displayName}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Trading Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.accountId} - ${acc.balance?.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Copy Mode</label>
                <select
                  value={copyMode}
                  onChange={(e) => {
                    setCopyMode(e.target.value)
                    // Set appropriate default value based on mode
                    if (e.target.value === 'FIXED_LOT') setCopyValue('0.01')
                    else if (e.target.value === 'MULTIPLIER') setCopyValue('1')
                    else setCopyValue('10') // Max lot size for balance/equity based
                  }}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="FIXED_LOT">Fixed Lot Size</option>
                  <option value="BALANCE_BASED">Balance Based (Proportional)</option>
                  <option value="EQUITY_BASED">Equity Based (Proportional)</option>
                  <option value="MULTIPLIER">Multiplier</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">
                  {copyMode === 'FIXED_LOT' && 'Use a fixed lot size for every copied trade'}
                  {copyMode === 'BALANCE_BASED' && 'Lot = Master Lot × (Your Balance / Master Balance)'}
                  {copyMode === 'EQUITY_BASED' && 'Lot = Master Lot × (Your Equity / Master Equity)'}
                  {copyMode === 'MULTIPLIER' && 'Lot = Master Lot × Your Multiplier'}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  {copyMode === 'FIXED_LOT' ? 'Lot Size' : 
                   copyMode === 'MULTIPLIER' ? 'Multiplier Value' : 'Max Lot Size'}
                </label>
                <input
                  type="number"
                  value={copyValue}
                  onChange={(e) => setCopyValue(e.target.value)}
                  min={copyMode === 'MULTIPLIER' ? '0.1' : '0.01'}
                  step={copyMode === 'MULTIPLIER' ? '0.1' : '0.01'}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {copyMode === 'FIXED_LOT' && 'Each copied trade will use this fixed lot size'}
                  {copyMode === 'BALANCE_BASED' && 'Maximum lot size limit (e.g., Master $1000 trades 1 lot, you have $500 → you get 0.5 lot)'}
                  {copyMode === 'EQUITY_BASED' && 'Maximum lot size limit (e.g., Master $1000 equity trades 1 lot, you have $1500 → you get 1.5 lot)'}
                  {copyMode === 'MULTIPLIER' && 'Multiply master lot by this value (e.g., 2 = double the lot size)'}
                </p>
              </div>

              <div className="bg-dark-700 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Commission: <span className="text-white">{selectedMaster.approvedCommissionPercentage}%</span> of daily profit</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFollowModal(false)}
                className="flex-1 bg-dark-700 text-white py-2 rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleFollow}
                className="flex-1 bg-accent-green text-black py-2 rounded-lg font-medium hover:bg-accent-green/90"
              >
                Start Following
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Application Modal */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Crown size={20} className="text-yellow-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Become a Master Trader</h2>
                <p className="text-gray-500 text-sm">Share your trades with followers</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Display Name *</label>
                <input
                  type="text"
                  value={masterForm.displayName}
                  onChange={(e) => setMasterForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your trading name"
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Description</label>
                <textarea
                  value={masterForm.description}
                  onChange={(e) => setMasterForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell followers about your trading strategy..."
                  rows={3}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Trading Account *</label>
                <select
                  value={masterForm.tradingAccountId || (accounts.length > 0 ? accounts[0]._id : '')}
                  onChange={(e) => setMasterForm(prev => ({ ...prev, tradingAccountId: e.target.value }))}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.length === 0 && <option value="">No accounts available</option>}
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.accountId} - ${acc.balance?.toFixed(2)}</option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1">Trades from this account will be copied to followers</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Requested Commission (%) <span className="text-yellow-500">Max {commissionSettings.maxCommissionPercentage}%</span></label>
                <input
                  type="number"
                  value={masterForm.requestedCommissionPercentage}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value > commissionSettings.maxCommissionPercentage) {
                      setMasterForm(prev => ({ ...prev, requestedCommissionPercentage: commissionSettings.maxCommissionPercentage }))
                    } else if (value < 0) {
                      setMasterForm(prev => ({ ...prev, requestedCommissionPercentage: 0 }))
                    } else {
                      setMasterForm(prev => ({ ...prev, requestedCommissionPercentage: value }))
                    }
                  }}
                  min={commissionSettings.minCommissionPercentage}
                  max={commissionSettings.maxCommissionPercentage}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Commission you'll earn from followers' profits ({commissionSettings.minCommissionPercentage}-{commissionSettings.maxCommissionPercentage}%)</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Commission Payment Frequency *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMasterForm(prev => ({ ...prev, commissionPaymentFrequency: 'daily' }))}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${
                      masterForm.commissionPaymentFrequency === 'daily'
                        ? 'bg-yellow-500 text-black border-yellow-500 font-medium'
                        : 'bg-dark-700 text-gray-400 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setMasterForm(prev => ({ ...prev, commissionPaymentFrequency: 'weekly' }))}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${
                      masterForm.commissionPaymentFrequency === 'weekly'
                        ? 'bg-yellow-500 text-black border-yellow-500 font-medium'
                        : 'bg-dark-700 text-gray-400 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">How often you want to receive commission payments</p>
              </div>

              <div className="bg-dark-700 rounded-lg p-4 space-y-2">
                <p className="text-white text-sm font-medium">Requirements:</p>
                <ul className="text-gray-400 text-xs space-y-1">
                  <li>• Minimum account balance may be required</li>
                  <li>• Trading history will be reviewed</li>
                  <li>• Admin approval is required</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMasterModal(false)}
                className="flex-1 bg-dark-700 text-white py-2 rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMaster}
                disabled={applyingMaster}
                className="flex-1 bg-yellow-500 text-black py-2 rounded-lg font-medium hover:bg-yellow-400 disabled:opacity-50"
              >
                {applyingMaster ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Master Account Modal */}
      {showMultipleMasterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Users size={20} className="text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Create Multiple Strategies</h2>
                  <p className="text-gray-500 text-sm">Add up to {5 - myMasterProfiles.length} strategies at once</p>
                </div>
              </div>
              <button onClick={() => setShowMultipleMasterModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {multipleMasterForms.map((form, index) => (
                <div key={index} className="bg-dark-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Strategy {index + 1}</h3>
                    {multipleMasterForms.length > 1 && (
                      <button 
                        onClick={() => removeStrategyForm(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Display Name *</label>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={(e) => updateStrategyForm(index, 'displayName', e.target.value)}
                        placeholder="Strategy name"
                        className="w-full bg-dark-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Trading Account *</label>
                      <select
                        value={form.tradingAccountId || (accounts.length > 0 ? accounts[0]._id : '')}
                        onChange={(e) => updateStrategyForm(index, 'tradingAccountId', e.target.value)}
                        className="w-full bg-dark-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        {accounts.length === 0 && <option value="">No accounts</option>}
                        {accounts.map(acc => (
                          <option key={acc._id} value={acc._id}>{acc.accountId} - ${acc.balance?.toFixed(2)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Commission % (Max {commissionSettings.maxCommissionPercentage}%)</label>
                      <input
                        type="number"
                        value={form.requestedCommissionPercentage}
                        onChange={(e) => {
                          const value = Math.min(Math.max(0, parseFloat(e.target.value) || 0), commissionSettings.maxCommissionPercentage)
                          updateStrategyForm(index, 'requestedCommissionPercentage', value)
                        }}
                        min={commissionSettings.minCommissionPercentage}
                        max={commissionSettings.maxCommissionPercentage}
                        className="w-full bg-dark-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Description</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => updateStrategyForm(index, 'description', e.target.value)}
                        placeholder="Brief description"
                        className="w-full bg-dark-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {myMasterProfiles.length + multipleMasterForms.length < 5 && (
                <button
                  onClick={addStrategyForm}
                  className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
                >
                  + Add Another Strategy
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMultipleMasterModal(false)
                  setMultipleMasterForms([{ displayName: '', description: '', tradingAccountId: '', requestedCommissionPercentage: 10 }])
                }}
                className="flex-1 bg-dark-700 text-white py-2 rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMultipleMasters}
                disabled={applyingMaster}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2 rounded-lg font-medium hover:from-purple-400 hover:to-blue-400 disabled:opacity-50"
              >
                {applyingMaster ? 'Creating...' : `Create ${multipleMasterForms.length} ${multipleMasterForms.length === 1 ? 'Strategy' : 'Strategies'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && editingSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Subscription</h2>
            <p className="text-gray-400 text-sm mb-4">Following: {editingSubscription.masterId?.displayName}</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Trading Account</label>
                <select
                  value={editAccount}
                  onChange={(e) => setEditAccount(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.accountId} - ${acc.balance?.toFixed(2)}</option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1">Change the account where trades will be copied</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Copy Mode</label>
                <select
                  value={editCopyMode}
                  onChange={(e) => {
                    setEditCopyMode(e.target.value)
                    if (e.target.value === 'FIXED_LOT') setEditCopyValue('0.01')
                    else if (e.target.value === 'MULTIPLIER') setEditCopyValue('1')
                    else setEditCopyValue('10')
                  }}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="FIXED_LOT">Fixed Lot Size</option>
                  <option value="BALANCE_BASED">Balance Based (Proportional)</option>
                  <option value="EQUITY_BASED">Equity Based (Proportional)</option>
                  <option value="MULTIPLIER">Multiplier</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">
                  {editCopyMode === 'FIXED_LOT' && 'Use a fixed lot size for every copied trade'}
                  {editCopyMode === 'BALANCE_BASED' && 'Lot = Master Lot × (Your Balance / Master Balance)'}
                  {editCopyMode === 'EQUITY_BASED' && 'Lot = Master Lot × (Your Equity / Master Equity)'}
                  {editCopyMode === 'MULTIPLIER' && 'Lot = Master Lot × Your Multiplier'}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">
                  {editCopyMode === 'FIXED_LOT' ? 'Lot Size' : 
                   editCopyMode === 'MULTIPLIER' ? 'Multiplier Value' : 'Max Lot Size'}
                </label>
                <input
                  type="number"
                  value={editCopyValue}
                  onChange={(e) => setEditCopyValue(e.target.value)}
                  min={editCopyMode === 'MULTIPLIER' ? '0.1' : '0.01'}
                  step={editCopyMode === 'MULTIPLIER' ? '0.1' : '0.01'}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {editCopyMode === 'FIXED_LOT' && 'Each copied trade will use this fixed lot size'}
                  {editCopyMode === 'BALANCE_BASED' && 'Maximum lot size limit for proportional calculation'}
                  {editCopyMode === 'EQUITY_BASED' && 'Maximum lot size limit for proportional calculation'}
                  {editCopyMode === 'MULTIPLIER' && 'Multiply master lot by this value'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowEditModal(false); setEditingSubscription(null); }}
                className="flex-1 bg-dark-700 text-white py-2 rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubscription}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CopyTradePage
