import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

async function dropIndex() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    try {
      await mongoose.connection.collection('mastertraders').dropIndex('userId_1')
      console.log('Successfully dropped userId_1 index from mastertraders collection')
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Index userId_1 does not exist (already dropped or never created)')
      } else {
        console.error('Error dropping index:', err.message)
      }
    }

    // List remaining indexes
    const indexes = await mongoose.connection.collection('mastertraders').indexes()
    console.log('\nRemaining indexes on mastertraders:')
    indexes.forEach(idx => console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`))

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

dropIndex()
