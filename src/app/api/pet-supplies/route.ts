import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'
  const petName = searchParams.get('pet_name')

  try {
    if (action === 'list') {
      let sql = `SELECT psp.*, p.name AS pet_name FROM pet_supplies_purchased psp
                 JOIN pets p ON p.id = psp.pet_id`
      const params: any[] = []
      if (petName) { params.push(petName.toLowerCase()); sql += ` WHERE LOWER(p.name) = $1` }
      sql += ` ORDER BY psp.purchased_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ purchases: rows })
    }

    if (action === 'types') {
      let sql = `SELECT pst.*, p.name AS pet_name FROM pet_supply_types pst JOIN pets p ON p.id = pst.pet_id`
      const params: any[] = []
      if (petName) { params.push(petName.toLowerCase()); sql += ` WHERE LOWER(p.name) = $1` }
      sql += ` ORDER BY pst.item_name`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ types: rows })
    }

    if (action === 'restock_insights') {
      const types = await db.query(
        `SELECT pst.*, p.name AS pet_name,
                (SELECT MAX(purchased_at) FROM pet_supplies_purchased psp WHERE psp.supply_type_id = pst.id) AS last_purchased
         FROM pet_supply_types pst JOIN pets p ON p.id = pst.pet_id
         WHERE pst.typical_interval_days IS NOT NULL
         ORDER BY p.name, pst.item_name`
      ).catch(() => [])

      const today = new Date().toLocaleDateString('en-CA')
      const insights = types.map((t: any) => {
        const lastDate = t.last_purchased ? new Date(t.last_purchased) : null
        const nextDate = lastDate ? new Date(lastDate.getTime() + t.typical_interval_days * 86400000) : null
        const nextStr = nextDate ? nextDate.toLocaleDateString('en-CA') : null
        const overdue = nextStr ? nextStr < today : false
        return { ...t, next_restock_date: nextStr, overdue }
      })
      return NextResponse.json({ insights })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_purchase') {
      const { pet_name, item_name, qty, unit, cost_cents, shop, purchased_at, purchased_by, notes, supply_type_id } = body
      if (!pet_name || !item_name || !qty || !unit) return NextResponse.json({ error: 'pet_name + item_name + qty + unit required' }, { status: 400 })

      const pet = await db.query(`SELECT id FROM pets WHERE LOWER(name) = $1`, [pet_name.toLowerCase()]).catch(() => [])
      if (!pet[0]) return NextResponse.json({ error: 'Pet not found' }, { status: 404 })

      const rows = await db.query(
        `INSERT INTO pet_supplies_purchased (pet_id, supply_type_id, item_name, qty, unit, cost_cents, shop, purchased_at, purchased_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [pet[0].id, supply_type_id || null, item_name, qty, unit, cost_cents || null, shop || null,
         purchased_at || new Date().toLocaleDateString('en-CA'), purchased_by || 'lola', notes || null]
      )
      return NextResponse.json({ purchase: rows[0] }, { status: 201 })
    }

    if (action === 'update_purchase') {
      const { id, cost_cents, shop, notes } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(
        `UPDATE pet_supplies_purchased SET cost_cents = COALESCE($2, cost_cents), shop = COALESCE($3, shop), notes = COALESCE($4, notes) WHERE id = $1`,
        [id, cost_cents, shop, notes]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
