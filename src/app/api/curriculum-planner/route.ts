import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { HOMESCHOOL_KIDS } from '@/lib/constants'

const DEFAULT_SCHOOL_YEAR = '2026-27'
const TEFA_ANNUAL_PER_KID = 2000

// ============================================================================
// GET /api/curriculum-planner?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const kid = (searchParams.get('kid_name') || '').toLowerCase()
  const schoolYear = searchParams.get('school_year') || DEFAULT_SCHOOL_YEAR

  switch (action) {
    // ------------------------------------------------------------------
    // get_outline — year outline for a specific kid
    // ------------------------------------------------------------------
    case 'get_outline': {
      if (!kid || !HOMESCHOOL_KIDS.includes(kid as any)) {
        return NextResponse.json({ error: 'Invalid kid_name' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `SELECT id, kid_name, school_year, month, subject,
                  unit_title, unit_description, themes, pedagogy_tags,
                  notes, sort_order, created_at, updated_at
           FROM curriculum_year_outline
           WHERE kid_name = $1 AND school_year = $2
           ORDER BY
             CASE month
               WHEN 'August' THEN 1 WHEN 'September' THEN 2 WHEN 'October' THEN 3
               WHEN 'November' THEN 4 WHEN 'December' THEN 5 WHEN 'January' THEN 6
               WHEN 'February' THEN 7 WHEN 'March' THEN 8 WHEN 'April' THEN 9
               WHEN 'May' THEN 10 WHEN 'June' THEN 11 WHEN 'July' THEN 12
             END, subject, sort_order`,
          [kid, schoolYear]
        )
        return NextResponse.json({ outline: rows })
      } catch (err) {
        console.error('get_outline error:', err)
        return NextResponse.json({ error: 'Failed to load outline' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_purchases — TEFA purchases for a specific kid (or all kids)
    // ------------------------------------------------------------------
    case 'get_purchases': {
      try {
        const rows = kid && HOMESCHOOL_KIDS.includes(kid as any)
          ? await db.query(
              `SELECT * FROM tefa_purchases
               WHERE kid_name = $1 AND school_year = $2
               ORDER BY
                 CASE status
                   WHEN 'received' THEN 1 WHEN 'ordered' THEN 2
                   WHEN 'in-use' THEN 3 WHEN 'wishlist' THEN 4
                 END,
                 CASE priority
                   WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3
                 END,
                 item_name`,
              [kid, schoolYear]
            )
          : await db.query(
              `SELECT * FROM tefa_purchases
               WHERE school_year = $1
               ORDER BY kid_name, status, item_name`,
              [schoolYear]
            )

        // Enrich with kid splits + unit links
        for (const p of rows) {
          p.kid_splits = await db.query(
            `SELECT kid_name, cost_share FROM tefa_purchase_kid_splits WHERE purchase_id = $1`,
            [p.id]
          ).catch(() => [])
          p.unit_links = await db.query(
            `SELECT ul.outline_id, ul.kid_name, co.unit_title, co.subject, co.month
             FROM tefa_purchase_unit_links ul
             LEFT JOIN curriculum_year_outline co ON co.id = ul.outline_id
             WHERE ul.purchase_id = $1`,
            [p.id]
          ).catch(() => [])
        }

        return NextResponse.json({ purchases: rows })
      } catch (err) {
        console.error('get_purchases error:', err)
        return NextResponse.json({ error: 'Failed to load purchases' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_summary — budget summary across all 4 kids
    // ------------------------------------------------------------------
    case 'get_summary': {
      try {
        const kids: Array<{
          kid_name: string; budget: number; spent: number; committed: number;
          remaining: number; wishlist_count: number; item_count: number;
        }> = []
        for (const k of HOMESCHOOL_KIDS) {
          // Use kid_splits for cost allocation when available, fall back to full purchase cost
          const rows = await db.query(
            `SELECT
               COALESCE(SUM(
                 CASE WHEN p.status IN ('received', 'in-use')
                   THEN COALESCE(s.cost_share, p.actual_cost, p.estimated_cost)
                   ELSE 0
                 END
               ), 0) AS spent,
               COALESCE(SUM(
                 CASE WHEN p.status = 'ordered'
                   THEN COALESCE(s.cost_share, p.actual_cost, p.estimated_cost)
                   ELSE 0
                 END
               ), 0) AS committed,
               COUNT(*) FILTER (WHERE p.status = 'wishlist')::int AS wishlist_count,
               COUNT(*)::int AS item_count
             FROM tefa_purchases p
             LEFT JOIN tefa_purchase_kid_splits s ON s.purchase_id = p.id AND s.kid_name = $1
             WHERE (p.kid_name = $1 OR s.kid_name = $1) AND p.school_year = $2`,
            [k, schoolYear]
          )
          const r = rows[0] || { spent: 0, committed: 0, wishlist_count: 0, item_count: 0 }
          const spent = Number(r.spent)
          const committed = Number(r.committed)
          kids.push({
            kid_name: k,
            budget: TEFA_ANNUAL_PER_KID,
            spent,
            committed,
            remaining: TEFA_ANNUAL_PER_KID - spent - committed,
            wishlist_count: r.wishlist_count,
            item_count: r.item_count,
          })
        }
        const totals = {
          total_budget: kids.length * TEFA_ANNUAL_PER_KID,
          total_spent: kids.reduce((s, k) => s + k.spent, 0),
          total_committed: kids.reduce((s, k) => s + k.committed, 0),
          total_remaining: kids.reduce((s, k) => s + k.remaining, 0),
          total_items: kids.reduce((s, k) => s + k.item_count, 0),
        }
        return NextResponse.json({ school_year: schoolYear, kids, totals })
      } catch (err) {
        console.error('get_summary error:', err)
        return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_year_map — outline grouped for Gantt grid
    // ------------------------------------------------------------------
    case 'get_year_map': {
      try {
        const where = kid && HOMESCHOOL_KIDS.includes(kid as any)
          ? `WHERE kid_name = '${kid}' AND school_year = '${schoolYear}'`
          : `WHERE school_year = '${schoolYear}'`
        const rows = await db.query(
          `SELECT id, kid_name, month, subject, unit_title, duration_weeks,
                  themes, pedagogy_tags, sort_order
           FROM curriculum_year_outline ${where}
           ORDER BY subject, kid_name,
             CASE month
               WHEN 'August' THEN 1 WHEN 'September' THEN 2 WHEN 'October' THEN 3
               WHEN 'November' THEN 4 WHEN 'December' THEN 5 WHEN 'January' THEN 6
               WHEN 'February' THEN 7 WHEN 'March' THEN 8 WHEN 'April' THEN 9
               WHEN 'May' THEN 10 WHEN 'June' THEN 11 WHEN 'July' THEN 12
             END`
        )
        return NextResponse.json({ units: rows })
      } catch (err) {
        console.error('get_year_map error:', err)
        return NextResponse.json({ error: 'Failed to load year map' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_quarter_goals
    // ------------------------------------------------------------------
    case 'get_quarter_goals': {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM curriculum_quarter_goals WHERE kid_name = $1 AND school_year = $2 ORDER BY quarter`,
          [kid, schoolYear]
        )
        return NextResponse.json({ goals: rows })
      } catch { return NextResponse.json({ goals: [] }) }
    }

    // ------------------------------------------------------------------
    // get_unit_detail — single unit with all children
    // ------------------------------------------------------------------
    case 'get_unit_detail': {
      const unitId = searchParams.get('unit_id')
      if (!unitId) return NextResponse.json({ error: 'unit_id required' }, { status: 400 })
      try {
        const unitRows = await db.query(`SELECT * FROM curriculum_year_outline WHERE id = $1`, [unitId])
        if (unitRows.length === 0) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

        const [objectives, extras, assessments, gaps, linkedAssets, siblings] = await Promise.all([
          db.query(`SELECT * FROM curriculum_unit_objectives WHERE unit_id = $1 ORDER BY sort_order`, [unitId]).catch(() => []),
          db.query(`SELECT * FROM curriculum_unit_extras WHERE unit_id = $1 ORDER BY created_at`, [unitId]).catch(() => []),
          db.query(`SELECT * FROM curriculum_unit_assessments WHERE unit_id = $1 ORDER BY scheduled_date`, [unitId]).catch(() => []),
          db.query(`SELECT * FROM curriculum_unit_gaps WHERE unit_id = $1 ORDER BY created_at`, [unitId]).catch(() => []),
          db.query(
            `SELECT fa.id, fa.asset_name, fa.asset_type, fa.condition, fa.topic_tags, faul.linked_at
             FROM family_asset_unit_links faul
             JOIN family_assets fa ON fa.id = faul.asset_id
             WHERE faul.outline_id = $1
             ORDER BY fa.asset_name`, [unitId]
          ).catch(() => []),
          // Find sibling units (same title+subject in other kids)
          db.query(
            `SELECT o.id, o.kid_name, o.month, o.duration_weeks
             FROM curriculum_year_outline o
             WHERE o.unit_title = $1 AND o.subject = $2 AND o.school_year = $3 AND o.id != $4`,
            [unitRows[0].unit_title, unitRows[0].subject, unitRows[0].school_year, unitId]
          ).catch(() => []),
        ])

        return NextResponse.json({
          unit: unitRows[0], objectives, extras, assessments, gaps,
          linked_assets: linkedAssets, siblings,
        })
      } catch (err) {
        console.error('get_unit_detail error:', err)
        return NextResponse.json({ error: 'Failed to load unit' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

// ============================================================================
// POST /api/curriculum-planner
// ============================================================================
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    // ------------------------------------------------------------------
    // save_outline_item — create or update a year outline item
    // ------------------------------------------------------------------
    case 'save_outline_item': {
      const { id, kid_name, school_year, month, subject, unit_title,
              unit_description, themes, pedagogy_tags, notes, sort_order } = body
      if (!kid_name || !HOMESCHOOL_KIDS.includes((kid_name || '').toLowerCase())) {
        return NextResponse.json({ error: 'Invalid kid_name' }, { status: 400 })
      }
      if (!month || !subject || !unit_title) {
        return NextResponse.json({ error: 'month, subject, unit_title required' }, { status: 400 })
      }
      try {
        if (id) {
          const rows = await db.query(
            `UPDATE curriculum_year_outline
             SET month = $2, subject = $3, unit_title = $4,
                 unit_description = $5, themes = $6, pedagogy_tags = $7,
                 notes = $8, sort_order = $9
             WHERE id = $1 RETURNING *`,
            [id, month, subject, unit_title, unit_description || null,
             themes || [], pedagogy_tags || [], notes || null, sort_order || 0]
          )
          return NextResponse.json({ item: rows[0] })
        } else {
          const rows = await db.query(
            `INSERT INTO curriculum_year_outline
               (kid_name, school_year, month, subject, unit_title,
                unit_description, themes, pedagogy_tags, notes, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [kid_name.toLowerCase(), school_year || DEFAULT_SCHOOL_YEAR, month,
             subject, unit_title, unit_description || null,
             themes || [], pedagogy_tags || [], notes || null, sort_order || 0]
          )
          return NextResponse.json({ item: rows[0] })
        }
      } catch (err) {
        console.error('save_outline_item error:', err)
        return NextResponse.json({ error: 'Failed to save outline item' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // delete_outline_item
    // ------------------------------------------------------------------
    case 'delete_outline_item': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      try {
        await db.query(`DELETE FROM curriculum_year_outline WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      } catch (err) {
        console.error('delete_outline_item error:', err)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // save_purchase — create or update TEFA purchase item
    // ------------------------------------------------------------------
    case 'save_purchase': {
      const { id, kid_name, school_year, tefa_category, item_name, item_description,
              vendor, estimated_cost, actual_cost, priority, status, purchased_date,
              received_date, linked_outline_id, notes,
              kid_splits, unit_links } = body
      if (!kid_name || !HOMESCHOOL_KIDS.includes((kid_name || '').toLowerCase())) {
        return NextResponse.json({ error: 'Invalid kid_name' }, { status: 400 })
      }
      if (!tefa_category || !item_name) {
        return NextResponse.json({ error: 'tefa_category and item_name required' }, { status: 400 })
      }
      try {
        let purchaseId: string
        if (id) {
          const rows = await db.query(
            `UPDATE tefa_purchases
             SET tefa_category = $2, item_name = $3, item_description = $4,
                 vendor = $5, estimated_cost = $6, actual_cost = $7,
                 priority = $8, status = $9, purchased_date = $10,
                 received_date = $11, linked_outline_id = $12, notes = $13
             WHERE id = $1 RETURNING *`,
            [id, tefa_category, item_name, item_description || null, vendor || null,
             Number(estimated_cost) || 0, actual_cost != null ? Number(actual_cost) : null,
             priority || 'medium', status || 'wishlist',
             purchased_date || null, received_date || null,
             linked_outline_id || null, notes || null]
          )
          purchaseId = id
          // Update junction tables
          if (Array.isArray(kid_splits)) {
            await db.query(`DELETE FROM tefa_purchase_kid_splits WHERE purchase_id = $1`, [id]).catch(() => {})
          }
          if (Array.isArray(unit_links)) {
            await db.query(`DELETE FROM tefa_purchase_unit_links WHERE purchase_id = $1`, [id]).catch(() => {})
          }
        } else {
          const rows = await db.query(
            `INSERT INTO tefa_purchases
               (kid_name, school_year, tefa_category, item_name, item_description,
                vendor, estimated_cost, actual_cost, priority, status,
                purchased_date, received_date, linked_outline_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [kid_name.toLowerCase(), school_year || DEFAULT_SCHOOL_YEAR,
             tefa_category, item_name, item_description || null, vendor || null,
             Number(estimated_cost) || 0, actual_cost != null ? Number(actual_cost) : null,
             priority || 'medium', status || 'wishlist',
             purchased_date || null, received_date || null,
             linked_outline_id || null, notes || null]
          )
          purchaseId = rows[0]?.id
        }

        // Write kid splits (if provided; otherwise default single-kid split)
        if (Array.isArray(kid_splits) && kid_splits.length > 0) {
          for (const split of kid_splits) {
            await db.query(
              `INSERT INTO tefa_purchase_kid_splits (purchase_id, kid_name, cost_share)
               VALUES ($1, $2, $3) ON CONFLICT (purchase_id, kid_name) DO UPDATE SET cost_share = $3`,
              [purchaseId, split.kid_name, Number(split.cost_share) || 0]
            ).catch(() => {})
          }
        } else if (purchaseId) {
          // Default: single kid gets full cost
          await db.query(
            `INSERT INTO tefa_purchase_kid_splits (purchase_id, kid_name, cost_share)
             VALUES ($1, $2, $3) ON CONFLICT (purchase_id, kid_name) DO UPDATE SET cost_share = $3`,
            [purchaseId, kid_name.toLowerCase(), Number(actual_cost ?? estimated_cost) || 0]
          ).catch(() => {})
        }

        // Write unit links
        if (Array.isArray(unit_links) && unit_links.length > 0) {
          for (const link of unit_links) {
            await db.query(
              `INSERT INTO tefa_purchase_unit_links (purchase_id, outline_id, kid_name)
               VALUES ($1, $2, $3) ON CONFLICT (purchase_id, outline_id) DO NOTHING`,
              [purchaseId, link.outline_id, link.kid_name || kid_name.toLowerCase()]
            ).catch(() => {})
          }
        }

        const result = await db.query(`SELECT * FROM tefa_purchases WHERE id = $1`, [purchaseId])
        return NextResponse.json({ item: result[0] })
      } catch (err) {
        console.error('save_purchase error:', err)
        return NextResponse.json({ error: 'Failed to save purchase' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_purchase_status — quick status toggle
    // ------------------------------------------------------------------
    case 'update_purchase_status': {
      const { id, status } = body
      if (!id || !status) {
        return NextResponse.json({ error: 'id and status required' }, { status: 400 })
      }
      try {
        const rows = await db.query(
          `UPDATE tefa_purchases SET status = $2 WHERE id = $1 RETURNING *`,
          [id, status]
        )
        return NextResponse.json({ item: rows[0] })
      } catch (err) {
        console.error('update_purchase_status error:', err)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // delete_purchase
    // ------------------------------------------------------------------
    case 'delete_purchase': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      try {
        await db.query(`DELETE FROM tefa_purchases WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      } catch (err) {
        console.error('delete_purchase error:', err)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // Quarter goals
    // ------------------------------------------------------------------
    case 'save_quarter_goal': {
      const { kid_name: qkid, school_year: qsy, quarter, goal_text } = body
      if (!qkid || !quarter) return NextResponse.json({ error: 'kid_name + quarter required' }, { status: 400 })
      try {
        const rows = await db.query(
          `INSERT INTO curriculum_quarter_goals (kid_name, school_year, quarter, goal_text)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (kid_name, school_year, quarter) DO UPDATE SET goal_text = $4, updated_at = NOW()
           RETURNING *`,
          [qkid.toLowerCase(), qsy || DEFAULT_SCHOOL_YEAR, quarter, goal_text || null]
        )
        return NextResponse.json({ goal: rows[0] })
      } catch (err) {
        console.error('save_quarter_goal error:', err)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // Unit objectives
    // ------------------------------------------------------------------
    case 'save_objective': {
      const { unit_id, objective_text, sort_order, id: objId } = body
      if (!unit_id || !objective_text) return NextResponse.json({ error: 'unit_id + objective_text required' }, { status: 400 })
      try {
        if (objId) {
          const rows = await db.query(
            `UPDATE curriculum_unit_objectives SET objective_text = $2, sort_order = $3 WHERE id = $1 RETURNING *`,
            [objId, objective_text, sort_order ?? 0]
          )
          return NextResponse.json({ objective: rows[0] })
        }
        const rows = await db.query(
          `INSERT INTO curriculum_unit_objectives (unit_id, objective_text, sort_order) VALUES ($1, $2, $3) RETURNING *`,
          [unit_id, objective_text, sort_order ?? 0]
        )
        return NextResponse.json({ objective: rows[0] })
      } catch (err) { return NextResponse.json({ error: 'Failed to save' }, { status: 500 }) }
    }
    case 'toggle_objective': {
      const { id: tId } = body
      if (!tId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE curriculum_unit_objectives SET completed = NOT completed WHERE id = $1`, [tId])
      return NextResponse.json({ success: true })
    }
    case 'delete_objective': {
      const { id: dId } = body
      if (!dId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM curriculum_unit_objectives WHERE id = $1`, [dId])
      return NextResponse.json({ success: true })
    }

    // ------------------------------------------------------------------
    // Unit extras (STEAM, experiments, field trips)
    // ------------------------------------------------------------------
    case 'save_extra': {
      const { unit_id, title, description, extra_type, scheduled_date, status: exStatus, id: exId } = body
      if (!unit_id || !title) return NextResponse.json({ error: 'unit_id + title required' }, { status: 400 })
      try {
        if (exId) {
          const rows = await db.query(
            `UPDATE curriculum_unit_extras SET title=$2, description=$3, extra_type=$4, scheduled_date=$5, status=$6 WHERE id=$1 RETURNING *`,
            [exId, title, description || null, extra_type || 'experiment', scheduled_date || null, exStatus || 'planned']
          )
          return NextResponse.json({ extra: rows[0] })
        }
        const rows = await db.query(
          `INSERT INTO curriculum_unit_extras (unit_id, title, description, extra_type, scheduled_date, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [unit_id, title, description || null, extra_type || 'experiment', scheduled_date || null, exStatus || 'planned']
        )
        return NextResponse.json({ extra: rows[0] })
      } catch (err) { return NextResponse.json({ error: 'Failed to save' }, { status: 500 }) }
    }
    case 'delete_extra': {
      const { id: deId } = body
      if (!deId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM curriculum_unit_extras WHERE id = $1`, [deId])
      return NextResponse.json({ success: true })
    }

    // ------------------------------------------------------------------
    // Unit assessments
    // ------------------------------------------------------------------
    case 'save_assessment': {
      const { unit_id, title, description, assessment_type, scheduled_date, completed, score, id: aId } = body
      if (!unit_id || !title) return NextResponse.json({ error: 'unit_id + title required' }, { status: 400 })
      try {
        if (aId) {
          const rows = await db.query(
            `UPDATE curriculum_unit_assessments SET title=$2, description=$3, assessment_type=$4, scheduled_date=$5, completed=$6, score=$7 WHERE id=$1 RETURNING *`,
            [aId, title, description || null, assessment_type || 'quiz', scheduled_date || null, completed || false, score || null]
          )
          return NextResponse.json({ assessment: rows[0] })
        }
        const rows = await db.query(
          `INSERT INTO curriculum_unit_assessments (unit_id, title, description, assessment_type, scheduled_date) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [unit_id, title, description || null, assessment_type || 'quiz', scheduled_date || null]
        )
        return NextResponse.json({ assessment: rows[0] })
      } catch (err) { return NextResponse.json({ error: 'Failed to save' }, { status: 500 }) }
    }
    case 'delete_assessment': {
      const { id: daId } = body
      if (!daId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM curriculum_unit_assessments WHERE id = $1`, [daId])
      return NextResponse.json({ success: true })
    }

    // ------------------------------------------------------------------
    // Unit gaps (items needed → purchase plan)
    // ------------------------------------------------------------------
    case 'save_gap': {
      const { unit_id, item_name, description } = body
      if (!unit_id || !item_name) return NextResponse.json({ error: 'unit_id + item_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `INSERT INTO curriculum_unit_gaps (unit_id, item_name, description) VALUES ($1, $2, $3) RETURNING *`,
          [unit_id, item_name, description || null]
        )
        return NextResponse.json({ gap: rows[0] })
      } catch (err) { return NextResponse.json({ error: 'Failed to save' }, { status: 500 }) }
    }
    case 'resolve_gap': {
      const { id: gId, purchase_id } = body
      if (!gId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(
        `UPDATE curriculum_unit_gaps SET resolved = TRUE, purchase_id = $2 WHERE id = $1`,
        [gId, purchase_id || null]
      )
      return NextResponse.json({ success: true })
    }
    case 'delete_gap': {
      const { id: dgId } = body
      if (!dgId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM curriculum_unit_gaps WHERE id = $1`, [dgId])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
