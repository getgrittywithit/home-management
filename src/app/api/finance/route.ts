import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// GET /api/finance?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // get_finance_config
    // ------------------------------------------------------------------
    case 'get_finance_config': {
      try {
        const rows = await db.query(`SELECT * FROM finance_config LIMIT 1`)
        return NextResponse.json({ config: rows[0] || null })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ config: null })
        console.error('get_finance_config error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_budget_categories
    // ------------------------------------------------------------------
    case 'get_budget_categories': {
      try {
        const rows = await db.query(
          `SELECT * FROM budget_categories WHERE active = true ORDER BY sort_order, name`
        )
        return NextResponse.json({ categories: rows })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ categories: [] })
        console.error('get_budget_categories error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_transactions (month filter)
    // ------------------------------------------------------------------
    case 'get_transactions': {
      try {
        const month = searchParams.get('month') // e.g. 2026-03
        let q = `SELECT * FROM finance_transactions ORDER BY transaction_date DESC, created_at DESC`
        let params: any[] = []
        if (month) {
          const [year, mo] = month.split('-').map(Number)
          const start = `${month}-01`
          const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`
          q = `SELECT * FROM finance_transactions WHERE transaction_date >= $1 AND transaction_date < $2 ORDER BY transaction_date DESC, created_at DESC`
          params = [start, nextMonth]
        }
        const rows = await db.query(q, params)
        return NextResponse.json({ transactions: rows })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ transactions: [] })
        console.error('get_transactions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_monthly_summary (income/expense/net)
    // ------------------------------------------------------------------
    case 'get_monthly_summary': {
      try {
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const start = `${month}-01`
        const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

        const rows = await db.query(
          `SELECT
             COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::numeric as total_income,
             COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0), 0)::numeric as total_expense,
             COALESCE(SUM(amount), 0)::numeric as net
           FROM finance_transactions
           WHERE date >= $1 AND date < $2`,
          [start, nextMonth]
        )
        const r = rows[0] || {}
        return NextResponse.json({
          income: parseFloat(r.total_income) || 0,
          expense: parseFloat(r.total_expense) || 0,
          net: parseFloat(r.net) || 0,
          month,
        })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ income: 0, expense: 0, net: 0, month: '' })
        console.error('get_monthly_summary error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_grocery_spend — from Phase S purchase_history
    // ------------------------------------------------------------------
    case 'get_grocery_spend': {
      try {
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const start = `${month}-01`
        const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

        const rows = await db.query(
          `SELECT
             COALESCE(SUM(total_amount), 0)::numeric as total,
             COALESCE(SUM(snap_amount), 0)::numeric as snap_total,
             COALESCE(SUM(cash_amount), 0)::numeric as cash_total,
             COUNT(*)::int as trip_count
           FROM purchase_history
           WHERE purchase_date >= $1 AND purchase_date < $2`,
          [start, nextMonth]
        )
        const r = rows[0] || {}
        return NextResponse.json({
          total: parseFloat(r.total) || 0,
          snap_total: parseFloat(r.snap_total) || 0,
          cash_total: parseFloat(r.cash_total) || 0,
          trip_count: r.trip_count || 0,
          month,
        })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ total: 0, snap_total: 0, cash_total: 0, trip_count: 0, month: '' })
        console.error('get_grocery_spend error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_grocery_by_store
    // ------------------------------------------------------------------
    case 'get_grocery_by_store': {
      try {
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const start = `${month}-01`
        const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

        const rows = await db.query(
          `SELECT store, COALESCE(SUM(total_amount), 0)::numeric as total, COUNT(*)::int as trips
           FROM purchase_history
           WHERE purchase_date >= $1 AND purchase_date < $2
           GROUP BY store ORDER BY total DESC`,
          [start, nextMonth]
        )
        return NextResponse.json({
          stores: rows.map((r: any) => ({ store: r.store, total: parseFloat(r.total) || 0, trips: r.trips })),
        })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ stores: [] })
        console.error('get_grocery_by_store error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_snap_vs_cash
    // ------------------------------------------------------------------
    case 'get_snap_vs_cash': {
      try {
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const start = `${month}-01`
        const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`

        // Weekly breakdown for trend
        const weeklyRows = await db.query(
          `SELECT
             DATE_TRUNC('week', purchase_date)::date as week_start,
             COALESCE(SUM(snap_amount), 0)::numeric as snap,
             COALESCE(SUM(cash_amount), 0)::numeric as cash,
             COALESCE(SUM(total_amount), 0)::numeric as total
           FROM purchase_history
           WHERE purchase_date >= $1 AND purchase_date < $2
           GROUP BY DATE_TRUNC('week', purchase_date)
           ORDER BY week_start`,
          [start, nextMonth]
        )

        const totalRows = await db.query(
          `SELECT
             COALESCE(SUM(snap_amount), 0)::numeric as snap,
             COALESCE(SUM(cash_amount), 0)::numeric as cash,
             COALESCE(SUM(total_amount), 0)::numeric as total
           FROM purchase_history
           WHERE purchase_date >= $1 AND purchase_date < $2`,
          [start, nextMonth]
        )
        const t = totalRows[0] || {}

        return NextResponse.json({
          snap: parseFloat(t.snap) || 0,
          cash: parseFloat(t.cash) || 0,
          total: parseFloat(t.total) || 0,
          weekly: weeklyRows.map((r: any) => ({
            week_start: r.week_start,
            snap: parseFloat(r.snap) || 0,
            cash: parseFloat(r.cash) || 0,
            total: parseFloat(r.total) || 0,
          })),
        })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ snap: 0, cash: 0, total: 0, weekly: [] })
        console.error('get_snap_vs_cash error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_bills
    // ------------------------------------------------------------------
    case 'get_bills': {
      try {
        const rows = await db.query(
          `SELECT * FROM finance_bills WHERE active = true ORDER BY due_day, name`
        )
        return NextResponse.json({ bills: rows })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ bills: [] })
        console.error('get_bills error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_upcoming_bills (next N days)
    // ------------------------------------------------------------------
    case 'get_upcoming_bills': {
      try {
        const days = parseInt(searchParams.get('days') || '14')
        const today = new Date()
        const currentDay = today.getDate()
        const endDay = currentDay + days

        // Get all active bills and filter by proximity to due day
        const rows = await db.query(
          `SELECT b.*,
                  bp.paid_date as last_paid_date,
                  bp.amount as last_paid_amount
           FROM finance_bills b
           LEFT JOIN LATERAL (
             SELECT paid_date, amount FROM finance_bill_payments
             WHERE bill_id = b.id ORDER BY paid_date DESC LIMIT 1
           ) bp ON true
           WHERE b.active = true
           ORDER BY b.due_day`
        )

        const currentMonth = today.getMonth()
        const currentYear = today.getFullYear()

        const upcoming = rows.filter((bill: any) => {
          const dueDate = new Date(currentYear, currentMonth, bill.due_day)
          if (dueDate < today) {
            dueDate.setMonth(dueDate.getMonth() + 1)
          }
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays <= days
        }).map((bill: any) => {
          const dueDate = new Date(currentYear, currentMonth, bill.due_day)
          if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1)
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          // Check if paid this month
          const isPaidThisMonth = bill.last_paid_date &&
            new Date(bill.last_paid_date).getMonth() === currentMonth &&
            new Date(bill.last_paid_date).getFullYear() === currentYear

          return { ...bill, days_until_due: diffDays, is_paid_this_month: isPaidThisMonth }
        })

        return NextResponse.json({ bills: upcoming })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ bills: [] })
        console.error('get_upcoming_bills error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_subscriptions
    // ------------------------------------------------------------------
    case 'get_subscriptions': {
      try {
        const rows = await db.query(
          `SELECT * FROM finance_subscriptions ORDER BY status, name`
        )
        return NextResponse.json({ subscriptions: rows })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ subscriptions: [] })
        console.error('get_subscriptions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_subscription_totals
    // ------------------------------------------------------------------
    case 'get_subscription_totals': {
      try {
        const rows = await db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN billing_cycle = 'monthly' THEN amount ELSE 0 END), 0)::numeric as monthly_total,
             COALESCE(SUM(CASE WHEN billing_cycle = 'annual' THEN amount ELSE 0 END), 0)::numeric as annual_total,
             COALESCE(SUM(CASE WHEN billing_cycle = 'monthly' THEN amount ELSE amount / 12.0 END), 0)::numeric as effective_monthly,
             COUNT(*)::int as count
           FROM finance_subscriptions
           WHERE status = 'active'`
        )
        const r = rows[0] || {}
        return NextResponse.json({
          monthly_total: parseFloat(r.monthly_total) || 0,
          annual_total: parseFloat(r.annual_total) || 0,
          effective_monthly: parseFloat(r.effective_monthly) || 0,
          count: r.count || 0,
        })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ monthly_total: 0, annual_total: 0, effective_monthly: 0, count: 0 })
        console.error('get_subscription_totals error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_income (month filter)
    // ------------------------------------------------------------------
    case 'get_income': {
      try {
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const start = `${month}-01`
        const nextMonth = mo === 12 ? `${year + 1}-01-01` : `${year}-${String(mo + 1).padStart(2, '0')}-01`
        const yearStart = `${year}-01-01`

        const monthRows = await db.query(
          `SELECT * FROM finance_income
           WHERE income_date >= $1 AND income_date < $2
           ORDER BY income_date DESC`,
          [start, nextMonth]
        )

        const summaryRows = await db.query(
          `SELECT
             COALESCE(SUM(amount) FILTER (WHERE income_date >= $1 AND income_date < $2), 0)::numeric as month_total,
             COALESCE(SUM(amount) FILTER (WHERE income_date >= $3 AND income_date < $2), 0)::numeric as ytd_total
           FROM finance_income`,
          [start, nextMonth, yearStart]
        )
        const s = summaryRows[0] || {}

        return NextResponse.json({
          entries: monthRows,
          month_total: parseFloat(s.month_total) || 0,
          ytd_total: parseFloat(s.ytd_total) || 0,
          month,
        })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ entries: [], month_total: 0, ytd_total: 0, month: '' })
        console.error('get_income error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_bank_balances
    // ------------------------------------------------------------------
    case 'get_bank_balances': {
      try {
        const rows = await db.query(
          `SELECT * FROM finance_bank_accounts WHERE active = true ORDER BY sort_order, name`
        )
        return NextResponse.json({ accounts: rows })
      } catch (error: any) {
        if (error?.code === '42P01') return NextResponse.json({ accounts: [] })
        console.error('get_bank_balances error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

// ============================================================================
// POST /api/finance
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ------------------------------------------------------------------
      // update_finance_config
      // ------------------------------------------------------------------
      case 'update_finance_config': {
        try {
          const { grocery_budget, snap_monthly, bills_budget } = body
          const rows = await db.query(
            `INSERT INTO finance_config (id, grocery_budget, snap_monthly, bills_budget, updated_at)
             VALUES (1, $1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               grocery_budget = COALESCE($1, finance_config.grocery_budget),
               snap_monthly = COALESCE($2, finance_config.snap_monthly),
               bills_budget = COALESCE($3, finance_config.bills_budget),
               updated_at = NOW()
             RETURNING *`,
            [grocery_budget, snap_monthly, bills_budget]
          )
          return NextResponse.json({ config: rows[0] })
        } catch (error: any) {
          console.error('update_finance_config error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // create_category
      // ------------------------------------------------------------------
      case 'create_category': {
        try {
          const { name, type: categoryType, color, budget_amount, icon } = body
          if (!name || !categoryType) return NextResponse.json({ error: 'name and type required' }, { status: 400 })
          const rows = await db.query(
            `INSERT INTO budget_categories (name, category_type, color, budget_amount, icon, active)
             VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
            [name, categoryType, color || '#6B7280', budget_amount || 0, icon || null]
          )
          return NextResponse.json({ category: rows[0] })
        } catch (error: any) {
          console.error('create_category error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // update_category
      // ------------------------------------------------------------------
      case 'update_category': {
        try {
          const { id, name, color, budget_amount, active } = body
          if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
          const rows = await db.query(
            `UPDATE budget_categories SET
               name = COALESCE($2, name),
               color = COALESCE($3, color),
               budget_amount = COALESCE($4, budget_amount),
               active = COALESCE($5, active),
               updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id, name, color, budget_amount, active]
          )
          return NextResponse.json({ category: rows[0] })
        } catch (error: any) {
          console.error('update_category error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // add_transaction
      // ------------------------------------------------------------------
      case 'add_transaction': {
        try {
          const { description, amount, type, category, transaction_date, payment_method, notes } = body
          if (!description || !amount || !type) {
            return NextResponse.json({ error: 'description, amount, and type required' }, { status: 400 })
          }
          const rows = await db.query(
            `INSERT INTO finance_transactions (description, amount, type, category, transaction_date, payment_method, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [description, amount, type, category || 'general', transaction_date || new Date().toISOString().split('T')[0], payment_method || null, notes || null]
          )
          return NextResponse.json({ transaction: rows[0] })
        } catch (error: any) {
          console.error('add_transaction error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // mark_bill_paid — logs transaction + records payment
      // ------------------------------------------------------------------
      case 'mark_bill_paid': {
        try {
          const { bill_id, amount, paid_date, payment_method } = body
          if (!bill_id) return NextResponse.json({ error: 'bill_id required' }, { status: 400 })

          // Get bill info
          const billRows = await db.query(`SELECT * FROM finance_bills WHERE id = $1`, [bill_id])
          const bill = billRows[0]
          if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

          const paidAmount = amount || bill.amount
          const paidDate = paid_date || new Date().toISOString().split('T')[0]

          // Record bill payment
          await db.query(
            `INSERT INTO finance_bill_payments (bill_id, amount, paid_date, payment_method)
             VALUES ($1, $2, $3, $4)`,
            [bill_id, paidAmount, paidDate, payment_method || null]
          )

          // Log as transaction
          await db.query(
            `INSERT INTO finance_transactions (description, amount, type, category, transaction_date, payment_method, notes)
             VALUES ($1, $2, 'expense', 'bills', $3, $4, $5)`,
            [`Bill: ${bill.name}`, paidAmount, paidDate, payment_method || null, `Auto-logged from bill payment`]
          )

          return NextResponse.json({ success: true, amount: paidAmount, date: paidDate })
        } catch (error: any) {
          console.error('mark_bill_paid error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // create_bill
      // ------------------------------------------------------------------
      case 'create_bill': {
        try {
          const { name, amount, due_day, category, autopay, notes } = body
          if (!name || !amount || !due_day) {
            return NextResponse.json({ error: 'name, amount, and due_day required' }, { status: 400 })
          }
          const rows = await db.query(
            `INSERT INTO finance_bills (name, amount, due_day, category, autopay, notes, active)
             VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
            [name, amount, due_day, category || 'general', autopay || false, notes || null]
          )
          return NextResponse.json({ bill: rows[0] })
        } catch (error: any) {
          console.error('create_bill error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // update_bill
      // ------------------------------------------------------------------
      case 'update_bill': {
        try {
          const { id, name, amount, due_day, category, autopay, notes, active } = body
          if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
          const rows = await db.query(
            `UPDATE finance_bills SET
               name = COALESCE($2, name),
               amount = COALESCE($3, amount),
               due_day = COALESCE($4, due_day),
               category = COALESCE($5, category),
               autopay = COALESCE($6, autopay),
               notes = COALESCE($7, notes),
               active = COALESCE($8, active),
               updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id, name, amount, due_day, category, autopay, notes, active]
          )
          return NextResponse.json({ bill: rows[0] })
        } catch (error: any) {
          console.error('update_bill error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // add_subscription
      // ------------------------------------------------------------------
      case 'add_subscription': {
        try {
          const { name, amount, billing_cycle, category, renewal_date, notes } = body
          if (!name || !amount) return NextResponse.json({ error: 'name and amount required' }, { status: 400 })
          const rows = await db.query(
            `INSERT INTO finance_subscriptions (name, amount, billing_cycle, category, renewal_date, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
            [name, amount, billing_cycle || 'monthly', category || 'general', renewal_date || null, notes || null]
          )
          return NextResponse.json({ subscription: rows[0] })
        } catch (error: any) {
          console.error('add_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // flag_subscription_review
      // ------------------------------------------------------------------
      case 'flag_subscription_review': {
        try {
          const { id } = body
          if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
          const rows = await db.query(
            `UPDATE finance_subscriptions SET status = 'review', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
          )
          return NextResponse.json({ subscription: rows[0] })
        } catch (error: any) {
          console.error('flag_subscription_review error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // cancel_subscription
      // ------------------------------------------------------------------
      case 'cancel_subscription': {
        try {
          const { id } = body
          if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
          const rows = await db.query(
            `UPDATE finance_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
          )
          return NextResponse.json({ subscription: rows[0] })
        } catch (error: any) {
          console.error('cancel_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // log_income
      // ------------------------------------------------------------------
      case 'log_income': {
        try {
          const { source, amount, income_date, notes, category } = body
          if (!source || !amount) return NextResponse.json({ error: 'source and amount required' }, { status: 400 })
          const date = income_date || new Date().toISOString().split('T')[0]
          const rows = await db.query(
            `INSERT INTO finance_income (source, amount, income_date, notes, category)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [source, amount, date, notes || null, category || 'business']
          )

          // Also log as transaction
          await db.query(
            `INSERT INTO finance_transactions (description, amount, type, category, transaction_date, notes)
             VALUES ($1, $2, 'income', $3, $4, $5)`,
            [`Income: ${source}`, amount, category || 'business', date, notes || null]
          )

          return NextResponse.json({ income: rows[0] })
        } catch (error: any) {
          console.error('log_income error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // update_bank_balance
      // ------------------------------------------------------------------
      case 'update_bank_balance': {
        try {
          const { id, balance, name, account_type } = body
          if (!id && !name) return NextResponse.json({ error: 'id or name required' }, { status: 400 })

          let rows
          if (id) {
            rows = await db.query(
              `UPDATE finance_bank_accounts SET balance = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
              [id, balance]
            )
          } else {
            rows = await db.query(
              `INSERT INTO finance_bank_accounts (name, account_type, balance, active)
               VALUES ($1, $2, $3, true)
               ON CONFLICT (name) DO UPDATE SET balance = $3, updated_at = NOW()
               RETURNING *`,
              [name, account_type || 'checking', balance]
            )
          }
          return NextResponse.json({ account: rows[0] })
        } catch (error: any) {
          console.error('update_bank_balance error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      // ------------------------------------------------------------------
      // import_transactions_csv (array of rows)
      // ------------------------------------------------------------------
      case 'import_transactions_csv': {
        try {
          const { rows: csvRows } = body
          if (!Array.isArray(csvRows) || csvRows.length === 0) {
            return NextResponse.json({ error: 'rows array required' }, { status: 400 })
          }

          let imported = 0
          for (const row of csvRows) {
            try {
              await db.query(
                `INSERT INTO finance_transactions (description, amount, type, category, transaction_date, payment_method, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  row.description || 'Imported',
                  row.amount || 0,
                  row.type || 'expense',
                  row.category || 'general',
                  row.date || new Date().toISOString().split('T')[0],
                  row.payment_method || null,
                  row.notes || 'CSV import',
                ]
              )
              imported++
            } catch (err) {
              console.error('import row error:', err)
            }
          }

          return NextResponse.json({ imported, total: csvRows.length })
        } catch (error: any) {
          console.error('import_transactions_csv error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Finance POST error:', error)
    return NextResponse.json({ error: 'Failed to process finance action' }, { status: 500 })
  }
}
