import 'server-only'
import { db } from '@/lib/database'
import type { DayMode, DayModeEffect, CoverageAssignment } from '@/types/dayMode'
import { BELLE_WEEKDAY_MAP, BELLE_WEEKEND_ROTATION, BELLE_WEEKEND_ANCHOR, BELLE_KIDS, ALL_KIDS } from '@/lib/constants'
import { parseDateLocal } from '@/lib/date-local'
export { MODE_EFFECTS, resolveDayEffect } from '@/lib/dayModeTypes'

export async function getDayMode(kidName: string, date: string): Promise<DayMode | null> {
  const rows = await db.query(
    `SELECT * FROM day_modes WHERE (kid_name = $1 OR kid_name IS NULL) AND date = $2 AND status = 'active' ORDER BY kid_name NULLS LAST LIMIT 1`,
    [kidName.toLowerCase(), date]
  ).catch(() => [])
  return rows[0] || null
}

const DINNER_DOW: Record<number, string | string[]> = {
  1: 'kaylee', 2: 'zoey', 3: 'wyatt', 4: 'amos', 5: ['ellie', 'hannah'], 6: 'parents', 0: 'parents',
}

const LAUNDRY_DOW: Record<number, string | string[]> = {
  1: 'levi', 2: 'lola', 3: ['kaylee', 'ellie', 'hannah'], 4: 'amos',
  5: ['kaylee', 'ellie', 'hannah'], 6: 'zoey', 0: 'wyatt',
}

function getBelleAssignee(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  const dow = d.getDay()
  if (dow >= 1 && dow <= 5) return BELLE_WEEKDAY_MAP[dow] || ''
  const sat = dow === 0 ? new Date(d.getTime() - 86400000) : d
  const weeksSince = Math.floor((sat.getTime() - BELLE_WEEKEND_ANCHOR.getTime()) / (7 * 86400000))
  const idx = ((weeksSince % 5) + 5) % 5
  return BELLE_WEEKEND_ROTATION[idx]
}

export async function autoAssignCoverage(modeId: number, kidName: string, dateStr: string): Promise<CoverageAssignment[]> {
  const assignments: CoverageAssignment[] = []
  const d = parseDateLocal(dateStr)
  const dow = d.getDay()

  const otherModes = await db.query(
    `SELECT kid_name, mode_type FROM day_modes WHERE date = $1 AND status = 'active' AND kid_name != $2`,
    [dateStr, kidName]
  ).catch(() => [])
  const outKids = new Set([kidName, ...otherModes.filter((m: any) => ['vacation', 'sick_day', 'field_trip', 'work_day'].includes(m.mode_type)).map((m: any) => m.kid_name)])

  const availableBelleKids = [...BELLE_KIDS].filter(k => !outKids.has(k))
  const availableAllKids = [...ALL_KIDS].filter(k => !outKids.has(k))

  // Belle care
  const belleAssignee = getBelleAssignee(dateStr)
  if (belleAssignee === kidName && availableBelleKids.length > 0) {
    const cover = availableBelleKids[0]
    assignments.push({ duty_type: 'belle_care', original_kid: kidName, covered_by: cover, covered_by_type: 'kid', auto_assigned: true })
  }

  // Dinner manager
  const dinnerAssignee = DINNER_DOW[dow]
  if (typeof dinnerAssignee === 'string' && dinnerAssignee === kidName && availableAllKids.length > 0) {
    assignments.push({ duty_type: 'dinner_manager', original_kid: kidName, covered_by: availableAllKids[0], covered_by_type: 'kid', auto_assigned: true })
  } else if (Array.isArray(dinnerAssignee) && dinnerAssignee.includes(kidName)) {
    const remaining = dinnerAssignee.filter(k => !outKids.has(k))
    if (remaining.length === 0) {
      assignments.push({ duty_type: 'dinner_manager', original_kid: kidName, covered_by: 'parents', covered_by_type: 'parent', auto_assigned: true })
    }
  }

  // Zone rotation
  assignments.push({ duty_type: 'zone_rotation', original_kid: kidName, covered_by: null, covered_by_type: 'skipped', auto_assigned: true })

  // Save to DB
  for (const a of assignments) {
    await db.query(
      `INSERT INTO day_mode_coverage (day_mode_id, duty_type, original_kid, covered_by, covered_by_type, auto_assigned)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [modeId, a.duty_type, a.original_kid, a.covered_by, a.covered_by_type, a.auto_assigned]
    ).catch(() => {})
  }

  return assignments
}

const ATTENDANCE_MAP: Record<string, { status: string; notes: (reason?: string) => string }> = {
  normal:     { status: 'present', notes: () => '' },
  fun_friday: { status: 'present', notes: () => 'Fun Friday (earned)' },
  half_day:   { status: 'half_day', notes: () => '' },
  catch_up:   { status: 'present', notes: () => 'Catch-up day' },
  field_trip: { status: 'present', notes: (r) => `Field trip: ${r || ''}` },
  work_day:   { status: 'present', notes: (r) => `Vocational: ${r || ''}` },
  off_day:    { status: 'absent_excused', notes: () => 'Off day' },
  vacation:   { status: 'absent_excused', notes: (r) => `Vacation: ${r || ''}` },
  sick_day:   { status: 'absent_sick', notes: (r) => r || '' },
}

export async function writeAttendance(kidName: string, dateStr: string, modeType: string, reason?: string) {
  const map = ATTENDANCE_MAP[modeType] || ATTENDANCE_MAP.normal
  await db.query(
    `INSERT INTO school_attendance (kid_name, attendance_date, status, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (kid_name, attendance_date) DO UPDATE SET status = $3, notes = $4`,
    [kidName.toLowerCase(), dateStr, map.status, map.notes(reason)]
  ).catch(e => console.error('[dayMode] attendance write failed:', e.message))
}
