import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const KID_SYSTEM_PROMPT = (kidName: string, grade: string) => `You are a friendly helper for ${kidName}, a student in ${grade}.
You help them navigate their family portal, understand their tasks, find things, and stay encouraged.
You speak at their reading level. You're warm, patient, and fun — like a smart pet that talks.
Answer questions using their portal data provided below. Keep responses short and clear.
If you don't know something or it's not in the data, say "That's a great question for Mom! Send her a note from Requests."
Never share information about other family members, finances, or parent-only settings.`

const PARENT_SYSTEM_PROMPT = `You are Lola's family management assistant. The Moses family has 6 kids (Amos 17, Zoey 15, Kaylee 13, Ellie 12, Wyatt 10, Hannah 8), two businesses (Triton Handyman, Grit Collective), homeschool for 4 kids, public school for 2.
Help Lola with daily task tracking, kid progress summaries, scheduling, meal planning, and any family system question.
Be concise — Lola is busy. Give direct answers, not essays.
Lola is hard of hearing — if suggesting she call someone, also suggest email as preferred.
Use the family data provided below to answer questions.`

const KID_GRADES: Record<string, string> = {
  amos: '10th grade', ellie: '6th grade', wyatt: '4th grade',
  hannah: '3rd grade', zoey: '9th grade', kaylee: '7th grade',
}

async function getKidContext(kidName: string): Promise<string> {
  const kid = kidName.toLowerCase()
  const parts: string[] = [`Kid: ${kidName}, Grade: ${KID_GRADES[kid] || 'unknown'}`]

  try {
    // Today's tasks
    const tasks = await db.query(
      `SELECT t.task_label, t.subject,
              CASE WHEN c.id IS NOT NULL THEN 'done' ELSE 'not done' END AS status
       FROM homeschool_tasks t
       LEFT JOIN homeschool_task_completions c ON c.task_id = t.id AND c.task_date = CURRENT_DATE
       WHERE t.kid_name = $1 AND t.active = true
       ORDER BY t.subject, t.sort_order`,
      [kid]
    ).catch(() => [])
    if (tasks.length > 0) {
      parts.push('Today\'s tasks: ' + tasks.map((t: any) => `${t.task_label} (${t.status})`).join(', '))
    }

    // Star balance
    const stars = await db.query(`SELECT stars_balance FROM digi_pets WHERE kid_name = $1`, [kid]).catch(() => [])
    if (stars[0]) parts.push(`Star balance: ${stars[0].stars_balance}`)

    // Current book
    const book = await db.query(
      `SELECT book_title, current_page, total_pages FROM kid_book_progress WHERE kid_name = $1 AND status = 'reading' LIMIT 1`,
      [kid]
    ).catch(() => [])
    if (book[0]) parts.push(`Currently reading: ${book[0].book_title} (page ${book[0].current_page || '?'}/${book[0].total_pages || '?'})`)
  } catch { /* partial context is fine */ }

  return parts.join('\n')
}

async function getParentContext(): Promise<string> {
  const parts: string[] = []

  try {
    // All kids' task progress
    const progress = await db.query(
      `SELECT t.kid_name, COUNT(t.id)::int AS total,
              COUNT(c.id)::int AS completed
       FROM homeschool_tasks t
       LEFT JOIN homeschool_task_completions c ON c.task_id = t.id AND c.task_date = CURRENT_DATE
       WHERE t.active = true
       GROUP BY t.kid_name ORDER BY t.kid_name`
    ).catch(() => [])
    if (progress.length > 0) {
      parts.push('Task progress today: ' + progress.map((p: any) => `${p.kid_name}: ${p.completed}/${p.total}`).join(', '))
    }

    // Pending flags
    const flags = await db.query(
      `SELECT kid_name, reason FROM kid_health_requests WHERE status = 'active' AND created_at::date = CURRENT_DATE`
    ).catch(() => [])
    if (flags.length > 0) parts.push('Health flags: ' + flags.map((f: any) => `${f.kid_name}: ${f.reason}`).join(', '))
  } catch { /* partial context is fine */ }

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { role, kid_name, message, conversation_id } = body

  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!role || !['kid', 'parent'].includes(role)) return NextResponse.json({ error: 'role must be kid or parent' }, { status: 400 })

  // Check daily message limit
  try {
    const limitKey = role === 'kid' ? kid_name?.toLowerCase() : 'lola'
    const maxMessages = role === 'kid' ? 20 : 50
    const countRows = await db.query(
      `SELECT COUNT(*)::int AS count FROM ai_buddy_conversations
       WHERE role = $1 AND COALESCE(kid_name, 'lola') = $2
       AND created_at::date = CURRENT_DATE`,
      [role, limitKey]
    )
    const used = countRows[0]?.count || 0
    if (used >= maxMessages) {
      return NextResponse.json({
        reply: `You've used all ${maxMessages} messages for today. Try again tomorrow!`,
        messages_used: used,
        messages_limit: maxMessages,
      })
    }
  } catch { /* skip limit check on error */ }

  // Build context
  let systemPrompt: string
  let context: string
  if (role === 'kid') {
    if (!kid_name) return NextResponse.json({ error: 'kid_name required for kid role' }, { status: 400 })
    const kid = kid_name.toLowerCase()
    systemPrompt = KID_SYSTEM_PROMPT(kid_name, KID_GRADES[kid] || 'unknown grade')
    context = await getKidContext(kid)
  } else {
    systemPrompt = PARENT_SYSTEM_PROMPT
    context = await getParentContext()
  }

  // Get recent conversation history
  let history: { role: string; content: string }[] = []
  if (conversation_id) {
    try {
      const recent = await db.query(
        `SELECT user_message, assistant_message FROM ai_buddy_conversations
         WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [conversation_id]
      )
      history = recent.reverse().flatMap((r: any) => [
        { role: 'user', content: r.user_message },
        { role: 'assistant', content: r.assistant_message },
      ])
    } catch { /* no history */ }
  }

  // Call Claude API
  if (!ANTHROPIC_API_KEY) {
    // Fallback response when no API key configured
    let fallback = "I'm not fully set up yet — ask Mom to configure the AI assistant. In the meantime, check your My Day view for your tasks!"
    if (role === 'parent') {
      fallback = "I'm not fully set up yet. Add ANTHROPIC_API_KEY to your Vercel environment variables to enable the family assistant."
    }

    // Still log the conversation
    try {
      await db.query(
        `INSERT INTO ai_buddy_conversations (conversation_id, role, kid_name, user_message, assistant_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [conversation_id || null, role, kid_name?.toLowerCase() || null, message, fallback]
      )
    } catch { /* log failed */ }

    return NextResponse.json({ reply: fallback, messages_used: 0, messages_limit: role === 'kid' ? 20 : 50 })
  }

  try {
    const messages = [
      ...history,
      { role: 'user', content: message },
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `${systemPrompt}\n\nCurrent data:\n${context}`,
        messages,
      }),
    })

    const data = await res.json()
    const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Try asking in a different way!"

    // Log conversation
    try {
      await db.query(
        `INSERT INTO ai_buddy_conversations (conversation_id, role, kid_name, user_message, assistant_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [conversation_id || null, role, kid_name?.toLowerCase() || null, message, reply]
      )
    } catch { /* log failed */ }

    return NextResponse.json({ reply, messages_used: 0, messages_limit: role === 'kid' ? 20 : 50 })
  } catch (error) {
    console.error('AI Buddy error:', error)
    return NextResponse.json({
      reply: "I'm having trouble thinking right now. Try again in a moment!",
      error: true,
    })
  }
}
