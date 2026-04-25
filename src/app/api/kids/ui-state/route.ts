import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// P2-D Part 2: persist the kid portal's last-expanded sidebar group so
// it restores across sessions. Two tiny actions, both non-blocking — the
// caller silently falls back to Part 1's smart-default logic on any
// failure here.

const VALID_GROUPS = ['do_first', 'my_stuff', 'fun_growth', 'me'] as const
type UiGroup = typeof VALID_GROUPS[number]

function isValidGroup(v: unknown): v is UiGroup {
  return typeof v === 'string' && (VALID_GROUPS as readonly string[]).includes(v)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kidName = searchParams.get('kid_name')?.toLowerCase()
  if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  try {
    const rows = await db.query(
      `SELECT last_expanded_group, updated_at FROM kid_ui_state WHERE kid_name = $1`,
      [kidName]
    )
    if (!rows[0]) return NextResponse.json({ last_expanded_group: null, updated_at: null })
    return NextResponse.json({
      last_expanded_group: rows[0].last_expanded_group,
      updated_at: rows[0].updated_at,
    })
  } catch (e: any) {
    return NextResponse.json({ last_expanded_group: null, updated_at: null, error: e?.message })
  }
}

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const kidName = String(body?.kid_name || '').toLowerCase()
  const group = body?.last_expanded_group
  if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  // null is allowed — kid collapsed everything
  if (group !== null && !isValidGroup(group)) {
    return NextResponse.json({ error: `last_expanded_group must be null or one of: ${VALID_GROUPS.join(', ')}` }, { status: 400 })
  }
  try {
    await db.query(
      `INSERT INTO kid_ui_state (kid_name, last_expanded_group, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (kid_name) DO UPDATE SET
         last_expanded_group = EXCLUDED.last_expanded_group,
         updated_at = NOW()`,
      [kidName, group]
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    // Non-blocking: report the error but don't 500 the UI flow
    return NextResponse.json({ ok: false, error: e?.message }, { status: 200 })
  }
}
