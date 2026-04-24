import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'
import { sendEmail } from '@/lib/gmail'
import { parseDateLocal } from '@/lib/date-local'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start') || (() => {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7)
    return d.toLocaleDateString('en-CA')
  })()
  const weekEnd = new Date(parseDateLocal(weekStart).getTime() + 6 * 86400000).toLocaleDateString('en-CA')

  try {
    const summary: any[] = []

    for (const kid of [...HOMESCHOOL_KIDS]) {
      const conversations = await db.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE buddy_type IS NOT NULL)::int AS buddy_chats
         FROM ai_buddy_conversations WHERE kid_name = $1 AND created_at >= $2::date AND created_at <= ($3::date + 1)`,
        [kid, weekStart, weekEnd]
      ).catch(() => [{ total: 0, buddy_chats: 0 }])

      const flags = await db.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE severity = 'crisis')::int AS crisis
         FROM buddy_moderation_flags WHERE kid_name = $1 AND created_at >= $2::date AND created_at <= ($3::date + 1)`,
        [kid, weekStart, weekEnd]
      ).catch(() => [{ total: 0, crisis: 0 }])

      const sessions = await db.query(
        `SELECT COALESCE(SUM(duration_minutes), 0)::int AS total_minutes, COUNT(*)::int AS session_count
         FROM buddy_session_log WHERE kid_name = $1 AND session_start >= $2::date AND session_start <= ($3::date + 1)`,
        [kid, weekStart, weekEnd]
      ).catch(() => [{ total_minutes: 0, session_count: 0 }])

      summary.push({
        kid_name: kid,
        display_name: KID_DISPLAY[kid],
        conversations: conversations[0]?.total || 0,
        buddy_chats: conversations[0]?.buddy_chats || 0,
        flags: flags[0]?.total || 0,
        crisis_flags: flags[0]?.crisis || 0,
        total_minutes: sessions[0]?.total_minutes || 0,
        session_count: sessions[0]?.session_count || 0,
      })
    }

    const pendingFlags = await db.query(
      `SELECT COUNT(*)::int AS count FROM buddy_moderation_flags WHERE parent_reviewed = FALSE`
    ).catch(() => [{ count: 0 }])

    return NextResponse.json({ summary, week_start: weekStart, week_end: weekEnd, pending_flags: pendingFlags[0]?.count || 0 })
  } catch (e: any) {
    console.error('[buddy-weekly-summary] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.action !== 'send_weekly_email') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    const res = await fetch(new URL('/api/ai-buddy/weekly-summary', req.url).toString())
    const data = await res.json()
    if (!data.summary) return NextResponse.json({ error: 'No summary data' }, { status: 500 })

    const lines = data.summary.map((s: any) =>
      `${s.display_name}: ${s.conversations} messages, ${s.total_minutes} min across ${s.session_count} sessions${s.flags > 0 ? ` (${s.flags} flags${s.crisis_flags > 0 ? ', ' + s.crisis_flags + ' CRISIS' : ''})` : ''}`
    )

    const emailBody = `AI Buddy Weekly Summary — Week of ${data.week_start}\n\n${lines.join('\n')}\n\n${data.pending_flags > 0 ? `${data.pending_flags} flags pending review in Admin panel.\n\n` : ''}Review conversations and flags at family-ops.grittysystems.com → Homeschool → AI Buddies\n\n— Coral`

    const result = await sendEmail({
      to: 'mosesfamily2008@gmail.com',
      subject: `AI Buddy Weekly Summary — Week of ${data.week_start}`,
      body: emailBody,
    })

    return NextResponse.json({ sent: result.success, summary: data.summary })
  } catch (e: any) {
    console.error('[buddy-weekly-email] error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
