import 'server-only'
import { db } from '@/lib/database'

const LEITNER_INTERVALS: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 7, 5: 30,
}

export function calculateNextReview(currentBox: number, wasCorrect: boolean) {
  const newBox = wasCorrect ? Math.min(currentBox + 1, 5) : 1
  const days = LEITNER_INTERVALS[newBox]
  const next = new Date()
  next.setDate(next.getDate() + days)
  return { new_box: newBox, next_review_date: next.toLocaleDateString('en-CA') }
}

export async function getReviewQueue(kidName: string, maxCards: number = 10) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  return db.query(
    `SELECT fc.*, fd.deck_name, fd.deck_type FROM flashcard_cards fc
     JOIN flashcard_decks fd ON fd.id = fc.deck_id
     WHERE fd.kid_name = $1 AND fc.active = TRUE AND fc.next_review_date <= $2
     ORDER BY fc.leitner_box ASC, fc.next_review_date ASC
     LIMIT $3`,
    [kidName.toLowerCase(), today, maxCards]
  ).catch(() => [])
}

export async function getDueCount(kidName: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const rows = await db.query(
    `SELECT COUNT(*)::int AS count FROM flashcard_cards fc
     JOIN flashcard_decks fd ON fd.id = fc.deck_id
     WHERE fd.kid_name = $1 AND fc.active = TRUE AND fc.next_review_date <= $2`,
    [kidName.toLowerCase(), today]
  ).catch(() => [{ count: 0 }])
  return rows[0]?.count || 0
}
