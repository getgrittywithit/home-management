import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

// Accessibility warning tips
const ACCESSIBILITY_TIPS: Record<string, Record<string, string[]>> = {
  color_heavy: {
    color_vision: [
      'Consider verbal location cues or use stickers to mark pieces.',
      'They may name colors differently — that\'s fine, just keep it consistent.',
    ],
  },
  reading_heavy: {
    dyslexia: ['May need someone to read card/board text aloud. Take turns reading for each other.'],
    suspected_dyslexia: ['May benefit from having card/board text read aloud.'],
  },
  math_heavy: {
    dyscalculia: ['May benefit from a calculator for tracking scores. Focus on the game, not mental math.'],
  },
  verbal_required: {
    speech_delay: ['Give everyone time to answer without rushing. No penalty for taking a moment to find the words.'],
    stutter: ['May need a slower pace during verbal activities. Remove time pressure if possible.'],
    apd: ['Read instructions slowly and clearly, repeat if needed. Avoid explaining rules over background noise.'],
  },
  auditory_instruction_heavy: {
    apd: ['Read instructions slowly and clearly, repeat if needed. Avoid explaining rules over background noise.'],
  },
  timed_pressure: {
    adhd: ['Consider removing the timer for this round — make it untimed to reduce pressure.'],
    stutter: ['Timed pressure can increase stuttering. Consider removing the timer.'],
  },
  complex_rules: {
    autism: ['Read rules aloud before starting. Consider a practice round with no score to get familiar first.'],
  },
  highly_competitive: {
    autism: ['May need extra support around winning/losing. Consider a cooperative mode if available.'],
  },
  loud_chaotic: {
    autism: ['This game can get loud and fast-paced. Consider setting volume/energy boundaries before starting.'],
  },
}

const KID_FLAGS: Record<string, string[]> = {
  amos: ['dyslexia', 'dyscalculia', 'speech_delay', 'apd', 'color_vision', 'adhd', 'autism'],
  ellie: ['speech_delay', 'suspected_adhd'],
  wyatt: ['speech_delay', 'adhd', 'color_vision'],
  hannah: ['speech_delay', 'stutter'],
  kaylee: ['speech_delay', 'autism', 'suspected_dyslexia'],
  zoey: [],
  lola: ['dyscalculia', 'speech', 'stutter', 'apd'],
}

