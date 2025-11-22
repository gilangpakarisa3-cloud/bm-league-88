
'use client'

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'

// Augment the window object to include VANTA
declare global {
  interface Window {
    VANTA: {
      NET: (options: {
        el: HTMLElement | string;
        THREE: typeof THREE;
        mouseControls: boolean;
        touchControls: boolean;
        gyroControls: boolean;
        minHeight: number;
        minWidth: number;
        scale: number;
        scaleMobile: number;
        color?: number;
        backgroundColor?: number;
        points?: number;
        maxDistance?: number;
        spacing?: number;

      }) => {
        destroy: () => void;
      };
    };
  }
}

export function VantaBackground() {
  const [vantaEffect, setVantaEffect] = useState<any>(null)
  const vantaRef = useRef(null)

  useEffect(() => {
    // Only initialize if VANTA is available and we haven't already initialized
    if (window.VANTA && !vantaEffect) {
      setVantaEffect(window.VANTA.NET({
        el: vantaRef.current!,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0xCCFD01, // Vibrant Yellow (Primary Color)
        backgroundColor: 0x0A192F, // Primary Deep Blue
        points: 6.00,
        maxDistance: 22.00,
        spacing: 16.00
      }))
    }
    // Cleanup function to destroy the effect when the component unmounts
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  return (
      <div 
        ref={vantaRef} 
        className="fixed top-0 left-0 w-full h-full z-0 opacity-50"
      />
  )
}
