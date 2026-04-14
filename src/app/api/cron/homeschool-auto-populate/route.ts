import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// Vercel Cron — Homeschool Auto-Populate
// Runs every morning at 6:00 AM CT (11:00 UTC). Creates today's daily tasks
// from each kid's weekday template if they don't already exist. Idempotent.
//
// Authenticated via the CRON_SECRET env var when present. Vercel automatically
// sends `Authorization: Bearer <CRON_SECRET>` on scheduled invocations.
// ============================================================================

function todayIsoCT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export async function GET(req: NextRequest) {
  // Optional auth check — prevents random GETs from triggering the job
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const iso = todayIsoCT()
    const d = new Date(iso + 'T12:00:00Z')
    const dow = d.getUTCDay()

    const kids = ['amos', 'ellie', 'wyatt', 'hannah']
    const results: Record<string, { created: number; skipped_reason?: string }> = {}

    for (const kid of kids) {
      const existing = await db.query(
        `SELECT 1 FROM homeschool_daily_tasks WHERE kid_name = $1 AND task_date = $2 LIMIT 1`,
        [kid, iso]
      )
      if (existing.length > 0) {
        results[kid] = { created: 0, skipped_reason: 'tasks already exist' }
        continue
      }

      const template = await db.query(
        `SELECT * FROM homeschool_templates
         WHERE kid_name = $1 AND day_of_week = $2 AND is_active = TRUE
         ORDER BY sort_order`,
        [kid, dow]
      )
      if (template.length === 0) {
        results[kid] = { created: 0, skipped_reason: 'no template for this day' }
        continue
      }

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
      results[kid] = { created: template.length }
    }

    console.log('[cron] homeschool-auto-populate', { date: iso, dow, results })
    return NextResponse.json({ ok: true, date: iso, day_of_week: dow, results })
  } catch (err) {
    console.error('[cron] auto-populate failed', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
}
