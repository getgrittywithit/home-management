import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { KID_GRADES } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const bookId = searchParams.get('book_id')
  if (!kid || !bookId) return NextResponse.json({ error: 'kid_name + book_id required' }, { status: 400 })

  try {
    // Get kid's reading progress
    const progress = await db.query(
      `SELECT * FROM kid_reading_log WHERE kid_name = $1 AND book_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [kid, bookId]
    ).catch(() => [])

    const currentChapter = progress[0]?.current_chapter || 0
    const grade = KID_GRADES[kid] || 5

    // Get chapter outlines up to current chapter
    const chapters = await db.query(
      `SELECT * FROM book_chapter_outline WHERE book_id = $1 AND chapter_number <= $2 ORDER BY chapter_number`,
      [bookId, Math.max(currentChapter, 1)]
    ).catch(() => [])

    // Get vocabulary up to current chapter
    const vocab = await db.query(
      `SELECT * FROM book_vocabulary WHERE book_id = $1 AND (chapter_number IS NULL OR chapter_number <= $2) ORDER BY chapter_number, word`,
      [bookId, currentChapter]
    ).catch(() => [])

    // Get prompts appropriate for grade + current progress
    const prompts = await db.query(
      `SELECT * FROM book_buddy_prompts WHERE book_id = $1
       AND (chapter_scope_end IS NULL OR chapter_scope_end <= $2)
       AND (grade_level IS NULL OR grade_level <= $3)
       ORDER BY chapter_scope_start`,
      [bookId, currentChapter, grade]
    ).catch(() => [])

    // Get book metadata
    const book = await db.query(`SELECT title, author, chapter_count, enrichment_status FROM home_library WHERE id = $1`, [bookId]).catch(() => [])

    return NextResponse.json({
      book: book[0] || null,
      current_chapter: currentChapter,
      reading_percent: progress[0]?.reading_percent || 0,
      chapters,
      vocabulary: vocab,
      prompts,
      enriched: book[0]?.enrichment_status === 'parent_approved',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'update_progress') {
      const { kid_name, book_id, current_chapter, current_page } = body
      if (!kid_name || !book_id) return NextResponse.json({ error: 'kid_name + book_id required' }, { status: 400 })

      const kid = kid_name.toLowerCase()
      const prevProgress = await db.query(
        `SELECT current_chapter FROM kid_reading_log WHERE kid_name = $1 AND book_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [kid, book_id]
      ).catch(() => [])
      const prevChapter = prevProgress[0]?.current_chapter || 0

      // Get book total chapters for percent calc
      const bookMeta = await db.query(`SELECT chapter_count, title FROM home_library WHERE id = $1`, [book_id]).catch(() => [])
      const totalChapters = bookMeta[0]?.chapter_count || 1
      const readingPercent = Math.round((current_chapter / totalChapters) * 100)

      // Update reading log
      await db.query(
        `INSERT INTO kid_reading_log (kid_name, book_id, current_chapter, current_page, reading_percent, log_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
         ON CONFLICT (kid_name, book_id) DO UPDATE SET
           current_chapter = $3, current_page = $4, reading_percent = $5`,
        [kid, book_id, current_chapter, current_page || null, readingPercent]
      ).catch(() => {})

      // Find NEW vocab (chapters prevChapter+1 through current_chapter)
      if (current_chapter > prevChapter) {
        const newVocab = await db.query(
          `SELECT * FROM book_vocabulary WHERE book_id = $1 AND chapter_number > $2 AND chapter_number <= $3`,
          [book_id, prevChapter, current_chapter]
        ).catch(() => [])

        if (newVocab.length > 0) {
          // Auto-insert into kid's Vocabulary flashcard deck
          const deck = await db.query(
            `SELECT id FROM flashcard_decks WHERE kid_name = $1 AND deck_type = 'vocabulary'`, [kid]
          ).catch(() => [])

          if (deck[0]) {
            for (const v of newVocab) {
              const backText = v.modern_equivalent
                ? `${v.definition}\n\nToday we'd say: "${v.modern_equivalent}"`
                : v.definition
              await db.query(
                `INSERT INTO flashcard_cards (deck_id, front_text, back_text, example_sentence, source_type, source_ref, leitner_box, next_review_date)
                 VALUES ($1, $2, $3, $4, 'book_vocab', $5, 1, CURRENT_DATE)
                 ON CONFLICT DO NOTHING`,
                [deck[0].id, v.word, backText, v.example_sentence || null, String(book_id)]
              ).catch(() => {})
            }

            await createNotification({
              title: `${newVocab.length} new words from your book!`,
              message: `Chapter${current_chapter - prevChapter > 1 ? 's' : ''} ${prevChapter + 1}${current_chapter > prevChapter + 1 ? `-${current_chapter}` : ''} gave you new vocab — check your flashcards.`,
              source_type: 'vocab_new_words_from_book', icon: '📚',
              target_role: 'kid', kid_name: kid,
            }).catch(() => {})
          }
        }
      }

      return NextResponse.json({ success: true, reading_percent: readingPercent, new_vocab_count: 0 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
