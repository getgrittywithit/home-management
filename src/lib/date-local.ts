// Parse a date value into a Date anchored at local noon, to avoid
// Chicago-TZ off-by-one when a 'YYYY-MM-DD' string gets interpreted
// as UTC midnight and then rendered in CST/CDT.
//
// Accepts:
//  - 'YYYY-MM-DD' strings (most common)
//  - Full ISO strings like '2026-04-23T00:00:00.000Z' (we slice(0,10))
//  - Date objects (some Postgres drivers hand back Date for DATE columns)
//  - null / undefined (returns an Invalid Date, matching prior behavior)
export const parseDateLocal = (x: string | Date | null | undefined): Date => {
  if (x === null || x === undefined) return new Date('')
  const s = typeof x === 'string' ? x : x.toISOString()
  return new Date(s.slice(0, 10) + 'T12:00:00')
}
