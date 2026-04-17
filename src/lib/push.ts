// ============================================================================
// Web Push helper — sends push notifications via VAPID to subscribed devices.
// Called from createNotification() in src/lib/notifications.ts so in-app
// notifications automatically fan out to push where appropriate.
// ============================================================================

import webpush from 'web-push'
import { db } from './database'

// Dev-fallback keys — production uses Vercel env vars.
const DEV_VAPID_PUBLIC = 'BDxwCvIqxa3yzBQiZxE7bq8B__Kz4-BCfmwLWkCROiMcfaHvZzMla2Q9QC8_X4GQ1VTjquh9OC2fOicjaPgY4ec'
const DEV_VAPID_PRIVATE = '78gvsGdF9K9dIKYZGj1SIDufhoH3gNtFCjAbndqlzMk'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || DEV_VAPID_PUBLIC
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || DEV_VAPID_PRIVATE
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:mosesfamily2008@gmail.com'

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    vapidConfigured = true
  } catch (err) {
    console.error('[push] VAPID setup failed', err)
  }
}

// ----------------------------------------------------------------------------
// Kid rate limit: max 4 push notifications per kid per day (ADHD-friendly).
// Returns true if allowed, false if limit reached.
// ----------------------------------------------------------------------------
const KID_DAILY_LIMIT = 4

async function checkKidRateLimit(kidName: string, silent: boolean): Promise<boolean> {
  if (silent) return true // silent/badge-only pushes don't count against the limit
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const rows = await db.query(
    `SELECT sent_count FROM push_rate_limit WHERE kid_name = $1 AND date = $2`,
    [kidName, today]
  ).catch(() => [])
  const count = rows[0]?.sent_count || 0
  if (count >= KID_DAILY_LIMIT) return false
  await db.query(
    `INSERT INTO push_rate_limit (kid_name, date, sent_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (kid_name, date) DO UPDATE SET sent_count = push_rate_limit.sent_count + 1, updated_at = NOW()`,
    [kidName, today]
  ).catch(() => {})
  return true
}

// ----------------------------------------------------------------------------
// sendPush — fan out a push notification to all matching subscriptions.
// Parent pushes: target_role='parent', kid_name null → all parent devices
// Kid pushes: target_role='kid', kid_name='amos' → all devices subscribed as that kid
// ----------------------------------------------------------------------------

interface SendPushOptions {
  target_role: 'parent' | 'kid'
  kid_name?: string | null
  title: string
  body: string
  link_tab?: string | null
  icon?: string | null
  source_ref?: string | null
  silent?: boolean // badge-only, no alert sound/vibration
}

export async function sendPush(opts: SendPushOptions): Promise<{ sent: number; failed: number; skipped?: string }> {
  ensureVapid()

  const role = opts.target_role
  const kid = opts.kid_name?.toLowerCase() || null

  // Kid rate limit
  if (role === 'kid' && kid) {
    const allowed = await checkKidRateLimit(kid, !!opts.silent)
    if (!allowed) {
      console.log(`[push] rate-limited: ${kid} has hit daily cap of ${KID_DAILY_LIMIT}`)
      return { sent: 0, failed: 0, skipped: 'rate_limited' }
    }
  }

  // Look up matching subscriptions
  const params: any[] = [role]
  let where = 'target_role = $1'
  if (role === 'kid' && kid) {
    params.push(kid)
    where += ` AND kid_name = $${params.length}`
  } else if (role === 'parent') {
    where += ' AND kid_name IS NULL'
  }

  const subs = await db.query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE ${where}`,
    params
  ).catch(() => [])

  if (subs.length === 0) return { sent: 0, failed: 0, skipped: 'no_subscribers' }

  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: opts.source_ref || undefined,
    data: {
      link_tab: opts.link_tab || null,
      icon: opts.icon || null,
      silent: opts.silent || false,
    },
    silent: opts.silent || false,
  })

  let sent = 0
  let failed = 0
  const deadEndpoints: number[] = []

  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
        // Best-effort update last_used_at
        db.query(`UPDATE push_subscriptions SET last_used_at = NOW(), failed_count = 0 WHERE id = $1`, [sub.id]).catch(() => {})
      } catch (err: any) {
        failed++
        const status = err?.statusCode || 0
        // 404/410 = subscription expired or unsubscribed — purge
        if (status === 404 || status === 410) {
          deadEndpoints.push(sub.id)
        } else {
          // Other failure — bump counter; purge at threshold
          db.query(`UPDATE push_subscriptions SET failed_count = failed_count + 1 WHERE id = $1`, [sub.id]).catch(() => {})
        }
      }
    })
  )

  if (deadEndpoints.length > 0) {
    await db.query(
      `DELETE FROM push_subscriptions WHERE id = ANY($1::int[])`,
      [deadEndpoints]
    ).catch(() => {})
    console.log(`[push] purged ${deadEndpoints.length} dead subscriptions`)
  }

  return { sent, failed }
}

// ----------------------------------------------------------------------------
// shouldPushForSource — decides whether a given in-app notification source_type
// warrants a real push notification. Called by createNotification() so most
// event-driven notifications fire push for free.
// ----------------------------------------------------------------------------

const PARENT_PUSH_SOURCES = new Set([
  'message',                    // kid sent a note
  'huddle_submitted',           // kid submitted huddle check-in
  'sick_day',                   // kid marked sick
  'crisis_detection',           // journal crisis
  'needs_request',              // kid household needs request
  'library_submission',         // kid library submission
  'help_request',               // kid requested help on task
  'homeschool_help',            // same, different source tag
  'redemption_request',         // star redemption pending
  'med_reminder',               // scheduled med time (future cron)
  'overdue_chore',              // overdue chore alert (future cron)
  'meal_pick_deadline',         // meal deadline (future cron)
  'meal_request',               // kid meal request
  'kid_finished_school',        // kid finished all school tasks
  'profile_updated',            // kid updated About Me profile
  'vibe_updated',               // kid updated Vibe profile
  'sizes_updated',              // kid updated clothing sizes
])

const KID_PUSH_SOURCES = new Set([
  'homeschool_help_reply',      // parent replied to help request
  'homeschool_nudge',           // parent nudge
  'parent_reply',               // parent replied to kid message
  'message_reply',              // parent replied to kid message (alt name)
  'greenlight',                 // parent posted greenlight
  'needs_approved',             // kid household needs approved
  'needs_denied',               // kid household needs denied
  'redemption_approved',        // star redemption approved
  'redemption_denied',          // star redemption denied
  'star_earned',                // star awarded (SILENT — badge only)
])

const SILENT_SOURCES = new Set([
  'star_earned',
])

export function shouldPushForSource(source_type: string, target_role: string): boolean {
  if (target_role === 'parent') return PARENT_PUSH_SOURCES.has(source_type)
  if (target_role === 'kid') return KID_PUSH_SOURCES.has(source_type)
  return false
}

export function isSilentSource(source_type: string): boolean {
  return SILENT_SOURCES.has(source_type)
}
