'use client'

import { useEffect } from 'react'
import { enqueueAction, isOnline } from '@/lib/offline-store'

// Guess actionType from endpoint + body for queue display
function guessActionType(url: string, body?: any): string {
  if (url.includes('/checklist')) return 'checklist_toggle'
  if (url.includes('/meal-plan') || url.includes('/meal-request')) return 'meal_pick'
  if (url.includes('/mood')) return body?.action === 'flag_break' ? 'break_request' : 'mood_log'
  if (url.includes('/health')) return 'health_log'
  if (url.includes('/stars') || url.includes('/economy') || url.includes('/digi-pet')) return 'star_award'
  if (url.includes('/rewards')) return 'reward_action'
  if (url.includes('/library') || url.includes('/portfolio')) return 'library_submission'
  if (url.includes('/message') || url.includes('/notification')) return 'message'
  if (url.includes('/journal')) return 'journal_entry'
  if (url.includes('/zone')) return 'zone_action'
  if (url.includes('/learning-engine') || url.includes('/vocab')) return 'learning'
  return 'api_call'
}

function guessKidId(body?: any): string | undefined {
  if (!body) return undefined
  return body.kid_name || body.kidName || body.child || body.kid_id || body.kidId || undefined
}

export default function OfflineFetchInterceptor() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const originalFetch = window.fetch

    window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
      const method = init?.method || (input instanceof Request ? input.method : 'GET')

      // Only intercept non-GET requests to our own API
      if (method === 'GET' || !url.startsWith('/api/')) {
        return originalFetch.call(window, input, init)
      }

      // Parse body for metadata
      let parsedBody: any = undefined
      if (init?.body && typeof init.body === 'string') {
        try { parsedBody = JSON.parse(init.body) } catch { /* not JSON */ }
      }

      // If online, try the real request
      if (isOnline()) {
        try {
          const response = await originalFetch.call(window, input, init)
          // If we got a response (even an error), return it — server handled it
          return response
        } catch (err) {
          // TypeError = actual network failure
          if (!(err instanceof TypeError)) throw err
          // Fall through to queue below
        }
      }

      // Offline or network failed — queue the action
      try {
        await enqueueAction({
          endpoint: url,
          method,
          body: parsedBody ?? {},
          actionType: guessActionType(url, parsedBody),
          kidId: guessKidId(parsedBody),
        })
      } catch { /* queue failed, nothing we can do */ }

      // Return fake success so the UI updates optimistically
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        queued: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
