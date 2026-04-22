import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'
import { KID_DISPLAY } from '@/lib/constants'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('book_id')
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (bookId) {
      const reviews = await db.query(
        `SELECT br.*, hl.title AS book_title FROM book_reviews br
         LEFT JOIN home_library hl ON hl.id = br.book_id
         WHERE br.book_id = $1 AND (br.is_private = FALSE OR br.kid_name = $2)
         ORDER BY br.created_at DESC`,
        [bookId, kid || '']
      ).catch(() => [])
      return NextResponse.json({ reviews })
    }

    if (kid) {
      const reviews = await db.query(
        `SELECT br.*, hl.title AS book_title, hl.author FROM book_reviews br
         LEFT JOIN home_library hl ON hl.id = br.book_id
         WHERE br.kid_name = $1 ORDER BY br.created_at DESC`,
        [kid]
      ).catch(() => [])

      const stats = {
        total: reviews.length,
        loved: reviews.filter((r: any) => r.rating === 'loved').length,
        liked: reviews.filter((r: any) => r.rating === 'liked').length,
        dnf: reviews.filter((r: any) => r.rating === 'dnf').length,
      }
      return NextResponse.json({ reviews, stats })
    }

    // Family bookshelf — all reviews
    const reviews = await db.query(
      `SELECT br.*, hl.title AS book_title, hl.author FROM book_reviews br
       LEFT JOIN home_library hl ON hl.id = br.book_id
       WHERE br.is_private = FALSE ORDER BY br.created_at DESC LIMIT 50`
    ).catch(() => [])
    return NextResponse.json({ reviews })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'submit_review') {
      const { kid_name, book_id, rating, review_text, favorite_part, favorite_character, would_recommend_to, spoiler_flag, is_private } = body
      if (!kid_name || !book_id || !rating) return NextResponse.json({ error: 'kid_name + book_id + rating required' }, { status: 400 })

      await db.query(
        `INSERT INTO book_reviews (kid_name, book_id, rating, review_text, favorite_part, favorite_character, would_recommend_to, spoiler_flag, is_private, finished_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (book_id, kid_name) DO UPDATE SET rating=$3, review_text=$4, favorite_part=$5, favorite_character=$6, would_recommend_to=$7, spoiler_flag=$8, is_private=$9`,
        [kid_name.toLowerCase(), book_id, rating, review_text || null, favorite_part || null, favorite_character || null, would_recommend_to || null, spoiler_flag || false, is_private || false]
      )

      // Send recommendations to siblings
      if (would_recommend_to?.length > 0) {
        const book = await db.query(`SELECT title FROM home_library WHERE id = $1`, [book_id]).catch(() => [])
        const title = book[0]?.title || 'a book'
        for (const sib of would_recommend_to) {
          await db.query(
            `INSERT INTO book_recommendations (book_id, from_kid, to_kid, message)
             VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [book_id, kid_name.toLowerCase(), sib.toLowerCase(), `${cap(kid_name)} thinks you'd love "${title}"!`]
          ).catch(() => {})
          await createNotification({
            title: `${cap(kid_name)} recommended a book for you!`,
            message: `"${title}" — tap to see why`,
            source_type: 'book_recommendation', icon: '📖',
            target_role: 'kid', kid_name: sib.toLowerCase(),
          }).catch(() => {})
        }
      }

      // Award stars for finishing + reviewing
      if (rating !== 'dnf') {
        await db.query(
          `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', 10, $2)`,
          [kid_name.toLowerCase(), `Finished and reviewed a book (+10⭐)`]
        ).catch(() => {})
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'respond_to_recommendation') {
      const { recommendation_id, response } = body
      await db.query(
        `UPDATE book_recommendations SET status = $2, responded_at = NOW() WHERE id = $1`,
        [recommendation_id, response]
      )
      if (response === 'accepted') {
        const rec = await db.query(`SELECT book_id, to_kid FROM book_recommendations WHERE id = $1`, [recommendation_id]).catch(() => [])
        if (rec[0]) {
          await db.query(
            `INSERT INTO kid_want_to_read (kid_name, book_id, source) VALUES ($1, $2, 'sibling_rec') ON CONFLICT DO NOTHING`,
            [rec[0].to_kid, rec[0].book_id]
          ).catch(() => {})
        }
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'add_to_want_to_read') {
      const { kid_name, book_id, source } = body
      await db.query(
        `INSERT INTO kid_want_to_read (kid_name, book_id, source) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [kid_name?.toLowerCase(), book_id, source || 'self_pick']
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
