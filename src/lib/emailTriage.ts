import { db } from '@/lib/database'

// ============================================================================
// D82 Stage C — Email triage engine
// Two-tier: rule-based (fast, 351 seeded sender rules) → Anthropic AI
// fallback (structured JSON extraction of action_items/deadline/urgency).
// Graceful fallback to keyword heuristic when ANTHROPIC_API_KEY is missing.
// ============================================================================

export type EmailForTriage = {
  id: number
  from_address: string
  from_name: string | null
  subject: string | null
  snippet: string | null
  body_preview?: string | null
}

export type TriageOutput = {
  category: string
  priority: 'urgent' | 'high' | 'normal' | 'low' | 'archive'
  confidence: number
  suggested_action: string | null
  action_items: string[]
  deadline: string | null     // ISO date 'YYYY-MM-DD' or null
  urgency: 'high' | 'medium' | 'low'
  source: 'rule' | 'ai' | 'heuristic'
}

// ── 1. Rule-based matching (351 seeded rules) ────────────────────────────

export async function matchSenderRule(fromAddress: string): Promise<{
  category: string
  priority: string
  auto_archive: boolean
} | null> {
  const rules = await db.query(
    `SELECT default_category, default_priority, sender_pattern, auto_archive
       FROM email_sender_rules
      ORDER BY LENGTH(sender_pattern) DESC`
  ).catch(() => [] as any[])

  for (const rule of rules) {
    const pattern = String(rule.sender_pattern || '').replace(/%/g, '.*')
    if (!pattern) continue
    try {
      if (new RegExp(pattern, 'i').test(fromAddress)) {
        return {
          category: rule.default_category,
          priority: rule.default_priority || 'normal',
          auto_archive: !!rule.auto_archive,
        }
      }
    } catch { /* ignore bad regex */ }
  }
  return null
}

// ── 2. Special-case overrides (per CLAUDE.md) ───────────────────────────

function applyOverrides(email: EmailForTriage, base: TriageOutput): TriageOutput {
  const to = ''  // email_inbox.to_address is available upstream if needed
  const from = (email.from_address || '').toLowerCase()

  // Triton leads: any non-spam email to info@tritonhandyman.com must surface.
  // (Check is done by callers via to_address; here we handle the sender side.)
  if (from.includes('@tritonhandyman.com')) {
    return {
      ...base,
      category: 'triton',
      priority: base.priority === 'low' ? 'normal' : base.priority,
    }
  }

  // Urgent school senders
  const urgentSchool = ['susan.collentine', 'donna.gardner']
  if (urgentSchool.some((u) => from.includes(u))) {
    return { ...base, category: 'school', priority: 'urgent', urgency: 'high' }
  }

  return base
}

// ── 3. AI triage via raw fetch to Anthropic ──────────────────────────────

const TRIAGE_SYSTEM_PROMPT = `You are an email triage assistant for the Moses family hub. You read a single email and classify it, then extract any action items and deadlines. Respond with valid minified JSON only — no prose, no markdown fence.

Schema:
{
  "category": one of: school_urgent|school_normal|medical|triton_lead|triton_ops|finance|kids_tech|household|noise|action_needed|family
  "priority": one of: urgent|high|normal|low|archive
  "urgency": one of: high|medium|low
  "action_items": array of short imperative strings (0-3 items, each <100 chars). Examples: "Reply to Susan about 504 meeting", "Call CVS for Adderall XR pickup"
  "deadline": ISO date "YYYY-MM-DD" if any specific deadline is mentioned, otherwise null
  "suggested_action": one of: reply_needed|schedule_event|pay_bill|call|read_only|auto_archive|none
}

Rules:
- info@tritonhandyman.com inbound = likely triton_lead (high priority unless clearly spam)
- @boerneisd.net = school_normal unless from named staff (Susan Collentine, Donna Gardner, Ashlie D'Spain, Heather Risner, Lori Flisowski) = school_urgent
- @psisatx.com, @cvs.com, stonebridgealliance = medical
- Marketing/promotional blasts (@em.walmart.com, @eg.vrbo.com, @rs.email.nextdoor.com, unsubscribe-heavy) = noise, archive
- Any email with a specific named deadline, appointment, or task = action_needed with action_items filled
- If category is noise, action_items must be []`

