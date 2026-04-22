import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { KID_GRADES, KID_DISPLAY } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    const grade = KID_GRADES[kid] || 5

    // Get kid's interests from profile
    const profile = await db.query(`SELECT interests FROM kid_profiles WHERE kid_name = $1`, [kid]).catch(() => [])
    const interests = profile[0]?.interests || []

    // Get kid's past ratings for preference learning
    const myRatings = await db.query(
      `SELECT br.book_id, br.rating, hl.content_tags, hl.main_themes FROM book_reviews br
       JOIN home_library hl ON hl.id = br.book_id WHERE br.kid_name = $1`, [kid]
    ).catch(() => [])
    const lovedTags = new Set<string>()
    const dislikedTags = new Set<string>()
    for (const r of myRatings) {
      const tags = [...(r.content_tags || []), ...(r.main_themes || [])]
      if (r.rating === 'loved' || r.rating === 'liked') tags.forEach((t: string) => lovedTags.add(t))
      if (r.rating === 'disliked' || r.rating === 'hated') tags.forEach((t: string) => dislikedTags.add(t))
    }

    // Get sibling-loved books
    const siblingLoved = await db.query(
      `SELECT br.book_id, br.kid_name, br.rating, hl.title, hl.content_tags
       FROM book_reviews br JOIN home_library hl ON hl.id = br.book_id
       WHERE br.kid_name != $1 AND br.rating IN ('loved', 'liked')
       AND NOT EXISTS (SELECT 1 FROM book_reviews br2 WHERE br2.book_id = br.book_id AND br2.kid_name = $1)
       AND NOT EXISTS (SELECT 1 FROM kid_reading_log krl WHERE krl.book_id = br.book_id AND krl.kid_name = $1)
       ORDER BY CASE WHEN br.rating = 'loved' THEN 0 ELSE 1 END, br.created_at DESC
       LIMIT 20`, [kid]
    ).catch(() => [])

    // Get unread books matching kid's level + interests
    const candidates = await db.query(
      `SELECT hl.* FROM home_library hl
       WHERE hl.active = TRUE
       AND NOT EXISTS (SELECT 1 FROM kid_reading_log krl WHERE krl.book_id = hl.id AND krl.kid_name = $1)
       AND NOT EXISTS (SELECT 1 FROM book_reviews br WHERE br.book_id = hl.id AND br.kid_name = $1)
       AND (hl.age_range_low IS NULL OR hl.age_range_low <= $2 + 2)
       AND (hl.age_range_high IS NULL OR hl.age_range_high >= $2 - 1)
       LIMIT 50`, [kid, grade]
    ).catch(() => [])

    // Score candidates
    const scored = candidates.map((book: any) => {
      let score = 0
      const tags = [...(book.content_tags || []), ...(book.main_themes || [])]
      for (const tag of tags) {
        if (interests.includes(tag)) score += 3
        if (lovedTags.has(tag)) score += 2
        if (dislikedTags.has(tag)) score -= 2
      }
      const sibRec = siblingLoved.find((s: any) => s.book_id === book.id)
      if (sibRec) { score += sibRec.rating === 'loved' ? 3 : 1 }
      const reason = sibRec ? `Loved by ${KID_DISPLAY[sibRec.kid_name] || sibRec.kid_name}`
        : interests.some((i: string) => tags.includes(i)) ? `Matches your "${interests.find((i: string) => tags.includes(i))}" interest`
        : tags.length > 0 ? `Tagged: ${tags.slice(0, 2).join(', ')}` : 'Fits your reading level'
      return { ...book, score, reason }
    })

    scored.sort((a: any, b: any) => b.score - a.score)

    // Also get pending recommendations FROM siblings
    const pendingRecs = await db.query(
      `SELECT br.*, hl.title, hl.author FROM book_recommendations br
       JOIN home_library hl ON hl.id = br.book_id
       WHERE br.to_kid = $1 AND br.status = 'pending' ORDER BY br.created_at DESC`, [kid]
    ).catch(() => [])

    // Want to read list
    const wantToRead = await db.query(
      `SELECT kwr.*, hl.title, hl.author FROM kid_want_to_read kwr
       JOIN home_library hl ON hl.id = kwr.book_id
       WHERE kwr.kid_name = $1 ORDER BY kwr.added_at DESC`, [kid]
    ).catch(() => [])

    return NextResponse.json({
      recommendations: scored.slice(0, 5),
      sibling_recommendations: pendingRecs,
      want_to_read: wantToRead,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
