/**
 * Canonical fanout helper for task completions.
 *
 * Every task-done write goes through this module so all surfaces stay in sync.
 * See docs/data-model/completion-sources.md for the design + per-category
 * canonical write targets.
 *
 * Phase B slice 1: belle_care + belle_grooming wired. Other categories
 * (daily, pet_care, zone, homeschool) accepted by the type system but
 * fan out to kid_daily_checklist only — domain-log writes get added in
 * subsequent migration commits.
 */

import { transaction, TxQuery } from './database'

// ── Category enumeration ──

export type CompletionCategory =
  | 'daily'           // generic daily-checklist task (no domain log)
  | 'belle_care'      // belle_care_log
  | 'belle_grooming'  // belle_grooming_log
  | 'pet_care'        // pet_care_log
  | 'zone'            // zone_task_rotation (sub-task) + parent rollup in kid_daily_checklist
  | 'homeschool'      // homeschool_task_completions

// ── Identifier translation per Dispatch 115 (kid_name vs child_name) ──

const KID_COLUMN: Record<string, 'kid_name' | 'child_name'> = {
  kid_daily_checklist: 'child_name',
  pet_care_log:        'child_name',
  belle_care_log:      'kid_name',
  belle_grooming_log:  'kid_name',
  homeschool_task_completions: 'kid_name',
  zone_task_rotation:  'kid_name',
}

// ── Public API ──

export interface LogTaskCompletionOpts {
  kid: string                // lowercase first name
  category: CompletionCategory
  taskKey: string            // domain-log task key (e.g., 'am_feed', 'fur_brush', zone task_id)
  parentEventId: string      // kid_daily_checklist.event_id (e.g., 'belle-am-feed-2026-04-28')
  parentEventSummary?: string // kid_daily_checklist.event_summary; required on first write of the row
  date?: string              // YYYY-MM-DD (America/Chicago); defaults to today
  completedAt?: Date
  meta?: {
    pet_name?: string
    zone_key?: string
    weekend_start?: string   // YYYY-MM-DD for belle_grooming
    stars_earned?: number    // homeschool_task_completions
    task_id?: string         // zone_task_rotation row id
  }
}

export interface LogTaskCompletionResult {
  category_complete: boolean
  category_total: number
  category_done: number
}

const todayChicago = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

/**
 * Log a single task completion across all surfaces for the category.
 * Idempotent on re-tap (UPSERT).
 */
export async function logTaskCompletion(
  opts: LogTaskCompletionOpts
): Promise<LogTaskCompletionResult> {
  const date = opts.date || todayChicago()
  const kid = opts.kid.toLowerCase()
  const completedAt = opts.completedAt || new Date()
  const summary = opts.parentEventSummary ?? ''

  return transaction(async (q) => {
    // 1. Always UPSERT kid_daily_checklist parent rollup row
    await q(
      `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, completed_at)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       ON CONFLICT (child_name, event_date, event_id)
       DO UPDATE SET completed = TRUE,
                     completed_at = COALESCE(kid_daily_checklist.completed_at, EXCLUDED.completed_at),
                     event_summary = CASE WHEN EXCLUDED.event_summary <> '' THEN EXCLUDED.event_summary ELSE kid_daily_checklist.event_summary END`,
      [kid, date, opts.parentEventId, summary, completedAt.toISOString()]
    )

    // 2. Domain log fanout
    await writeDomainLog(q, kid, date, completedAt, opts)

    // 3. Compute denominator + done count
    return computeCategoryProgress(q, kid, date, opts.category)
  })
}

/**
 * Reverse a logTaskCompletion. Sets parent rollup completed=FALSE and
 * domain log completed=FALSE.
 */
export async function unlogTaskCompletion(opts: LogTaskCompletionOpts): Promise<void> {
  const date = opts.date || todayChicago()
  const kid = opts.kid.toLowerCase()

  await transaction(async (q) => {
    await q(
      `UPDATE kid_daily_checklist SET completed = FALSE, completed_at = NULL
       WHERE child_name = $1 AND event_date = $2 AND event_id = $3`,
      [kid, date, opts.parentEventId]
    )
    await unwriteDomainLog(q, kid, date, opts)
  })
}