async function triageWithAnthropic(email: EmailForTriage): Promise<TriageOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const userContent = `Email to triage:
From: ${email.from_name || ''} <${email.from_address}>
Subject: ${email.subject || '(no subject)'}
Preview: ${email.snippet || email.body_preview || ''}

Respond with JSON only.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: TRIAGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!res.ok) {
      console.warn('[triage] Anthropic non-OK:', res.status)
      return null
    }

    const data = await res.json()
    const text = data?.content?.[0]?.text?.trim() || ''

    // Strip any accidental ```json fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      category: String(parsed.category || 'family'),
      priority: normalizePriority(parsed.priority),
      confidence: 0.9,
      suggested_action: parsed.suggested_action || null,
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items.map(String).slice(0, 3) : [],
      deadline: parsed.deadline || null,
      urgency: normalizeUrgency(parsed.urgency),
      source: 'ai',
    }
  } catch (e: any) {
    console.warn('[triage] Anthropic error:', e?.message)
    return null
  }
}

function normalizePriority(p: any): TriageOutput['priority'] {
  const v = String(p || '').toLowerCase()
  if (['urgent', 'high', 'normal', 'low', 'archive'].includes(v)) return v as any
  return 'normal'
}

function normalizeUrgency(u: any): TriageOutput['urgency'] {
  const v = String(u || '').toLowerCase()
  if (['high', 'medium', 'low'].includes(v)) return v as any
  return 'medium'
}

// ── 4. Keyword-heuristic fallback (used when AI missing or fails) ────────

function heuristicTriage(email: EmailForTriage): TriageOutput {
  const text = `${email.from_address} ${email.from_name || ''} ${email.subject || ''} ${email.snippet || ''}`.toLowerCase()

  let category = 'family'
  let priority: TriageOutput['priority'] = 'normal'
  let suggested_action: string | null = 'none'

  if (text.match(/school|isd|teacher|grade|iep|504/)) category = 'school_normal'
  else if (text.match(/doctor|appointment|prescription|pharmacy|health|therapy|cvs/)) category = 'medical'
  else if (text.match(/invoice|estimate|handyman|triton|job|customer|quote/)) category = 'triton_ops'
  else if (text.match(/bank|payment|bill|statement|balance|ally|progressive/)) category = 'finance'
  else if (text.match(/unsubscribe|newsletter|noreply|no-reply|promo|% off|deal/)) { category = 'noise'; priority = 'low' }

  if (text.match(/urgent|asap|immediately|today|deadline/)) priority = 'urgent'

  if (text.match(/reply|respond|get back|let me know/)) suggested_action = 'reply_needed'
  else if (text.match(/meeting|appointment|schedule/)) suggested_action = 'schedule_event'
  else if (text.match(/invoice|payment due|pay/)) suggested_action = 'pay_bill'

  return {
    category,
    priority,
    confidence: 0.6,
    suggested_action,
    action_items: [],
    deadline: null,
    urgency: priority === 'urgent' ? 'high' : priority === 'low' ? 'low' : 'medium',
    source: 'heuristic',
  }
}

// ── 5. Public entry point ───────────────────────────────────────────────

export async function triageEmail(email: EmailForTriage): Promise<TriageOutput> {
  // 1. Rule match (fastest path)
  const rule = await matchSenderRule(email.from_address)
  if (rule) {
    const result: TriageOutput = {
      category: rule.category,
      priority: normalizePriority(rule.priority),
      confidence: 1.0,
      suggested_action: rule.auto_archive ? 'auto_archive' : 'rule_matched',
      action_items: [],
      deadline: null,
      urgency: rule.priority === 'urgent' ? 'high' : rule.priority === 'low' ? 'low' : 'medium',
      source: 'rule',
    }
    return applyOverrides(email, result)
  }

  // 2. AI fallback
  const ai = await triageWithAnthropic(email)
  if (ai) return applyOverrides(email, ai)

  // 3. Heuristic last resort
  return applyOverrides(email, heuristicTriage(email))
}

// ── 6. Persist triage results to DB ─────────────────────────────────────

export async function saveTriageResult(emailId: number, result: TriageOutput): Promise<void> {
  // Update the email row
  await db.query(
    `UPDATE email_inbox
        SET triaged = TRUE,
            category = $1,
            priority = $2
      WHERE id = $3`,
    [result.category, result.priority, emailId]
  )

  // Append a triage_results row (history — we keep all triage runs)
  const actionDetails = {
    action_items: result.action_items,
    urgency: result.urgency,
    source: result.source,
  }
  const calendarSuggestion = result.deadline ? { deadline: result.deadline } : null

  await db.query(
    `INSERT INTO email_triage_results (email_id, category, priority, confidence, suggested_action, action_details, calendar_suggestion)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      emailId,
      result.category,
      result.priority,
      result.confidence,
      result.suggested_action,
      JSON.stringify(actionDetails),
      calendarSuggestion ? JSON.stringify(calendarSuggestion) : null,
    ]
  ).catch((e) => console.warn('[triage] save error:', e?.message))
}

export async function triageAndSave(email: EmailForTriage): Promise<TriageOutput> {
  const result = await triageEmail(email)
  await saveTriageResult(email.id, result)
  return result
}
