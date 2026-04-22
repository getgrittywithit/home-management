import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const bookId = searchParams.get('book_id')

  try {
    if (bookId) {
      const words = await db.query(`SELECT * FROM book_vocabulary WHERE book_id = $1 ORDER BY word`, [bookId]).catch(() => [])
      return NextResponse.json({ words })
    }

    if (kid) {
      const words = await db.query(
        `SELECT bv.*, hl.title AS book_title, kbp.status AS read_status
         FROM book_vocabulary bv
         JOIN home_library hl ON hl.id = bv.book_id
         LEFT JOIN kid_book_progress kbp ON kbp.book_id = bv.book_id AND kbp.kid_name = $1
         WHERE kbp.kid_name = $1 OR kbp.kid_name IS NULL
         ORDER BY hl.title, bv.word`,
        [kid]
      ).catch(() => [])
      return NextResponse.json({ words })
    }

    return NextResponse.json({ error: 'kid_name or book_id required' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
