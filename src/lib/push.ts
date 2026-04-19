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
const KID_DAILY_LIMIT = 12

const SAFETY_BYPASS_SOURCES = new Set([
  'crisis_detection',
  'concern_detection',
  'safety_event',
])

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
  source_type?: string | null
  silent?: boolean // badge-only, no alert sound/vibration
}

export async function sendPush(opts: SendPushOptions): Promise<{ sent: number; failed: number; skipped?: string }> {
  ensureVapid()

  const role = opts.target_role
  const kid = opts.kid_name?.toLowerCase() || null

  // Kid rate limit — safety notifications always bypass
  if (role === 'kid' && kid && !SAFETY_BYPASS_SOURCES.has(opts.source_type || '')) {
    const allowed = await checkKidRateLimit(kid, !!opts.silent)
    if (!allowed) {
      console.log(`[push] rate-limited: ${kid} has hit daily cap of ${KID_DAILY_LIMIT}`)
      return { sent: 0, failed: 0, skipped: 'rate_limited' }
    }
  }

  // Quiet hours check — safety notifications bypass
  if (!SAFETY_BYPASS_SOURCES.has(opts.source_type || '')) {
    const prefs = await db.query(
      `SELECT quiet_start, quiet_end FROM notification_preferences WHERE target_role = $1 LIMIT 1`,
      [role]
    ).catch(() => [])
    if (prefs[0]?.quiet_start != null && prefs[0]?.quiet_end != null) {
      const centralHour = parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Chicago' }).format(new Date())
      )
      const start = parseInt(prefs[0].quiet_start)
      const end = parseInt(prefs[0].quiet_end)
      const isQuiet = start < end
        ? (centralHour >= start && centralHour < end)
        : (centralHour >= start || centralHour < end)
      if (isQuiet) {
        return { sent: 0, failed: 0, skipped: 'quiet_hours' }
      }
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
  'med_reminder',               // scheduled med time
  'overdue_chore',              // overdue chore alert
  'meal_pick_deadline',         // meal deadline
  'meal_request',               // kid meal request
  'kid_finished_school',        // kid finished all school tasks
  'profile_updated',            // kid updated About Me profile
  'vibe_updated',               // kid updated Vibe profile
  'sizes_updated',              // kid updated clothing sizes
  // Safety — must always push
  'concern_detection',          // AI detected concerning content
  'break_spike',                // kid taking way more breaks than normal
  'completion_cliff',           // kid's task completion dropped sharply
  'velocity_alert',             // kid's pace changed significantly
  'pattern_alert',              // pattern detection flagged something
  'safety_event',               // safety system triggered
  // Activity completions
  'belle_complete',             // kid finished all Belle tasks
  'zone_complete',              // kid finished all zone chores
  'checklist_complete',         // kid finished full daily checklist
  'belle_overdue',              // Belle AM tasks overdue
  'adventure_submitted',        // kid submitted an adventure idea
  'adventure_interest',         // kid voted on an adventure
  // Academic
  'book_finished',              // kid finished a book
  'book_completed',             // alt name for book finished
  'financial_literacy_advance', // kid advanced in money skills
  'financial_level_advance',    // alt name
  'placement_complete',         // kid finished placement quiz
  // Achievements & progress
  'achievement_earned',         // kid earned an achievement
  'achievement_parent',         // achievement notification for parent
  // Behavior & safety
  'behavior_event',             // behavior logged
  'low_mood',                   // kid logged low mood
  'wellness_concern',           // wellness system flagged
  'flag_acknowledged',          // flag was acknowledged
  // School & learning
  'grade_alert',                // school grade alert
  'school_note',                // school note received
  // Requests from kids
  'grocery_request',            // kid requested grocery item
  'grocery_reviewed',           // grocery request reviewed
  'event_request',              // kid requested calendar event
  'reward_request',             // kid requested reward purchase
  'library_approved',           // library submission approved
  'library_rejected',           // library submission rejected
  // Economy
  'bonus_stars',                // bonus stars awarded
  'star_goal',                  // star goal reached
  // Health
  'health_alert',               // health system alert
  'dental_complete',            // dental care logged
  'med_completion',             // kid took medication
  'refill_alert',               // medication refill needed
  // Social
  'friend_request',             // kid submitted friend request
  'friend_request_response',    // parent responded to friend request
  'sibling_message',            // sibling sent a message
  // Household
  'zone_photo',                 // kid submitted zone photo
  'cooking_complete',           // cooking session complete
  'activity_logged',            // activity was logged
  'all_tasks_complete',         // all tasks complete
  // Parent actions
  'positive_approved',          // positive report approved
  'positive_catch',             // positive catch logged
  'kid_report',                 // kid report submitted
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
  'adventure_decision',         // parent decided on their adventure
  'meal_pick_reminder',         // deadline reminder
  'quick_praise',               // parent sent quick praise
  'positive_report',            // parent left a positive report
  'parent_praise',              // parent sent praise
  'reward_approved',            // reward purchase approved
  'library_approved',           // library submission approved
  'library_rejected',           // library submission rejected
  'event_response',             // parent responded to event request
  'challenge',                  // challenge issued
  'challenge_win',              // challenge won
  'challenge_update',           // someone updated challenge progress
  'parent_nudge',               // parent nudge
  'break_acknowledged',         // break request acknowledged
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
