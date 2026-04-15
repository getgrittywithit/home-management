import { db } from '@/lib/database'

// ============================================================================
// Dispatch 78 — Unified Budget helpers
// Single source of truth for SNAP + cash + cash-only category spending.
// Called from /api/grocery (on receipt/spending changes) and /api/finance
// (on mark_purchased / update_budget).
// ============================================================================

export function currentMonth(): string {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  )
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function getCategoryId(slug: string): Promise<string | null> {
  const rows = await db.query(
    `SELECT id FROM budget_categories WHERE slug = $1 LIMIT 1`,
    [slug]
  ).catch(() => [] as any[])
  return rows[0]?.id || null
}

/**
 * Recompute the food row in budget_monthly for a month by summing
 * purchase_history. Called after any grocery spending change.
 */
export async function syncFoodBudget(month: string = currentMonth()): Promise<void> {
  const foodId = await getCategoryId('food')
  if (!foodId) return

  const [year, mo] = month.split('-').map(Number)
  const start = `${month}-01`
  const nextMonth =
    mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

  const rows = await db.query(
    `SELECT COALESCE(SUM(snap_amount), 0)::numeric AS snap_total,
            COALESCE(SUM(cash_amount), 0)::numeric AS cash_total
       FROM purchase_history
      WHERE purchase_date >= $1 AND purchase_date < $2`,
    [start, nextMonth]
  ).catch(() => [{ snap_total: 0, cash_total: 0 }])

  const snapTotal = parseFloat(rows[0]?.snap_total || 0) || 0
  const cashTotal = parseFloat(rows[0]?.cash_total || 0) || 0

  // Pull current food budget so we seed budgeted accurately
  const cat = await db.query(
    `SELECT monthly_amount FROM budget_categories WHERE id = $1`,
    [foodId]
  ).catch(() => [] as any[])
  const budgeted = parseFloat(cat[0]?.monthly_amount || 1500) || 1500

  await db.query(
    `INSERT INTO budget_monthly (category_id, month, budgeted, spent_snap, spent_cash, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (category_id, month)
     DO UPDATE SET spent_snap = EXCLUDED.spent_snap,
                   spent_cash = EXCLUDED.spent_cash,
                   budgeted   = EXCLUDED.budgeted,
                   updated_at = NOW()`,
    [foodId, month, budgeted, snapTotal, cashTotal]
  ).catch((e) => {
    console.error('syncFoodBudget insert error:', e)
  })
}

/**
 * Add `amount` to a category's spent_snap or spent_cash for the given month.
 * Used by mark_purchased so non-food spending also flows to budget_monthly.
 */
export async function recordCategorySpend(
  categoryId: string,
  month: string,
  amount: number,
  paymentType: 'snap' | 'cash'
): Promise<void> {
  if (!categoryId || !amount) return

  const cat = await db.query(
    `SELECT monthly_amount FROM budget_categories WHERE id = $1`,
    [categoryId]
  ).catch(() => [] as any[])
  const budgeted = parseFloat(cat[0]?.monthly_amount || 0) || 0

  const snapDelta = paymentType === 'snap' ? amount : 0
  const cashDelta = paymentType === 'cash' ? amount : 0

  await db.query(
    `INSERT INTO budget_monthly (category_id, month, budgeted, spent_snap, spent_cash, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (category_id, month)
     DO UPDATE SET spent_snap = budget_monthly.spent_snap + $4,
                   spent_cash = budget_monthly.spent_cash + $5,
                   updated_at = NOW()`,
    [categoryId, month, budgeted, snapDelta, cashDelta]
  ).catch((e) => {
    console.error('recordCategorySpend error:', e)
  })
}
