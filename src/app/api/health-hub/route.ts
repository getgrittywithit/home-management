import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// =============================================================================
// GET /api/health-hub?action=xxx
// =============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (!action) {
    return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 })
  }

  switch (action) {
    // ── List episodes filtered by status ──
    case 'get_episodes': {
      const status = searchParams.get('status') || 'active'
      try {
        const episodes = await db.query(
          `SELECT e.*,
                  COALESCE(
                    json_agg(
                      json_build_object('member_name', em.member_name, 'resolved_at', em.resolved_at)
                    ) FILTER (WHERE em.member_name IS NOT NULL),
                    '[]'
                  ) AS members
           FROM health_episodes e
           LEFT JOIN health_episode_members em ON em.episode_id = e.id
           WHERE e.status = $1
           GROUP BY e.id
           ORDER BY e.start_date DESC`,
          [status]
        )
        return NextResponse.json({ episodes })
      } catch (error) {
        console.error('get_episodes error:', error)
        return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 })
      }
    }

    // ── Single episode with members, meds, recent logs ──
    case 'get_episode': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })

      try {
        const episodes = await db.query(
          `SELECT * FROM health_episodes WHERE id = $1`,
          [id]
        )
        if (!episodes.length) {
          return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
        }
        const episode = episodes[0]

        let members: any[] = []
        try {
          members = await db.query(
            `SELECT * FROM health_episode_members WHERE episode_id = $1 ORDER BY member_name`,
            [id]
          )
        } catch (e) { console.error('get_episode members error:', e) }

        let meds: any[] = []
        try {
          meds = await db.query(
            `SELECT * FROM health_episode_meds WHERE episode_id = $1 ORDER BY start_date DESC`,
            [id]
          )
        } catch (e) { console.error('get_episode meds error:', e) }

        let recentLogs: any[] = []
        try {
          recentLogs = await db.query(
            `SELECT * FROM health_logs WHERE episode_id = $1 ORDER BY logged_at DESC LIMIT 50`,
            [id]
          )
        } catch (e) { console.error('get_episode logs error:', e) }

        return NextResponse.json({ episode, members, meds, recentLogs })
      } catch (error) {
        console.error('get_episode error:', error)
        return NextResponse.json({ error: 'Failed to fetch episode' }, { status: 500 })
      }
    }

    // ── Filtered health logs ──
    case 'get_health_logs': {
      const memberName = searchParams.get('member_name')
      const logType = searchParams.get('log_type')
      const limit = parseInt(searchParams.get('limit') || '20', 10)

      try {
        const conditions: string[] = []
        const params: any[] = []
        let idx = 1

        if (memberName) {
          conditions.push(`member_name = $${idx++}`)
          params.push(memberName)
        }
        if (logType) {
          conditions.push(`log_type = $${idx++}`)
          params.push(logType)
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
        params.push(limit)

        const logs = await db.query(
          `SELECT * FROM health_logs ${where} ORDER BY logged_at DESC LIMIT $${idx}`,
          params
        )
        return NextResponse.json({ logs })
      } catch (error) {
        console.error('get_health_logs error:', error)
        return NextResponse.json({ error: 'Failed to fetch health logs' }, { status: 500 })
      }
    }

    // ── All log types merged timeline ──
    case 'get_health_timeline': {
      const memberName = searchParams.get('member_name')
      const limit = parseInt(searchParams.get('limit') || '50', 10)

      try {
        const conditions: string[] = []
        const params: any[] = []
        let idx = 1

        if (memberName) {
          conditions.push(`member_name = $${idx++}`)
          params.push(memberName)
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
        params.push(limit)

        const timeline = await db.query(
          `SELECT * FROM health_logs ${where} ORDER BY logged_at DESC LIMIT $${idx}`,
          params
        )
        return NextResponse.json({ timeline })
      } catch (error) {
        console.error('get_health_timeline error:', error)
        return NextResponse.json({ error: 'Failed to fetch health timeline' }, { status: 500 })
      }
    }

    // ── Dental map for a person ──
    case 'get_dental_map': {
      const memberName = searchParams.get('member_name')
      if (!memberName) return NextResponse.json({ error: 'Missing member_name' }, { status: 400 })

      try {
        const teeth = await db.query(
          `SELECT * FROM health_dental_map WHERE member_name = $1 ORDER BY tooth_id`,
          [memberName]
        )
        return NextResponse.json({ teeth })
      } catch (error) {
        console.error('get_dental_map error:', error)
        return NextResponse.json({ error: 'Failed to fetch dental map' }, { status: 500 })
      }
    }

    // ── Active vitals schedules ──
    case 'get_vitals_schedule': {
      const memberName = searchParams.get('member_name')
      if (!memberName) return NextResponse.json({ error: 'Missing member_name' }, { status: 400 })

      try {
        const schedules = await db.query(
          `SELECT * FROM health_vitals_schedule
           WHERE member_name = $1 AND active = true
           ORDER BY vital_type`,
          [memberName]
        )
        return NextResponse.json({ schedules })
      } catch (error) {
        console.error('get_vitals_schedule error:', error)
        return NextResponse.json({ error: 'Failed to fetch vitals schedule' }, { status: 500 })
      }
    }

    // ── Overdue scheduled vitals across all members ──
    case 'get_overdue_vitals': {
      try {
        const overdue = await db.query(
          `SELECT * FROM health_vitals_schedule
           WHERE active = true
             AND last_logged_at + (frequency_days || ' days')::INTERVAL < NOW()
           ORDER BY member_name, vital_type`
        )
        return NextResponse.json({ overdue })
      } catch (error) {
        console.error('get_overdue_vitals error:', error)
        return NextResponse.json({ error: 'Failed to fetch overdue vitals' }, { status: 500 })
      }
    }

    // ── Adherence grid: dose logs for a specific med in a month ──
    case 'get_adherence_grid': {
      const memberName = searchParams.get('member_name')
      const medName = searchParams.get('med_name')
      const month = searchParams.get('month') // e.g. '2026-03'
      if (!memberName || !medName || !month) {
        return NextResponse.json({ error: 'Missing member_name, med_name, or month' }, { status: 400 })
      }

      try {
        const startDate = `${month}-01`
        // Use date arithmetic for end of month
        const logs = await db.query(
          `SELECT
             DATE(logged_at) AS day,
             json_agg(
               json_build_object(
                 'id', id,
                 'logged_at', logged_at,
                 'value_text', value_text,
                 'notes', notes
               ) ORDER BY logged_at
             ) AS doses
           FROM health_logs
           WHERE member_name = $1
             AND log_type = 'dose_log'
             AND value_text ILIKE '%' || $2 || '%'
             AND logged_at >= $3::DATE
             AND logged_at < ($3::DATE + INTERVAL '1 month')
           GROUP BY DATE(logged_at)
           ORDER BY day`,
          [memberName, medName, startDate]
        )
        return NextResponse.json({ grid: logs })
      } catch (error) {
        console.error('get_adherence_grid error:', error)
        return NextResponse.json({ error: 'Failed to fetch adherence grid' }, { status: 500 })
      }
    }

    // ── Dashboard: active episodes with latest temp/symptom per member ──
    case 'get_active_episode_summary': {
      try {
        const episodes = await db.query(
          `SELECT
             e.id, e.name, e.episode_type, e.start_date, e.notes,
             COALESCE(
               json_agg(
                 json_build_object(
                   'member_name', em.member_name,
                   'resolved_at', em.resolved_at
                 )
               ) FILTER (WHERE em.member_name IS NOT NULL),
               '[]'
             ) AS members
           FROM health_episodes e
           LEFT JOIN health_episode_members em ON em.episode_id = e.id
           WHERE e.status = 'active'
           GROUP BY e.id
           ORDER BY e.start_date DESC`
        )

        // For each active episode, fetch latest temp and symptom per member
        const summaries = []
        for (const ep of episodes) {
          let latestVitals: any[] = []
          try {
            latestVitals = await db.query(
              `SELECT DISTINCT ON (hl.member_name, hl.log_type)
                 hl.member_name, hl.log_type, hl.value_numeric, hl.value_text,
                 hl.value_unit, hl.logged_at
               FROM health_logs hl
               WHERE hl.episode_id = $1
                 AND hl.log_type IN ('temperature', 'symptom')
               ORDER BY hl.member_name, hl.log_type, hl.logged_at DESC`,
              [ep.id]
            )
          } catch (e) { console.error('get_active_episode_summary vitals error:', e) }

          summaries.push({ ...ep, latestVitals })
        }

        return NextResponse.json({ summaries })
      } catch (error) {
        console.error('get_active_episode_summary error:', error)
        return NextResponse.json({ error: 'Failed to fetch active episode summary' }, { status: 500 })
      }
    }

    // ── Family vitals summary: last 5 readings per member ──
    case 'get_family_vitals_summary': {
      const MEMBERS = ['Lola', 'Levi', 'Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah']
      const VITAL_TYPES = ['blood_pressure', 'heart_rate', 'o2_sat', 'temperature', 'weight', 'height']

      try {
        const allLogs = await db.query(
          `SELECT member_name, log_type, value_numeric, value_text,
                  value_systolic, value_diastolic, value_unit, logged_at, notes
           FROM health_logs
           WHERE log_type = ANY($1)
           ORDER BY logged_at DESC`,
          [VITAL_TYPES]
        )

        // Group by member, limit 5 per member
        const byMember: Record<string, any[]> = {}
        for (const m of MEMBERS) byMember[m] = []
        for (const log of allLogs) {
          const name = log.member_name
          if (byMember[name] && byMember[name].length < 5) {
            byMember[name].push(log)
          }
        }

        // Check for overdue vitals schedules
        let overdue: any[] = []
        try {
          overdue = await db.query(
            `SELECT member_name, vital_type, frequency_days, last_logged_at
             FROM health_vitals_schedule
             WHERE active = true
               AND last_logged_at + (frequency_days || ' days')::INTERVAL < NOW()`
          )
        } catch (e) { /* table may not exist */ }

        const overdueByMember: Record<string, string[]> = {}
        for (const o of overdue) {
          if (!overdueByMember[o.member_name]) overdueByMember[o.member_name] = []
          overdueByMember[o.member_name].push(o.vital_type)
        }

        const members = MEMBERS.map(name => ({
          name,
          recent_vitals: byMember[name],
          overdue_types: overdueByMember[name] || [],
        }))

        return NextResponse.json({ members })
      } catch (error) {
        console.error('get_family_vitals_summary error:', error)
        return NextResponse.json({ error: 'Failed to fetch family vitals summary' }, { status: 500 })
      }
    }

    // ── Single member vitals with optional filters ──
    case 'get_member_vitals': {
      const memberName = searchParams.get('member_name')
      if (!memberName) return NextResponse.json({ error: 'Missing member_name' }, { status: 400 })

      const logTypes = searchParams.get('log_types') // comma-separated: bp,hr,o2_sat
      const startDate = searchParams.get('start_date')
      const endDate = searchParams.get('end_date')
      const limit = parseInt(searchParams.get('limit') || '50', 10)

      const TYPE_MAP: Record<string, string> = {
        bp: 'blood_pressure', hr: 'heart_rate', o2: 'o2_sat',
        temp: 'temperature', weight: 'weight', height: 'height',
      }

      try {
        const conditions: string[] = ['member_name = $1']
        const params: any[] = [memberName]
        let idx = 2

        // Filter to vital types
        const vitalTypes = ['blood_pressure', 'heart_rate', 'o2_sat', 'temperature', 'weight', 'height']
        if (logTypes) {
          const mapped = logTypes.split(',').map(t => TYPE_MAP[t.trim()] || t.trim()).filter(Boolean)
          if (mapped.length) {
            conditions.push(`log_type = ANY($${idx++})`)
            params.push(mapped)
          }
        } else {
          conditions.push(`log_type = ANY($${idx++})`)
          params.push(vitalTypes)
        }

        if (startDate) {
          conditions.push(`logged_at >= $${idx++}::DATE`)
          params.push(startDate)
        }
        if (endDate) {
          conditions.push(`logged_at < ($${idx++}::DATE + INTERVAL '1 day')`)
          params.push(endDate)
        }

        params.push(limit)
        const where = conditions.join(' AND ')

        const logs = await db.query(
          `SELECT id, member_name, log_type, value_numeric, value_text,
                  value_systolic, value_diastolic, value_unit, logged_at, notes
           FROM health_logs
           WHERE ${where}
           ORDER BY logged_at DESC
           LIMIT $${idx}`,
          params
        )
        return NextResponse.json({ logs })
      } catch (error) {
        console.error('get_member_vitals error:', error)
        return NextResponse.json({ error: 'Failed to fetch member vitals' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  }
}

// =============================================================================
// POST /api/health-hub  { action, ...body }
// =============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body
  if (!action) {
    return NextResponse.json({ error: 'Missing action in request body' }, { status: 400 })
  }

  switch (action) {
    // ── Create episode + members ──
    case 'create_episode': {
      const { name, episode_type, member_names, start_date, notes } = body
      if (!name || !member_names?.length || !start_date) {
        return NextResponse.json(
          { error: 'name, member_names (array), and start_date are required' },
          { status: 400 }
        )
      }

      try {
        const epRows = await db.query(
          `INSERT INTO health_episodes (name, episode_type, start_date, notes, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING *`,
          [name, episode_type || 'illness', start_date, notes || null]
        )
        const episode = epRows[0]

        // Insert each member
        for (const mn of member_names) {
          try {
            await db.query(
              `INSERT INTO health_episode_members (episode_id, member_name)
               VALUES ($1, $2)`,
              [episode.id, mn]
            )
          } catch (e) {
            console.error(`create_episode member insert error for ${mn}:`, e)
          }
        }

        return NextResponse.json({ episode }, { status: 201 })
      } catch (error) {
        console.error('create_episode error:', error)
        return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 })
      }
    }

    // ── Add medication to an episode ──
    case 'add_episode_med': {
      const {
        episode_id, member_name, name, med_type, dose, frequency,
        duration_days, total_pills, start_date, reminder_times, notes
      } = body
      if (!episode_id || !member_name || !name || !start_date) {
        return NextResponse.json(
          { error: 'episode_id, member_name, name, and start_date are required' },
          { status: 400 }
        )
      }

      try {
        const endDateExpr = duration_days
          ? `$9::DATE + ($7 || ' days')::INTERVAL`
          : 'NULL'

        const med = await db.query(
          `INSERT INTO health_episode_meds
             (episode_id, member_name, name, med_type, dose, frequency,
              duration_days, total_pills, pills_remaining, start_date, end_date,
              reminder_times, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8,
                   $9, ${endDateExpr},
                   $10, $11, 'active')
           RETURNING *`,
          [
            episode_id, member_name, name, med_type || null,
            dose || null, frequency || null,
            duration_days || null, total_pills || null,
            start_date,
            reminder_times ? JSON.stringify(reminder_times) : null,
            notes || null
          ]
        )
        return NextResponse.json({ med: med[0] }, { status: 201 })
      } catch (error) {
        console.error('add_episode_med error:', error)
        return NextResponse.json({ error: 'Failed to add episode med' }, { status: 500 })
      }
    }

    // ── Resolve an episode ──
    case 'resolve_episode': {
      const { episode_id, end_date } = body
      if (!episode_id) {
        return NextResponse.json({ error: 'episode_id is required' }, { status: 400 })
      }

      try {
        const epRows = await db.query(
          `UPDATE health_episodes
           SET status = 'resolved', end_date = $2, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [episode_id, end_date || new Date().toISOString().split('T')[0]]
        )

        // Mark all active meds as completed
        try {
          await db.query(
            `UPDATE health_episode_meds
             SET status = 'completed', updated_at = NOW()
             WHERE episode_id = $1 AND status = 'active'`,
            [episode_id]
          )
        } catch (e) { console.error('resolve_episode meds update error:', e) }

        return NextResponse.json({ episode: epRows[0] })
      } catch (error) {
        console.error('resolve_episode error:', error)
        return NextResponse.json({ error: 'Failed to resolve episode' }, { status: 500 })
      }
    }

    // ── Add a health log entry ──
    case 'add_health_log': {
      const {
        member_name, log_type, value_numeric, value_systolic, value_diastolic,
        value_unit, value_site, value_tags, value_text, value_tooth_id,
        value_tooth_state, episode_id, episode_med_id, logged_at, notes
      } = body
      if (!member_name || !log_type) {
        return NextResponse.json(
          { error: 'member_name and log_type are required' },
          { status: 400 }
        )
      }

      try {
        const logRows = await db.query(
          `INSERT INTO health_logs
             (member_name, log_type, value_numeric, value_systolic, value_diastolic,
              value_unit, value_site, value_tags, value_text, value_tooth_id,
              value_tooth_state, episode_id, episode_med_id, logged_at, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                   COALESCE($14, NOW()), $15)
           RETURNING *`,
          [
            member_name, log_type,
            value_numeric ?? null, value_systolic ?? null, value_diastolic ?? null,
            value_unit || null, value_site || null,
            value_tags ? JSON.stringify(value_tags) : null,
            value_text || null, value_tooth_id || null,
            value_tooth_state || null, episode_id || null,
            episode_med_id || null, logged_at || null,
            notes || null
          ]
        )
        const log = logRows[0]

        // If this is a vital type and member has a vitals_schedule, update last_logged_at
        try {
          await db.query(
            `UPDATE health_vitals_schedule
             SET last_logged_at = $3, updated_at = NOW()
             WHERE member_name = $1 AND vital_type = $2 AND active = true`,
            [member_name, log_type, log.logged_at]
          )
        } catch (e) { console.error('add_health_log vitals_schedule update error:', e) }

        // If dose_log for an episode med, decrement pills_remaining
        if (log_type === 'dose_log' && episode_med_id) {
          try {
            await db.query(
              `UPDATE health_episode_meds
               SET pills_remaining = GREATEST(0, COALESCE(pills_remaining, 0) - 1),
                   updated_at = NOW()
               WHERE id = $1`,
              [episode_med_id]
            )
          } catch (e) { console.error('add_health_log pills_remaining decrement error:', e) }
        }

        return NextResponse.json({ log }, { status: 201 })
      } catch (error) {
        console.error('add_health_log error:', error)
        return NextResponse.json({ error: 'Failed to add health log' }, { status: 500 })
      }
    }

    // ── Update tooth state in dental map ──
    case 'update_tooth_state': {
      const { member_name, tooth_id, state } = body
      if (!member_name || !tooth_id || !state) {
        return NextResponse.json(
          { error: 'member_name, tooth_id, and state are required' },
          { status: 400 }
        )
      }

      try {
        // Upsert the dental map row and set date columns based on state
        const toothRows = await db.query(
          `INSERT INTO health_dental_map (member_name, tooth_id, state,
             date_wiggly, date_lost, date_came_in)
           VALUES ($1, $2, $3,
             CASE WHEN $3 = 'wiggly' THEN NOW() ELSE NULL END,
             CASE WHEN $3 = 'lost' THEN NOW() ELSE NULL END,
             CASE WHEN $3 = 'came_in' THEN NOW() ELSE NULL END)
           ON CONFLICT (member_name, tooth_id) DO UPDATE SET
             state = $3,
             date_wiggly = CASE WHEN $3 = 'wiggly' THEN NOW() ELSE health_dental_map.date_wiggly END,
             date_lost = CASE WHEN $3 = 'lost' THEN NOW() ELSE health_dental_map.date_lost END,
             date_came_in = CASE WHEN $3 = 'came_in' THEN NOW() ELSE health_dental_map.date_came_in END,
             updated_at = NOW()
           RETURNING *`,
          [member_name, tooth_id, state]
        )
        const tooth = toothRows[0]

        // Auto-create a health_log entry for the dental milestone
        let log = null
        try {
          const logRows = await db.query(
            `INSERT INTO health_logs
               (member_name, log_type, value_tooth_id, value_tooth_state,
                value_text, logged_at, notes)
             VALUES ($1, 'dental', $2, $3, $4, NOW(), $5)
             RETURNING *`,
            [
              member_name, tooth_id, state,
              `Tooth ${tooth_id} → ${state}`,
              `Dental milestone: tooth ${tooth_id} changed to ${state}`
            ]
          )
          log = logRows[0]
        } catch (e) { console.error('update_tooth_state log error:', e) }

        return NextResponse.json({ tooth, log })
      } catch (error) {
        console.error('update_tooth_state error:', error)
        return NextResponse.json({ error: 'Failed to update tooth state' }, { status: 500 })
      }
    }

    // ── Log a prescription dose (with pantry stock decrement) ──
    case 'log_prescription_dose': {
      const { member_name, med_name, status, taken_at, notes } = body
      if (!member_name || !med_name || !status) {
        return NextResponse.json(
          { error: 'member_name, med_name, and status are required' },
          { status: 400 }
        )
      }

      try {
        const logRows = await db.query(
          `INSERT INTO health_logs
             (member_name, log_type, value_text, logged_at, notes)
           VALUES ($1, 'dose_log', $2, COALESCE($3, NOW()), $4)
           RETURNING *`,
          [
            member_name,
            `${med_name}|${status}`,
            taken_at || null,
            notes || null
          ]
        )
        const log = logRows[0]

        // If taken or late, decrement pantry stock for the Rx item
        if (status === 'taken' || status === 'late') {
          try {
            await db.query(
              `UPDATE pantry_stock
               SET quantity = GREATEST(0, COALESCE(quantity, 0) - 1),
                   updated_at = NOW()
               WHERE id = (
                 SELECT id FROM pantry_stock
                 WHERE LOWER(name) LIKE LOWER('%' || $1 || '%')
                   AND is_rx = true
                 LIMIT 1
               )`,
              [med_name]
            )
          } catch (e) { console.error('log_prescription_dose pantry decrement error:', e) }
        }

        return NextResponse.json({ log }, { status: 201 })
      } catch (error) {
        console.error('log_prescription_dose error:', error)
        return NextResponse.json({ error: 'Failed to log prescription dose' }, { status: 500 })
      }
    }

    // ── Update pill count in pantry stock ──
    case 'update_pill_count': {
      const { member_name, med_name, current_count } = body
      if (!med_name || current_count === undefined) {
        return NextResponse.json(
          { error: 'med_name and current_count are required' },
          { status: 400 }
        )
      }

      try {
        const rows = await db.query(
          `UPDATE pantry_stock
           SET quantity = $1, updated_at = NOW()
           WHERE LOWER(name) LIKE LOWER('%' || $2 || '%')
             AND is_rx = true
           RETURNING *`,
          [current_count, med_name]
        )
        return NextResponse.json({ updated: rows })
      } catch (error) {
        console.error('update_pill_count error:', error)
        return NextResponse.json({ error: 'Failed to update pill count' }, { status: 500 })
      }
    }

    // ── Resolve a single member from an episode ──
    case 'resolve_episode_member': {
      const { episode_id, member_name } = body
      if (!episode_id || !member_name) {
        return NextResponse.json(
          { error: 'episode_id and member_name are required' },
          { status: 400 }
        )
      }

      try {
        const rows = await db.query(
          `UPDATE health_episode_members
           SET resolved_at = NOW()
           WHERE episode_id = $1 AND member_name = $2
           RETURNING *`,
          [episode_id, member_name]
        )
        if (!rows.length) {
          return NextResponse.json({ error: 'Episode member not found' }, { status: 404 })
        }
        return NextResponse.json({ member: rows[0] })
      } catch (error) {
        console.error('resolve_episode_member error:', error)
        return NextResponse.json({ error: 'Failed to resolve episode member' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
