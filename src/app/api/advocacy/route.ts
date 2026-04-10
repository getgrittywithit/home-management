import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS accommodation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_name TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    qualifying_disability TEXT,
    major_life_activity TEXT,
    eligibility_date DATE,
    plan_date DATE,
    next_review_date DATE,
    school_name TEXT,
    facilitator_name TEXT,
    facilitator_email TEXT,
    facilitator_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS accommodations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES accommodation_plans(id) ON DELETE CASCADE,
    kid_name TEXT NOT NULL,
    accommodation_text TEXT NOT NULL,
    category TEXT,
    applies_to TEXT,
    is_active BOOLEAN DEFAULT true,
    source TEXT,
    home_equivalent TEXT,
    home_implementation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS accommodation_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_name TEXT NOT NULL,
    gap_description TEXT NOT NULL,
    clinical_source TEXT NOT NULL,
    clinical_source_date DATE,
    recommendation TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'not_started',
    status_updated_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS advocacy_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_name TEXT NOT NULL,
    action_text TEXT NOT NULL,
    action_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'not_started',
    source TEXT,
    due_date DATE,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS clinical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_title TEXT NOT NULL,
    document_date DATE,
    provider_name TEXT,
    provider_org TEXT,
    key_findings TEXT,
    file_path TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  await db.query(`CREATE TABLE IF NOT EXISTS accommodation_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_name TEXT NOT NULL,
    accommodation_id UUID,
    schedule_type TEXT NOT NULL,
    day_of_week TEXT,
    time_slot TEXT,
    duration_minutes INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)
}

let ready = false
async function init() { if (!ready) { await ensureTables(); ready = true } }

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''
  const kid = searchParams.get('kid_name')

  try {
    switch (action) {
      case 'list_plans': {
        let sql = `SELECT * FROM accommodation_plans`
        const params: any[] = []
        if (kid) { params.push(kid); sql += ` WHERE kid_name = $1` }
        sql += ` ORDER BY kid_name, plan_type`
        const plans = await db.query(sql, params)
        return NextResponse.json({ plans })
      }

      case 'get_plan': {
        if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const plans = await db.query(`SELECT * FROM accommodation_plans WHERE kid_name = $1 AND status = 'active'`, [kid])
        const accommodations = await db.query(`SELECT * FROM accommodations WHERE kid_name = $1 AND is_active = true ORDER BY category, created_at`, [kid])
        const gaps = await db.query(`SELECT * FROM accommodation_gaps WHERE kid_name = $1 ORDER BY priority, created_at`, [kid])
        const actions = await db.query(`SELECT * FROM advocacy_actions WHERE kid_name = $1 AND status != 'done' ORDER BY priority, created_at`, [kid])
        const documents = await db.query(`SELECT * FROM clinical_documents WHERE kid_name = $1 ORDER BY document_date DESC`, [kid])
        return NextResponse.json({ plans, accommodations, gaps, actions, documents })
      }

      case 'list_gaps': {
        let sql = `SELECT * FROM accommodation_gaps`
        const params: any[] = []
        const conditions: string[] = []
        if (kid) { params.push(kid); conditions.push(`kid_name = $${params.length}`) }
        const status = searchParams.get('status')
        if (status) { params.push(status); conditions.push(`status = $${params.length}`) }
        const priority = searchParams.get('priority')
        if (priority) { params.push(priority); conditions.push(`priority = $${params.length}`) }
        if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
        sql += ` ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at`
        const gaps = await db.query(sql, params)
        return NextResponse.json({ gaps })
      }

      case 'list_actions': {
        let sql = `SELECT * FROM advocacy_actions`
        const params: any[] = []
        const conditions: string[] = []
        if (kid) { params.push(kid); conditions.push(`kid_name = $${params.length}`) }
        const status = searchParams.get('status')
        if (status) { params.push(status); conditions.push(`status = $${params.length}`) }
        const type = searchParams.get('type')
        if (type) { params.push(type); conditions.push(`action_type = $${params.length}`) }
        if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
        sql += ` ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at`
        const actions = await db.query(sql, params)
        return NextResponse.json({ actions })
      }

      case 'list_documents': {
        if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const documents = await db.query(`SELECT * FROM clinical_documents WHERE kid_name = $1 ORDER BY document_date DESC`, [kid])
        return NextResponse.json({ documents })
      }

      case 'get_schedule': {
        if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const schedule = await db.query(`SELECT * FROM accommodation_schedule WHERE kid_name = $1 AND is_active = true ORDER BY time_slot`, [kid])
        return NextResponse.json({ schedule })
      }

      case 'get_advocacy_summary': {
        const gapCounts = await db.query(
          `SELECT kid_name, priority, status, COUNT(*)::int as count FROM accommodation_gaps GROUP BY kid_name, priority, status`
        ).catch(() => [])
        const actionCounts = await db.query(
          `SELECT kid_name, priority, status, COUNT(*)::int as count FROM advocacy_actions WHERE status != 'done' GROUP BY kid_name, priority, status`
        ).catch(() => [])
        const upcomingReviews = await db.query(
          `SELECT kid_name, plan_type, next_review_date FROM accommodation_plans WHERE status = 'active' AND next_review_date IS NOT NULL ORDER BY next_review_date`
        ).catch(() => [])
        const urgentActions = await db.query(
          `SELECT * FROM advocacy_actions WHERE priority IN ('urgent', 'high') AND status NOT IN ('done', 'deferred') ORDER BY priority, due_date LIMIT 10`
        ).catch(() => [])
        const criticalGaps = await db.query(
          `SELECT * FROM accommodation_gaps WHERE priority = 'critical' AND status NOT IN ('approved', 'implemented') ORDER BY kid_name`
        ).catch(() => [])

        return NextResponse.json({ gapCounts, actionCounts, upcomingReviews, urgentActions, criticalGaps })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Advocacy GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'create_plan': {
        const { kid_name, plan_type, qualifying_disability, major_life_activity, eligibility_date, plan_date, next_review_date, school_name, facilitator_name, facilitator_email, facilitator_phone, notes } = body
        if (!kid_name || !plan_type) return NextResponse.json({ error: 'kid_name, plan_type required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO accommodation_plans (kid_name, plan_type, qualifying_disability, major_life_activity, eligibility_date, plan_date, next_review_date, school_name, facilitator_name, facilitator_email, facilitator_phone, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [kid_name, plan_type, qualifying_disability||null, major_life_activity||null, eligibility_date||null, plan_date||null, next_review_date||null, school_name||null, facilitator_name||null, facilitator_email||null, facilitator_phone||null, notes||null]
        )
        return NextResponse.json({ success: true, plan: rows[0] })
      }

      case 'update_plan': {
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        delete updates.action
        const fields: string[] = ['updated_at = NOW()']
        const values: any[] = []
        let idx = 1
        for (const [key, val] of Object.entries(updates)) {
          if (val !== undefined) { values.push(val); fields.push(`${key} = $${idx++}`) }
        }
        values.push(id)
        await db.query(`UPDATE accommodation_plans SET ${fields.join(', ')} WHERE id = $${idx}`, values)
        return NextResponse.json({ success: true })
      }

      case 'add_accommodation': {
        const { plan_id, kid_name, accommodation_text, category, applies_to, source, home_equivalent, home_implementation } = body
        if (!kid_name || !accommodation_text) return NextResponse.json({ error: 'kid_name, accommodation_text required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO accommodations (plan_id, kid_name, accommodation_text, category, applies_to, source, home_equivalent, home_implementation)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [plan_id||null, kid_name, accommodation_text, category||null, applies_to||null, source||null, home_equivalent||null, home_implementation||null]
        )
        return NextResponse.json({ success: true, accommodation: rows[0] })
      }

      case 'update_accommodation': {
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        delete updates.action
        const fields: string[] = []
        const values: any[] = []
        let idx = 1
        for (const [key, val] of Object.entries(updates)) {
          if (val !== undefined) { values.push(val); fields.push(`${key} = $${idx++}`) }
        }
        values.push(id)
        await db.query(`UPDATE accommodations SET ${fields.join(', ')} WHERE id = $${idx}`, values)
        return NextResponse.json({ success: true })
      }

      case 'add_gap': {
        const { kid_name, gap_description, clinical_source, clinical_source_date, recommendation, priority, notes } = body
        if (!kid_name || !gap_description || !clinical_source || !recommendation) return NextResponse.json({ error: 'kid_name, gap_description, clinical_source, recommendation required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO accommodation_gaps (kid_name, gap_description, clinical_source, clinical_source_date, recommendation, priority, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [kid_name, gap_description, clinical_source, clinical_source_date||null, recommendation, priority||'medium', notes||null]
        )
        return NextResponse.json({ success: true, gap: rows[0] })
      }

      case 'update_gap': {
        const { id, status, notes } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE accommodation_gaps SET status = COALESCE($2, status), notes = COALESCE($3, notes), status_updated_at = NOW() WHERE id = $1`,
          [id, status||null, notes||null]
        )
        return NextResponse.json({ success: true })
      }

      case 'add_action': {
        const { kid_name, action_text, action_type, priority, source, due_date, contact_name, contact_email, contact_phone, notes } = body
        if (!kid_name || !action_text || !action_type) return NextResponse.json({ error: 'kid_name, action_text, action_type required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO advocacy_actions (kid_name, action_text, action_type, priority, source, due_date, contact_name, contact_email, contact_phone, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [kid_name, action_text, action_type, priority||'medium', source||null, due_date||null, contact_name||null, contact_email||null, contact_phone||null, notes||null]
        )
        return NextResponse.json({ success: true, action_item: rows[0] })
      }

      case 'update_action': {
        const { id, status, notes } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const sets = ['updated_at = NOW()']
        const params: any[] = []
        let idx = 1
        if (status) { params.push(status); sets.push(`status = $${idx++}`); if (status === 'done') sets.push('completed_at = NOW()') }
        if (notes !== undefined) { params.push(notes); sets.push(`notes = $${idx++}`) }
        params.push(id)
        await db.query(`UPDATE advocacy_actions SET ${sets.join(', ')} WHERE id = $${idx}`, params)
        return NextResponse.json({ success: true })
      }

      case 'add_document': {
        const { kid_name, document_type, document_title, document_date, provider_name, provider_org, key_findings, is_encrypted, notes } = body
        if (!kid_name || !document_type || !document_title) return NextResponse.json({ error: 'kid_name, document_type, document_title required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO clinical_documents (kid_name, document_type, document_title, document_date, provider_name, provider_org, key_findings, is_encrypted, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [kid_name, document_type, document_title, document_date||null, provider_name||null, provider_org||null, key_findings||null, is_encrypted||false, notes||null]
        )
        return NextResponse.json({ success: true, document: rows[0] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Advocacy POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
