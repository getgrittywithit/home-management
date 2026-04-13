import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getKidZone } from '@/lib/zoneRotation'
import { createNotification } from '@/lib/notifications'
import { checkDailyPatterns, computeVelocity } from '@/lib/pattern-detection'
import { checkAchievements } from '@/lib/achievement-checker'
import { checkBonusStar } from '@/lib/bonus-stars'

// Belle care weekday assignments
const BELLE_WEEKDAY: Record<number, string> = { 1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie' }
const BELLE_WEEKEND_ROTATION = ['hannah', 'wyatt', 'amos', 'kaylee', 'ellie']
const BELLE_ANCHOR = new Date(2026, 2, 28) // Saturday March 28, 2026 = Week 1

function getBelleHelper(date: Date): string {
  const day = date.getDay()
  if (day >= 1 && day <= 5) return BELLE_WEEKDAY[day]
  // Weekend — always use Saturday
  const sat = new Date(date)
  if (sat.getDay() === 0) sat.setDate(sat.getDate() - 1) // Sunday → preceding Saturday
  const weeks = Math.floor((sat.getTime() - BELLE_ANCHOR.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const idx = (((weeks % 5) + 5) % 5) // No offset — anchor IS week 1 = index 0
  return BELLE_WEEKEND_ROTATION[idx]
}

// Dishes assignments (fixed daily)
const DISHES: Record<string, string[]> = {
  breakfast: ['amos', 'wyatt'],
  lunch: ['ellie', 'hannah'],
  dinner: ['zoey', 'kaylee'],
}

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

// Dinner Manager — day-gated per fixed weekly schedule
const DINNER_MANAGER: Record<number, string[]> = {
  0: [],             // Sunday = Dad
  1: ['kaylee'],     // Monday
  2: ['zoey'],       // Tuesday
  3: ['wyatt'],      // Wednesday
  4: ['amos'],       // Thursday
  5: ['ellie', 'hannah'], // Friday — shared
  6: [],             // Saturday = Mom
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const child = searchParams.get('child')?.toLowerCase() || searchParams.get('childName')?.toLowerCase()
    const dateParam = searchParams.get('date')

    // All kids completion overview for the current week
    // D62 KDT-1..3: Returns 4 buckets (zone, dailyCare, school, petCare) per kid
    //               plus categorized tasks for the parent detail panel.
    if (action === 'get_all_completion') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const today = now.toLocaleDateString('en-CA')
      const dow = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((dow + 6) % 7))
      const weekStart = monday.toLocaleDateString('en-CA')
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekEnd = sunday.toLocaleDateString('en-CA')
      const isWeekday = dow >= 1 && dow <= 5
      const belleHelper = getBelleHelper(now)
      const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat']
      const todayDayKey = DAY_KEYS[dow]

      // Categorize an event_id into one of the 4 column buckets.
      // zone    — rotating zone chores + dishes/dinner manager/evening tidy/school room clean
      // care    — personal hygiene, meds, skincare, helper-style tasks (plant patrol)
      // pet     — animal care (belle, spike, hades, midnight, pet-*)
      // school  — homeschool tasks (tracked separately in homeschool_task_completions, not here)
      const categorizeEvent = (eventId: string): 'zone' | 'care' | 'pet' | 'other' => {
        const e = eventId.toLowerCase()
        if (e.startsWith('zone-') || e.startsWith('dishes-') || e.startsWith('dinner-')
          || e.startsWith('schoolroom-') || e.startsWith('school-clean') || e.startsWith('tidy-')
          || e.startsWith('evening-tidy') || e.startsWith('laundry-')) return 'zone'
        if (e.startsWith('belle-') || e.startsWith('spike-') || e.startsWith('hades-')
          || e.startsWith('midnight-') || e.startsWith('pet-')) return 'pet'
        if (e.startsWith('hygiene-') || e.startsWith('med-') || e.startsWith('skincare-')
          || e.startsWith('plant-patrol')) return 'care'
        return 'other'
      }

      try {
        // Get DB completion rows for the week (for the week-count legacy path)
        const rows = await db.query(
          `SELECT child_name, event_id, completed FROM kid_daily_checklist WHERE event_date >= $1 AND event_date <= $2`,
          [weekStart, weekEnd]
        )

        // Expected task counts per kid for TODAY, split across the 4 buckets
        const getExpected = (kid: string): { zone: number; care: number; pet: number } => {
          let zone = 0
          let care = 2 // Morning + Bedtime hygiene always
          let pet = 0
          if (getKidZone(kid.charAt(0).toUpperCase() + kid.slice(1))) zone += 2 // zone AM + PM
          if (DISHES.breakfast.includes(kid)) zone++
          if (DISHES.lunch.includes(kid)) zone++
          if (DISHES.dinner.includes(kid)) zone++
          if ((DINNER_MANAGER[dow] || []).includes(kid)) zone++
          zone++ // Evening tidy (always)
          if (HOMESCHOOL_KIDS.includes(kid) && isWeekday) zone++ // School room clean
          if (belleHelper === kid) pet += 2 // Belle AM + PM
          if (kid === 'amos') pet++ // Spike primary
          if (kid === 'kaylee' || kid === 'wyatt') pet++ // Spike helper
          if (kid === 'ellie') pet++ // Midnight primary
          if (kid === 'hannah') pet++ // Midnight helper
          if (kid === 'zoey') pet++ // Hades sole caretaker
          return { zone, care, pet }
        }

        // Fetch today's individual task details for the expanded detail panel
        const todayRows = await db.query(
          `SELECT child_name, event_id, event_summary, completed FROM kid_daily_checklist WHERE event_date = $1`,
          [today]
        ).catch(() => [])

        // KDT-2: school task progress for homeschool kids (today's applicable tasks only)
        let schoolByKid: Record<string, { done: number; total: number; tasks: any[] }> = {}
        try {
          const schoolTaskRows = await db.query(
            `SELECT t.id, t.kid_name, t.task_label, t.subject, t.duration_min,
                    CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS completed,
                    c.completed_at
             FROM homeschool_tasks t
             LEFT JOIN homeschool_task_completions c
               ON c.task_id = t.id AND c.kid_name = t.kid_name AND c.task_date = CURRENT_DATE
             WHERE t.active = true
               AND (t.is_recurring = false OR $1 = ANY(t.recurrence_days))
             ORDER BY t.kid_name, t.subject, t.sort_order`,
            [todayDayKey]
          )
          for (const r of (schoolTaskRows as any[])) {
            const k = (r.kid_name || '').toLowerCase()
            if (!schoolByKid[k]) schoolByKid[k] = { done: 0, total: 0, tasks: [] }
            schoolByKid[k].total++
            if (r.completed) schoolByKid[k].done++
            schoolByKid[k].tasks.push({
              id: r.id,
              event_id: `hs-${r.id}`,
              summary: `${r.subject}: ${r.task_label}`,
              title: r.task_label,
              completed: !!r.completed,
              category: 'school',
              subject: r.subject,
            })
          }
        } catch (e) {
          console.error('[checklist] school task fetch failed:', e)
        }

        const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee'].map(kid => {
          const kidRows = (rows as any[]).filter((r: any) => r.child_name === kid)
          const expected = getExpected(kid)

          // Bucketed week counts (from kid_daily_checklist rows)
          const bucketRows = { zone: [] as any[], care: [] as any[], pet: [] as any[] }
          for (const r of kidRows) {
            const cat = categorizeEvent(r.event_id)
            if (cat !== 'other') bucketRows[cat].push(r)
          }

          // Today's tasks, categorized for the detail panel
          const todayKidRows = (todayRows as any[]).filter((r: any) => r.child_name === kid)
          const taskCategoryMap: Record<string, string> = {
            zone: 'zone', care: 'care', pet: 'pet', other: 'other',
          }
          const routineTasks = todayKidRows.map((r: any) => ({
            id: r.event_id,
            event_id: r.event_id,
            summary: r.event_summary || r.event_id.replace(/-/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
            title: r.event_summary || r.event_id,
            completed: !!r.completed,
            category: taskCategoryMap[categorizeEvent(r.event_id)] || 'other',
          }))

          const schoolEntry = schoolByKid[kid] || { done: 0, total: 0, tasks: [] }
          const tasks = [...routineTasks, ...schoolEntry.tasks]

          return {
            name: kid,
            zone: {
              done: bucketRows.zone.filter((r: any) => r.completed).length,
              total: Math.max(bucketRows.zone.length, expected.zone),
            },
            dailyCare: {
              done: bucketRows.care.filter((r: any) => r.completed).length,
              total: Math.max(bucketRows.care.length, expected.care),
            },
            school: HOMESCHOOL_KIDS.includes(kid)
              ? { done: schoolEntry.done, total: schoolEntry.total }
              : { done: 0, total: 0, hidden: true }, // non-homeschool kids render as —
            petCare: {
              done: bucketRows.pet.filter((r: any) => r.completed).length,
              total: Math.max(bucketRows.pet.length, expected.pet),
            },
            // Legacy shape for anything still reading the old fields
            required: {
              done: bucketRows.zone.filter((r: any) => r.completed).length,
              total: Math.max(bucketRows.zone.length, expected.zone),
            },
            earnMoney: { done: 0, total: 0 },
            tasks,
          }
        })
        return NextResponse.json({ weekOf: weekStart, kids })
      } catch (err) {
        console.error('[checklist] get_all_completion error:', err)
        return NextResponse.json({ weekOf: weekStart, kids: [] })
      }
    }

    if (action === 'today_zone_status') {
      const kids = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      const zones: any[] = []
      for (const kid of kids) {
        const zone = getKidZone(kid.charAt(0).toUpperCase() + kid.slice(1))
        if (!zone) continue

        // Count zone tasks completed today
        try {
          const rows = await db.query(
            `SELECT COUNT(*)::int as total,
                    COUNT(*) FILTER (WHERE completed = TRUE)::int as done
             FROM kid_daily_checklist
             WHERE child_name = $1 AND event_date = $2 AND event_id LIKE 'zone-%'`,
            [kid, today]
          )
          const total = rows[0]?.total || 0
          const done = rows[0]?.done || 0
          zones.push({
            kid_name: kid,
            zone_name: zone,
            task_count: total,
            completed_count: done,
            status: total === 0 ? 'not_started' : done === total ? 'done' : done > 0 ? 'in_progress' : 'not_started'
          })
        } catch {
          zones.push({ kid_name: kid, zone_name: zone, task_count: 0, completed_count: 0, status: 'not_started' })
        }
      }
      return NextResponse.json({ zones })
    }

    if (!child) {
      return NextResponse.json({ error: 'child required' }, { status: 400 })
    }

    const today = dateParam || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const todayDate = new Date(today + 'T12:00:00')
    const dayOfWeek = todayDate.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

    // GAP-13: Check for sick day — reduce checklist to essentials
    let isSickDay = false
    let sickDayStatus = ''
    try {
      const sickCheck = await db.query(
        `SELECT status FROM kid_sick_days WHERE kid_name = $1 AND sick_date = $2 LIMIT 1`,
        [child, today]
      )
      if (sickCheck.length > 0 && sickCheck[0].status !== 'overridden') {
        isSickDay = true
        sickDayStatus = sickCheck[0].status || 'active'
      }
    } catch {}

    // ── Tier 1: Required tasks ──
    const required: any[] = []

    // GAP-13: If sick day, skip zone/dishes/belle/school tasks
    if (isSickDay) {
      // Sick day — only include meds + basic hygiene in dailyCare
      const dailyCare: any[] = [
        { id: `hygiene-morning-${today}`, title: 'Morning Routine', description: 'Brush teeth, get dressed', category: 'hygiene', time: '7:00 AM' },
        { id: `hygiene-bedtime-${today}`, title: 'Bedtime Routine', description: 'Brush teeth, pajamas', category: 'hygiene', time: '8:30 PM' },
      ]

      // Still include meds (unless paused)
      const MED_KIDS = ['amos', 'wyatt']
      if (MED_KIDS.includes(child)) {
        const pausedMeds = await db.query(
          `SELECT med_key FROM paused_medications WHERE kid_name = $1 AND is_paused = true`, [child]
        ).catch(() => [])
        const pausedKeys = new Set(pausedMeds.map((p: any) => p.med_key))
        if (!pausedKeys.has('am')) {
          dailyCare.push({ id: `med-am-${today}`, title: `💊 Morning Focalin`, category: 'hygiene', time: '7:00 AM' })
        }
        if (!pausedKeys.has('pm')) {
          dailyCare.push({ id: `med-pm-${today}`, title: `💊 Evening Clonidine`, category: 'hygiene', time: '8:00 PM' })
        }
      }

      // Load completion states
      const completions = await db.query(
        `SELECT event_id, completed, substep_progress FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2`,
        [child, today]
      ).catch(() => [])
      const completionMap = new Map<string, any>()
      completions.forEach((c: any) => completionMap.set(c.event_id, c))

      const mapCompletion = (items: any[]) => items.map(item => ({
        ...item, completed: completionMap.get(item.id)?.completed || false,
      }))

      return NextResponse.json({
        required: [],
        dailyCare: mapCompletion(dailyCare),
        earnMoney: [],
        allRequiredDone: true,
        zone: null,
        isSickDay: true,
        stats: { requiredTotal: 0, requiredDone: 0, dailyCareTotal: dailyCare.length, dailyCareDone: mapCompletion(dailyCare).filter(d => d.completed).length, earnMoneyTotal: 0, earnMoneyDone: 0 },
      })
    }

    // Zone chores
    const zone = getKidZone(child.charAt(0).toUpperCase() + child.slice(1))
    if (zone) {
      required.push({
        id: `zone-morning-${today}`,
        title: `Morning Zone Chores: ${zone}`,
        description: `Complete your ${zone} zone checklist`,
        category: 'zone',
        time: '8:00 AM',
      })
      required.push({
        id: `zone-afternoon-${today}`,
        title: `Afternoon Zone Chores: ${zone}`,
        description: `Afternoon ${zone} zone tasks`,
        category: 'zone',
        time: '3:00 PM',
      })
    }

    // Dish duty — expandable zone cards
    if (DISHES.breakfast.includes(child)) {
      required.push({
        id: `dishes-breakfast-${today}`,
        title: 'Breakfast Dishes',
        description: 'Wash 5 items, dry, put away, wipe counters, flip dishwasher',
        category: 'dishes',
        time: '8:00 AM',
      })
    }
    if (DISHES.lunch.includes(child)) {
      required.push({
        id: `dishes-lunch-${today}`,
        title: 'Lunch Dishes',
        description: 'Wash 5 items, dry, put away, wipe counters, check dishwasher',
        category: 'dishes',
        time: '12:00 PM',
      })
    }
    if (DISHES.dinner.includes(child)) {
      required.push({
        id: `dishes-evening-${today}`,
        title: 'Evening Dishes',
        description: 'Wash 5 items, dry, put away, wipe everything, flip dishwasher',
        category: 'dishes',
        time: 'After dinner',
      })
    }

    if ((DINNER_MANAGER[dayOfWeek] || []).includes(child)) {
      required.push({
        id: `dinner-manager-${today}`,
        title: 'Dinner Manager',
        description: 'Set up, cook assist, clean up after dinner',
        category: 'dishes',
        time: '5:00 PM',
      })
    }

    // Laundry — day-gated per kid_laundry_schedule
    try {
      const laundryRows = await db.query(
        `SELECT laundry_days, extra_duty FROM kid_laundry_schedule WHERE kid_name = $1`,
        [child]
      )
      if (laundryRows.length > 0 && (laundryRows[0].laundry_days || []).includes(dayOfWeek)) {
        required.push({
          id: `laundry-${today}`,
          title: 'Laundry Day',
          description: 'Collect, sort, wash, dry, fold, put away — all same day',
          category: 'tidy',
          time: '9:00 AM',
        })
      }
    } catch { /* laundry schedule table may not exist */ }

    // Belle care — check for accepted swaps first (BELLE-3)
    let belleAssignee = getBelleHelper(todayDate)
    try {
      const swapResult = await db.query(
        `SELECT covering_kid FROM belle_care_swaps WHERE swap_date = $1 AND status = 'accepted' ORDER BY responded_at DESC LIMIT 1`,
        [today]
      )
      if (swapResult.length > 0) belleAssignee = swapResult[0].covering_kid
    } catch {}
    if (belleAssignee === child) {
      required.push({
        id: `belle-am-${today}`, title: 'Belle Care — AM Feed + Walk',
        description: 'Feed Belle and take her for a walk', category: 'belle', time: '7:00 AM',
      })
      required.push({
        id: `belle-pm-${today}`, title: 'Belle Care — PM Feed + Walk',
        description: 'Evening feed and walk', category: 'belle', time: '5:00 PM',
      })
    }

    // Pet care — Hades (Zoey only)
    if (child === 'zoey') {
      required.push({
        id: `pet-hades-${today}`, title: 'Hades Care 🐍',
        description: 'Water, temps, health check, tank maintenance', category: 'pet', time: '8:00 AM',
      })
    }

    // Pet care — Spike (Amos primary, Kaylee + Wyatt helpers)
    if (child === 'amos') {
      required.push({
        id: `pet-spike-${today}`, title: 'Spike Care 🦎',
        description: 'UVB, greens, temps, spot clean, handling', category: 'pet', time: '8:00 AM',
      })
    }
    if (child === 'kaylee' || child === 'wyatt') {
      required.push({
        id: `pet-spike-helper-${today}`, title: 'Spike Helper Check 🦎',
        description: 'Quick check on water, food, and visual health', category: 'pet', time: '3:00 PM',
      })
    }

    // Pet care — Midnight (Ellie + Hannah shared)
    if (child === 'ellie' || child === 'hannah') {
      required.push({
        id: `pet-midnight-${today}`, title: 'Midnight Care 🐰',
        description: 'Hay, water, veggies, droppings check, cage care', category: 'pet', time: '8:00 AM',
      })
    }

    // Evening Tidy (daily for everyone)
    required.push({
      id: `evening-tidy-${today}`, title: 'Evening Tidy & Reset',
      description: 'Help tidy the house before bedtime', category: 'tidy', time: '6:00 PM',
    })

    // School Room Group Clean (homeschool only, weekdays)
    if (HOMESCHOOL_KIDS.includes(child) && isWeekday) {
      required.push({
        id: `school-clean-${today}`, title: 'School Room Group Clean',
        description: 'Clean up the school room together', category: 'school_clean', time: '2:00 PM',
      })
    }

    // Parent-added tasks
    const parentTasks = await db.query(
      `SELECT id, title, description FROM parent_tasks
       WHERE child_name = $1 AND is_active = TRUE
       AND (task_date = $2 OR (recurring = TRUE AND task_date IS NULL))`,
      [child, today]
    )
    parentTasks.forEach((t: any) => {
      required.push({ id: `parent-${t.id}`, title: t.title, description: t.description, category: 'parent_task' })
    })

    // ── Tier 2: Daily Care ──
    const dailyCare: any[] = [
      { id: `hygiene-morning-${today}`, title: 'Morning Routine', description: 'Brush teeth, get dressed, make bed', category: 'hygiene', time: '7:00 AM' },
      { id: `hygiene-bedtime-${today}`, title: 'Bedtime Routine', description: 'Brush teeth, pajamas, wind down', category: 'hygiene', time: '8:30 PM' },
    ]

    // ── Medications ──
    // Known medications for kids with active prescriptions
    const MEDICATION_MAP: Record<string, { am?: string; pm?: string }> = {
      amos: { am: 'Focalin (morning dose)', pm: 'Clonidine (evening dose)' },
      wyatt: { am: 'Focalin (morning dose)', pm: 'Clonidine (evening dose)' },
    }
    const kidMeds = MEDICATION_MAP[child]
    if (kidMeds) {
      // Ensure paused_medications table exists + seed initial pauses (insurance denial)
      await db.query(`CREATE TABLE IF NOT EXISTS paused_medications (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, med_key TEXT NOT NULL, med_label TEXT, is_paused BOOLEAN DEFAULT true, paused_at TIMESTAMPTZ DEFAULT NOW(), resumed_at TIMESTAMPTZ, pause_reason TEXT, UNIQUE(kid_name, med_key))`).catch(() => {})
      // Auto-pause Amos + Wyatt meds (insurance denial — one-time seed)
      for (const k of ['amos', 'wyatt']) {
        for (const m of [{ key: 'am', label: 'Focalin (morning dose)' }, { key: 'pm', label: 'Clonidine (evening dose)' }]) {
          await db.query(
            `INSERT INTO paused_medications (kid_name, med_key, med_label, is_paused, pause_reason) VALUES ($1, $2, $3, true, 'Insurance denial, awaiting re-approval') ON CONFLICT (kid_name, med_key) DO NOTHING`,
            [k, m.key, m.label]
          ).catch(() => {})
        }
      }
      // Check for paused medications
      const pausedMeds = await db.query(
        `SELECT med_key FROM paused_medications WHERE kid_name = $1 AND is_paused = true`, [child]
      ).catch(() => [])
      const pausedKeys = new Set(pausedMeds.map((p: any) => p.med_key))

      if (kidMeds.am && !pausedKeys.has('am')) {
        required.push({
          id: `med-am-${today}`, title: `💊 ${kidMeds.am}`,
          description: 'Take with breakfast', category: 'hygiene', time: '7:30 AM',
        })
      }
      if (kidMeds.pm && !pausedKeys.has('pm')) {
        required.push({
          id: `med-pm-${today}`, title: `💊 ${kidMeds.pm}`,
          description: 'Take before bed', category: 'hygiene', time: '8:00 PM',
        })
      }
    }
    // Hannah: skincare routine from health conditions
    if (child === 'hannah') {
      dailyCare.push(
        { id: `skincare-am-${today}`, title: '🧴 Morning Skincare Routine', description: 'Wash face, apply moisturizer, sunscreen', category: 'hygiene', time: '7:15 AM' },
        { id: `skincare-pm-${today}`, title: '🧴 Evening Skincare Routine', description: 'Wash face, apply treatment, moisturizer', category: 'hygiene', time: '8:15 PM' },
      )

      // ZONE-7: Plant Patrol — helper role, Mon/Wed/Fri/Sat, 10–15 min
      // Separate from the zone rotation — Hannah loves plants
      const HANNAH_PLANT_DAYS: Record<number, string> = {
        1: 'Front room / plant room / school room',
        3: 'Kitchen + dining room',
        5: 'Hallway + entryway + porch',
        6: 'Master bathroom + master bedroom + backyard',
      }
      const todayDow = new Date(today + 'T12:00:00').getDay()
      const plantArea = HANNAH_PLANT_DAYS[todayDow]
      if (plantArea) {
        required.push({
          id: `plant-patrol-${today}`,
          title: `🪴 Plant Patrol — ${plantArea}`,
          description: 'Spend 10–15 min checking plants in this area. Pick up dead leaves, clean up dirt, check if soil looks dry. Tell Mom which plants might need water — never water alone until Mom says you are ready.',
          category: 'parent_task',
          time: '3:30 PM',
        })
      }
    }

    // Also try to pull active meds from DB (student_profiles.active_meds)
    try {
      const dbMeds = await db.query(
        `SELECT active_meds FROM student_profiles WHERE LOWER(first_name) = $1 AND active_meds IS NOT NULL AND active_meds != '{}'`,
        [child]
      )
      if (dbMeds.length > 0 && dbMeds[0].active_meds) {
        const meds = dbMeds[0].active_meds
        if (Array.isArray(meds)) {
          meds.forEach((med: any, idx: number) => {
            const medName = typeof med === 'string' ? med : med.name || med.medication
            const medTime = typeof med === 'object' && med.time_of_day ? med.time_of_day : null
            // Skip if we already added it from the static map
            const alreadyAdded = required.some(r => r.id.startsWith('med-') && r.title.toLowerCase().includes(medName?.toLowerCase?.() || ''))
            if (medName && !alreadyAdded) {
              required.push({
                id: `med-db-${idx}-${today}`, title: `💊 ${medName}`,
                description: medTime === 'pm' ? 'Take before bed' : 'Take as prescribed',
                category: 'hygiene',
                time: medTime === 'pm' ? '8:00 PM' : '7:30 AM',
              })
            }
          })
        }
      }
    } catch { /* student_profiles.active_meds column may not exist */ }

    // Also pull daily care items from student_health_conditions
    try {
      const careItems = await db.query(
        `SELECT condition_label, notes, condition_type FROM student_health_conditions
         WHERE LOWER(kid_name) = $1`,
        [child]
      ).catch(() => [])
      careItems.forEach((item: any, idx: number) => {
        const label = item.condition_label || ''
        const alreadyAdded = dailyCare.some(d => d.title.toLowerCase().includes(label.toLowerCase()))
        if (label && !alreadyAdded) {
          dailyCare.push({
            id: `health-care-${idx}-${today}`,
            title: `💊 ${label}`,
            description: item.notes || '',
            category: 'hygiene',
            time: '7:15 AM',
          })
        }
      })
    } catch { /* student_health_conditions table may not exist */ }

    // ── Tier 3: Earn Money ──
    const earnMoney = await db.query(
      `SELECT id, title, description, COALESCE(point_value, points, 10) as points FROM earn_money_chores WHERE child_name = $1 AND is_active = TRUE ORDER BY title`,
      [child]
    )
    const earnMoneyItems = earnMoney.map((c: any) => ({
      id: `earn-${c.id}`, title: c.title, description: c.description, points: c.points, category: 'earn_money',
    }))

    // ── Sort by time (earliest to latest) ──
    const parseTime = (t?: string): number => {
      if (!t) return 9999
      const lower = t.toLowerCase()
      if (lower === 'after dinner') return 1900
      const match = lower.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
      if (!match) return 9999
      let hours = parseInt(match[1])
      const mins = parseInt(match[2])
      if (match[3] === 'pm' && hours !== 12) hours += 12
      if (match[3] === 'am' && hours === 12) hours = 0
      return hours * 60 + mins
    }
    required.sort((a, b) => parseTime(a.time) - parseTime(b.time))
    dailyCare.sort((a, b) => parseTime(a.time) - parseTime(b.time))

    // ── Completions ──
    const completions = await db.query(
      `SELECT event_id, completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2`,
      [child, today]
    )
    const completionMap: Record<string, boolean> = {}
    completions.forEach((r: any) => { completionMap[r.event_id] = r.completed })

    const addStatus = (items: any[]) => items.map(item => ({ ...item, completed: !!completionMap[item.id] }))

    // ── Load task instructions ──
    let instructionMap: Record<string, string[]> = {}
    try {
      const instrRows = await db.query(`SELECT task_source, task_key, steps FROM task_instructions`)
      for (const row of instrRows) {
        let steps: string[] = []
        try {
          steps = typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps
        } catch { steps = [] }
        if (Array.isArray(steps)) instructionMap[`${row.task_source}:${row.task_key}`] = steps
      }
    } catch { /* task_instructions table may not exist */ }

    // Map instructions onto checklist items
    const addInstructions = (items: any[]) => items.map(item => {
      const id = item.id || ''
      const cat = item.category || ''
      let instructions: string[] | null = null

      // Try ID-based lookup first
      if (id.startsWith('zone-')) instructions = instructionMap[`zone:${zone?.toLowerCase()}`] || null
      else if (id.startsWith('dishes-breakfast')) instructions = instructionMap['chore:dishes_breakfast'] || null
      else if (id.startsWith('dishes-lunch')) instructions = instructionMap['chore:dishes_lunch'] || null
      else if (id.startsWith('dishes-evening')) instructions = instructionMap['chore:dishes_evening'] || null
      else if (id.startsWith('dinner-manager')) instructions = instructionMap['duty:dinner_manager_help'] || null
      else if (id.startsWith('laundry-')) instructions = instructionMap['duty:laundry_help'] || null
      else if (id.startsWith('belle-am')) instructions = instructionMap['belle:am_feed_walk'] || null
      else if (id.startsWith('belle-pm')) instructions = instructionMap['belle:pm_feed'] || instructionMap['belle:pm_walk'] || null
      else if (id.startsWith('pet-hades')) instructions = instructionMap['pet:hades_water'] || null
      else if (id.startsWith('pet-spike-helper')) instructions = instructionMap['pet:spike_water'] || null
      else if (id.startsWith('pet-spike')) instructions = instructionMap['pet:spike_feed'] || null
      else if (id.startsWith('pet-midnight')) instructions = instructionMap['pet:midnight_hay'] || null
      else if (id.startsWith('hygiene-morning')) instructions = instructionMap['hygiene:morning_routine'] || null
      else if (id.startsWith('hygiene-bedtime')) instructions = instructionMap['hygiene:bedtime_routine'] || null
      else if (id.startsWith('evening-tidy') || id.startsWith('tidy-evening')) instructions = instructionMap['routine:evening_tidy'] || null
      else if (id.startsWith('school-clean')) instructions = instructionMap['zone:school_room'] || null
      else if (id.startsWith('skincare-')) instructions = instructionMap['hygiene:shower'] || null

      return { ...item, instructions }
    })

    const requiredWithStatus = addInstructions(addStatus(required))
    const allRequiredDone = requiredWithStatus.every((t: any) => t.completed)

    return NextResponse.json({
      childName: child, date: today, zone,
      required: requiredWithStatus,
      dailyCare: addInstructions(addStatus(dailyCare)),
      earnMoney: addStatus(earnMoneyItems),
      allRequiredDone,
      stats: {
        requiredTotal: required.length,
        requiredDone: requiredWithStatus.filter(t => t.completed).length,
        dailyCareTotal: dailyCare.length,
        dailyCareDone: addStatus(dailyCare).filter(t => t.completed).length,
        earnMoneyTotal: earnMoneyItems.length,
        earnMoneyDone: addStatus(earnMoneyItems).filter(t => t.completed).length,
      }
    })
  } catch (error) {
    console.error('Checklist API error:', error)
    return NextResponse.json({ error: 'Failed to load checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'toggle': {
        const { child, eventId, eventSummary } = body
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const kidName = child.toLowerCase()
        const existing = await db.query(
          `SELECT completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2 AND event_id = $3`,
          [kidName, today, eventId]
        )
        const newCompleted = existing.length > 0 ? !existing[0].completed : true
        await db.query(
          `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (child_name, event_date, event_id)
           DO UPDATE SET completed = $5, completed_at = $6`,
          [kidName, today, eventId, eventSummary || '', newCompleted, newCompleted ? new Date().toISOString() : null]
        )

        // Auto-earn points when completing an Earn Money chore
        if (eventId.startsWith('earn-') && newCompleted) {
          const choreId = parseInt(eventId.replace('earn-', ''))
          const choreRows = await db.query(
            `SELECT COALESCE(point_value, points, 10) as pts, title FROM earn_money_chores WHERE id = $1`,
            [choreId]
          )
          if (choreRows.length > 0) {
            const pts = choreRows[0].pts || 10
            await db.query(
              `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', $2, $3)`,
              [kidName, pts, choreRows[0].title]
            )
            await db.query(
              `UPDATE kid_points_balance SET current_points = current_points + $2, total_earned_all_time = total_earned_all_time + $2, updated_at = NOW()
               WHERE kid_name = $1`,
              [kidName, pts]
            )
          }
        }
        // Reverse points if unchecking an Earn Money chore
        if (eventId.startsWith('earn-') && !newCompleted) {
          const choreId = parseInt(eventId.replace('earn-', ''))
          const choreRows = await db.query(
            `SELECT COALESCE(point_value, points, 10) as pts, title FROM earn_money_chores WHERE id = $1`,
            [choreId]
          )
          if (choreRows.length > 0) {
            const pts = choreRows[0].pts || 10
            await db.query(
              `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'deducted', $2, $3)`,
              [kidName, pts, 'Unchecked: ' + choreRows[0].title]
            )
            await db.query(
              `UPDATE kid_points_balance SET current_points = GREATEST(current_points - $2, 0), updated_at = NOW() WHERE kid_name = $1`,
              [kidName, pts]
            )
          }
        }

        // Log medication dose to health_logs + adherence calendar when checking a med item
        if (eventId.startsWith('med-') && newCompleted) {
          try {
            await db.query(
              `INSERT INTO health_logs (member_name, log_type, value_text, notes, logged_at)
               VALUES ($1, 'dose_log', $2, 'Auto-logged from daily checklist', NOW())`,
              [kidName, eventSummary || eventId]
            )
          } catch {}
          // MED-1: Log to medication adherence calendar
          const medName = eventSummary || (eventId.includes('am') ? 'Morning Focalin' : 'Evening Clonidine')
          await db.query(
            `INSERT INTO medication_adherence_log (person_name, medication, log_date, status)
             VALUES ($1, $2, CURRENT_DATE, 'taken')
             ON CONFLICT (person_name, medication, log_date) DO UPDATE SET status = 'taken', logged_at = NOW()`,
            [kidName, medName]
          ).catch(e => console.error('Med adherence log failed:', kidName, medName, e.message))

          // NOTIFY-FIX-1 #4: Notify parent of med completion
          const kidDisplay = kidName.charAt(0).toUpperCase() + kidName.slice(1)
          await createNotification({
            title: `${kidDisplay} took ${medName}`,
            message: `${medName} logged as taken`,
            source_type: 'med_completion', source_ref: `med-done-${kidName}-${Date.now()}`,
            link_tab: 'health', icon: '💊',
          }).catch(e => console.error('Med completion notify failed:', e.message))

          // MED-2: Decrement pill count + refill alert
          await db.query(
            `UPDATE medications SET pills_remaining = GREATEST(pills_remaining - 1, 0)
             WHERE LOWER(person_name) = $1 AND LOWER(medication_name) LIKE $2 AND pills_remaining IS NOT NULL`,
            [kidName, `%${medName.split(' ').pop()?.toLowerCase() || medName.toLowerCase()}%`]
          ).catch(e => console.error('Pill count decrement failed:', kidName, e.message))
          try {
            const medRow = await db.query(
              `SELECT medication_name, pills_remaining, refill_alert_threshold FROM medications
               WHERE LOWER(person_name) = $1 AND pills_remaining IS NOT NULL AND pills_remaining <= refill_alert_threshold`,
              [kidName]
            )
            for (const m of (medRow || [])) {
              await createNotification({
                title: `Refill needed: ${m.medication_name}`,
                message: `${kidDisplay} has ${m.pills_remaining} pills left`,
                source_type: 'refill_alert', source_ref: `med:${kidName}`,
                link_tab: 'health', icon: '💊',
              }).catch(e => console.error('Refill alert failed:', e.message))
            }
          } catch (e: any) { console.error('Refill check failed:', e.message) }
        }

        // ZONE-1: Sync zone completion to zone_task_rotation + award points
        if (eventId.startsWith('zone-') && newCompleted) {
          await db.query(
            `UPDATE zone_task_rotation SET completed_at = NOW()
             WHERE kid_name = $1 AND assigned_date = $2 AND completed_at IS NULL`,
            [kidName, today]
          ).catch(e => console.error('Zone sync failed:', kidName, e.message))
          // Award 10 points for zone task
          await db.query(
            `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason) VALUES ($1, 'earned', 10, $2)`,
            [kidName, `Zone chore: ${eventSummary || eventId}`]
          ).catch(e => console.error('Points log failed:', kidName, e.message))
          await db.query(
            `UPDATE kid_points_balance SET current_points = current_points + 10, total_earned_all_time = total_earned_all_time + 10, updated_at = NOW() WHERE kid_name = $1`,
            [kidName]
          ).catch(e => console.error('Points balance update failed:', kidName, e.message))
          try {
            const bal = await db.query(`SELECT current_points as balance FROM kid_points_balance WHERE kid_name = $1`, [kidName])
            return NextResponse.json({ success: true, completed: newCompleted, points_awarded: 10, new_balance: bal[0]?.balance || 0 })
          } catch {}
        }

        // Return with points info if earned (earn-money chores)
        if (eventId.startsWith('earn-') && newCompleted) {
          try {
            const bal = await db.query(`SELECT current_points as balance FROM kid_points_balance WHERE kid_name = $1`, [kidName])
            return NextResponse.json({ success: true, completed: newCompleted, points_awarded: 10, new_balance: bal[0]?.balance || 0 })
          } catch {}
        }

        // VELOCITY-NOTIFY-1: Run velocity detection on task completion
        // ACHIEVE-1: Check for badge awards
        if (newCompleted) {
          computeVelocity(kidName, today).catch(e => console.error('Velocity check failed:', kidName, e.message))
          checkAchievements(kidName).catch(e => console.error('Achievement check failed:', kidName, e.message))
          checkBonusStar(kidName, 'checklist').catch(e => console.error('Bonus star check failed:', kidName, e.message))
        }

        return NextResponse.json({ success: true, completed: newCompleted })
      }

      case 'add_earn_chore': {
        const { child, title, description, points } = body
        await db.query(
          `INSERT INTO earn_money_chores (child_name, title, description, points) VALUES ($1, $2, $3, $4)`,
          [child.toLowerCase(), title, description || '', points || 5]
        )
        return NextResponse.json({ success: true })
      }

      case 'remove_earn_chore': {
        await db.query(`UPDATE earn_money_chores SET is_active = FALSE WHERE id = $1`, [body.choreId])
        return NextResponse.json({ success: true })
      }

      case 'add_parent_task': {
        const { child, title, description, task_date, recurring } = body
        await db.query(
          `INSERT INTO parent_tasks (child_name, title, description, task_date, recurring) VALUES ($1, $2, $3, $4, $5)`,
          [child.toLowerCase(), title, description || '', task_date || null, recurring || false]
        )
        return NextResponse.json({ success: true })
      }

      case 'remove_parent_task': {
        await db.query(`UPDATE parent_tasks SET is_active = FALSE WHERE id = $1`, [body.taskId])
        return NextResponse.json({ success: true })
      }

      case 'all_required_complete': {
        const { kid_name } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1)
        await createNotification({
          title: `${kidDisplay} finished all required tasks!`,
          message: 'Daily checklist complete',
          source_type: 'all_tasks_complete',
          source_ref: `kid:${kid_name.toLowerCase()}`,
          link_tab: 'kids-checklist',
          icon: '🎉',
        })
        return NextResponse.json({ success: true })
      }

      // UX-1: Toggle individual substep completion
      case 'toggle_substep': {
        const { child, eventId, substepIndex, totalSubsteps } = body
        if (!child || !eventId || substepIndex === undefined) return NextResponse.json({ error: 'child, eventId, substepIndex required' }, { status: 400 })
        const kidName = child.toLowerCase()
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

        // Get current substep progress
        const existing = await db.query(
          `SELECT substep_progress, completed FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2 AND event_id = $3`,
          [kidName, today, eventId]
        ).catch(() => [])

        let progress: boolean[] = []
        if (existing[0]?.substep_progress && typeof existing[0].substep_progress === 'object') {
          progress = Array.isArray(existing[0].substep_progress) ? existing[0].substep_progress : []
        }

        // Ensure array is the right size
        const total = totalSubsteps || Math.max(progress.length, substepIndex + 1)
        while (progress.length < total) progress.push(false)

        // Toggle the specific substep
        progress[substepIndex] = !progress[substepIndex]

        // Check if all substeps are now done
        const allDone = progress.length > 0 && progress.every(Boolean)

        // Upsert the progress
        await db.query(
          `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, substep_progress, completed_at)
           VALUES ($1, $2, $3, '', $4, $5, $6)
           ON CONFLICT (child_name, event_date, event_id)
           DO UPDATE SET substep_progress = $5, completed = CASE WHEN $4 = TRUE THEN TRUE ELSE kid_daily_checklist.completed END,
             completed_at = CASE WHEN $4 = TRUE AND kid_daily_checklist.completed_at IS NULL THEN NOW() ELSE kid_daily_checklist.completed_at END`,
          [kidName, today, eventId, allDone, JSON.stringify(progress), allDone ? new Date().toISOString() : null]
        )

        return NextResponse.json({ success: true, substep_progress: progress, all_complete: allDone })
      }

      // UX-1: Get substep progress for a kid's tasks
      case 'get_substep_progress': {
        const { child } = body
        if (!child) return NextResponse.json({ error: 'child required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const rows = await db.query(
          `SELECT event_id, substep_progress FROM kid_daily_checklist WHERE child_name = $1 AND event_date = $2 AND substep_progress IS NOT NULL AND substep_progress != '{}'::jsonb`,
          [child.toLowerCase(), today]
        ).catch(() => [])
        const progress: Record<string, boolean[]> = {}
        rows.forEach((r: any) => {
          if (r.substep_progress && Array.isArray(r.substep_progress)) {
            progress[r.event_id] = r.substep_progress
          }
        })
        return NextResponse.json({ progress })
      }

      // GAP-13b: Parent sick day override actions
      case 'confirm_sick_day': {
        const { kid_name } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `UPDATE kid_sick_days SET parent_confirmed = TRUE, status = 'confirmed' WHERE kid_name = $1 AND sick_date = $2`,
          [kid_name.toLowerCase(), today]
        )
        const kidDisplay = kid_name.charAt(0).toUpperCase() + kid_name.slice(1).toLowerCase()
        await createNotification({
          title: 'Mom confirmed your sick day',
          message: 'Rest up! Only essentials today.',
          source_type: 'sick_day', source_ref: `sick-confirmed-${kid_name.toLowerCase()}-${today}`,
          link_tab: 'my-day', icon: '💛',
          target_role: 'kid', kid_name: kid_name.toLowerCase(),
        }).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'override_sick_day': {
        const { kid_name } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `UPDATE kid_sick_days SET status = 'overridden' WHERE kid_name = $1 AND sick_date = $2`,
          [kid_name.toLowerCase(), today]
        )
        await createNotification({
          title: 'Your full task list is back',
          message: 'Mom restored your regular day.',
          source_type: 'sick_day', source_ref: `sick-override-${kid_name.toLowerCase()}-${today}`,
          link_tab: 'my-day', icon: '📋',
          target_role: 'kid', kid_name: kid_name.toLowerCase(),
        }).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'modify_sick_day': {
        const { kid_name, kept_tasks } = body
        if (!kid_name || !Array.isArray(kept_tasks)) return NextResponse.json({ error: 'kid_name and kept_tasks required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `UPDATE kid_sick_days SET status = 'modified', modified_tasks = $3 WHERE kid_name = $1 AND sick_date = $2`,
          [kid_name.toLowerCase(), today, JSON.stringify(kept_tasks)]
        )
        await createNotification({
          title: 'Mom adjusted your day',
          message: `${kept_tasks.length} tasks kept for today.`,
          source_type: 'sick_day', source_ref: `sick-modified-${kid_name.toLowerCase()}-${today}`,
          link_tab: 'my-day', icon: '📝',
          target_role: 'kid', kid_name: kid_name.toLowerCase(),
        }).catch(() => {})
        return NextResponse.json({ success: true })
      }

      case 'get_sick_day_status': {
        const { kid_name } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const rows = await db.query(
          `SELECT * FROM kid_sick_days WHERE kid_name = $1 AND sick_date = $2 LIMIT 1`,
          [kid_name.toLowerCase(), today]
        ).catch(() => [])
        return NextResponse.json({ sick_day: rows[0] || null })
      }

      // SKIP-1: Kid intentionally skips a task
      case 'skip_task': {
        const { child, eventId, skip_reason } = body
        if (!child || !eventId) return NextResponse.json({ error: 'child and eventId required' }, { status: 400 })
        const kidName = child.toLowerCase()
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `INSERT INTO kid_daily_checklist (child_name, event_date, event_id, event_summary, completed, status, skip_reason, skipped_at)
           VALUES ($1, $2, $3, '', FALSE, 'skipped', $4, NOW())
           ON CONFLICT (child_name, event_date, event_id)
           DO UPDATE SET completed = FALSE, status = 'skipped', skip_reason = $4, skipped_at = NOW()`,
          [kidName, today, eventId, skip_reason || null]
        )
        // NOTIFY-FIX-1 #6: Notify parent of task skip
        const skipDisplay = kidName.charAt(0).toUpperCase() + kidName.slice(1)
        await createNotification({
          title: `${skipDisplay} skipped a task`,
          message: `${eventId}: ${skip_reason || 'No reason given'}`,
          source_type: 'task_skip', source_ref: `skip-${kidName}-${eventId}-${today}`,
          link_tab: 'kids-checklist', icon: '⏭️',
        }).catch(e => console.error('Skip notification failed:', e.message))
        return NextResponse.json({ success: true, status: 'skipped' })
      }

      // Run pattern detection (called on checklist load)
      case 'check_patterns': {
        const { kid_name } = body
        if (kid_name) checkDailyPatterns(kid_name).catch(e => console.error('Pattern detection failed:', kid_name, e.message))
        return NextResponse.json({ success: true })
      }

      case 'flag_sick_day': {
        const { kid, date } = body
        if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
        const sickDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        await db.query(
          `INSERT INTO kid_sick_days (kid_name, sick_date, reason, severity)
           VALUES ($1, $2, 'Self-reported', 'mild')
           ON CONFLICT (kid_name, sick_date) DO NOTHING`,
          [kid.toLowerCase(), sickDate]
        )

        // Also log to health timeline
        try {
          await db.query(
            `INSERT INTO health_logs (member_name, log_type, value_text, notes, logged_at)
             VALUES ($1, 'note', $2, 'Auto-logged from kid portal sick day button', NOW())`,
            [kid.toLowerCase(), `${kid} reported not feeling well (kid portal)`]
          )
        } catch {}

        const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
        await createNotification({
          title: `${kidDisplay} reported sick`,
          message: `${kidDisplay} said they're not feeling well today`,
          source_type: 'sick_day', source_ref: `sick-${kid.toLowerCase()}`,
          link_tab: 'health', icon: '🤒',
        })

        return NextResponse.json({ success: true })
      }

      // ── UX-2: Task Photo Actions ──
      case 'upload_task_photo': {
        const { kid_name, task_key, substep_key, photo_url } = body
        if (!kid_name || !task_key || !photo_url) return NextResponse.json({ error: 'kid_name, task_key, photo_url required' }, { status: 400 })
        await db.query(`CREATE TABLE IF NOT EXISTS checklist_task_photos (
          id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, checklist_date DATE NOT NULL DEFAULT CURRENT_DATE,
          task_key TEXT NOT NULL, substep_key TEXT, photo_url TEXT NOT NULL, thumbnail_url TEXT,
          uploaded_at TIMESTAMPTZ DEFAULT NOW())`)
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const rows = await db.query(
          `INSERT INTO checklist_task_photos (kid_name, checklist_date, task_key, substep_key, photo_url, thumbnail_url)
           VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
          [kid_name.toLowerCase(), today, task_key, substep_key || null, photo_url]
        )
        return NextResponse.json({ success: true, photo: rows[0] })
      }

      case 'get_task_photos': {
        const { kid_name, checklist_date } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        const date = checklist_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const rows = await db.query(
          `SELECT * FROM checklist_task_photos WHERE kid_name = $1 AND checklist_date = $2 ORDER BY uploaded_at`,
          [kid_name.toLowerCase(), date]
        ).catch(() => [])
        return NextResponse.json({ photos: rows })
      }

      case 'delete_task_photo': {
        const { photo_id } = body
        if (!photo_id) return NextResponse.json({ error: 'photo_id required' }, { status: 400 })
        await db.query(`DELETE FROM checklist_task_photos WHERE id = $1`, [photo_id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Checklist POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // Backward compatibility with KidsChecklistOverview
  return NextResponse.json({ children: [] })
}
