import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // ── S7: Get feedback prompt for a kid ──
    // Item 2.2 (PR2): the prompt previously queried only `meal_requests`
    // (the kid-suggested-meal-with-approval flow), which is largely
    // unused day-to-day. The actual dinner plan lives in `meal_week_plan`.
    // Now: try `meal_requests` first (legacy, in case it's used) and
    // fall back to `meal_week_plan` when there's no approved request for
    // today. Either path returns a prompt the kid can rate.
    if (action === 'get_prompt') {
      const kid = searchParams.get('kid')
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })

      try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

        // Path A: legacy meal_requests path
        const requestRows = await db.query(
          `SELECT mr.id as meal_request_id, ml.name as meal_name, ml.id as meal_id, mr.assigned_date as request_date
           FROM meal_requests mr
           LEFT JOIN meal_library ml ON ml.id = mr.meal_id
           WHERE mr.assigned_date = $1
             AND mr.status = 'approved'
             AND mr.id NOT IN (
               SELECT mf.meal_request_id FROM meal_feedback mf
               WHERE mf.kid_name = $2 AND mf.meal_request_id IS NOT NULL
             )
           ORDER BY mr.created_at DESC
           LIMIT 1`,
          [today, kid]
        )

        if (requestRows.length > 0) {
          return NextResponse.json({
            prompt: {
              meal_name: requestRows[0].meal_name,
              meal_id: requestRows[0].meal_id,
              meal_request_id: requestRows[0].meal_request_id,
              date: requestRows[0].request_date?.toString().split('T')[0] || today,
            }
          })
        }

        // Path B: meal_week_plan fallback. Compute Chicago-local Monday
        // of this week and the day_of_week (0=Mon..6=Sun) for today.
        const todayD = new Date(today + 'T12:00:00')
        const dow = (todayD.getDay() + 6) % 7  // 0=Mon..6=Sun
        const monday = new Date(todayD)
        monday.setDate(todayD.getDate() - dow)
        const weekStart = monday.toLocaleDateString('en-CA')

        const planRows = await db.query(
          `SELECT mwp.meal_id, ml.name as meal_name
           FROM meal_week_plan mwp
           LEFT JOIN meal_library ml ON ml.id = mwp.meal_id
           WHERE mwp.week_start = $1::date
             AND mwp.day_of_week = $2
             AND mwp.meal_id IS NOT NULL
             AND mwp.status NOT IN ('off_night', 'skipped')
             AND mwp.meal_id NOT IN (
               SELECT mf.meal_id FROM meal_feedback mf
               WHERE mf.kid_name = $3 AND mf.meal_date = $4 AND mf.meal_id IS NOT NULL
             )
           ORDER BY mwp.created_at DESC
           LIMIT 1`,
          [weekStart, dow, kid, today]
        )

        if (planRows.length === 0) {
          return NextResponse.json({ prompt: null, debug: { source: 'no-match', today, weekStart, dow } })
        }

        return NextResponse.json({
          prompt: {
            meal_name: planRows[0].meal_name,
            meal_id: planRows[0].meal_id,
            meal_request_id: null,
            date: today,
            source: 'meal_week_plan',
          }
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ prompt: null })
        }
        console.error('feedback get_prompt error:', err)
        throw err
      }
    }

    // ── S7: Ratings for a specific meal ──
    if (action === 'meal_ratings') {
      const mealId = searchParams.get('meal_id')
      if (!mealId) return NextResponse.json({ error: 'meal_id required' }, { status: 400 })

      try {
        const ratings = await db.query(
          `SELECT mf.kid_name, mf.rating, mf.tags, mf.free_text, mf.meal_date, mf.created_at
           FROM meal_feedback mf
           WHERE mf.meal_id = $1
           ORDER BY mf.created_at DESC`,
          [mealId]
        )

        // Calculate aggregates
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / ratings.length) * 10) / 10
          : 0

        // Count tags
        const tagCounts: Record<string, number> = {}
        for (const r of ratings) {
          const tags = Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : [])
          for (const t of tags) {
            tagCounts[t] = (tagCounts[t] || 0) + 1
          }
        }

        return NextResponse.json({
          ratings,
          avg_rating: avgRating,
          tag_counts: tagCounts,
          total: ratings.length,
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ ratings: [], avg_rating: 0, tag_counts: {}, total: 0 })
        }
        throw err
      }
    }

    // ── S7: Full analytics ──
    if (action === 'analytics') {
      try {
        // Top rated meals
        const topRated = await db.query(
          `SELECT mf.meal_id, ml.name as meal_name, ml.theme,
                  ROUND(AVG(mf.rating)::numeric, 1) as avg_rating,
                  COUNT(*)::int as rating_count
           FROM meal_feedback mf
           LEFT JOIN meal_library ml ON ml.id = mf.meal_id
           WHERE mf.meal_id IS NOT NULL
           GROUP BY mf.meal_id, ml.name, ml.theme
           ORDER BY avg_rating DESC, rating_count DESC
           LIMIT 10`
        )

        // Needs attention (below 2.5)
        const needsAttention = await db.query(
          `SELECT mf.meal_id, ml.name as meal_name, ml.theme,
                  ROUND(AVG(mf.rating)::numeric, 1) as avg_rating,
                  COUNT(*)::int as rating_count
           FROM meal_feedback mf
           LEFT JOIN meal_library ml ON ml.id = mf.meal_id
           WHERE mf.meal_id IS NOT NULL
           GROUP BY mf.meal_id, ml.name, ml.theme
           HAVING AVG(mf.rating) < 2.5
           ORDER BY avg_rating ASC
           LIMIT 10`
        )

        // Per-kid patterns
        const kidPatterns = await db.query(
          `SELECT mf.kid_name,
                  ROUND(AVG(mf.rating)::numeric, 1) as avg_rating,
                  COUNT(*)::int as total_ratings,
                  (SELECT array_agg(DISTINCT tag) FROM (
                    SELECT unnest(
                      CASE WHEN mf2.tags IS NULL THEN ARRAY[]::text[]
                           ELSE mf2.tags::text[]
                      END
                    ) as tag
                    FROM meal_feedback mf2
                    WHERE mf2.kid_name = mf.kid_name
                    LIMIT 20
                  ) sub) as top_tags
           FROM meal_feedback mf
           GROUP BY mf.kid_name
           ORDER BY mf.kid_name`
        )

        // Per-kid low-rated meals
        const kidLowRated = await db.query(
          `SELECT mf.kid_name, ml.name as meal_name, ROUND(AVG(mf.rating)::numeric, 1) as avg_rating
           FROM meal_feedback mf
           LEFT JOIN meal_library ml ON ml.id = mf.meal_id
           WHERE mf.meal_id IS NOT NULL
           GROUP BY mf.kid_name, ml.name
           HAVING AVG(mf.rating) <= 2 AND COUNT(*) >= 2
           ORDER BY mf.kid_name, avg_rating ASC`
        )

        // Group low-rated by kid
        const lowByKid: Record<string, any[]> = {}
        for (const row of kidLowRated) {
          if (!lowByKid[row.kid_name]) lowByKid[row.kid_name] = []
          lowByKid[row.kid_name].push({ meal_name: row.meal_name, avg_rating: parseFloat(row.avg_rating) })
        }

        return NextResponse.json({
          top_rated: topRated,
          needs_attention: needsAttention,
          kid_patterns: kidPatterns.map((k: any) => ({
            ...k,
            low_rated_meals: lowByKid[k.kid_name] || [],
          })),
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ top_rated: [], needs_attention: [], kid_patterns: [] })
        }
        throw err
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Feedback GET error:', error)
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'submit') {
      const { meal_id, meal_request_id, kid_name, rating, tags, free_text, meal_date } = body

      // Item 2.2 (PR2): meal_request_id is no longer required — ratings
      // sourced from meal_week_plan have no request id. Need EITHER a
      // request id OR a meal id so the rating is tied to something.
      if (!kid_name || !rating || (!meal_request_id && !meal_id)) {
        return NextResponse.json({ error: 'kid_name, rating, and (meal_request_id or meal_id) required' }, { status: 400 })
      }

      try {
        await db.query(
          `INSERT INTO meal_feedback (meal_id, meal_request_id, kid_name, rating, tags, free_text, meal_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            meal_id || null,
            meal_request_id || null,
            kid_name,
            rating,
            tags ? JSON.stringify(tags) : '[]',
            free_text || null,
            meal_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
          ]
        )
        // NOTIFY-FIX-1b #2: Notify parent if meal rating ≤1
        if (rating <= 1) {
          const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
          await createNotification({
            title: `${kidDisplay} didn't like dinner`,
            message: free_text ? `"${free_text.substring(0, 80)}"` : 'Left a low rating',
            source_type: 'meal_feedback_low', source_ref: `meal-feedback-${kid_name}-${Date.now()}`,
            link_tab: 'meals', icon: '🍽️',
          }).catch(e => console.error('Meal feedback notify failed:', e.message))
        }

        // NOTIFY-FIX-1c #12: Meal feedback daily digest (after 8 PM, once per day)
        try {
          const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
          const feedbackDate = meal_date || new Date().toISOString().split('T')[0]
          if (now.getHours() >= 20) {
            // Check if digest already sent today
            const existing = await db.query(
              `SELECT 1 FROM notifications WHERE source_type = 'meal_digest' AND source_ref = $1 LIMIT 1`,
              [`meal-digest-${feedbackDate}`]
            ).catch(() => [])
            if (existing.length === 0) {
              // Count today's feedback
              const feedbackCount = await db.query(
                `SELECT COUNT(DISTINCT kid_name)::int as count FROM meal_feedback WHERE meal_date = $1`,
                [feedbackDate]
              ).catch(() => [])
              const count = feedbackCount[0]?.count || 0
              if (count > 0) {
                await createNotification({
                  title: `${count} kid${count > 1 ? 's' : ''} left dinner feedback tonight`,
                  message: 'Check meal ratings in Food & Meals',
                  source_type: 'meal_digest', source_ref: `meal-digest-${feedbackDate}`,
                  link_tab: 'food-meals', icon: '🍽️',
                })
              }
            }
          }
        } catch (e: any) { console.error('Meal digest check failed:', e.message) }

        return NextResponse.json({ success: true })
      } catch (err: any) {
        // Auto-create table if it doesn't exist
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          await db.query(`
            CREATE TABLE IF NOT EXISTS meal_feedback (
              id SERIAL PRIMARY KEY,
              meal_id INTEGER,
              meal_request_id INTEGER NOT NULL,
              kid_name TEXT NOT NULL,
              rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 4),
              tags JSONB DEFAULT '[]',
              free_text TEXT,
              meal_date DATE,
              created_at TIMESTAMPTZ DEFAULT NOW()
            )
          `)
          await db.query(
            `INSERT INTO meal_feedback (meal_id, meal_request_id, kid_name, rating, tags, free_text, meal_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              meal_id || null,
              meal_request_id,
              kid_name,
              rating,
              tags ? JSON.stringify(tags) : '[]',
              free_text || null,
              meal_date || new Date().toISOString().split('T')[0],
            ]
          )
          return NextResponse.json({ success: true })
        }
        throw err
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Feedback POST error:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
