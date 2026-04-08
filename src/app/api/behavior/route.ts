import { NextRequest, NextResponse } from 'next/server'

// Redirect /api/behavior to /api/behavior-events for backward compatibility
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = searchParams.toString()
  const targetUrl = new URL(`/api/behavior-events${params ? '?' + params : ''}`, req.url)
  const res = await fetch(targetUrl.toString())
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const targetUrl = new URL('/api/behavior-events', req.url)
  const res = await fetch(targetUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
