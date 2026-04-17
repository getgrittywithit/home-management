import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS kid_profiles (
      id SERIAL PRIMARY KEY,
      kid_name TEXT UNIQUE NOT NULL,
      display_name TEXT DEFAULT NULL,
      favorite_color TEXT DEFAULT NULL,
      favorite_animal TEXT DEFAULT NULL,
      favorite_food TEXT DEFAULT NULL,
      favorite_snack TEXT DEFAULT NULL,
      favorite_drink TEXT DEFAULT NULL,
      favorite_movie TEXT DEFAULT NULL,
      favorite_show TEXT DEFAULT NULL,
      favorite_game TEXT DEFAULT NULL,
      favorite_song TEXT DEFAULT NULL,
      favorite_book TEXT DEFAULT NULL,
      interests TEXT[] DEFAULT '{}',
      self_description TEXT DEFAULT NULL,
      photo_url TEXT DEFAULT NULL,
      parent_notes TEXT DEFAULT NULL,
      onboarding_complete BOOLEAN NOT NULL DEFAULT false,
      onboarding_step TEXT DEFAULT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS kid_wish_list (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_url TEXT DEFAULT NULL,
      priority TEXT DEFAULT 'nice-to-have',
      status TEXT DEFAULT 'wished',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

async function ensureProfile(kid_name: string) {
  const rows = await db.query(`SELECT * FROM kid_profiles WHERE kid_name = $1`, [kid_name])
  if (rows.length === 0) {
    await db.query(`INSERT INTO kid_profiles (kid_name) VALUES ($1)`, [kid_name])
    return (await db.query(`SELECT * FROM kid_profiles WHERE kid_name = $1`, [kid_name]))[0]
  }
  return rows[0]
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''

    if (action === 'get_profile') {
      const kid_name = searchParams.get('kid_name') || ''
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const profile = await ensureProfile(kid_name)
      return NextResponse.json({ profile })
    }

    if (action === 'get_all_snapshots') {
      const kids = ['zoey', 'kaylee', 'wyatt', 'amos', 'ellie', 'hannah']
      const snapshots = []
      for (const kid of kids) {
        try {
          const profile = await ensureProfile(kid)
          let wishes: any[] = []
          try {
            wishes = await db.query(
              `SELECT * FROM kid_wish_list WHERE kid_name = $1 AND status = 'wished' ORDER BY created_at DESC LIMIT 3`,
              [kid]
            )
          } catch { /* wish_list query failed */ }
          snapshots.push({ ...profile, wishes })
        } catch {
          snapshots.push({ kid_name: kid, wishes: [] })
        }
      }
      return NextResponse.json({ snapshots })
    }

    if (action === 'get_wish_list') {
      const kid_name = searchParams.get('kid_name') || ''
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const wishes = await db.query(
        `SELECT * FROM kid_wish_list WHERE kid_name = $1 ORDER BY created_at DESC`,
        [kid_name]
      )
      return NextResponse.json({ wishes })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('KidProfile GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables()
    const body = await request.json()
    const { action } = body

    if (action === 'update_profile') {
      const { kid_name, ...fields } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      await ensureProfile(kid_name)

      const allowed = [
        'display_name', 'favorite_color', 'favorite_animal', 'favorite_food',
        'favorite_snack', 'favorite_drink', 'favorite_movie', 'favorite_show',
        'favorite_game', 'favorite_song', 'favorite_book', 'interests',
        'self_description', 'photo_url', 'onboarding_step'
      ]
      const sets: string[] = []
      const vals: any[] = []
      let idx = 1
      for (const key of allowed) {
        if (fields[key] !== undefined) {
          sets.push(`${key} = $${idx}`)
          vals.push(key === 'interests' ? fields[key] : fields[key])
          idx++
        }
      }
      if (sets.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
      sets.push(`updated_at = NOW()`)
      vals.push(kid_name)
      await db.query(
        `UPDATE kid_profiles SET ${sets.join(', ')} WHERE kid_name = $${idx}`,
        vals
      )
      const updated = await ensureProfile(kid_name)
      const changedFields = Object.keys(fields).filter(k => allowed.includes(k) && fields[k] !== undefined)
      if (changedFields.length > 0) {
        await createNotification({
          title: `📋 ${cap(kid_name)} updated their profile`,
          message: `Changed: ${changedFields.join(', ')}`,
          source_type: 'profile_updated',
          source_ref: `profile_${kid_name}_${new Date().toISOString().split('T')[0]}`,
          icon: '📋',
          link_tab: 'kids-checklist',
        }).catch(() => {})
      }
      return NextResponse.json({ success: true, profile: updated })
    }

    if (action === 'parent_update') {
      const { kid_name, parent_notes, ...fields } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      await ensureProfile(kid_name)

      const allowed = [
        'display_name', 'favorite_color', 'favorite_animal', 'favorite_food',
        'favorite_snack', 'favorite_drink', 'favorite_movie', 'favorite_show',
        'favorite_game', 'favorite_song', 'favorite_book', 'interests',
        'self_description', 'photo_url', 'parent_notes'
      ]
      const sets: string[] = []
      const vals: any[] = []
      let idx = 1
      if (parent_notes !== undefined) {
        sets.push(`parent_notes = $${idx}`)
        vals.push(parent_notes)
        idx++
      }
      for (const key of allowed) {
        if (key !== 'parent_notes' && fields[key] !== undefined) {
          sets.push(`${key} = $${idx}`)
          vals.push(fields[key])
          idx++
        }
      }
      if (sets.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
      sets.push(`updated_at = NOW()`)
      vals.push(kid_name)
      await db.query(
        `UPDATE kid_profiles SET ${sets.join(', ')} WHERE kid_name = $${idx}`,
        vals
      )
      const updated = await ensureProfile(kid_name)
      return NextResponse.json({ success: true, profile: updated })
    }

    if (action === 'add_wish_item') {
      const { kid_name, item_name, item_url, priority } = body
      if (!kid_name || !item_name) return NextResponse.json({ error: 'kid_name and item_name required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO kid_wish_list (kid_name, item_name, item_url, priority) VALUES ($1, $2, $3, $4) RETURNING *`,
        [kid_name, item_name, item_url || null, priority || 'nice-to-have']
      )
      return NextResponse.json({ success: true, item: rows[0] })
    }

    if (action === 'update_wish_item') {
      const { id, status } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE kid_wish_list SET status = $1 WHERE id = $2`, [status || 'wished', id])
      return NextResponse.json({ success: true })
    }

    if (action === 'mark_onboarding_complete') {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        // Set onboarding_complete = true (the only field KidPortalWithNav checks)
        await db.query(
          `UPDATE kid_profiles SET onboarding_complete = true WHERE kid_name = $1`,
          [kid_name.toLowerCase()]
        )
        // Try to set optional columns too (may not exist in all schemas)
        try { await db.query(`UPDATE kid_profiles SET onboarded_at = NOW() WHERE kid_name = $1`, [kid_name.toLowerCase()]) } catch {}
        try { await db.query(`UPDATE kid_profiles SET onboarding_step = 'complete' WHERE kid_name = $1`, [kid_name.toLowerCase()]) } catch {}
      } catch (err) {
        console.error('mark_onboarding_complete error:', err)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('KidProfile POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
