import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, storeTokens } from '@/lib/gmail'

// Google OAuth redirects here: /api/auth/gmail/callback?code=XXX
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  try {
    if (error) {
      return NextResponse.redirect(new URL(`/dashboard?tab=email&gmail_error=${error}`, req.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard?tab=email&gmail_error=no_code', req.url))
    }

    // Verify CSRF state
    const savedState = req.cookies.get('gmail_oauth_state')?.value
    if (state && savedState && state !== savedState) {
      return NextResponse.redirect(new URL('/dashboard?tab=email&gmail_error=state_mismatch', req.url))
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get email from id_token or Gmail profile
    let email = ''
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString())
        email = payload.email || ''
      } catch { /* fallback below */ }
    }

    if (!email) {
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

    // Redirect back to email tab with success + clear state cookie
    const successRedirect = NextResponse.redirect(new URL(`/dashboard?tab=email&gmail_connected=${encodeURIComponent(email)}`, req.url))
    successRedirect.cookies.delete('gmail_oauth_state')
    return successRedirect
  } catch (err) {
    console.error('Gmail callback error:', err)
    return NextResponse.redirect(new URL(`/dashboard?tab=email&gmail_error=token_exchange_failed`, req.url))
  }
}
