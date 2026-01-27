// API Configuration - Use environment variable for production
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const API_URL = `${API_BASE_URL}/api`

// Helper function for authenticated admin API requests
export const adminFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('adminToken')
  
  // Debug: log token status
  if (!token) {
    console.warn('adminFetch: No adminToken found in localStorage')
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })
  
  // Auto-redirect to login if unauthorized
  if (response.status === 401) {
    console.warn('adminFetch: 401 Unauthorized - redirecting to login')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    window.location.href = '/admin'
  }
  
  return response
}
