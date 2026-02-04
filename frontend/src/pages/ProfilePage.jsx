import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import concorddexLogo from '../assets/concorddex.png'
import { 
  LayoutDashboard, User, Wallet, Users, Copy, UserCircle, HelpCircle, FileText, LogOut,
  Mail, Phone, MapPin, Calendar, Shield, Edit2, Save, X, Camera, Building2, Smartphone, CreditCard, Trophy,
  ArrowLeft, Home, Upload, CheckCircle, Clock, XCircle, FileCheck, Sun, Moon, Bitcoin
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { API_URL } from '../config/api'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [challengeModeEnabled, setChallengeModeEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // KYC State
  const [kycStatus, setKycStatus] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)
  const [showKycForm, setShowKycForm] = useState(false)
  const [kycForm, setKycForm] = useState({
    documentType: 'aadhaar',
    documentNumber: '',
    frontImage: '',
    backImage: '',
    selfieImage: ''
  })

  // Crypto Wallet State
  const [userCryptoWallets, setUserCryptoWallets] = useState([])
  const [showCryptoForm, setShowCryptoForm] = useState(false)
  const [cryptoFormType, setCryptoFormType] = useState('crypto') // 'crypto' or 'local'
  const [cryptoForm, setCryptoForm] = useState({
    network: 'TRC20',
    walletAddress: '',
    localAddress: ''
  })
  const [cryptoLoading, setCryptoLoading] = useState(false)

  // Bank Account State
  const [userBankAccounts, setUserBankAccounts] = useState([])
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankFormType, setBankFormType] = useState('bank') // 'bank' or 'upi'
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    upiId: ''
  })
  const [bankLoading, setBankLoading] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchChallengeStatus()
    fetchKycStatus()
    fetchUserCryptoWallets()
    fetchUserBankAccounts()
  }, [])

  // Fetch user's crypto wallets
  const fetchUserCryptoWallets = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-crypto/${storedUser._id}`)
      const data = await res.json()
      setUserCryptoWallets(data.wallets || [])
    } catch (error) {
      console.error('Error fetching crypto wallets:', error)
    }
  }

  // Submit crypto wallet for approval
  const handleCryptoSubmit = async () => {
    if (cryptoFormType === 'crypto') {
      if (!cryptoForm.walletAddress) {
        alert('Please enter wallet address')
        return
      }
    } else {
      if (!cryptoForm.localAddress) {
        alert('Please enter address')
        return
      }
    }

    setCryptoLoading(true)
    try {
      let res, data
      
      if (cryptoFormType === 'crypto') {
        // Crypto wallet goes to crypto requests in admin
        const payload = {
          userId: storedUser._id,
          type: cryptoFormType,
          network: cryptoForm.network,
          walletAddress: cryptoForm.walletAddress
        }
        
        res = await fetch(`${API_URL}/payment-methods/user-crypto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        data = await res.json()
        
        if (data.success) {
          alert('Crypto wallet submitted for approval!')
          fetchUserCryptoWallets()
        }
      } else {
        // Local withdrawal goes to bank requests in admin
        const payload = {
          userId: storedUser._id,
          type: 'Local Withdrawal',
          localAddress: cryptoForm.localAddress
        }
        
        res = await fetch(`${API_URL}/payment-methods/user-banks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        data = await res.json()
        
        if (data.success) {
          alert('Local withdrawal address submitted for approval!')
          fetchUserBankAccounts()
        }
      }
      
      if (data.success) {
        setShowCryptoForm(false)
        setCryptoFormType('crypto')
        setCryptoForm({
          network: 'TRC20',
          walletAddress: '',
          localAddress: ''
        })
      } else {
        alert(data.message || 'Failed to submit')
      }
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Failed to submit')
    }
    setCryptoLoading(false)
  }

  // Delete crypto wallet
  const handleDeleteCryptoWallet = async (id) => {
    if (!confirm('Are you sure you want to delete this crypto wallet?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-crypto/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchUserCryptoWallets()
      }
    } catch (error) {
      console.error('Error deleting crypto wallet:', error)
    }
  }

  // Fetch user's bank accounts
  const fetchUserBankAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${storedUser._id}`)
      const data = await res.json()
      setUserBankAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    }
  }

  // Submit bank account for approval
  const handleBankSubmit = async () => {
    if (bankFormType === 'bank') {
      if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName || !bankForm.ifscCode) {
        alert('Please fill all required bank details')
        return
      }
    } else {
      if (!bankForm.upiId) {
        alert('Please enter UPI ID')
        return
      }
    }

    setBankLoading(true)
    try {
      const payload = {
        userId: storedUser._id,
        type: bankFormType === 'bank' ? 'Bank Transfer' : 'UPI',
        ...(bankFormType === 'bank' 
          ? { 
              bankName: bankForm.bankName, 
              accountNumber: bankForm.accountNumber, 
              accountHolderName: bankForm.accountHolderName, 
              ifscCode: bankForm.ifscCode,
              branchName: bankForm.branchName
            }
          : { upiId: bankForm.upiId }
        )
      }
      
      const res = await fetch(`${API_URL}/payment-methods/user-banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        alert(bankFormType === 'bank' ? 'Bank account submitted for approval!' : 'UPI ID submitted for approval!')
        setShowBankForm(false)
        setBankFormType('bank')
        setBankForm({
          bankName: '',
          accountNumber: '',
          accountHolderName: '',
          ifscCode: '',
          branchName: '',
          upiId: ''
        })
        fetchUserBankAccounts()
      } else {
        alert(data.message || 'Failed to submit')
      }
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Failed to submit')
    }
    setBankLoading(false)
  }

  // Delete bank account
  const handleDeleteBankAccount = async (id) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return
    try {
      const res = await fetch(`${API_URL}/payment-methods/user-banks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchUserBankAccounts()
      }
    } catch (error) {
      console.error('Error deleting bank account:', error)
    }
  }
  
  // Fetch KYC status
  const fetchKycStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/kyc/status/${storedUser._id}`)
      const data = await res.json()
      if (data.success && data.hasKYC) {
        setKycStatus(data.kyc)
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error)
    }
  }
  
  // Handle file to base64 conversion
  const handleFileChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setKycForm(prev => ({ ...prev, [field]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Submit KYC
  const handleKycSubmit = async () => {
    if (!kycForm.documentNumber || !kycForm.frontImage) {
      alert('Please fill document number and upload front image')
      return
    }
    
    setKycLoading(true)
    try {
      const res = await fetch(`${API_URL}/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          ...kycForm
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('KYC submitted successfully! Please wait for approval.')
        setShowKycForm(false)
        fetchKycStatus()
      } else {
        alert(data.message || 'Failed to submit KYC')
      }
    } catch (error) {
      console.error('Error submitting KYC:', error)
      alert('Failed to submit KYC')
    }
    setKycLoading(false)
  }

  const fetchChallengeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) {
        setChallengeModeEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error fetching challenge status:', error)
    }
  }
  
  const [profile, setProfile] = useState({
    firstName: storedUser.firstName || '',
    lastName: storedUser.lastName || '',
    email: storedUser.email || '',
    phone: storedUser.phone || '',
    address: storedUser.address || '',
    city: storedUser.city || '',
    country: storedUser.country || '',
    dateOfBirth: storedUser.dateOfBirth || '',
    bankDetails: storedUser.bankDetails || {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: '',
      branchName: ''
    },
    upiId: storedUser.upiId || ''
  })

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

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser._id,
          ...profile
        })
      })
      const data = await res.json()
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        setEditing(false)
        alert('Profile updated successfully!')
      } else {
        alert(data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/user/login')
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDarkMode ? 'bg-dark-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-4 ${isDarkMode ? 'bg-dark-800 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => navigate('/mobile')} className={`p-2 -ml-2 rounded-lg ${isDarkMode ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
          <h1 className={`font-semibold text-lg flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile</h1>
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
                  item.name === 'Profile' ? 'bg-accent-green text-black' : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Profile</h1>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 bg-dark-700 text-white px-4 py-2 rounded-lg hover:bg-dark-600"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent-green text-black px-4 py-2 rounded-lg font-medium hover:bg-accent-green/90 disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </header>
        )}

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`${isMobile ? '' : 'max-w-3xl'}`}>
            {/* Profile Header */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border mb-4`}>
              <div className={`flex ${isMobile ? 'flex-col' : ''} items-center gap-4`}>
                <div className="relative">
                  <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-accent-green/20 rounded-full flex items-center justify-center`}>
                    <span className={`text-accent-green font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                      {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                    </span>
                  </div>
                  {editing && (
                    <button className="absolute bottom-0 right-0 w-6 h-6 bg-accent-green rounded-full flex items-center justify-center">
                      <Camera size={12} className="text-black" />
                    </button>
                  )}
                </div>
                <div className={isMobile ? 'text-center' : ''}>
                  <h2 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile.firstName} {profile.lastName}</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{profile.email}</p>
                  <div className={`flex ${isMobile ? 'justify-center flex-wrap' : ''} items-center gap-2 mt-2`}>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      kycStatus?.status === 'approved' 
                        ? 'bg-green-500/20 text-green-500' 
                        : kycStatus?.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : kycStatus?.status === 'rejected'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-gray-500/20 text-gray-500'
                    }`}>
                      {kycStatus?.status === 'approved' ? 'Verified' 
                        : kycStatus?.status === 'pending' ? 'Under Review'
                        : kycStatus?.status === 'rejected' ? 'Rejected'
                        : 'Not Submitted'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500">
                      Since {storedUser.createdAt ? new Date(storedUser.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl ${isMobile ? 'p-4' : 'p-6'} border`}>
              <h3 className={`font-semibold ${isMobile ? 'mb-4 text-sm' : 'mb-6'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Personal Information</h3>
              
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                <div>
                  <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.firstName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.lastName || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Mail size={14} /> Email
                  </label>
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.email}</p>
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Phone size={14} /> Phone
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>{profile.phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm mb-2 block flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar size={14} /> Date of Birth
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                      className={`w-full rounded-lg px-4 py-2 border ${isDarkMode ? 'bg-dark-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  ) : (
                    <p className="text-white">{profile.dateOfBirth || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <MapPin size={14} /> Country
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.country}
                      onChange={(e) => setProfile({...profile, country: e.target.value})}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  ) : (
                    <p className="text-white">{profile.country || '-'}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <MapPin size={14} /> Address
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  ) : (
                    <p className="text-white">{profile.address || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            {false && (
              <div className={`${isDarkMode ? 'bg-dark-800 border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-xl p-6 border mt-6`}>
                <h3 className={`font-semibold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Building2 size={18} /> Bank Details (For Withdrawals)
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Bank Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={profile.bankDetails?.bankName || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          bankDetails: {...profile.bankDetails, bankName: e.target.value}
                        })}
                        placeholder="e.g., HDFC Bank"
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      />
                    ) : (
                      <p className="text-white">{profile.bankDetails?.bankName || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Account Holder Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={profile.bankDetails?.accountHolderName || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          bankDetails: {...profile.bankDetails, accountHolderName: e.target.value}
                        })}
                        placeholder="Name as per bank account"
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      />
                    ) : (
                      <p className="text-white">{profile.bankDetails?.accountHolderName || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Account Number</label>
                    {editing ? (
                      <input
                        type="text"
                        value={profile.bankDetails?.accountNumber || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          bankDetails: {...profile.bankDetails, accountNumber: e.target.value}
                        })}
                        placeholder="Enter account number"
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      />
                    ) : (
                      <p className="text-white">{profile.bankDetails?.accountNumber || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">IFSC Code</label>
                    {editing ? (
                      <input
                        type="text"
                        value={profile.bankDetails?.ifscCode || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          bankDetails: {...profile.bankDetails, ifscCode: e.target.value.toUpperCase()}
                        })}
                        placeholder="e.g., HDFC0001234"
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white uppercase"
                      />
                    ) : (
                      <p className="text-white">{profile.bankDetails?.ifscCode || '-'}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-gray-400 text-sm mb-2 block">Branch Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={profile.bankDetails?.branchName || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          bankDetails: {...profile.bankDetails, branchName: e.target.value}
                        })}
                        placeholder="e.g., Mumbai Main Branch"
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      />
                    ) : (
                      <p className="text-white">{profile.bankDetails?.branchName || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* UPI Section */}
            {false && (
              <div className="bg-dark-800 rounded-xl p-6 border border-gray-800 mt-6">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Smartphone size={18} /> UPI Details
                </h3>
                
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">UPI ID</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.upiId || ''}
                      onChange={(e) => setProfile({...profile, upiId: e.target.value})}
                      placeholder="e.g., yourname@upi"
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  ) : (
                    <p className="text-white">{profile.upiId || '-'}</p>
                  )}
                </div>

                {!editing && (!profile.bankDetails?.accountNumber && !profile.upiId) && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-500 text-sm">
                      ⚠️ Please add your bank details or UPI ID to receive withdrawals. Click "Edit Profile" to add.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Crypto Wallet Section */}
            <div className="bg-dark-800 rounded-xl p-6 border border-gray-800 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Bitcoin size={18} /> Crypto Wallet
                </h3>
                <button
                  onClick={() => setShowCryptoForm(true)}
                  className="px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg text-sm hover:bg-green-500/30"
                >
                  + Add Wallet
                </button>
              </div>

              <p className="text-gray-500 text-sm mb-4">
                Add crypto wallet addresses for withdrawals. Wallets require admin approval before use.
              </p>

              {userCryptoWallets.length === 0 ? (
                <div className="p-4 bg-dark-700 rounded-lg text-center">
                  <p className="text-gray-500">No crypto wallets added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userCryptoWallets.map((wallet) => (
                    <div key={wallet._id} className="p-4 bg-dark-700 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {wallet.network === 'LOCAL' ? (
                            <MapPin size={20} className="text-blue-500" />
                          ) : (
                            <Bitcoin size={20} className="text-orange-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {wallet.network === 'LOCAL' ? 'Local Withdrawal' : wallet.network}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                wallet.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                wallet.status === 'Approved' ? 'bg-green-500/20 text-green-500' :
                                'bg-red-500/20 text-red-500'
                              }`}>
                                {wallet.status}
                              </span>
                            </div>
                            <p className={`text-gray-400 text-sm break-all ${wallet.network !== 'LOCAL' ? 'font-mono' : ''}`}>{wallet.walletAddress}</p>
                            {wallet.rejectionReason && (
                              <p className="text-red-400 text-xs mt-1">Reason: {wallet.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                        {wallet.status !== 'Approved' && (
                          <button
                            onClick={() => handleDeleteCryptoWallet(wallet._id)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Crypto Wallet Form Modal */}
            {showCryptoForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-dark-800 rounded-xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Add Wallet</h3>
                    <button onClick={() => { setShowCryptoForm(false); setCryptoFormType('crypto'); }} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCryptoFormType('crypto')}
                        className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                          cryptoFormType === 'crypto'
                            ? 'border-orange-500 bg-orange-500/20 text-orange-500'
                            : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        <Bitcoin size={18} /> Crypto
                      </button>
                      <button
                        onClick={() => setCryptoFormType('local')}
                        className={`p-3 rounded-lg border flex items-center justify-center gap-2 ${
                          cryptoFormType === 'local'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-500'
                            : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        <MapPin size={18} /> Local Withdrawal
                      </button>
                    </div>

                    {cryptoFormType === 'crypto' ? (
                      <>
                        {/* Network Selection */}
                        <div>
                          <label className="text-gray-400 text-sm block mb-2">Select Network *</label>
                          <select
                            value={cryptoForm.network}
                            onChange={(e) => setCryptoForm({...cryptoForm, network: e.target.value})}
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white"
                          >
                            <option value="TRC20">TRC20 (USDT)</option>
                            <option value="ERC20">ERC20 (USDT)</option>
                            <option value="BEP20">BEP20 (USDT)</option>
                            <option value="BTC">Bitcoin (BTC)</option>
                            <option value="ETH">Ethereum (ETH)</option>
                            <option value="LTC">Litecoin (LTC)</option>
                          </select>
                        </div>

                        {/* Wallet Address */}
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Wallet Address *</label>
                          <textarea
                            value={cryptoForm.walletAddress}
                            onChange={(e) => setCryptoForm({...cryptoForm, walletAddress: e.target.value})}
                            placeholder="Enter your crypto wallet address"
                            rows={3}
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none font-mono text-sm"
                          />
                        </div>

                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-yellow-500 text-xs">
                            ⚠️ Double-check the address before submitting. Crypto transactions cannot be reversed.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Local Address */}
                        <div>
                          <label className="text-gray-400 text-sm block mb-1">Address *</label>
                          <textarea
                            value={cryptoForm.localAddress}
                            onChange={(e) => setCryptoForm({...cryptoForm, localAddress: e.target.value})}
                            placeholder="Enter your full address for local withdrawal"
                            rows={4}
                            className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
                          />
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p className="text-blue-500 text-xs">
                            ℹ️ Local withdrawal allows you to receive funds at your physical address.
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowCryptoForm(false); setCryptoFormType('crypto'); }}
                        className="flex-1 py-2 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCryptoSubmit}
                        disabled={cryptoLoading}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {cryptoLoading ? 'Submitting...' : 'Submit for Approval'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KYC Verification Section */}
            <div className="bg-dark-800 rounded-xl p-6 border border-gray-800 mt-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FileCheck size={18} /> KYC Verification
              </h3>
              
              {/* KYC Status Display */}
              {kycStatus ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    kycStatus.status === 'approved' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : kycStatus.status === 'pending'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {kycStatus.status === 'approved' && <CheckCircle size={24} className="text-green-500" />}
                      {kycStatus.status === 'pending' && <Clock size={24} className="text-yellow-500" />}
                      {kycStatus.status === 'rejected' && <XCircle size={24} className="text-red-500" />}
                      <div>
                        <p className={`font-medium ${
                          kycStatus.status === 'approved' ? 'text-green-500' 
                            : kycStatus.status === 'pending' ? 'text-yellow-500' 
                            : 'text-red-500'
                        }`}>
                          {kycStatus.status === 'approved' && 'KYC Verified'}
                          {kycStatus.status === 'pending' && 'KYC Under Review'}
                          {kycStatus.status === 'rejected' && 'KYC Rejected'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Document: {kycStatus.documentType?.replace('_', ' ').toUpperCase()}
                        </p>
                        {kycStatus.status === 'rejected' && kycStatus.rejectionReason && (
                          <p className="text-red-400 text-sm mt-1">Reason: {kycStatus.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {kycStatus.status === 'rejected' && (
                    <button
                      onClick={() => {
                        setKycForm({ documentType: 'aadhaar', documentNumber: '', frontImage: '', backImage: '', selfieImage: '' })
                        setShowKycForm(true)
                      }}
                      className="w-full py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90"
                    >
                      Resubmit KYC
                    </button>
                  )}
                </div>
              ) : showKycForm ? (
                <div className="space-y-4">
                  {/* Document Type */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Document Type</label>
                    <select
                      value={kycForm.documentType}
                      onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="pan_card">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                      <option value="voter_id">Voter ID</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  
                  {/* Document Number */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Document Number</label>
                    <input
                      type="text"
                      value={kycForm.documentNumber}
                      onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })}
                      placeholder="Enter document number"
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  
                  {/* Front Image Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Front Side of Document *</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.frontImage ? (
                        <div className="relative">
                          <img src={kycForm.frontImage} alt="Front" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, frontImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload front side</p>
                          <p className="text-gray-500 text-xs">Max 5MB, JPG/PNG</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'frontImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Back Image Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Back Side of Document (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.backImage ? (
                        <div className="relative">
                          <img src={kycForm.backImage} alt="Back" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, backImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload back side</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'backImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Selfie Upload */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Selfie with Document (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-accent-green transition-colors">
                      {kycForm.selfieImage ? (
                        <div className="relative">
                          <img src={kycForm.selfieImage} alt="Selfie" className="max-h-32 mx-auto rounded" />
                          <button
                            onClick={() => setKycForm({ ...kycForm, selfieImage: '' })}
                            className="absolute top-0 right-0 p-1 bg-red-500 rounded-full"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Camera size={32} className="mx-auto text-gray-500 mb-2" />
                          <p className="text-gray-400 text-sm">Click to upload selfie</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'selfieImage')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowKycForm(false)}
                      className="flex-1 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleKycSubmit}
                      disabled={kycLoading}
                      className="flex-1 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90 disabled:opacity-50"
                    >
                      {kycLoading ? 'Submitting...' : 'Submit KYC'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCheck size={32} className="text-yellow-500" />
                  </div>
                  <p className="text-white font-medium mb-2">KYC Not Submitted</p>
                  <p className="text-gray-400 text-sm mb-4">Complete your KYC verification to unlock all features</p>
                  <button
                    onClick={() => setShowKycForm(true)}
                    className="px-6 py-3 bg-accent-green text-black font-medium rounded-lg hover:bg-accent-green/90"
                  >
                    Start KYC Verification
                  </button>
                </div>
              )}
            </div>

            {/* Security Section */}
            <div className="bg-dark-800 rounded-xl p-6 border border-gray-800 mt-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Shield size={18} /> Security
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="text-white">Password</p>
                    <p className="text-gray-500 text-sm">Last changed: Never</p>
                  </div>
                  <button className="text-accent-green hover:underline text-sm">Change Password</button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="text-white">Two-Factor Authentication</p>
                    <p className="text-gray-500 text-sm">Add an extra layer of security</p>
                  </div>
                  <button className="text-accent-green hover:underline text-sm">Enable</button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white">Login History</p>
                    <p className="text-gray-500 text-sm">View recent login activity</p>
                  </div>
                  <button className="text-accent-green hover:underline text-sm">View</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage
