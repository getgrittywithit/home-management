import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

async function creditPoints(kid: string, pts: number, reason: string) {
  try {
    await db.query(`INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', $2, $3)`, [kid, pts, reason])
    await db.query(`UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW() WHERE kid_name = $1`, [kid, pts])
  } catch { /* silent */ }
}

async function debitPoints(kid: string, pts: number, reason: string) {
  try {
    await db.query(`INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`, [kid, pts, reason])
    await db.query(`UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`, [kid, pts])
  } catch { /* silent */ }
}

function calcStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0
  const sorted = [...dates].sort((a, b) => b.localeCompare(a)) // newest first
  let streak = 0
  let check = today
  // Allow starting from today or yesterday
  if (sorted[0] === check) {
    streak = 1
    const d = new Date(check + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    check = d.toLocaleDateString('en-CA')
  } else {
    const d = new Date(check + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    check = d.toLocaleDateString('en-CA')
    if (sorted[0] !== check) return 0
    streak = 1
    const d2 = new Date(check + 'T12:00:00')
    d2.setDate(d2.getDate() - 1)
    check = d2.toLocaleDateString('en-CA')
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === check) {
      streak++
      const d = new Date(check + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      check = d.toLocaleDateString('en-CA')
    } else break
  }
  return streak
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()
    const today = getToday()

    if (action === 'get_portfolio') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      const [readingRes, sessionsRes, wishlistRes, workRes, focusRes] = await Promise.all([
        db.query(`SELECT id, book_title, author, status, rating, notes, date_started, date_completed FROM kid_reading_log WHERE kid_name = $1 ORDER BY updated_at DESC`, [kid]).catch(() => []),
        db.query(`SELECT session_date, minutes, points_earned FROM kid_reading_sessions WHERE kid_name = $1 AND session_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY session_date DESC`, [kid]).catch(() => []),
        db.query(`SELECT id, topic, notes, completed FROM kid_learn_wishlist WHERE kid_name = $1 ORDER BY completed ASC, created_at DESC`, [kid]).catch(() => []),
        db.query(`SELECT id, title, description, subject, work_date FROM kid_work_log WHERE kid_name = $1 ORDER BY work_date DESC`, [kid]).catch(() => []),
        db.query(`SELECT current_focus FROM kid_curriculum_notes WHERE kid_name = $1`, [kid]).catch(() => []),
      ])

      const sessionDates = (sessionsRes as any[]).map((r: any) => r.session_date?.toISOString?.()?.slice(0, 10) || String(r.session_date).slice(0, 10))
      const loggedToday = sessionDates.includes(today)
      const currentMonth = today.slice(0, 7)
      const readThisMonth = sessionDates.filter((d: string) => d.startsWith(currentMonth)).length
      const streak = calcStreak(sessionDates, today)

      return NextResponse.json({
        reading: readingRes,
        readingStreak: streak,
        readThisMonth,
        loggedToday,
        last30Days: sessionDates,
        wishlist: wishlistRes,
        work: workRes,
        currentFocus: (focusRes as any[])[0]?.current_focus || null,
      })
    }

    if (action === 'get_parent_overview') {
      const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
      const result = []
      for (const k of kids) {
        try {
          const [booksRes, sessionsRes, wishRes, workRes] = await Promise.all([
            db.query(`SELECT book_title, status FROM kid_reading_log WHERE kid_name = $1 ORDER BY updated_at DESC`, [k]).catch(() => []),
            db.query(`SELECT session_date FROM kid_reading_sessions WHERE kid_name = $1 AND session_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY session_date DESC`, [k]).catch(() => []),
            db.query(`SELECT COUNT(*)::int as c FROM kid_learn_wishlist WHERE kid_name = $1 AND completed = FALSE`, [k]).catch(() => [{ c: 0 }]),
            db.query(`SELECT COUNT(*)::int as c, MAX(work_date) as last_date FROM kid_work_log WHERE kid_name = $1`, [k]).catch(() => [{ c: 0, last_date: null }]),
          ])
          const books = booksRes as any[]
          const sessions = (sessionsRes as any[]).map((r: any) => r.session_date?.toISOString?.()?.slice(0, 10) || String(r.session_date).slice(0, 10))
          const currentlyReading = books.find((b: any) => b.status === 'reading')?.book_title || null
          const booksCompleted = books.filter((b: any) => b.status === 'completed').length
          result.push({
            kid_name: k,
            books_completed: booksCompleted,
            currently_reading: currentlyReading,
            wishlist_count: (wishRes as any[])[0]?.c || 0,
            reading_streak: calcStreak(sessions, today),
            read_this_month: sessions.filter((d: string) => d.startsWith(today.slice(0, 7))).length,
            work_entries: (workRes as any[])[0]?.c || 0,
            last_work_date: (workRes as any[])[0]?.last_date || null,
          })
        } catch { result.push({ kid_name: k, books_completed: 0, currently_reading: null, wishlist_count: 0, reading_streak: 0, read_this_month: 0, work_entries: 0, last_work_date: null }) }
      }
      return NextResponse.json({ kids: result })
    }

    if (action === 'get_curriculum_notes') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      try {
        const rows = await db.query(`SELECT notes, current_focus, updated_at FROM kid_curriculum_notes WHERE kid_name = $1`, [kid])
        return NextResponse.json(rows[0] || { notes: '', current_focus: '', updated_at: null })
      } catch { return NextResponse.json({ notes: '', current_focus: '', updated_at: null }) }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Portfolio GET error:', error)
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    const today = getToday()

    switch (action) {
      case 'log_reading': {
        const { kid_name, minutes } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        let pts = 5
        if (minutes && minutes >= 60) pts = 10
        else if (minutes && minutes >= 30) pts = 8

        const res = await db.query(
          `INSERT INTO kid_reading_sessions (kid_name, session_date, minutes, points_earned) VALUES ($1, $2, $3, $4) ON CONFLICT (kid_name, session_date) DO NOTHING RETURNING id`,
          [kid, today, minutes || null, pts]
        )
        if (res.length === 0) return NextResponse.json({ success: true, alreadyLogged: true, points: 0, streak: 0, newStreakMilestone: false })

        await creditPoints(kid, pts, `Reading session${minutes ? ` (${minutes} min)` : ''} 📖`)

        // Check streak
        const sessionsRes = await db.query(
          `SELECT session_date FROM kid_reading_sessions WHERE kid_name = $1 AND session_date >= CURRENT_DATE - INTERVAL '30 days' ORDER BY session_date DESC`, [kid]
        )
        const dates = sessionsRes.map((r: any) => r.session_date?.toISOString?.()?.slice(0, 10) || String(r.session_date).slice(0, 10))
        const streak = calcStreak(dates, today)
        let newStreakMilestone = false
        if (streak === 7) {
          await creditPoints(kid, 15, '7-day reading streak! 🎉')
          newStreakMilestone = true
        }
        return NextResponse.json({ success: true, alreadyLogged: false, points: pts, streak, newStreakMilestone })
      }

      case 'add_book': {
        const { kid_name, book_title, author, status } = body
        if (!kid_name || !book_title) return NextResponse.json({ error: 'kid_name, book_title required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_reading_log (kid_name, book_title, author, status, date_started) VALUES ($1, $2, $3, $4, $5)`,
          [kid_name.toLowerCase(), book_title.trim(), author?.trim() || null, status || 'reading', status === 'reading' ? today : null]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_book': {
        const { id, kid_name, status, rating, notes, date_completed } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const kid = (kid_name || '').toLowerCase()

        // Check if transitioning to completed
        const prev = await db.query(`SELECT status, book_title FROM kid_reading_log WHERE id = $1`, [id])
        const wasCompleted = prev[0]?.status === 'completed'
        const nowCompleted = status === 'completed'

        await db.query(
          `UPDATE kid_reading_log SET status = COALESCE($2, status), rating = COALESCE($3, rating), notes = COALESCE($4, notes), date_completed = COALESCE($5, date_completed), updated_at = NOW() WHERE id = $1`,
          [id, status || null, rating || null, notes !== undefined ? notes : null, nowCompleted ? (date_completed || today) : null]
        )

        if (nowCompleted && !wasCompleted && kid) {
          await creditPoints(kid, 20, `Finished a book: ${prev[0]?.book_title || 'Unknown'} 📚`)
        }
        return NextResponse.json({ success: true })
      }

      case 'uncomplete_book': {
        const { id, kid_name } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE kid_reading_log SET status = 'reading', date_completed = NULL, updated_at = NOW() WHERE id = $1`, [id])
        if (kid_name) await debitPoints(kid_name.toLowerCase(), 20, 'Book uncompleted')
        return NextResponse.json({ success: true })
      }

      case 'delete_book': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM kid_reading_log WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'add_wishlist': {
        const { kid_name, topic, notes } = body
        if (!kid_name || !topic) return NextResponse.json({ error: 'kid_name, topic required' }, { status: 400 })
        await db.query(`INSERT INTO kid_learn_wishlist (kid_name, topic, notes) VALUES ($1, $2, $3)`, [kid_name.toLowerCase(), topic.trim(), notes?.trim() || null])
        return NextResponse.json({ success: true })
      }

      case 'complete_wishlist': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`UPDATE kid_learn_wishlist SET completed = TRUE, completed_at = NOW() WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'delete_wishlist': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM kid_learn_wishlist WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'add_work': {
        const { kid_name, title, description, subject, work_date } = body
        if (!kid_name || !title) return NextResponse.json({ error: 'kid_name, title required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_work_log (kid_name, title, description, subject, work_date) VALUES ($1, $2, $3, $4, $5)`,
          [kid_name.toLowerCase(), title.trim(), description?.trim() || null, subject || 'Other', work_date || today]
        )
        return NextResponse.json({ success: true })
      }

      case 'delete_work': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM kid_work_log WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'save_curriculum_notes': {
        const { kid_name, notes, current_focus } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_curriculum_notes (kid_name, notes, current_focus, updated_at) VALUES ($1, $2, $3, NOW())
           ON CONFLICT (kid_name) DO UPDATE SET notes = $2, current_focus = $3, updated_at = NOW()`,
          [kid_name.toLowerCase(), notes || '', current_focus || '']
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Portfolio POST error:', error)
    return NextResponse.json({ error: 'Failed to process portfolio action' }, { status: 500 })
  }
}
