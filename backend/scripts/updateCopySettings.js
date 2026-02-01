import mongoose from 'mongoose'
import dotenv from 'dotenv'
import CopySettings from '../models/CopySettings.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

async function updateSettings() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const settings = await CopySettings.getSettings()
    console.log('Current maxCommissionPercentage:', settings.commissionSettings.maxCommissionPercentage)
    
    settings.commissionSettings.maxCommissionPercentage = 50
    await settings.save()
    
    console.log('Updated maxCommissionPercentage to:', settings.commissionSettings.maxCommissionPercentage)
    console.log('Settings updated successfully!')
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

updateSettings()
