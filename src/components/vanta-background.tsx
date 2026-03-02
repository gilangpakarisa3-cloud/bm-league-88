'use client'

import { useState, useEffect, useMemo } from 'react'
import { Square, Triangle, Circle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function VantaBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate a stable set of symbols with randomized properties and specific colors
  const symbols = useMemo(() => {
    const symbolConfigs = [
      { 
        Icon: Square, 
        color: 'text-amber-500',
        glow: 'drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]' 
      },
      { 
        Icon: Circle, 
        color: 'text-primary',
        glow: 'drop-shadow-[0_0_25px_rgba(204,253,1,0.6)]' 
      },
      { 
        Icon: Triangle, 
        color: 'text-blue-500',
        glow: 'drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]' 
      },
      { 
        Icon: X, 
        color: 'text-pink-500',
        glow: 'drop-shadow-[0_0_25px_rgba(236,72,153,0.6)]' 
      }
    ]

    return Array.from({ length: 32 }).map((_, i) => {
      const config = symbolConfigs[i % symbolConfigs.length];
      return {
        id: i,
        Icon: config.Icon,
        color: config.color,
        glow: config.glow,
        size: Math.random() * 96 + 48, // Reduced by 20% (range 48-144)
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: Math.random() * 20 + 30, // 30-50 seconds for slow movement
        delay: Math.random() * -60,
        opacity: Math.random() * 0.08 + 0.03, // Slightly increased for visible glow
        rotation: Math.random() * 360,
      }
    })
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0A192F]">
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(204,253,1,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(204,253,1,0.01)_1px,transparent_1px)] bg-[size:100px_100px]" />
      
      {/* PlayStation Symbols Floating Layer */}
      {symbols.map(({ id, Icon, size, left, top, duration, delay, opacity, rotation, color, glow }) => (
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
            className={cn(color, glow)}
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
