import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const kid = new URL(req.url).searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  const rows = await db.query(`SELECT * FROM kid_workbook_progress WHERE kid_name = $1`, [kid]).catch(() => [])
  return NextResponse.json({ workbooks: rows })
}

export async function POST(req: NextRequest) {
  try {
    const { kid_name, workbook_type, last_page_completed, total_pages, notes } = await req.json()
    if (!kid_name || !workbook_type) return NextResponse.json({ error: 'kid_name + workbook_type required' }, { status: 400 })
    await db.query(
      `UPDATE kid_workbook_progress SET last_page_completed = COALESCE($3, last_page_completed),
       total_pages = COALESCE($4, total_pages), notes = COALESCE($5, notes), updated_at = NOW()
       WHERE kid_name = $1 AND workbook_type = $2`,
      [kid_name.toLowerCase(), workbook_type, last_page_completed, total_pages || null, notes || null]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
