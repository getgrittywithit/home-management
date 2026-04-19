import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { ALL_KIDS } from '@/lib/constants'

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS financial_literacy_progress (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      activity_id TEXT NOT NULL,
      answer_text TEXT,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      gems_earned INTEGER DEFAULT 3,
      UNIQUE(kid_name, level, activity_id)
    )
  `).catch(() => {})
  await db.query(`
    CREATE TABLE IF NOT EXISTS financial_literacy_photos (
      id SERIAL PRIMARY KEY,
      progress_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
  await db.query(`
    CREATE TABLE IF NOT EXISTS financial_literacy_levels (
      kid_name TEXT PRIMARY KEY,
      current_level INTEGER NOT NULL DEFAULT 1,
      advanced_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
}

let ready = false
async function init() {
  if (!ready) {
    try { await ensureTables() } catch { /* tables may already exist */ }
    // EDU-FIX-5: Reset all kids to Level 1 (override stale levels from old system)
    const kids = ALL_KIDS
    for (const kid of kids) {
      await db.query(
        `INSERT INTO financial_literacy_levels (kid_name, current_level) VALUES ($1, 1)
         ON CONFLICT (kid_name) DO UPDATE SET current_level = 1 WHERE financial_literacy_levels.updated_at < '2026-04-09'`, [kid]
      ).catch(() => {})
    }
    ready = true
  }
}

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_progress'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_progress') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const level = (await db.query(`SELECT * FROM financial_literacy_levels WHERE kid_name = $1`, [kid]).catch(() => []))[0]
      const currentLevel = level?.current_level || 1
      const activities = await db.query(
        `SELECT * FROM financial_literacy_progress WHERE kid_name = $1 AND level = $2 ORDER BY completed_at`,
        [kid, currentLevel]
      ).catch(() => [])
      return NextResponse.json({ current_level: currentLevel, activities, advanced_at: level?.advanced_at })
    }

    if (action === 'get_all_levels') {
      // For leaderboard
      const kids = ALL_KIDS
      const levels = await db.query(`SELECT * FROM financial_literacy_levels ORDER BY kid_name`).catch(() => [])
      const levelMap: Record<string, number> = {}
      levels.forEach((l: any) => { levelMap[l.kid_name] = l.current_level })
      const results = []
      for (const k of kids) {
        const completedCount = (await db.query(
          `SELECT COUNT(*)::int as c FROM financial_literacy_progress WHERE kid_name = $1`, [k]
        ).catch(() => []))[0]?.c || 0
        const gemsTotal = (await db.query(
          `SELECT COALESCE(SUM(gems_earned), 0)::int as total FROM financial_literacy_progress WHERE kid_name = $1`, [k]
        ).catch(() => []))[0]?.total || 0
        results.push({ kid_name: k, level: levelMap[k] || 1, activities_completed: completedCount, total_gems: gemsTotal })
      }
      results.sort((a, b) => b.level - a.level || b.activities_completed - a.activities_completed)
      return NextResponse.json({ leaderboard: results })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Financial literacy GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'complete_activity') {
      const { kid_name, level, activity_id, answer_text, photos } = body
      if (!kid_name || !activity_id) return NextResponse.json({ error: 'kid_name, activity_id required' }, { status: 400 })
      if (!answer_text && (!photos || photos.length === 0)) {
        return NextResponse.json({ error: 'Must provide answer text or photos as evidence of work' }, { status: 400 })
      }
      const kid = kid_name.toLowerCase()
      const lvl = level || 1

      // Ensure level record exists
      await db.query(
        `INSERT INTO financial_literacy_levels (kid_name, current_level) VALUES ($1, $2) ON CONFLICT (kid_name) DO NOTHING`,
        [kid, lvl]
      ).catch(() => {})

      // Upsert completion
      const rows = await db.query(
        `INSERT INTO financial_literacy_progress (kid_name, level, activity_id, answer_text, gems_earned)
         VALUES ($1, $2, $3, $4, 3) ON CONFLICT (kid_name, level, activity_id) DO UPDATE SET answer_text = $4, completed_at = NOW()
         RETURNING id`,
        [kid, lvl, activity_id, answer_text || null]
      )
      const progressId = rows[0]?.id

      // Save photos if provided
      if (photos && Array.isArray(photos) && progressId) {
        for (const url of photos.slice(0, 3)) {
          await db.query(
            `INSERT INTO financial_literacy_photos (progress_id, photo_url) VALUES ($1, $2)`,
            [progressId, url]
          ).catch(() => {})
        }
      }

      // Award gems
      await db.query(`UPDATE digi_pets SET gem_balance = COALESCE(gem_balance, 0) + 3 WHERE kid_name = $1`, [kid]).catch(() => {})
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, 3, 'financial_literacy', $2)`,
        [kid, `Completed: ${activity_id}`]
      ).catch(() => {})

      return NextResponse.json({ success: true, gems_earned: 3 })
    }

    if (action === 'advance_level') {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()

      const level = (await db.query(`SELECT current_level FROM financial_literacy_levels WHERE kid_name = $1`, [kid]).catch(() => []))[0]
      const currentLevel = level?.current_level || 1
      const newLevel = currentLevel + 1

      await db.query(
        `UPDATE financial_literacy_levels SET current_level = $1, advanced_at = NOW(), updated_at = NOW() WHERE kid_name = $2`,
        [newLevel, kid]
      )

      // Bonus gems for completing a full level
      await db.query(`UPDATE digi_pets SET gem_balance = COALESCE(gem_balance, 0) + 10 WHERE kid_name = $1`, [kid]).catch(() => {})
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, 10, 'financial_literacy', $2)`,
        [kid, `Level ${currentLevel} complete! Advanced to Level ${newLevel}`]
      ).catch(() => {})

      return NextResponse.json({ success: true, new_level: newLevel, gems_earned: 10 })
    }

    if (action === 'reset_all_to_level_1') {
      // EDU-FIX-5: Reset all kids to Level 1
      const kids = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
      for (const kid of kids) {
        await db.query(
          `INSERT INTO financial_literacy_levels (kid_name, current_level) VALUES ($1, 1)
           ON CONFLICT (kid_name) DO UPDATE SET current_level = 1, updated_at = NOW()`,
          [kid]
        ).catch(() => {})
      }
      return NextResponse.json({ success: true, message: 'All kids reset to Level 1' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Financial literacy POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
