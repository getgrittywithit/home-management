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
                  MAX(completed_at) AS last_completed_at
           FROM homeschool_daily_tasks
           WHERE task_date = $1
           GROUP BY kid_name`,
          [date]
        )
        return NextResponse.json({ date, per_kid: rows })
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

      default:
        return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('homeschool/daily POST error:', err)
    return NextResponse.json({ error: 'Request failed', detail: String(err) }, { status: 500 })
  }
}