// ── Domain log write fanout (per category) ──

async function writeDomainLog(
  q: TxQuery,
  kid: string,
  date: string,
  completedAt: Date,
  opts: LogTaskCompletionOpts
): Promise<void> {
  switch (opts.category) {
    case 'daily':
      // No domain log — kid_daily_checklist is canonical
      return

    case 'belle_care':
      // belle_care_log unique key is (care_date, task) — task-level, not per-kid.
      // The kid_name column "claims" the task to whoever most recently completed it
      // (matches existing behavior in belle/route.ts complete_task action).
      await q(
        `INSERT INTO belle_care_log (kid_name, care_date, task, completed, completed_at)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT (care_date, task)
         DO UPDATE SET completed = TRUE,
                       completed_at = COALESCE(belle_care_log.completed_at, EXCLUDED.completed_at),
                       kid_name = EXCLUDED.kid_name`,
        [kid, date, opts.taskKey, completedAt.toISOString()]
      )
      return

    case 'belle_grooming': {
      // belle_grooming_log rows are pre-seeded with kid_name=NULL placeholder when
      // a grooming task is scheduled (see belle/route.ts:178). Completion is an
      // UPDATE that flips completed + claims the row to a kid.
      const weekendStart = opts.meta?.weekend_start
      if (!weekendStart) throw new Error('logTaskCompletion(belle_grooming): meta.weekend_start required')
      await q(
        `UPDATE belle_grooming_log
            SET completed = TRUE, completed_at = $1, kid_name = $2
          WHERE weekend_start = $3 AND task = $4`,
        [completedAt.toISOString(), kid, weekendStart, opts.taskKey]
      )
      return
    }

    case 'pet_care':
    case 'zone':
    case 'homeschool':
      // Wired in subsequent migration commits (Step 2 of Phase B).
      // For now these categories only fanout to kid_daily_checklist.
      return
  }
}

async function unwriteDomainLog(
  q: TxQuery,
  _kid: string,
  date: string,
  opts: LogTaskCompletionOpts
): Promise<void> {
  switch (opts.category) {
    case 'daily':
      return

    case 'belle_care':
      // Per-task uniqueness — uncomplete clears the row regardless of who claimed it.
      // Resets kid_name to NULL so a stale claim doesn't outlive the completed flag.
      await q(
        `UPDATE belle_care_log SET completed = FALSE, completed_at = NULL, kid_name = NULL
         WHERE care_date = $1 AND task = $2`,
        [date, opts.taskKey]
      )
      return

    case 'belle_grooming': {
      const weekendStart = opts.meta?.weekend_start
      if (!weekendStart) throw new Error('unlogTaskCompletion(belle_grooming): meta.weekend_start required')
      await q(
        `UPDATE belle_grooming_log SET completed = FALSE, completed_at = NULL, kid_name = NULL
          WHERE weekend_start = $1 AND task = $2`,
        [weekendStart, opts.taskKey]
      )
      return
    }

    case 'pet_care':
    case 'zone':
    case 'homeschool':
      return
  }
}

// ── Category denominators ──

// Mirrors EXTRA_TASK in src/app/api/kids/belle/route.ts. Tue=brush_fur, Wed=brush_teeth,
// Fri=brush_fur. 0=Sun ... 6=Sat.
const BELLE_EXTRA_TASK_DOW: Record<number, string> = { 2: 'brush_fur', 3: 'brush_teeth', 5: 'brush_fur' }

function belleCareDenominator(date: string): number {
  const dow = new Date(date + 'T12:00:00').getDay()
  return 4 + (BELLE_EXTRA_TASK_DOW[dow] ? 1 : 0)
}

