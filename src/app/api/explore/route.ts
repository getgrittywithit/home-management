import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const TAG_RULES: Record<string, string[]> = {
  art: ['art', 'paint', 'draw', 'craft', 'pottery', 'creative', 'design', 'sculpture'],
  theater: ['theater', 'theatre', 'play', 'performance', 'drama', 'musical', 'audition', 'starcatcher'],
  music: ['music', 'concert', 'band', 'choir', 'orchestra', 'recital', 'sing'],
  science: ['science', 'stem', 'lab', 'experiment', 'biology', 'chemistry', 'physics', 'astronomy', 'space', 'stars', 'planet'],
  reading: ['reading', 'book', 'library', 'author', 'story', 'literacy'],
  history: ['history', 'museum', 'heritage', 'culture', 'cultural'],
  geography: ['geography', 'map', 'world', 'country', 'travel', 'global'],
  outdoors: ['park', 'hike', 'trail', 'nature', 'garden', 'plant', 'wildlife', 'bird', 'outdoor'],
  sports: ['sports', 'game', 'tournament', 'basketball', 'football', 'baseball', 'soccer', 'track', 'cheer'],
  community: ['community', 'volunteer', 'service', 'fundraiser', 'festival', 'fair', 'market', 'carnival'],
  food: ['food', 'cooking', 'bake', 'bbq', 'burger', 'lunch', 'dinner', 'taste', 'recipe'],
  jrotc: ['jrotc', 'military', 'veteran', 'rotc', 'drill', 'color guard'],
  career: ['career', 'job', 'workforce', 'pitch', 'entrepreneur', 'business', 'trade', 'construction'],
  technology: ['tech', 'code', 'coding', 'computer', 'robot', 'maker', 'minecraft', 'game dev'],
}

