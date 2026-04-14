import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, storeTokens } from '@/lib/gmail'

// Google OAuth redirects here after user consent.
// Configured in Google Cloud Console as authorized redirect URI.
// Lives at /api/auth/callback/google to match the dispatch 64 Google Cloud setup.
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

    // Verify CSRF state cookie if both are present
    const savedState = req.cookies.get('gmail_oauth_state')?.value
    if (state && savedState && state !== savedState) {
      return NextResponse.redirect(new URL('/dashboard?tab=email&gmail_error=state_mismatch', req.url))
    }

    const tokens = await exchangeCodeForTokens(code)

    // Extract the connected account email from id_token, or fall back to Gmail profile
    let email = ''
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString())
        email = payload.email || ''
      } catch { /* fall through */ }
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

    await storeTokens(email, tokens)

    const successRedirect = NextResponse.redirect(
      new URL(`/dashboard?tab=email&gmail_connected=${encodeURIComponent(email)}`, req.url)
    )
    successRedirect.cookies.delete('gmail_oauth_state')
    return successRedirect
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(new URL(`/dashboard?tab=email&gmail_error=token_exchange_failed`, req.url))
  }
}
