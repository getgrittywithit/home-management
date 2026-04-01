import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

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
        condition,
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
             condition
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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

        // UPC — try Open UPC DB
        // For UPC games, we'd query BoardGameGeek by name after getting the product name
        // This is a simplified version that returns the barcode for manual entry
        return NextResponse.json({
          found: false,
          barcode_type: 'upc',
          message: 'UPC lookup — enter details manually or search BoardGameGeek by name',
          barcode,
        })
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

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
