import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    const [parents, kids] = await Promise.all([
      db.getParents(),
      db.getChildren(),
    ])
    // Deduplicate by lowercase name to prevent duplicate rows in availability widget
    const seen = new Set<string>()
    const dedupedParents = parents.filter((p: any) => {
      const key = p.first_name?.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return NextResponse.json({
      parents: dedupedParents.map((p: any) => ({ name: p.first_name?.toLowerCase(), display: p.first_name })),
      kids: kids.map((k: any) => ({ name: k.first_name?.toLowerCase(), display: k.first_name })),
    })
  } catch {
    return NextResponse.json({ parents: [], kids: [] })
  }
}
