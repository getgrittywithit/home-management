import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS email_inbox (
    id SERIAL PRIMARY KEY, gmail_id TEXT UNIQUE NOT NULL, thread_id TEXT,
    from_address TEXT NOT NULL, from_name TEXT, to_address TEXT, subject TEXT,
    snippet TEXT, body_preview TEXT, received_at TIMESTAMPTZ NOT NULL,
    read BOOLEAN DEFAULT FALSE, starred BOOLEAN DEFAULT FALSE,
    triaged BOOLEAN DEFAULT FALSE, category TEXT, priority TEXT DEFAULT 'normal',
    labels JSONB DEFAULT '[]', has_attachments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW())`)
  await db.query(`CREATE TABLE IF NOT EXISTS email_triage_results (
    id SERIAL PRIMARY KEY, email_id INTEGER REFERENCES email_inbox(id) ON DELETE CASCADE,
    category TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'normal',
    confidence REAL DEFAULT 0.0, suggested_action TEXT, action_details JSONB,
    calendar_suggestion JSONB, triaged_at TIMESTAMPTZ DEFAULT NOW())`)
  await db.query(`CREATE TABLE IF NOT EXISTS email_sender_rules (
    id SERIAL PRIMARY KEY, sender_pattern TEXT NOT NULL, sender_name TEXT,
    default_category TEXT NOT NULL, default_priority TEXT DEFAULT 'normal',
    auto_archive BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())`)
}

let ready = false
async function init() {
  if (!ready) {
    await ensureTables()
    // Seed default sender rules for Boerne ISD + common providers
    const defaultRules = [
      { pattern: '%boerneisd%', name: 'Boerne ISD', category: 'school', priority: 'normal' },
      { pattern: '%@boerneisd.net', name: 'Boerne ISD Staff', category: 'school', priority: 'normal' },
      { pattern: '%@psisatx.com', name: 'Psychosomatic Institute', category: 'medical', priority: 'normal' },
      { pattern: '%stonebridgealliance%', name: 'Stonebridge Behavioral', category: 'medical', priority: 'normal' },
      { pattern: '%noreply@google.com', name: 'Google Notifications', category: 'subscriptions', priority: 'low' },
      { pattern: '%tritonhandyman%', name: 'Triton Handyman', category: 'triton', priority: 'normal' },
    ]
    for (const rule of defaultRules) {
      await db.query(
        `INSERT INTO email_sender_rules (sender_pattern, sender_name, default_category, default_priority)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [rule.pattern, rule.name, rule.category, rule.priority]
      ).catch(() => {})
    }
    ready = true
  }
}

// ── Helpers ──

async function matchSenderRule(fromAddress: string): Promise<{ category: string; priority: string } | null> {
  const rules = await db.query(`SELECT sender_pattern, default_category, default_priority FROM email_sender_rules`)
  for (const rule of rules) {
    const pattern = rule.sender_pattern.replace(/%/g, '.*')
    if (new RegExp(pattern, 'i').test(fromAddress)) {
      return { category: rule.default_category, priority: rule.default_priority }
    }
  }
  return null
}