function autoTagEvent(title: string, description: string | null): string[] {
  const text = `${title} ${description || ''}`.toLowerCase()
  const tags: string[] = []
  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    if (keywords.some(kw => text.includes(kw))) tags.push(tag)
  }
  return tags
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_events'
  const kidName = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_events') {
      const period = searchParams.get('period') || 'week'
      const category = searchParams.get('category')
      const forMe = searchParams.get('for_me') === '1' && kidName

      let dateFilter = ''
      if (period === 'today') dateFilter = `AND start_time::date = CURRENT_DATE`
      else if (period === 'weekend') dateFilter = `AND EXTRACT(DOW FROM start_time) IN (0, 6) AND start_time >= CURRENT_DATE AND start_time < CURRENT_DATE + 7`
      else if (period === 'week') dateFilter = `AND start_time >= CURRENT_DATE AND start_time < CURRENT_DATE + 7`
      else if (period === 'month') dateFilter = `AND start_time >= CURRENT_DATE AND start_time < CURRENT_DATE + 30`

      let catFilter = ''
      const params: any[] = []
      if (category) { params.push(category); catFilter = ` AND category = $${params.length}` }

      const events = await db.query(
        `SELECT id, title, description, start_time, end_time, location, calendar_name, all_day, category, tags
           FROM calendar_events_cache
          WHERE kid_visible = TRUE AND start_time >= CURRENT_DATE
            ${dateFilter} ${catFilter}
          ORDER BY start_time
          LIMIT 50`,
        params
      ).catch(() => [])

      // Auto-tag events missing tags
      for (const e of events) {
        if (!e.tags || e.tags.length === 0) {
          const newTags = autoTagEvent(e.title || '', e.description || '')
          if (newTags.length > 0) {
            e.tags = newTags
            await db.query(
              `UPDATE calendar_events_cache SET tags = $1 WHERE id = $2`,
              [newTags, e.id]
            ).catch(() => {})
          }
        }
      }

      // Vibe matching if kid specified
      let recommended: any[] = []
      if (forMe && kidName) {
        const kidTags = await db.query(
          `SELECT tag, weight FROM kid_interest_tags WHERE kid_name = $1`, [kidName]
        ).catch(() => [])

        const tagMap = new Map<string, number>()
        for (const t of kidTags) tagMap.set(t.tag, t.weight)

        const scored = events.map((e: any) => {
          let score = 0
          for (const tag of (e.tags || [])) {
            if (tagMap.has(tag)) score += tagMap.get(tag)!
          }
          return { ...e, vibe_score: score }
        })

        recommended = scored.filter((e: any) => e.vibe_score > 0).sort((a: any, b: any) => b.vibe_score - a.vibe_score)
      }

      // Check which events the kid has already requested
      let requestedIds: Set<string> = new Set()
      if (kidName) {
        const reqs = await db.query(
          `SELECT event_title FROM kid_calendar_requests WHERE kid_name = $1 AND status != 'denied'`, [kidName]
        ).catch(() => [])
        for (const r of reqs) requestedIds.add(r.event_title)
      }

      const withRequestStatus = events.map((e: any) => ({
        ...e,
        already_requested: requestedIds.has(e.title),
      }))

      return NextResponse.json({
        events: withRequestStatus,
        recommended,
        total: events.length,
      })
    }

    if (action === 'get_interests') {
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT tag, weight, source FROM kid_interest_tags WHERE kid_name = $1 ORDER BY weight DESC`, [kidName]
      ).catch(() => [])
      return NextResponse.json({ interests: rows })
    }

    if (action === 'get_requests') {
      const status = searchParams.get('status') || 'pending'
      let sql = `SELECT * FROM kid_calendar_requests`
      const params: any[] = []
      if (kidName) { params.push(kidName); sql += ` WHERE kid_name = $${params.length}` }
      if (status !== 'all') {
        sql += (params.length > 0 ? ' AND' : ' WHERE') + ` status = $${params.length + 1}`
        params.push(status)
      }
      sql += ` ORDER BY created_at DESC LIMIT 20`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ requests: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Explore GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'request_event': {
        const { kid_name, event_title, event_date, event_time, location, notes } = body
        if (!kid_name || !event_title) return NextResponse.json({ error: 'kid_name + event_title required' }, { status: 400 })
        const kid = kid_name.toLowerCase()

        const rows = await db.query(
          `INSERT INTO kid_calendar_requests (kid_name, event_title, event_date, event_time, location, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
          [kid, event_title, event_date || null, event_time || null, location || null, notes || null]
        )

        await createNotification({
          title: `${cap(kid)} wants to go to "${event_title}"`,
          message: `${event_date ? new Date(event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date TBD'}${location ? ' · ' + location : ''}`,
          source_type: 'event_request', source_ref: `event-req:${rows[0]?.id}`,
          icon: '🎯', link_tab: 'calendar',
        }).catch(() => {})

        return NextResponse.json({ request: rows[0] }, { status: 201 })
      }

      case 'respond_request': {
        const { id, status, parent_note } = body
        if (!id || !status) return NextResponse.json({ error: 'id + status required' }, { status: 400 })

        const rows = await db.query(
          `UPDATE kid_calendar_requests SET status = $2, notes = COALESCE($3, notes) WHERE id = $1 RETURNING *`, [id, status, parent_note || null]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

        const r = rows[0]
        const msgs: Record<string, { title: string; msg: string; icon: string }> = {
          approved: { title: 'You can go! 🎉', msg: `Mom said yes to "${r.event_title}"!`, icon: '✅' },
          denied: { title: 'Not this time', msg: parent_note || `"${r.event_title}" isn't going to work out.`, icon: '❌' },
          saved: { title: 'Maybe later', msg: `"${r.event_title}" saved for review.`, icon: '📌' },
        }
        const m = msgs[status]
        if (m && r.kid_name) {
          await createNotification({
            title: m.title, message: m.msg, source_type: 'event_response',
            icon: m.icon, target_role: 'kid', kid_name: r.kid_name,
          }).catch(() => {})
        }

        return NextResponse.json({ request: rows[0] })
      }

      case 'update_interests': {
        const { kid_name, tags } = body
        if (!kid_name || !tags) return NextResponse.json({ error: 'kid_name + tags required' }, { status: 400 })
        const kid = kid_name.toLowerCase()

        await db.query(`DELETE FROM kid_interest_tags WHERE kid_name = $1 AND source = 'self'`, [kid])
        for (const tag of tags) {
          await db.query(
            `INSERT INTO kid_interest_tags (kid_name, tag, weight, source) VALUES ($1, $2, 1.0, 'self') ON CONFLICT (kid_name, tag) DO UPDATE SET weight = GREATEST(kid_interest_tags.weight, 1.0)`,
            [kid, tag]
          ).catch(() => {})
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Explore POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
