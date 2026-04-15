import { scryptSync, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/database'

// ============================================================================
// D77 AUTH — Scrypt-based local auth for the family hub.
// Zero external deps. No bcrypt, no iron-session, no next-auth.
// ============================================================================

export const COOKIE_NAME = 'coral_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

// ----- Scrypt password hashing ---------------------------------------------

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const HASH_KEYLEN = 64
const SALT_BYTES = 16

export function hashSecret(plaintext: string): string {
  const salt = randomBytes(SALT_BYTES)
  const hash = scryptSync(plaintext, salt, HASH_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifySecret(plaintext: string, stored: string): boolean {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const parts = stored.split('$')
  if (parts.length !== 6) return false
  const n = parseInt(parts[1])
  const r = parseInt(parts[2])
  const p = parseInt(parts[3])
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  const actual = scryptSync(plaintext, salt, expected.length, { N: n, r, p })
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

// ----- AES-256-GCM reversible encryption for credential_log ---------------

function getEncryptionKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`)
  }
  return key
}

export function encryptPlaintext(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

export function decryptPlaintext(ciphered: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(ciphered, 'base64')
  const iv = buf.subarray(0, 12)
  const authTag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf-8')
}

// ----- Sessions -------------------------------------------------------------

export type SessionAccount = {
  id: string
  username: string
  display_name: string
  role: 'parent' | 'kid'
  session_id: string
}

export async function createSession(accountId: string, userAgent?: string | null): Promise<string> {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
  const rows = await db.query(
    `INSERT INTO family_sessions (account_id, expires_at, user_agent)
     VALUES ($1, $2, $3) RETURNING id`,
    [accountId, expires.toISOString(), userAgent || null]
  )
  await db.query(`UPDATE family_accounts SET last_login_at = NOW() WHERE id = $1`, [accountId]).catch(() => {})
  return rows[0].id
}

export async function getSession(sessionId: string | undefined | null): Promise<SessionAccount | null> {
  if (!sessionId) return null
  const rows = await db.query(
    `SELECT fs.id AS session_id, fa.id, fa.username, fa.display_name, fa.role
       FROM family_sessions fs
       JOIN family_accounts fa ON fa.id = fs.account_id
      WHERE fs.id = $1
        AND fs.expires_at > NOW()
        AND fa.is_active = TRUE
      LIMIT 1`,
    [sessionId]
  ).catch(() => [] as any[])
  if (!rows[0]) return null
  // Touch last_seen
  db.query(`UPDATE family_sessions SET last_seen = NOW() WHERE id = $1`, [sessionId]).catch(() => {})
  return {
    id: rows[0].id,
    username: rows[0].username,
    display_name: rows[0].display_name,
    role: rows[0].role,
    session_id: rows[0].session_id,
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.query(`DELETE FROM family_sessions WHERE id = $1`, [sessionId]).catch(() => {})
}

export async function currentSessionFromCookies(): Promise<SessionAccount | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(COOKIE_NAME)?.value
  return getSession(sessionId)
}

// ----- Credential log writer -----------------------------------------------

export async function logCredential(
  accountId: string,
  type: 'pin' | 'password',
  plaintext: string,
  setBy: string | null
): Promise<void> {
  const ciphered = encryptPlaintext(plaintext)
  await db.query(
    `INSERT INTO credential_log (account_id, credential_type, credential_ciphered, set_by)
     VALUES ($1, $2, $3, $4)`,
    [accountId, type, ciphered, setBy]
  )
}

export async function getLatestCredential(
  accountId: string,
  type: 'pin' | 'password'
): Promise<string | null> {
  const rows = await db.query(
    `SELECT credential_ciphered FROM credential_log
      WHERE account_id = $1 AND credential_type = $2
      ORDER BY set_at DESC LIMIT 1`,
    [accountId, type]
  ).catch(() => [] as any[])
  if (!rows[0]) return null
  try {
    return decryptPlaintext(rows[0].credential_ciphered)
  } catch {
    return null
  }
}
