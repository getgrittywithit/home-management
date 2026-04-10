import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    columns JSONB DEFAULT '["inbox","todo","in_progress","waiting","done"]',
    owner TEXT DEFAULT 'lola',
    color TEXT,
    icon TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`)

  // Seed default boards if empty
  const count = await db.query(`SELECT COUNT(*)::int as c FROM boards`).catch(() => [{ c: 0 }])
  if (count[0]?.c === 0) {
    const defaults = [
      { name: 'Personal', slug: 'personal', columns: '["inbox","todo","in_progress","waiting","done"]', color: '#6366f1', icon: '📋', position: 0 },
      { name: 'Triton', slug: 'triton', columns: '["leads","estimate_sent","scheduled","in_progress","invoiced","paid"]', color: '#f59e0b', icon: '🔧', position: 1 },
      { name: 'School', slug: 'school', columns: '["inbox","need_to_respond","waiting_on_school","done"]', color: '#10b981', icon: '🏫', position: 2 },
      { name: 'Medical', slug: 'medical', columns: '["inbox","scheduled","waiting_on_results","done"]', color: '#ef4444', icon: '🏥', position: 3 },
      { name: 'Household', slug: 'household', columns: '["inbox","todo","in_progress","done"]', color: '#8b5cf6', icon: '🏠', position: 4 },
    ]
    for (const b of defaults) {
      await db.query(
        `INSERT INTO boards (name, slug, columns, owner, color, icon, position) VALUES ($1, $2, $3, 'lola', $4, $5, $6) ON CONFLICT (slug) DO NOTHING`,
        [b.name, b.slug, b.columns, b.color, b.icon, b.position]
      ).catch(() => {})
    }
  }
}

let ready = false

export async function GET(req: NextRequest) {
  if (!ready) { await ensureTables(); ready = true }
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list_boards'

  try {
    switch (action) {
      case 'list_boards': {
        const boards = await db.query(`SELECT * FROM boards ORDER BY position, created_at`)
        return NextResponse.json({ boards })
      }

      case 'get_board': {
        const slug = searchParams.get('slug')
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
        const boards = await db.query(`SELECT * FROM boards WHERE slug = $1`, [slug])
        if (!boards[0]) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

        const items = await db.query(
          `SELECT * FROM action_items WHERE board = $1 AND status != 'dismissed' ORDER BY position, created_at`,
          [slug]
        ).catch(() => [])

        return NextResponse.json({ board: boards[0], items })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Boards GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!ready) { await ensureTables(); ready = true }
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'create_board': {
        const { name, columns, color, icon } = body
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const maxPos = await db.query(`SELECT COALESCE(MAX(position), 0) + 1 as p FROM boards`).catch(() => [{ p: 0 }])
        await db.query(
          `INSERT INTO boards (name, slug, columns, color, icon, position) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (slug) DO NOTHING`,
          [name, slug, columns || '["inbox","todo","in_progress","done"]', color || '#6366f1', icon || '📋', maxPos[0]?.p || 0]
        )
        return NextResponse.json({ success: true, slug })
      }

      case 'update_board': {
        const { slug, name, columns, color, icon } = body
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
        await db.query(
          `UPDATE boards SET name = COALESCE($2, name), columns = COALESCE($3, columns),
           color = COALESCE($4, color), icon = COALESCE($5, icon) WHERE slug = $1`,
          [slug, name || null, columns || null, color || null, icon || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'delete_board': {
        const { slug } = body
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
        // Move items to personal board first
        await db.query(`UPDATE action_items SET board = 'personal' WHERE board = $1`, [slug]).catch(() => {})
        await db.query(`DELETE FROM boards WHERE slug = $1`, [slug])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Boards POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
