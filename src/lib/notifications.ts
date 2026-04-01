import { db } from '@/lib/database'

export async function createNotification({
  title, message, source_type, source_ref, link_tab, icon, target_role = 'parent',
}: {
  title: string
  message: string
  source_type: string
  source_ref?: string
  link_tab?: string
  icon?: string
  target_role?: string
}) {
  await db.query(
    `INSERT INTO notifications (target_role, title, message, icon, source_type, source_ref, link_tab, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [target_role, title, message, icon || null, source_type, source_ref || null, link_tab || null]
  ).catch(() => {}) // Never let notification failure block the primary action
}
