import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list_clients'

  try {
    if (action === 'list_clients') {
      const status = searchParams.get('status')
      const search = searchParams.get('q')
      let sql = `SELECT * FROM triton_clients`
      const params: any[] = []
      const conditions: string[] = []
      if (status) { params.push(status); conditions.push(`status = $${params.length}`) }
      if (search) { params.push(`%${search}%`); conditions.push(`(name ILIKE $${params.length} OR notes ILIKE $${params.length})`) }
      if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ')
      sql += ` ORDER BY last_contact_at DESC NULLS LAST, created_at DESC`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ clients: rows })
    }

    if (action === 'get_client') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const client = await db.query(`SELECT * FROM triton_clients WHERE id = $1`, [id])
      const jobs = await db.query(`SELECT * FROM triton_jobs WHERE client_id = $1 ORDER BY created_at DESC`, [id]).catch(() => [])
      return NextResponse.json({ client: client[0] || null, jobs })
    }

    if (action === 'list_jobs') {
      const status = searchParams.get('status')
      const category = searchParams.get('category')
      let sql = `SELECT j.*, c.name AS client_display_name, c.phone AS client_phone
                   FROM triton_jobs j LEFT JOIN triton_clients c ON c.id = j.client_id`
      const params: any[] = []
      const conditions: string[] = []
      if (status) { params.push(status); conditions.push(`j.status = $${params.length}`) }
      if (category) { params.push(category); conditions.push(`j.category = $${params.length}`) }
      if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ')
      sql += ` ORDER BY j.created_at DESC LIMIT 100`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ jobs: rows })
    }

    if (action === 'get_job') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const job = await db.query(
        `SELECT j.*, c.name AS client_display_name, c.phone AS client_phone, c.email AS client_email, c.address AS client_address
           FROM triton_jobs j LEFT JOIN triton_clients c ON c.id = j.client_id WHERE j.id = $1`, [id]
      )
      const estimates = await db.query(`SELECT * FROM triton_estimates WHERE job_id = $1 ORDER BY created_at DESC`, [parseInt(id)]).catch(() => [])
      const invoices = await db.query(`SELECT * FROM triton_invoices WHERE job_id = $1 ORDER BY created_at DESC`, [parseInt(id)]).catch(() => [])
      return NextResponse.json({ job: job[0] || null, estimates, invoices })
    }

    if (action === 'job_stats') {
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const yearStart = `${now.getFullYear()}-01-01`

      const mtd = await db.query(`SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total FROM triton_jobs WHERE paid_at >= $1`, [monthStart]).catch(() => [{ total: 0 }])
      const ytd = await db.query(`SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total FROM triton_jobs WHERE paid_at >= $1`, [yearStart]).catch(() => [{ total: 0 }])
      const byStatus = await db.query(`SELECT status, COUNT(*)::int AS c FROM triton_jobs GROUP BY status`).catch(() => [])
      const avgJob = await db.query(`SELECT COALESCE(AVG(paid_amount), 0)::numeric AS avg FROM triton_jobs WHERE paid_amount > 0`).catch(() => [{ avg: 0 }])

      // Stale jobs needing follow-up
      const stale = await db.query(
        `SELECT j.*, c.name AS client_display_name FROM triton_jobs j
           LEFT JOIN triton_clients c ON c.id = j.client_id
          WHERE (j.status = 'lead' AND j.created_at < NOW() - INTERVAL '3 days')
             OR (j.status = 'estimated' AND j.created_at < NOW() - INTERVAL '7 days')
             OR (j.status = 'invoiced' AND j.created_at < NOW() - INTERVAL '14 days')
          ORDER BY j.created_at`
      ).catch(() => [])

      return NextResponse.json({
        revenue_mtd: parseFloat(mtd[0]?.total) || 0,
        revenue_ytd: parseFloat(ytd[0]?.total) || 0,
        avg_job: parseFloat(avgJob[0]?.avg) || 0,
        by_status: byStatus,
        follow_up_needed: stale,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Triton GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'save_client': {
        const { id, name, nickname, phone, email, address, gate_code, city, source, referred_by, status, notes } = body
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

        if (id) {
          const rows = await db.query(
            `UPDATE triton_clients SET name=$2, nickname=$3, phone=$4, email=$5, address=$6, gate_code=$7,
               city=$8, source=$9, referred_by=$10, status=$11, notes=$12, updated_at=NOW()
             WHERE id=$1 RETURNING *`,
            [id, name, nickname||null, phone||null, email||null, address||null, gate_code||null,
             city||'Boerne', source||null, referred_by||null, status||'active', notes||null]
          )
          return NextResponse.json({ client: rows[0] })
        }

        const rows = await db.query(
          `INSERT INTO triton_clients (name, nickname, phone, email, address, gate_code, city, source, referred_by, notes, first_contact_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
          [name, nickname||null, phone||null, email||null, address||null, gate_code||null,
           city||'Boerne', source||null, referred_by||null, notes||null]
        )
        return NextResponse.json({ client: rows[0] }, { status: 201 })
      }

      case 'create_job': {
        const { client_id, client_name, job_description, category, estimated_amount, job_address, source, notes } = body
        if (!client_name && !client_id) return NextResponse.json({ error: 'client_name or client_id required' }, { status: 400 })

        const rows = await db.query(
          `INSERT INTO triton_jobs (client_id, client_name, job_description, category, estimated_amount, job_address, source, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [client_id||null, client_name||'Unknown', job_description||null, category||null,
           estimated_amount||null, job_address||null, source||null, notes||null]
        )

        if (client_id) {
          await db.query(`UPDATE triton_clients SET total_jobs = total_jobs + 1, last_contact_at = NOW() WHERE id = $1`, [client_id]).catch(() => {})
        }

        return NextResponse.json({ job: rows[0] }, { status: 201 })
      }

      case 'update_job': {
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const allowed = ['client_id', 'client_name', 'job_description', 'status', 'category',
          'estimated_amount', 'invoiced_amount', 'paid_amount', 'materials_cost',
          'labor_hours', 'labor_rate', 'job_address', 'scheduled_date', 'scheduled_time',
          'completion_date', 'source', 'notes', 'completed_at', 'paid_at']
        const sets: string[] = []
        const params: any[] = [id]
        for (const [k, v] of Object.entries(updates)) {
          if (allowed.includes(k)) { params.push(v === '' ? null : v); sets.push(`${k} = $${params.length}`) }
        }
        if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        const rows = await db.query(`UPDATE triton_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)

        // If marked paid, update client revenue
        if (updates.status === 'paid' && rows[0]?.client_id && rows[0]?.paid_amount) {
          await db.query(
            `UPDATE triton_clients SET total_revenue = total_revenue + $1, last_contact_at = NOW() WHERE id = $2`,
            [rows[0].paid_amount, rows[0].client_id]
          ).catch(() => {})
        }

        return NextResponse.json({ job: rows[0] })
      }

      case 'create_estimate': {
        const { job_id, client_id, line_items, notes, valid_until } = body
        if (!line_items?.length) return NextResponse.json({ error: 'line_items required' }, { status: 400 })

        const subtotal = line_items.reduce((s: number, i: any) => s + (parseFloat(i.total) || 0), 0)
        const rows = await db.query(
          `INSERT INTO triton_estimates (job_id, client_id, line_items, subtotal, total, notes, valid_until)
           VALUES ($1, $2, $3, $4, $4, $5, $6) RETURNING *`,
          [job_id||null, client_id||null, JSON.stringify(line_items), subtotal, notes||null, valid_until||null]
        )

        if (job_id) {
          await db.query(`UPDATE triton_jobs SET status = 'estimated', estimated_amount = $1 WHERE id = $2 AND status = 'lead'`, [subtotal, job_id]).catch(() => {})
        }

        return NextResponse.json({ estimate: rows[0] }, { status: 201 })
      }

      case 'create_invoice': {
        const { job_id, client_id, estimate_id, line_items, due_date, notes } = body
        if (!line_items?.length) return NextResponse.json({ error: 'line_items required' }, { status: 400 })

        const year = new Date().getFullYear()
        const countRes = await db.query(`SELECT COUNT(*)::int AS c FROM triton_invoices WHERE invoice_number LIKE $1`, [`TRITON-${year}-%`]).catch(() => [{ c: 0 }])
        const num = (countRes[0]?.c || 0) + 1
        const invoiceNumber = `TRITON-${year}-${String(num).padStart(3, '0')}`

        const subtotal = line_items.reduce((s: number, i: any) => s + (parseFloat(i.total) || 0), 0)
        const rows = await db.query(
          `INSERT INTO triton_invoices (job_id, client_id, estimate_id, invoice_number, line_items, subtotal, total, due_date, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING *`,
          [job_id||null, client_id||null, estimate_id||null, invoiceNumber, JSON.stringify(line_items), subtotal, due_date||null, notes||null]
        )

        if (job_id) {
          await db.query(`UPDATE triton_jobs SET status = 'invoiced', invoiced_amount = $1 WHERE id = $2`, [subtotal, job_id]).catch(() => {})
        }

        return NextResponse.json({ invoice: rows[0] }, { status: 201 })
      }

      case 'mark_paid': {
        const { invoice_id, payment_method } = body
        if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

        const rows = await db.query(
          `UPDATE triton_invoices SET status = 'paid', paid_at = NOW(), payment_method = $2 WHERE id = $1 RETURNING *`,
          [invoice_id, payment_method || null]
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

        if (rows[0].job_id) {
          await db.query(
            `UPDATE triton_jobs SET status = 'paid', paid_amount = $1, paid_at = NOW() WHERE id = $2`,
            [rows[0].total, rows[0].job_id]
          ).catch(() => {})
        }
        if (rows[0].client_id) {
          await db.query(
            `UPDATE triton_clients SET total_revenue = total_revenue + $1, last_contact_at = NOW() WHERE id = $2`,
            [rows[0].total, rows[0].client_id]
          ).catch(() => {})
        }

        return NextResponse.json({ invoice: rows[0] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Triton POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
