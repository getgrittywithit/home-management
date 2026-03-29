import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'purchase_history') {
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')
      const countRows = await db.query('SELECT COUNT(*)::int as total FROM purchase_history')
      const rows = await db.query(
        `SELECT * FROM purchase_history ORDER BY purchase_date DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      )
      return NextResponse.json({ purchases: rows, total: countRows[0]?.total || 0 })
    }

    if (action === 'purchase_items') {
      const purchaseId = searchParams.get('purchase_id')
      if (!purchaseId) return NextResponse.json({ error: 'purchase_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM purchase_items WHERE purchase_id = $1 ORDER BY department, name`,
        [purchaseId]
      )
      return NextResponse.json({ items: rows })
    }

    if (action === 'pantry_stock') {
      const rows = await db.query(
        `SELECT * FROM pantry_stock WHERE active = true ORDER BY department, name`
      )
      return NextResponse.json({ items: rows })
    }

    // ── S3: Spending Overview ──
    if (action === 'spending_overview') {
      const month = searchParams.get('month') // e.g. 2026-03
      if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

      const [year, mo] = month.split('-').map(Number)
      const currentStart = `${month}-01`
      const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`
      const prevMo = mo === 1 ? 12 : mo - 1
      const prevYear = mo === 1 ? year - 1 : year
      const prevStart = `${prevYear}-${String(prevMo).padStart(2, '0')}-01`

      try {
        const currentRows = await db.query(
          `SELECT
             COALESCE(SUM(total_amount) FILTER (WHERE LOWER(store) LIKE '%walmart%'), 0)::numeric as walmart_total,
             COALESCE(SUM(total_amount) FILTER (WHERE LOWER(store) LIKE '%h-e-b%' OR LOWER(store) LIKE '%heb%'), 0)::numeric as heb_total,
             COALESCE(SUM(total_amount) FILTER (WHERE LOWER(store) LIKE '%amazon%'), 0)::numeric as amazon_total,
             COALESCE(SUM(total_amount), 0)::numeric as combined_total,
             COALESCE(SUM(snap_amount), 0)::numeric as snap_total,
             COALESCE(SUM(cash_amount), 0)::numeric as cash_total,
             COUNT(*)::int as trip_count
           FROM purchase_history
           WHERE purchase_date >= $1 AND purchase_date < $2`,
          [currentStart, nextMonth]
        )

        const previousRows = await db.query(
          `SELECT COALESCE(SUM(total_amount), 0)::numeric as combined_total, COUNT(*)::int as trip_count
           FROM purchase_history WHERE purchase_date >= $1 AND purchase_date < $2`,
          [prevStart, currentStart]
        )

        const today = new Date()
        const dayOfWeek = today.getDay()
        const thisWeekStart = new Date(today)
        thisWeekStart.setDate(today.getDate() - dayOfWeek)
        const lastWeekStart = new Date(thisWeekStart)
        lastWeekStart.setDate(thisWeekStart.getDate() - 7)

        const thisWeekRows = await db.query(
          `SELECT COALESCE(SUM(total_amount), 0)::numeric as total FROM purchase_history WHERE purchase_date >= $1 AND purchase_date < $2`,
          [thisWeekStart.toISOString().split('T')[0], today.toISOString().split('T')[0]]
        )
        const lastWeekRows = await db.query(
          `SELECT COALESCE(SUM(total_amount), 0)::numeric as total FROM purchase_history WHERE purchase_date >= $1 AND purchase_date < $2`,
          [lastWeekStart.toISOString().split('T')[0], thisWeekStart.toISOString().split('T')[0]]
        )

        const current = currentRows[0] || {}
        const previous = previousRows[0] || {}
        return NextResponse.json({
          current: {
            walmart_total: parseFloat(current.walmart_total) || 0,
            heb_total: parseFloat(current.heb_total) || 0,
            amazon_total: parseFloat(current.amazon_total) || 0,
            combined_total: parseFloat(current.combined_total) || 0,
            snap_total: parseFloat(current.snap_total) || 0,
            cash_total: parseFloat(current.cash_total) || 0,
            trip_count: current.trip_count || 0,
          },
          previous: { combined_total: parseFloat(previous.combined_total) || 0, trip_count: previous.trip_count || 0 },
          this_week: parseFloat(thisWeekRows[0]?.total) || 0,
          last_week: parseFloat(lastWeekRows[0]?.total) || 0,
          budget: 1500,
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({
            current: { walmart_total: 0, heb_total: 0, amazon_total: 0, combined_total: 0, snap_total: 0, cash_total: 0, trip_count: 0 },
            previous: { combined_total: 0, trip_count: 0 },
            this_week: 0, last_week: 0, budget: 1500,
          })
        }
        throw err
      }
    }

    // ── S3: Top Purchased Items ──
    if (action === 'top_items') {
      const days = parseInt(searchParams.get('days') || '90')
      const limit = parseInt(searchParams.get('limit') || '10')
      try {
        const rows = await db.query(
          `SELECT COALESCE(canonical_name, name) as canonical_name,
                  COUNT(*)::int as purchase_count,
                  ROUND(AVG(unit_price)::numeric, 2) as avg_price,
                  ROUND(MIN(unit_price)::numeric, 2) as min_price,
                  ROUND(MAX(unit_price)::numeric, 2) as max_price
           FROM purchase_items
           WHERE created_at > NOW() - INTERVAL '1 day' * $1
           GROUP BY COALESCE(canonical_name, name)
           HAVING COALESCE(canonical_name, name) IS NOT NULL AND COALESCE(canonical_name, name) != ''
           ORDER BY purchase_count DESC
           LIMIT $2`,
          [days, limit]
        )
        return NextResponse.json({ items: rows })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ items: [] })
        }
        throw err
      }
    }

    // ── S3: Financial Insights ──
    if (action === 'get_insights') {
      try {
        const rows = await db.query(
          `SELECT id, suggestion_text, category, created_at
           FROM spending_insights WHERE dismissed = false ORDER BY created_at DESC LIMIT 10`
        )
        return NextResponse.json({ insights: rows })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ insights: [] })
        }
        throw err
      }
    }

    // ── S4: Generate Weekly List ──
    if (action === 'generate_weekly_list') {
      const weekStart = searchParams.get('weekStart')
      if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

      const startDate = new Date(weekStart + 'T00:00:00')
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const weekEnd = endDate.toISOString().split('T')[0]

      try {
        // 1. Get approved meals for the week
        const mealRequests = await db.query(
          `SELECT DISTINCT mr.meal_description, ml.id as meal_id
           FROM meal_requests mr
           LEFT JOIN meal_library ml ON LOWER(ml.name) = LOWER(mr.meal_description)
           WHERE mr.request_date >= $1 AND mr.request_date <= $2 AND mr.status = 'approved'`,
          [weekStart, weekEnd]
        )

        // 2. Get ingredients for each meal and aggregate
        const ingredientMap: Record<string, { name: string; quantity: number; unit: string; department: string; preferred_store: string }> = {}
        for (const meal of mealRequests) {
          if (!meal.meal_id) continue
          const ingredients = await db.query(
            `SELECT name, quantity, unit, department, preferred_store FROM meal_ingredients WHERE meal_id = $1`,
            [meal.meal_id]
          )
          for (const ing of ingredients) {
            const key = (ing.name || '').toLowerCase().trim()
            if (!key) continue
            if (ingredientMap[key]) {
              ingredientMap[key].quantity += parseFloat(ing.quantity) || 0
            } else {
              ingredientMap[key] = {
                name: ing.name,
                quantity: parseFloat(ing.quantity) || 1,
                unit: ing.unit || 'item',
                department: ing.department || 'Other',
                preferred_store: (ing.preferred_store || 'walmart').toLowerCase(),
              }
            }
          }
        }

        // 3. Check pantry stock
        let pantryItems: any[] = []
        try {
          pantryItems = await db.query(`SELECT name, canonical_name, quantity, low_stock_threshold, average_price, preferred_store FROM pantry_stock WHERE active = true`)
        } catch {}

        const pantryMap = new Map<string, any>()
        for (const p of pantryItems) {
          pantryMap.set((p.canonical_name || p.name || '').toLowerCase(), p)
        }

        const walmartItems: any[] = []
        const hebItems: any[] = []
        const amazonItems: any[] = []
        const inStock: any[] = []
        let estimatedWalmart = 0
        let estimatedHeb = 0
        let estimatedAmazon = 0

        for (const [key, ing] of Object.entries(ingredientMap)) {
          const pantryItem = pantryMap.get(key)
          const isInStock = pantryItem && pantryItem.quantity > (pantryItem.low_stock_threshold || 0)
          const item = {
            name: ing.name, quantity: ing.quantity, unit: ing.unit, department: ing.department,
            in_stock: isInStock, avg_price: pantryItem?.average_price ? parseFloat(pantryItem.average_price) : null,
          }
          if (isInStock) {
            inStock.push(item)
          } else {
            const store = (pantryItem?.preferred_store || ing.preferred_store || 'walmart').toLowerCase()
            if (store.includes('h-e-b') || store.includes('heb')) {
              hebItems.push(item)
              if (item.avg_price) estimatedHeb += item.avg_price
            } else if (store.includes('amazon')) {
              amazonItems.push(item)
              if (item.avg_price) estimatedAmazon += item.avg_price
            } else {
              walmartItems.push(item)
              if (item.avg_price) estimatedWalmart += item.avg_price
            }
          }
        }

        const byDept = (a: any, b: any) => (a.department || '').localeCompare(b.department || '')
        walmartItems.sort(byDept)
        hebItems.sort(byDept)
        amazonItems.sort(byDept)

        return NextResponse.json({
          walmart_items: walmartItems, heb_items: hebItems, amazon_items: amazonItems, in_stock: inStock,
          estimated_walmart: Math.round(estimatedWalmart * 100) / 100,
          estimated_heb: Math.round(estimatedHeb * 100) / 100,
          estimated_amazon: Math.round(estimatedAmazon * 100) / 100,
          meal_count: mealRequests.length,
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ walmart_items: [], heb_items: [], amazon_items: [], in_stock: [], estimated_walmart: 0, estimated_heb: 0, estimated_amazon: 0, meal_count: 0 })
        }
        throw err
      }
    }

    // ── S5: Apple Notes Export ──
    if (action === 'export_apple_notes') {
      const weekStart = searchParams.get('weekStart')
      if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

      const startDate = new Date(weekStart + 'T00:00:00')
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const weekEnd = endDate.toISOString().split('T')[0]

      try {
        // Reuse generate_weekly_list logic
        const mealRequests = await db.query(
          `SELECT DISTINCT mr.meal_description, ml.id as meal_id
           FROM meal_requests mr
           LEFT JOIN meal_library ml ON LOWER(ml.name) = LOWER(mr.meal_description)
           WHERE mr.request_date >= $1 AND mr.request_date <= $2 AND mr.status = 'approved'`,
          [weekStart, weekEnd]
        )

        const ingredientMap: Record<string, { name: string; quantity: number; unit: string; department: string; preferred_store: string }> = {}
        for (const meal of mealRequests) {
          if (!meal.meal_id) continue
          const ingredients = await db.query(
            `SELECT name, quantity, unit, department, preferred_store FROM meal_ingredients WHERE meal_id = $1`,
            [meal.meal_id]
          )
          for (const ing of ingredients) {
            const key = (ing.name || '').toLowerCase().trim()
            if (!key) continue
            if (ingredientMap[key]) {
              ingredientMap[key].quantity += parseFloat(ing.quantity) || 0
            } else {
              ingredientMap[key] = {
                name: ing.name,
                quantity: parseFloat(ing.quantity) || 1,
                unit: ing.unit || 'item',
                department: ing.department || 'Other',
                preferred_store: (ing.preferred_store || 'walmart').toLowerCase(),
              }
            }
          }
        }

        let pantryItems: any[] = []
        try {
          pantryItems = await db.query(`SELECT name, canonical_name, quantity, low_stock_threshold, average_price, preferred_store FROM pantry_stock WHERE active = true`)
        } catch {}

        const pantryMap = new Map<string, any>()
        for (const p of pantryItems) {
          pantryMap.set((p.canonical_name || p.name || '').toLowerCase(), p)
        }

        const walmartByDept: Record<string, Array<{ name: string; quantity: number; unit: string }>> = {}
        const hebByDept: Record<string, Array<{ name: string; quantity: number; unit: string }>> = {}
        const amazonByDept: Record<string, Array<{ name: string; quantity: number; unit: string }>> = {}

        for (const [key, ing] of Object.entries(ingredientMap)) {
          const pantryItem = pantryMap.get(key)
          const isInStock = pantryItem && pantryItem.quantity > (pantryItem.low_stock_threshold || 0)
          if (isInStock) continue

          const store = (pantryItem?.preferred_store || ing.preferred_store || 'walmart').toLowerCase()
          let target: Record<string, Array<{ name: string; quantity: number; unit: string }>>
          if (store.includes('h-e-b') || store.includes('heb')) {
            target = hebByDept
          } else if (store.includes('amazon')) {
            target = amazonByDept
          } else {
            target = walmartByDept
          }
          const dept = ing.department || 'Other'
          if (!target[dept]) target[dept] = []
          target[dept].push({ name: ing.name, quantity: ing.quantity, unit: ing.unit })
        }

        // Format the date range
        const startFmt = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        const endFmt = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const now = new Date()
        const updatedFmt = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

        let text = `\ud83d\uded2 Moses Family \u2014 Weekly Meal List\n`
        text += `Week of ${startFmt}\u2013${endDate.getDate()}, ${endDate.getFullYear()}\n`
        text += `Updated: ${updatedFmt}\n`

        const formatStoreSection = (label: string, byDept: Record<string, Array<{ name: string; quantity: number; unit: string }>>) => {
          const depts = Object.keys(byDept).sort()
          if (depts.length === 0) return ''
          let section = `\n\u2500\u2500 ${label} \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n`
          for (const dept of depts) {
            section += `${dept.toUpperCase()}\n`
            for (const item of byDept[dept]) {
              const qty = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(1)
              section += `\u2610 ${item.name} \u2014 ${qty} ${item.unit}\n`
            }
            section += '\n'
          }
          return section
        }

        text += formatStoreSection('WALMART PICKUP', walmartByDept)
        text += formatStoreSection('H-E-B RUN', hebByDept)
        text += formatStoreSection('AMAZON ORDER', amazonByDept)

        return NextResponse.json({
          text: text.trim(),
          title: '\ud83d\uded2 Moses Family \u2014 Weekly Meal List',
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ text: 'No items to export.', title: '\ud83d\uded2 Moses Family \u2014 Weekly Meal List' })
        }
        throw err
      }
    }

    // ── S5: AnyList Export ──
    if (action === 'export_anylist') {
      const weekStart = searchParams.get('weekStart')
      if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

      const startDate = new Date(weekStart + 'T00:00:00')
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const weekEnd = endDate.toISOString().split('T')[0]

      try {
        const mealRequests = await db.query(
          `SELECT DISTINCT mr.meal_description, ml.id as meal_id
           FROM meal_requests mr
           LEFT JOIN meal_library ml ON LOWER(ml.name) = LOWER(mr.meal_description)
           WHERE mr.request_date >= $1 AND mr.request_date <= $2 AND mr.status = 'approved'`,
          [weekStart, weekEnd]
        )

        const ingredientMap: Record<string, { name: string; quantity: number; unit: string; department: string; preferred_store: string }> = {}
        for (const meal of mealRequests) {
          if (!meal.meal_id) continue
          const ingredients = await db.query(
            `SELECT name, quantity, unit, department, preferred_store FROM meal_ingredients WHERE meal_id = $1`,
            [meal.meal_id]
          )
          for (const ing of ingredients) {
            const key = (ing.name || '').toLowerCase().trim()
            if (!key) continue
            if (ingredientMap[key]) {
              ingredientMap[key].quantity += parseFloat(ing.quantity) || 0
            } else {
              ingredientMap[key] = {
                name: ing.name,
                quantity: parseFloat(ing.quantity) || 1,
                unit: ing.unit || 'item',
                department: ing.department || 'Other',
                preferred_store: (ing.preferred_store || 'walmart').toLowerCase(),
              }
            }
          }
        }

        let pantryItems: any[] = []
        try {
          pantryItems = await db.query(`SELECT name, canonical_name, quantity, low_stock_threshold, preferred_store FROM pantry_stock WHERE active = true`)
        } catch {}

        const pantryMap = new Map<string, any>()
        for (const p of pantryItems) {
          pantryMap.set((p.canonical_name || p.name || '').toLowerCase(), p)
        }

        const walmartLines: string[] = []
        const hebLines: string[] = []
        const amazonLines: string[] = []

        for (const [key, ing] of Object.entries(ingredientMap)) {
          const pantryItem = pantryMap.get(key)
          const isInStock = pantryItem && pantryItem.quantity > (pantryItem.low_stock_threshold || 0)
          if (isInStock) continue

          const store = (pantryItem?.preferred_store || ing.preferred_store || 'walmart').toLowerCase()
          const qty = ing.quantity % 1 === 0 ? ing.quantity.toString() : ing.quantity.toFixed(1)
          const line = `${qty} ${ing.unit} ${ing.name}`

          if (store.includes('h-e-b') || store.includes('heb')) {
            hebLines.push(line)
          } else if (store.includes('amazon')) {
            amazonLines.push(line)
          } else {
            walmartLines.push(line)
          }
        }

        return NextResponse.json({
          walmart_text: walmartLines.join('\n'),
          heb_text: hebLines.join('\n'),
          amazon_text: amazonLines.join('\n'),
          walmart_count: walmartLines.length,
          heb_count: hebLines.length,
          amazon_count: amazonLines.length,
        })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ walmart_text: '', heb_text: '', amazon_text: '', walmart_count: 0, heb_count: 0, amazon_count: 0 })
        }
        throw err
      }
    }

    // ── S8: Recipe Suggestions ──
    if (action === 'suggestions') {
      try {
        let topThemes: string[] = []
        try {
          const themeRows = await db.query(
            `SELECT ml.theme, ROUND(AVG(mf.rating)::numeric, 2) as avg_rating
             FROM meal_feedback mf JOIN meal_library ml ON ml.id = mf.meal_id
             GROUP BY ml.theme HAVING AVG(mf.rating) >= 3 ORDER BY avg_rating DESC LIMIT 5`
          )
          topThemes = themeRows.map((r: any) => r.theme)
        } catch {}

        let mightLike: any[] = []
        if (topThemes.length > 0) {
          try {
            const placeholders = topThemes.map((_, i) => `$${i + 1}`).join(',')
            mightLike = await db.query(
              `SELECT ml.id, ml.name, ml.theme, ml.description, ml.season FROM meal_library ml
               WHERE ml.active = true AND ml.theme IN (${placeholders})
                 AND ml.id NOT IN (
                   SELECT DISTINCT ml2.id FROM meal_library ml2
                   JOIN meal_requests mr ON LOWER(mr.meal_description) = LOWER(ml2.name)
                   WHERE mr.request_date > NOW() - INTERVAL '30 days'
                 )
               ORDER BY RANDOM() LIMIT 5`,
              topThemes
            )
          } catch {}
        }
        if (mightLike.length === 0) {
          try {
            mightLike = await db.query(`SELECT id, name, theme, description, season FROM meal_library WHERE active = true ORDER BY RANDOM() LIMIT 5`)
          } catch {}
        }

        let useWhatYouHave: any[] = []
        try {
          useWhatYouHave = await db.query(
            `SELECT ml.id, ml.name, ml.theme, ml.description,
                    COUNT(mi.id)::int as total_ingredients,
                    COUNT(ps.id)::int as in_stock_count
             FROM meal_library ml
             JOIN meal_ingredients mi ON mi.meal_id = ml.id
             LEFT JOIN pantry_stock ps ON LOWER(ps.name) = LOWER(mi.name) AND ps.quantity > COALESCE(ps.low_stock_threshold, 0) AND ps.active = true
             WHERE ml.active = true
             GROUP BY ml.id, ml.name, ml.theme, ml.description
             HAVING COUNT(mi.id) > 0
             ORDER BY (COUNT(ps.id)::float / GREATEST(COUNT(mi.id), 1)) DESC
             LIMIT 5`
          )
        } catch {}

        return NextResponse.json({ might_like: mightLike, use_what_you_have: useWhatYouHave })
      } catch (err: any) {
        if (err?.message?.includes('does not exist') || err?.code === '42P01') {
          return NextResponse.json({ might_like: [], use_what_you_have: [] })
        }
        throw err
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Grocery GET error:', error)
    return NextResponse.json({ error: 'Failed to load grocery data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'upload_receipt': {
        const { store, purchase_date, total_amount, snap_amount, cash_amount, items } = body
        if (!store || !purchase_date || !Array.isArray(items)) {
          return NextResponse.json({ error: 'store, purchase_date, and items required' }, { status: 400 })
        }

        // Create purchase_history row
        const purchaseRows = await db.query(
          `INSERT INTO purchase_history (store, purchase_date, total_amount, snap_amount, cash_amount, item_count)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [store, purchase_date, total_amount || 0, snap_amount || 0, cash_amount || 0, items.length]
        )
        const purchase = purchaseRows[0]

        // Insert purchase items
        let importedCount = 0
        for (const item of items) {
          await db.query(
            `INSERT INTO purchase_items (purchase_id, name, quantity, unit, unit_price, total_price, department)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [purchase.id, item.name, item.quantity || 1, item.unit || null, item.unit_price || null, item.total_price || null, item.department || 'Other']
          )
          importedCount++

          // Auto-update pantry_stock (upsert by canonical_name)
          const canonical = item.canonical_name || item.name.toLowerCase().trim()
          await db.query(
            `INSERT INTO pantry_stock (name, canonical_name, quantity, unit, department, preferred_store, active, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
             ON CONFLICT (canonical_name) DO UPDATE SET
               quantity = pantry_stock.quantity + EXCLUDED.quantity,
               updated_at = NOW()`,
            [item.name, canonical, item.quantity || 1, item.unit || null, item.department || 'Other', store, ]
          )
        }

        return NextResponse.json({ purchase_id: purchase.id, items_imported: importedCount })
      }

      case 'import_bulk': {
        const { store, purchases } = body
        if (!store || !Array.isArray(purchases)) {
          return NextResponse.json({ error: 'store and purchases array required' }, { status: 400 })
        }

        let imported = 0
        for (const p of purchases) {
          const purchaseRows = await db.query(
            `INSERT INTO purchase_history (store, purchase_date, total_amount, snap_amount, cash_amount, item_count)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [store, p.date, p.total || 0, p.snap || 0, p.cash || 0, (p.items || []).length]
          )
          const purchase = purchaseRows[0]

          for (const item of (p.items || [])) {
            await db.query(
              `INSERT INTO purchase_items (purchase_id, name, quantity, unit, unit_price, total_price, department)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [purchase.id, item.name, item.quantity || 1, item.unit || null, item.unit_price || null, item.total_price || null, item.department || 'Other']
            )
          }
          imported++
        }

        return NextResponse.json({ imported })
      }

      case 'adjust_pantry': {
        const { id, quantity, unit } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE pantry_stock SET quantity = $1, unit = $2, updated_at = NOW() WHERE id = $3`,
          [quantity, unit, id]
        )
        return NextResponse.json({ success: true })
      }

      case 'add_pantry_item': {
        const { name, canonical_name, quantity, unit, department, preferred_store, low_stock_threshold } = body
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO pantry_stock (name, canonical_name, quantity, unit, department, preferred_store, low_stock_threshold, active, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW()) RETURNING *`,
          [name.trim(), canonical_name || name.toLowerCase().trim(), quantity || 0, unit || null, department || 'Other', preferred_store || 'either', low_stock_threshold || null]
        )
        return NextResponse.json({ item: rows[0] })
      }

      case 'send_anylist_email': {
        const { email, list_name, items_text } = body
        if (!email || !items_text) {
          return NextResponse.json({ error: 'email and items_text required' }, { status: 400 })
        }
        // Email sending requires SMTP setup — for now return the formatted text
        return NextResponse.json({
          success: true,
          text: `To: ${email}\nSubject: ${list_name || 'Grocery List'}\n\n${items_text}`,
          note: 'Email sending requires SMTP configuration. Copy the text above and email it manually, or set up nodemailer with SMTP credentials.',
        })
      }

      case 'dismiss_insight': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        try {
          await db.query(`UPDATE spending_insights SET dismissed = true WHERE id = $1`, [id])
        } catch (err: any) {
          if (!err?.message?.includes('does not exist') && err?.code !== '42P01') throw err
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Grocery POST error:', error)
    return NextResponse.json({ error: 'Failed to process grocery action' }, { status: 500 })
  }
}
