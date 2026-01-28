import mongoose from 'mongoose'
import dotenv from 'dotenv'
import AccountType from '../models/AccountType.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/concorddex_trading'

const accountTypes = [
  {
    name: 'Cent',
    code: 'CENT',
    description: 'Cent account for beginners',
    minDeposit: 100,
    leverage: '1:100',
    exposureLimit: 100000,
    minSpread: 2,
    commission: 0,
    isActive: true,
    isDemo: false
  },
  {
    name: 'Standard',
    code: 'STANDARD',
    description: 'Standard trading account with 1:100 leverage',
    minDeposit: 0,
    leverage: '1:100',
    exposureLimit: 100000,
    minSpread: 2,
    commission: 0,
    isActive: true,
    isDemo: false
  },
  {
    name: 'Pro',
    code: 'PRO',
    description: 'Pro account for professional traders',
    minDeposit: 1000,
    leverage: '1:100',
    exposureLimit: 500000,
    minSpread: 2,
    commission: 10,
    isActive: true,
    isDemo: false
  },
  {
    name: 'Demo',
    code: 'DEMO',
    description: 'Practice account with virtual funds',
    minDeposit: 0,
    leverage: '1:100',
    exposureLimit: 100000,
    minSpread: 1.5,
    commission: 0,
    isActive: true,
    isDemo: true,
    demoBalance: 10000
  }
]

const seedAccountTypes = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    for (const typeData of accountTypes) {
      const existing = await AccountType.findOne({ name: typeData.name })
      if (existing) {
        console.log(`Account type "${typeData.name}" already exists, skipping...`)
        continue
      }

      const accountType = new AccountType(typeData)
      await accountType.save()
      console.log(`✅ Created account type: ${typeData.name}`)
    }

    console.log('\n================================')
    console.log('Account types seeding complete!')
    console.log('================================')

    const allTypes = await AccountType.find()
    console.log('\nAvailable account types:')
    allTypes.forEach(t => {
      console.log(`  - ${t.name} (${t.isDemo ? 'Demo' : 'Live'}) - Min Deposit: $${t.minDeposit}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding account types:', error.message)
    process.exit(1)
  }
}

seedAccountTypes()
