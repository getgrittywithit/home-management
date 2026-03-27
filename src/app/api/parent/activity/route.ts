import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt',
  hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}

function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '15')

    const items: any[] = []

    // Run all queries in parallel with individual try/catch
    const [taskRows, pointRows, messageRows, checkinRows, feedingRows] = await Promise.all([
      // 1. Zone task completions (last 48 hours)
      db.query(
        `SELECT ztr.kid_name, zd.display_name as zone_name, ztr.completed_at, ztr.bonus_task, ztr.bonus_description
         FROM zone_task_rotation ztr
         JOIN zone_definitions zd ON zd.zone_key = ztr.zone_key
         WHERE ztr.completed = TRUE AND ztr.completed_at > NOW() - INTERVAL '48 hours'
         AND ztr.task_id IS NOT NULL
         ORDER BY ztr.completed_at DESC LIMIT 20`
      ).catch(() => []),

      // 2. Points log (last 48 hours)
      db.query(
        `SELECT kid_name, transaction_type, points, reason, created_at
         FROM kid_points_log
         WHERE created_at > NOW() - INTERVAL '48 hours'
         ORDER BY created_at DESC LIMIT 10`
      ).catch(() => []),

      // 3. Kid messages (last 48 hours)
      db.query(
        `SELECT kid_name, message, created_at
         FROM family_messages
         WHERE created_at > NOW() - INTERVAL '48 hours'
         ORDER BY created_at DESC LIMIT 5`
      ).catch(() => []),

      // 4. Morning check-ins (last 2 days)
      db.query(
        `SELECT kid_name, checkin_type, checkin_time, points_awarded, created_at
         FROM kid_morning_checkins
         WHERE checkin_date >= CURRENT_DATE - 1
         ORDER BY created_at DESC LIMIT 10`
      ).catch(() => []),

      // 5. Pet feedings (last 48 hours)
      db.query(
        `SELECT pet_key, fed_by, quantity, notes, created_at
         FROM pet_feeding_log
         WHERE created_at > NOW() - INTERVAL '48 hours'
         ORDER BY created_at DESC LIMIT 5`
      ).catch(() => []),
    ])

    // Process task completions — group by kid+zone to avoid flooding
    const taskGroups: Record<string, { kid: string; zone: string; count: number; at: Date; bonus?: string }> = {}
    for (const r of taskRows as any[]) {
      if (r.bonus_task && r.bonus_description) {
        items.push({
          type: 'bonus',
          kid_name: r.kid_name,
          text: `${KID_DISPLAY[r.kid_name] || r.kid_name} did something extra: ${r.bonus_description}`,
          timestamp: new Date(r.completed_at),
        })
      } else {
        const key = `${r.kid_name}-${r.zone_name}-${new Date(r.completed_at).toDateString()}`
        if (!taskGroups[key]) {
          taskGroups[key] = { kid: r.kid_name, zone: r.zone_name, count: 0, at: new Date(r.completed_at) }
        }
        taskGroups[key].count++
        if (new Date(r.completed_at) > taskGroups[key].at) taskGroups[key].at = new Date(r.completed_at)
      }
    }
    for (const g of Object.values(taskGroups)) {
      items.push({
        type: 'task_complete',
        kid_name: g.kid,
        text: `${KID_DISPLAY[g.kid] || g.kid} completed ${g.count} ${g.zone} task${g.count > 1 ? 's' : ''}`,
        timestamp: g.at,
      })
    }

    // Process points
    for (const r of pointRows as any[]) {
      const name = KID_DISPLAY[r.kid_name] || r.kid_name
      if (r.transaction_type === 'earned') {
        items.push({
          type: 'points_earned',
          kid_name: r.kid_name,
          text: `${name} earned ${r.points} points — ${r.reason}`,
          timestamp: new Date(r.created_at),
        })
      } else if (r.transaction_type === 'deducted') {
        items.push({
          type: 'points_deducted',
          kid_name: r.kid_name,
          text: `${name} lost ${r.points} points — ${r.reason}`,
          timestamp: new Date(r.created_at),
        })
      } else if (r.transaction_type === 'payout') {
        items.push({
          type: 'payout',
          kid_name: r.kid_name,
          text: `${name} got a payout of ${r.points} points`,
          timestamp: new Date(r.created_at),
        })
      }
    }

    // Process messages
    for (const r of messageRows as any[]) {
      items.push({
        type: 'message',
        kid_name: r.kid_name,
        text: `${KID_DISPLAY[r.kid_name] || r.kid_name} sent a message: "${(r.message || '').slice(0, 60)}${(r.message || '').length > 60 ? '...' : ''}"`,
        timestamp: new Date(r.created_at),
      })
    }

    // Process check-ins
    for (const r of checkinRows as any[]) {
      const name = KID_DISPLAY[r.kid_name] || r.kid_name
      const typeLabel = r.checkin_type === 'wake' ? 'wake' : 'ready'
      items.push({
        type: 'checkin',
        kid_name: r.kid_name,
        text: `${name} checked in (${typeLabel}) — ${r.points_awarded > 0 ? '+' : ''}${r.points_awarded} pts`,
        timestamp: new Date(r.created_at),
      })
    }

    // Process feedings
    for (const r of feedingRows as any[]) {
      items.push({
        type: 'feeding',
        kid_name: r.fed_by,
        text: `${KID_DISPLAY[r.fed_by] || r.fed_by} fed ${r.pet_key === 'hades' ? 'Hades' : r.pet_key} — ${r.quantity} mice${r.notes ? ` (${r.notes})` : ''}`,
        timestamp: new Date(r.created_at),
      })
    }

    // Sort by timestamp DESC and take top N
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const topItems = items.slice(0, limit)

    const ICONS: Record<string, string> = {
      task_complete: '✅', points_earned: '⭐', points_deducted: '📉',
      payout: '💰', message: '💬', checkin: '☀️', feeding: '🐍', bonus: '🌟',
    }

    const activity = topItems.map((item, i) => ({
      id: `${item.type}_${i}`,
      type: item.type,
      kid_name: item.kid_name,
      display_name: KID_DISPLAY[item.kid_name] || item.kid_name,
      text: item.text,
      icon: ICONS[item.type] || '📋',
      timestamp: item.timestamp.toISOString(),
      time_ago: timeAgo(item.timestamp),
    }))

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ activity: [] })
  }
}
