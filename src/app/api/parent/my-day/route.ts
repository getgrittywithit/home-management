import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS parent_tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      source_ref TEXT,
      due_date DATE,
      time_block TEXT DEFAULT 'morning',
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
}

export async function GET(request: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_today': {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      // Manual tasks for today
      const manualTasks = await db.query(
        `SELECT * FROM parent_tasks WHERE (due_date = $1 OR due_date IS NULL) AND completed = FALSE ORDER BY time_block, created_at`,
        [today]
      ).catch(() => [])

      // Auto-generated tasks from various sources
      const autoTasks: any[] = []

      // Pending health requests
      const healthReqs = await db.query(
        `SELECT child_name, category, severity FROM kid_health_requests WHERE status = 'active' LIMIT 5`
      ).catch(() => [])
      healthReqs.forEach((r: any) => {
        autoTasks.push({
          id: `auto-health-${r.child_name}`,
          title: `Review ${r.child_name}'s health request (${r.category})`,
          source: 'auto_health', time_block: 'morning', completed: false,
        })
      })

      // Pending meal approvals
      const mealReqs = await db.query(
        `SELECT kid_name, meal_name FROM meal_requests WHERE status = 'pending' LIMIT 5`
      ).catch(() => [])
      mealReqs.forEach((r: any) => {
        autoTasks.push({
          id: `auto-meal-${r.kid_name}`,
          title: `Approve ${r.kid_name}'s meal pick: ${r.meal_name}`,
          source: 'auto_meal', time_block: 'morning', completed: false,
        })
      })

      // Unread kid messages
      const msgs = await db.query(
        `SELECT COUNT(*)::int as count FROM family_messages WHERE read_at IS NULL`
      ).catch(() => [])
      if (msgs[0]?.count > 0) {
        autoTasks.push({
          id: 'auto-messages',
          title: `${msgs[0].count} unread kid message(s)`,
          source: 'auto_messages', time_block: 'morning', completed: false,
        })
      }

      // Pending positive reports
      const posReports = await db.query(
        `SELECT COUNT(*)::int as count FROM kid_positive_reports WHERE approved = FALSE`
      ).catch(() => [])
      if (posReports[0]?.count > 0) {
        autoTasks.push({
          id: 'auto-positive',
          title: `${posReports[0].count} "I Did Something Good" report(s) to review`,
          source: 'auto_positive', time_block: 'afternoon', completed: false,
        })
      }

      // Pending library submissions
      const libSubs = await db.query(
        `SELECT COUNT(*)::int as count FROM library_submissions WHERE status = 'pending'`
      ).catch(() => [])
      if (libSubs[0]?.count > 0) {
        autoTasks.push({
          id: 'auto-library',
          title: `${libSubs[0].count} library suggestion(s) to review`,
          source: 'auto_library', time_block: 'afternoon', completed: false,
        })
      }

      // Zone photo submissions
      const zoneSubs = await db.query(
        `SELECT COUNT(*)::int as count FROM zone_photo_submissions WHERE status = 'pending'`
      ).catch(() => [])
      if (zoneSubs[0]?.count > 0) {
        autoTasks.push({
          id: 'auto-zone-photos',
          title: `${zoneSubs[0].count} zone photo(s) to review`,
          source: 'auto_zone_photos', time_block: 'afternoon', completed: false,
        })
      }

      return NextResponse.json({
        manual_tasks: manualTasks,
        auto_tasks: autoTasks,
        date: today,
      })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  await ensureTable()
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'add_task': {
      const { title, time_block, due_date } = body
      if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
      const today = due_date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const result = await db.query(
        `INSERT INTO parent_tasks (title, source, time_block, due_date) VALUES ($1, 'manual', $2, $3) RETURNING *`,
        [title.trim(), time_block || 'morning', today]
      )
      return NextResponse.json({ success: true, task: result[0] })
    }

    case 'complete_task': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(
        `UPDATE parent_tasks SET completed = TRUE, completed_at = NOW() WHERE id = $1`,
        [id]
      )
      return NextResponse.json({ success: true })
    }

    case 'delete_task': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM parent_tasks WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
