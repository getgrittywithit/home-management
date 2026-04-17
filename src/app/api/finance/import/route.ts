import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { syncFoodBudget } from '@/lib/budget'

const CATEGORY_RULES: Record<string, string[]> = {
  food: ['HEB', 'WALMART GROCERY', 'COSTCO', 'ALDI', 'WHATABURGER', 'MCDONALD', 'CHICK-FIL-A', 'TACO BELL', 'SONIC', 'PIZZA HUT', 'DOMINOS'],
  gas: ['SHELL', 'EXXON', 'VALERO', 'CHEVRON', 'BUCCEE', 'QT ', 'LOVES', 'MURPHY'],
  medical: ['CVS', 'WALGREENS', 'PSISA', 'STONEBRIDGE', 'LABCORP', 'QUEST', 'PHARMACY'],
  maintenance: ['HOME DEPOT', 'LOWES', 'ACE HARDWARE', 'MCCOYS', 'HARBOR FREIGHT'],
  school: ['BOERNE ISD', 'SCHOLASTIC'],
  subscriptions: ['NETFLIX', 'HULU', 'DISNEY', 'SPOTIFY', 'AMAZON PRIME', 'PROGRESSIVE', 'OSCAR HEALTH', 'APPLE.COM'],
  utilities: ['GVTC', 'CPS ENERGY', 'SAWS', 'AT&T', 'T-MOBILE'],
  household: ['DOLLAR TREE', 'DOLLAR GENERAL', 'TARGET', 'HOBBY LOBBY', 'MICHAELS'],
  personal: ['AMAZON'],
}

const SNAP_MERCHANTS = ['HEB', 'WALMART', 'COSTCO', 'ALDI', 'KROGER', 'ALBERTSONS']
const TRITON_MERCHANTS = ['HOME DEPOT', 'LOWES', 'MCCOYS', 'HARBOR FREIGHT', 'FASTENAL', 'FERGUSON']

