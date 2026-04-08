import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS paused_medications (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      med_key TEXT NOT NULL,
      med_label TEXT,
      is_paused BOOLEAN DEFAULT true,
      paused_at TIMESTAMPTZ DEFAULT NOW(),
      resumed_at TIMESTAMPTZ,
      pause_reason TEXT,
      UNIQUE(kid_name, med_key)
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTable(); ready = true } }

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_status'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_status') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM paused_medications WHERE kid_name = $1`, [kid]).catch(() => [])
      return NextResponse.json({ medications: rows })
    }

    if (action === 'get_all') {
      const rows = await db.query(`SELECT * FROM paused_medications ORDER BY kid_name, med_key`).catch(() => [])
      return NextResponse.json({ medications: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Med toggle GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'pause') {
      const { kid_name, med_key, med_label, reason } = body
      if (!kid_name || !med_key) return NextResponse.json({ error: 'kid_name, med_key required' }, { status: 400 })
      await db.query(
        `INSERT INTO paused_medications (kid_name, med_key, med_label, is_paused, paused_at, pause_reason)
         VALUES ($1, $2, $3, true, NOW(), $4)
         ON CONFLICT (kid_name, med_key) DO UPDATE SET is_paused = true, paused_at = NOW(), pause_reason = $4, resumed_at = NULL`,
        [kid_name.toLowerCase(), med_key, med_label || null, reason || null]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'resume') {
      const { kid_name, med_key } = body
      if (!kid_name || !med_key) return NextResponse.json({ error: 'kid_name, med_key required' }, { status: 400 })
      await db.query(
        `UPDATE paused_medications SET is_paused = false, resumed_at = NOW() WHERE kid_name = $1 AND med_key = $2`,
        [kid_name.toLowerCase(), med_key]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'bulk_pause') {
      // Pause multiple meds at once
      const { items } = body // [{ kid_name, med_key, med_label, reason }]
      if (!items || !Array.isArray(items)) return NextResponse.json({ error: 'items array required' }, { status: 400 })
      for (const item of items) {
        await db.query(
          `INSERT INTO paused_medications (kid_name, med_key, med_label, is_paused, paused_at, pause_reason)
           VALUES ($1, $2, $3, true, NOW(), $4)
           ON CONFLICT (kid_name, med_key) DO UPDATE SET is_paused = true, paused_at = NOW(), pause_reason = $4, resumed_at = NULL`,
          [item.kid_name.toLowerCase(), item.med_key, item.med_label || null, item.reason || null]
        ).catch(() => {})
      }
      return NextResponse.json({ success: true, paused: items.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Med toggle POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
