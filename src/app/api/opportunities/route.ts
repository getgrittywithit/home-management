import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// GET /api/opportunities?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // list — all active non-archived opportunities with kid save status
    // ------------------------------------------------------------------
    case 'list': {
      const kidName = searchParams.get('kid_name')
      const category = searchParams.get('category')
      const offset = parseInt(searchParams.get('offset') || '0', 10)
      const limit = parseInt(searchParams.get('limit') || '20', 10)

      try {
        // Get kid's grade number for filtering
        let kidGrade: number | null = null
        if (kidName) {
          const profiles = await db.query(
            `SELECT grade FROM student_profiles WHERE LOWER(kid_name) = LOWER($1) LIMIT 1`,
            [kidName]
          )
          if (profiles[0]?.grade) {
            const match = String(profiles[0].grade).match(/(\d+)/)
            kidGrade = match ? parseInt(match[1], 10) : null
          }
        }

        const params: any[] = []
        let paramIdx = 0

        let sql = `
          SELECT
            o.*,
            ${kidName ? `ks.id AS save_id, ks.status AS save_status, ks.notes AS kid_notes, ks.parent_notes,` : ''}
            CASE
              WHEN o.deadline IS NULL OR o.deadline_type IN ('rolling','tbd') THEN NULL
              ELSE (o.deadline::date - CURRENT_DATE)
            END AS days_until_deadline,
            CASE
              WHEN o.deadline IS NULL OR o.deadline_type IN ('rolling','tbd') THEN 'none'
              WHEN (o.deadline::date - CURRENT_DATE) <= 3 THEN 'urgent'
              WHEN (o.deadline::date - CURRENT_DATE) <= 7 THEN 'high'
              WHEN (o.deadline::date - CURRENT_DATE) <= 30 THEN 'medium'
              ELSE 'low'
            END AS urgency_level
          FROM opportunities o
        `

        if (kidName) {
          paramIdx++
          sql += ` LEFT JOIN kid_opportunity_saves ks ON ks.opportunity_id = o.id AND LOWER(ks.kid_name) = LOWER($${paramIdx})`
          params.push(kidName)
        }

        sql += ` WHERE o.is_active = true AND o.is_archived = false`

        if (category) {
          paramIdx++
          sql += ` AND o.category = $${paramIdx}`
          params.push(category)
        }

        if (kidGrade !== null) {
          paramIdx++
          sql += ` AND (o.grade_min IS NULL OR o.grade_min <= $${paramIdx})`
          params.push(kidGrade)
          paramIdx++
          sql += ` AND (o.grade_max IS NULL OR o.grade_max >= $${paramIdx})`
          params.push(kidGrade)
        }

        sql += ` ORDER BY
          CASE WHEN o.deadline IS NOT NULL AND o.deadline_type NOT IN ('rolling','tbd') THEN 0 ELSE 1 END,
          o.deadline ASC NULLS LAST,
          o.created_at DESC
        `

        paramIdx++
        sql += ` LIMIT $${paramIdx}`
        params.push(limit)

        paramIdx++
        sql += ` OFFSET $${paramIdx}`
        params.push(offset)

        const opportunities = await db.query(sql, params)
        return NextResponse.json({ opportunities, kid_grade: kidGrade })
      } catch (error) {
        console.error('list opportunities error:', error)
        return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // parent_overview — summary for each kid
    // ------------------------------------------------------------------
    case 'parent_overview': {
      try {
        const statusCounts = await db.query(`
          SELECT
            ks.kid_name,
            ks.status,
            COUNT(*)::int AS cnt
          FROM kid_opportunity_saves ks
          GROUP BY ks.kid_name, ks.status
          ORDER BY ks.kid_name, ks.status
        `)

        const nextDeadlines = await db.query(`
          SELECT DISTINCT ON (ks.kid_name)
            ks.kid_name,
            o.title AS next_deadline_title,
            o.deadline AS next_deadline,
            ks.status
          FROM kid_opportunity_saves ks
          JOIN opportunities o ON o.id = ks.opportunity_id
          WHERE o.deadline IS NOT NULL
            AND o.deadline::date >= CURRENT_DATE
            AND o.deadline_type NOT IN ('rolling','tbd')
            AND ks.status NOT IN ('withdrawn','completed')
          ORDER BY ks.kid_name, o.deadline ASC
        `)

        const recentActivity = await db.query(`
          SELECT
            ks.kid_name,
            o.title,
            ks.status,
            ks.updated_at
          FROM kid_opportunity_saves ks
          JOIN opportunities o ON o.id = ks.opportunity_id
          ORDER BY ks.updated_at DESC
          LIMIT 20
        `)

        // Build per-kid overview
        const kidMap: Record<string, any> = {}

        for (const row of statusCounts) {
          const k = row.kid_name
          if (!kidMap[k]) kidMap[k] = { kid_name: k, status_counts: {}, next_deadline: null, next_deadline_title: null, recent: [] }
          kidMap[k].status_counts[row.status] = row.cnt
        }

        for (const row of nextDeadlines) {
          if (!kidMap[row.kid_name]) kidMap[row.kid_name] = { kid_name: row.kid_name, status_counts: {}, next_deadline: null, next_deadline_title: null, recent: [] }
          kidMap[row.kid_name].next_deadline = row.next_deadline
          kidMap[row.kid_name].next_deadline_title = row.next_deadline_title
        }

        for (const row of recentActivity) {
          if (!kidMap[row.kid_name]) kidMap[row.kid_name] = { kid_name: row.kid_name, status_counts: {}, next_deadline: null, next_deadline_title: null, recent: [] }
          if (kidMap[row.kid_name].recent.length < 3) {
            kidMap[row.kid_name].recent.push({ title: row.title, status: row.status, updated_at: row.updated_at })
          }
        }

        return NextResponse.json({ overview: Object.values(kidMap) })
      } catch (error) {
        console.error('parent_overview error:', error)
        return NextResponse.json({ error: 'Failed to load parent overview' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_all_opportunities — master list for parent
    // ------------------------------------------------------------------
    case 'get_all_opportunities': {
      const includeArchived = searchParams.get('include_archived') === 'true'

      try {
        let sql = `
          SELECT
            o.*,
            COALESCE(sc.save_count, 0)::int AS save_count,
            sc.kid_names
          FROM opportunities o
          LEFT JOIN (
            SELECT
              opportunity_id,
              COUNT(*)::int AS save_count,
              ARRAY_AGG(kid_name) AS kid_names
            FROM kid_opportunity_saves
            WHERE status != 'withdrawn'
            GROUP BY opportunity_id
          ) sc ON sc.opportunity_id = o.id
        `

        if (!includeArchived) {
          sql += ` WHERE o.is_archived = false`
        }

        sql += ` ORDER BY o.is_archived ASC, o.created_at DESC`

        const opportunities = await db.query(sql)
        return NextResponse.json({ opportunities })
      } catch (error) {
        console.error('get_all_opportunities error:', error)
        return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_activity — all saves for one kid with opportunity details
    // ------------------------------------------------------------------
    case 'get_kid_activity': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const saves = await db.query(`
          SELECT
            ks.*,
            o.title, o.description, o.category, o.deadline, o.deadline_type,
            o.application_url, o.sponsor_org, o.award_description,
            o.grade_min, o.grade_max, o.is_active
          FROM kid_opportunity_saves ks
          JOIN opportunities o ON o.id = ks.opportunity_id
          WHERE LOWER(ks.kid_name) = LOWER($1)
          ORDER BY ks.updated_at DESC
        `, [kidName])
        return NextResponse.json({ saves })
      } catch (error) {
        console.error('get_kid_activity error:', error)
        return NextResponse.json({ error: 'Failed to load kid activity' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  }
}

// ============================================================================
// POST /api/opportunities  { action, ...body }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, ...data } = body

  switch (action) {
    // ------------------------------------------------------------------
    // save_opportunity — kid saves an opportunity
    // ------------------------------------------------------------------
    case 'save_opportunity': {
      const { kid_name, opportunity_id } = data
      if (!kid_name || !opportunity_id) {
        return NextResponse.json({ error: 'kid_name and opportunity_id required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `INSERT INTO kid_opportunity_saves (kid_name, opportunity_id, status, status_updated_at)
           VALUES ($1, $2, 'saved', NOW())
           ON CONFLICT (kid_name, opportunity_id)
           DO UPDATE SET status = 'saved', status_updated_at = NOW(), updated_at = NOW()
           WHERE kid_opportunity_saves.status = 'withdrawn'
           RETURNING *`,
          [kid_name, opportunity_id]
        )

        // If no rows returned, it was already saved (not withdrawn)
        if (!result[0]) {
          // Check if it already exists
          const existing = await db.query(
            `SELECT * FROM kid_opportunity_saves WHERE LOWER(kid_name) = LOWER($1) AND opportunity_id = $2`,
            [kid_name, opportunity_id]
          )
          if (existing[0]) {
            return NextResponse.json({ save: existing[0], already_saved: true })
          }
          // Actually insert fresh
          const fresh = await db.query(
            `INSERT INTO kid_opportunity_saves (kid_name, opportunity_id, status, status_updated_at)
             VALUES ($1, $2, 'saved', NOW())
             ON CONFLICT (kid_name, opportunity_id) DO NOTHING
             RETURNING *`,
            [kid_name, opportunity_id]
          )
          return NextResponse.json({ save: fresh[0] || null, already_saved: !fresh[0] }, { status: 201 })
        }

        // Log status change
        await db.query(
          `INSERT INTO opportunity_status_log (save_id, old_status, new_status, changed_by, note, changed_at)
           VALUES ($1, 'withdrawn', 'saved', $2, 'Re-saved opportunity', NOW())`,
          [result[0].id, kid_name]
        ).catch(() => {})

        return NextResponse.json({ save: result[0] }, { status: 201 })
      } catch (error) {
        console.error('save_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to save opportunity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_status — update status of a saved opportunity
    // ------------------------------------------------------------------
    case 'update_status': {
      const { kid_name, opportunity_id, new_status, note } = data
      if (!kid_name || !opportunity_id || !new_status) {
        return NextResponse.json({ error: 'kid_name, opportunity_id, and new_status required' }, { status: 400 })
      }

      try {
        // Get current save
        const current = await db.query(
          `SELECT * FROM kid_opportunity_saves WHERE LOWER(kid_name) = LOWER($1) AND opportunity_id = $2`,
          [kid_name, opportunity_id]
        )
        if (!current[0]) return NextResponse.json({ error: 'Save not found' }, { status: 404 })

        const oldStatus = current[0].status

        const result = await db.query(
          `UPDATE kid_opportunity_saves
           SET status = $3, status_updated_at = NOW(), updated_at = NOW()
           WHERE LOWER(kid_name) = LOWER($1) AND opportunity_id = $2
           RETURNING *`,
          [kid_name, opportunity_id, new_status]
        )

        // Log status change
        await db.query(
          `INSERT INTO opportunity_status_log (save_id, old_status, new_status, changed_by, note, changed_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [current[0].id, oldStatus, new_status, kid_name, note || null]
        ).catch(() => {})

        return NextResponse.json({ save: result[0] })
      } catch (error) {
        console.error('update_status error:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // add_opportunity — parent adds an opportunity
    // ------------------------------------------------------------------
    case 'add_opportunity': {
      const { title, description, category, grade_min, grade_max, deadline, deadline_type, application_url, sponsor_org, award_description, notes } = data
      if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

      try {
        const result = await db.query(
          `INSERT INTO opportunities
             (title, description, category, grade_min, grade_max, deadline, deadline_type,
              application_url, sponsor_org, award_description, notes, is_active, is_archived, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, false, 'parent')
           RETURNING *`,
          [
            title,
            description || null,
            category || 'competition',
            grade_min != null ? grade_min : null,
            grade_max != null ? grade_max : null,
            deadline || null,
            deadline_type || 'fixed',
            application_url || null,
            sponsor_org || null,
            award_description || null,
            notes || null,
          ]
        )
        return NextResponse.json({ opportunity: result[0] }, { status: 201 })
      } catch (error) {
        console.error('add_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to add opportunity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // edit_opportunity — parent edits an opportunity
    // ------------------------------------------------------------------
    case 'edit_opportunity': {
      const { opportunity_id, ...fields } = data
      if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

      try {
        const allowedFields = ['title', 'description', 'category', 'grade_min', 'grade_max', 'deadline', 'deadline_type', 'application_url', 'sponsor_org', 'award_description', 'notes', 'is_active']
        const setClauses: string[] = []
        const params: any[] = [opportunity_id]
        let idx = 1

        for (const field of allowedFields) {
          if (field in fields) {
            idx++
            setClauses.push(`${field} = $${idx}`)
            params.push(fields[field] ?? null)
          }
        }

        if (setClauses.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

        setClauses.push('updated_at = NOW()')

        const result = await db.query(
          `UPDATE opportunities SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        if (!result[0]) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
        return NextResponse.json({ opportunity: result[0] })
      } catch (error) {
        console.error('edit_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to edit opportunity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // archive_opportunity
    // ------------------------------------------------------------------
    case 'archive_opportunity': {
      const { opportunity_id } = data
      if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE opportunities SET is_archived = true, is_active = false, archived_at = NOW(), updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [opportunity_id]
        )
        if (!result[0]) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
        return NextResponse.json({ opportunity: result[0] })
      } catch (error) {
        console.error('archive_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to archive opportunity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // restore_opportunity
    // ------------------------------------------------------------------
    case 'restore_opportunity': {
      const { opportunity_id } = data
      if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE opportunities SET is_archived = false, is_active = true, archived_at = NULL, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [opportunity_id]
        )
        if (!result[0]) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
        return NextResponse.json({ opportunity: result[0] })
      } catch (error) {
        console.error('restore_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to restore opportunity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // parent_add_note — parent adds a note to a kid's save
    // ------------------------------------------------------------------
    case 'parent_add_note': {
      const { kid_name, opportunity_id, note } = data
      if (!kid_name || !opportunity_id) {
        return NextResponse.json({ error: 'kid_name and opportunity_id required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `UPDATE kid_opportunity_saves
           SET parent_notes = $3, updated_at = NOW()
           WHERE LOWER(kid_name) = LOWER($1) AND opportunity_id = $2
           RETURNING *`,
          [kid_name, opportunity_id, note || null]
        )
        if (!result[0]) return NextResponse.json({ error: 'Save not found' }, { status: 404 })
        return NextResponse.json({ save: result[0] })
      } catch (error) {
        console.error('parent_add_note error:', error)
        return NextResponse.json({ error: 'Failed to add parent note' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // unsave_opportunity — kid unsaves (withdraws)
    // ------------------------------------------------------------------
    case 'unsave_opportunity': {
      const { kid_name, opportunity_id } = data
      if (!kid_name || !opportunity_id) {
        return NextResponse.json({ error: 'kid_name and opportunity_id required' }, { status: 400 })
      }

      try {
        const current = await db.query(
          `SELECT * FROM kid_opportunity_saves WHERE LOWER(kid_name) = LOWER($1) AND opportunity_id = $2`,
          [kid_name, opportunity_id]
        )
        if (!current[0]) return NextResponse.json({ error: 'Save not found' }, { status: 404 })

        const oldStatus = current[0].status

        const result = await db.query(
          `UPDATE kid_opportunity_saves
           SET status = 'withdrawn', status_updated_at = NOW(), updated_at = NOW()
           WHERE LOWER(kid_name) = LOWER($1) AND opportunity_id = $2
           RETURNING *`,
          [kid_name, opportunity_id]
        )

        // Log
        await db.query(
          `INSERT INTO opportunity_status_log (save_id, old_status, new_status, changed_by, note, changed_at)
           VALUES ($1, $2, 'withdrawn', $3, 'Unsaved by kid', NOW())`,
          [current[0].id, oldStatus, kid_name]
        ).catch(() => {})

        return NextResponse.json({ save: result[0] })
      } catch (error) {
        console.error('unsave_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to unsave opportunity' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
