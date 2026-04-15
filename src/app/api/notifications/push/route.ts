import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Dev-fallback VAPID keys — will be overridden by env vars in production.
// Regenerate via: node -e "console.log(require('web-push').generateVAPIDKeys())"
const DEV_VAPID_PUBLIC = 'BDxwCvIqxa3yzBQiZxE7bq8B__Kz4-BCfmwLWkCROiMcfaHvZzMla2Q9QC8_X4GQ1VTjquh9OC2fOicjaPgY4ec'

function getPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || DEV_VAPID_PUBLIC
}

// ----------------------------------------------------------------------------
// GET /api/notifications/push?action=vapid_key — returns the public VAPID key
//   Browsers need this to build a PushSubscription.
// GET /api/notifications/push?action=list&target_role=parent — list subs (debug)
// ----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'vapid_key'

  try {
    if (action === 'vapid_key') {
      return NextResponse.json({ public_key: getPublicKey() })
    }

    if (action === 'list') {
      const role = searchParams.get('target_role')
      const kid = searchParams.get('kid_name')?.toLowerCase() || null
      const params: any[] = []
      let where = '1=1'
      if (role) { params.push(role); where += ` AND target_role = $${params.length}` }
      if (kid) { params.push(kid); where += ` AND kid_name = $${params.length}` }
      const rows = await db.query(
        `SELECT id, target_role, kid_name, device_label, created_at, last_used_at, failed_count
         FROM push_subscriptions WHERE ${where} ORDER BY created_at DESC`,
        params
      )
      return NextResponse.json({ subscriptions: rows })
    }

    return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('push GET error:', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

// ----------------------------------------------------------------------------
// POST /api/notifications/push — subscribe / unsubscribe / test
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { action, ...data } = body

  try {
    if (action === 'subscribe') {
      const { target_role, kid_name, subscription, device_label, user_agent } = data
      if (!target_role || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return NextResponse.json({ error: 'target_role + full subscription required' }, { status: 400 })
      }
      const rows = await db.query(
        `INSERT INTO push_subscriptions (target_role, kid_name, endpoint, p256dh, auth, device_label, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (endpoint) DO UPDATE SET
           target_role = EXCLUDED.target_role,
           kid_name = EXCLUDED.kid_name,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           device_label = COALESCE(EXCLUDED.device_label, push_subscriptions.device_label),
           last_used_at = NOW(),
           failed_count = 0
         RETURNING id`,
        [
          target_role,
          kid_name ? kid_name.toLowerCase() : null,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth,
          device_label || null,
          user_agent || null,
        ]
      )
      return NextResponse.json({ id: rows[0]?.id, ok: true })
    }

    if (action === 'unsubscribe') {
      const { endpoint } = data
      if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
      await db.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint])
      return NextResponse.json({ ok: true })
    }

    if (action === 'test') {
      // Fire a test push to a specific target
      const { target_role, kid_name } = data
      const { sendPush } = await import('@/lib/push')
      const result = await sendPush({
        target_role: target_role || 'parent',
        kid_name: kid_name || null,
        title: '🔔 Test notification',
        body: 'Push notifications are working!',
        link_tab: 'overview',
      })
      return NextResponse.json({ ok: true, ...result })
    }

    return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('push POST error:', err)
    return NextResponse.json({ error: 'Request failed', detail: String(err) }, { status: 500 })
  }
}
