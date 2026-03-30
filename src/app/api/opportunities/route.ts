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
    // list — all active opportunities, optional subject_tags filter
    // ------------------------------------------------------------------
    case 'list': {
      const subjectTags = searchParams.get('subject_tags')

      try {
        let sql = `SELECT * FROM kid_opportunities WHERE active = true`
        const params: any[] = []

        if (subjectTags) {
          const tags = subjectTags.split(',').map(t => t.trim())
          sql += ` AND subject_tags && $${params.length + 1}::text[]`
          params.push(tags)
        }

        sql += ` ORDER BY deadline_date ASC NULLS LAST, created_at DESC`

        const opportunities = await db.query(sql, params)
        return NextResponse.json({ opportunities })
      } catch (error) {
        console.error('list opportunities error:', error)
        return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // kid_saves — saved opportunities for a kid with opportunity details
    // ------------------------------------------------------------------
    case 'kid_saves': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const saves = await db.query(
          `SELECT ks.*, ko.title, ko.organization, ko.description, ko.opportunity_type,
                  ko.subject_tags, ko.eligible_ages, ko.deadline_date, ko.amount, ko.url
           FROM kid_opportunity_saves ks
           JOIN kid_opportunities ko ON ks.opportunity_id = ko.id
           WHERE LOWER(ks.kid_name) = LOWER($1)
           ORDER BY ks.created_at DESC`,
          [kidName]
        )
        return NextResponse.json({ saves })
      } catch (error) {
        console.error('kid_saves error:', error)
        return NextResponse.json({ error: 'Failed to load saved opportunities' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // for_kid — opportunities filtered by kid's age/grade
    // ------------------------------------------------------------------
    case 'for_kid': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        // Get kid's grade from student_profiles
        const profiles = await db.query(
          `SELECT grade FROM student_profiles WHERE LOWER(kid_name) = LOWER($1) LIMIT 1`,
          [kidName]
        )
        const grade = profiles[0]?.grade || null

        // Get all active opportunities — filter by eligible grade if possible
        let sql = `SELECT * FROM kid_opportunities WHERE active = true`
        const params: any[] = []

        if (grade) {
          // Include opportunities where eligible_ages contains the grade or is null
          sql += ` AND (eligible_ages IS NULL OR eligible_ages @> ARRAY[$${params.length + 1}]::text[])`
          params.push(grade)
        }

        sql += ` ORDER BY deadline_date ASC NULLS LAST, created_at DESC`

        const opportunities = await db.query(sql, params)
        return NextResponse.json({ opportunities, grade })
      } catch (error) {
        console.error('for_kid error:', error)
        return NextResponse.json({ error: 'Failed to load opportunities for kid' }, { status: 500 })
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
    // save — kid saves an opportunity
    // ------------------------------------------------------------------
    case 'save': {
      const { kid_name, opportunity_id } = data
      if (!kid_name || !opportunity_id) {
        return NextResponse.json({ error: 'kid_name and opportunity_id required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `INSERT INTO kid_opportunity_saves (kid_name, opportunity_id, status)
           VALUES (LOWER($1), $2, 'interested')
           ON CONFLICT (kid_name, opportunity_id) DO NOTHING
           RETURNING *`,
          [kid_name, opportunity_id]
        )
        return NextResponse.json({ save: result[0] || null, already_saved: !result[0] }, { status: 201 })
      } catch (error) {
        console.error('save opportunity error:', error)
        return NextResponse.json({ error: 'Failed to save opportunity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_status — update status of a saved opportunity
    // ------------------------------------------------------------------
    case 'update_status': {
      const { save_id, status } = data
      if (!save_id || !status) {
        return NextResponse.json({ error: 'save_id and status required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `UPDATE kid_opportunity_saves
           SET status = $2, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [save_id, status]
        )
        if (!result[0]) return NextResponse.json({ error: 'Save not found' }, { status: 404 })
        return NextResponse.json({ save: result[0] })
      } catch (error) {
        console.error('update_status error:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // add_opportunity — parent adds a custom opportunity
    // ------------------------------------------------------------------
    case 'add_opportunity': {
      const { title, organization, description, opportunity_type, subject_tags, eligible_ages, deadline_date, amount, url } = data
      if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

      try {
        const result = await db.query(
          `INSERT INTO kid_opportunities
             (title, organization, description, opportunity_type, subject_tags, eligible_ages, deadline_date, amount, url, active)
           VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7, $8, $9, true)
           RETURNING *`,
          [
            title,
            organization || null,
            description || null,
            opportunity_type || 'other',
            subject_tags || null,
            eligible_ages || null,
            deadline_date || null,
            amount || null,
            url || null,
          ]
        )
        return NextResponse.json({ opportunity: result[0] }, { status: 201 })
      } catch (error) {
        console.error('add_opportunity error:', error)
        return NextResponse.json({ error: 'Failed to add opportunity' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
