import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

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

    // ── Dental Health ──
    const dentalItems = await query(
      `SELECT id, item_name, time_of_day, sort_order
       FROM kid_dental_items
       WHERE child_name = $1 AND enabled = TRUE
       ORDER BY sort_order, id`,
      [child]
    )
    const dentalLog = await query(
      `SELECT dental_item_id, completed
       FROM kid_dental_log
       WHERE child_name = $1 AND log_date = $2`,
      [child, today]
    )
    const dentalLogMap: Record<number, boolean> = {}
    dentalLog.forEach((l: any) => { dentalLogMap[l.dental_item_id] = l.completed })
    const dentalWithStatus = dentalItems.map((item: any) => ({
      ...item,
      completed: !!dentalLogMap[item.id],
    }))

    const streakResult = await query(
      `SELECT current_streak, longest_streak, last_completed_date
       FROM kid_dental_streaks WHERE child_name = $1`,
      [child]
    )
    const streak = streakResult[0] || { current_streak: 0, longest_streak: 0, last_completed_date: null }

    const dentalNotes = await query(
      `SELECT id, note, created_at FROM kid_dental_notes
       WHERE child_name = $1 ORDER BY created_at DESC`,
      [child]
    )

    // Find dentist from providers
    const dentistProvider = providers.find((p: any) => p.specialty?.toLowerCase().includes('dentist') || p.specialty?.toLowerCase().includes('dental'))
    const dentistAppointment = appointments.find((a: any) => a.appointment_type === 'dental')

    const dental = {
      items: dentalWithStatus,
      streak,
      notes: dentalNotes,
      dentist: dentistProvider || null,
      nextDentalVisit: dentistAppointment || null,
    }

    // ── Fitness & Activity ──
    const todayActivities = await query(
      `SELECT id, activity_type, duration_minutes, notes, created_at
       FROM kid_activity_log
       WHERE child_name = $1 AND log_date = $2
       ORDER BY created_at DESC`,
      [child, today]
    )

    // Mood: today + last 7 days
    const moodHistory = await query(
      `SELECT mood, log_date, notes FROM kid_mood_log
       WHERE child_name = $1 AND log_date >= ($2::date - interval '6 days') AND log_date <= $2::date
       ORDER BY log_date ASC`,
      [child, today]
    )
    const todayMood = moodHistory.find((m: any) => {
      const d = new Date(m.log_date)
      return d.toISOString().slice(0, 10) === today
    })

    // Activity streak: count consecutive days with at least 1 activity
    const activityDays = await query(
      `SELECT DISTINCT log_date FROM kid_activity_log
       WHERE child_name = $1 AND log_date <= $2
       ORDER BY log_date DESC LIMIT 60`,
      [child, today]
    )
    let activityStreak = 0
    const checkDate = new Date(today + 'T12:00:00')
    for (const row of activityDays) {
      const d = new Date(row.log_date).toISOString().slice(0, 10)
      const expected = new Date(checkDate)
      expected.setDate(expected.getDate() - activityStreak)
      if (d === expected.toISOString().slice(0, 10)) {
        activityStreak++
      } else {
        break
      }
    }

    // Wellness (Zoey only)
    let wellness = null
    if (child === 'zoey') {
      const wellnessResult = await query(
        `SELECT * FROM kid_wellness_log WHERE child_name = 'zoey' AND log_date = $1`,
        [today]
      )
      wellness = wellnessResult[0] || null
      // Weekly activity summary for Zoey
      const weeklyActivities = await query(
        `SELECT log_date, COUNT(*) as count, SUM(duration_minutes) as total_minutes
         FROM kid_activity_log
         WHERE child_name = 'zoey' AND log_date >= ($1::date - interval '6 days') AND log_date <= $1::date
         GROUP BY log_date ORDER BY log_date ASC`,
        [today]
      )
      wellness = { ...(wellness || {}), weeklyActivities }
    }

    const fitness = {
      todayActivities,
      moodHistory,
      todayMood: todayMood || null,
      activityStreak,
      wellness,
    }

    // ── Cycle Tracker ──
    // Only return data if this kid has a row in kid_cycle_settings
    let cycle = null
    const cycleSettingsResult = await query(
      `SELECT mode, onboarded, avg_cycle_length, avg_period_duration, cycle_regularity, common_symptoms
       FROM kid_cycle_settings WHERE kid_name = $1`,
      [child]
    )
    if (cycleSettingsResult.length > 0) {
      const settings = cycleSettingsResult[0]
      const cycleLog = await query(
        `SELECT id, event_type, event_date FROM kid_cycle_log
         WHERE kid_name = $1 ORDER BY event_date DESC, id DESC LIMIT 12`,
        [child]
      )
      const cycleSymptoms = await query(
        `SELECT id, log_date, mood, cramps, flow, notes, irregularities FROM kid_cycle_symptoms
         WHERE kid_name = $1 AND log_date >= ($2::date - interval '30 days') AND log_date <= $2::date
         ORDER BY log_date DESC`,
        [child, today]
      )
      cycle = { ...settings, log: cycleLog, symptoms: cycleSymptoms }
    }

    return NextResponse.json({ providers, appointments, requests, dailyCare, dental, fitness, cycle })
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
        // NOTIFY-FIX-1 #1: Notify parent of health request (urgent if "Really Bothering Me")
        const kidDisplay = child.charAt(0).toUpperCase() + child.slice(1).toLowerCase()
        const isUrgent = severity === 'really_bothering' || severity === 'severe'
        await createNotification({
          title: isUrgent ? `URGENT: ${kidDisplay} health request` : `${kidDisplay} submitted a health request`,
          message: `${category}${duration ? ' — ' + duration : ''}${notes ? ': ' + notes.substring(0, 80) : ''}`,
          source_type: isUrgent ? 'health_urgent' : 'health_request',
          source_ref: `health-req-${child.toLowerCase()}-${result[0]?.id}`,
          link_tab: 'health', icon: isUrgent ? '🚨' : '🩺',
        }).catch(e => console.error('Health request notification failed:', e.message))
        return NextResponse.json({ success: true, id: result[0]?.id })
      }

      case 'update_request_status': {
        const { requestId, status, parent_response, resolution_notes } = body
        if (!requestId || !status) {
          return NextResponse.json({ error: 'Missing requestId or status' }, { status: 400 })
        }
        const resolvedAt = ['scheduled', 'handled', 'dismissed'].includes(status) ? 'NOW()' : 'NULL'
        await query(
          `UPDATE kid_health_requests
           SET status = $1, parent_response = $2, resolved_at = ${resolvedAt},
               resolution_notes = COALESCE($4, resolution_notes)
           WHERE id = $3`,
          [status, parent_response || null, requestId, resolution_notes || null]
        )
        return NextResponse.json({ success: true })
      }

      // UX-3: Add/update follow-up notes on resolved health request
      case 'add_resolution_notes': {
        const { requestId, resolution_notes } = body
        if (!requestId || !resolution_notes?.trim()) {
          return NextResponse.json({ error: 'requestId and resolution_notes required' }, { status: 400 })
        }
        await query(
          `UPDATE kid_health_requests SET resolution_notes = $2 WHERE id = $1`,
          [requestId, resolution_notes.trim()]
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

      // ── Dental actions ──
      case 'toggle_dental_item': {
        const { child, dentalItemId } = body
        if (!child || !dentalItemId) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const childLower = child.toLowerCase()
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const existing = await query(
          `SELECT completed FROM kid_dental_log WHERE dental_item_id = $1 AND child_name = $2 AND log_date = $3`,
          [dentalItemId, childLower, today]
        )
        const newCompleted = existing.length > 0 ? !existing[0].completed : true
        await query(
          `INSERT INTO kid_dental_log (dental_item_id, child_name, log_date, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (dental_item_id, child_name, log_date)
           DO UPDATE SET completed = $4, completed_at = $5`,
          [dentalItemId, childLower, today, newCompleted, newCompleted ? new Date().toISOString() : null]
        )

        // Recalculate streak
        const allItems = await query(
          `SELECT id FROM kid_dental_items WHERE child_name = $1 AND enabled = TRUE`,
          [childLower]
        )
        const todayLog = await query(
          `SELECT dental_item_id, completed FROM kid_dental_log WHERE child_name = $1 AND log_date = $2`,
          [childLower, today]
        )
        const todayCompleteMap: Record<number, boolean> = {}
        todayLog.forEach((l: any) => { todayCompleteMap[l.dental_item_id] = l.completed })
        const allDoneToday = allItems.every((i: any) => !!todayCompleteMap[i.id])

        if (allDoneToday) {
          const streakRow = await query(
            `SELECT current_streak, longest_streak, last_completed_date FROM kid_dental_streaks WHERE child_name = $1`,
            [childLower]
          )
          if (streakRow.length > 0) {
            const s = streakRow[0]
            const lastDate = s.last_completed_date ? new Date(s.last_completed_date).toISOString().slice(0, 10) : null
            const yesterday = new Date(today + 'T12:00:00')
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().slice(0, 10)

            let newStreak = s.current_streak
            if (lastDate === today) {
              // Already counted today
            } else if (lastDate === yesterdayStr) {
              newStreak = s.current_streak + 1
            } else {
              newStreak = 1
            }
            const newLongest = Math.max(s.longest_streak, newStreak)
            await query(
              `UPDATE kid_dental_streaks SET current_streak = $1, longest_streak = $2, last_completed_date = $3 WHERE child_name = $4`,
              [newStreak, newLongest, today, childLower]
            )
          }
        }

        // NOTIFY-FIX-1b #8: Notify parent when dental routine complete
        if (allDoneToday && newCompleted) {
          const childDisplay = childLower.charAt(0).toUpperCase() + childLower.slice(1)
          const streakRow2 = await query(
            `SELECT current_streak FROM kid_dental_streaks WHERE child_name = $1`,
            [childLower]
          ).catch(() => [])
          const streak = streakRow2[0]?.current_streak || 1
          await createNotification({
            title: `${childDisplay} completed dental routine`,
            message: `${streak} day streak!`,
            source_type: 'dental_complete', source_ref: `dental-${childLower}-${today}`,
            link_tab: 'health', icon: '🦷',
          }).catch(e => console.error('Dental notify failed:', e.message))
        }

        return NextResponse.json({ success: true, completed: newCompleted })
      }

      case 'add_dental_note': {
        const { child, note } = body
        if (!child || !note) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        await query(
          `INSERT INTO kid_dental_notes (child_name, note) VALUES ($1, $2)`,
          [child.toLowerCase(), note]
        )
        return NextResponse.json({ success: true })
      }

      case 'delete_dental_note': {
        const { noteId } = body
        if (!noteId) return NextResponse.json({ error: 'Missing noteId' }, { status: 400 })
        await query(`DELETE FROM kid_dental_notes WHERE id = $1`, [noteId])
        return NextResponse.json({ success: true })
      }

      case 'update_dental_items': {
        // Parent toggles enabled/disabled for a dental item
        const { dentalItemId, enabled } = body
        if (!dentalItemId) return NextResponse.json({ error: 'Missing dentalItemId' }, { status: 400 })
        await query(`UPDATE kid_dental_items SET enabled = $1 WHERE id = $2`, [!!enabled, dentalItemId])
        return NextResponse.json({ success: true })
      }

      case 'add_dental_item': {
        const { child, itemName, timeOfDay } = body
        if (!child || !itemName || !timeOfDay) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        await query(
          `INSERT INTO kid_dental_items (child_name, item_name, time_of_day) VALUES ($1, $2, $3)`,
          [child.toLowerCase(), itemName, timeOfDay]
        )
        return NextResponse.json({ success: true })
      }

      // ── Fitness & Activity actions ──
      case 'log_activity': {
        const { child, activityType, durationMinutes, notes } = body
        if (!child || !activityType) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const result = await query(
          `INSERT INTO kid_activity_log (child_name, activity_type, duration_minutes, notes, log_date)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [child.toLowerCase(), activityType, durationMinutes || null, notes || null, today]
        )
        // NOTIFY-FIX-1b #7: Notify parent of activity log
        const actChildDisplay = child.charAt(0).toUpperCase() + child.slice(1).toLowerCase()
        await createNotification({
          title: `${actChildDisplay} logged activity`,
          message: `${durationMinutes || '?'}min of ${activityType}`,
          source_type: 'activity_logged', source_ref: `activity-${child.toLowerCase()}-${Date.now()}`,
          link_tab: 'health', icon: '🏃',
        }).catch(e => console.error('Activity notify failed:', e.message))

        return NextResponse.json({ success: true, id: result[0]?.id })
      }

      case 'delete_activity': {
        const { activityId } = body
        if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 })
        await query(`DELETE FROM kid_activity_log WHERE id = $1`, [activityId])
        return NextResponse.json({ success: true })
      }

      case 'log_mood': {
        const { child, mood, notes } = body
        if (!child || !mood) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await query(
          `INSERT INTO kid_mood_log (child_name, mood, log_date, notes)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (child_name, log_date)
           DO UPDATE SET mood = $2, notes = $4`,
          [child.toLowerCase(), mood, today, notes || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'log_wellness': {
        const { child, steps, waterCups, fastingStart, fastingEnd, weight, notes } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await query(
          `INSERT INTO kid_wellness_log (child_name, log_date, steps, water_cups, fasting_start, fasting_end, weight, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (child_name, log_date)
           DO UPDATE SET steps = COALESCE($3, kid_wellness_log.steps),
                         water_cups = COALESCE($4, kid_wellness_log.water_cups),
                         fasting_start = COALESCE($5, kid_wellness_log.fasting_start),
                         fasting_end = COALESCE($6, kid_wellness_log.fasting_end),
                         weight = COALESCE($7, kid_wellness_log.weight),
                         notes = COALESCE($8, kid_wellness_log.notes)`,
          [child.toLowerCase(), today, steps || null, waterCups || null, fastingStart || null, fastingEnd || null, weight || null, notes || null]
        )

        // NOTIFY-FIX-1c #10: Wellness concern alert (fasting >18hrs OR weight change >5%)
        const concerns: string[] = []
        if (fastingStart && fastingEnd) {
          const start = new Date(`${today}T${fastingStart}`)
          const end = new Date(`${today}T${fastingEnd}`)
          const hours = Math.abs(end.getTime() - start.getTime()) / 3600000
          if (hours > 18) concerns.push(`fasting duration: ${Math.round(hours)} hours`)
        }
        if (weight) {
          const prevWeight = await query(
            `SELECT weight FROM kid_wellness_log WHERE child_name = $1 AND weight IS NOT NULL AND log_date < $2 ORDER BY log_date DESC LIMIT 1`,
            [child.toLowerCase(), today]
          ).catch(() => [])
          if (prevWeight[0]?.weight) {
            const pctChange = Math.abs((weight - prevWeight[0].weight) / prevWeight[0].weight) * 100
            if (pctChange > 5) concerns.push(`weight change: ${pctChange.toFixed(1)}% from last entry`)
          }
        }
        if (concerns.length > 0) {
          const childDisplay = child.charAt(0).toUpperCase() + child.slice(1).toLowerCase()
          await createNotification({
            title: `${childDisplay} wellness may need review`,
            message: concerns.join(', '),
            source_type: 'wellness_concern', source_ref: `wellness-${child.toLowerCase()}-${today}`,
            link_tab: 'health', icon: '⚠️',
          }).catch(e => console.error('Wellness concern notify failed:', e.message))
        }

        return NextResponse.json({ success: true })
      }

      // ── Cycle Tracker actions ──
      case 'log_cycle_event': {
        const { child, eventType } = body
        if (!child || !eventType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await query(
          `INSERT INTO kid_cycle_log (kid_name, event_type, event_date) VALUES ($1, $2, $3)`,
          [child.toLowerCase(), eventType, today]
        )
        return NextResponse.json({ success: true })
      }

      case 'log_cycle_symptoms': {
        const { child, mood, cramps, flow, notes, irregularities, logDate } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        const date = logDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const irr = irregularities && irregularities.length > 0 ? irregularities : []
        await query(
          `INSERT INTO kid_cycle_symptoms (kid_name, log_date, mood, cramps, flow, notes, irregularities)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (kid_name, log_date)
           DO UPDATE SET mood = COALESCE($3, kid_cycle_symptoms.mood),
                         cramps = COALESCE($4, kid_cycle_symptoms.cramps),
                         flow = COALESCE($5, kid_cycle_symptoms.flow),
                         notes = COALESCE($6, kid_cycle_symptoms.notes),
                         irregularities = CASE WHEN $7::text[] = '{}' THEN kid_cycle_symptoms.irregularities ELSE $7::text[] END`,
          [child.toLowerCase(), date, mood || null, cramps ?? null, flow || null, notes || null, irr]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_cycle_mode': {
        const { child, mode } = body
        if (!child || !mode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        await query(
          `UPDATE kid_cycle_settings SET mode = $1, updated_at = NOW() WHERE kid_name = $2`,
          [mode, child.toLowerCase()]
        )
        return NextResponse.json({ success: true })
      }

      case 'add_kid_to_cycle_tracker': {
        const { child } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        await query(
          `INSERT INTO kid_cycle_settings (kid_name, mode) VALUES ($1, 'learning') ON CONFLICT DO NOTHING`,
          [child.toLowerCase()]
        )
        return NextResponse.json({ success: true })
      }

      case 'delete_cycle_entry': {
        const { entryId } = body
        if (!entryId) return NextResponse.json({ error: 'Missing entryId' }, { status: 400 })
        await query(`DELETE FROM kid_cycle_log WHERE id = $1`, [entryId])
        return NextResponse.json({ success: true })
      }

      case 'complete_cycle_onboarding': {
        const { child, regularity, lastPeriodStart, periodDuration, commonSymptoms } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        const childLower = child.toLowerCase()
        const dur = periodDuration === 7 ? 7 : periodDuration === 3 ? 3 : 5
        await query(
          `UPDATE kid_cycle_settings
           SET onboarded = TRUE, cycle_regularity = $1, avg_period_duration = $2, common_symptoms = $3, updated_at = NOW()
           WHERE kid_name = $4`,
          [regularity || 'unknown', dur, commonSymptoms || [], childLower]
        )
        // Insert initial start event if provided
        if (lastPeriodStart) {
          await query(
            `INSERT INTO kid_cycle_log (kid_name, event_type, event_date) VALUES ($1, 'start', $2)`,
            [childLower, lastPeriodStart]
          )
          // Insert end event at start + duration
          await query(
            `INSERT INTO kid_cycle_log (kid_name, event_type, event_date) VALUES ($1, 'end', $2::date + $3::int)`,
            [childLower, lastPeriodStart, dur]
          )
        }
        return NextResponse.json({ success: true })
      }

      case 'skip_cycle_onboarding': {
        // "Not yet" path — mark onboarded but keep in learning-like state
        const { child } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        await query(
          `UPDATE kid_cycle_settings SET onboarded = TRUE, updated_at = NOW() WHERE kid_name = $1`,
          [child.toLowerCase()]
        )
        return NextResponse.json({ success: true })
      }

      case 'update_cycle_settings': {
        // Parent edits onboarding answers
        const { child, avgCycleLength, avgPeriodDuration, cycleRegularity, commonSymptoms } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        await query(
          `UPDATE kid_cycle_settings
           SET avg_cycle_length = COALESCE($1, avg_cycle_length),
               avg_period_duration = COALESCE($2, avg_period_duration),
               cycle_regularity = COALESCE($3, cycle_regularity),
               common_symptoms = COALESCE($4, common_symptoms),
               updated_at = NOW()
           WHERE kid_name = $5`,
          [avgCycleLength || null, avgPeriodDuration || null, cycleRegularity || null, commonSymptoms || null, child.toLowerCase()]
        )
        return NextResponse.json({ success: true })
      }

      case 'generate_cycle_report': {
        const { child } = body
        if (!child) return NextResponse.json({ error: 'Missing child' }, { status: 400 })
        const childLower = child.toLowerCase()
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const startDate = sixMonthsAgo.toISOString().slice(0, 10)

        const settings = await query(`SELECT * FROM kid_cycle_settings WHERE kid_name = $1`, [childLower])
        const logs = await query(
          `SELECT event_type, event_date FROM kid_cycle_log WHERE kid_name = $1 AND event_date >= $2 ORDER BY event_date ASC`,
          [childLower, startDate]
        )
        const symptoms = await query(
          `SELECT log_date, mood, cramps, flow, notes, irregularities FROM kid_cycle_symptoms
           WHERE kid_name = $1 AND log_date >= $2 ORDER BY log_date ASC`,
          [childLower, startDate]
        )
        // Product + OTC summaries for report
        const products = await query(
          `SELECT product_type, SUM(quantity) as total FROM kid_cycle_products
           WHERE kid_name = $1 AND log_date >= $2 GROUP BY product_type ORDER BY total DESC`,
          [childLower, startDate]
        ).catch(() => [])
        const otcMeds = await query(
          `SELECT medication, COUNT(*) as count, COUNT(*) FILTER (WHERE helped = TRUE) as helped_count
           FROM kid_cycle_otc_meds WHERE kid_name = $1 AND log_date >= $2
           GROUP BY medication ORDER BY count DESC`,
          [childLower, startDate]
        ).catch(() => [])
        return NextResponse.json({ settings: settings[0] || null, logs, symptoms, products, otcMeds })
      }

      // ── Cycle Product + OTC actions ──
      case 'log_cycle_product': {
        const { child, logDate, productType, productDetail, quantity, notes } = body
        if (!child || !logDate || !productType) return NextResponse.json({ error: 'child, logDate, productType required' }, { status: 400 })
        await query(`CREATE TABLE IF NOT EXISTS kid_cycle_products (
          id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, log_date DATE NOT NULL,
          product_type TEXT NOT NULL, product_detail TEXT, quantity INTEGER DEFAULT 1,
          notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`)
        const rows = await query(
          `INSERT INTO kid_cycle_products (kid_name, log_date, product_type, product_detail, quantity, notes)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [child.toLowerCase(), logDate, productType, productDetail || null, quantity || 1, notes || null]
        )
        return NextResponse.json({ success: true, entry: rows[0] })
      }

      case 'get_cycle_products': {
        const { child, days } = body
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const lookback = days || 90
        const rows = await query(
          `SELECT id, kid_name, log_date, product_type, product_detail, quantity, notes, created_at
           FROM kid_cycle_products WHERE kid_name = $1 AND log_date >= (CURRENT_DATE - $2::int)
           ORDER BY log_date DESC, id DESC`,
          [child.toLowerCase(), lookback]
        ).catch(() => [])
        return NextResponse.json({ products: rows })
      }

      case 'delete_cycle_product': {
        const { entryId } = body
        if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })
        await query(`DELETE FROM kid_cycle_products WHERE id = $1`, [entryId])
        return NextResponse.json({ success: true })
      }

      case 'log_cycle_otc': {
        const { child, logDate, medication, dosage, timeTaken, helped, notes } = body
        if (!child || !logDate || !medication) return NextResponse.json({ error: 'child, logDate, medication required' }, { status: 400 })
        await query(`CREATE TABLE IF NOT EXISTS kid_cycle_otc_meds (
          id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, log_date DATE NOT NULL,
          medication TEXT NOT NULL, dosage TEXT, time_taken TEXT, helped BOOLEAN,
          notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`)
        const rows = await query(
          `INSERT INTO kid_cycle_otc_meds (kid_name, log_date, medication, dosage, time_taken, helped, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [child.toLowerCase(), logDate, medication, dosage || null, timeTaken || null, helped ?? null, notes || null]
        )
        return NextResponse.json({ success: true, entry: rows[0] })
      }

      case 'get_cycle_otc': {
        const { child, days } = body
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const lookback = days || 90
        const rows = await query(
          `SELECT id, kid_name, log_date, medication, dosage, time_taken, helped, notes, created_at
           FROM kid_cycle_otc_meds WHERE kid_name = $1 AND log_date >= (CURRENT_DATE - $2::int)
           ORDER BY log_date DESC, id DESC`,
          [child.toLowerCase(), lookback]
        ).catch(() => [])
        return NextResponse.json({ otcMeds: rows })
      }

      case 'delete_cycle_otc': {
        const { entryId } = body
        if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })
        await query(`DELETE FROM kid_cycle_otc_meds WHERE id = $1`, [entryId])
        return NextResponse.json({ success: true })
      }

      case 'get_cycle_overview': {
        // Parent portal: all kids with full settings + recent log + irregularity counts
        const settings = await query(
          `SELECT kid_name, mode, onboarded, avg_cycle_length, avg_period_duration, cycle_regularity, common_symptoms, updated_at
           FROM kid_cycle_settings ORDER BY kid_name`
        )
        const recentLogs = await query(
          `SELECT kid_name, event_type, event_date FROM kid_cycle_log ORDER BY event_date DESC, id DESC LIMIT 30`
        )
        // Count irregularities in last 60 days per kid
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        const irrCounts = await query(
          `SELECT kid_name, COUNT(*) as count FROM kid_cycle_symptoms
           WHERE log_date >= $1 AND irregularities != '{}' AND array_length(irregularities, 1) > 0
           GROUP BY kid_name`,
          [sixtyDaysAgo.toISOString().slice(0, 10)]
        )
        const irrMap: Record<string, number> = {}
        irrCounts.forEach((r: any) => { irrMap[r.kid_name] = parseInt(r.count) })
        return NextResponse.json({ settings, recentLogs, irregularityCounts: irrMap })
      }

      // ── Parent portal overview actions ──
      case 'get_dental_overview': {
        const kids = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
        const streaks = await query(`SELECT child_name, current_streak, longest_streak FROM kid_dental_streaks ORDER BY child_name`)
        const items = await query(`SELECT id, child_name, item_name, time_of_day, enabled, sort_order FROM kid_dental_items ORDER BY child_name, sort_order`)
        const notes = await query(`SELECT id, child_name, note, created_at FROM kid_dental_notes ORDER BY child_name, created_at DESC`)
        return NextResponse.json({ streaks, items, notes, kids })
      }

      case 'get_activity_mood_overview': {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        // Last 7 days of moods for all kids
        const moods = await query(
          `SELECT child_name, mood, log_date FROM kid_mood_log
           WHERE log_date >= ($1::date - interval '6 days') AND log_date <= $1::date
           ORDER BY child_name, log_date ASC`,
          [today]
        )
        // Today's activity counts per kid
        const activities = await query(
          `SELECT child_name, COUNT(*) as count, SUM(duration_minutes) as total_minutes
           FROM kid_activity_log WHERE log_date = $1
           GROUP BY child_name`,
          [today]
        )
        return NextResponse.json({ moods, activities })
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
