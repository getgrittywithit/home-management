import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import {
  hashSecret, verifySecret,
  createSession, destroySession, getSession,
  logCredential, getLatestCredential,
  COOKIE_NAME, SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth'

// ============================================================================
// D77 AUTH — local family auth API
// GET  ?action=me                  → current session or null
// POST action=login                → username + pin/password → cookie
//      action=logout               → destroy session + clear cookie
//      action=set_pin               → parent sets a kid's PIN
//      action=set_password          → parent sets own / another parent's pw
//      action=change_own_pin        → kid changes own PIN (requires login)
//      action=list_credentials      → parent views all PINs/passwords
//      action=list_accounts         → list everyone (for /login picker)
// ============================================================================

function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin)
}

function isValidPassword(pw: string) {
  return typeof pw === 'string' && pw.length >= 4 && pw.length <= 128
}

async function requireSession(req: NextRequest) {
  const sessionId = req.cookies.get(COOKIE_NAME)?.value
  return getSession(sessionId)
}

async function requireParent(req: NextRequest) {
  const session = await requireSession(req)
  if (!session || session.role !== 'parent') return null
  return session
}

// ----------------------------------------------------------------------------
// GET
// ----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'me': {
        const session = await requireSession(request)
        return NextResponse.json({ account: session })
      }

      case 'list_accounts': {
        const rows = await db.query(
          `SELECT id, username, display_name, role,
                  (pin_hash IS NOT NULL) AS has_pin,
                  (password_hash IS NOT NULL) AS has_password
             FROM family_accounts
            WHERE is_active = TRUE
            ORDER BY
              CASE role WHEN 'parent' THEN 0 ELSE 1 END,
              CASE username
                WHEN 'mom' THEN 0 WHEN 'dad' THEN 1
                WHEN 'amos' THEN 2 WHEN 'zoey' THEN 3 WHEN 'kaylee' THEN 4
                WHEN 'ellie' THEN 5 WHEN 'wyatt' THEN 6 WHEN 'hannah' THEN 7
                ELSE 99 END`
        )
        return NextResponse.json({ accounts: rows })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('auth GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

// ----------------------------------------------------------------------------
// POST
// ----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    switch (action) {
      case 'login': {
        const { username, pin, password, remember_me } = body
        if (!username || (!pin && !password)) {
          return NextResponse.json({ error: 'username + pin or password required' }, { status: 400 })
        }

        const rows = await db.query(
          `SELECT * FROM family_accounts WHERE username = $1 AND is_active = TRUE LIMIT 1`,
          [String(username).toLowerCase().trim()]
        )
        const account = rows[0]
        if (!account) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

        // First-time setup: if no credential stored yet, accept + store the submitted one
        const isFirstTime =
          (account.role === 'kid' && !account.pin_hash) ||
          (account.role === 'parent' && !account.password_hash)

        if (isFirstTime) {
          if (account.role === 'kid') {
            if (!pin || !isValidPin(pin)) return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
            const hash = hashSecret(pin)
            await db.query(`UPDATE family_accounts SET pin_hash = $2, updated_at = NOW() WHERE id = $1`, [account.id, hash])
            await logCredential(account.id, 'pin', pin, account.id).catch((e) => console.warn('[auth] logCredential skipped:', e?.message))
          } else {
            if (!password || !isValidPassword(password)) return NextResponse.json({ error: 'Password must be 4-128 chars' }, { status: 400 })
            const hash = hashSecret(password)
            await db.query(`UPDATE family_accounts SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [account.id, hash])
            await logCredential(account.id, 'password', password, account.id).catch((e) => console.warn('[auth] logCredential skipped:', e?.message))
          }
        } else {
          // Verify
          if (account.role === 'kid') {
            if (!pin || !verifySecret(pin, account.pin_hash)) {
              return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
            }
          } else {
            if (!password || !verifySecret(password, account.password_hash)) {
              return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
            }
          }
        }

        const userAgent = request.headers.get('user-agent')
        const sessionId = await createSession(account.id, userAgent)

        const res = NextResponse.json({
          account: {
            id: account.id,
            username: account.username,
            display_name: account.display_name,
            role: account.role,
          },
          first_time: isFirstTime,
        })
        res.cookies.set(COOKIE_NAME, sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: remember_me === false ? undefined : SESSION_MAX_AGE_SECONDS,
        })
        return res
      }

      case 'logout': {
        const sessionId = request.cookies.get(COOKIE_NAME)?.value
        if (sessionId) await destroySession(sessionId)
        const res = NextResponse.json({ success: true })
        res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 })
        return res
      }

      case 'set_pin': {
        const parent = await requireParent(request)
        if (!parent) return NextResponse.json({ error: 'Parent required' }, { status: 403 })
        const { username, pin } = body
        if (!username || !pin) return NextResponse.json({ error: 'username + pin required' }, { status: 400 })
        if (!isValidPin(pin)) return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })

        const rows = await db.query(
          `SELECT id FROM family_accounts WHERE username = $1 AND role = 'kid' LIMIT 1`,
          [String(username).toLowerCase().trim()]
        )
        const kid = rows[0]
        if (!kid) return NextResponse.json({ error: 'Kid not found' }, { status: 404 })

        await db.query(
          `UPDATE family_accounts SET pin_hash = $2, updated_at = NOW() WHERE id = $1`,
          [kid.id, hashSecret(pin)]
        )
        await logCredential(kid.id, 'pin', pin, parent.id).catch((e) => console.warn('[auth] logCredential skipped:', e?.message))
        return NextResponse.json({ success: true })
      }

      case 'set_password': {
        const self = await requireSession(request)
        if (!self || self.role !== 'parent') {
          return NextResponse.json({ error: 'Parent required' }, { status: 403 })
        }
        const { username, password, current_password } = body
        if (!username || !password) return NextResponse.json({ error: 'username + password required' }, { status: 400 })
        if (!isValidPassword(password)) return NextResponse.json({ error: 'Password must be 4-128 chars' }, { status: 400 })

        const targetRows = await db.query(
          `SELECT id, password_hash FROM family_accounts WHERE username = $1 AND role = 'parent' LIMIT 1`,
          [String(username).toLowerCase().trim()]
        )
        const target = targetRows[0]
        if (!target) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

        // Self-change requires current password
        if (self.username === username && target.password_hash) {
          if (!current_password || !verifySecret(current_password, target.password_hash)) {
            return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 })
          }
        }

        await db.query(
          `UPDATE family_accounts SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
          [target.id, hashSecret(password)]
        )
        await logCredential(target.id, 'password', password, self.id).catch((e) => console.warn('[auth] logCredential skipped:', e?.message))
        return NextResponse.json({ success: true })
      }

      case 'change_own_pin': {
        const self = await requireSession(request)
        if (!self || self.role !== 'kid') return NextResponse.json({ error: 'Kid login required' }, { status: 403 })
        const { current_pin, new_pin } = body
        if (!new_pin || !isValidPin(new_pin)) return NextResponse.json({ error: 'New PIN must be 4-6 digits' }, { status: 400 })

        const rows = await db.query(`SELECT pin_hash FROM family_accounts WHERE id = $1`, [self.id])
        if (!rows[0]) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        if (rows[0].pin_hash && (!current_pin || !verifySecret(current_pin, rows[0].pin_hash))) {
          return NextResponse.json({ error: 'Current PIN incorrect' }, { status: 401 })
        }

        await db.query(
          `UPDATE family_accounts SET pin_hash = $2, updated_at = NOW() WHERE id = $1`,
          [self.id, hashSecret(new_pin)]
        )
        await logCredential(self.id, 'pin', new_pin, self.id).catch((e) => console.warn('[auth] logCredential skipped:', e?.message))
        return NextResponse.json({ success: true })
      }

      case 'list_credentials': {
        const parent = await requireParent(request)
        if (!parent) return NextResponse.json({ error: 'Parent required' }, { status: 403 })

        const accounts = await db.query(
          `SELECT id, username, display_name, role FROM family_accounts WHERE is_active = TRUE ORDER BY role DESC, username`
        )
        const results: any[] = []
        for (const a of accounts) {
          const type = a.role === 'parent' ? 'password' : 'pin'
          const plain = await getLatestCredential(a.id, type)
          results.push({
            username: a.username,
            display_name: a.display_name,
            role: a.role,
            credential_type: type,
            credential: plain,          // null if never set
          })
        }
        return NextResponse.json({ credentials: results })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('auth POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
