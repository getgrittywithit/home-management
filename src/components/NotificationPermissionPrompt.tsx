'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, Loader2 } from 'lucide-react'

interface Props {
  targetRole: 'parent' | 'kid'
  kidName?: string
}

type PromptState = 'hidden' | 'prompting' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported'

const DISMISS_KEY_PREFIX = 'push-prompt-dismissed:'
const SUBSCRIBED_KEY_PREFIX = 'push-subscribed:'

// Base64 url-safe → ArrayBuffer for PushManager.applicationServerKey.
// Returning ArrayBuffer directly avoids a TS lib.dom quirk where
// Uint8Array isn't assignable to the BufferSource union.
function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i)
  return buffer
}

export default function NotificationPermissionPrompt({ targetRole, kidName }: Props) {
  const [state, setState] = useState<PromptState>('hidden')

  const storageKey = kidName
    ? `${DISMISS_KEY_PREFIX}${targetRole}:${kidName.toLowerCase()}`
    : `${DISMISS_KEY_PREFIX}${targetRole}`
  const subscribedKey = kidName
    ? `${SUBSCRIBED_KEY_PREFIX}${targetRole}:${kidName.toLowerCase()}`
    : `${SUBSCRIBED_KEY_PREFIX}${targetRole}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported')
      return
    }

    // Already subscribed on this device?
    if (localStorage.getItem(subscribedKey) === '1') {
      setState('subscribed')
      return
    }

    // User dismissed — respect for 7 days
    const dismissedAt = localStorage.getItem(storageKey)
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (days < 7) {
        setState('hidden')
        return
      }
    }

    // Check current permission
    if (Notification.permission === 'granted') {
      // Permission granted but no local flag — try to subscribe silently
      subscribe(true).catch(() => setState('prompting'))
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    // Delay the prompt slightly so it doesn't pop immediately on page load
    const timer = setTimeout(() => setState('prompting'), 3000)
    return () => clearTimeout(timer)
  }, [targetRole, kidName, storageKey, subscribedKey])

  const subscribe = async (silent = false) => {
    setState('subscribing')
    try {
      // 1. Ensure service worker registered
      const reg = await navigator.serviceWorker.register('/sw.js').catch(async () => {
        return await navigator.serviceWorker.ready
      }) || (await navigator.serviceWorker.ready)

      // 2. Request permission
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        if (result !== 'granted') {
          setState('denied')
          return
        }
      }

      // 3. Get VAPID public key from server
      const keyRes = await fetch('/api/notifications/push?action=vapid_key')
      const { public_key } = await keyRes.json()
      if (!public_key) {
        console.error('No VAPID public key from server')
        setState('denied')
        return
      }

      // 4. Subscribe via PushManager
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe().catch(() => {})
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(public_key),
      })

      // 5. POST to server
      const res = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          target_role: targetRole,
          kid_name: kidName || null,
          subscription: subscription.toJSON(),
          device_label: navigator.userAgent.slice(0, 100),
          user_agent: navigator.userAgent,
        }),
      })

      if (res.ok) {
        localStorage.setItem(subscribedKey, '1')
        setState('subscribed')
        if (!silent) {
          // Auto-hide the success banner after a moment
          setTimeout(() => setState('hidden'), 4000)
        }
      } else {
        console.error('subscribe POST failed')
        setState('prompting')
      }
    } catch (err) {
      console.error('push subscription failed:', err)
      setState('prompting')
    }
  }

  const dismiss = () => {
    localStorage.setItem(storageKey, String(Date.now()))
    setState('hidden')
  }

  if (state === 'hidden' || state === 'unsupported' || state === 'denied') return null

  if (state === 'subscribed') {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-green-200 bg-green-50 px-4 py-2 flex items-center gap-2 text-sm text-green-800">
        <Check className="w-4 h-4 flex-shrink-0" />
        <span>Notifications enabled — you'll get reminders for meds, chores, and messages.</span>
      </div>
    )
  }

  // prompting / subscribing
  return (
    <div className="mx-auto max-w-3xl rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-indigo-900">
            {targetRole === 'parent' ? 'Enable notifications?' : 'Get friendly reminders?'}
          </h3>
          <p className="text-xs text-indigo-700 mt-0.5">
            {targetRole === 'parent'
              ? "Get push alerts for meds, overdue chores, kid messages, and meal deadlines."
              : "We'll send you gentle reminders for your school day, chores, and Belle duty."}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => subscribe(false)}
              disabled={state === 'subscribing'}
              className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {state === 'subscribing' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Enabling…
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3" /> Enable
                </>
              )}
            </button>
            <button
              onClick={dismiss}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-white/60 text-indigo-400 hover:text-indigo-600"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
