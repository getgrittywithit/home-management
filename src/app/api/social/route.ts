import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

import { ALL_KIDS as KIDS } from '@/lib/constants'
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_messages'

  try {
    if (action === 'get_messages') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const toKid = searchParams.get('to_kid')?.toLowerCase()
      let sql = `SELECT * FROM sibling_messages`
      const params: any[] = []
      if (kidName && toKid) {
        sql += ` WHERE (from_kid = $1 AND to_kid = $2) OR (from_kid = $2 AND to_kid = $1) OR to_kid IS NULL`
        params.push(kidName, toKid)
      } else if (kidName) {
        sql += ` WHERE from_kid = $1 OR to_kid = $1 OR to_kid IS NULL`
        params.push(kidName)
      }
      sql += ` ORDER BY created_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ messages: rows })
    }

    if (action === 'get_all_messages') {
      const rows = await db.query(
        `SELECT * FROM sibling_messages ORDER BY created_at DESC LIMIT 100`
      ).catch(() => [])
      return NextResponse.json({ messages: rows })
    }

    if (action === 'list_challenges') {
      const status = searchParams.get('status') || 'active'
      const rows = await db.query(
        `SELECT * FROM active_challenges WHERE status = $1 ORDER BY created_at DESC`, [status]
      ).catch(() => [])
      return NextResponse.json({ challenges: rows })
    }

    if (action === 'get_challenge') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const challenge = await db.query(`SELECT * FROM active_challenges WHERE id = $1`, [id])
      const progress = await db.query(
        `SELECT * FROM challenge_progress WHERE challenge_id = $1 ORDER BY progress_count DESC`, [id]
      ).catch(() => [])
      return NextResponse.json({ challenge: challenge[0] || null, progress })
    }

    if (action === 'leaderboard') {
      const stars = await db.query(
        `SELECT kid_name, stars_balance, level, xp, streak_days FROM digi_pets ORDER BY stars_balance DESC`
      ).catch(() => [])
      return NextResponse.json({ leaderboard: stars })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Social GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'send_message': {
        const { from_kid, to_kid, message, message_type, photo_url } = body
        if (!from_kid || !message) return NextResponse.json({ error: 'from_kid + message required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO sibling_messages (from_kid, to_kid, message, message_type, photo_url)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [from_kid.toLowerCase(), to_kid?.toLowerCase() || null, message, message_type || 'text', photo_url || null]
        )
        if (to_kid) {
          await createNotification({
            title: `💬 ${cap(from_kid)} sent you a message`,
            message: message.substring(0, 80),
            source_type: 'sibling_message', icon: '💬',
            target_role: 'kid', kid_name: to_kid.toLowerCase(),
          }).catch(() => {})
        }
        return NextResponse.json({ message: rows[0] }, { status: 201 })
      }

      case 'start_challenge': {
        const { title, description, category, started_by, participants, tracking_metric, start_date, end_date, star_prize } = body
        if (!title || !participants?.length) return NextResponse.json({ error: 'title + participants required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO active_challenges (title, description, category, started_by, participants, tracking_metric, start_date, end_date, star_prize)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [title, description || null, category || null, started_by || 'parent',
           participants, tracking_metric || 'custom',
           start_date || new Date().toLocaleDateString('en-CA'),
           end_date || new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA'),
           star_prize || 10]
        )
        for (const kid of participants) {
          await db.query(
            `INSERT INTO challenge_progress (challenge_id, kid_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [rows[0].id, kid.toLowerCase()]
          ).catch(() => {})
          await createNotification({
            title: `🏆 New challenge: ${title}`,
            message: description || 'A new family challenge has started!',
            source_type: 'challenge', icon: '🏆',
            target_role: 'kid', kid_name: kid.toLowerCase(),
          }).catch(() => {})
        }
        return NextResponse.json({ challenge: rows[0] }, { status: 201 })
      }

      case 'update_progress': {
        const { challenge_id, kid_name, increment } = body
        if (!challenge_id || !kid_name) return NextResponse.json({ error: 'challenge_id + kid_name required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA')
        await db.query(
          `INSERT INTO challenge_progress (challenge_id, kid_name, progress_count, daily_log)
           VALUES ($1, $2, $3, jsonb_build_object($4::text, true))
           ON CONFLICT (challenge_id, kid_name) DO UPDATE SET
             progress_count = challenge_progress.progress_count + $3,
             daily_log = challenge_progress.daily_log || jsonb_build_object($4::text, true),
             updated_at = NOW()`,
          [challenge_id, kid_name.toLowerCase(), increment || 1, today]
        )
        return NextResponse.json({ success: true })
      }

      case 'complete_challenge': {
        const { challenge_id } = body
        if (!challenge_id) return NextResponse.json({ error: 'challenge_id required' }, { status: 400 })
        const progress = await db.query(
          `SELECT kid_name, progress_count FROM challenge_progress WHERE challenge_id = $1 ORDER BY progress_count DESC LIMIT 1`,
          [challenge_id]
        ).catch(() => [])
        const winner = progress[0]?.kid_name || null
        const challenge = await db.query(
          `UPDATE active_challenges SET status = 'completed', winner = $2 WHERE id = $1 RETURNING *`,
          [challenge_id, winner]
        )
        if (winner && challenge[0]?.star_prize) {
          await db.query(
            `UPDATE digi_pets SET stars_balance = stars_balance + $1, xp = xp + $1 * 2 WHERE kid_name = $2`,
            [challenge[0].star_prize, winner]
          ).catch(() => {})
          await createNotification({
            title: `🏆 ${cap(winner)} won "${challenge[0].title}"!`,
            message: `+${challenge[0].star_prize} stars! Great job!`,
            source_type: 'challenge_win', icon: '🏆',
            target_role: 'kid', kid_name: winner,
          }).catch(() => {})
        }
        return NextResponse.json({ challenge: challenge[0], winner })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Social POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
