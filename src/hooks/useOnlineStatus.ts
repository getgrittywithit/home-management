'use client'

import { useState, useEffect, useCallback } from 'react'

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOnline(navigator.onLine)

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
