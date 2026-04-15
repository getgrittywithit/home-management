import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// D77 AUTH Stage C — enforce mode
// Session is validated inside /api/auth?action=me. Middleware only checks
// that the cookie exists on protected routes; a stale/bad cookie still
// lets the page load, and the app-level session check redirects to login
// if needed. This keeps middleware off the Node runtime.
// ============================================================================

const COOKIE_NAME = 'coral_session' // mirrors src/lib/auth.ts

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/kid/:path*',
    '/kids/:path*',
  ],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionId = request.cookies.get(COOKIE_NAME)?.value || null

  // Middleware only checks cookie presence. Role-level enforcement lives
  // in the page itself (server component for /dashboard, client for /kid).
  if (!sessionId) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname + (request.nextUrl.search || ''))
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
