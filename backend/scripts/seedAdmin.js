import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import Admin from '../models/Admin.js'
import AdminWallet from '../models/AdminWallet.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' })
    if (existingSuperAdmin) {
      console.log('Super admin already exists:')
      console.log(`  Email: ${existingSuperAdmin.email}`)
      console.log('  Skipping seed...')
      process.exit(0)
    }

    // Default admin credentials
    const adminData = {
      email: 'admin@concorddex.com',
      password: '3',
      firstName: 'Super',
      lastName: 'Admin'
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 10)

    const superAdmin = new Admin({
      email: adminData.email.toLowerCase(),
      password: hashedPassword,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: 'SUPER_ADMIN',
      urlSlug: 'super-admin',
      brandName: 'Super Admin',
      status: 'ACTIVE',
      permissions: {
        canManageUsers: true,
        canCreateUsers: true,
        canDeleteUsers: true,
        canViewUsers: true,
        canManageTrades: true,
        canCloseTrades: true,
        canModifyTrades: true,
        canManageAccounts: true,
        canCreateAccounts: true,
        canDeleteAccounts: true,
        canModifyLeverage: true,
        canManageDeposits: true,
        canApproveDeposits: true,
        canManageWithdrawals: true,
        canApproveWithdrawals: true,
        canManageKYC: true,
        canApproveKYC: true,
        canManageIB: true,
        canApproveIB: true,
        canManageCopyTrading: true,
        canApproveMasters: true,
        canManageSymbols: true,
        canManageGroups: true,
        canManageSettings: true,
        canManageTheme: true,
        canViewReports: true,
        canExportReports: true,
        canManageAdmins: true,
        canFundAdmins: true
      }
    })

    await superAdmin.save()

    // Create wallet for super admin
    const wallet = new AdminWallet({
      adminId: superAdmin._id,
      balance: 999999999
    })
    await wallet.save()

    console.log(' Super admin created successfully!')
    console.log('================================')
    console.log(`  Email: ${adminData.email}`)
    console.log(`  Password: ${adminData.password}`)
    console.log('================================')
    console.log('You can now login with these credentials.')

    process.exit(0)
  } catch (error) {
    console.error(' Error seeding admin:', error.message)
    process.exit(1)
  }
}

seedAdmin()
