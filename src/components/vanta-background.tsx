'use client'

import { useState, useEffect, useMemo } from 'react'
import { Square, Triangle, Circle, X } from 'lucide-react'

export function VantaBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate a stable set of symbols with randomized properties
  const symbols = useMemo(() => {
    const icons = [Square, Triangle, Circle, X]
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      Icon: icons[i % icons.length],
      size: Math.random() * 30 + 15,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * 20 + 30, // 30-50s for slow movement
      delay: Math.random() * -60,
      opacity: Math.random() * 0.06 + 0.02, // Very subtle
      rotation: Math.random() * 360,
      color: i % 2 === 0 ? 'text-primary' : 'text-accent'
    }))
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0A192F]">
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(204,253,1,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(204,253,1,0.01)_1px,transparent_1px)] bg-[size:100px_100px]" />
      
      {/* PlayStation Symbols Floating Layer */}
      {symbols.map(({ id, Icon, size, left, top, duration, delay, opacity, rotation, color }) => (
        <div
          key={id}
          className="absolute animate-float"
          style={{
            left,
            top,
            opacity,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <Icon 
            size={size} 
            strokeWidth={2.5} 
            className={color}
          />
        </div>
      ))}

      {/* Radial Vignette for depth and focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,25,47,0.7)_100%)]" />
      
      {/* Bottom Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[40vh] bg-gradient-to-t from-primary/5 to-transparent opacity-30" />
    </div>
  )
}
