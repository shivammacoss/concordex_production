// MetaAPI Service - DEPRECATED
// NOTE: All MetaAPI credentials are now stored securely in the BACKEND
// Price data is streamed via Socket.IO from the backend (see priceStream.js)
// This file is kept for backward compatibility but should use priceStream.js instead
import { API_URL } from '../config/api'

console.log('MetaAPI service initialized - using backend proxy for all price data')

class MetaApiService {
  constructor() {
    this.subscribers = new Map()
    this.prices = new Map()
    this.symbols = []
  }

  // Fetch symbols via backend proxy
  async getSymbols() {
    try {
      const response = await fetch(`${API_URL}/prices/symbols`)
      if (!response.ok) throw new Error('Failed to fetch symbols')
      const data = await response.json()
      this.symbols = data.symbols || []
      return this.symbols
    } catch (error) {
      console.error('Error fetching symbols:', error)
      return []
    }
  }

  // Fetch symbol specification via backend proxy
  async getSymbolSpecification(symbol) {
    try {
      const response = await fetch(`${API_URL}/prices/specification/${symbol}`)
      if (!response.ok) throw new Error('Failed to fetch symbol specification')
      const data = await response.json()
      return data.specification || null
    } catch (error) {
      console.error('Error fetching symbol specification:', error)
      return null
    }
  }

  // Fetch single symbol price via backend proxy
  async getSymbolPrice(symbol) {
    try {
      const response = await fetch(`${API_URL}/prices/${symbol}`)
      if (!response.ok) throw new Error('Failed to fetch symbol price')
      const data = await response.json()
      if (data.success && data.price) {
        this.prices.set(symbol, data.price)
        return data.price
      }
      return null
    } catch (error) {
      console.error('Error fetching symbol price:', error)
      return null
    }
  }

  // Fetch all prices via backend proxy
  async getAllPrices(symbolList) {
    try {
      const response = await fetch(`${API_URL}/prices/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolList })
      })
      
      if (!response.ok) throw new Error('Failed to fetch prices')
      const data = await response.json()
      
      if (data.success && data.prices) {
        Object.entries(data.prices).forEach(([symbol, price]) => {
          this.prices.set(symbol, price)
        })
        return data.prices
      }
      return {}
    } catch (error) {
      console.error('Error fetching all prices:', error)
      return {}
    }
  }

  // DEPRECATED: Direct WebSocket connection is no longer supported
  // Use priceStream.js service instead which connects to backend Socket.IO
  connect(symbolsToSubscribe = []) {
    console.warn('Direct MetaAPI WebSocket connection is deprecated. Use priceStream.js instead.')
  }

  subscribe(symbol, callback) {
    this.subscribers.set(symbol, callback)
    console.warn('Direct subscription is deprecated. Use priceStream.js instead.')
  }

  unsubscribe(symbol) {
    this.subscribers.delete(symbol)
  }

  disconnect() {
    this.subscribers.clear()
  }

  getPrice(symbol) {
    return this.prices.get(symbol)
  }
}

// Singleton instance
const metaApiService = new MetaApiService()

export default metaApiService
