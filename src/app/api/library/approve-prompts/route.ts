import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const { book_id, prompts } = await req.json()
    if (!book_id || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ message: 'book_id + prompts array required' }, { status: 400 })
    }

    let saved = 0
    for (const p of prompts) {
      if (!p.prompt_text || !p.skill_tag) continue
      await db.query(
        `INSERT INTO book_buddy_prompts (book_id, prompt_type, prompt_text, target_reading_level)
         VALUES ($1, $2, $3, $4)`,
        [book_id, p.skill_tag, p.prompt_text, p.difficulty || 'medium']
      ).catch(() => {})
      saved++
    }

    await db.query(`UPDATE home_library SET has_bookbuddy_prompts = TRUE WHERE id = $1`, [book_id]).catch(() => {})

    return NextResponse.json({ message: `Saved ${saved} discussion prompts`, count: saved })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
