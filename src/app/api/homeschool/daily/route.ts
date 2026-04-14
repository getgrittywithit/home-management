import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

// ============================================================================
// Homeschool Daily Engine — per-kid subjects + per-date task instances
// ============================================================================

const TASK_FIELDS = [
  'subject_id', 'subject_name', 'subject_icon', 'title', 'description',
  'duration_min', 'sort_order', 'resource_url', 'resource_file', 'is_required',
  'status', 'started_at', 'completed_at', 'time_spent_min', 'quality_rating',
  'kid_notes', 'parent_feedback', 'needs_help', 'help_subject', 'task_date',
]

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
}

function todayIso() {
  // Use Chicago TZ for "today" — matches the family's local reality
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

// ----------------------------------------------------------------------------
// GET
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''

  try {
    switch (action) {
      case 'list_subjects': {
        const kidName = searchParams.get('kid_name')?.toLowerCase()
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const rows = await db.query(
          `SELECT * FROM homeschool_subjects
           WHERE kid_name = $1 AND is_active = TRUE
           ORDER BY sort_order, subject_name`,
          [kidName]
        )
        return NextResponse.json({ subjects: rows })
      }

      case 'list_all_subjects': {
        const rows = await db.query(
          `SELECT * FROM homeschool_subjects
           WHERE is_active = TRUE
           ORDER BY kid_name, sort_order, subject_name`
        )
        return NextResponse.json({ subjects: rows })
      }

      case 'list_tasks': {
        const kidName = searchParams.get('kid_name')?.toLowerCase()
        const date = searchParams.get('date') || todayIso()
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const rows = await db.query(
          `SELECT * FROM homeschool_daily_tasks
           WHERE kid_name = $1 AND task_date = $2
           ORDER BY
             CASE status WHEN 'completed' THEN 2 WHEN 'skipped' THEN 3 ELSE 1 END,
             sort_order, created_at`,
          [kidName, date]
        )
        const totals = {
          total: rows.length,
          completed: rows.filter((r: any) => r.status === 'completed').length,
          in_progress: rows.filter((r: any) => r.status === 'in_progress').length,
          needs_help: rows.filter((r: any) => r.needs_help).length,
          total_min: rows.reduce((s: number, r: any) => s + (r.duration_min || 0), 0),
          spent_min: rows.reduce((s: number, r: any) => s + (r.time_spent_min || 0), 0),
        }
        return NextResponse.json({ tasks: rows, totals, date })
      }

      case 'daily_summary': {
        // Per-kid aggregation for parent overview
        const date = searchParams.get('date') || todayIso()
        const rows = await db.query(
          `SELECT kid_name,
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                  COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
                  COUNT(*) FILTER (WHERE needs_help = TRUE)::int AS needs_help,
                  COALESCE(SUM(duration_min), 0)::int AS total_min,
                  COALESCE(SUM(time_spent_min), 0)::int AS spent_min,
                  MAX(completed_at) AS last_completed_at,
                  MAX(started_at) AS last_activity_at
           FROM homeschool_daily_tasks
           WHERE task_date = $1
           GROUP BY kid_name`,
          [date]
        )

        // Current task (oldest in_progress, else first pending) for each kid
        const current = await db.query(
          `SELECT DISTINCT ON (kid_name) kid_name, id, title, subject_name, subject_icon, status
           FROM homeschool_daily_tasks
           WHERE task_date = $1 AND status IN ('in_progress','pending')
           ORDER BY kid_name,
             CASE status WHEN 'in_progress' THEN 0 ELSE 1 END,
             sort_order, created_at`,
          [date]
        )
        const currentByKid: Record<string, any> = {}
        for (const r of current) currentByKid[r.kid_name] = r

        // Active help request (most recent) per kid
        const helps = await db.query(
          `SELECT DISTINCT ON (kid_name) kid_name, id, title, subject_name, subject_icon, help_subject, kid_notes, help_requested_at
           FROM homeschool_daily_tasks
           WHERE task_date = $1 AND needs_help = TRUE
           ORDER BY kid_name, help_requested_at DESC`,
          [date]
        )
        const helpByKid: Record<string, any> = {}
        for (const r of helps) helpByKid[r.kid_name] = r

        return NextResponse.json({ date, per_kid: rows, current: currentByKid, help: helpByKid })
      }

      case 'week_summary': {
        // Rolling 5-day window for the overview's "This Week at a Glance" grid.
        // Defaults to Mon-Fri of the current week.
        const start = searchParams.get('start') || (() => {
          const d = new Date()
          const day = d.getDay() // 0=Sun..6=Sat
          const mondayOffset = day === 0 ? -6 : 1 - day
          d.setDate(d.getDate() + mondayOffset)
          return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        })()
        const rows = await db.query(
          `SELECT kid_name, task_date::text,
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                  COUNT(*) FILTER (WHERE needs_help = TRUE)::int AS needs_help
           FROM homeschool_daily_tasks
           WHERE task_date >= $1::date AND task_date < ($1::date + INTERVAL '7 days')
           GROUP BY kid_name, task_date
           ORDER BY kid_name, task_date`,
          [start]
        )
        return NextResponse.json({ start, rows })
      }

      case 'list_templates': {
        const kidName = searchParams.get('kid_name')?.toLowerCase()
        if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const rows = await db.query(
          `SELECT * FROM homeschool_templates
           WHERE kid_name = $1 AND is_active = TRUE
           ORDER BY day_of_week, sort_order, title`,
          [kidName]
        )
        return NextResponse.json({ templates: rows })
      }

      default:
        return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('homeschool/daily GET error:', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

// ----------------------------------------------------------------------------
// POST
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { action, ...data } = body

  try {
    switch (action) {
      // ------------------------------------------------------------------
      // Subject CRUD
      // ------------------------------------------------------------------
      case 'create_subject': {
        const {
          kid_name, subject_name, subject_icon, color, sort_order,
          default_duration_min, curriculum, notes,
        } = data
        if (!kid_name || !subject_name) {
          return NextResponse.json({ error: 'kid_name and subject_name required' }, { status: 400 })
        }
        const rows = await db.query(
          `INSERT INTO homeschool_subjects (
             kid_name, subject_name, subject_icon, color, sort_order,
             default_duration_min, curriculum, notes
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (kid_name, subject_name) DO UPDATE SET
             subject_icon = EXCLUDED.subject_icon,
             color = EXCLUDED.color,
             sort_order = EXCLUDED.sort_order,
             default_duration_min = EXCLUDED.default_duration_min,
             curriculum = EXCLUDED.curriculum,
             notes = EXCLUDED.notes,
             is_active = TRUE,
             updated_at = NOW()
           RETURNING *`,
          [
            kid_name.toLowerCase(), subject_name, subject_icon || '📚',
            color || '#4A90D9', sort_order ?? 0, default_duration_min ?? 30,
            curriculum || null, notes || null,
          ]
        )
        return NextResponse.json({ subject: rows[0] }, { status: 201 })
      }

      case 'update_subject': {
        const { id, subject_name, subject_icon, color, sort_order, default_duration_min, curriculum, notes } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const set: string[] = []
        const params: any[] = [id]
        const push = (k: string, v: any) => {
          if (v !== undefined) { params.push(v); set.push(`${k} = $${params.length}`) }
        }
        push('subject_name', subject_name)
        push('subject_icon', subject_icon)
        push('color', color)
        push('sort_order', sort_order)
        push('default_duration_min', default_duration_min)
        push('curriculum', curriculum)
        push('notes', notes)
        if (set.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        set.push('updated_at = NOW()')
        const rows = await db.query(
          `UPDATE homeschool_subjects SET ${set.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        return NextResponse.json({ subject: rows[0] })
      }

      case 'archive_subject': {
        const { id, restore } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE homeschool_subjects SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id, !!restore]
        )
        return NextResponse.json({ subject: rows[0] })
      }

      // ------------------------------------------------------------------
      // Task CRUD
      // ------------------------------------------------------------------
      case 'create_task': {
        const {
          kid_name, subject_id, task_date, title, description,
          duration_min, sort_order, resource_url, is_required,
        } = data
        if (!kid_name || !task_date || !title) {
          return NextResponse.json({ error: 'kid_name, task_date, title required' }, { status: 400 })
        }

        // Look up subject info (name + icon) from subject_id if provided
        let subjectName = data.subject_name || null
        let subjectIcon = data.subject_icon || '📚'
        if (subject_id) {
          const s = await db.query(`SELECT subject_name, subject_icon FROM homeschool_subjects WHERE id = $1`, [subject_id]).catch(() => [])
          if (s[0]) {
            subjectName = s[0].subject_name
            subjectIcon = s[0].subject_icon
          }
        }
        if (!subjectName) subjectName = 'Other'

        const rows = await db.query(
          `INSERT INTO homeschool_daily_tasks (
             kid_name, subject_id, subject_name, subject_icon, task_date, title, description,
             duration_min, sort_order, resource_url, is_required
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING *`,
          [
            kid_name.toLowerCase(), subject_id || null, subjectName, subjectIcon,
            task_date, title, description || null,
            duration_min ?? null, sort_order ?? 0, resource_url || null,
            is_required === undefined ? true : !!is_required,
          ]
        )
        return NextResponse.json({ task: rows[0] }, { status: 201 })
      }

      case 'update_task': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const set: string[] = []
        const params: any[] = [id]
        for (const [k, v] of Object.entries(updates)) {
          if (TASK_FIELDS.includes(k)) {
            params.push(v === '' ? null : v)
            set.push(`${k} = $${params.length}`)
          }
        }
        if (set.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        set.push('updated_at = NOW()')
        const rows = await db.query(
          `UPDATE homeschool_daily_tasks SET ${set.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        return NextResponse.json({ task: rows[0] })
      }

      case 'toggle_task': {
        // Pending → in_progress → completed → pending (cycle)
        const { id, target_status } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const current = await db.query(`SELECT status FROM homeschool_daily_tasks WHERE id = $1`, [id])
        if (!current[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
        let next: string
        if (target_status) {
          next = target_status
        } else {
          const cur = current[0].status
          next = cur === 'pending' ? 'in_progress' : cur === 'in_progress' ? 'completed' : 'pending'
        }
        const startedExpr = next === 'in_progress' ? 'COALESCE(started_at, NOW())' : next === 'pending' ? 'NULL' : 'started_at'
        const completedExpr = next === 'completed' ? 'NOW()' : next === 'pending' ? 'NULL' : 'completed_at'
        const rows = await db.query(
          `UPDATE homeschool_daily_tasks
           SET status = $2,
               started_at = ${startedExpr},
               completed_at = ${completedExpr},
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, next]
        )
        return NextResponse.json({ task: rows[0] })
      }

      case 'request_help': {
        const { id, help_subject, kid_notes } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE homeschool_daily_tasks
           SET needs_help = TRUE,
               help_subject = $2,
               kid_notes = COALESCE($3, kid_notes),
               help_requested_at = NOW(),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, help_subject || null, kid_notes || null]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
        // Notify parent
        const kidDisplay = titleCase(rows[0].kid_name)
        await createNotification({
          title: `${kidDisplay} needs help`,
          message: `${kidDisplay} is stuck on ${rows[0].subject_name}: ${help_subject || rows[0].title}`,
          source_type: 'homeschool_help',
          source_ref: `daily-task:${rows[0].id}`,
          link_tab: 'homeschool',
          icon: '🆘',
          target_role: 'parent',
        }).catch(() => {})
        return NextResponse.json({ task: rows[0] })
      }

      case 'parent_reply': {
        const { id, parent_feedback } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE homeschool_daily_tasks
           SET parent_feedback = $2,
               needs_help = FALSE,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id, parent_feedback || null]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
        // Notify kid that Mom/Dad replied
        await createNotification({
          title: 'Mom/Dad replied to your question',
          message: `${rows[0].subject_name}: ${parent_feedback?.slice(0, 80) || 'Check your school day'}`,
          source_type: 'homeschool_help_reply',
          source_ref: `daily-task:${rows[0].id}`,
          link_tab: 'my-day',
          icon: '💬',
          target_role: 'kid',
          kid_name: rows[0].kid_name,
        }).catch(() => {})
        return NextResponse.json({ task: rows[0] })
      }

      case 'delete_task': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM homeschool_daily_tasks WHERE id = $1`, [id])
        return NextResponse.json({ ok: true })
      }

      case 'copy_from_date': {
        // Copy all tasks from source_date to target_date for a kid
        const { kid_name, source_date, target_date } = data
        if (!kid_name || !source_date || !target_date) {
          return NextResponse.json({ error: 'kid_name, source_date, target_date required' }, { status: 400 })
        }
        const rows = await db.query(
          `INSERT INTO homeschool_daily_tasks (
             kid_name, subject_id, subject_name, subject_icon, task_date, title, description,
             duration_min, sort_order, resource_url, is_required
           )
           SELECT kid_name, subject_id, subject_name, subject_icon, $3::date, title, description,
                  duration_min, sort_order, resource_url, is_required
           FROM homeschool_daily_tasks
           WHERE kid_name = $1 AND task_date = $2
           RETURNING *`,
          [kid_name.toLowerCase(), source_date, target_date]
        )
        return NextResponse.json({ tasks: rows, copied: rows.length })
      }

      case 'apply_subject_template': {
        // Create one pending task per active subject for a given kid+date
        const { kid_name, task_date } = data
        if (!kid_name || !task_date) {
          return NextResponse.json({ error: 'kid_name and task_date required' }, { status: 400 })
        }
        const subs = await db.query(
          `SELECT id, subject_name, subject_icon, default_duration_min, sort_order
           FROM homeschool_subjects
           WHERE kid_name = $1 AND is_active = TRUE
           ORDER BY sort_order, subject_name`,
          [kid_name.toLowerCase()]
        )
        if (subs.length === 0) return NextResponse.json({ tasks: [], created: 0 })
        const created: any[] = []
        for (const s of subs) {
          const r = await db.query(
            `INSERT INTO homeschool_daily_tasks (
               kid_name, subject_id, subject_name, subject_icon, task_date, title, duration_min, sort_order
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [
              kid_name.toLowerCase(), s.id, s.subject_name, s.subject_icon,
              task_date, `${s.subject_name} — set assignment`, s.default_duration_min, s.sort_order,
            ]
          )
          created.push(r[0])
        }
        return NextResponse.json({ tasks: created, created: created.length })
      }

      // ------------------------------------------------------------------
      // save_template — bulk upsert a kid's Mon-Fri weekly template
      // Replaces the existing template for the kid with the incoming one.
      // Payload: { kid_name, entries: [{ day_of_week, subject_id, title, description, duration_min, resource_url, sort_order }] }
      // ------------------------------------------------------------------
      case 'save_template': {
        const { kid_name, entries } = data
        if (!kid_name || !Array.isArray(entries)) {
          return NextResponse.json({ error: 'kid_name and entries[] required' }, { status: 400 })
        }
        // Clear existing template (hard delete — simpler than diff-and-merge)
        await db.query(`DELETE FROM homeschool_templates WHERE kid_name = $1`, [kid_name.toLowerCase()])

        const inserted: any[] = []
        for (const e of entries) {
          if (e.day_of_week == null || !e.title) continue
          let subjectName = e.subject_name || null
          let subjectIcon = e.subject_icon || '📚'
          if (e.subject_id && !subjectName) {
            const s = await db.query(
              `SELECT subject_name, subject_icon FROM homeschool_subjects WHERE id = $1`,
              [e.subject_id]
            ).catch(() => [])
            if (s[0]) {
              subjectName = s[0].subject_name
              subjectIcon = s[0].subject_icon
            }
          }
          if (!subjectName) subjectName = 'Other'

          const r = await db.query(
            `INSERT INTO homeschool_templates (
               kid_name, day_of_week, subject_id, subject_name, subject_icon,
               title, description, duration_min, resource_url, sort_order
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING *`,
            [
              kid_name.toLowerCase(),
              e.day_of_week,
              e.subject_id || null,
              subjectName,
              subjectIcon,
              e.title,
              e.description || null,
              e.duration_min ?? null,
              e.resource_url || null,
              e.sort_order ?? 0,
            ]
          )
          inserted.push(r[0])
        }
        return NextResponse.json({ templates: inserted, count: inserted.length }, { status: 201 })
      }

      // ------------------------------------------------------------------
      // apply_template_range — generate daily tasks for a date range from template
      // Skips days that already have tasks (won't overwrite manual edits).
      // Payload: { kid_name, start_date, end_date }
      // ------------------------------------------------------------------
      case 'apply_template_range': {
        const { kid_name, start_date, end_date } = data
        if (!kid_name || !start_date || !end_date) {
          return NextResponse.json({ error: 'kid_name, start_date, end_date required' }, { status: 400 })
        }
        const kid = kid_name.toLowerCase()
        const template = await db.query(
          `SELECT * FROM homeschool_templates WHERE kid_name = $1 AND is_active = TRUE
           ORDER BY day_of_week, sort_order`,
          [kid]
        )
        if (template.length === 0) return NextResponse.json({ created: 0, skipped: 0, days: [] })

        const byDow: Record<number, any[]> = {}
        for (const t of template) {
          if (!byDow[t.day_of_week]) byDow[t.day_of_week] = []
          byDow[t.day_of_week].push(t)
        }

        let created = 0
        const skipped: string[] = []
        const days: string[] = []
        const start = new Date(start_date + 'T12:00:00Z')
        const end = new Date(end_date + 'T12:00:00Z')
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
          const iso = d.toISOString().slice(0, 10)
          // getDay(): 0=Sun, 1=Mon, ... 6=Sat — matches our day_of_week encoding
          const dow = d.getUTCDay()
          const entries = byDow[dow] || []
          if (entries.length === 0) continue

          // Skip this day if tasks already exist (don't overwrite manual edits)
          const existing = await db.query(
            `SELECT 1 FROM homeschool_daily_tasks WHERE kid_name = $1 AND task_date = $2 LIMIT 1`,
            [kid, iso]
          )
          if (existing.length > 0) { skipped.push(iso); continue }

          for (const t of entries) {
            await db.query(
              `INSERT INTO homeschool_daily_tasks (
                 kid_name, subject_id, subject_name, subject_icon, task_date, title, description,
                 duration_min, sort_order, resource_url
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [
                kid, t.subject_id, t.subject_name, t.subject_icon, iso,
                t.title, t.description, t.duration_min, t.sort_order, t.resource_url,
              ]
            )
            created++
          }
          days.push(iso)
        }

        return NextResponse.json({ created, skipped_days: skipped, days })
      }

      // ------------------------------------------------------------------
      // copy_template — duplicate source_kid's template onto target_kid
      // Keeps existing subject_id mappings NULL (template renders use
      // denormalized subject_name/icon fields, so this is safe).
      // Payload: { source_kid, target_kid }
      // ------------------------------------------------------------------
      case 'copy_template': {
        const { source_kid, target_kid } = data
        if (!source_kid || !target_kid) {
          return NextResponse.json({ error: 'source_kid and target_kid required' }, { status: 400 })
        }
        const src = source_kid.toLowerCase()
        const tgt = target_kid.toLowerCase()
        if (src === tgt) return NextResponse.json({ error: 'source and target are the same' }, { status: 400 })

        // Clear target's current template
        await db.query(`DELETE FROM homeschool_templates WHERE kid_name = $1`, [tgt])

        const rows = await db.query(
          `INSERT INTO homeschool_templates (
             kid_name, day_of_week, subject_id, subject_name, subject_icon,
             title, description, duration_min, resource_url, sort_order
           )
           SELECT $2, day_of_week, NULL, subject_name, subject_icon,
                  title, description, duration_min, resource_url, sort_order
           FROM homeschool_templates
           WHERE kid_name = $1 AND is_active = TRUE
           RETURNING *`,
          [src, tgt]
        )
        return NextResponse.json({ copied: rows.length, templates: rows })
      }

      // ------------------------------------------------------------------
      // auto_populate_today — safety net + cron target
      // For every homeschool kid, if today has no tasks, create them from
      // their weekday template. Idempotent — won't overwrite existing days.
      // ------------------------------------------------------------------
      case 'auto_populate_today': {
        const iso = todayIso()
        const d = new Date(iso + 'T12:00:00Z')
        const dow = d.getUTCDay()

        const kids = ['amos', 'ellie', 'wyatt', 'hannah']
        const results: Record<string, { created: number; skipped: boolean }> = {}
        for (const kid of kids) {
          const existing = await db.query(
            `SELECT 1 FROM homeschool_daily_tasks WHERE kid_name = $1 AND task_date = $2 LIMIT 1`,
            [kid, iso]
          )
          if (existing.length > 0) { results[kid] = { created: 0, skipped: true }; continue }

          const template = await db.query(
            `SELECT * FROM homeschool_templates
             WHERE kid_name = $1 AND day_of_week = $2 AND is_active = TRUE
             ORDER BY sort_order`,
            [kid, dow]
          )
          if (template.length === 0) { results[kid] = { created: 0, skipped: false }; continue }

          for (const t of template) {
            await db.query(
              `INSERT INTO homeschool_daily_tasks (
                 kid_name, subject_id, subject_name, subject_icon, task_date, title, description,
                 duration_min, sort_order, resource_url
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [
                kid, t.subject_id, t.subject_name, t.subject_icon, iso,
                t.title, t.description, t.duration_min, t.sort_order, t.resource_url,
              ]
            )
          }
          results[kid] = { created: template.length, skipped: false }
        }

        return NextResponse.json({ date: iso, day_of_week: dow, results })
      }

      // ------------------------------------------------------------------
      // nudge_kid — send a notification to a kid's portal
      // ------------------------------------------------------------------
      case 'nudge_kid': {
        const { kid_name, message } = data
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const display = titleCase(kid)
        await createNotification({
          title: 'Mom says: time to start school!',
          message: message || `${display}, time to open your School Day and start your tasks.`,
          source_type: 'homeschool_nudge',
          source_ref: `nudge:${kid}:${Date.now()}`,
          link_tab: 'my-day',
          icon: '⏰',
          target_role: 'kid',
          kid_name: kid,
        }).catch(() => {})
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('homeschool/daily POST error:', err)
    return NextResponse.json({ error: 'Request failed', detail: String(err) }, { status: 500 })
  }
}
