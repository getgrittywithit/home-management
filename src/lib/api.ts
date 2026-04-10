// Offline-aware API wrapper
// Use apiCall() instead of raw fetch() for any POST/PUT/PATCH/DELETE
// When offline (or network fails), the action is queued in IndexedDB
// and a fake success response is returned so the UI updates optimistically.

import { enqueueAction, isOnline } from './offline-store'

interface ApiCallOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
  // Metadata for the offline queue
  actionType?: string  // e.g. 'checklist_toggle', 'meal_pick', 'mood_log'
  kidId?: string       // which kid initiated
}

export async function apiCall(endpoint: string, options: ApiCallOptions = {}): Promise<Response> {
  const { method = 'GET', body, headers = {}, actionType, kidId } = options

  // GET requests — never queue, just fetch (SW handles caching)
  if (method === 'GET') {
    return fetch(endpoint, { method, headers })
  }

  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  }

  // Try the real request first
  if (isOnline()) {
    try {
      const response = await fetch(endpoint, fetchOptions)
      if (response.ok) return response
      // Server error (4xx/5xx) — don't queue, let the caller handle it
      return response
    } catch (err) {
      // TypeError = network failure (offline, DNS, etc.)
      if (!(err instanceof TypeError)) throw err
      // Fall through to queue
    }
  }

  // Offline or network failed — queue the action
  await enqueueAction({
    endpoint,
    method,
    body: body ?? {},
    actionType: actionType || guessActionType(endpoint, body),
    kidId,
  })

  // Return a fake success so the UI updates optimistically
  return new Response(JSON.stringify({ success: true, offline: true, queued: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Convenience wrappers
export function apiPost(endpoint: string, body: any, meta?: { actionType?: string; kidId?: string }) {
  return apiCall(endpoint, { method: 'POST', body, ...meta })
}

export function apiPut(endpoint: string, body: any, meta?: { actionType?: string; kidId?: string }) {
  return apiCall(endpoint, { method: 'PUT', body, ...meta })
}

export function apiPatch(endpoint: string, body: any, meta?: { actionType?: string; kidId?: string }) {
  return apiCall(endpoint, { method: 'PATCH', body, ...meta })
}

export function apiDelete(endpoint: string, meta?: { actionType?: string; kidId?: string }) {
  return apiCall(endpoint, { method: 'DELETE', ...meta })
}

// Best-guess actionType from the endpoint + body
function guessActionType(endpoint: string, body?: any): string {
  if (endpoint.includes('/checklist')) return 'checklist_toggle'
  if (endpoint.includes('/meal-plan') || endpoint.includes('/meal-request')) return 'meal_pick'
  if (endpoint.includes('/mood')) return body?.action === 'flag_break' ? 'break_request' : 'mood_log'
  if (endpoint.includes('/health')) return 'health_log'
  if (endpoint.includes('/stars') || endpoint.includes('/economy')) return 'star_award'
  if (endpoint.includes('/digi-pet')) return 'digi_pet'
  if (endpoint.includes('/library')) return 'library_submission'
  if (endpoint.includes('/message') || endpoint.includes('/notification')) return 'message'
  if (endpoint.includes('/journal')) return 'journal_entry'
  if (endpoint.includes('/zone')) return 'zone_action'
  return 'api_call'
}
