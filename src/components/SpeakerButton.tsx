'use client'

import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface SpeakerButtonProps {
  text: string
  className?: string
  size?: 'sm' | 'md'
}

export default function SpeakerButton({ text, className, size = 'sm' }: SpeakerButtonProps) {
  const [speaking, setSpeaking] = useState(false)

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const padding = size === 'sm' ? 'p-1' : 'p-1.5'

  return (
    <button onClick={handleSpeak} title={speaking ? 'Stop reading' : 'Read aloud'}
      className={`${padding} rounded hover:bg-blue-100 transition ${speaking ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500'} ${className || ''}`}>
      {speaking ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
    </button>
  )
}
