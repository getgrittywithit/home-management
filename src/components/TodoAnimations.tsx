'use client'

import { useEffect, useState } from 'react'

interface UnicornAnimationProps {
  trigger: boolean
  onComplete: () => void
}

export function UnicornAnimation({ trigger, onComplete }: UnicornAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    vx: number
    vy: number
    life: number
  }>>([])

  useEffect(() => {
    if (!trigger || typeof window === 'undefined') return

    setIsAnimating(true)
    
    // Create initial particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 50,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 8 - 4,
      life: 1
    }))
    
    setParticles(newParticles)

    // Animation loop
    const animate = () => {
      setParticles(prevParticles => 
        prevParticles.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.2, // gravity
          life: particle.life - 0.02
        })).filter(particle => particle.life > 0)
      )
    }

    const interval = setInterval(animate, 16) // 60fps

    // Complete animation after 3 seconds
    const timeout = setTimeout(() => {
      setIsAnimating(false)
      setParticles([])
      onComplete()
    }, 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [trigger, onComplete])

  if (!isAnimating) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Flying Unicorn */}
      <div 
        className="absolute text-6xl animate-bounce"
        style={{
          left: '20%',
          top: '30%',
          animation: 'unicornFly 3s ease-in-out forwards'
        }}
      >
        🦄
      </div>

      {/* Magic Sparkles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute text-2xl animate-pulse"
          style={{
            left: particle.x,
            top: particle.y,
            opacity: particle.life,
            transform: `scale(${particle.life})`,
            transition: 'all 0.1s ease'
          }}
        >
          ✨
        </div>
      ))}

      {/* Additional glitter effects */}
      <div className="absolute inset-0">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`glitter-${i}`}
            className="absolute animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: '1s'
            }}
          >
            <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"></div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes unicornFly {
          0% {
            transform: translateX(-100px) translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateX(50vw) translateY(-100px) rotate(10deg);
          }
          100% {
            transform: translateX(120vw) translateY(-50px) rotate(-5deg);
          }
        }
      `}</style>
    </div>
  )
}

interface GlitterBurstProps {
  x: number
  y: number
  trigger: boolean
  onComplete: () => void
}

export function GlitterBurst({ x, y, trigger, onComplete }: GlitterBurstProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!trigger) return

    setIsAnimating(true)
    
    const timeout = setTimeout(() => {
      setIsAnimating(false)
      onComplete()
    }, 1500)

    return () => clearTimeout(timeout)
  }, [trigger, onComplete])

  if (!isAnimating) return null

  return (
    <div 
      className="fixed pointer-events-none z-40"
      style={{ left: x - 50, top: y - 50 }}
    >
      {/* Central burst */}
      <div className="relative w-24 h-24">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full animate-ping"
            style={{
              left: '50%',
              top: '50%',
              transform: `rotate(${i * 30}deg) translateY(-${20 + Math.random() * 20}px)`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1s'
            }}
          />
        ))}
        
        {/* Center sparkle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl animate-bounce">✨</div>
        </div>
      </div>
    </div>
  )
}

// Hook to trigger animations when todos are completed
export function useTodoAnimations() {
  const [animationQueue, setAnimationQueue] = useState<Array<{
    id: string
    type: 'unicorn' | 'glitter'
    x?: number
    y?: number
  }>>([])

  const triggerUnicornAnimation = () => {
    setAnimationQueue(prev => [...prev, {
      id: `unicorn-${Date.now()}`,
      type: 'unicorn'
    }])
  }

  const triggerGlitterBurst = (x: number, y: number) => {
    setAnimationQueue(prev => [...prev, {
      id: `glitter-${Date.now()}`,
      type: 'glitter',
      x,
      y
    }])
  }

  const completeAnimation = (id: string) => {
    setAnimationQueue(prev => prev.filter(anim => anim.id !== id))
  }

  return {
    animationQueue,
    triggerUnicornAnimation,
    triggerGlitterBurst,
    completeAnimation
  }
}