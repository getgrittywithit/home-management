import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    const [parents, kids] = await Promise.all([
      db.getParents(),
      db.getChildren(),
    ])
    return NextResponse.json({
      parents: parents.map((p: any) => ({ name: p.first_name?.toLowerCase(), display: p.first_name })),
      kids: kids.map((k: any) => ({ name: k.first_name?.toLowerCase(), display: k.first_name })),
    })
  } catch {
    return NextResponse.json({ parents: [], kids: [] })
  }
}
