import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { logTaskCompletion, unlogTaskCompletion } from '@/lib/task-completion'
import { errorDetail } from '@/lib/route-errors'
import { PET_DAILY_TASKS, PET_PRIMARY, PET_HELPERS } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    // Read this kid's per-task contribution rows (for the UI's per-row check
    // marks) AND household-wide DISTINCT-task counts per pet (for the
    // "Today: X/Y" denominator on the card).
    const myRows = await db.query(
      `SELECT kid_name, pet_name, task, care_date, completed, completed_at, notes
         FROM pet_care_log
        WHERE kid_name = $1 AND care_date = $2 AND completed = TRUE`,
      [kid, date]
    ).catch(() => [])

    // Determine which pets this kid is responsible for so we only return
    // progress for those.
    const myPets: string[] = []
    for (const pet of Object.keys(PET_DAILY_TASKS)) {
      if (PET_PRIMARY[pet] === kid || (PET_HELPERS[pet] || []).includes(kid)) {
        myPets.push(pet)
      }
    }

    const progress: Record<string, { done: number; total: number; complete: boolean }> = {}
    if (myPets.length > 0) {
      const placeholders = myPets.map((_, i) => `$${i + 2}`).join(',')
      const householdRows = await db.query(
        `SELECT pet_name, COUNT(DISTINCT task)::int AS done
           FROM pet_care_log
          WHERE care_date = $1 AND completed = TRUE
            AND pet_name IN (${placeholders})
          GROUP BY pet_name`,
        [date, ...myPets]
      ).catch(() => [])
      const doneByPet: Record<string, number> = {}
      for (const r of householdRows) doneByPet[r.pet_name] = r.done
      for (const pet of myPets) {
        const total = PET_DAILY_TASKS[pet]?.length ?? 0
        const done = doneByPet[pet] ?? 0
        progress[pet] = { done, total, complete: total > 0 && done >= total }
      }
    }

    return NextResponse.json({ tasks: myRows, progress })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load pet care', detail: errorDetail(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kid_name, pet_name, task, completed, notes } = body
    if (!kid_name || !pet_name || !task) {
      return NextResponse.json({ error: 'kid_name + pet_name + task required' }, { status: 400 })
    }

    const kid = kid_name.toLowerCase()
    const pet = pet_name.toLowerCase()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    // Parent rollup event_id matches the seed in checklist/route.ts
    // (`pet-spike-${date}`, `pet-hades-${date}`, `pet-midnight-${date}`).
    const parentEventId = `pet-${pet}-${today}`
    const petDisplay = pet.charAt(0).toUpperCase() + pet.slice(1)
    const parentEventSummary = `${petDisplay} Care`

    let progress: { category_total: number; category_done: number; category_complete: boolean } | undefined
    if (completed) {
      progress = await logTaskCompletion({
        kid,
        category: 'pet_care',
        taskKey: task,
        parentEventId,
        parentEventSummary,
        date: today,
        meta: { pet_name: pet, notes: notes || undefined },
      })
      // Award a small star bonus for the contribution
      await db.query(
        `INSERT INTO kid_points_log (kid_name, transaction_type, points, reason)
         VALUES ($1, 'earned', 3, $2)`,
        [kid, `Pet care: ${task} for ${petDisplay}`]
      ).catch(() => {})
    } else {
      await unlogTaskCompletion({
        kid,
        category: 'pet_care',
        taskKey: task,
        parentEventId,
        date: today,
        meta: { pet_name: pet },
      })
      // Recompute progress on the unwrite path so the response still carries
      // the fresh count (Belle/Zone do this naturally; pet_care needs an
      // explicit second read since unlogTaskCompletion returns void).
      const rows = await db.query(
        `SELECT COUNT(DISTINCT task)::int AS done FROM pet_care_log
          WHERE pet_name = $1 AND care_date = $2 AND completed = TRUE`,
        [pet, today]
      ).catch(() => [{ done: 0 }])
      const total = (PET_DAILY_TASKS[pet]?.length) ?? 0
      const done = rows[0]?.done ?? 0
      progress = { category_total: total, category_done: done, category_complete: total > 0 && done >= total }
    }

    return NextResponse.json({ success: true, progress })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save pet care', detail: errorDetail(e) }, { status: 500 })
  }
}
