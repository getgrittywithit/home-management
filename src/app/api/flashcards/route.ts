import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getReviewQueue, getDueCount, calculateNextReview } from '@/lib/leitner'
import { ALL_KIDS } from '@/lib/constants'

const ALLOWED = new Set<string>([...ALL_KIDS])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'review_queue'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'review_queue') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const max = Math.min(parseInt(searchParams.get('max') || '10'), 15)
      const deckType = searchParams.get('deck_type')
      let cards
      if (deckType) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        cards = await db.query(
          `SELECT fc.*, fd.deck_name, fd.deck_type FROM flashcard_cards fc
           JOIN flashcard_decks fd ON fd.id = fc.deck_id
           WHERE fd.kid_name = $1 AND fd.deck_type = $4 AND fc.active = TRUE AND fc.next_review_date <= $2
           ORDER BY fc.leitner_box ASC LIMIT $3`,
          [kid, today, max, deckType]
        ).catch(() => [])
      } else {
        cards = await getReviewQueue(kid, max)
      }
      return NextResponse.json({ cards, count: (cards || []).length })
    }

    if (action === 'due_count') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const count = await getDueCount(kid)
      return NextResponse.json({ count })
    }

    if (action === 'decks') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const decks = await db.query(`SELECT * FROM flashcard_decks WHERE kid_name = $1 AND active = TRUE`, [kid]).catch(() => [])
      return NextResponse.json({ decks })
    }

    if (action === 'stats') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const boxCounts = await db.query(
        `SELECT fc.leitner_box, COUNT(*)::int AS count FROM flashcard_cards fc
         JOIN flashcard_decks fd ON fd.id = fc.deck_id WHERE fd.kid_name = $1 AND fc.active = TRUE
         GROUP BY fc.leitner_box ORDER BY fc.leitner_box`, [kid]
      ).catch(() => [])
      const accuracy = await db.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE result = 'correct')::int AS correct
         FROM flashcard_reviews WHERE kid_name = $1 AND reviewed_at >= CURRENT_DATE - 30`, [kid]
      ).catch(() => [{ total: 0, correct: 0 }])
      const total = accuracy[0]?.total || 0
      return NextResponse.json({
        box_counts: boxCounts,
        accuracy_pct: total > 0 ? Math.round((accuracy[0]?.correct / total) * 100) : 0,
        total_reviews_30d: total,
      })
    }

    if (action === 'admin_cards') {
      const deckId = searchParams.get('deck_id')
      const rows = await db.query(
        `SELECT * FROM flashcard_cards WHERE deck_id = $1 ORDER BY leitner_box, front_text`, [deckId]
      ).catch(() => [])
      return NextResponse.json({ cards: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'review': {
        const { card_id, kid_name, result, time_seconds } = body
        if (!card_id || !kid_name || !result) return NextResponse.json({ error: 'card_id + kid_name + result required' }, { status: 400 })

        const card = await db.query(`SELECT leitner_box FROM flashcard_cards WHERE id = $1`, [card_id]).catch(() => [])
        if (!card[0]) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

        const wasCorrect = result === 'correct'
        const { new_box, next_review_date } = calculateNextReview(card[0].leitner_box, wasCorrect)

        await db.query(
          `UPDATE flashcard_cards SET leitner_box = $2, next_review_date = $3,
           times_reviewed = times_reviewed + 1,
           times_correct = times_correct + $4, times_wrong = times_wrong + $5,
           updated_at = NOW() WHERE id = $1`,
          [card_id, new_box, next_review_date, wasCorrect ? 1 : 0, wasCorrect ? 0 : 1]
        )

        await db.query(
          `INSERT INTO flashcard_reviews (card_id, kid_name, result, time_to_answer_seconds, previous_box, new_box)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [card_id, kid_name.toLowerCase(), result, time_seconds || null, card[0].leitner_box, new_box]
        )

        // Mastery cascade — when card reaches Box 5
        if (new_box === 5 && card[0].leitner_box < 5) {
          const kid = kid_name.toLowerCase()
          const cardDetail = await db.query(
            `SELECT fc.front_text, fd.deck_type, fd.deck_name FROM flashcard_cards fc JOIN flashcard_decks fd ON fd.id = fc.deck_id WHERE fc.id = $1`, [card_id]
          ).catch(() => [])

          // 1. Academic records
          const { logAcademicRecord, recordIEPGoalProgress } = await import('@/lib/academicRecords')
          const subject = cardDetail[0]?.deck_type === 'math' ? 'math' : cardDetail[0]?.deck_type === 'speech_practice' ? 'speech' : 'ela'
          await logAcademicRecord({
            kid_name: kid, record_type: 'vocabulary_mastery', subject,
            details: { word: cardDetail[0]?.front_text, deck: cardDetail[0]?.deck_name },
            evidence_ref: String(card_id),
          })

          // 2. Stars + digi-pet
          await db.query(
            `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', 10, $2)`,
            [kid, `Mastered: ${cardDetail[0]?.front_text || 'a flashcard'}`]
          ).catch(() => {})
          await db.query(`UPDATE digi_pets SET happiness = LEAST(100, happiness + 2) WHERE kid_name = $1`, [kid]).catch(() => {})

          // 3. Notification
          const { createNotification } = await import('@/lib/notifications')
          await createNotification({
            title: `You mastered "${cardDetail[0]?.front_text}"!`,
            message: 'That word is yours now.',
            source_type: 'flashcard_mastered', source_ref: `mastery-${card_id}`,
            icon: '🌟', target_role: 'kid', kid_name: kid,
          }).catch(() => {})

          // 4. IEP progress for speech decks
          if (cardDetail[0]?.deck_type === 'speech_practice') {
            await recordIEPGoalProgress({
              kid_name: kid, goal_area: 'speech_articulation_r',
              evidence_type: 'flashcard_mastery', evidence_ref: String(card_id),
              progress_value: 1,
            })
          }
        }

        return NextResponse.json({ new_box, next_review_date })
      }

      case 'add_card': {
        const { kid_name, deck_type, front_text, back_text, example_sentence, source_type, source_ref } = body
        if (!kid_name || !front_text || !back_text) return NextResponse.json({ error: 'kid_name + front + back required' }, { status: 400 })

        const deck = await db.query(
          `SELECT id FROM flashcard_decks WHERE kid_name = $1 AND deck_type = $2`, [kid_name.toLowerCase(), deck_type || 'vocabulary']
        ).catch(() => [])
        if (!deck[0]) return NextResponse.json({ error: 'Deck not found' }, { status: 404 })

        await db.query(
          `INSERT INTO flashcard_cards (deck_id, front_text, back_text, example_sentence, source_type, source_ref)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
          [deck[0].id, front_text, back_text, example_sentence || null, source_type || 'manual', source_ref || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'bulk_import_book_vocab': {
        const { kid_name, book_id } = body
        if (!kid_name || !book_id) return NextResponse.json({ error: 'kid_name + book_id required' }, { status: 400 })

        const deck = await db.query(
          `SELECT id FROM flashcard_decks WHERE kid_name = $1 AND deck_type = 'vocabulary'`, [kid_name.toLowerCase()]
        ).catch(() => [])
        if (!deck[0]) return NextResponse.json({ error: 'Vocab deck not found' }, { status: 404 })

        const vocab = await db.query(`SELECT * FROM book_vocabulary WHERE book_id = $1`, [book_id]).catch(() => [])
        let added = 0
        for (const v of vocab) {
          const res = await db.query(
            `INSERT INTO flashcard_cards (deck_id, front_text, back_text, example_sentence, source_type, source_ref)
             VALUES ($1, $2, $3, $4, 'book_vocab', $5) ON CONFLICT DO NOTHING RETURNING id`,
            [deck[0].id, v.word, v.definition || '', v.example_sentence || null, String(book_id)]
          ).catch(() => [])
          if (res.length > 0) added++
        }
        return NextResponse.json({ imported: added, total_vocab: vocab.length })
      }

      case 'add_math_missed': {
        const { kid_name, problem_text, correct_answer } = body
        if (!kid_name || !problem_text || !correct_answer) return NextResponse.json({ error: 'required fields missing' }, { status: 400 })

        const deck = await db.query(
          `SELECT id FROM flashcard_decks WHERE kid_name = $1 AND deck_type = 'math'`, [kid_name.toLowerCase()]
        ).catch(() => [])
        if (!deck[0]) return NextResponse.json({ error: 'Math deck not found' }, { status: 404 })

        await db.query(
          `INSERT INTO flashcard_cards (deck_id, front_text, back_text, source_type)
           VALUES ($1, $2, $3, 'math_missed') ON CONFLICT DO NOTHING`,
          [deck[0].id, problem_text, correct_answer]
        )
        return NextResponse.json({ success: true })
      }

      case 'edit_card': {
        const { card_id, front_text, back_text, example_sentence } = body
        await db.query(
          `UPDATE flashcard_cards SET front_text = COALESCE($2, front_text), back_text = COALESCE($3, back_text),
           example_sentence = COALESCE($4, example_sentence), updated_at = NOW() WHERE id = $1`,
          [card_id, front_text, back_text, example_sentence]
        )
        return NextResponse.json({ success: true })
      }

      case 'deactivate_card': {
        await db.query(`UPDATE flashcard_cards SET active = FALSE WHERE id = $1`, [body.card_id])
        return NextResponse.json({ success: true })
      }

      case 'log_speech_session': {
        const { kid_name, card_id, target_sound, kid_self_rating } = body
        if (!kid_name || !card_id) return NextResponse.json({ error: 'kid_name + card_id required' }, { status: 400 })
        await db.query(
          `INSERT INTO speech_practice_sessions (kid_name, card_id, target_sound, kid_self_rating)
           VALUES ($1, $2, $3, $4)`,
          [kid_name.toLowerCase(), card_id, target_sound || null, kid_self_rating || null]
        ).catch(() => {})
        // Write to academic records + IEP progress
        const { logAcademicRecord, recordIEPGoalProgress } = await import('@/lib/academicRecords')
        await logAcademicRecord({
          kid_name: kid_name.toLowerCase(), record_type: 'speech_practice', subject: 'speech',
          details: { card_id, target_sound, self_rating: kid_self_rating },
        })
        if (target_sound?.includes('r')) {
          await recordIEPGoalProgress({
            kid_name: kid_name.toLowerCase(), goal_area: 'speech_articulation_r',
            evidence_type: 'speech_practice_session', evidence_ref: String(card_id),
            progress_value: 1, notes: `Self-rated: ${kid_self_rating}`,
          })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