async function triageWithAI(email: { id: number; from_address: string; from_name: string; subject: string; snippet: string; body_preview: string }) {
  // AI triage using pattern similar to ai-buddy
  const categories = ['school', 'medical', 'triton', 'finance', 'family', 'subscriptions', 'junk']
  const priorities = ['urgent', 'normal', 'low', 'archive']

  // Heuristic triage (fast, no API key needed)
  const text = `${email.from_address} ${email.from_name || ''} ${email.subject || ''} ${email.snippet || ''}`.toLowerCase()

  let category = 'family'
  let priority = 'normal'
  let suggestedAction = 'none'

  if (text.includes('school') || text.includes('isd') || text.includes('teacher') || text.includes('grade') || text.includes('iep') || text.includes('504')) {
    category = 'school'
  } else if (text.includes('doctor') || text.includes('appointment') || text.includes('prescription') || text.includes('pharmacy') || text.includes('health') || text.includes('therapy')) {
    category = 'medical'
  } else if (text.includes('invoice') || text.includes('estimate') || text.includes('handyman') || text.includes('triton') || text.includes('job') || text.includes('customer')) {
    category = 'triton'
  } else if (text.includes('bank') || text.includes('payment') || text.includes('bill') || text.includes('statement') || text.includes('snap') || text.includes('balance')) {
    category = 'finance'
  } else if (text.includes('unsubscribe') || text.includes('newsletter') || text.includes('noreply') || text.includes('no-reply') || text.includes('promo') || text.includes('deal')) {
    category = 'subscriptions'; priority = 'low'
  } else if (text.includes('spam') || text.includes('winner') || text.includes('claim your') || text.includes('act now')) {
    category = 'junk'; priority = 'archive'
  }

  if (text.includes('urgent') || text.includes('asap') || text.includes('immediately') || text.includes('today')) {
    priority = 'urgent'
  }

  if (text.includes('reply') || text.includes('respond') || text.includes('get back') || text.includes('let me know')) {
    suggestedAction = 'reply_needed'
  } else if (text.includes('meeting') || text.includes('appointment') || text.includes('schedule')) {
    suggestedAction = 'schedule_event'
  } else if (text.includes('invoice') || text.includes('payment due') || text.includes('pay')) {
    suggestedAction = 'pay_bill'
  }

  // Store triage result
  await db.query(
    `INSERT INTO email_triage_results (email_id, category, priority, confidence, suggested_action, triaged_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [email.id, category, priority, 0.7, suggestedAction]
  )

  // Update the email record
  await db.query(
    `UPDATE email_inbox SET triaged = TRUE, category = $1, priority = $2 WHERE id = $3`,
    [category, priority, email.id]
  )

  return { category, priority, suggestedAction }
}

// ── GET ──

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''

  try {
    if (action === 'get_inbox') {
      const limit = parseInt(searchParams.get('limit') || '25')
      const offset = parseInt(searchParams.get('offset') || '0')
      const category = searchParams.get('category')
      const priority = searchParams.get('priority')
      const readFilter = searchParams.get('read')

      let sql = `SELECT id, gmail_id, from_address, from_name, subject, snippet, received_at,
        read, starred, triaged, category, priority, has_attachments FROM email_inbox`
      const params: any[] = []
      const conditions: string[] = []

      if (category) { params.push(category); conditions.push(`category = $${params.length}`) }
      if (priority) { params.push(priority); conditions.push(`priority = $${params.length}`) }
      if (readFilter === 'true') { conditions.push('read = TRUE') }
      if (readFilter === 'false') { conditions.push('read = FALSE') }

      if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
      sql += ` ORDER BY received_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(limit, offset)

      const rows = await db.query(sql, params)

      // Category counts
      const counts = await db.query(
        `SELECT category, COUNT(*) FILTER (WHERE read = FALSE) as unread, COUNT(*) as total
         FROM email_inbox GROUP BY category`
      ).catch(() => [])

      return NextResponse.json({ emails: rows, counts })
    }

    if (action === 'get_email') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM email_inbox WHERE id = $1`, [id])
      if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const triage = await db.query(
        `SELECT * FROM email_triage_results WHERE email_id = $1 ORDER BY triaged_at DESC LIMIT 1`, [id]
      ).catch(() => [])

      return NextResponse.json({ email: rows[0], triage: triage[0] || null })
    }

    if (action === 'get_sender_rules') {
      const rules = await db.query(`SELECT * FROM email_sender_rules ORDER BY sender_pattern`)
      return NextResponse.json({ rules })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Email GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// ── POST ──

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'sync_inbox': {
        // Gmail sync placeholder — requires OAuth token
        // For now, return status indicating sync is not configured
        // When Gmail OAuth is set up, this will call Gmail API
        return NextResponse.json({
          success: false,
          message: 'Gmail sync requires OAuth configuration. Add emails manually or configure Gmail API credentials.',
          hint: 'Set GMAIL_OAUTH_TOKEN in environment variables to enable sync.',
        })
      }

      case 'add_email': {
        // Manual email addition (for testing or forwarded emails)
        const { from_address, from_name, subject, snippet, body_preview, received_at } = body
        if (!from_address || !subject) return NextResponse.json({ error: 'from_address and subject required' }, { status: 400 })

        const gmailId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const ruleMatch = await matchSenderRule(from_address)

        const rows = await db.query(
          `INSERT INTO email_inbox (gmail_id, from_address, from_name, subject, snippet, body_preview, received_at, category, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [gmailId, from_address, from_name || null, subject, snippet || null, body_preview || null,
           received_at || new Date().toISOString(),
           ruleMatch?.category || null, ruleMatch?.priority || 'normal']
        )
        return NextResponse.json({ success: true, email: rows[0] })
      }

      case 'triage_email': {
        const { email_id } = body
        if (!email_id) return NextResponse.json({ error: 'email_id required' }, { status: 400 })
        const emails = await db.query(`SELECT * FROM email_inbox WHERE id = $1`, [email_id])
        if (!emails[0]) return NextResponse.json({ error: 'Email not found' }, { status: 404 })

        // First check sender rules
        const ruleMatch = await matchSenderRule(emails[0].from_address)
        if (ruleMatch) {
          await db.query(`UPDATE email_inbox SET triaged = TRUE, category = $1, priority = $2 WHERE id = $3`,
            [ruleMatch.category, ruleMatch.priority, email_id])
          await db.query(
            `INSERT INTO email_triage_results (email_id, category, priority, confidence, suggested_action)
             VALUES ($1, $2, $3, 1.0, 'rule_matched')`,
            [email_id, ruleMatch.category, ruleMatch.priority])
          return NextResponse.json({ success: true, source: 'rule', ...ruleMatch })
        }

        // Fall back to AI triage
        const result = await triageWithAI(emails[0])
        return NextResponse.json({ success: true, source: 'ai', ...result })
      }

      case 'triage_batch': {
        const untriaged = await db.query(
          `SELECT id, from_address, from_name, subject, snippet, body_preview
           FROM email_inbox WHERE triaged = FALSE ORDER BY received_at DESC LIMIT 50`
        )
        let processed = 0
        for (const email of untriaged) {
          const ruleMatch = await matchSenderRule(email.from_address)
          if (ruleMatch) {
            await db.query(`UPDATE email_inbox SET triaged = TRUE, category = $1, priority = $2 WHERE id = $3`,
              [ruleMatch.category, ruleMatch.priority, email.id])
            await db.query(
              `INSERT INTO email_triage_results (email_id, category, priority, confidence, suggested_action)
               VALUES ($1, $2, $3, 1.0, 'rule_matched')`,
              [email.id, ruleMatch.category, ruleMatch.priority])
          } else {
            await triageWithAI(email)
          }
          processed++
        }
        return NextResponse.json({ success: true, processed })
      }

      case 'mark_read': {
        const { email_id } = body
        if (!email_id) return NextResponse.json({ error: 'email_id required' }, { status: 400 })
        await db.query(`UPDATE email_inbox SET read = TRUE WHERE id = $1`, [email_id])
        return NextResponse.json({ success: true })
      }

      case 'star_email': {
        const { email_id } = body
        if (!email_id) return NextResponse.json({ error: 'email_id required' }, { status: 400 })
        await db.query(`UPDATE email_inbox SET starred = NOT starred WHERE id = $1`, [email_id])
        return NextResponse.json({ success: true })
      }

      case 'update_sender_rule': {
        const { id, sender_pattern, sender_name, default_category, default_priority, auto_archive } = body
        if (!sender_pattern || !default_category) return NextResponse.json({ error: 'sender_pattern and default_category required' }, { status: 400 })
        if (id) {
          await db.query(
            `UPDATE email_sender_rules SET sender_pattern=$1, sender_name=$2, default_category=$3, default_priority=$4, auto_archive=$5 WHERE id=$6`,
            [sender_pattern, sender_name || null, default_category, default_priority || 'normal', auto_archive || false, id])
        } else {
          await db.query(
            `INSERT INTO email_sender_rules (sender_pattern, sender_name, default_category, default_priority, auto_archive)
             VALUES ($1, $2, $3, $4, $5)`,
            [sender_pattern, sender_name || null, default_category, default_priority || 'normal', auto_archive || false])
        }
        return NextResponse.json({ success: true })
      }

      case 'delete_sender_rule': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM email_sender_rules WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
