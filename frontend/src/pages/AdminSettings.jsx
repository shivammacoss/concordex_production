import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Settings,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { adminFetch } from '../config/api'

const AdminSettings = () => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [credentials, setCredentials] = useState({
    currentPassword: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchAdminProfile()
  }, [])

  const fetchAdminProfile = async () => {
    try {
      const res = await adminFetch('/admin-mgmt/me')
      const data = await res.json()
      if (data.success) {
        setAdmin(data.admin)
        setCredentials(prev => ({ ...prev, newEmail: data.admin.email }))
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error)
    }
    setLoading(false)
  }

  const handleUpdateCredentials = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (!credentials.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' })
      return
    }

    if (credentials.newPassword && credentials.newPassword !== credentials.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (credentials.newPassword && credentials.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }

    setSaving(true)
    try {
      const res = await adminFetch('/admin-mgmt/me/credentials', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: credentials.currentPassword,
          newEmail: credentials.newEmail !== admin.email ? credentials.newEmail : undefined,
          newPassword: credentials.newPassword || undefined
        })
      })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Credentials updated successfully!' })
        setCredentials(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
        if (data.admin?.email) {
          setAdmin(prev => ({ ...prev, email: data.admin.email }))
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update credentials' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating credentials' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <AdminLayout title="Admin Settings" subtitle="Manage your account settings">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Admin Settings" subtitle="Manage your account settings">
      <div className="max-w-2xl">
        {/* Profile Info */}
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center">
              <User size={32} className="text-accent-green" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">
                {admin?.firstName} {admin?.lastName}
              </h2>
              <p className="text-gray-400">{admin?.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                admin?.role === 'SUPER_ADMIN' 
                  ? 'bg-purple-500/20 text-purple-500' 
                  : 'bg-blue-500/20 text-blue-500'
              }`}>
                {admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Credentials */}
        <div className="bg-dark-800 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Lock size={20} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Change Credentials</h3>
              <p className="text-gray-500 text-sm">Update your email or password</p>
            </div>
          </div>

          {message.text && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              message.type === 'error' 
                ? 'bg-red-500/20 text-red-500' 
                : 'bg-green-500/20 text-green-500'
            }`}>
              {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Current Password *</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={credentials.currentPassword}
                  onChange={(e) => setCredentials({ ...credentials, currentPassword: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Email */}
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={credentials.newEmail}
                  onChange={(e) => setCredentials({ ...credentials, newEmail: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  placeholder="Enter new email"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-gray-400 text-sm mb-1 block">New Password (leave blank to keep current)</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={credentials.newPassword}
                  onChange={(e) => setCredentials({ ...credentials, newPassword: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            {credentials.newPassword && (
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Confirm New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={credentials.confirmPassword}
                    onChange={(e) => setCredentials({ ...credentials, confirmPassword: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent-green text-black rounded-lg font-medium hover:bg-accent-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings
