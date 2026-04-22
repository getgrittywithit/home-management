import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const { book_id, vocabulary } = await req.json()
    if (!book_id || !Array.isArray(vocabulary) || vocabulary.length === 0) {
      return NextResponse.json({ message: 'book_id + vocabulary array required' }, { status: 400 })
    }

    let saved = 0
    for (const word of vocabulary) {
      if (!word.word || !word.definition) continue
      await db.query(
        `INSERT INTO book_vocabulary (book_id, word, definition, example_sentence, part_of_speech, difficulty_rank)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (book_id, word) DO UPDATE SET definition = $3, example_sentence = $4`,
        [book_id, word.word, word.definition, word.context_sentence || null, word.part_of_speech || null, word.grade_level || null]
      ).catch(() => {})
      saved++
    }

    return NextResponse.json({ message: `Saved ${saved} vocabulary words`, count: saved })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
