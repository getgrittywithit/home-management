import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// GET /api/vocab?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      // ----------------------------------------------------------------
      // get_word_of_the_day — active word from family_vocab_words
      // ----------------------------------------------------------------
      case 'get_word_of_the_day': {
        const rows = await db.query(
          `SELECT w.*, b.title AS source_book
           FROM family_vocab_words w
           LEFT JOIN vocab_books b ON w.book_id = b.id
           WHERE w.is_active = true
           LIMIT 1`
        )
        return NextResponse.json({ word: rows[0] || null })
      }

      // ----------------------------------------------------------------
      // get_all_words — words for a book with status
      // ----------------------------------------------------------------
      case 'get_all_words': {
        const bookId = searchParams.get('book_id')
        if (!bookId) return NextResponse.json({ error: 'book_id required' }, { status: 400 })

        const rotation = await db.query(
          `SELECT current_day_number FROM family_vocab_rotation LIMIT 1`
        )
        const currentDay = rotation[0]?.current_day_number || 1

        const words = await db.query(
          `SELECT w.*, b.title AS source_book
           FROM family_vocab_words w
           LEFT JOIN vocab_books b ON w.book_id = b.id
           WHERE w.book_id = $1
           ORDER BY w.day_number ASC`,
          [bookId]
        )

        const withStatus = words.map((w: any) => ({
          ...w,
          status: w.day_number < currentDay ? 'done'
            : w.day_number === currentDay ? 'active'
            : 'upcoming'
        }))

        return NextResponse.json({ words: withStatus })
      }

      // ----------------------------------------------------------------
      // get_books — all non-archived vocab books
      // ----------------------------------------------------------------
      case 'get_books': {
        const books = await db.query(
          `SELECT b.*,
                  (SELECT COUNT(*) FROM family_vocab_words WHERE book_id = b.id) AS word_count
           FROM vocab_books b
           WHERE b.is_archived = false OR b.is_archived IS NULL
           ORDER BY b.created_at DESC`
        )
        return NextResponse.json({ books })
      }

      // ----------------------------------------------------------------
      // get_rotation_status
      // ----------------------------------------------------------------
      case 'get_rotation_status': {
        const rows = await db.query(
          `SELECT r.*,
                  w.word AS current_word,
                  (SELECT COUNT(*) FROM family_vocab_words) AS total_words
           FROM family_vocab_rotation r
           LEFT JOIN family_vocab_words w ON r.current_word_id = w.id
           LIMIT 1`
        )
        return NextResponse.json({ rotation: rows[0] || null })
      }

      // ----------------------------------------------------------------
      // get_mixer_preview — random selection from books
      // ----------------------------------------------------------------
      case 'get_mixer_preview': {
        const bookIds = (searchParams.get('book_ids') || '').split(',').filter(Boolean)
        const count = parseInt(searchParams.get('count') || '20', 10)
        const category = searchParams.get('category') || 'all'

        let sql = `SELECT w.*, b.title AS source_book
                    FROM family_vocab_words w
                    LEFT JOIN vocab_books b ON w.book_id = b.id
                    WHERE 1=1`
        const params: any[] = []
        let paramIdx = 1

        if (bookIds.length > 0) {
          sql += ` AND w.book_id = ANY($${paramIdx}::uuid[])`
          params.push(bookIds)
          paramIdx++
        }
        if (category && category !== 'all') {
          sql += ` AND w.category = $${paramIdx}`
          params.push(category)
          paramIdx++
        }
        sql += ` ORDER BY RANDOM() LIMIT $${paramIdx}`
        params.push(count)

        const words = await db.query(sql, params)
        return NextResponse.json({ words })
      }

      // ----------------------------------------------------------------
      // get_word_search_grid — generate word search puzzle
      // ----------------------------------------------------------------
      case 'get_word_search_grid': {
        const wordIds = (searchParams.get('word_ids') || '').split(',').filter(Boolean)
        const gridSize = parseInt(searchParams.get('grid_size') || '16', 10)
        const seed = searchParams.get('seed') || 'default'

        let words: any[] = []
        if (wordIds.length > 0) {
          words = await db.query(
            `SELECT id, word FROM family_vocab_words WHERE id = ANY($1::uuid[])`,
            [wordIds]
          )
        }

        const grid = generateWordSearchGrid(
          words.map((w: any) => w.word.toUpperCase().replace(/[^A-Z]/g, '')),
          gridSize,
          seed
        )

        return NextResponse.json(grid)
      }

      // ----------------------------------------------------------------
      // get_worksheet_history
      // ----------------------------------------------------------------
      case 'get_worksheet_history': {
        const kidName = searchParams.get('kid_name') || ''
        const rows = await db.query(
          `SELECT * FROM worksheet_records
           WHERE kid_name = $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [kidName]
        )
        return NextResponse.json({ records: rows })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Vocab GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/vocab
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ----------------------------------------------------------------
      // activate_word
      // ----------------------------------------------------------------
      case 'activate_word': {
        const { word_id } = body
        if (!word_id) return NextResponse.json({ error: 'word_id required' }, { status: 400 })

        await db.query(`UPDATE family_vocab_words SET is_active = false WHERE is_active = true`)
        await db.query(`UPDATE family_vocab_words SET is_active = true WHERE id = $1`, [word_id])

        const word = await db.query(`SELECT day_number FROM family_vocab_words WHERE id = $1`, [word_id])
        if (word[0]) {
          await db.query(
            `UPDATE family_vocab_rotation
             SET current_word_id = $1, current_day_number = $2, updated_at = NOW()`,
            [word_id, word[0].day_number]
          )
        }

        return NextResponse.json({ success: true })
      }

      // ----------------------------------------------------------------
      // advance_rotation — skip to next word
      // ----------------------------------------------------------------
      case 'advance_rotation': {
        const rot = await db.query(`SELECT * FROM family_vocab_rotation LIMIT 1`)
        if (!rot[0]) return NextResponse.json({ error: 'No rotation found' }, { status: 404 })

        const currentDay = rot[0].current_day_number || 1
        const nextDay = currentDay + 1

        // Deactivate current
        await db.query(`UPDATE family_vocab_words SET is_active = false WHERE is_active = true`)

        // Find next word
        const nextWord = await db.query(
          `SELECT id FROM family_vocab_words WHERE day_number = $1 LIMIT 1`,
          [nextDay]
        )

        if (nextWord[0]) {
          await db.query(`UPDATE family_vocab_words SET is_active = true WHERE id = $1`, [nextWord[0].id])
          await db.query(
            `UPDATE family_vocab_rotation
             SET current_word_id = $1, current_day_number = $2, updated_at = NOW()`,
            [nextWord[0].id, nextDay]
          )
        }

        return NextResponse.json({ success: true, new_day: nextDay })
      }

      // ----------------------------------------------------------------
      // pause_rotation
      // ----------------------------------------------------------------
      case 'pause_rotation': {
        await db.query(
          `UPDATE family_vocab_rotation SET status = 'paused', paused_at = NOW(), updated_at = NOW()`
        )
        return NextResponse.json({ success: true })
      }

      // ----------------------------------------------------------------
      // resume_rotation
      // ----------------------------------------------------------------
      case 'resume_rotation': {
        await db.query(
          `UPDATE family_vocab_rotation SET status = 'running', updated_at = NOW()`
        )
        return NextResponse.json({ success: true })
      }

      // ----------------------------------------------------------------
      // add_word
      // ----------------------------------------------------------------
      case 'add_word': {
        const { word, part_of_speech, definition, simple_hint, category, book_id } = body
        if (!word || !definition) {
          return NextResponse.json({ error: 'word and definition required' }, { status: 400 })
        }

        // Get next day_number for this book
        const maxDay = await db.query(
          `SELECT COALESCE(MAX(day_number), 0) + 1 AS next_day FROM family_vocab_words WHERE book_id = $1`,
          [book_id]
        )

        const rows = await db.query(
          `INSERT INTO family_vocab_words (word, part_of_speech, definition, simple_hint, category, book_id, day_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [word, part_of_speech || null, definition, simple_hint || null, category || null, book_id || null, maxDay[0].next_day]
        )
        return NextResponse.json({ word: rows[0] })
      }

      // ----------------------------------------------------------------
      // upload_csv — bulk insert words
      // ----------------------------------------------------------------
      case 'upload_csv': {
        const { words: csvWords, book_id } = body
        if (!Array.isArray(csvWords) || csvWords.length === 0) {
          return NextResponse.json({ error: 'words array required' }, { status: 400 })
        }

        const maxDay = await db.query(
          `SELECT COALESCE(MAX(day_number), 0) AS max_day FROM family_vocab_words WHERE book_id = $1`,
          [book_id]
        )
        let dayNum = (maxDay[0]?.max_day || 0) + 1

        const inserted = []
        for (const w of csvWords) {
          const rows = await db.query(
            `INSERT INTO family_vocab_words (word, part_of_speech, definition, simple_hint, category, book_id, day_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [w.word, w.part_of_speech || null, w.definition || null, w.simple_hint || null, w.category || null, book_id || null, dayNum]
          )
          inserted.push(rows[0])
          dayNum++
        }

        return NextResponse.json({ inserted: inserted.length })
      }

      // ----------------------------------------------------------------
      // add_book
      // ----------------------------------------------------------------
      case 'add_book': {
        const { title, author, grade_level, cover_color, notes } = body
        if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

        const rows = await db.query(
          `INSERT INTO vocab_books (title, author, grade_level, cover_color, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [title, author || null, grade_level || null, cover_color || '#6366f1', notes || null]
        )
        return NextResponse.json({ book: rows[0] })
      }

      // ----------------------------------------------------------------
      // archive_book
      // ----------------------------------------------------------------
      case 'archive_book': {
        const { book_id } = body
        if (!book_id) return NextResponse.json({ error: 'book_id required' }, { status: 400 })

        await db.query(`UPDATE vocab_books SET is_archived = true WHERE id = $1`, [book_id])
        return NextResponse.json({ success: true })
      }

      // ----------------------------------------------------------------
      // save_mixer_session
      // ----------------------------------------------------------------
      case 'save_mixer_session': {
        const { name, source_book_ids, word_ids, word_count, output_type, source_mode } = body

        const rows = await db.query(
          `INSERT INTO vocab_mixer_sessions (name, source_book_ids, word_ids, word_count, output_type, source_mode)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            name || 'Mixer Session',
            JSON.stringify(source_book_ids || []),
            JSON.stringify(word_ids || []),
            word_count || 0,
            output_type || 'review',
            source_mode || 'manual'
          ]
        )
        return NextResponse.json({ session: rows[0] })
      }

      // ----------------------------------------------------------------
      // save_worksheet
      // ----------------------------------------------------------------
      case 'save_worksheet': {
        const { kid_name, worksheet_type, source_book_ids, word_ids_used, config_json, seed } = body

        const rows = await db.query(
          `INSERT INTO worksheet_records (kid_name, worksheet_type, source_book_ids, word_ids_used, config_json, seed)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            kid_name || null,
            worksheet_type || 'word_search',
            JSON.stringify(source_book_ids || []),
            JSON.stringify(word_ids_used || []),
            JSON.stringify(config_json || {}),
            seed || null
          ]
        )
        return NextResponse.json({ record: rows[0] })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Vocab POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================================================
// Word Search Grid Generator
// ============================================================================

function seededRandom(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  let state = hash || 1
  return () => {
    state = (state * 1664525 + 1013904223) | 0
    return (state >>> 0) / 4294967296
  }
}

const DIRECTIONS = [
  [0, 1],   // right
  [1, 0],   // down
  [1, 1],   // down-right
  [-1, 1],  // up-right
  [0, -1],  // left
  [-1, 0],  // up
  [-1, -1], // up-left
  [1, -1],  // down-left
]

function generateWordSearchGrid(
  words: string[],
  size: number,
  seed: string
): { grid: string[][]; placed_words: { word: string; row: number; col: number; direction: string }[]; size: number } {
  const rng = seededRandom(seed)
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const placedWords: { word: string; row: number; col: number; direction: string }[] = []
  const dirNames = ['RIGHT', 'DOWN', 'DOWN_RIGHT', 'UP_RIGHT', 'LEFT', 'UP', 'UP_LEFT', 'DOWN_LEFT']

  // Sort words longest first
  const sorted = [...words].sort((a, b) => b.length - a.length)

  for (const word of sorted) {
    if (word.length > size) continue
    let placed = false

    // Try up to 100 random placements
    for (let attempt = 0; attempt < 100; attempt++) {
      const dirIdx = Math.floor(rng() * DIRECTIONS.length)
      const [dr, dc] = DIRECTIONS[dirIdx]
      const row = Math.floor(rng() * size)
      const col = Math.floor(rng() * size)

      // Check if word fits
      let fits = true
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i
        const c = col + dc * i
        if (r < 0 || r >= size || c < 0 || c >= size) { fits = false; break }
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) { fits = false; break }
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          grid[row + dr * i][col + dc * i] = word[i]
        }
        placedWords.push({ word, row, col, direction: dirNames[dirIdx] })
        placed = true
        break
      }
    }
    // If not placed after 100 attempts, skip this word
  }

  // Fill remaining empty cells with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(rng() * 26)]
      }
    }
  }

  return { grid, placed_words: placedWords, size }
}