// ============================================================================
// GET /api/library?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // get_all_items — full library with optional filters
    // ------------------------------------------------------------------
    case 'get_all_items': {
      const filterType = searchParams.get('filter_type')
      const subject = searchParams.get('subject')
      const kidName = searchParams.get('kid_name')

      try {
        let sql = `SELECT * FROM home_library WHERE active = TRUE AND archived = FALSE`
        const params: any[] = []

        if (filterType) {
          sql += ` AND item_type = $${params.length + 1}`
          params.push(filterType)
        }
        if (subject) {
          sql += ` AND $${params.length + 1} = ANY(subject_tags)`
          params.push(subject)
        }
        if (kidName) {
          sql += ` AND $${params.length + 1} = ANY(who_uses)`
          params.push(kidName.toLowerCase())
        }

        sql += ` ORDER BY item_type, title`
        const items = await db.query(sql, params)
        return NextResponse.json({ items })
      } catch (error) {
        console.error('get_all_items error:', error)
        return NextResponse.json({ error: 'Failed to load library items' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_item — single item by id
    // ------------------------------------------------------------------
    case 'get_item': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      try {
        const rows = await db.query(`SELECT * FROM home_library WHERE id = $1`, [id])
        if (!rows[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        return NextResponse.json({ item: rows[0] })
      } catch (error) {
        console.error('get_item error:', error)
        return NextResponse.json({ error: 'Failed to load item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // search — text search across title, description, edu_uses
    // ------------------------------------------------------------------
    case 'search': {
      const q = searchParams.get('q')
      const subject = searchParams.get('subject')
      if (!q && !subject) return NextResponse.json({ error: 'q or subject required' }, { status: 400 })

      try {
        let sql = `SELECT * FROM home_library WHERE active = TRUE AND archived = FALSE`
        const params: any[] = []

        if (q) {
          sql += ` AND (LOWER(title) LIKE $${params.length + 1} OR LOWER(COALESCE(description,'')) LIKE $${params.length + 1})`
          params.push(`%${q.toLowerCase()}%`)
        }
        if (subject) {
          sql += ` AND $${params.length + 1} = ANY(subject_tags)`
          params.push(subject)
        }

        sql += ` ORDER BY title LIMIT 20`
        const items = await db.query(sql, params)
        return NextResponse.json({ items })
      } catch (error) {
        console.error('search error:', error)
        return NextResponse.json({ error: 'Failed to search library' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_usage_stats — which items are used most/least
    // ------------------------------------------------------------------
    case 'get_usage_stats': {
      try {
        const stats = await db.query(
          `SELECT h.id, h.title, h.item_type,
                  COUNT(l.id)::int AS times_selected,
                  MAX(l.searched_at) AS last_selected
           FROM home_library h
           LEFT JOIN library_search_log l ON l.item_selected = h.id
           WHERE h.active = TRUE AND h.archived = FALSE
           GROUP BY h.id, h.title, h.item_type
           ORDER BY times_selected DESC, h.title`
        )
        return NextResponse.json({ stats })
      } catch (error) {
        console.error('get_usage_stats error:', error)
        return NextResponse.json({ error: 'Failed to load usage stats' }, { status: 500 })
      }
    }

    case 'get_pending_submissions': {
      try {
        const rows = await db.query(`SELECT * FROM library_submissions WHERE status = 'pending' ORDER BY submitted_at DESC`)
        return NextResponse.json({ submissions: rows })
      } catch { return NextResponse.json({ submissions: [] }) }
    }

    case 'get_my_submissions': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT id, item_type, title, author_or_publisher, reason, status, parent_note, submitted_at as created_at
           FROM library_submissions WHERE kid_name = $1 ORDER BY submitted_at DESC LIMIT 20`,
          [kidName.toLowerCase()]
        )
        return NextResponse.json({ submissions: rows })
      } catch { return NextResponse.json({ submissions: [] }) }
    }

    // ------------------------------------------------------------------
    // get_book_detail — item + read status + ratings + reviews + recs
    // ------------------------------------------------------------------
    case 'get_book_detail': {
      const id = searchParams.get('id')
      const kidName = searchParams.get('kid_name')?.toLowerCase() || null
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      try {
        const itemRows = await db.query(`SELECT * FROM home_library WHERE id = $1`, [id])
        if (!itemRows[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        const item = itemRows[0]

        const readStatus = await db.query(
          `SELECT kid_name, status, started_at, finished_at, current_page, current_chapter, updated_at
           FROM library_read_status WHERE book_id = $1`,
          [id]
        )

        const ratings = await db.query(
          `SELECT rated_by, rating, updated_at FROM library_ratings WHERE book_id = $1`,
          [id]
        )
        const avg = ratings.length > 0
          ? Math.round((ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length) * 10) / 10
          : null

        const reviews = await db.query(
          `SELECT id, reviewer, review_text, favorite_part, favorite_character, would_recommend, stars_earned, created_at
           FROM library_reviews WHERE book_id = $1 ORDER BY created_at DESC`,
          [id]
        )

        // Recommendations: same author first, then tag overlap (genres/topics/subject_tags/edu_uses)
        const recsSql = `
          WITH target AS (
            SELECT id,
                   author_or_publisher,
                   COALESCE(genres, '{}') AS genres,
                   COALESCE(topics, '{}') AS topics,
                   COALESCE(subject_tags, '{}') AS subject_tags,
                   COALESCE(edu_uses, '{}') AS edu_uses
            FROM home_library WHERE id = $1
          )
          SELECT h.id, h.title, h.author_or_publisher, h.cover_image_url, h.item_type,
                 h.subject_tags, h.genres, h.topics,
                 (
                   CASE WHEN h.author_or_publisher IS NOT NULL
                             AND h.author_or_publisher = (SELECT author_or_publisher FROM target)
                        THEN 10 ELSE 0 END
                   + cardinality(ARRAY(SELECT unnest(COALESCE(h.genres,'{}')) INTERSECT SELECT unnest((SELECT genres FROM target)))) * 3
                   + cardinality(ARRAY(SELECT unnest(COALESCE(h.topics,'{}')) INTERSECT SELECT unnest((SELECT topics FROM target)))) * 2
                   + cardinality(ARRAY(SELECT unnest(COALESCE(h.subject_tags,'{}')) INTERSECT SELECT unnest((SELECT subject_tags FROM target))))
                   + cardinality(ARRAY(SELECT unnest(COALESCE(h.edu_uses,'{}')) INTERSECT SELECT unnest((SELECT edu_uses FROM target))))
                 ) AS score
          FROM home_library h
          WHERE h.id <> $1 AND h.active = TRUE AND h.archived = FALSE AND h.item_type = 'book'
          ORDER BY score DESC, h.title
          LIMIT 5
        `
        const recs = await db.query(recsSql, [id])
        const filteredRecs = recs.filter((r: any) => r.score > 0)

        let kidStatus = null
        if (kidName) {
          kidStatus = readStatus.find((r: any) => r.kid_name === kidName) || { kid_name: kidName, status: 'not_started' }
        }

        return NextResponse.json({
          item,
          read_status: readStatus,
          kid_status: kidStatus,
          ratings,
          avg_rating: avg,
          reviews,
          recommendations: filteredRecs,
        })
      } catch (error) {
        console.error('get_book_detail error:', error)
        return NextResponse.json({ error: 'Failed to load book detail' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_library_browse — list + avg rating + viewer's read status
    // ------------------------------------------------------------------
    case 'get_library_browse': {
      const kidName = searchParams.get('kid_name')?.toLowerCase() || null
      const filterType = searchParams.get('filter_type')
      const subject = searchParams.get('subject')
      const genre = searchParams.get('genre')
      const readStatus = searchParams.get('read_status')
      const minAge = searchParams.get('min_age')
      const maxAge = searchParams.get('max_age')
      const minRating = searchParams.get('min_rating')
      const sort = searchParams.get('sort') || 'title'

      try {
        const params: any[] = []
        let where = `h.active = TRUE AND h.archived = FALSE`

        if (filterType) { params.push(filterType); where += ` AND h.item_type = $${params.length}` }
        if (subject) { params.push(subject); where += ` AND $${params.length} = ANY(h.subject_tags)` }
        if (genre) { params.push(genre); where += ` AND $${params.length} = ANY(h.genres)` }
        if (minAge) { params.push(parseInt(minAge)); where += ` AND (h.age_range_max IS NULL OR h.age_range_max >= $${params.length})` }
        if (maxAge) { params.push(parseInt(maxAge)); where += ` AND (h.age_range_min IS NULL OR h.age_range_min <= $${params.length})` }

        let orderBy = 'h.title'
        if (sort === 'recent') orderBy = 'h.added_at DESC NULLS LAST, h.title'
        else if (sort === 'rating') orderBy = 'avg_rating DESC NULLS LAST, h.title'
        else if (sort === 'reviews') orderBy = 'review_count DESC, h.title'

        const sql = `
          SELECT h.*,
                 (SELECT ROUND(AVG(rating)::numeric, 1) FROM library_ratings r WHERE r.book_id = h.id) AS avg_rating,
                 (SELECT COUNT(*)::int FROM library_ratings r WHERE r.book_id = h.id) AS rating_count,
                 (SELECT COUNT(*)::int FROM library_reviews v WHERE v.book_id = h.id) AS review_count
                 ${kidName ? `, (SELECT status FROM library_read_status s WHERE s.book_id = h.id AND s.kid_name = $${params.length + 1}) AS kid_read_status` : ''}
          FROM home_library h
          WHERE ${where}
          ORDER BY ${orderBy}
        `
        if (kidName) params.push(kidName)

        let items = await db.query(sql, params)

        if (minRating) {
          const mr = parseFloat(minRating)
          items = items.filter((i: any) => i.avg_rating !== null && parseFloat(i.avg_rating) >= mr)
        }
        if (readStatus && kidName) {
          if (readStatus === 'not_started') {
            items = items.filter((i: any) => !i.kid_read_status || i.kid_read_status === 'not_started')
          } else {
            items = items.filter((i: any) => i.kid_read_status === readStatus)
          }
        }

        return NextResponse.json({ items })
      } catch (error) {
        console.error('get_library_browse error:', error)
        return NextResponse.json({ error: 'Failed to load library browse' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // fetch_openlibrary — public lookup by ISBN or title+author
    // ------------------------------------------------------------------
    case 'fetch_openlibrary': {
      const isbn = searchParams.get('isbn')
      const title = searchParams.get('title')
      const author = searchParams.get('author')
      try {
        if (isbn) {
          const cleaned = isbn.replace(/[^0-9X]/g, '')
          const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleaned}-L.jpg`
          const metaRes = await fetch(`https://openlibrary.org/isbn/${cleaned}.json`)
          let description: string | null = null
          let age_range_min: number | null = null
          let age_range_max: number | null = null
          if (metaRes.ok) {
            const meta = await metaRes.json() as any
            if (meta.description) {
              description = typeof meta.description === 'string' ? meta.description : meta.description.value || null
            }
          }
          return NextResponse.json({
            cover_url: coverUrl,
            description,
            age_range_min,
            age_range_max,
            source: 'openlibrary_isbn',
          })
        }
        if (title) {
          const q = new URLSearchParams({ title, ...(author ? { author } : {}), limit: '1' })
          const searchRes = await fetch(`https://openlibrary.org/search.json?${q.toString()}`)
          if (!searchRes.ok) return NextResponse.json({ error: 'search failed' }, { status: 502 })
          const json = await searchRes.json() as any
          const doc = json.docs?.[0]
          if (!doc) return NextResponse.json({ error: 'no match' }, { status: 404 })
          const coverUrl = doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
            : doc.isbn?.[0]
              ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
              : null
          return NextResponse.json({
            cover_url: coverUrl,
            description: doc.first_sentence?.[0] || null,
            isbn: doc.isbn?.[0] || null,
            author: doc.author_name?.[0] || null,
            first_publish_year: doc.first_publish_year || null,
            source: 'openlibrary_search',
          })
        }
        return NextResponse.json({ error: 'isbn or title required' }, { status: 400 })
      } catch (error) {
        console.error('fetch_openlibrary error:', error)
        return NextResponse.json({ error: 'Open Library fetch failed' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  }
}

// ============================================================================
// POST /api/library  { action, ...body }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, ...data } = body

  switch (action) {
    // ------------------------------------------------------------------
    // add_item — add a new library item
    // ------------------------------------------------------------------
    case 'add_item': {
      const {
        item_type, title, author_or_publisher, isbn, upc, description,
        cover_image_url, grade_min, grade_max, subject_tags, edu_uses,
        player_min, player_max, play_time_min, play_time_max, play_style,
        competition_level, accessibility_flags, who_uses, location_in_home,
        condition, year_acquired, custom_tags, storage_detail, acquired_from, added_by,
      } = data
      if (!item_type || !title) {
        return NextResponse.json({ error: 'item_type and title required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `INSERT INTO home_library (
             item_type, title, author_or_publisher, isbn, upc, description,
             cover_image_url, grade_min, grade_max, subject_tags, edu_uses,
             player_min, player_max, play_time_min, play_time_max, play_style,
             competition_level, accessibility_flags, who_uses, location_in_home,
             condition, year_acquired, custom_tags, storage_detail, acquired_from, added_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
           RETURNING *`,
          [
            item_type, title, author_or_publisher || null, isbn || null, upc || null,
            description || null, cover_image_url || null,
            grade_min ?? null, grade_max ?? null,
            subject_tags || null, edu_uses || null,
            player_min ?? null, player_max ?? null,
            play_time_min ?? null, play_time_max ?? null,
            play_style || null, competition_level || null,
            accessibility_flags || null, who_uses || null,
            location_in_home || null, condition || null,
            year_acquired || null, custom_tags || [], storage_detail || null, acquired_from || null, added_by || 'parent',
          ]
        )
        return NextResponse.json({ item: result[0] }, { status: 201 })
      } catch (error) {
        console.error('add_item error:', error)
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_item — update an existing library item
    // ------------------------------------------------------------------
    case 'update_item': {
      const { id, ...updates } = data
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      const allowedFields = [
        'title', 'author_or_publisher', 'isbn', 'upc', 'description',
        'cover_image_url', 'grade_min', 'grade_max', 'subject_tags', 'edu_uses',
        'player_min', 'player_max', 'play_time_min', 'play_time_max', 'play_style',
        'competition_level', 'accessibility_flags', 'who_uses', 'location_in_home',
        'condition', 'favorite_flag', 'item_type', 'last_used',
        'hook', 'age_range_min', 'age_range_max', 'genres', 'topics', 'location_details',
      ]

      const setClauses: string[] = []
      const params: any[] = [id]

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          params.push(value)
          setClauses.push(`${key} = $${params.length}`)
        }
      }

      if (setClauses.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `UPDATE home_library SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        if (!result[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        return NextResponse.json({ item: result[0] })
      } catch (error) {
        console.error('update_item error:', error)
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // archive_item — soft-delete an item
    // ------------------------------------------------------------------
    case 'archive_item': {
      const { id } = data
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE home_library SET archived = TRUE WHERE id = $1 RETURNING *`,
          [id]
        )
        if (!result[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        return NextResponse.json({ item: result[0] })
      } catch (error) {
        console.error('archive_item error:', error)
        return NextResponse.json({ error: 'Failed to archive item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // bulk_update_tags — update tags on multiple items at once
    // ------------------------------------------------------------------
    case 'bulk_update_tags': {
      const { item_ids, subject_tags, accessibility_flags, who_uses } = data
      if (!item_ids || !item_ids.length) {
        return NextResponse.json({ error: 'item_ids required' }, { status: 400 })
      }

      try {
        const setClauses: string[] = []
        const params: any[] = [item_ids]

        if (subject_tags) {
          params.push(subject_tags)
          setClauses.push(`subject_tags = $${params.length}`)
        }
        if (accessibility_flags) {
          params.push(accessibility_flags)
          setClauses.push(`accessibility_flags = $${params.length}`)
        }
        if (who_uses) {
          params.push(who_uses)
          setClauses.push(`who_uses = $${params.length}`)
        }

        if (setClauses.length === 0) {
          return NextResponse.json({ error: 'No tags to update' }, { status: 400 })
        }

        const result = await db.query(
          `UPDATE home_library SET ${setClauses.join(', ')}
           WHERE id = ANY($1::uuid[])
           RETURNING *`,
          params
        )
        return NextResponse.json({ updated: result.length, items: result })
      } catch (error) {
        console.error('bulk_update_tags error:', error)
        return NextResponse.json({ error: 'Failed to bulk update tags' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // lookup_barcode — look up book/game by ISBN or UPC
    // ------------------------------------------------------------------
    case 'lookup_barcode': {
      const { barcode, barcode_type } = data
      if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

      try {
        if (barcode_type === 'isbn') {
          // Google Books API (free, no key)
          const res = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(barcode)}&maxResults=1`
          )
          const json = await res.json()

          if (json.items && json.items.length > 0) {
            const vol = json.items[0].volumeInfo
            return NextResponse.json({
              found: true,
              item: {
                item_type: 'book',
                title: vol.title || '',
                author_or_publisher: (vol.authors || []).join(', '),
                isbn: barcode,
                description: vol.description || '',
                cover_image_url: vol.imageLinks?.thumbnail || null,
                grade_min: null,
                grade_max: null,
                subject_tags: (vol.categories || []).map((c: string) => c.toLowerCase()),
              },
            })
          }
          return NextResponse.json({ found: false, barcode_type: 'isbn' })
        }

        // UPC — try Open Food Facts then UPCitemdb
        try {
          const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
          const offData = await offRes.json()
          if (offData.status === 1 && offData.product) {
            const p = offData.product
            return NextResponse.json({
              found: true, source: 'openfoodfacts',
              item: { item_type: 'other', title: p.product_name || p.generic_name || '', author_or_publisher: p.brands || '', upc: barcode, cover_image_url: p.image_url || null },
            })
          }
        } catch {}
        try {
          const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`)
          const upcData = await upcRes.json()
          if (upcData.items?.length > 0) {
            const item = upcData.items[0]
            return NextResponse.json({
              found: true, source: 'upcitemdb',
              item: { item_type: 'other', title: item.title || '', author_or_publisher: item.brand || '', upc: barcode, cover_image_url: (item.images || [])[0] || null, description: item.description || '' },
            })
          }
        } catch {}
        return NextResponse.json({ found: false, barcode_type: 'upc', barcode })
      } catch (error) {
        console.error('lookup_barcode error:', error)
        return NextResponse.json({ error: 'Failed to look up barcode' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // buddy_search — AI Library Buddy 3-step search
    // ------------------------------------------------------------------
    case 'buddy_search': {
      const { format, subject_mood, time_available, kid_name } = data

      try {
        let sql = `SELECT * FROM home_library WHERE active = TRUE AND archived = FALSE`
        sql += ` AND COALESCE(audience_type, 'everyone') NOT IN ('parent_only', 'teacher_resource')`
        sql += ` AND item_type != 'workbook'`
        const params: any[] = []

        // Format filter
        if (format === 'read') {
          sql += ` AND item_type IN ('book','resource')`
        } else if (format === 'play') {
          sql += ` AND item_type IN ('game','toy','resource')`
        }

        // Subject/mood filter
        const subjectMap: Record<string, string[]> = {
          math: ['math', 'financial_literacy'],
          story: ['elar'],
          nature: ['science'],
          places: ['social_studies', 'geography'],
          art: ['art'],
        }
        if (subject_mood && subject_mood !== 'surprise' && subjectMap[subject_mood]) {
          const subjects = subjectMap[subject_mood]
          sql += ` AND subject_tags && $${params.length + 1}::text[]`
          params.push(subjects)
        }

        // Play style filter (for games)
        if (format === 'play') {
          if (subject_mood === 'together' || subject_mood === 'with_someone') {
            sql += ` AND (player_max IS NULL OR player_max >= 2)`
          } else if (subject_mood === 'solo' || subject_mood === 'just_me') {
            sql += ` AND (player_min IS NULL OR player_min <= 1)`
          } else if (subject_mood === 'cooperative' || subject_mood === 'work_together') {
            sql += ` AND play_style IN ('cooperative','mixed','any')`
          } else if (subject_mood === 'compete') {
            sql += ` AND play_style IN ('competitive','mixed','any')`
          }
        }

        // Time filter
        if (time_available === 'quick') {
          if (format === 'play') {
            sql += ` AND (play_time_max IS NULL OR play_time_max <= 15)`
          }
          // For books: no time filter needed, all books can be read briefly
        } else if (time_available === 'medium') {
          if (format === 'play') {
            sql += ` AND (play_time_min IS NULL OR play_time_min <= 30)`
          }
        }
        // 'long' = no filter, show everything

        // Kid filter: prioritize items tagged for this kid
        if (kid_name) {
          sql += ` ORDER BY CASE WHEN $${params.length + 1} = ANY(who_uses) THEN 0 ELSE 1 END, RANDOM()`
          params.push(kid_name.toLowerCase())
        } else {
          sql += ` ORDER BY RANDOM()`
        }

        sql += ` LIMIT 3`
        const items = await db.query(sql, params)

        // If less than 2 results and format=read, suggest from Google Books
        let suggestions: any[] = []
        if (items.length < 2 && format === 'read' && subject_mood && subject_mood !== 'surprise') {
          try {
            const subjectQuery = subject_mood === 'story' ? 'fiction children' :
              subject_mood === 'nature' ? 'nature animals children' :
              subject_mood === 'places' ? 'geography world children' :
              subject_mood === 'art' ? 'art activities children' :
              subject_mood === 'math' ? 'math activities children' : 'children books'

            const gRes = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(subjectQuery)}&maxResults=3&orderBy=relevance`
            )
            const gJson = await gRes.json()
            if (gJson.items) {
              suggestions = gJson.items.map((item: any) => ({
                title: item.volumeInfo.title,
                author: (item.volumeInfo.authors || []).join(', '),
                description: item.volumeInfo.description?.slice(0, 200) || '',
                cover_image_url: item.volumeInfo.imageLinks?.thumbnail || null,
                external: true,
              }))
            }
          } catch {
            // Ignore external API errors
          }
        }

        return NextResponse.json({ items, suggestions, total_home_results: items.length })
      } catch (error) {
        console.error('buddy_search error:', error)
        return NextResponse.json({ error: 'Failed to search library' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // check_accessibility_match — warnings for kid + item combo
    // ------------------------------------------------------------------
    case 'check_accessibility_match': {
      const { item_id, kid_names } = data
      if (!item_id || !kid_names || !kid_names.length) {
        return NextResponse.json({ error: 'item_id and kid_names required' }, { status: 400 })
      }

      try {
        const rows = await db.query(
          `SELECT accessibility_flags, title FROM home_library WHERE id = $1`,
          [item_id]
        )
        if (!rows[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        const itemFlags: string[] = rows[0].accessibility_flags || []
        const warnings: { kid_name: string; flag: string; item_flag: string; tip: string }[] = []

        for (const kidName of kid_names) {
          const kid = kidName.toLowerCase()
          const kidFlags = KID_FLAGS[kid] || []

          for (const itemFlag of itemFlags) {
            const tipMap = ACCESSIBILITY_TIPS[itemFlag]
            if (!tipMap) continue

            for (const kidFlag of kidFlags) {
              const tips = tipMap[kidFlag]
              if (tips) {
                for (const tip of tips) {
                  warnings.push({
                    kid_name: kid,
                    flag: kidFlag,
                    item_flag: itemFlag,
                    tip: `${kid.charAt(0).toUpperCase() + kid.slice(1)}: ${tip}`,
                  })
                }
              }
            }
          }
        }

        return NextResponse.json({ title: rows[0].title, warnings })
      } catch (error) {
        console.error('check_accessibility_match error:', error)
        return NextResponse.json({ error: 'Failed to check accessibility' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // log_library_search — track searches for improvement
    // ------------------------------------------------------------------
    case 'log_library_search': {
      const { kid_name, search_type, query_subject, query_mood, query_format, results_returned, item_selected } = data

      try {
        await db.query(
          `INSERT INTO library_search_log
             (kid_name, search_type, query_subject, query_mood, query_format, results_returned, item_selected)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [kid_name || null, search_type || null, query_subject || null, query_mood || null, query_format || null, results_returned ?? null, item_selected || null]
        )
        return NextResponse.json({ ok: true })
      } catch (error) {
        console.error('log_library_search error:', error)
        return NextResponse.json({ error: 'Failed to log search' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // log_item_used — record item usage
    // ------------------------------------------------------------------
    case 'log_item_used': {
      const { item_id, kid_name } = data
      if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 })

      try {
        // Update last_used on the item
        await db.query(
          `UPDATE home_library SET last_used = CURRENT_DATE WHERE id = $1`,
          [item_id]
        )
        // Also log in search log as a browse action
        if (kid_name) {
          await db.query(
            `INSERT INTO library_search_log (kid_name, search_type, item_selected)
             VALUES ($1, 'browse', $2)`,
            [kid_name.toLowerCase(), item_id]
          )
        }
        return NextResponse.json({ ok: true })
      } catch (error) {
        console.error('log_item_used error:', error)
        return NextResponse.json({ error: 'Failed to log item use' }, { status: 500 })
      }
    }

    // LIB-2: Library submission review (parent)
    case 'get_pending_submissions': {
      try {
        const rows = await db.query(`SELECT * FROM library_submissions WHERE status = 'pending' ORDER BY submitted_at DESC`)
        return NextResponse.json({ submissions: rows })
      } catch { return NextResponse.json({ submissions: [] }) }
    }

    case 'approve_submission': {
      const { submission_id } = data
      if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
      try {
        const sub = await db.query(`SELECT * FROM library_submissions WHERE id = $1`, [submission_id])
        if (!sub[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })
        const s = sub[0]
        await db.query(
          `INSERT INTO home_library (item_type, title, author_or_publisher, isbn, upc, description, location_in_home, custom_tags, cover_image_url, added_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [s.item_type, s.title, s.author_or_publisher, s.isbn, s.upc, s.description, s.location_in_home, s.custom_tags || [], s.cover_image_url, s.kid_name]
        )
        await db.query(`UPDATE library_submissions SET status = 'approved', reviewed_at = NOW() WHERE id = $1`, [submission_id])
        await createNotification({
          title: 'Library item approved!',
          message: `"${s.title}" is now in the family library`,
          source_type: 'library_approved', source_ref: `kid:${s.kid_name}`,
          link_tab: 'library', icon: '📚',
          target_role: 'kid', kid_name: s.kid_name,
        }).catch(() => {})
        return NextResponse.json({ success: true })
      } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
    }

    case 'reject_submission': {
      const { submission_id, parent_note } = data
      if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
      const sub = await db.query(`SELECT * FROM library_submissions WHERE id = $1`, [submission_id]).catch(() => [])
      await db.query(
        `UPDATE library_submissions SET status = 'rejected', parent_note = $2, reviewed_at = NOW() WHERE id = $1`,
        [submission_id, parent_note || 'Please check and resubmit']
      )
      if (sub[0]) {
        await createNotification({
          title: 'Library submission needs edits',
          message: `"${sub[0].title}": ${parent_note || 'Check details and resubmit'}`,
          source_type: 'library_rejected', source_ref: `kid:${sub[0].kid_name}`,
          link_tab: 'library', icon: '📝',
          target_role: 'kid', kid_name: sub[0].kid_name,
        }).catch(() => {})
      }
      return NextResponse.json({ success: true })
    }

    // Kid submission
    case 'submit_item': {
      const { kid_name, item_type, title, author_or_publisher, isbn_upc, reason } = data
      if (!kid_name || !title) return NextResponse.json({ error: 'kid_name and title required' }, { status: 400 })
      try {
        await db.query(
          `INSERT INTO library_submissions (kid_name, item_type, title, author_or_publisher, isbn, reason, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [kid_name.toLowerCase(), item_type || 'book', title.trim(), author_or_publisher || null, isbn_upc || null, reason || null]
        )
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
        await createNotification({
          title: `Library suggestion from ${kidDisplay}`,
          message: `${kidDisplay} suggested: "${title.trim()}"`,
          source_type: 'library_submission', source_ref: `kid:${kid_name.toLowerCase()}`,
          link_tab: 'library', icon: '📚',
        }).catch(() => {})
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('submit_item error:', error)
        return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // set_read_status — kid marks book as reading/finished/etc
    // ------------------------------------------------------------------
    case 'set_read_status': {
      const { book_id, kid_name, status, current_page, current_chapter } = data
      if (!book_id || !kid_name || !status) {
        return NextResponse.json({ error: 'book_id, kid_name, status required' }, { status: 400 })
      }
      const validStatuses = ['not_started', 'want_to_read', 'reading', 'finished', 'read_again']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'invalid status' }, { status: 400 })
      }
      try {
        const startedExpr =
          status === 'reading' || status === 'read_again'
            ? 'COALESCE(library_read_status.started_at, NOW())'
            : status === 'not_started' ? 'NULL' : 'library_read_status.started_at'
        const finishedExpr =
          status === 'finished'
            ? 'NOW()'
            : status === 'not_started' ? 'NULL' : 'library_read_status.finished_at'
        const insertStarted = status === 'reading' || status === 'read_again' ? 'NOW()' : 'NULL'
        const insertFinished = status === 'finished' ? 'NOW()' : 'NULL'
        const rows = await db.query(
          `INSERT INTO library_read_status (book_id, kid_name, status, current_page, current_chapter, started_at, finished_at)
           VALUES ($1, $2, $3, $4, $5, ${insertStarted}, ${insertFinished})
           ON CONFLICT (book_id, kid_name) DO UPDATE SET
             status = EXCLUDED.status,
             current_page = COALESCE(EXCLUDED.current_page, library_read_status.current_page),
             current_chapter = COALESCE(EXCLUDED.current_chapter, library_read_status.current_chapter),
             started_at = ${startedExpr},
             finished_at = ${finishedExpr},
             updated_at = NOW()
           RETURNING *`,
          [book_id, kid_name.toLowerCase(), status, current_page ?? null, current_chapter || null]
        )
        return NextResponse.json({ status: rows[0] })
      } catch (error) {
        console.error('set_read_status error:', error)
        return NextResponse.json({ error: 'Failed to set read status' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // rate_book — 1..5 star rating (upsert per kid)
    // ------------------------------------------------------------------
    case 'rate_book': {
      const { book_id, rated_by, rating } = data
      if (!book_id || !rated_by || !rating) {
        return NextResponse.json({ error: 'book_id, rated_by, rating required' }, { status: 400 })
      }
      const r = parseInt(rating)
      if (r < 1 || r > 5) return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
      try {
        const rows = await db.query(
          `INSERT INTO library_ratings (book_id, rated_by, rating)
           VALUES ($1, $2, $3)
           ON CONFLICT (book_id, rated_by) DO UPDATE SET
             rating = EXCLUDED.rating,
             updated_at = NOW()
           RETURNING *`,
          [book_id, rated_by.toLowerCase(), r]
        )
        return NextResponse.json({ rating: rows[0] })
      } catch (error) {
        console.error('rate_book error:', error)
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // add_review — family review / mini book report (+3 stars)
    // ------------------------------------------------------------------
    case 'add_review': {
      const { book_id, reviewer, review_text, favorite_part, favorite_character, would_recommend } = data
      if (!book_id || !reviewer || !review_text || !review_text.trim()) {
        return NextResponse.json({ error: 'book_id, reviewer, review_text required' }, { status: 400 })
      }
      if (review_text.trim().length < 10) {
        return NextResponse.json({ error: 'review_text too short (min 10 chars)' }, { status: 400 })
      }
      const starsEarned = 3
      try {
        const rows = await db.query(
          `INSERT INTO library_reviews (book_id, reviewer, review_text, favorite_part, favorite_character, would_recommend, stars_earned)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            book_id, reviewer.toLowerCase(), review_text.trim(),
            favorite_part || null, favorite_character || null,
            would_recommend ?? null, starsEarned,
          ]
        )
        // Award stars via points system
        try {
          await db.query(
            `INSERT INTO kid_points (kid_name, points, source, source_ref, awarded_at)
             VALUES ($1, $2, 'book_review', $3, NOW())`,
            [reviewer.toLowerCase(), starsEarned, rows[0].id]
          )
        } catch {
          // points table may use a different schema — non-fatal
        }
        return NextResponse.json({ review: rows[0], stars_earned: starsEarned })
      } catch (error) {
        console.error('add_review error:', error)
        return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
      }
    }

    // UPLOAD-1: Bulk add items — dedups by ISBN or exact (title, author_or_publisher) match
    case 'bulk_add_items': {
      const { items } = data
      if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'items array required' }, { status: 400 })
      if (items.length > 200) return NextResponse.json({ error: 'Max 200 items per batch' }, { status: 400 })

      let added = 0
      let skipped = 0
      const skippedItems: { title: string; reason: string }[] = []

      for (const item of items) {
        try {
          // Duplicate check: prefer ISBN match, fall back to case-insensitive title+author
          let dupe: any[] = []
          if (item.isbn) {
            dupe = await db.query(
              `SELECT id FROM home_library WHERE isbn = $1 AND active = TRUE AND archived = FALSE LIMIT 1`,
              [item.isbn]
            ).catch(() => [])
          }
          if (dupe.length === 0 && item.title) {
            dupe = await db.query(
              `SELECT id FROM home_library
               WHERE LOWER(title) = LOWER($1)
                 AND LOWER(COALESCE(author_or_publisher, '')) = LOWER(COALESCE($2, ''))
                 AND active = TRUE AND archived = FALSE
               LIMIT 1`,
              [item.title, item.author_or_publisher || null]
            ).catch(() => [])
          }
          if (dupe.length > 0) {
            skipped++
            skippedItems.push({ title: item.title || '(untitled)', reason: 'already in library' })
            continue
          }

          await db.query(
            `INSERT INTO home_library (
               item_type, title, author_or_publisher, isbn, upc, description,
               cover_image_url, subject_tags, location_in_home, condition, custom_tags, who_uses
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              item.item_type || 'book',
              item.title,
              item.author_or_publisher || null,
              item.isbn || null,
              item.upc || null,
              item.description || null,
              item.cover_image_url || null,
              item.subject_tags || [],
              item.location_in_home || null,
              item.condition || 'good',
              item.custom_tags || [],
              item.who_uses || [],
            ]
          )
          added++
        } catch (err) {
          skipped++
          skippedItems.push({ title: item.title || '(untitled)', reason: 'insert failed' })
        }
      }
      return NextResponse.json({ success: true, items_added: added, items_skipped: skipped, skipped: skippedItems })
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
