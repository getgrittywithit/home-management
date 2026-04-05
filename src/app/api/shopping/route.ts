import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''

  try {
    if (action === 'get_profile') {
      const kid = searchParams.get('kid_name')
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM kid_shopping_profile WHERE kid_name = $1`, [kid.toLowerCase()])
      return NextResponse.json({ profile: rows[0] || null })
    }

    if (action === 'get_all_profiles') {
      const rows = await db.query(`SELECT * FROM kid_shopping_profile ORDER BY kid_name`)
      return NextResponse.json({ profiles: rows })
    }

    if (action === 'list_share_links') {
      const rows = await db.query(
        `SELECT * FROM shopping_share_links WHERE expires_at > NOW() ORDER BY created_at DESC`
      )
      return NextResponse.json({ links: rows })
    }

    if (action === 'get_share_data') {
      const token = searchParams.get('token')
      if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
      const links = await db.query(
        `SELECT * FROM shopping_share_links WHERE share_token = $1 AND expires_at > NOW()`, [token]
      )
      if (!links[0]) return NextResponse.json({ error: 'Link expired or invalid' }, { status: 404 })
      await db.query(`UPDATE shopping_share_links SET views = views + 1 WHERE id = $1`, [links[0].id])
      const profile = await db.query(
        `SELECT * FROM kid_shopping_profile WHERE kid_name = $1`, [links[0].kid_name]
      )
      return NextResponse.json({
        profile: profile[0] || null,
        kid_name: links[0].kid_name,
        expires_at: links[0].expires_at,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Shopping GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'update_profile': {
        const { kid_name, sizes, sensory_triggers, fabric_preferences, fit_preferences,
                favorite_colors, favorite_brands, wish_list, avoid_list, notes } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_shopping_profile (kid_name, sizes, sensory_triggers, fabric_preferences, fit_preferences, favorite_colors, favorite_brands, wish_list, avoid_list, notes, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
           ON CONFLICT (kid_name) DO UPDATE SET
             sizes=COALESCE($2,kid_shopping_profile.sizes), sensory_triggers=COALESCE($3,kid_shopping_profile.sensory_triggers),
             fabric_preferences=COALESCE($4,kid_shopping_profile.fabric_preferences), fit_preferences=COALESCE($5,kid_shopping_profile.fit_preferences),
             favorite_colors=COALESCE($6,kid_shopping_profile.favorite_colors), favorite_brands=COALESCE($7,kid_shopping_profile.favorite_brands),
             wish_list=COALESCE($8,kid_shopping_profile.wish_list), avoid_list=COALESCE($9,kid_shopping_profile.avoid_list),
             notes=COALESCE($10,kid_shopping_profile.notes), updated_at=NOW()`,
          [kid_name.toLowerCase(), sizes ? JSON.stringify(sizes) : null, sensory_triggers ? JSON.stringify(sensory_triggers) : null,
           fabric_preferences ? JSON.stringify(fabric_preferences) : null, fit_preferences ? JSON.stringify(fit_preferences) : null,
           favorite_colors ? JSON.stringify(favorite_colors) : null, favorite_brands ? JSON.stringify(favorite_brands) : null,
           wish_list ? JSON.stringify(wish_list) : null, avoid_list ? JSON.stringify(avoid_list) : null, notes || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'create_share_link': {
        const { kid_name } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const token = crypto.randomBytes(24).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)
        const rows = await db.query(
          `INSERT INTO shopping_share_links (kid_name, share_token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
          [kid_name.toLowerCase(), token, expiresAt.toISOString()]
        )
        return NextResponse.json({ success: true, link: rows[0], url: `/share/${token}` })
      }

      case 'revoke_share_link': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM shopping_share_links WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Shopping POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
