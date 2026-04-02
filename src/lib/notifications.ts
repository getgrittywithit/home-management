import { db } from '@/lib/database'

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
  await db.query(
    `INSERT INTO notifications (target_role, kid_name, title, message, icon, source_type, source_ref, link_tab, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [target_role, kid_name || null, title, message, icon || null, source_type, source_ref || null, link_tab || null]
  ).catch(() => {})
}
