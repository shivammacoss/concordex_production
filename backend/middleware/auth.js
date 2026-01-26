import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'
import User from '../models/User.js'

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key'

// Middleware to verify JWT token for regular users
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, getJwtSecret())
    
    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    if (user.isBanned || user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked or banned' })
    }

    req.user = user
    req.userId = user._id
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// Middleware to verify JWT token for admin users
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, getJwtSecret())
    
    // Check if this is an admin token (has adminId field)
    if (!decoded.adminId) {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const admin = await Admin.findById(decoded.adminId).select('-password')
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' })
    }

    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Admin account is suspended' })
    }

    req.admin = admin
    req.adminId = admin._id
    req.adminRole = admin.role
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// Middleware to verify super admin access
export const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, getJwtSecret())
    
    if (!decoded.adminId) {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const admin = await Admin.findById(decoded.adminId).select('-password')
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' })
    }

    if (admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Super admin access required' })
    }

    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Admin account is suspended' })
    }

    req.admin = admin
    req.adminId = admin._id
    req.adminRole = admin.role
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// Middleware to check specific admin permissions
export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin not authenticated' })
    }

    // Super admin has all permissions
    if (req.admin.role === 'SUPER_ADMIN') {
      return next()
    }

    // Check specific permission
    if (!req.admin.permissions || !req.admin.permissions[permission]) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission denied: ${permission} required` 
      })
    }

    next()
  }
}

// Middleware to validate TradingView webhook secret
export const validateWebhookSecret = (req, res, next) => {
  const webhookSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    console.error('TRADINGVIEW_WEBHOOK_SECRET not configured')
    return res.status(500).json({ success: false, message: 'Webhook not configured' })
  }

  const { secret } = req.body
  
  if (!secret || secret !== webhookSecret) {
    console.warn('Invalid webhook secret received from:', req.ip)
    return res.status(401).json({ success: false, message: 'Invalid webhook secret' })
  }

  next()
}

export default {
  authenticateUser,
  authenticateAdmin,
  authenticateSuperAdmin,
  checkPermission,
  validateWebhookSecret
}
