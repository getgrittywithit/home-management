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
    if (entry.count >= 10) return NextResponse.json({ message: 'Rate limit: max 10 generations per hour.' }, { status: 429 })
    entry.count++
    callCounts.set('global', entry)

    const { book_id, title, author, description, grade_min, grade_max, interest_tags } = await req.json()
    if (!book_id || !title) return NextResponse.json({ message: 'book_id + title required' }, { status: 400 })
    if (!ANTHROPIC_API_KEY) return NextResponse.json({ message: 'Anthropic API key not configured' }, { status: 500 })

    const gradeRange = `${grade_min || 3}–${grade_max || 8}`
    const tags = (interest_tags || []).join(', ') || 'general'

    const prompt = `You are an expert literacy coach designing discussion prompts for BookBuddy (a homeschool reading companion).

Book: "${title}"${author ? ` by ${author}` : ''}
Grade Range: ${gradeRange}
Interests: ${tags}
Description: ${description || 'N/A'}

Create 6-8 open-ended discussion prompts that:
1. Are age-appropriate for grades ${gradeRange}
2. Build critical reading skills
3. Use warm, curious tone ("What do you think...?" "I wonder if...")
4. NEVER use "failed," "missed," "behind," "wrong"
5. Mix difficulty levels

Skill tags: main_idea, inference, vocabulary, theme, prediction
Difficulties: easy, medium, hard

Return ONLY valid JSON:
{"prompts":[{"prompt_text":"What do you think...?","skill_tag":"main_idea","difficulty":"easy"}]}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`)

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    const prompts = parsed.prompts || []

    await db.query(
      `INSERT INTO book_extraction_log (book_id, extraction_type, raw_llm_response, parsed_count) VALUES ($1, 'prompts', $2, $3)`,
      [book_id, JSON.stringify(parsed), prompts.length]
    ).catch(() => {})

    return NextResponse.json({ prompts, count: prompts.length })
  } catch (e: any) {
    console.error('[generate-prompts]', e.message)
    return NextResponse.json({ message: `Failed: ${e.message}` }, { status: 500 })
  }
}
