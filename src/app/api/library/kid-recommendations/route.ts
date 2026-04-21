import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { KID_AGES } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const kid = new URL(req.url).searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    const age = KID_AGES[kid] || 10

    // Get kid's interests from profile
    const profile = await db.query(`SELECT interests FROM kid_profiles WHERE kid_name = $1`, [kid]).catch(() => [])
    const interests = profile[0]?.interests || []

    // Get books not currently reading or recently finished, matching age range
    let sql = `SELECT hl.* FROM home_library hl
               WHERE hl.active = TRUE
               AND NOT EXISTS (SELECT 1 FROM kid_book_progress kbp WHERE kbp.book_id = hl.id AND kbp.kid_name = $1 AND kbp.status IN ('reading', 'finished'))
               AND (hl.age_range_low IS NULL OR hl.age_range_low <= $2)
               AND (hl.age_range_high IS NULL OR hl.age_range_high >= $2)`

    // Score by interest overlap
    if (interests.length > 0) {
      sql += ` ORDER BY (SELECT COUNT(*) FROM unnest(hl.interest_tags) t WHERE t = ANY($3)) DESC, RANDOM()`
    } else {
      sql += ` ORDER BY RANDOM()`
    }
    sql += ` LIMIT 3`

    const params: any[] = [kid, age]
    if (interests.length > 0) params.push(interests)

    const books = await db.query(sql, params).catch(() => [])
    return NextResponse.json({ recommendations: books })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
