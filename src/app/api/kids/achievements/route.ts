import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { checkAchievements } from '@/lib/achievement-checker'
import { parseDateLocal } from '@/lib/date-local'

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()

    if (action === 'get_achievements') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })

      const [allDefs, unlocked, choreStreak, activityStreak, readingStreak, dentalStreak] = await Promise.all([
        db.query(`SELECT key, title, description, emoji, category, trigger_type, trigger_value, trigger_metric FROM achievement_definitions ORDER BY category, trigger_value`).catch(() => []),
        db.query(`SELECT achievement_key, unlocked_at, seen_by_kid FROM kid_achievements WHERE kid_name = $1`, [kid]).catch(() => []),
        db.query(`SELECT current_streak FROM kid_chore_streaks WHERE kid_name = $1`, [kid]).catch(() => []),
        db.query(`SELECT current_streak FROM kid_activity_streaks WHERE kid_name = $1`, [kid]).catch(() => []),
        db.query(`SELECT session_date FROM kid_reading_sessions WHERE kid_name = $1 ORDER BY session_date DESC LIMIT 30`, [kid]).catch(() => []),
        db.query(`SELECT current_streak FROM kid_dental_streaks WHERE kid_name = $1`, [kid]).catch(() => []),
      ])

      const unlockedMap: Record<string, { unlocked_at: string; seen_by_kid: boolean }> = {}
      ;(unlocked as any[]).forEach((u: any) => { unlockedMap[u.achievement_key] = { unlocked_at: u.unlocked_at, seen_by_kid: u.seen_by_kid } })

      const all = (allDefs as any[]).map((d: any) => ({
        ...d, unlocked: !!unlockedMap[d.key],
        unlocked_at: unlockedMap[d.key]?.unlocked_at || null,
        seen_by_kid: unlockedMap[d.key]?.seen_by_kid ?? true,
      }))

      const newUnlocks = all.filter(a => a.unlocked && !a.seen_by_kid)

      // Calculate reading streak
      const today = getToday()
      const readDates = (readingStreak as any[]).map((r: any) => r.session_date?.toISOString?.()?.slice(0, 10) || String(r.session_date).slice(0, 10))
      let rStreak = 0
      let check = today
      for (const d of readDates) {
        if (d === check) { rStreak++; const dt = parseDateLocal(check); dt.setDate(dt.getDate() - 1); check = dt.toLocaleDateString('en-CA') }
        else if (rStreak === 0) { const dt = parseDateLocal(today); dt.setDate(dt.getDate() - 1); if (d === dt.toLocaleDateString('en-CA')) { rStreak = 1; const dt2 = parseDateLocal(d); dt2.setDate(dt2.getDate() - 1); check = dt2.toLocaleDateString('en-CA') } else break }
        else break
      }

      return NextResponse.json({
        unlocked: all.filter(a => a.unlocked),
        newUnlocks,
        all,
        streaks: {
          reading: rStreak,
          dental: (dentalStreak as any[])[0]?.current_streak || 0,
          chore: (choreStreak as any[])[0]?.current_streak || 0,
          activity: (activityStreak as any[])[0]?.current_streak || 0,
        }
      })
    }

    if (action === 'get_year_review') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      const year = new Date().getFullYear()
      const [books, readStreak, dentalStreak, choreStreak, points, achievements, goals] = await Promise.all([
        db.query(`SELECT COUNT(*)::int as c FROM kid_reading_log WHERE kid_name = $1 AND status = 'completed' AND date_completed >= $2`, [kid, `${year}-01-01`]).catch(() => [{ c: 0 }]),
        db.query(`SELECT COALESCE(longest_streak, 0) as longest FROM kid_chore_streaks WHERE kid_name = $1`, [kid]).catch(() => [{ longest: 0 }]),
        db.query(`SELECT COALESCE(longest_streak, 0) as longest FROM kid_dental_streaks WHERE kid_name = $1`, [kid]).catch(() => [{ longest: 0 }]),
        db.query(`SELECT COALESCE(longest_streak, 0) as longest FROM kid_chore_streaks WHERE kid_name = $1`, [kid]).catch(() => [{ longest: 0 }]),
        db.query(`SELECT total_earned_all_time FROM kid_points_balance WHERE kid_name = $1`, [kid]).catch(() => [{ total_earned_all_time: 0 }]),
        db.query(`SELECT COUNT(*)::int as c FROM kid_achievements WHERE kid_name = $1`, [kid]).catch(() => [{ c: 0 }]),
        db.query(`SELECT COUNT(*)::int as c FROM savings_goals WHERE kid_name = $1 AND is_achieved = TRUE`, [kid]).catch(() =>
          db.query(`SELECT COUNT(*)::int as c FROM kid_savings_goals WHERE kid_name = $1 AND completed = TRUE`, [kid]).catch(() => [{ c: 0 }])
        ),
      ])
      return NextResponse.json({
        year,
        booksRead: (books as any[])[0]?.c || 0,
        longestReadingStreak: (readStreak as any[])[0]?.longest || 0,
        longestDentalStreak: (dentalStreak as any[])[0]?.longest || 0,
        totalPoints: (points as any[])[0]?.total_earned_all_time || 0,
        achievementsUnlocked: (achievements as any[])[0]?.c || 0,
        goalsCompleted: (goals as any[])[0]?.c || 0,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Achievements GET error:', error)
    return NextResponse.json({ error: 'Failed to load achievements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'mark_seen') {
      const { kid_name, keys } = body
      if (!kid_name || !keys?.length) return NextResponse.json({ error: 'kid_name and keys required' }, { status: 400 })
      await db.query(
        `UPDATE kid_achievements SET seen_by_kid = TRUE WHERE kid_name = $1 AND achievement_key = ANY($2)`,
        [kid_name.toLowerCase(), keys]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'check_achievements') {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      await checkAchievements(kid_name)
      return NextResponse.json({ success: true })
    }

    if (action === 'award_manual') {
      const { kid_name, title, emoji, description } = body
      if (!kid_name || !title) return NextResponse.json({ error: 'kid_name, title required' }, { status: 400 })
      const key = `manual_${Date.now()}`
      await db.query(
        `INSERT INTO achievement_definitions (key, title, description, emoji, category, trigger_type) VALUES ($1, $2, $3, $4, 'special', 'manual')`,
        [key, title, description || title, emoji || '🌟']
      )
      await db.query(
        `INSERT INTO kid_achievements (kid_name, achievement_key, seen_by_kid) VALUES ($1, $2, FALSE)`,
        [kid_name.toLowerCase(), key]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Achievements POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
