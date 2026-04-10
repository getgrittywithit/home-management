import { NextRequest, NextResponse } from 'next/server'
import {
  buildAuthUrl, exchangeCodeForTokens, storeTokens,
  getConnectedAccounts, disconnectAccount, ensureGmailTables, getOAuthConfig,
} from '@/lib/gmail'

// GET /api/auth/gmail?action=connect — redirect to Google consent
// GET /api/auth/gmail?action=callback&code=... — handle OAuth callback
// GET /api/auth/gmail?action=status — check connected accounts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || ''

  try {
    switch (action) {
      case 'connect': {
        const config = getOAuthConfig()
        if (!config) {
          return NextResponse.json({
            error: 'Gmail OAuth not configured',
            hint: 'Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI environment variables.',
          }, { status: 503 })
        }
        // Generate CSRF state token
        const state = crypto.randomUUID()
        const url = buildAuthUrl(state)
        if (!url) return NextResponse.json({ error: 'Failed to build auth URL' }, { status: 500 })
        // Set state in cookie for verification in callback
        const response = NextResponse.redirect(url)
        response.cookies.set('gmail_oauth_state', state, {
          httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
        })
        return response
      }

      case 'callback': {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          // User denied access or other error
          return NextResponse.redirect(new URL('/dashboard?tab=email&gmail_error=' + error, req.url))
        }

        if (!code) {
          return NextResponse.json({ error: 'No authorization code received' }, { status: 400 })
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code)

        // Get the user's email from the id_token or profile
        let email = ''
        if (tokens.id_token) {
          // Decode JWT payload (no verification needed — we trust Google's response)
          const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString())
          email = payload.email || ''
        }

        if (!email) {
          // Fallback: fetch from Gmail profile
          const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })
          if (profileRes.ok) {
            const profile = await profileRes.json()
            email = profile.emailAddress || ''
          }
        }

        if (!email) {
          return NextResponse.redirect(new URL('/dashboard?tab=email&gmail_error=no_email', req.url))
        }

        // Store tokens
        await storeTokens(email, tokens)

        // Redirect back to email tab with success
        return NextResponse.redirect(new URL('/dashboard?tab=email&gmail_connected=' + encodeURIComponent(email), req.url))
      }

      case 'status': {
        await ensureGmailTables()
        const accounts = await getConnectedAccounts()
        const config = getOAuthConfig()
        return NextResponse.json({
          configured: !!config,
          accounts,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: connect, callback, status' }, { status: 400 })
    }
  } catch (error) {
    console.error('Gmail auth error:', error)
    return NextResponse.json({ error: 'Gmail auth failed', detail: String(error) }, { status: 500 })
  }
}

// POST /api/auth/gmail — disconnect account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'disconnect') {
      const { email } = body
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
      await disconnectAccount(email)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Gmail auth POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
