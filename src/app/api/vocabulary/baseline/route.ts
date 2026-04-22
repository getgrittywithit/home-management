import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { KID_GRADES } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const kid = new URL(req.url).searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  const grade = KID_GRADES[kid] || 5

  try {
    const words = await db.query(
      `SELECT gvb.*, kvp.status AS progress_status, kvp.leitner_box, kvp.mastered_at
       FROM grade_vocabulary_bank gvb
       LEFT JOIN kid_vocabulary_progress kvp ON kvp.word_id = gvb.id AND kvp.kid_name = $1
       WHERE gvb.grade_level = $2 AND gvb.is_active = TRUE
       ORDER BY gvb.difficulty_tier, gvb.word`,
      [kid, grade]
    ).catch(() => [])
    return NextResponse.json({ words, grade, kid_name: kid })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { kid_name, word_id, status, rating } = await req.json()
    if (!kid_name || !word_id) return NextResponse.json({ error: 'kid_name + word_id required' }, { status: 400 })

    const mastered = status === 'mastered'
    await db.query(
      `INSERT INTO kid_vocabulary_progress (kid_name, word_id, status, leitner_box, mastered_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (kid_name, word_id) DO UPDATE SET status = $3, leitner_box = COALESCE($4, kid_vocabulary_progress.leitner_box + 1), mastered_at = $5`,
      [kid_name.toLowerCase(), word_id, status || 'learning', mastered ? 5 : null, mastered ? new Date().toISOString() : null]
    )

    if (mastered) {
      const { logAcademicRecord } = await import('@/lib/academicRecords')
      await logAcademicRecord({ kid_name: kid_name.toLowerCase(), record_type: 'vocabulary_mastery', subject: 'ela', details: { word_id, source: 'baseline' }, evidence_ref: String(word_id) })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