async function computeCategoryProgress(
  q: TxQuery,
  kid: string,
  date: string,
  category: CompletionCategory
): Promise<LogTaskCompletionResult> {
  switch (category) {
    case 'belle_care': {
      // Per-task counting (kid_name overwrites on UPSERT, so per-kid filtering would
      // under-count when multiple kids touch tasks). Matches the existing semantic.
      const total = belleCareDenominator(date)
      const rows = await q(
        `SELECT COUNT(*)::int AS done FROM belle_care_log
          WHERE care_date = $1 AND completed = TRUE`,
        [date]
      )
      const done = rows[0]?.done ?? 0
      return { category_total: total, category_done: done, category_complete: done >= total }
    }

    case 'belle_grooming': {
      // Denominator scoped to the weekend the date belongs to. Caller passes
      // weekend_start via meta in logTaskCompletion; here we recompute from date.
      const sat = saturdayOfWeek(date)
      const totalRows = await q(
        `SELECT COUNT(*)::int AS total FROM belle_grooming_log WHERE weekend_start = $1`,
        [sat]
      )
      const doneRows = await q(
        `SELECT COUNT(*)::int AS done FROM belle_grooming_log
          WHERE weekend_start = $1 AND completed = TRUE AND kid_name = $2`,
        [sat, kid]
      )
      const total = totalRows[0]?.total ?? 0
      const done = doneRows[0]?.done ?? 0
      return { category_total: total, category_done: done, category_complete: total > 0 && done >= total }
    }

    case 'daily':
    case 'pet_care':
    case 'zone':
    case 'homeschool':
      // Wired in subsequent migration commits. Return a safe zero so callers
      // that read category_complete don't fire spurious notifications.
      return { category_total: 0, category_done: 0, category_complete: false }
  }
}

function saturdayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()                  // 0=Sun ... 6=Sat
  const offset = dow === 6 ? 0 : -((dow + 1) % 7)
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-CA')
}

// Re-export the kid-name column map so seed/migration code can reference it.
export const COMPLETION_KID_COLUMN = KID_COLUMN

// ── Zone sub-task fanout ──
//
// Zones use a different shape than the other categories: one row in
// zone_task_rotation per (zone, task, kid, date) — that's the per-sub-task
// truth. The kid_daily_checklist parent rollup ("zone-morning-${date}" and
// "zone-afternoon-${date}") auto-flips when ALL sub-tasks are done. Manual
// parent tap from the daily list is a separate path (logTaskCompletion
// category='zone') that flips just the parent — sub-tasks stay actual.

export interface ZoneSubtaskResult {
  kid: string
  zone_key: string
  date: string
  zone_complete: boolean
  zone_total: number
  zone_done: number
}

interface LogZoneSubtaskOpts {
  rotationId: number  // zone_task_rotation.id
}

interface LogZoneCompleteAllOpts {
  kid: string
  zoneKey: string
  date?: string
}

/**
 * Mark a single zone sub-task complete. Updates zone_task_rotation, then
 * recomputes the parent rollup in kid_daily_checklist (auto-flip on
 * last sub-task).
 */
export async function logZoneSubtask(opts: LogZoneSubtaskOpts): Promise<ZoneSubtaskResult> {
  return runZoneSubtaskFlip(opts.rotationId, true)
}

export async function unlogZoneSubtask(opts: LogZoneSubtaskOpts): Promise<ZoneSubtaskResult> {
  return runZoneSubtaskFlip(opts.rotationId, false)
}

/**
 * Bulk-complete all uncompleted sub-tasks for a kid + zone + date.
 * Replaces the existing complete_all action's raw UPDATE so the parent
 * rollup stays in sync atomically.
 */
export async function logZoneCompleteAll(opts: LogZoneCompleteAllOpts): Promise<ZoneSubtaskResult> {
  const date = opts.date || todayChicago()
  const kid = opts.kid.toLowerCase()
  return transaction(async (q) => {
    await q(
      `UPDATE zone_task_rotation SET completed = TRUE, completed_at = NOW()
        WHERE zone_key = $1 AND kid_name = $2 AND assigned_date = $3 AND completed = FALSE`,
      [opts.zoneKey, kid, date]
    )
    return syncZoneParentRollup(q, kid, opts.zoneKey, date)
  })
}

async function runZoneSubtaskFlip(rotationId: number, completed: boolean): Promise<ZoneSubtaskResult> {
  return transaction(async (q) => {
    const rows = await q(
      `UPDATE zone_task_rotation
          SET completed = $2,
              completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        WHERE id = $1
       RETURNING kid_name, zone_key, assigned_date`,
      [rotationId, completed]
    )
    if (rows.length === 0) {
      throw new Error(`zone_task_rotation row ${rotationId} not found`)
    }
    const { kid_name, zone_key, assigned_date } = rows[0]
    const date = String(assigned_date).slice(0, 10)
    return syncZoneParentRollup(q, kid_name, zone_key, date)
  })
}

