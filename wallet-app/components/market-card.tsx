"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useEthPrice } from "@/hooks/useEthPrice"
import { useRoundConfig } from "@/hooks/useRoundConfig"
import EthPriceChart from "./eth-price-chart"

interface MarketCardProps {
  marketName: string
  onSwipeComplete: (direction: "up" | "down", marketName: string) => void
  hasSwipedThisRound: boolean
  onTimerReset: () => void
}

export default function MarketCard({ marketName, onSwipeComplete, hasSwipedThisRound, onTimerReset }: MarketCardProps) {
  // Only fetch ETH price for ETH market
  const { price: ethPrice, isLoading: isPriceLoading } = marketName === "ETH" ? useEthPrice() : { price: null, isLoading: false }
  // Fetch round configuration from contract
  const { intervalSeconds, bufferSeconds, bettingWindowSeconds } = useRoundConfig()
  const [selectedPeriod, setSelectedPeriod] = useState("1d")
  const [currentCardId, setCurrentCardId] = useState(1)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [isMagnetized, setIsMagnetized] = useState(false)
  const [timerProgress, setTimerProgress] = useState(0)
  const [lockPrice, setLockPrice] = useState<number | null>(null)
  const [hasLockedPrice, setHasLockedPrice] = useState(false)
  const dragStartX = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const timerStartRef = useRef<number>(Date.now())

  useEffect(() => {
    // Contract uses 2 × intervalSeconds for full round duration
    const ROUND_DURATION = ((intervalSeconds || 30) * 2) * 1000 // Convert to milliseconds

    // Log timing configuration when loaded
    if (intervalSeconds && bufferSeconds) {
      console.log('⏱️ Using on-chain round timing:')
      console.log(`   Full Round Duration: ${intervalSeconds * 2}s (2 × intervalSeconds)`)
      console.log(`   Betting Phase: 0-${intervalSeconds}s (open for bets)`)
      console.log(`   Lock Phase: ${intervalSeconds}-${intervalSeconds * 2}s (betting disabled, waiting for close price)`)
      console.log(`   Lock Price captured at: ${intervalSeconds}s`)
      console.log(`   Close Price captured at: ${intervalSeconds * 2}s`)
    }

    const updateTimer = () => {
      const elapsed = Date.now() - timerStartRef.current
      const progress = Math.min((elapsed / ROUND_DURATION) * 100, 100)
      setTimerProgress(progress)

      // Capture lock price at 50% (30s mark) - this is what determines winners
      if (progress >= 50 && !hasLockedPrice && marketName === "ETH" && ethPrice !== null) {
        setLockPrice(ethPrice)
        setHasLockedPrice(true)
        console.log(`🔒 Lock Price captured at 50%: $${ethPrice.toFixed(4)}`)
        console.log(`   Users are betting: Will close price be higher or lower than $${ethPrice.toFixed(4)}?`)
      }

      // Reset for next round at 100%
      if (progress >= 100) {
        console.log(`🏁 Round ended at 100%. Close Price: $${ethPrice?.toFixed(4) || 'N/A'}`)
        if (lockPrice !== null && ethPrice !== null) {
          const diff = ethPrice - lockPrice
          const winner = diff > 0 ? 'BULLS' : diff < 0 ? 'BEARS' : 'TIE'
          console.log(`   Winner: ${winner} (Close: $${ethPrice.toFixed(4)} vs Lock: $${lockPrice.toFixed(4)}, Diff: ${diff > 0 ? '+' : ''}${diff.toFixed(4)})`)
        }
        // Reset for next round
        timerStartRef.current = Date.now()
        setHasLockedPrice(false)
        onTimerReset() // Clear swipe tracking for new round
      }
    }

    const interval = setInterval(updateTimer, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [onTimerReset, intervalSeconds, bufferSeconds, ethPrice, marketName, hasLockedPrice, lockPrice])

  useEffect(() => {
    // Initialize audio on client side with mobile-friendly settings and volume boost
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/game-start.mp3')
      audio.preload = 'auto'
      audio.volume = 1.0 // Max browser volume
      audio.load()
      audioRef.current = audio

      // Create Web Audio API context for volume amplification
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 2.0 // 200% volume boost

        const source = audioContext.createMediaElementSource(audio)
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        audioContextRef.current = audioContext
        gainNodeRef.current = gainNode
        sourceNodeRef.current = source
      }

      // Unlock audio on first touch/click for iOS
      const unlockAudio = () => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            audioRef.current?.pause()
            audioRef.current!.currentTime = 0
          }).catch(() => {})
        }
        // Resume audio context on iOS
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume()
        }
        document.removeEventListener('touchstart', unlockAudio)
        document.removeEventListener('click', unlockAudio)
      }

      document.addEventListener('touchstart', unlockAudio, { once: true })
      document.addEventListener('click', unlockAudio, { once: true })
    }
  }, [])

  const periods = ["1h", "8h", "1d", "1w", "1m", "6m", "1y"]

  const cards = [currentCardId, currentCardId + 1, currentCardId + 2]

  const handleDragStart = (clientX: number) => {
    if (isSwipeBlocked) return
    setIsDragging(true)
    setIsMagnetized(false)
    dragStartX.current = clientX
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging || isMagnetized || isSwipeBlocked) return
    const rawOffset = clientX - dragStartX.current
    const dragCoefficient = 0.5
    const offset = rawOffset * dragCoefficient
    const iconFullyVisibleThreshold = 80

    if (Math.abs(offset) >= iconFullyVisibleThreshold) {
      setIsMagnetized(true)
      setIsDragging(false)
      const direction = offset > 0 ? 1 : -1
      setDragOffset(direction * 500)
      setRotation(direction * 12)

      // Play sound on swipe
      if (audioRef.current) {
        // Resume audio context if suspended (iOS requirement)
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume()
        }

        audioRef.current.currentTime = 0
        const playPromise = audioRef.current.play()

        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('Audio play failed:', err)
            // Retry once on mobile
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {})
              }
            }, 100)
          })
        }
      }

      setTimeout(() => {
        setCurrentCardId(prev => prev + 1)
        setDragOffset(0)
        setRotation(0)
        setIsMagnetized(false)
        // Trigger commit popup
        onSwipeComplete(direction > 0 ? "up" : "down", marketName)
      }, 400)
    } else {
      setDragOffset(offset)
      setRotation(offset / 20)
    }
  }

  const handleDragEnd = () => {
    if (isMagnetized) return
    setIsDragging(false)
    setDragOffset(0)
    setRotation(0)
  }

  const iconOpacity = Math.min(Math.abs(dragOffset) / 80, 0.6)
  const iconScale = Math.min(Math.abs(dragOffset) / 80, 1)

  // Calculate lock threshold: 30 seconds for 60s round (50% = when lock price is captured)
  const lockThresholdPercent = 50

  // Block swiping when in lock phase OR if already swiped this round
  const isSwipeBlocked = timerProgress >= lockThresholdPercent || hasSwipedThisRound

  // Show "Round Locked" popup during lock phase only (50%-100%)
  const showLockedPopup = timerProgress >= lockThresholdPercent && timerProgress < 100

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Round Locked Popup - Shows during lock phase only (30s-60s) */}
      {showLockedPopup && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl px-8 py-6 mx-4 border-2 border-yellow-400">
            <p className="text-yellow-400 font-bold text-2xl sm:text-3xl text-center">
              🔒 ROUND LOCKED
            </p>
            <p className="text-white text-base sm:text-lg text-center mt-2 opacity-90">
              No more bets accepted
            </p>
          </div>
        </div>
      )}

      {/* Already Swiped Warning - Shows when user already swiped this round */}
      {hasSwipedThisRound && !showLockedPopup && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl px-6 py-4 mx-4">
            <p className="text-yellow-400 font-bold text-lg sm:text-xl text-center">
              Already Swiped
            </p>
            <p className="text-white text-sm sm:text-base text-center mt-1 opacity-90">
              One swipe per round
            </p>
          </div>
        </div>
      )}
      {/* Swipe Feedback Icons */}
      {dragOffset > 0 && (
        <div
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[15]"
          style={{
            opacity: iconOpacity,
            transform: `translateY(-50%) scale(${iconScale})`,
            transition: isMagnetized ? 'all 0.4s ease-out' : 'none',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <ArrowUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {dragOffset < 0 && (
        <div
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[15]"
          style={{
            opacity: iconOpacity,
            transform: `translateY(-50%) scale(${iconScale})`,
            transition: isMagnetized ? 'all 0.4s ease-out' : 'none',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <ArrowDown className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Card Stack */}
      {cards.reverse().map((cardId, reverseIndex) => {
        const index = cards.length - 1 - reverseIndex
        const isTopCard = index === 0
        const opacity = 1 - (index * 0.15)

        return (
          <div
            key={cardId}
            className="absolute inset-4 sm:inset-6 bg-yellow-400 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col border border-yellow-500 select-none"
            style={{
              transform: isTopCard
                ? `translateX(${dragOffset}px) rotate(${rotation}deg)`
                : 'none',
              transition: isTopCard && (isDragging && !isMagnetized)
                ? 'none'
                : isTopCard && isMagnetized
                ? 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
              zIndex: 10 - index,
              opacity: opacity,
              cursor: isTopCard ? (isSwipeBlocked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab')) : 'default',
            }}
            onMouseDown={isTopCard ? (e) => handleDragStart(e.clientX) : undefined}
            onMouseMove={isTopCard ? (e) => handleDragMove(e.clientX) : undefined}
            onMouseUp={isTopCard ? handleDragEnd : undefined}
            onMouseLeave={isTopCard ? handleDragEnd : undefined}
            onTouchStart={isTopCard ? (e) => handleDragStart(e.touches[0].clientX) : undefined}
            onTouchMove={isTopCard ? (e) => handleDragMove(e.touches[0].clientX) : undefined}
            onTouchEnd={isTopCard ? handleDragEnd : undefined}
          >
        {/* Header Spacer */}
        <div
          className="mb-4 sm:mb-6"
          style={{
            height: 'calc(3rem + env(safe-area-inset-top, 0px))',
          }}
        />

        {/* Wallet Value */}
        <div className="mb-4 sm:mb-6">
          <p className="text-black opacity-90 mb-1 sm:mb-2 text-3xl sm:text-4xl md:text-5xl">{marketName}/USD</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
            {marketName === "ETH" ? (
              isPriceLoading ? (
                <span className="opacity-50">Loading...</span>
              ) : ethPrice !== null ? (
                `$${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
              ) : (
                <span className="opacity-50">--</span>
              )
            ) : (
              <span className="opacity-50">Coming Soon</span>
            )}
          </h2>
        </div>

        {/* Time Period Selector */}


        {/* Chart Area */}
        <div className="flex-1 mb-4 sm:mb-6 relative">
          {marketName === "ETH" ? (
            <EthPriceChart currentPrice={ethPrice} lockPrice={lockPrice} />
          ) : (
            <>
              <div className="absolute inset-0 flex items-end justify-center gap-0.5">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-yellow-500 opacity-60 rounded-t"
                    style={{
                      height: `${Math.sin(i / 10) * 30 + 40}%`,
                    }}
                  />
                ))}
              </div>
              {/* Trend line */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <polyline
                  points={Array.from({ length: 60 })
                    .map((_, i) => `${(i / 59) * 100}% ${100 - (Math.sin(i / 10) * 30 + 40)}%`)
                    .join(" ")}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.8)"
                  strokeWidth="2"
                />
              </svg>
            </>
          )}
        </div>

        {/* Profit/Loss Info */}
        <div
          className="bg-yellow-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 relative overflow-hidden"
        >
          {/* Timer Overlay - Fills from left to right over 2 minutes */}
          <div
            className="absolute inset-0 bg-black pointer-events-none transition-all duration-75 ease-linear"
            style={{
              width: `${timerProgress}%`,
              opacity: 0.15,
            }}
          />

          <div className="relative z-10">
            <div className="mb-4 sm:mb-5">
              <p className="text-black text-xs sm:text-sm opacity-75 mb-1">NEXT ROUND</p>
              <p className="text-black font-bold text-2xl sm:text-3xl">147 CELO</p>
              <p className="text-black text-xs sm:text-sm opacity-60">PRIZE POOL</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-black text-xs sm:text-sm opacity-75 mb-1">Down</p>
                <p className="font-bold text-3xl sm:text-4xl" style={{ color: '#ed4b9e' }}>1.5x</p>
                <p className="text-black text-[10px] sm:text-xs opacity-60">payout</p>
              </div>
              <div className="text-right">
                <p className="text-black text-xs sm:text-sm opacity-75 mb-1">Up</p>
                <p className="font-bold text-3xl sm:text-4xl" style={{ color: '#2e8656' }}>2.5x</p>
                <p className="text-black text-[10px] sm:text-xs opacity-60">payout</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transaction */}


        {/* Bottom Navigation Spacer */}
        <div
          style={{
            height: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        />
          </div>
        )
      })}
    </div>
  )
}
