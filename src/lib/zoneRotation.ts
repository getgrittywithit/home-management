// 6-Week Zone Rotation Schedule
// Week 1 started March 16, 2026 (Monday). Cycle repeats every 6 weeks. Weeks run Mon–Sun.

const ZONES = ['Hotspot', 'Kitchen', 'Guest Bathroom', 'Kids Bathroom', 'Pantry', 'Floors'] as const
export type ZoneName = typeof ZONES[number]

// Zone abbreviation mapping (from CLAUDE.md rotation notation)
const ZONE_ABBREV: Record<string, ZoneName> = {
  H: 'Hotspot',
  K: 'Kitchen',
  GB: 'Guest Bathroom',
  KB: 'Kids Bathroom',
  P: 'Pantry',
  F: 'Floors',
}

// Each kid's 6-week rotation order (from CLAUDE.md)
// Amos H→K→GB→KB→P→F, Kaylee F→H→K→GB→KB→P, etc.
const KID_ROTATIONS: Record<string, ZoneName[]> = {
  Amos:   ['Hotspot', 'Kitchen', 'Guest Bathroom', 'Kids Bathroom', 'Pantry', 'Floors'],
  Zoey:   ['Kitchen', 'Guest Bathroom', 'Kids Bathroom', 'Pantry', 'Floors', 'Hotspot'],
  Kaylee: ['Floors', 'Hotspot', 'Kitchen', 'Guest Bathroom', 'Kids Bathroom', 'Pantry'],
  Ellie:  ['Kids Bathroom', 'Pantry', 'Floors', 'Hotspot', 'Kitchen', 'Guest Bathroom'],
  Wyatt:  ['Guest Bathroom', 'Kids Bathroom', 'Pantry', 'Floors', 'Hotspot', 'Kitchen'],
  Hannah: ['Pantry', 'Floors', 'Hotspot', 'Kitchen', 'Guest Bathroom', 'Kids Bathroom'],
}

// Week 1 of the rotation cycle started March 16, 2026 (a Monday)
const CYCLE_START = new Date(2026, 2, 16) // Month is 0-indexed

/**
 * Get the current zone week number (1-6) based on today's date.
 */
export function getCurrentZoneWeek(today: Date = new Date()): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.floor((today.getTime() - CYCLE_START.getTime()) / msPerWeek)
  // Modulo 6 to cycle, then +1 for 1-based week number
  return (((weeksSinceStart % 6) + 6) % 6) + 1
}

/**
 * Get the zone assigned to a specific kid for the current week.
 */
export function getKidZone(kidName: string, today: Date = new Date()): ZoneName | null {
  // Case-insensitive lookup: match 'ellie', 'Ellie', 'ELLIE' etc.
  const normalized = kidName.charAt(0).toUpperCase() + kidName.slice(1).toLowerCase()
  const rotation = KID_ROTATIONS[normalized]
  if (!rotation) return null
  const weekIndex = getCurrentZoneWeek(today) - 1 // 0-based
  return rotation[weekIndex]
}

/**
 * Get all zone assignments for the current week.
 * Returns array of { kid, zone } sorted by zone name.
 */
export function getCurrentZoneAssignments(today: Date = new Date()): { kid: string; zone: ZoneName }[] {
  const weekIndex = getCurrentZoneWeek(today) - 1
  return Object.entries(KID_ROTATIONS)
    .map(([kid, rotation]) => ({ kid, zone: rotation[weekIndex] }))
    .sort((a, b) => a.kid.localeCompare(b.kid))
}

/**
 * Get the date range for the current zone week.
 */
export function getCurrentZoneWeekRange(today: Date = new Date()): { start: Date; end: Date } {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.floor((today.getTime() - CYCLE_START.getTime()) / msPerWeek)
  const start = new Date(CYCLE_START.getTime() + weeksSinceStart * msPerWeek)
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000) // End of the week (Sunday)
  return { start, end }
}

export { ZONES, KID_ROTATIONS }
