import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const child = searchParams.get('child')?.toLowerCase()

    if (!child) {
      return NextResponse.json({ error: 'child parameter required' }, { status: 400 })
    }

    // Fetch providers from the health_providers table (kids or shared)
    const providers = await query(
      `SELECT id, name, specialty, practice_name, phone, address
       FROM health_providers
       WHERE member_group IN ('kids', 'both')
       ORDER BY name`
    )

    // Also check health_profiles for this kid's primary doctor (fallback source)
    const profileResult = await query(
      `SELECT primary_doctor, primary_doctor_phone, primary_doctor_address, pharmacy_name, pharmacy_phone
       FROM health_profiles
       WHERE member_group = 'kids' AND LOWER(family_member_name) = $1
       LIMIT 1`,
      [child]
    )
    const profile = profileResult[0] || null

    // If the kid has a primary doctor in their profile but it's not in the providers list, include it
    if (profile?.primary_doctor && profile.primary_doctor.trim()) {
      const alreadyListed = providers.some(
        (p: any) => p.name.toLowerCase() === profile.primary_doctor.toLowerCase()
      )
      if (!alreadyListed) {
        providers.unshift({
          id: `profile-primary`,
          name: profile.primary_doctor,
          specialty: 'Primary Care',
          practice_name: '',
          phone: profile.primary_doctor_phone || null,
          address: profile.primary_doctor_address || null,
        })
      }
    }

    // Fetch upcoming appointments for this child (match by name, case-insensitive)
    const appointments = await query(
      `SELECT id, provider_name, appointment_type, appointment_date, location, reason, status
       FROM health_appointments
       WHERE member_group = 'kids'
         AND LOWER(family_member_name) = $1
         AND appointment_date >= CURRENT_DATE
         AND status = 'scheduled'
       ORDER BY appointment_date ASC`,
      [child]
    )

    // Fetch this kid's health requests
    const requests = await query(
      `SELECT id, category, duration, severity, notes, status, parent_response, created_at, resolved_at
       FROM kid_health_requests
       WHERE child_name = $1
       ORDER BY created_at DESC`,
      [child]
    )

    // Fetch active daily care items (within date range)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const careItems = await query(
      `SELECT id, item_name, instructions, time_of_day, category, start_date, end_date, sort_order
       FROM kid_daily_care
       WHERE child_name = $1
         AND active = TRUE
         AND (start_date IS NULL OR start_date <= $2)
         AND (end_date IS NULL OR end_date >= $2)
       ORDER BY sort_order, id`,
      [child, today]
    )

    // Fetch today's completion log
    const careLog = await query(
      `SELECT care_item_id, time_of_day, completed
       FROM kid_daily_care_log
       WHERE child_name = $1 AND log_date = $2`,
      [child, today]
    )
    const logMap: Record<string, boolean> = {}
    careLog.forEach((l: any) => { logMap[`${l.care_item_id}-${l.time_of_day}`] = l.completed })

    // Attach completion status to care items
    const dailyCare = careItems.map((item: any) => ({
      ...item,
      morning_done: item.time_of_day === 'morning' || item.time_of_day === 'both'
        ? !!logMap[`${item.id}-morning`] : null,
      evening_done: item.time_of_day === 'evening' || item.time_of_day === 'both'
        ? !!logMap[`${item.id}-evening`] : null,
    }))

    return NextResponse.json({ providers, appointments, requests, dailyCare })
  } catch (error) {
    console.error('Kids health GET error:', error)
    return NextResponse.json({ error: 'Failed to load health data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'submit_health_request': {
        const { child, category, duration, severity, notes } = body
        if (!child || !category || !duration || !severity) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const result = await query(
          `INSERT INTO kid_health_requests (child_name, category, duration, severity, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [child.toLowerCase(), category, duration, severity, notes || null]
        )
        return NextResponse.json({ success: true, id: result[0]?.id })
      }

      case 'update_request_status': {
        const { requestId, status, parent_response } = body
        if (!requestId || !status) {
          return NextResponse.json({ error: 'Missing requestId or status' }, { status: 400 })
        }
        const resolvedAt = ['scheduled', 'handled', 'dismissed'].includes(status) ? 'NOW()' : 'NULL'
        await query(
          `UPDATE kid_health_requests
           SET status = $1, parent_response = $2, resolved_at = ${resolvedAt}
           WHERE id = $3`,
          [status, parent_response || null, requestId]
        )
        return NextResponse.json({ success: true })
      }

      case 'toggle_care_item': {
        const { child, careItemId, timeOfDay } = body
        if (!child || !careItemId || !timeOfDay) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const existing = await query(
          `SELECT completed FROM kid_daily_care_log
           WHERE care_item_id = $1 AND log_date = $2 AND time_of_day = $3`,
          [careItemId, today, timeOfDay]
        )
        const newCompleted = existing.length > 0 ? !existing[0].completed : true
        await query(
          `INSERT INTO kid_daily_care_log (care_item_id, child_name, log_date, time_of_day, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (care_item_id, log_date, time_of_day)
           DO UPDATE SET completed = $5, completed_at = $6`,
          [careItemId, child.toLowerCase(), today, timeOfDay, newCompleted, newCompleted ? new Date().toISOString() : null]
        )
        return NextResponse.json({ success: true, completed: newCompleted })
      }

      case 'add_care_item': {
        const { child, itemName, instructions, timeOfDay, category, startDate, endDate } = body
        if (!child || !itemName || !instructions || !timeOfDay) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const result = await query(
          `INSERT INTO kid_daily_care (child_name, item_name, instructions, time_of_day, category, start_date, end_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [child.toLowerCase(), itemName, instructions, timeOfDay, category || 'medication', startDate || null, endDate || null]
        )
        return NextResponse.json({ success: true, id: result[0]?.id })
      }

      case 'update_care_item': {
        const { careItemId, itemName, instructions, timeOfDay, category, endDate } = body
        if (!careItemId) {
          return NextResponse.json({ error: 'Missing careItemId' }, { status: 400 })
        }
        await query(
          `UPDATE kid_daily_care
           SET item_name = COALESCE($1, item_name),
               instructions = COALESCE($2, instructions),
               time_of_day = COALESCE($3, time_of_day),
               category = COALESCE($4, category),
               end_date = $5
           WHERE id = $6`,
          [itemName || null, instructions || null, timeOfDay || null, category || null, endDate || null, careItemId]
        )
        return NextResponse.json({ success: true })
      }

      case 'remove_care_item': {
        const { careItemId } = body
        if (!careItemId) {
          return NextResponse.json({ error: 'Missing careItemId' }, { status: 400 })
        }
        await query(`UPDATE kid_daily_care SET active = FALSE WHERE id = $1`, [careItemId])
        return NextResponse.json({ success: true })
      }

      case 'get_all_care_items': {
        // Parent portal: get all active care items grouped by child, with today's completion
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const items = await query(
          `SELECT c.id, c.child_name, c.item_name, c.instructions, c.time_of_day, c.category, c.start_date, c.end_date, c.sort_order
           FROM kid_daily_care c
           WHERE c.active = TRUE
           ORDER BY c.child_name, c.sort_order, c.id`
        )
        const logs = await query(
          `SELECT care_item_id, time_of_day, completed
           FROM kid_daily_care_log
           WHERE log_date = $1`,
          [today]
        )
        const logMap: Record<string, boolean> = {}
        logs.forEach((l: any) => { logMap[`${l.care_item_id}-${l.time_of_day}`] = l.completed })

        const itemsWithStatus = items.map((item: any) => ({
          ...item,
          morning_done: (item.time_of_day === 'morning' || item.time_of_day === 'both') ? !!logMap[`${item.id}-morning`] : null,
          evening_done: (item.time_of_day === 'evening' || item.time_of_day === 'both') ? !!logMap[`${item.id}-evening`] : null,
        }))
        return NextResponse.json({ careItems: itemsWithStatus })
      }

      case 'get_all_requests': {
        // Parent portal: get all pending requests across all kids
        const requests = await query(
          `SELECT id, child_name, category, duration, severity, notes, status, parent_response, created_at, resolved_at
           FROM kid_health_requests
           ORDER BY
             CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
             created_at DESC`
        )
        return NextResponse.json({ requests })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Kids health POST error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
