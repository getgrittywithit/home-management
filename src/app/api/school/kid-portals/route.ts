import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    const ixl = await db.query(`SELECT * FROM kid_ixl_config WHERE kid_name = $1`, [kid]).catch(() => [])
    const classroom = await db.query(`SELECT * FROM kid_classroom_config WHERE kid_name = $1`, [kid]).catch(() => [])
    const workbooks = await db.query(`SELECT * FROM kid_workbook_progress WHERE kid_name = $1`, [kid]).catch(() => [])

    return NextResponse.json({
      ixl: ixl[0] || null,
      classroom: classroom[0] || null,
      workbooks,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