async function syncZoneParentRollup(
  q: TxQuery, kid: string, zoneKey: string, date: string
): Promise<ZoneSubtaskResult> {
  const counts = await q(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE completed = TRUE)::int AS done
       FROM zone_task_rotation
      WHERE kid_name = $1 AND zone_key = $2 AND assigned_date = $3
        AND bonus_task IS NOT TRUE`,
    [kid, zoneKey, date]
  )
  const total = counts[0]?.total ?? 0
  const done = counts[0]?.done ?? 0
  const allDone = total > 0 && done >= total

  // Look up display name; fall back to a humanized zone_key on miss.
  const zd = await q(`SELECT display_name FROM zone_definitions WHERE zone_key = $1`, [zoneKey])
  const displayName: string = zd[0]?.display_name || humanizeZoneKey(zoneKey)
  const completedAt = allDone ? new Date().toISOString() : null

  for (const slot of ['morning', 'afternoon'] as const) {
    const eventId = `zone-${slot}-${date}`
    const slotLabel = slot[0].toUpperCase() + slot.slice(1)
    const summary = `${slotLabel} Zone Chores: ${displayName}`
    await q(
      `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (child_name, event_date, event_id)
       DO UPDATE SET completed = EXCLUDED.completed,
                     completed_at = CASE WHEN EXCLUDED.completed
                                         THEN COALESCE(kid_daily_checklist.completed_at, EXCLUDED.completed_at)
                                         ELSE NULL END`,
      [kid, date, eventId, summary, allDone, completedAt]
    )
  }

  return { kid, zone_key: zoneKey, date, zone_complete: allDone, zone_total: total, zone_done: done }
}

function humanizeZoneKey(key: string): string {
  return key.split('_').map(s => s ? s[0].toUpperCase() + s.slice(1) : s).join(' ')
}

// ── Event-id → category resolver ──

export interface ResolvedChecklistEvent {
  category: CompletionCategory
  taskKey: string
  meta?: LogTaskCompletionOpts['meta']
}

/**
 * Map a kid_daily_checklist `event_id` (as produced by the seed in
 * src/app/api/kids/checklist/route.ts) back to the helper's category model.
 * Used by the toggle handlers so a single tap fans out to the right domain log.
 */
export function resolveChecklistEvent(eventId: string): ResolvedChecklistEvent {
  // Belle weekend grooming: belle-grooming-${task_dashed}-${YYYY-MM-DD}
  let m = eventId.match(/^belle-grooming-(.+)-(\d{4}-\d{2}-\d{2})$/)
  if (m) {
    return {
      category: 'belle_grooming',
      taskKey: m[1].replace(/-/g, '_'),
      meta: { weekend_start: m[2] },
    }
  }

  // Belle daily care: belle-${task_dashed}-${YYYY-MM-DD}
  m = eventId.match(/^belle-(.+)-(\d{4}-\d{2}-\d{2})$/)
  if (m) {
    return {
      category: 'belle_care',
      taskKey: m[1].replace(/-/g, '_'),
    }
  }

  // Pet care: pet-${pet}-${YYYY-MM-DD} or pet-spike-helper-${YYYY-MM-DD}
  m = eventId.match(/^pet-(spike-helper|spike|hades|midnight)-(\d{4}-\d{2}-\d{2})$/)
  if (m) {
    return {
      category: 'pet_care',
      taskKey: m[1],
      meta: { pet_name: m[1].replace('-helper', '') },
    }
  }

  // Zone parent rollup: zone-${time_of_day}-${YYYY-MM-DD} (morning/afternoon)
  m = eventId.match(/^zone-(morning|afternoon)-(\d{4}-\d{2}-\d{2})$/)
  if (m) {
    return {
      category: 'zone',
      taskKey: eventId,
    }
  }

  // Default: generic daily task — fanout writes only to kid_daily_checklist.
  return { category: 'daily', taskKey: eventId }
}
