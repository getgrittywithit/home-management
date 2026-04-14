// Gmail API wrapper — OAuth token management + message fetching
import { db } from './database'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

// ── Known Accounts (4 configured in Google Cloud test users) ──

const ACCOUNT_LABELS: Record<string, string> = {
  'mosesfamily2008@gmail.com': 'Lola Primary',
  'mosestx2008@gmail.com': 'Levi/Shared',
  'info@tritonhandyman.com': 'Triton',
  'model.co721@gmail.com': 'Lola Work',
}

export function getAccountLabel(email: string): string {
  return ACCOUNT_LABELS[email.toLowerCase()] || email
}

// ── Table Setup ──

export async function ensureGmailTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS gmail_tokens (
    id SERIAL PRIMARY KEY,
    account_email TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`)
  // D64 additions — safe to run repeatedly
  await db.query(`ALTER TABLE gmail_tokens ADD COLUMN IF NOT EXISTS account_label TEXT`)
  await db.query(`ALTER TABLE gmail_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`)
  await db.query(`ALTER TABLE gmail_tokens ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ`)
}

// ── OAuth Flow ──

export function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET
  const redirectUri = process.env.GMAIL_REDIRECT_URI
    || process.env.GOOGLE_REDIRECT_URI
    || 'https://family-ops.grittysystems.com/api/auth/callback/google'
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri }
}

export function buildAuthUrl(state?: string): string | null {
  const config = getOAuthConfig()
  if (!config) return null

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send openid email',
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string) {
  const config = getOAuthConfig()
  if (!config) throw new Error('Gmail OAuth not configured')

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
    token_type: string
    id_token?: string
  }>
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const config = getOAuthConfig()
  if (!config) throw new Error('Gmail OAuth not configured')

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

// ── Token Storage ──

export async function storeTokens(email: string, tokens: { access_token: string; refresh_token: string; expires_in: number; scope?: string }) {
  await ensureGmailTables()
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const label = getAccountLabel(email)

  // Check if any active accounts exist
  const existing = await db.query(`SELECT COUNT(*)::int as c FROM gmail_tokens WHERE is_active = TRUE`).catch(() => [{ c: 0 }])
  const isPrimary = existing[0]?.c === 0

  await db.query(
    `INSERT INTO gmail_tokens (account_email, access_token, refresh_token, token_expiry, scopes, is_primary, account_label, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
     ON CONFLICT (account_email) DO UPDATE SET
       access_token = $2,
       refresh_token = COALESCE(NULLIF($3, ''), gmail_tokens.refresh_token),
       token_expiry = $4,
       scopes = $5,
       account_label = COALESCE(gmail_tokens.account_label, $7),
       is_active = TRUE,
       updated_at = NOW()`,
    [email, tokens.access_token, tokens.refresh_token, expiry, tokens.scope || '', isPrimary, label]
  )
}

export async function getValidToken(email?: string): Promise<{ token: string; email: string } | null> {
  await ensureGmailTables()

  const where = email ? `WHERE account_email = $1 AND is_active = TRUE` : `WHERE is_primary = TRUE AND is_active = TRUE`
  const params = email ? [email] : []
  const rows = await db.query(`SELECT * FROM gmail_tokens ${where} LIMIT 1`, params).catch(() => [])
  if (!rows[0]) return null

  const account = rows[0]
  const expiry = new Date(account.token_expiry)

  // If token expires in less than 5 minutes, refresh it
  if (expiry.getTime() - Date.now() < 300000) {
    try {
      const refreshed = await refreshAccessToken(account.refresh_token)
      await storeTokens(account.account_email, {
        access_token: refreshed.access_token,
        refresh_token: '', // Keep existing refresh token
        expires_in: refreshed.expires_in,
      })
      return { token: refreshed.access_token, email: account.account_email }
    } catch {
      return null
    }
  }

  return { token: account.access_token, email: account.account_email }
}

export async function getConnectedAccounts(): Promise<
  { email: string; account_label: string | null; is_primary: boolean; is_active: boolean; last_sync_at: string | null; connected_at: string }[]
> {
  await ensureGmailTables()
  const rows = await db.query(
    `SELECT account_email as email, account_label, is_primary, is_active, last_sync_at, created_at as connected_at
     FROM gmail_tokens WHERE is_active = TRUE ORDER BY is_primary DESC, created_at`
  ).catch(() => [])
  return rows
}

export async function getAllActiveAccounts(): Promise<string[]> {
  await ensureGmailTables()
  const rows = await db.query(
    `SELECT account_email FROM gmail_tokens WHERE is_active = TRUE ORDER BY is_primary DESC, created_at`
  ).catch(() => [])
  return rows.map((r: any) => r.account_email)
}

export async function updateLastSync(email: string): Promise<void> {
  await db.query(
    `UPDATE gmail_tokens SET last_sync_at = NOW() WHERE account_email = $1`,
    [email]
  ).catch(() => {})
}

export async function disconnectAccount(email: string): Promise<boolean> {
  await ensureGmailTables()
  const rows = await db.query(`SELECT refresh_token FROM gmail_tokens WHERE account_email = $1`, [email]).catch(() => [])
  if (rows[0]?.refresh_token) {
    // Revoke the token at Google
    await fetch(`${GOOGLE_REVOKE_URL}?token=${rows[0].refresh_token}`, { method: 'POST' }).catch(() => {})
  }
  // Soft-delete: keep the row for audit, mark inactive, clear is_primary
  await db.query(
    `UPDATE gmail_tokens SET is_active = FALSE, is_primary = FALSE, updated_at = NOW() WHERE account_email = $1`,
    [email]
  )
  return true
}

// ── Gmail API Calls ──

export async function fetchMessages(opts: {
  email?: string
  query?: string
  maxResults?: number
  pageToken?: string
} = {}): Promise<{ messages: any[]; nextPageToken?: string }> {
  const auth = await getValidToken(opts.email)
  if (!auth) throw new Error('No valid Gmail token')

  const params = new URLSearchParams({
    maxResults: String(opts.maxResults || 25),
    ...(opts.query ? { q: opts.query } : {}),
    ...(opts.pageToken ? { pageToken: opts.pageToken } : {}),
  })

  const res = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`)

  const data = await res.json()
  if (!data.messages) return { messages: [] }

  // Fetch full details for each message (batch)
  const detailed = await Promise.all(
    data.messages.slice(0, opts.maxResults || 25).map(async (msg: any) => {
      const detail = await fetch(`${GMAIL_API}/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      if (!detail.ok) return null
      return detail.json()
    })
  )

  return {
    messages: detailed.filter(Boolean),
    nextPageToken: data.nextPageToken,
  }
}

export function parseMessageHeaders(message: any): {
  gmailId: string; threadId: string; from: string; fromName: string
  to: string; subject: string; snippet: string; date: string
  labels: string[]; hasAttachments: boolean
} {
  const headers = message.payload?.headers || []
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  const fromRaw = getHeader('From')
  const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/)
  const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : ''
  const fromAddr = fromMatch ? fromMatch[2] : fromRaw

  return {
    gmailId: message.id,
    threadId: message.threadId,
    from: fromAddr,
    fromName,
    to: getHeader('To'),
    subject: getHeader('Subject'),
    snippet: message.snippet || '',
    date: getHeader('Date'),
    labels: message.labelIds || [],
    hasAttachments: !!(message.payload?.parts?.some((p: any) => p.filename && p.filename.length > 0)),
  }
}

export async function getGmailProfile(email?: string): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number } | null> {
  const auth = await getValidToken(email)
  if (!auth) return null

  const res = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!res.ok) return null
  return res.json()
}
