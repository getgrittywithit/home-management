import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { syncFoodBudget, currentMonth } from '@/lib/budget'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

function getPlaidClient(): PlaidApi | null {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET
  const env = (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments
  if (!clientId || !secret) return null
  return new PlaidApi(new Configuration({
    basePath: PlaidEnvironments[env] || PlaidEnvironments.sandbox,
    baseOptions: { headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret } },
  }))
}

const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  heb: 'food', 'h-e-b': 'food', 'walmart grocery': 'food', 'walmart supercenter': 'food',
  walmart: 'household', target: 'household', amazon: 'household',
  'home depot': 'maintenance', lowes: 'maintenance', 'lowe\'s': 'maintenance', mccoys: 'maintenance',
  'harbor freight': 'maintenance',
  cvs: 'medical', walgreens: 'medical',
  shell: 'gas', valero: 'gas', 'murphy usa': 'gas', exxon: 'gas',
  progressive: 'subscriptions', netflix: 'subscriptions', spotify: 'subscriptions',
}

const TRITON_VENDORS = ['home depot', 'lowes', "lowe's", 'mccoys', 'harbor freight',
  'fastenal', 'ferguson', 'abc supply', 'lumber', 'plumbing']

function autoCategorizeMerchant(merchant: string | null): string | null {
  if (!merchant) return null
  const lower = merchant.toLowerCase()
  for (const [key, slug] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lower.includes(key)) return slug
  }
  return null
}

function detectEntity(merchant: string | null): string {
  if (!merchant) return 'personal'
  const lower = merchant.toLowerCase()
  if (TRITON_VENDORS.some(v => lower.includes(v))) return 'triton'
  return 'personal'
}

async function getCategoryId(slug: string): Promise<string | null> {
  const rows = await db.query(
    `SELECT id FROM budget_categories WHERE slug = $1 LIMIT 1`, [slug]
  ).catch(() => [] as any[])
  return rows[0]?.id || null
}

// ── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'get_accounts') {
      const rows = await db.query(
        `SELECT id, institution_name, account_names, status, last_synced_at, created_at
           FROM plaid_connections
          WHERE status != 'disconnected'
          ORDER BY created_at DESC`
      ).catch(() => [])
      return NextResponse.json({ accounts: rows, configured: !!getPlaidClient() })
    }

    if (action === 'create_link_token') {
      const client = getPlaidClient()
      if (!client) return NextResponse.json({ error: 'Plaid not configured — add PLAID_CLIENT_ID + PLAID_SECRET to Vercel env vars' }, { status: 503 })

      const response = await client.linkTokenCreate({
        user: { client_user_id: 'coral-family' },
        client_name: 'Coral Family App',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
      })
      return NextResponse.json({ link_token: response.data.link_token })
    }

    if (action === 'get_transactions') {
      const month = searchParams.get('month') || currentMonth()
      const entity = searchParams.get('entity')
      const reviewed = searchParams.get('reviewed')

      let sql = `SELECT ft.*, bc.name AS category_name, bc.emoji AS category_emoji, bc.slug AS category_slug
                   FROM finance_transactions ft
                   LEFT JOIN budget_categories bc ON bc.id = ft.category_id
                  WHERE ft.is_hidden = FALSE AND ft.parent_transaction_id IS NULL
                    AND to_char(ft.date, 'YYYY-MM') = $1`
      const params: any[] = [month]
      if (entity) { params.push(entity); sql += ` AND ft.entity = $${params.length}` }
      if (reviewed === 'false') sql += ` AND ft.is_reviewed = FALSE`
      if (reviewed === 'true') sql += ` AND ft.is_reviewed = TRUE`
      sql += ` ORDER BY ft.date DESC, ft.created_at DESC LIMIT 200`

      const rows = await db.query(sql, params).catch(() => [])
      const needsReview = await db.query(
        `SELECT COUNT(*)::int AS c FROM finance_transactions
          WHERE is_hidden = FALSE AND is_reviewed = FALSE AND parent_transaction_id IS NULL
            AND to_char(date, 'YYYY-MM') = $1`, [month]
      ).catch(() => [{ c: 0 }])

      return NextResponse.json({ transactions: rows, needs_review: needsReview[0]?.c || 0 })
    }

    if (action === 'get_triton_summary') {
      const month = searchParams.get('month') || currentMonth()
      const [y, m] = month.split('-').map(Number)
      const start = `${month}-01`
      const end = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

      const revenue = await db.query(
        `SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total FROM triton_jobs WHERE paid_at >= $1 AND paid_at < $2`,
        [start, end]
      ).catch(() => [{ total: 0 }])
      const materials = await db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM finance_transactions
          WHERE entity = 'triton' AND is_hidden = FALSE AND date >= $1 AND date < $2`,
        [start, end]
      ).catch(() => [{ total: 0 }])
      const labor = await db.query(
        `SELECT COALESCE(SUM(labor_hours * labor_rate), 0)::numeric AS total FROM triton_jobs WHERE paid_at >= $1 AND paid_at < $2`,
        [start, end]
      ).catch(() => [{ total: 0 }])
      const activeJobs = await db.query(
        `SELECT * FROM triton_jobs WHERE status NOT IN ('paid','cancelled','completed') ORDER BY created_at DESC`
      ).catch(() => [])
      const completedJobs = await db.query(
        `SELECT * FROM triton_jobs WHERE status IN ('paid','completed') AND paid_at >= $1 AND paid_at < $2 ORDER BY paid_at DESC`,
        [start, end]
      ).catch(() => [])
      const tritonTxns = await db.query(
        `SELECT ft.*, bc.emoji FROM finance_transactions ft LEFT JOIN budget_categories bc ON bc.id = ft.category_id
          WHERE ft.entity = 'triton' AND ft.is_hidden = FALSE AND ft.date >= $1 AND ft.date < $2
          ORDER BY ft.date DESC LIMIT 20`,
        [start, end]
      ).catch(() => [])

      return NextResponse.json({
        revenue: parseFloat(revenue[0]?.total) || 0,
        materials: parseFloat(materials[0]?.total) || 0,
        labor: parseFloat(labor[0]?.total) || 0,
        profit: (parseFloat(revenue[0]?.total) || 0) - (parseFloat(materials[0]?.total) || 0) - (parseFloat(labor[0]?.total) || 0),
        active_jobs: activeJobs,
        completed_jobs: completedJobs,
        triton_transactions: tritonTxns,
      })
    }

    if (action === 'list_triton_jobs') {
      const status = searchParams.get('status')
      let sql = `SELECT * FROM triton_jobs`
      const params: any[] = []
      if (status) { params.push(status); sql += ` WHERE status = $1` }
      sql += ` ORDER BY created_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ jobs: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Plaid GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'exchange_token': {
        const client = getPlaidClient()
        if (!client) return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 })
        const { public_token, institution } = body
        if (!public_token) return NextResponse.json({ error: 'public_token required' }, { status: 400 })

        const exchangeRes = await client.itemPublicTokenExchange({ public_token })
        const { access_token, item_id } = exchangeRes.data

        // Get account details
        const accountsRes = await client.accountsGet({ access_token })
        const accountIds = accountsRes.data.accounts.map(a => a.account_id)
        const accountNames = accountsRes.data.accounts.map(a =>
          `${a.name}${a.mask ? ' ••' + a.mask : ''}`
        )

        await db.query(
          `INSERT INTO plaid_connections (institution_name, institution_id, access_token, item_id, account_ids, account_names)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (item_id) DO UPDATE SET
             access_token = $3, account_ids = $5, account_names = $6, status = 'active'`,
          [
            institution?.name || 'Unknown Bank',
            institution?.institution_id || null,
            access_token, item_id,
            JSON.stringify(accountIds),
            JSON.stringify(accountNames),
          ]
        )

        return NextResponse.json({ success: true, accounts: accountNames })
      }

      case 'sync_transactions': {
        const client = getPlaidClient()
        if (!client) return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 })
        const { connection_id } = body

        const connections = connection_id
          ? await db.query(`SELECT * FROM plaid_connections WHERE id = $1 AND status = 'active'`, [connection_id])
          : await db.query(`SELECT * FROM plaid_connections WHERE status = 'active'`)

        let totalSynced = 0
        for (const conn of connections) {
          try {
            let hasMore = true
            let cursor = conn.cursor || ''

            while (hasMore) {
              const response = await client.transactionsSync({
                access_token: conn.access_token,
                cursor,
              })

              for (const txn of response.data.added) {
                const accountName = conn.account_names?.[
                  conn.account_ids?.indexOf(txn.account_id) ?? -1
                ] || txn.account_id

                const catSlug = autoCategorizeMerchant(txn.merchant_name || txn.name)
                const catId = catSlug ? await getCategoryId(catSlug) : null
                const entity = detectEntity(txn.merchant_name || txn.name)

                await db.query(
                  `INSERT INTO finance_transactions
                     (plaid_transaction_id, plaid_connection_id, account, merchant_name,
                      date, description, amount, plaid_category, category_id, entity)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                   ON CONFLICT (plaid_transaction_id) DO UPDATE SET
                     amount = $7, merchant_name = $4, description = $6`,
                  [
                    txn.transaction_id, conn.id, accountName,
                    txn.merchant_name || null,
                    txn.date, txn.name || '',
                    Math.abs(txn.amount),
                    txn.personal_finance_category ? JSON.stringify(txn.personal_finance_category) : null,
                    catId, entity,
                  ]
                )
                totalSynced++
              }

              // Handle removed transactions
              for (const removed of response.data.removed) {
                await db.query(
                  `UPDATE finance_transactions SET is_hidden = TRUE WHERE plaid_transaction_id = $1`,
                  [removed.transaction_id]
                ).catch(() => {})
              }

              cursor = response.data.next_cursor
              hasMore = response.data.has_more
            }

            await db.query(
              `UPDATE plaid_connections SET cursor = $1, last_synced_at = NOW() WHERE id = $2`,
              [cursor, conn.id]
            )
          } catch (e: any) {
            console.error(`Plaid sync error for connection ${conn.id}:`, e?.message)
            if (e?.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
              await db.query(`UPDATE plaid_connections SET status = 'error' WHERE id = $1`, [conn.id])
            }
          }
        }

        // Recompute food budget from real transactions
        await syncFoodBudget().catch(() => {})

        return NextResponse.json({ success: true, synced: totalSynced })
      }

      case 'update_transaction': {
        const { id, category_slug, entity, is_reviewed, is_hidden, notes } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        const sets: string[] = []
        const params: any[] = [id]
        if (category_slug !== undefined) {
          const catId = category_slug ? await getCategoryId(category_slug) : null
          params.push(catId)
          sets.push(`category_id = $${params.length}`)
        }
        if (entity !== undefined) { params.push(entity); sets.push(`entity = $${params.length}`) }
        if (is_reviewed !== undefined) { params.push(is_reviewed); sets.push(`is_reviewed = $${params.length}`) }
        if (is_hidden !== undefined) { params.push(is_hidden); sets.push(`is_hidden = $${params.length}`) }
        if (notes !== undefined) { params.push(notes); sets.push(`notes = $${params.length}`) }

        if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

        await db.query(`UPDATE finance_transactions SET ${sets.join(', ')} WHERE id = $1`, params)
        return NextResponse.json({ success: true })
      }

      case 'split_transaction': {
        const { id, splits } = body
        if (!id || !Array.isArray(splits) || splits.length < 2) {
          return NextResponse.json({ error: 'id + splits[] (min 2) required' }, { status: 400 })
        }

        // Mark parent as split
        await db.query(
          `UPDATE finance_transactions SET is_split = TRUE, entity = 'split' WHERE id = $1`, [id]
        )

        // Delete old splits
        await db.query(`DELETE FROM transaction_splits WHERE parent_transaction_id = $1`, [id])

        // Insert new splits
        for (const s of splits) {
          const catId = s.category_slug ? await getCategoryId(s.category_slug) : null
          await db.query(
            `INSERT INTO transaction_splits (parent_transaction_id, amount, category_id, entity, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, s.amount, catId, s.entity || 'personal', s.description || null]
          )
        }

        return NextResponse.json({ success: true })
      }

      case 'create_triton_job': {
        const { client_name, job_description, status, estimated_amount, source, source_email_id, notes } = body
        if (!client_name) return NextResponse.json({ error: 'client_name required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO triton_jobs (client_name, job_description, status, estimated_amount, source, source_email_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [client_name, job_description || null, status || 'lead', estimated_amount || null,
           source || null, source_email_id || null, notes || null]
        )
        return NextResponse.json({ job: rows[0] }, { status: 201 })
      }

      case 'update_triton_job': {
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const allowed = ['client_name', 'job_description', 'status', 'estimated_amount',
          'invoiced_amount', 'paid_amount', 'materials_cost', 'labor_hours', 'labor_rate',
          'source', 'notes', 'completed_at', 'paid_at']
        const sets: string[] = []
        const params: any[] = [id]
        for (const [k, v] of Object.entries(updates)) {
          if (allowed.includes(k)) { params.push(v === '' ? null : v); sets.push(`${k} = $${params.length}`) }
        }
        if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        const rows = await db.query(`UPDATE triton_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
        return NextResponse.json({ job: rows[0] })
      }

      case 'disconnect': {
        const { connection_id } = body
        if (!connection_id) return NextResponse.json({ error: 'connection_id required' }, { status: 400 })
        await db.query(`UPDATE plaid_connections SET status = 'disconnected' WHERE id = $1`, [connection_id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Plaid POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
