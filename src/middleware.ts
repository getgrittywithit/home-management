import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

// ============================================================================
// D77 AUTH Stage A — log-only middleware
// Purpose: observe traffic + read the session cookie so Stage C can flip
// this to enforcement without any surprise. Does NOT block or redirect.
// Stage C will swap the log() calls for NextResponse.redirect(...)
// ============================================================================

const PARENT_ROUTES = ['/dashboard']
const KID_ROUTE_PREFIX = '/kids/'
const LOG_ONLY = true

export const config = {
  matcher: [
    // Run on protected paths only — keep _next, api, and static assets untouched.
    '/dashboard/:path*',
    '/kids/:path*',
    '/login',
  ],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionId = request.cookies.get(COOKIE_NAME)?.value || null

  const needsParent = PARENT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const needsKidOrParent = pathname.startsWith(KID_ROUTE_PREFIX)

  if (LOG_ONLY) {
    if (needsParent && !sessionId) {
      console.log(`[auth:warn] ${pathname} hit without session (would redirect to /login)`)
    }
    if (needsKidOrParent && !sessionId) {
      console.log(`[auth:warn] ${pathname} hit without session (would redirect to /login)`)
    }
    return NextResponse.next()
  }

  // Stage C will live here.
  return NextResponse.next()
}
