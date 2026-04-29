import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { logTaskCompletion, unlogTaskCompletion } from '@/lib/task-completion'
import { errorDetail } from '@/lib/route-errors'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  try {
    // Read the new-shape rows directly. The 31 legacy uuid-shape rows have
    // NULL on kid_name/pet_name/task and won't match this filter.
    const rows = await db.query(
      `SELECT kid_name, pet_name, task, care_date, completed, completed_at, notes
         FROM pet_care_log
        WHERE kid_name = $1 AND care_date = $2 AND completed = TRUE`,
      [kid, date]
    ).catch(() => [])
    return NextResponse.json({ tasks: rows })
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

    if (completed) {
      await logTaskCompletion({
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
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save pet care', detail: errorDetail(e) }, { status: 500 })
  }
}
