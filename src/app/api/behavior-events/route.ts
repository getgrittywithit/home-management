import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_events'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_events') {
      const limit = parseInt(searchParams.get('limit') || '50')
      const rows = await db.query(`SELECT * FROM behavior_events ORDER BY created_at DESC LIMIT $1`, [limit]).catch(() => [])
      return NextResponse.json({ events: rows })
    }

    if (action === 'get_kid_history') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM behavior_events WHERE involved_kids @> $1::jsonb ORDER BY created_at DESC LIMIT 30`,
        [JSON.stringify([kid])]
      ).catch(() => [])
      return NextResponse.json({ events: rows })
    }

    if (action === 'get_pattern_analysis') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      // Behavior type frequency
      const types = await db.query(
        `SELECT behavior_type, COUNT(*)::int as count, AVG(severity_tier)::numeric(3,1) as avg_tier
         FROM behavior_events WHERE involved_kids @> $1::jsonb AND created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY behavior_type ORDER BY count DESC`,
        [JSON.stringify([kid])]
      ).catch(() => [])

      // Time-of-day pattern
      const timePattern = await db.query(
        `SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*)::int as count
         FROM behavior_events WHERE involved_kids @> $1::jsonb AND created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY hour ORDER BY count DESC LIMIT 3`,
        [JSON.stringify([kid])]
      ).catch(() => [])

      // Pair analysis (who is this kid in conflict with most)
      const pairs = await db.query(
        `SELECT involved_kids, COUNT(*)::int as count FROM behavior_events
         WHERE involved_kids @> $1::jsonb AND severity_tier >= 2 AND created_at >= CURRENT_DATE - INTERVAL '14 days'
         GROUP BY involved_kids ORDER BY count DESC LIMIT 5`,
        [JSON.stringify([kid])]
      ).catch(() => [])

      // Weekly trend
      const weeklyTrend = await db.query(
        `SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*)::int as count, AVG(severity_tier)::numeric(3,1) as avg_tier
         FROM behavior_events WHERE involved_kids @> $1::jsonb AND created_at >= CURRENT_DATE - INTERVAL '8 weeks'
         GROUP BY week ORDER BY week`,
        [JSON.stringify([kid])]
      ).catch(() => [])

      return NextResponse.json({ types, time_pattern: timePattern, pairs, weekly_trend: weeklyTrend })
    }

    if (action === 'get_settings') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const row = (await db.query(`SELECT * FROM kid_behavior_settings WHERE kid_name = $1`, [kid]).catch(() => []))[0]
      return NextResponse.json({ settings: row || null })
    }

    if (action === 'get_weekly_summary') {
      // All kids summary for the week
      const monday = getMonday()
      const rows = await db.query(
        `SELECT
           e.involved_kids,
           COUNT(*)::int as total_events,
           COUNT(*) FILTER (WHERE severity_tier = 0)::int as positive,
           COUNT(*) FILTER (WHERE severity_tier = 1)::int as level1,
           COUNT(*) FILTER (WHERE severity_tier = 2)::int as level2,
           COUNT(*) FILTER (WHERE severity_tier >= 3)::int as level3plus
         FROM behavior_events e
         WHERE created_at >= $1::date
         GROUP BY involved_kids`, [monday]
      ).catch(() => [])
      return NextResponse.json({ summary: rows })
    }

    if (action === 'get_digest') {
      // Weekly behavioral digest with recommendations
      const monday = getMonday()
      const kids = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
      const kidDigests = []
      for (const k of kids) {
        const events = await db.query(
          `SELECT behavior_type, severity_tier, created_at FROM behavior_events
           WHERE involved_kids @> $1::jsonb AND created_at >= $2::date ORDER BY created_at`,
          [JSON.stringify([k]), monday]
        ).catch(() => [])
        const regulationUse = await db.query(
          `SELECT COUNT(*)::int as count FROM kid_mood_log WHERE child_name = $1 AND log_date >= $2`, [k, monday]
        ).catch(() => [])
        const moodAvg = await db.query(
          `SELECT AVG(mood)::numeric(3,1) as avg FROM kid_mood_log WHERE child_name = $1 AND log_date >= $2`, [k, monday]
        ).catch(() => [])
        const conflictCount = events.filter((e: any) => e.severity_tier >= 2).length
        const positiveCount = events.filter((e: any) => e.severity_tier === 0).length
        let recommendation = ''
        if (conflictCount >= 3) recommendation = `Consider one-on-one time with ${k.charAt(0).toUpperCase() + k.slice(1)} this weekend`
        else if (conflictCount >= 2 && (moodAvg[0]?.avg || 5) < 3) recommendation = `${k.charAt(0).toUpperCase() + k.slice(1)} may be struggling — check in privately`
        else if (positiveCount >= 3) recommendation = `${k.charAt(0).toUpperCase() + k.slice(1)} is doing great! Acknowledge their effort`
        kidDigests.push({
          kid: k,
          total_events: events.length,
          conflicts: conflictCount,
          positives: positiveCount,
          regulation_uses: regulationUse[0]?.count || 0,
          avg_mood: moodAvg[0]?.avg || null,
          recommendation,
        })
      }
      return NextResponse.json({ digest: kidDigests, week_start: monday })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Behavior events GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create_event') {
      const { involved_kids, behavior_type, severity_tier, description, parent_note, star_deduction, gem_deduction } = body
      if (!behavior_type) return NextResponse.json({ error: 'behavior_type required' }, { status: 400 })
      const result = await db.query(
        `INSERT INTO behavior_events (involved_kids, behavior_type, severity_tier, description, parent_note, star_deduction, gem_deduction)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [JSON.stringify(involved_kids || []), behavior_type, severity_tier || 1, description || null, parent_note || null, star_deduction || 0, gem_deduction || 0]
      )

      // Apply deductions to involved kids (with immune-day safeguards)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const immuneKids: string[] = []
      for (const kid of (involved_kids || [])) {
        const kidLower = (typeof kid === 'string' ? kid : '').toLowerCase()
        if (!kidLower) continue
        // Check immune day (sick, break, low-mood)
        const sick = await db.query(`SELECT id FROM kid_sick_days WHERE kid_name = $1 AND sick_date = $2`, [kidLower, today]).catch(() => [])
        const breakFlag = await db.query(`SELECT id FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date = $2`, [kidLower, today]).catch(() => [])
        const lowMood = await db.query(`SELECT mood FROM kid_mood_log WHERE child_name = $1 AND log_date = $2 AND mood <= 2`, [kidLower, today]).catch(() => [])
        if (sick.length > 0 || breakFlag.length > 0 || lowMood.length > 0) {
          immuneKids.push(kidLower)
          continue
        }
        // Apply deductions
        if (star_deduction && star_deduction > 0) {
          await db.query(`UPDATE digi_pets SET stars_balance = GREATEST(0, stars_balance - $1) WHERE kid_name = $2`, [star_deduction, kidLower]).catch(() => {})
        }
        if (gem_deduction && gem_deduction > 0) {
          await db.query(`UPDATE digi_pets SET gem_balance = GREATEST(0, gem_balance - $1) WHERE kid_name = $2`, [gem_deduction, kidLower]).catch(() => {})
          await db.query(`INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, $2, 'behavior_deduction', $3)`,
            [kidLower, -gem_deduction, `Behavior event: ${behavior_type}`]).catch(() => {})
        }
        // Level 3+ fun lock
        if ((severity_tier || 1) >= 3) {
          const lockUntil = new Date(Date.now() + 24 * 3600000).toISOString()
          await db.query(`UPDATE digi_pets SET fun_locked_until = $1 WHERE kid_name = $2`, [lockUntil, kidLower]).catch(() => {})
        }
      }
      return NextResponse.json({ success: true, id: result[0]?.id, immune_kids: immuneKids })
    }

    if (action === 'update_settings') {
      const { kid_name, default_tier, star_multiplier, gem_multiplier, auto_escalation_threshold, behavior_goals } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      await db.query(
        `INSERT INTO kid_behavior_settings (kid_name, default_tier, star_multiplier, gem_multiplier, auto_escalation_threshold, behavior_goals)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (kid_name) DO UPDATE SET default_tier=$2, star_multiplier=$3, gem_multiplier=$4, auto_escalation_threshold=$5, behavior_goals=$6`,
        [kid_name.toLowerCase(), default_tier || 2, star_multiplier || 1.0, gem_multiplier || 1.0, auto_escalation_threshold || 3, JSON.stringify(behavior_goals || [])]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'quick_positive_catch') {
      // One-tap "Great job" button
      const { kid_name, description } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      await db.query(
        `INSERT INTO behavior_events (involved_kids, behavior_type, severity_tier, description, created_by)
         VALUES ($1, 'positive_behavior', 0, $2, 'parent')`,
        [JSON.stringify([kid]), description || 'Caught being good!']
      )
      // Award 5 gems
      await db.query(`UPDATE digi_pets SET gem_balance = gem_balance + 5 WHERE kid_name = $1`, [kid])
      await db.query(`INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, 5, 'positive_catch', $2)`,
        [kid, description || 'Caught being good!'])
      const { createNotification } = await import('@/lib/notifications')
      await createNotification({
        title: '\uD83C\uDF1F Great job!', message: `Mom or Dad noticed something great! +5 gems`,
        source_type: 'positive_catch', icon: '\uD83C\uDF1F', target_role: 'kid', kid_name: kid,
      }).catch(() => {})
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Behavior events POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}
