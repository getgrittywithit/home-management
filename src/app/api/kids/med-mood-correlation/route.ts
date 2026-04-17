import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Mood text → numeric score
const MOOD_SCORES: Record<string, number> = {
  great: 5, good: 4, ok: 3, okay: 3, rough: 2, bad: 1,
  '5': 5, '4': 4, '3': 3, '2': 2, '1': 1,
}

const MOOD_LABELS: Record<number, string> = {
  5: 'great', 4: 'good', 3: 'okay', 2: 'rough', 1: 'bad',
}

function moodToScore(mood: string | number): number {
  if (typeof mood === 'number') return Math.max(1, Math.min(5, mood))
  return MOOD_SCORES[String(mood).toLowerCase()] ?? 3
}

function scoreToLabel(score: number): string {
  const rounded = Math.round(Math.max(1, Math.min(5, score)))
  return MOOD_LABELS[rounded] || 'okay'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kidName = searchParams.get('kid_name')?.toLowerCase()
    if (!kidName) {
      return NextResponse.json({ error: 'kid_name is required' }, { status: 400 })
    }

    const rangeDays = Math.min(90, Math.max(1, parseInt(searchParams.get('range') || '30') || 30))
    const kidCapitalized = kidName.charAt(0).toUpperCase() + kidName.slice(1)

    // ----- Fetch mood data -----
    let moodRows: any[] = []
    try {
      moodRows = await db.query(
        `SELECT log_date, mood, energy, anxiety, irritability, focus
         FROM kid_mood_log
         WHERE child_name = $1
           AND log_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
         ORDER BY log_date ASC`,
        [kidName, rangeDays]
      )
    } catch (e: any) {
      console.error('med-mood-correlation: mood query failed:', e.message)
    }

    // ----- Fetch active medications for this kid -----
    let activeMeds: string[] = []
    try {
      const medRows = await db.query(
        `SELECT medication_name FROM medications
         WHERE family_member_name = $1 AND is_active = TRUE`,
        [kidCapitalized]
      )
      activeMeds = medRows.map((r: any) => r.medication_name)
    } catch (e: any) {
      console.error('med-mood-correlation: medications query failed:', e.message)
    }

    // ----- Fetch adherence data -----
    let adherenceRows: any[] = []
    try {
      adherenceRows = await db.query(
        `SELECT medication_name, taken, log_date
         FROM med_adherence_log
         WHERE kid_name = $1
           AND log_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
         ORDER BY log_date ASC`,
        [kidName, rangeDays]
      )
    } catch (e: any) {
      // Table may not exist yet — graceful fallback
      console.error('med-mood-correlation: adherence query failed (table may not exist):', e.message)
    }

    // ----- Build lookup maps -----
    // mood by date
    const moodByDate: Record<string, any> = {}
    for (const row of moodRows) {
      const d = typeof row.log_date === 'string' ? row.log_date : new Date(row.log_date).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      moodByDate[d] = row
    }

    // adherence by date
    const adherenceByDate: Record<string, { taken: string[]; missed: string[] }> = {}
    for (const row of adherenceRows) {
      const d = typeof row.log_date === 'string' ? row.log_date : new Date(row.log_date).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      if (!adherenceByDate[d]) adherenceByDate[d] = { taken: [], missed: [] }
      if (row.taken) {
        adherenceByDate[d].taken.push(row.medication_name)
      } else {
        adherenceByDate[d].missed.push(row.medication_name)
      }
    }

    // ----- Build timeline -----
    const allDates = new Set<string>()
    Object.keys(moodByDate).forEach(d => allDates.add(d))
    Object.keys(adherenceByDate).forEach(d => allDates.add(d))
    const sortedDates = Array.from(allDates).sort()

    const timeline = sortedDates.map(date => {
      const mood = moodByDate[date]
      const adh = adherenceByDate[date]
      const totalMeds = adh ? adh.taken.length + adh.missed.length : 0
      const adherencePct = totalMeds > 0 ? Math.round((adh!.taken.length / totalMeds) * 100) : null

      return {
        date,
        meds: adh ? {
          taken: adh.taken,
          missed: adh.missed,
          adherence_pct: adherencePct ?? 0,
        } : { taken: [], missed: [], adherence_pct: 0 },
        mood: mood ? {
          primary_mood: scoreToLabel(moodToScore(mood.mood)),
          energy: mood.energy ?? null,
          anxiety: mood.anxiety ?? null,
          irritability: mood.irritability ?? null,
          focus: mood.focus ?? null,
        } : null,
      }
    })

    // ----- Pattern detection -----
    const patterns: Array<{ type: string; description: string; confidence: string; occurrences: number }> = []

    // Collect mood scores bucketed by adherence status
    const moodScoresFullAdherence: number[] = []
    const moodScoresPartialAdherence: number[] = []
    const dimensions = ['energy', 'anxiety', 'irritability', 'focus'] as const

    const dimScoresFull: Record<string, number[]> = { energy: [], anxiety: [], irritability: [], focus: [] }
    const dimScoresPartial: Record<string, number[]> = { energy: [], anxiety: [], irritability: [], focus: [] }

    for (const entry of timeline) {
      if (!entry.mood) continue
      const mScore = moodToScore(entry.mood.primary_mood)
      const totalMeds = entry.meds.taken.length + entry.meds.missed.length

      if (totalMeds > 0 && entry.meds.missed.length === 0) {
        moodScoresFullAdherence.push(mScore)
        for (const dim of dimensions) {
          if (entry.mood[dim] != null) dimScoresFull[dim].push(entry.mood[dim])
        }
      } else if (totalMeds > 0 && entry.meds.missed.length > 0) {
        moodScoresPartialAdherence.push(mScore)
        for (const dim of dimensions) {
          if (entry.mood[dim] != null) dimScoresPartial[dim].push(entry.mood[dim])
        }
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    // Pattern 1: missed med → mood dip
    if (moodScoresFullAdherence.length >= 2 && moodScoresPartialAdherence.length >= 2) {
      const avgFull = avg(moodScoresFullAdherence)
      const avgPartial = avg(moodScoresPartialAdherence)
      if (avgFull - avgPartial > 0.5) {
        patterns.push({
          type: 'missed_med_mood_dip',
          description: `Average mood is ${scoreToLabel(avgFull)} on full-med days vs ${scoreToLabel(avgPartial)} when meds are missed. Mood tends to dip when medications are skipped.`,
          confidence: moodScoresPartialAdherence.length >= 5 ? 'high' : 'moderate',
          occurrences: moodScoresPartialAdherence.length,
        })
      }

      // Check individual dimensions
      for (const dim of dimensions) {
        if (dimScoresFull[dim].length >= 2 && dimScoresPartial[dim].length >= 2) {
          const dFull = avg(dimScoresFull[dim])
          const dPartial = avg(dimScoresPartial[dim])
          // For anxiety/irritability, higher = worse, so partial > full means worse
          const isNegativeDim = dim === 'anxiety' || dim === 'irritability'
          const diff = isNegativeDim ? (dPartial - dFull) : (dFull - dPartial)
          if (diff > 0.5) {
            patterns.push({
              type: `missed_med_${dim}_impact`,
              description: `${dim.charAt(0).toUpperCase() + dim.slice(1)} is notably ${isNegativeDim ? 'higher' : 'lower'} on days with missed medications (avg ${dPartial.toFixed(1)} vs ${dFull.toFixed(1)} on full-med days).`,
              confidence: 'moderate',
              occurrences: dimScoresPartial[dim].length,
            })
          }
        }
      }
    }

    // Pattern 2: 3+ day streaks of full adherence → mood improvement
    let streakCount = 0
    let streakImprovements = 0
    let currentStreak = 0
    let streakStartMood: number | null = null

    for (const entry of timeline) {
      const totalMeds = entry.meds.taken.length + entry.meds.missed.length
      if (totalMeds > 0 && entry.meds.missed.length === 0) {
        if (currentStreak === 0 && entry.mood) {
          streakStartMood = moodToScore(entry.mood.primary_mood)
        }
        currentStreak++
        if (currentStreak >= 3 && entry.mood && streakStartMood !== null) {
          streakCount++
          if (moodToScore(entry.mood.primary_mood) > streakStartMood) {
            streakImprovements++
          }
        }
      } else {
        currentStreak = 0
        streakStartMood = null
      }
    }

    if (streakImprovements >= 2) {
      patterns.push({
        type: 'streak_improvement',
        description: `Mood tends to improve after 3+ consecutive days of full medication adherence (${streakImprovements} times observed).`,
        confidence: streakImprovements >= 4 ? 'high' : 'moderate',
        occurrences: streakImprovements,
      })
    }

    // Pattern 3: next-day effect — missed med today → worse mood tomorrow
    let nextDayDips = 0
    let nextDayChecks = 0
    for (let i = 0; i < timeline.length - 1; i++) {
      const today = timeline[i]
      const tomorrow = timeline[i + 1]
      const totalMeds = today.meds.taken.length + today.meds.missed.length
      if (totalMeds > 0 && today.meds.missed.length > 0 && tomorrow.mood) {
        nextDayChecks++
        const tomorrowScore = moodToScore(tomorrow.mood.primary_mood)
        if (tomorrowScore <= 2) {
          nextDayDips++
        }
      }
    }

    if (nextDayDips >= 3) {
      patterns.push({
        type: 'next_day_effect',
        description: `Missing medication is often followed by a rough or bad mood the next day (${nextDayDips} out of ${nextDayChecks} times).`,
        confidence: nextDayChecks >= 6 && nextDayDips / nextDayChecks > 0.5 ? 'high' : 'moderate',
        occurrences: nextDayDips,
      })
    }

    // ----- Summary -----
    const totalMedDays = Object.keys(adherenceByDate).length
    const totalAdherencePcts = timeline
      .filter(e => e.meds.taken.length + e.meds.missed.length > 0)
      .map(e => e.meds.adherence_pct)
    const avgAdherencePct = totalAdherencePcts.length > 0
      ? Math.round(avg(totalAdherencePcts))
      : 0

    const summary = {
      avg_adherence_pct: avgAdherencePct,
      avg_mood_on_full_adherence: moodScoresFullAdherence.length > 0
        ? scoreToLabel(avg(moodScoresFullAdherence))
        : null,
      avg_mood_on_partial_adherence: moodScoresPartialAdherence.length > 0
        ? scoreToLabel(avg(moodScoresPartialAdherence))
        : null,
      total_mood_entries: moodRows.length,
      total_med_days_logged: totalMedDays,
    }

    return NextResponse.json({
      kid_name: kidName,
      range_days: rangeDays,
      timeline,
      patterns,
      summary,
    })
  } catch (error: any) {
    console.error('med-mood-correlation error:', error)
    return NextResponse.json(
      { error: 'Failed to load med-mood correlation data' },
      { status: 500 }
    )
  }
}
