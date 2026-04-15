import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createPDF, addHeader, addFooter, addTable, pdfToUint8Array } from '@/lib/pdf/generate'

// ============================================================================
// Dispatch 77 — Print Center API
// GET  ?action=list_forms           → grouped list of printable forms
// POST { action: 'generate',        → returns application/pdf blob
//        data_source: 'meal_plan_current_week' | 'meal_plan_next_week' }
// ============================================================================

const DINNER_MANAGERS: Record<number, { kid: string; week1Theme: string; week2Theme: string }> = {
  0: { kid: 'kaylee', week1Theme: 'american-comfort', week2Theme: 'soup-comfort' },
  1: { kid: 'zoey', week1Theme: 'asian', week2Theme: 'asian' },
  2: { kid: 'wyatt', week1Theme: 'bar-night', week2Theme: 'easy-lazy' },
  3: { kid: 'amos', week1Theme: 'mexican', week2Theme: 'mexican' },
  4: { kid: 'ellie', week1Theme: 'pizza-italian', week2Theme: 'pizza-italian' },
  5: { kid: 'parents', week1Theme: 'grill', week2Theme: 'experiment' },
  6: { kid: 'parents', week1Theme: 'roast-comfort', week2Theme: 'brunch' },
}

const THEME_LABELS: Record<string, string> = {
  'american-comfort': 'American Comfort',
  'soup-comfort': 'Soup / Crockpot',
  'asian': 'Asian Night',
  'bar-night': 'Bar Night',
  'easy-lazy': 'Easy / Lazy',
  'mexican': 'Mexican Night',
  'pizza-italian': 'Pizza & Italian',
  'grill': 'Grill Night',
  'experiment': 'Experiment / Big Cook',
  'roast-comfort': 'Roast / Comfort',
  'brunch': 'Brunch / Light',
}

const EPOCH = new Date('2026-03-30T00:00:00') // Week 1 Monday

function getWeekNumber(weekStart: string): 1 | 2 {
  const start = new Date(weekStart + 'T00:00:00')
  const diff = Math.floor((start.getTime() - EPOCH.getTime()) / (7 * 86400000))
  return diff % 2 === 0 ? 1 : 2
}

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toLocaleDateString('en-CA')
}

function managerDisplay(dow: number): string {
  const mgr = DINNER_MANAGERS[dow]
  if (dow === 4) return 'Ellie & Hannah'
  if (mgr.kid === 'parents') return 'Parents'
  return mgr.kid.charAt(0).toUpperCase() + mgr.kid.slice(1)
}

function formatSides(sides: any): string {
  if (!sides) return ''
  if (Array.isArray(sides)) return sides.join(', ')
  if (typeof sides === 'string') {
    try {
      const parsed = JSON.parse(sides)
      return Array.isArray(parsed) ? parsed.join(', ') : String(sides)
    } catch {
      return sides
    }
  }
  return ''
}

async function getWeekRows(weekStart: string) {
  return await db.query(
    `SELECT wp.day_of_week, wp.meal_id, wp.status, wp.parent_override_note,
            ml.name AS meal_name, ml.sides, ml.description, ml.theme AS meal_theme
       FROM meal_week_plan wp
       LEFT JOIN meal_library ml ON wp.meal_id = ml.id
      WHERE wp.week_start = $1
      ORDER BY wp.day_of_week`,
    [weekStart]
  ).catch(() => [] as any[])
}

function addDateRange(doc: any, weekStart: string, weekNum: number, y: number): number {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text(
    `Week ${weekNum} — ${fmt(start)} to ${fmt(end)}, ${end.getFullYear()}`,
    10,
    y
  )
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  return y + 7
}

async function buildMealPlanPDF(weekStart: string): Promise<Uint8Array> {
  const rows = await getWeekRows(weekStart)
  const weekNum = getWeekNumber(weekStart)
  const byDow: Record<number, any> = {}
  for (const r of rows) byDow[r.day_of_week] = r

  const doc = createPDF({
    title: 'Weekly Meal Plan',
    orientation: 'portrait',
  })

  let y = addHeader(
    doc,
    'Moses Family — Weekly Meal Plan',
    `Week ${weekNum}`
  )
  y = addDateRange(doc, weekStart, weekNum, y + 4)

  const dayOrder = [6, 0, 1, 2, 3, 4, 5] // Sun, Mon-Sat per blank template
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const headers = ['Day', 'Manager', 'Theme', 'Meal', 'Grocery / Prep']
  const tableRows: string[][] = dayOrder.map((dow) => {
    const r = byDow[dow] || {}
    const mgr = DINNER_MANAGERS[dow]
    const themeKey = r.meal_theme || (weekNum === 1 ? mgr.week1Theme : mgr.week2Theme)
    const themeLabel = THEME_LABELS[themeKey] || themeKey || ''
    const isOff = r.status === 'off_night'
    const hasMeal = !!r.meal_id && !isOff

    let meal = '?'
    let grocery = 'Awaiting pick'
    if (isOff) {
      meal = 'Off Night'
      grocery = '—'
    } else if (hasMeal) {
      meal = r.meal_name || '(unnamed)'
      const sides = formatSides(r.sides)
      grocery = sides || r.description || ''
    }

    return [
      dayNames[dow],
      managerDisplay(dow),
      themeLabel,
      meal,
      grocery,
    ]
  })

  const colWidths = [24, 28, 34, 50, 60] // mm, totals 196 — fits portrait letter page width (215.9 - 20 margin ≈ 196)
  y = addTable(doc, headers, tableRows, y + 4, colWidths)

  // Notes / legend
  y += 4
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    '? = awaiting kid pick   •   Off Night = no home meal planned',
    10,
    y
  )
  doc.setTextColor(0, 0, 0)

  addFooter(
    doc,
    `Generated ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })} • family-ops.grittysystems.com`
  )

  return pdfToUint8Array(doc)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'list_forms': {
        const rows = await db.query(
          `SELECT id, category, title, description, form_type, file_url, icon,
                  sort_order, requires_data, data_source
             FROM print_center_forms
            WHERE is_active = TRUE
            ORDER BY category, sort_order, title`
        ).catch(() => [] as any[])

        const grouped: Record<string, any[]> = {}
        for (const r of rows) {
          if (!grouped[r.category]) grouped[r.category] = []
          grouped[r.category].push(r)
        }
        return NextResponse.json({ forms: rows, grouped })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Print Center GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action !== 'generate') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const dataSource: string = body.data_source || ''
    if (!dataSource.startsWith('meal_plan_')) {
      return NextResponse.json({ error: 'Unsupported data_source' }, { status: 400 })
    }

    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
    )
    let weekStart: string
    if (dataSource === 'meal_plan_current_week') {
      weekStart = getMonday(now)
    } else if (dataSource === 'meal_plan_next_week') {
      const nextWeekDate = new Date(now)
      nextWeekDate.setDate(nextWeekDate.getDate() + 7)
      weekStart = getMonday(nextWeekDate)
    } else {
      return NextResponse.json({ error: 'Unsupported data_source' }, { status: 400 })
    }

    const pdfBytes = await buildMealPlanPDF(weekStart)
    const weekNum = getWeekNumber(weekStart)
    const filename = `meal-plan-week-${weekNum}-${weekStart}.pdf`

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Print Center POST error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
