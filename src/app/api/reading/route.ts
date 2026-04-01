import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_progress': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const books = await db.query(
          `SELECT * FROM kid_book_progress WHERE kid_name = $1 ORDER BY
           CASE status WHEN 'reading' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, started_at DESC`,
          [kidName.toLowerCase()]
        )
        return NextResponse.json({ books })
      } catch {
        return NextResponse.json({ books: [] })
      }
    }

    case 'get_current_book': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM kid_book_progress WHERE kid_name = $1 AND status = 'reading' LIMIT 1`,
          [kidName.toLowerCase()]
        )
        return NextResponse.json({ book: rows[0] || null })
      } catch {
        return NextResponse.json({ book: null })
      }
    }

    case 'get_history': {
      const kidName = searchParams.get('kid_name')
      const limit = parseInt(searchParams.get('limit') || '20', 10)
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const logs = await db.query(
          `SELECT * FROM kid_reading_log WHERE kid_name = $1 ORDER BY log_date DESC, created_at DESC LIMIT $2`,
          [kidName.toLowerCase(), limit]
        )
        return NextResponse.json({ logs })
      } catch {
        return NextResponse.json({ logs: [] })
      }
    }

    case 'get_stats': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const kid = kidName.toLowerCase()
        const [weekStats, monthStats, finishedCount, streakData] = await Promise.all([
          db.query(
            `SELECT COUNT(DISTINCT log_date)::int AS sessions, COALESCE(SUM(minutes_read), 0)::int AS minutes
             FROM kid_reading_log WHERE kid_name = $1 AND log_date >= date_trunc('week', CURRENT_DATE)`,
            [kid]
          ),
          db.query(
            `SELECT COUNT(DISTINCT log_date)::int AS sessions, COALESCE(SUM(minutes_read), 0)::int AS minutes
             FROM kid_reading_log WHERE kid_name = $1 AND log_date >= date_trunc('month', CURRENT_DATE)`,
            [kid]
          ),
          db.query(
            `SELECT COUNT(*)::int AS count FROM kid_book_progress WHERE kid_name = $1 AND status = 'finished'`,
            [kid]
          ),
          db.query(
            `SELECT DISTINCT log_date FROM kid_reading_log WHERE kid_name = $1 ORDER BY log_date DESC LIMIT 30`,
            [kid]
          ),
        ])

        // Calculate streak
        let streak = 0
        const dates = (streakData || []).map((r: any) => r.log_date)
        if (dates.length > 0) {
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
          let checkDate = new Date(today)
          for (const d of dates) {
            const dateStr = new Date(d).toLocaleDateString('en-CA')
            if (dateStr === checkDate.toLocaleDateString('en-CA')) {
              streak++
              checkDate.setDate(checkDate.getDate() - 1)
            } else {
              break
            }
          }
        }

        return NextResponse.json({
          week: weekStats[0] || { sessions: 0, minutes: 0 },
          month: monthStats[0] || { sessions: 0, minutes: 0 },
          books_finished: finishedCount[0]?.count || 0,
          streak,
        })
      } catch {
        return NextResponse.json({ week: { sessions: 0, minutes: 0 }, month: { sessions: 0, minutes: 0 }, books_finished: 0, streak: 0 })
      }
    }

    case 'get_all_kids_progress': {
      try {
        const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
        const result: any[] = []
        for (const kid of kids) {
          const [currentBook, stats] = await Promise.all([
            db.query(`SELECT * FROM kid_book_progress WHERE kid_name = $1 AND status = 'reading' LIMIT 1`, [kid]),
            db.query(
              `SELECT COUNT(DISTINCT log_date)::int AS sessions, COALESCE(SUM(minutes_read), 0)::int AS minutes
               FROM kid_reading_log WHERE kid_name = $1 AND log_date >= date_trunc('week', CURRENT_DATE)`,
              [kid]
            ),
          ])
          const finished = await db.query(
            `SELECT COUNT(*)::int AS count FROM kid_book_progress WHERE kid_name = $1 AND status = 'finished'`, [kid]
          )
          result.push({
            kid_name: kid,
            current_book: currentBook[0] || null,
            week_sessions: stats[0]?.sessions || 0,
            week_minutes: stats[0]?.minutes || 0,
            books_finished: finished[0]?.count || 0,
          })
        }
        return NextResponse.json({ kids: result })
      } catch {
        return NextResponse.json({ kids: [] })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'log_reading': {
      const { kid_name, book_title, book_id, minutes_read, pages_read, session_notes, finished_book } = body
      if (!kid_name || !book_title || !minutes_read) {
        return NextResponse.json({ error: 'kid_name, book_title, minutes_read required' }, { status: 400 })
      }
      const kid = kid_name.toLowerCase()

      try {
        // Log the session
        await db.query(
          `INSERT INTO kid_reading_log (kid_name, book_id, book_title, minutes_read, pages_read, session_notes, finished_book)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [kid, book_id || null, book_title, minutes_read, pages_read || null, session_notes || null, finished_book || false]
        )

        // Update or create book progress
        if (pages_read || finished_book) {
          const existing = await db.query(
            `SELECT * FROM kid_book_progress WHERE kid_name = $1 AND book_title = $2`,
            [kid, book_title]
          )

          if (existing[0]) {
            const updates: string[] = []
            const params: any[] = [existing[0].id]
            if (pages_read) {
              params.push(pages_read)
              updates.push(`current_page = $${params.length}`)
            }
            if (finished_book) {
              updates.push(`status = 'finished'`)
              updates.push(`finished_at = CURRENT_DATE`)
            }
            if (updates.length > 0) {
              await db.query(`UPDATE kid_book_progress SET ${updates.join(', ')} WHERE id = $1`, params)
            }
          } else {
            await db.query(
              `INSERT INTO kid_book_progress (kid_name, book_id, book_title, current_page, status, total_pages)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [kid, book_id || null, book_title, pages_read || 0, finished_book ? 'finished' : 'reading', null]
            )
          }
        }

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('log_reading error:', error)
        return NextResponse.json({ error: 'Failed to log reading' }, { status: 500 })
      }
    }

    case 'start_book': {
      const { kid_name, book_title, book_id, total_pages } = body
      if (!kid_name || !book_title) return NextResponse.json({ error: 'kid_name and book_title required' }, { status: 400 })
      try {
        await db.query(
          `INSERT INTO kid_book_progress (kid_name, book_id, book_title, total_pages, status)
           VALUES ($1, $2, $3, $4, 'reading')
           ON CONFLICT (kid_name, book_title) DO UPDATE SET status = 'reading', started_at = CURRENT_DATE`,
          [kid_name.toLowerCase(), book_id || null, book_title, total_pages || null]
        )
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('start_book error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    case 'rate_book': {
      const { kid_name, book_title, rating, review } = body
      if (!kid_name || !book_title) return NextResponse.json({ error: 'required' }, { status: 400 })
      try {
        await db.query(
          `UPDATE kid_book_progress SET rating = $3, review = $4 WHERE kid_name = $1 AND book_title = $2`,
          [kid_name.toLowerCase(), book_title, rating || null, review || null]
        )
        return NextResponse.json({ success: true })
      } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
