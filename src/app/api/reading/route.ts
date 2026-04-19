import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { ALL_KIDS } from '@/lib/constants'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

async function lookupBookExternal(query: { isbn?: string; title?: string; author?: string }) {
  try {
    const q = query.isbn ? `isbn:${query.isbn}` : `${query.title || ''}+inauthor:${query.author || ''}`
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`,
      { headers: { 'User-Agent': 'CoralFamilyApp/1.0' } })
    if (res.ok) {
      const data = await res.json()
      const item = data.items?.[0]?.volumeInfo
      if (item) return {
        title: item.title, author: item.authors?.join(', '),
        description: item.description?.substring(0, 300),
        cover_image_url: item.imageLinks?.thumbnail?.replace('http:', 'https:'),
        total_pages: item.pageCount, isbn: query.isbn || item.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier,
        categories: item.categories || [], source: 'google_books', confidence: query.isbn ? 'high' : 'medium',
      }
    }
  } catch { /* fallthrough */ }
  try {
    const url = query.isbn
      ? `https://openlibrary.org/api/books?bibkeys=ISBN:${query.isbn}&format=json&jscmd=data`
      : `https://openlibrary.org/search.json?title=${encodeURIComponent(query.title || '')}&limit=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'CoralFamilyApp/1.0' } })
    if (res.ok) {
      const data = await res.json()
      if (query.isbn) {
        const book = data[`ISBN:${query.isbn}`]
        if (book) return { title: book.title, author: book.authors?.map((a: any) => a.name).join(', '),
          cover_image_url: book.cover?.medium, total_pages: book.number_of_pages,
          isbn: query.isbn, source: 'open_library', confidence: 'high' }
      } else {
        const doc = data.docs?.[0]
        if (doc) return { title: doc.title, author: doc.author_name?.join(', '), total_pages: doc.number_of_pages_median,
          isbn: doc.isbn?.[0], cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
          source: 'open_library', confidence: 'medium' }
      }
    }
  } catch { /* fallthrough */ }
  return { title: query.title || 'Unknown', source: 'manual_needed', confidence: 'low' }
}

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
        const kids = ALL_KIDS
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

    case 'get_my_books': {
      const kid = searchParams.get('kid_name')
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const books = await db.query(
          `SELECT * FROM kid_book_progress WHERE kid_name = $1 ORDER BY
           CASE WHEN status = 'reading' THEN 0 WHEN status = 'paused' THEN 1 ELSE 2 END,
           COALESCE(finished_at, started_at) DESC
           LIMIT 20`,
          [kid.toLowerCase()]
        )
        return NextResponse.json({ books })
      } catch {
        return NextResponse.json({ books: [] })
      }
    }

    // D102: Book lookup
    case 'lookup': {
      const isbn = searchParams.get('isbn')
      const title = searchParams.get('title')
      const author = searchParams.get('author')
      const result = await lookupBookExternal({ isbn: isbn || undefined, title: title || undefined, author: author || undefined })
      return NextResponse.json(result)
    }

    // D102: Recommendations based on interests + reading history
    case 'get_recommendations': {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const interests = await db.query(`SELECT tag FROM kid_interest_tags WHERE kid_name = $1`, [kid]).catch(e => { console.error('[reading]', e.message); return [] })
      const interestTags = interests.map((i: any) => i.tag)
      const readIds = new Set((await db.query(`SELECT book_id FROM kid_book_progress WHERE kid_name = $1`, [kid]).catch(e => { console.error('[reading]', e.message); return [] })).map((r: any) => String(r.book_id)))

      const books = await db.query(
        `SELECT id, title, author_or_publisher AS author, cover_image_url, genres, reading_level_tag, total_pages
           FROM home_library WHERE item_type = 'book' AND genres IS NOT NULL AND genres != '{}' ORDER BY title LIMIT 100`
      ).catch(e => { console.error('[reading]', e.message); return [] })

      const scored = books.filter((b: any) => !readIds.has(String(b.id))).map((b: any) => {
        let score = 0
        if ((b.genres || []).some((g: string) => interestTags.includes(g))) score += 25
        if (b.reading_level_tag) score += 10
        if (b.cover_image_url) score += 5
        return { ...b, score }
      }).sort((a: any, b: any) => b.score - a.score).slice(0, 5)

      return NextResponse.json({ recommendations: scored })
    }

    // D102: Browse by genre/level
    case 'browse': {
      const genre = searchParams.get('genre')
      const level = searchParams.get('level')
      let sql = `SELECT id, title, author_or_publisher AS author, cover_image_url, genres, reading_level_tag, total_pages FROM home_library WHERE item_type = 'book'`
      const params: any[] = []
      if (genre) { params.push(genre); sql += ` AND $${params.length} = ANY(genres)` }
      if (level) { params.push(level); sql += ` AND reading_level_tag = $${params.length}` }
      sql += ` ORDER BY title LIMIT 50`
      const rows = await db.query(sql, params).catch(e => { console.error('[reading]', e.message); return [] })
      return NextResponse.json({ books: rows })
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

    case 'log_enjoyment': {
      const { kid_name, book_title, enjoyment_rating, session_notes } = body
      if (!kid_name || !book_title || !enjoyment_rating) {
        return NextResponse.json({ error: 'kid_name, book_title, enjoyment_rating required' }, { status: 400 })
      }
      try {
        // Add enjoyment_rating column if it doesn't exist
        await db.query(`ALTER TABLE kid_reading_log ADD COLUMN IF NOT EXISTS enjoyment_rating INT`).catch(e => console.error('[reading]', e.message))
        await db.query(
          `INSERT INTO kid_reading_log (kid_name, book_title, minutes_read, enjoyment_rating, session_notes, log_date)
           VALUES ($1, $2, 0, $3, $4, CURRENT_DATE)`,
          [kid_name.toLowerCase(), book_title, enjoyment_rating, session_notes || null]
        )
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('log_enjoyment error:', error)
        return NextResponse.json({ error: 'Failed to log enjoyment' }, { status: 500 })
      }
    }

    case 'finish_book': {
      const { kid_name, book_id, rating, review } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const rows = await db.query(
        `UPDATE kid_book_progress SET status = 'finished', finished_at = NOW(), rating = $3, review = $4
         WHERE kid_name = $1 AND (book_id::text = $2 OR ($2 IS NULL AND status = 'reading')) RETURNING *`,
        [kid, book_id || null, rating || null, review || null]
      )
      await db.query(`UPDATE digi_pets SET stars_balance = stars_balance + 10 WHERE kid_name = $1`, [kid]).catch(e => console.error('[reading]', e.message))
      await db.query(`INSERT INTO digi_pet_star_log (kid_name, amount, source, note) VALUES ($1, 10, 'book_finished', $2)`,
        [kid, `Finished: ${rows[0]?.book_title || 'a book'}`]).catch(e => console.error('[reading]', e.message))
      await createNotification({
        title: `📚 ${cap(kid)} finished a book!`, message: `"${rows[0]?.book_title || 'Unknown'}"${rating ? ` — rated ${rating}/5` : ''}`,
        source_type: 'book_completed', icon: '📚', link_tab: 'homeschool',
      }).catch(e => console.error('[reading]', e.message))
      return NextResponse.json({ success: true, stars: 10, book: rows[0] })
    }

    case 'enrich_book': {
      const { book_id, isbn, title: bTitle, author } = body
      if (!book_id) return NextResponse.json({ error: 'book_id required' }, { status: 400 })
      const result = await lookupBookExternal({ isbn, title: bTitle, author })
      if (result.source !== 'manual_needed') {
        await db.query(
          `UPDATE home_library SET cover_image_url = COALESCE($2, cover_image_url),
             description_short = COALESCE($3, description_short), total_pages = COALESCE($4, total_pages),
             isbn = COALESCE($5, isbn), lookup_source = $6, lookup_at = NOW() WHERE id = $1`,
          [book_id, (result as any).cover_image_url || null, (result as any).description?.substring(0, 300) || null,
           result.total_pages || null, (result as any).isbn || null, result.source]
        ).catch(e => console.error('[reading]', e.message))
      }
      return NextResponse.json({ result })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
