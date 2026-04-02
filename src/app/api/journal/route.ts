import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

// Reuse safety detection from ai-buddy
const CRISIS_KEYWORDS = [
  'want to die', 'kill myself', 'end it all', 'better off dead',
  'wish i was dead', 'hurt myself', 'self harm', 'cut myself', 'suicide',
]
const CONCERN_KEYWORDS = [
  'hate myself', 'im stupid', "i'm stupid", 'worthless', 'nobody likes me',
  'hate my life', 'useless', 'nothing matters', 'everyone hates me',
]

function detectSafety(text: string): 'crisis' | 'concern' | 'safe' {
  const lower = text.toLowerCase().replace(/['']/g, "'")
  if (CRISIS_KEYWORDS.some(kw => lower.includes(kw))) return 'crisis'
  if (CONCERN_KEYWORDS.some(kw => lower.includes(kw))) return 'concern'
  return 'safe'
}

const PROMPTS = [
  "What's one thing you're proud of today?",
  "What's something hard you got through?",
  "If you could tell yesterday-you something, what would it be?",
  "What made you smile today?",
  "What's something you're looking forward to?",
  "What's one kind thing someone did for you recently?",
  "If you could learn anything, what would it be?",
  "What's something you used to find hard that's easier now?",
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const kidName = searchParams.get('kid_name')

  switch (action) {
    case 'get_entries': {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT id, entry_date, prompt_text, entry_text, mood_tag, private, created_at
         FROM kid_journal_entries WHERE kid_name = $1 ORDER BY created_at DESC LIMIT 30`,
        [kidName.toLowerCase()]
      ).catch(() => [])
      return NextResponse.json({ entries: rows })
    }

    case 'get_shared': {
      // Parent view — only shared entries
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT id, entry_date, prompt_text, entry_text, mood_tag, created_at
         FROM kid_journal_entries WHERE kid_name = $1 AND private = FALSE ORDER BY created_at DESC LIMIT 20`,
        [kidName.toLowerCase()]
      ).catch(() => [])
      return NextResponse.json({ entries: rows })
    }

    case 'get_prompt': {
      const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
      return NextResponse.json({ prompt })
    }

    case 'get_confidence_card': {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kidName.toLowerCase()
      const wins: string[] = []

      // Recent achievements
      const achievements = await db.query(
        `SELECT title FROM kid_achievements WHERE kid_name = $1 AND earned_at >= CURRENT_DATE - INTERVAL '14 days' ORDER BY earned_at DESC LIMIT 2`,
        [kid]
      ).catch(() => [])
      achievements.forEach((a: any) => wins.push(a.title))

      // Zone streak
      const streak = await db.query(
        `SELECT streak_type, current_count FROM kid_chore_streaks WHERE kid_name = $1 AND current_count >= 3 ORDER BY current_count DESC LIMIT 1`,
        [kid]
      ).catch(() => [])
      if (streak[0]) wins.push(`${streak[0].current_count}-day ${streak[0].streak_type} streak`)

      // Stars earned this week
      const stars = await db.query(
        `SELECT COALESCE(SUM(amount), 0)::int as total FROM digi_pet_star_log WHERE kid_name = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' AND amount > 0`,
        [kid]
      ).catch(() => [])
      if (stars[0]?.total > 0) wins.push(`Earned ${stars[0].total} stars this week`)

      // Points earned this week
      const points = await db.query(
        `SELECT COALESCE(SUM(points), 0)::int as total FROM kid_points_log WHERE kid_name = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' AND transaction_type = 'earned'`,
        [kid]
      ).catch(() => [])
      if (points[0]?.total > 0) wins.push(`Earned ${points[0].total} points this week`)

      // Positive reports
      const goods = await db.query(
        `SELECT category FROM kid_positive_reports WHERE kid_name = $1 AND approved = TRUE AND created_at >= CURRENT_DATE - INTERVAL '14 days' ORDER BY created_at DESC LIMIT 1`,
        [kid]
      ).catch(() => [])
      if (goods[0]) wins.push(`Recognized for ${goods[0].category}`)

      // Should we show the card? Check for low mood or concern events
      const shouldShow = await db.query(
        `SELECT 1 FROM kid_mood_log WHERE child_name = $1 AND log_date >= CURRENT_DATE - INTERVAL '2 days' AND (mood <= 2 OR mood_score <= 2) LIMIT 1`,
        [kid]
      ).catch(() => [])
      const hasConcern = await db.query(
        `SELECT 1 FROM safety_events WHERE kid_name = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' LIMIT 1`,
        [kid]
      ).catch(() => [])

      return NextResponse.json({
        show: (shouldShow.length > 0 || hasConcern.length > 0) && wins.length > 0,
        wins: wins.slice(0, 4),
      })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'create_entry': {
      const { kid_name, entry_text, prompt_text, mood_tag } = body
      if (!kid_name || !entry_text?.trim()) return NextResponse.json({ error: 'kid_name and entry_text required' }, { status: 400 })

      const safetyLevel = detectSafety(entry_text)
      const flagged = safetyLevel !== 'safe'

      await db.query(
        `INSERT INTO kid_journal_entries (kid_name, entry_text, prompt_text, mood_tag, flagged)
         VALUES ($1, $2, $3, $4, $5)`,
        [kid_name.toLowerCase(), entry_text.trim().substring(0, 2000), prompt_text || null, mood_tag || null, flagged]
      )

      if (flagged) {
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
        await createNotification({
          title: safetyLevel === 'crisis' ? `URGENT: Check ${kidDisplay}'s journal` : `${kidDisplay} may need encouragement`,
          message: `Journal entry flagged — ${safetyLevel === 'crisis' ? 'concerning language detected' : 'negative self-talk detected'}`,
          source_type: safetyLevel === 'crisis' ? 'crisis_detection' : 'concern_detection',
          source_ref: `journal-${kid_name.toLowerCase()}-${Date.now()}`,
          link_tab: 'health', icon: safetyLevel === 'crisis' ? '🚨' : '💛',
        }).catch(e => console.error('Journal safety notify failed:', e.message))

        // Log safety event
        await db.query(
          `INSERT INTO safety_events (kid_name, event_type, severity, source, message_snippet, parent_notified)
           VALUES ($1, $2, $3, 'journal', $4, TRUE)`,
          [kid_name.toLowerCase(), `${safetyLevel}_keyword`, safetyLevel === 'crisis' ? 'high' : 'medium', entry_text.substring(0, 100)]
        ).catch(() => {})
      }

      return NextResponse.json({ success: true, flagged })
    }

    case 'toggle_sharing': {
      const { id, kid_name, shared } = body
      if (!id || !kid_name) return NextResponse.json({ error: 'id and kid_name required' }, { status: 400 })
      await db.query(
        `UPDATE kid_journal_entries SET private = $2 WHERE id = $1 AND kid_name = $3`,
        [id, !shared, kid_name.toLowerCase()]
      )
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