function categorizeTransaction(description: string): { slug: string | null; isSnap: boolean; isBusiness: boolean } {
  const upper = description.toUpperCase()
  let slug: string | null = null
  for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(kw => upper.includes(kw))) { slug = cat; break }
  }
  const isSnap = SNAP_MERCHANTS.some(m => upper.includes(m))
  const isBusiness = TRITON_MERCHANTS.some(m => upper.includes(m))
  return { slug, isSnap, isBusiness }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'import_csv') {
      const { csv_text } = body
      if (!csv_text) return NextResponse.json({ error: 'csv_text required' }, { status: 400 })

      const lines = csv_text.split('\n').filter((l: string) => l.trim())
      const batchId = crypto.randomUUID()
      const transactions: any[] = []
      let skipped = 0

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length < 3) continue

        const dateStr = cols[0]?.replace(/"/g, '')
        const description = cols[1]?.replace(/"/g, '') || ''
        const amountStr = cols[2]?.replace(/"/g, '').replace(/,/g, '') || '0'
        const amount = Math.abs(parseFloat(amountStr) || 0)
        const isExpense = parseFloat(amountStr) < 0

        if (!dateStr || amount === 0) continue

        // Parse date (MM/DD/YYYY or YYYY-MM-DD)
        let date: string
        if (dateStr.includes('/')) {
          const [m, d, y] = dateStr.split('/')
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        } else {
          date = dateStr
        }

        // Check for duplicates
        const existing = await db.query(
          `SELECT 1 FROM finance_transactions WHERE date = $1 AND amount = $2 AND description = $3 LIMIT 1`,
          [date, isExpense ? amount : -amount, description]
        ).catch(() => [])
        if (existing.length > 0) { skipped++; continue }

        const { slug, isSnap, isBusiness } = categorizeTransaction(description)
        const categoryId = slug ? await db.query(`SELECT id FROM budget_categories WHERE slug = $1 LIMIT 1`, [slug]).catch(() => []) : []

        transactions.push({
          date, description, amount: isExpense ? amount : -amount,
          category_id: categoryId[0]?.id || null,
          entity: isBusiness ? 'triton' : 'personal',
          is_snap: isSnap, is_business: isBusiness,
          import_batch_id: batchId, auto_categorized: !!slug,
          merchant_name: description.split(/\s{2,}/)[0] || description.substring(0, 30),
        })
      }

      // Insert all
      let imported = 0
      for (const t of transactions) {
        await db.query(
          `INSERT INTO finance_transactions (date, description, amount, category_id, entity, is_snap, is_business, import_batch_id, auto_categorized, merchant_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [t.date, t.description, t.amount, t.category_id, t.entity, t.is_snap, t.is_business, t.import_batch_id, t.auto_categorized, t.merchant_name]
        ).catch(() => {})
        imported++
      }

      // Sync food budget
      await syncFoodBudget().catch(() => {})

      return NextResponse.json({
        success: true, imported, skipped, batch_id: batchId,
        preview: transactions.slice(0, 10),
      })
    }

    if (action === 'snap_status') {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const daysElapsed = now.getDate()
      const daysLeft = daysInMonth - daysElapsed

      const snapBudget = 1141
      const cashBudget = 359

      const spending = await db.query(
        `SELECT COALESCE(SUM(CASE WHEN is_snap THEN ABS(amount) ELSE 0 END), 0)::numeric AS snap_spent,
                COALESCE(SUM(CASE WHEN NOT is_snap AND category_id IN (SELECT id FROM budget_categories WHERE slug = 'food') THEN ABS(amount) ELSE 0 END), 0)::numeric AS cash_food_spent
           FROM finance_transactions
          WHERE to_char(date, 'YYYY-MM') = $1 AND amount > 0`,
        [month]
      ).catch(() => [{ snap_spent: 0, cash_food_spent: 0 }])

      const snapSpent = parseFloat(spending[0]?.snap_spent) || 0
      const cashFoodSpent = parseFloat(spending[0]?.cash_food_spent) || 0
      const snapRemaining = Math.max(0, snapBudget - snapSpent)
      const dailyBurn = daysElapsed > 0 ? snapSpent / daysElapsed : 0
      const projectedEnd = snapRemaining - (dailyBurn * daysLeft)

      let status = 'on_track'
      if (projectedEnd < 0) status = 'over_budget'
      else if (projectedEnd < 100) status = 'tight'
      else if (snapSpent / snapBudget < 0.3 && daysElapsed > 10) status = 'under_budget'

      return NextResponse.json({
        snap: { monthly: snapBudget, spent: snapSpent, remaining: snapRemaining, daily_burn: Math.round(dailyBurn * 100) / 100, projected_end: Math.round(projectedEnd * 100) / 100, days_left: daysLeft, status },
        cash: { monthly: cashBudget, spent: cashFoodSpent, remaining: Math.max(0, cashBudget - cashFoodSpent) },
        combined: { budget: snapBudget + cashBudget, spent: snapSpent + cashFoodSpent, pct: Math.round(((snapSpent + cashFoodSpent) / (snapBudget + cashBudget)) * 100) },
      })
    }

    if (action === 'get_bills') {
      const rows = await db.query(
        `SELECT * FROM recurring_bills WHERE is_active = TRUE ORDER BY due_day NULLS LAST, name`
      ).catch(() => [])
      return NextResponse.json({ bills: rows })
    }

    if (action === 'add_bill') {
      const { name, amount, frequency, due_day, payment_method, is_auto_pay, notes } = body
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO recurring_bills (name, amount, frequency, due_day, payment_method, is_auto_pay, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, amount || null, frequency || 'monthly', due_day || null, payment_method || null, is_auto_pay || false, notes || null]
      )
      return NextResponse.json({ bill: rows[0] }, { status: 201 })
    }

    if (action === 'update_bill') {
      const { id, ...updates } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const allowed = ['name', 'amount', 'frequency', 'due_day', 'payment_method', 'is_auto_pay', 'is_active', 'notes', 'last_paid_date', 'last_paid_amount']
      const sets: string[] = []
      const params: any[] = [id]
      for (const [k, v] of Object.entries(updates)) {
        if (allowed.includes(k)) { params.push(v); sets.push(`${k} = $${params.length}`) }
      }
      if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
      const rows = await db.query(`UPDATE recurring_bills SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
      return NextResponse.json({ bill: rows[0] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Finance import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
