import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  medical: ['meds', 'doctor', 'appointment', 'prescription', 'cvs', 'pharmacy', 'gonzales', 'stonebridge', 'therapy', 'symptoms', 'dosage', 'refill', 'adderall', 'focalin', 'clonidine', 'lexapro'],
  school: ['iep', '504', 'grade', 'attendance', 'teacher', 'collentine', 'dspain', 'risner', 'bisd', 'champion', 'bmsn', 'ard', 'jrotc'],
  triton: ['client', 'estimate', 'invoice', 'job', 'drywall', 'paint', 'triton', 'pedro', 'fatima', 'tiffany', 'victoria', 'annelise', 'handyman'],
  grocery: ['grocery', 'snap', 'heb', 'walmart', 'pantry', 'recipe', 'ingredients', 'shopping list', 'food', 'dinner', 'meal'],
  household: ['laundry', 'zone', 'clean', 'belle', 'midnight', 'spike', 'hades', 'yard', 'chore'],
  homeschool: ['lesson', 'curriculum', 'math buddy', 'book buddy', 'focus time', 'subject', 'reading level', 'elar', 'homeschool'],
  finance: ['bank', 'ally', 'copilot', 'bill', 'budget', 'payment', 'insurance'],
}

function autoCategorize(text: string) {
  const lower = text.toLowerCase()
  const kidName = KIDS.find(k => lower.includes(k)) || null
  let domain: string | null = null
  for (const [d, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) { domain = d; break }
  }
  const urgent = ['urgent', 'asap', 'emergency', 'today', 'now', 'deadline', 'overdue'].some(kw => lower.includes(kw))
  return { domain, kid_name: kidName, priority: urgent ? 'urgent' : 'normal' as string }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list_captures'

  try {
    if (action === 'list_captures') {
      const status = searchParams.get('status') || 'unsorted'
      const domain = searchParams.get('domain')
      let sql = `SELECT * FROM quick_captures`
      const params: any[] = []
      const conds: string[] = []
      if (status !== 'all') { params.push(status); conds.push(`status = $${params.length}`) }
      if (domain) { params.push(domain); conds.push(`domain = $${params.length}`) }
      if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
      sql += ` ORDER BY captured_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ captures: rows })
    }

    if (action === 'list_notes') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const category = searchParams.get('category')
      const flagged = searchParams.get('flagged') === '1'
      let sql = `SELECT * FROM kid_running_notes`
      const params: any[] = []
      const conds: string[] = []
      if (kidName) { params.push(kidName); conds.push(`kid_name = $${params.length}`) }
      if (category) { params.push(category); conds.push(`category = $${params.length}`) }
      if (flagged) conds.push(`flagged_for_meeting = TRUE`)
      if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`
      sql += ` ORDER BY noted_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ notes: rows })
    }

    if (action === 'meeting_prep') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const notes = await db.query(
        `SELECT * FROM kid_running_notes WHERE kid_name = $1 AND flagged_for_meeting = TRUE ORDER BY noted_at DESC`, [kidName]
      ).catch(() => [])
      const moods = await db.query(
        `SELECT log_date, mood_score, mood FROM kid_mood_log WHERE child_name = $1 AND log_date >= CURRENT_DATE - 30 ORDER BY log_date`, [kidName]
      ).catch(() => [])
      const meds = await db.query(
        `SELECT * FROM med_adherence_log WHERE kid_name = $1 AND log_date >= CURRENT_DATE - 30 ORDER BY log_date`, [kidName]
      ).catch(() => [])
      return NextResponse.json({ notes, moods, meds })
    }

    if (action === 'domain_modes') {
      const rows = await db.query(`SELECT * FROM domain_mode_config WHERE is_active = TRUE ORDER BY sort_order`).catch(() => [])
      return NextResponse.json({ domains: rows })
    }

    if (action === 'domain_summary') {
      const domain = searchParams.get('domain')
      if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
      const captures = await db.query(`SELECT * FROM quick_captures WHERE domain = $1 AND status = 'unsorted' ORDER BY captured_at DESC LIMIT 10`, [domain]).catch(() => [])
      const notes = await db.query(`SELECT * FROM kid_running_notes WHERE category = $1 ORDER BY noted_at DESC LIMIT 10`, [domain]).catch(() => [])
      const tasks = await db.query(`SELECT * FROM parent_weekly_checklist WHERE domain = $1 AND is_recurring = TRUE ORDER BY day_of_week, sort_order`, [domain]).catch(() => [])
      return NextResponse.json({ captures, notes, tasks })
    }

    if (action === 'request_inbox') {
      const msgs = await db.query(`SELECT id, from_kid, message, created_at FROM family_messages WHERE parent_reply IS NULL AND archived_at IS NULL ORDER BY created_at DESC LIMIT 10`).catch(() => [])
      const grocery = await db.query(`SELECT * FROM kid_grocery_requests WHERE status = 'pending' ORDER BY created_at DESC`).catch(() => [])
      const health = await db.query(`SELECT * FROM kid_health_requests WHERE status = 'pending' ORDER BY created_at DESC`).catch(() => [])
      const calendar = await db.query(`SELECT * FROM kid_calendar_requests WHERE status = 'pending' ORDER BY created_at DESC`).catch(() => [])
      const captures = await db.query(`SELECT * FROM quick_captures WHERE status = 'unsorted' ORDER BY captured_at DESC LIMIT 10`).catch(() => [])
      return NextResponse.json({
        messages: msgs, grocery, health, calendar, captures,
        total: msgs.length + grocery.length + health.length + calendar.length + captures.length,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Brain GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'capture': {
        const { raw_text, domain: manualDomain, kid_name: manualKid, priority: manualPriority } = body
        if (!raw_text?.trim()) return NextResponse.json({ error: 'raw_text required' }, { status: 400 })
        const auto = autoCategorize(raw_text)
        const rows = await db.query(
          `INSERT INTO quick_captures (raw_text, domain, kid_name, priority) VALUES ($1, $2, $3, $4) RETURNING *`,
          [raw_text.trim(), manualDomain || auto.domain, manualKid || auto.kid_name, manualPriority || auto.priority]
        )
        return NextResponse.json({ capture: rows[0] }, { status: 201 })
      }

      case 'sort_capture': {
        const { id, domain, kid_name, converted_to, converted_ref } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE quick_captures SET status = 'sorted', domain = COALESCE($2, domain), kid_name = COALESCE($3, kid_name),
           converted_to = $4, converted_ref = $5, sorted_at = NOW() WHERE id = $1`,
          [id, domain || null, kid_name || null, converted_to || null, converted_ref || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'archive_capture': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE quick_captures SET status = 'archived' WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'add_note': {
        const { kid_name, note_text, category, flagged_for_meeting, tags } = body
        if (!kid_name || !note_text) return NextResponse.json({ error: 'kid_name + note_text required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO kid_running_notes (kid_name, note_text, category, flagged_for_meeting, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [kid_name.toLowerCase(), note_text.trim(), category || 'observation', flagged_for_meeting || false, tags || []]
        )
        return NextResponse.json({ note: rows[0] }, { status: 201 })
      }

      case 'flag_note': {
        const { id, flagged } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE kid_running_notes SET flagged_for_meeting = $2 WHERE id = $1`, [id, flagged ?? true])
        return NextResponse.json({ success: true })
      }

      case 'auto_categorize': {
        const { text } = body
        if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
        return NextResponse.json(autoCategorize(text))
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Brain POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
