import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { KID_GRADES } from '@/lib/constants'

// Canonical subjects used in the seeded enrichment_activities library (176 rows).
// Mirrored on the client (KidEnrichmentView CATEGORIES).
const SUBJECTS = [
  { id: 'elar',             label: 'ELAR',                icon: '📖' },
  { id: 'math',             label: 'Math',                icon: '🔢' },
  { id: 'science',          label: 'Science',             icon: '🔬' },
  { id: 'social_studies',   label: 'Social Studies',      icon: '🌍' },
  { id: 'financial_literacy', label: 'Financial Literacy', icon: '💰' },
  { id: 'art',              label: 'Art & Creativity',    icon: '🎨' },
  { id: 'pe_outdoor',       label: 'PE / Outdoor',        icon: '🏃' },
  { id: 'life_skills',      label: 'Life Skills',         icon: '🧺' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_activities'
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const subject = searchParams.get('subject') || searchParams.get('category') // accept either key

  try {
    if (action === 'get_categories' || action === 'get_subjects') {
      return NextResponse.json({ categories: SUBJECTS, subjects: SUBJECTS })
    }

    if (action === 'get_subject_counts') {
      // True library counts per subject, without the LIMIT 100 row cap that get_activities uses.
      // Parent side uses this for the summary grid so counts reflect the full seeded library.
      const rows = await db.query(
        `SELECT subject, COUNT(*)::int AS count
         FROM enrichment_activities
         WHERE active = TRUE
         GROUP BY subject`
      ).catch((e) => { console.error('enrichment subject_counts error:', e); return [] })
      return NextResponse.json({ counts: rows })
    }

    if (action === 'get_activities') {
      // enrichment_activities is a SHARED LIBRARY (not per-kid). Filter by subject
      // and grade range if a kid is supplied. Only return active rows.
      const grade = kid ? (KID_GRADES[kid] || 5) : null
      let sql = `SELECT id, title, description, subject, duration_min, location, solo_or_group,
                        min_players, max_players, materials, accessibility_conflicts,
                        grade_min, grade_max, financial_level, gem_reward, active, created_at
                 FROM enrichment_activities WHERE active = true`
      const params: any[] = []
      if (subject) { params.push(subject); sql += ` AND subject = $${params.length}` }
      if (grade != null) {
        params.push(grade)
        sql += ` AND (grade_min IS NULL OR grade_min <= $${params.length})
                 AND (grade_max IS NULL OR grade_max >= $${params.length})`
      }
      sql += ` ORDER BY created_at DESC LIMIT 100`
      const rows = await db.query(sql, params).catch((e) => {
        console.error('enrichment get_activities error:', e)
        return []
      })
      return NextResponse.json({ activities: rows })
    }

    if (action === 'get_monthly_summary') {
      // Per-kid monthly rollup now comes from kid_activity_log where activity_source='enrichment'.
      const month = searchParams.get('month')
      const monthStart = month
        ? `${month}-01`
        : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).slice(0, 8) + '01'
      const rows = await db.query(
        `SELECT kal.child_name AS kid_name,
                ea.subject,
                COUNT(*)::int AS count,
                COALESCE(SUM(kal.duration_minutes), 0)::int AS total_minutes,
                COALESCE(SUM(ea.gem_reward), 0)::int AS total_gems
         FROM kid_activity_log kal
         LEFT JOIN enrichment_activities ea ON ea.id = kal.source_id
         WHERE kal.activity_source = 'enrichment'
           AND kal.log_date >= $1::date
           AND kal.log_date < ($1::date + INTERVAL '1 month')
         GROUP BY kal.child_name, ea.subject
         ORDER BY kal.child_name, total_minutes DESC`,
        [monthStart]
      ).catch((e) => { console.error('enrichment monthly_summary error:', e); return [] })
      return NextResponse.json({ summary: rows, month: monthStart })
    }

    if (action === 'get_recent_all_kids') {
      // Parent-side recent log feed across every kid. Joins kid_activity_log → enrichment_activities.
      const rows = await db.query(
        `SELECT kal.id AS log_id, kal.child_name AS kid_name, kal.log_date, kal.duration_minutes,
                kal.activity_type AS subject, kal.notes,
                ea.id AS activity_id, ea.title, ea.gem_reward
         FROM kid_activity_log kal
         LEFT JOIN enrichment_activities ea ON ea.id = kal.source_id
         WHERE kal.activity_source = 'enrichment'
         ORDER BY kal.log_date DESC, kal.created_at DESC
         LIMIT 25`
      ).catch((e) => { console.error('enrichment recent_all_kids error:', e); return [] })
      return NextResponse.json({ activities: rows })
    }

    if (action === 'get_recent_for_kid') {
      // What has this kid done recently from the enrichment library?
      if (!kid) return NextResponse.json({ activities: [] })
      const rows = await db.query(
        `SELECT kal.id AS log_id, kal.log_date, kal.duration_minutes, kal.rating, kal.notes,
                ea.id AS activity_id, ea.title, ea.subject, ea.duration_min, ea.gem_reward
         FROM kid_activity_log kal
         LEFT JOIN enrichment_activities ea ON ea.id = kal.source_id
         WHERE kal.child_name = $1
           AND kal.activity_source = 'enrichment'
         ORDER BY kal.log_date DESC, kal.created_at DESC
         LIMIT 25`,
        [kid]
      ).catch((e) => { console.error('enrichment recent_for_kid error:', e); return [] })
      return NextResponse.json({ activities: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Enrichment GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_activity') {
      // Canonical log: writes ONE row into kid_activity_log with activity_source='enrichment'
      // and source_id pointing at the enrichment_activities row.
      const { kid_name, activity_id, title, subject, duration_minutes, rating, notes } = body
      if (!kid_name) {
        return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      }
      const kid = String(kid_name).toLowerCase()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      // Prefer looking up the library row to get accurate duration + gems.
      let libRow: any = null
      if (activity_id) {
        const rows = await db.query(
          `SELECT id, title, subject, duration_min, gem_reward FROM enrichment_activities WHERE id = $1`,
          [activity_id]
        ).catch(() => [])
        libRow = rows?.[0] || null
      }

      const activityType = libRow?.subject || subject || 'enrichment'
      const dur = duration_minutes ?? libRow?.duration_min ?? 0
      const gems = libRow?.gem_reward ?? 2
      const sourceId = libRow?.id ?? activity_id ?? null

      const logRows = await db.query(
        `INSERT INTO kid_activity_log
           (child_name, activity_type, duration_minutes, notes, log_date,
            activity_source, source_id, rating)
         VALUES ($1, $2, $3, $4, $5, 'enrichment', $6, $7)
         RETURNING *`,
        [kid, activityType, dur, notes || title || null, today, sourceId, rating || null]
      )

      // Award gems (non-fatal if tables don't exist yet).
      await db.query(
        `UPDATE digi_pets SET gem_balance = COALESCE(gem_balance, 0) + $2 WHERE kid_name = $1`,
        [kid, gems]
      ).catch(() => {})
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, description)
         VALUES ($1, $2, 'enrichment', $3)`,
        [kid, gems, `${activityType}: ${libRow?.title || title || 'enrichment activity'}`]
      ).catch(() => {})

      return NextResponse.json({ success: true, log: logRows[0], gems_earned: gems })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Enrichment POST error:', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
