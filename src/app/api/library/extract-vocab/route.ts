import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = 'claude-haiku-4-5-20251001'
const callCounts = new Map<string, { count: number; reset: number }>()

export async function POST(req: NextRequest) {
  try {
    const now = Date.now()
    const entry = callCounts.get('global') || { count: 0, reset: now + 3600000 }
    if (now > entry.reset) { entry.count = 0; entry.reset = now + 3600000 }
    if (entry.count >= 10) return NextResponse.json({ message: 'Rate limit: max 10 extractions per hour.' }, { status: 429 })
    entry.count++
    callCounts.set('global', entry)

    const { book_id, title, author, description, grade_min, grade_max, interest_tags } = await req.json()
    if (!book_id || !title) return NextResponse.json({ message: 'book_id + title required' }, { status: 400 })
    if (!ANTHROPIC_API_KEY) return NextResponse.json({ message: 'Anthropic API key not configured' }, { status: 500 })

    const gradeRange = `${grade_min || 3}–${grade_max || 8}`
    const tags = (interest_tags || []).join(', ') || 'general'

    const prompt = `You are an expert educational content designer building vocabulary flashcards for a homeschooled child.

Book: "${title}"${author ? ` by ${author}` : ''}
Grade Range: ${gradeRange}
Interests: ${tags}
Description: ${description || 'N/A'}

Extract 12–16 important vocabulary words. For each:
- word: the term
- definition: kid-friendly (1-2 sentences)
- context_sentence: using the word naturally
- part_of_speech: noun/verb/adjective/adverb
- grade_level: estimated grade (number)

Return ONLY valid JSON:
{"vocabulary":[{"word":"example","definition":"...","context_sentence":"...","part_of_speech":"noun","grade_level":3}]}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err.substring(0, 200)}`)
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    const vocabulary = parsed.vocabulary || []

    await db.query(
      `INSERT INTO book_extraction_log (book_id, extraction_type, raw_llm_response, parsed_count) VALUES ($1, 'vocabulary', $2, $3)`,
      [book_id, JSON.stringify(parsed), vocabulary.length]
    ).catch(() => {})

    return NextResponse.json({ vocabulary, count: vocabulary.length })
  } catch (e: any) {
    console.error('[extract-vocab]', e.message)
    return NextResponse.json({ message: `Failed: ${e.message}` }, { status: 500 })
  }
}
