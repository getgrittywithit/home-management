import { db } from '@/lib/database'
import { sendPush, shouldPushForSource, isSilentSource } from '@/lib/push'

export async function createNotification({
  title, message, source_type, source_ref, link_tab, icon,
  target_role = 'parent', kid_name,
}: {
  title: string
  message: string
  source_type: string
  source_ref?: string
  link_tab?: string
  icon?: string
  target_role?: string
  kid_name?: string | null
}) {
  // Deduplicate: skip if a notification with the same source_ref already exists
  if (source_ref) {
    const existing = await db.query(
      `SELECT id FROM notifications WHERE source_ref = $1 AND target_role = $2 LIMIT 1`,
      [source_ref, target_role]
    ).catch(() => [])
    if (existing.length > 0) return { created: false, reason: 'duplicate' }
  }

  await db.query(
    `INSERT INTO notifications (target_role, kid_name, title, message, icon, source_type, source_ref, link_tab, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [target_role, kid_name || null, title, message, icon || null, source_type, source_ref || null, link_tab || null]
  ).catch((e) => {
    console.error('[notifications] INSERT failed:', { source_type, source_ref, error: e?.message })
  })

  // D73 PUSH-2/3 — fan out to web push for push-enabled source types. Non-blocking
  // and non-fatal: if push fails, the in-app notification still landed above.
  if (shouldPushForSource(source_type, target_role)) {
    try {
      await sendPush({
        target_role: target_role === 'kid' ? 'kid' : 'parent',
        kid_name: kid_name || null,
        title: `${icon ? icon + ' ' : ''}${title}`,
        body: message,
        link_tab: link_tab || null,
        icon: icon || null,
        source_ref: source_ref || null,
        source_type: source_type || null,
        silent: isSilentSource(source_type),
      })
    } catch (err) {
      console.error('[notifications] push fanout failed:', err)
    }
  }

  return { created: true }
}
