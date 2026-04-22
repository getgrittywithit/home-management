import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const isParent = searchParams.get('parent') === 'true'
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    if (isParent) {
      // Parent sees metadata only for private entries, full text for flagged/shared
      const entries = await db.query(
        `SELECT id, entry_date, LENGTH(entry_text) AS word_count, mood_tag, private, flagged,
                CASE WHEN private = FALSE OR flagged = TRUE THEN entry_text ELSE NULL END AS entry_text,
                CASE WHEN private = FALSE OR flagged = TRUE THEN prompt_text ELSE NULL END AS prompt_text
         FROM kid_journal_entries WHERE kid_name = $1 ORDER BY entry_date DESC LIMIT 30`,
        [kid]
      ).catch(() => [])
      return NextResponse.json({ entries })
    }

    // Kid sees all their own entries
    const entries = await db.query(
      `SELECT * FROM kid_journal_entries WHERE kid_name = $1 ORDER BY entry_date DESC LIMIT 30`, [kid]
    ).catch(() => [])

    // Today's prompt
    const prompt = await db.query(
      `SELECT prompt_text FROM journal_prompts WHERE active = TRUE ORDER BY RANDOM() LIMIT 1`
    ).catch(() => [])

    return NextResponse.json({ entries, today_prompt: prompt[0]?.prompt_text || 'What made you smile today?' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'write_entry') {
      const { kid_name, entry_text, prompt_text, mood_tag, private: isPrivate, flagged } = body
      if (!kid_name || !entry_text) return NextResponse.json({ error: 'kid_name + entry_text required' }, { status: 400 })

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await db.query(
        `INSERT INTO kid_journal_entries (kid_name, entry_date, entry_text, prompt_text, mood_tag, private, flagged)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (kid_name, entry_date) DO UPDATE SET entry_text = $3, prompt_text = $4, mood_tag = $5, private = $6, flagged = $7`,
        [kid_name.toLowerCase(), today, entry_text, prompt_text || null, mood_tag || null, isPrivate !== false, flagged || false]
      )

      if (flagged) {
        await createNotification({
          title: `${cap(kid_name)} wants you to read their journal`,
          message: `${cap(kid_name)} flagged today's entry for you.`,
          source_type: 'journal_flagged', source_ref: `journal-${kid_name}-${today}`,
          icon: '📝', link_tab: 'health',
        }).catch(() => {})
      }

      // Award stars for journaling
      await db.query(
        `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', 5, 'Journaled today')`,
        [kid_name.toLowerCase()]
      ).catch(() => {})

      return NextResponse.json({ success: true })
    }

    if (action === 'log_wellness') {
      const { kid_name, water_cups, steps, weight, notes } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await db.query(
        `INSERT INTO kid_wellness_log (child_name, log_date, water_cups, steps, weight, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (child_name, log_date) DO UPDATE SET water_cups = COALESCE($3, kid_wellness_log.water_cups), steps = COALESCE($4, kid_wellness_log.steps), weight = COALESCE($5, kid_wellness_log.weight), notes = COALESCE($6, kid_wellness_log.notes)`,
        [kid_name.toLowerCase(), today, water_cups || null, steps || null, weight || null, notes || null]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
