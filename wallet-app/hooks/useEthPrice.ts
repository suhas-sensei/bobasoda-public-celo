"use client"

import { useEffect, useState } from 'react'

// Pyth Network Hermes API - provides real-time prices
const PYTH_HERMES_API = 'https://hermes.pyth.network/v2/updates/price/latest'
const ETH_USD_PRICE_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'

export function useEthPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let fetchCount = 0

    const fetchPrice = async () => {
      fetchCount++
      const fetchTime = new Date().toLocaleTimeString()

      console.log(`\n[${fetchTime}] 🔄 Fetching ETH price from Pyth Hermes (attempt #${fetchCount})...`)

      try {
        const response = await fetch(`${PYTH_HERMES_API}?ids[]=${ETH_USD_PRICE_ID}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!data.parsed || data.parsed.length === 0) {
          throw new Error('No price data received')
        }

        const priceData = data.parsed[0].price

        console.log('=== PYTH HERMES ETH/USD PRICE ===')
        console.log('Fetch Time:', fetchTime)
        console.log('Price:', priceData.price)
        console.log('Exponent:', priceData.expo)
        console.log('Confidence:', priceData.conf)

        const publishDate = new Date(priceData.publish_time * 1000)
        const secondsAgo = Math.floor((Date.now() - publishDate.getTime()) / 1000)
        console.log('Publish Time:', publishDate.toLocaleString())
        console.log(`⏰ Price age: ${secondsAgo} seconds old`)

        // Calculate actual price: price * 10^expo
        const formattedPrice = parseFloat(priceData.price) * Math.pow(10, priceData.expo)

        console.log(`💰 Final ETH Price: $${formattedPrice.toFixed(4)}`)
        console.log('=================================\n')

        setPrice(formattedPrice)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error(`❌ [${fetchTime}] Error fetching ETH price:`, err)
        setError('Failed to fetch price')
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchPrice()

    // Update every 2 seconds for real-time updates
    console.log('⚙️ Starting ETH price polling from Pyth Hermes (every 2 seconds)...')
    const interval = setInterval(fetchPrice, 2000)

    return () => {
      console.log('⚙️ Stopping ETH price polling...')
      clearInterval(interval)
    }
  }, [])

  return { price, isLoading, error }
}
