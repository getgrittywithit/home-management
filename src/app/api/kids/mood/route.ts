import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    switch (action) {
      case 'get_today_mood': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const rows = await db.query(
          `SELECT mood, notes FROM kid_mood_log WHERE child_name = $1 AND log_date = $2`,
          [kid, today]
        )
        return NextResponse.json({ mood: rows[0] || null })
      }

      case 'get_mood_history': {
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const days = parseInt(searchParams.get('days') || '30')
        const rows = await db.query(
          `SELECT log_date, mood, notes FROM kid_mood_log WHERE child_name = $1
           AND log_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
           ORDER BY log_date DESC`,
          [kid, days]
        )
        return NextResponse.json({ history: rows })
      }

      case 'get_all_today_moods': {
        const rows = await db.query(
          `SELECT child_name as kid_name, mood FROM kid_mood_log WHERE log_date = $1`,
          [today]
        )
        const moods: Record<string, number> = {}
        rows.forEach((r: any) => { moods[r.kid_name] = r.mood })
        return NextResponse.json({ moods })
      }

      case 'get_break_flags': {
        const rows = await db.query(
          `SELECT id, kid_name, flagged_at, note, acknowledged
           FROM kid_break_flags WHERE acknowledged = FALSE
           ORDER BY flagged_at DESC`
        )
        return NextResponse.json({ flags: rows })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Mood GET error:', error)
    return NextResponse.json({ error: 'Failed to load mood data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'log_mood': {
        const { kid_name, mood, mood_score, notes, one_win, one_hard_thing, what_helped, energy, anxiety, irritability, focus } = body
        const moodVal = mood || mood_score
        if (!kid_name || !moodVal) return NextResponse.json({ error: 'kid_name and mood required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const notesStr = notes || [one_win && `Win: ${one_win}`, one_hard_thing && `Hard: ${one_hard_thing}`, what_helped && `Helped: ${what_helped}`].filter(Boolean).join(' | ') || null
        await db.query(
          `INSERT INTO kid_mood_log (child_name, log_date, mood, mood_score, notes, one_win, one_hard_thing, what_helped, energy, anxiety, irritability, focus)
           VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (child_name, log_date)
           DO UPDATE SET mood = $3, mood_score = $3, notes = $4, one_win = $5, one_hard_thing = $6, what_helped = $7, energy = $8, anxiety = $9, irritability = $10, focus = $11`,
          [kid_name.toLowerCase(), today, moodVal, notesStr, one_win || null, one_hard_thing || null, what_helped || null, energy || null, anxiety || null, irritability || null, focus || null]
        ).catch(e => {
          // Fallback without expanded columns (if columns don't exist yet)
          console.error('Full mood log failed, trying basic:', e.message)
          return db.query(
            `INSERT INTO kid_mood_log (child_name, log_date, mood, notes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (child_name, log_date)
             DO UPDATE SET mood = $3, notes = $4`,
            [kid_name.toLowerCase(), today, moodVal, notesStr]
          )
        })
        // NOTIFY-FIX-1 #5: Low mood alert (mood ≤2, not just ≤1)
        if (moodVal <= 2) {
          const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
          await createNotification({
            title: moodVal <= 1 ? `${kidDisplay} is having a tough day` : `${kidDisplay} had a tough check-in`,
            message: notesStr || `Mood: ${moodVal}/5`,
            source_type: 'low_mood', source_ref: `mood-${kid_name.toLowerCase()}-${today}`,
            link_tab: 'health', icon: moodVal <= 1 ? '😢' : '💛',
          }).catch(e => console.error('Mood notification failed:', e.message))
        }
        return NextResponse.json({ success: true })
      }

      case 'flag_break': {
        const { kid_name, note } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        // BREAK-FIX-1: Server-side dedup — only one break flag per kid per day
        const existing = await db.query(
          `SELECT id FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date = CURRENT_DATE LIMIT 1`,
          [kid_name.toLowerCase()]
        ).catch(() => [])
        if (existing.length > 0) {
          return NextResponse.json({ success: true, already_flagged: true })
        }
        await db.query(
          `INSERT INTO kid_break_flags (kid_name, note) VALUES ($1, $2)`,
          [kid_name.toLowerCase(), note || null]
        )
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
        await createNotification({
          title: `${kidDisplay} needs a break`,
          message: `Pressed the break button${note ? ': ' + note : ''}`,
          source_type: 'break_request', source_ref: `break-${kid_name.toLowerCase()}-${Date.now()}`,
          link_tab: 'health', icon: '🌿',
        })
        return NextResponse.json({ success: true })
      }

      case 'acknowledge_break': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        // Get the kid name before updating
        const breakRow = await db.query(`SELECT kid_name FROM kid_break_flags WHERE id = $1`, [id]).catch(() => [])
        await db.query(
          `UPDATE kid_break_flags SET acknowledged = TRUE, acknowledged_at = NOW() WHERE id = $1`,
          [id]
        )
        // NOTIFY-FIX-1 #9: Notify kid that parent saw the break request
        if (breakRow[0]?.kid_name) {
          await createNotification({
            title: 'Mom saw your break request',
            message: 'Take the time you need.',
            source_type: 'break_acknowledged', source_ref: `break-ack-${breakRow[0].kid_name}-${id}`,
            link_tab: 'my-day', icon: '💚',
            target_role: 'kid', kid_name: breakRow[0].kid_name,
          }).catch(e => console.error('Break ack notification failed:', e.message))
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Mood POST error:', error)
    return NextResponse.json({ error: 'Failed to process mood action' }, { status: 500 })
  }
}
