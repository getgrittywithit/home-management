import { createNotification } from '@/lib/notifications'

const TEFA_ANNUAL_PER_KID = 2000
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

/**
 * Check budget thresholds after any purchase change and fire notifications.
 * Dedup via source_ref ensures each threshold fires ONCE per kid per school year.
 */
export async function checkBudgetThresholds(kidName: string, spent: number, committed: number, schoolYear: string) {
  const used = spent + committed
  const pct = (used / TEFA_ANNUAL_PER_KID) * 100
  const remaining = Math.max(TEFA_ANNUAL_PER_KID - used, 0)
  const kid = cap(kidName)

  const thresholds: Array<{ pct: number; source_type: string; title: string; message: string; icon: string }> = [
    {
      pct: 100,
      source_type: 'curriculum_budget_100',
      title: `${kid}'s plans total more than $2,000`,
      message: `${kid}'s planned + spent items total $${used.toFixed(0)} — worth a quick review to adjust.`,
      icon: '🔴',
    },
    {
      pct: 90,
      source_type: 'curriculum_budget_90',
      title: `${kid} is almost at full TEFA budget`,
      message: `$${remaining.toFixed(0)} remaining of $2,000. Just a heads up so you can plan the last items carefully.`,
      icon: '🟠',
    },
    {
      pct: 75,
      source_type: 'curriculum_budget_75',
      title: `${kid} has used 75% of TEFA funds`,
      message: `$${remaining.toFixed(0)} still available for the rest of the year. Looking good.`,
      icon: '🟡',
    },
    {
      pct: 50,
      source_type: 'curriculum_budget_50',
      title: `${kid} is at the halfway mark`,
      message: `$${remaining.toFixed(0)} of $2,000 still available — plenty of room to plan.`,
      icon: '📊',
    },
  ]

  // Fire the HIGHEST threshold reached (only one per change)
  for (const t of thresholds) {
    if (pct >= t.pct) {
      await createNotification({
        title: t.title,
        message: t.message,
        source_type: t.source_type,
        source_ref: `${t.source_type}-${kidName}-${schoolYear}`,
        icon: t.icon,
        link_tab: 'curriculum',
      }).catch(() => {})
      break // Only fire the highest threshold
    }
  }
}

/**
 * Fire notification when purchase status changes to 'received'.
 */
export async function notifyPurchaseReceived(kidName: string, itemName: string, purchaseId: string) {
  await createNotification({
    title: `${cap(kidName)}'s ${itemName} has arrived`,
    message: `Ready to add to the Family Library? Open to link it to a curriculum unit.`,
    source_type: 'curriculum_purchase_received',
    source_ref: `purchase-received-${purchaseId}`,
    icon: '📦',
    link_tab: 'curriculum',
  }).catch(() => {})
}

/**
 * Fire notification when a unit's month is about to start.
 */
export async function notifyUnitStarting(kidName: string, unitTitle: string, subject: string, month: string, unitId: string) {
  await createNotification({
    title: `${cap(kidName)}: ${unitTitle} starts soon`,
    message: `${subject} unit for ${month} is coming up. Check that resources are ready.`,
    source_type: 'curriculum_unit_starts_soon',
    source_ref: `unit-starts-${unitId}-${month}`,
    icon: '📅',
    link_tab: 'curriculum',
  }).catch(() => {})
}

/**
 * Fire notification when a consumable hits reorder threshold.
 */
export async function notifyConsumableLow(assetName: string, quantity: number, threshold: number, assetId: string) {
  await createNotification({
    title: `Running low: ${assetName}`,
    message: `${quantity} left (reorder at ${threshold}). Time to restock?`,
    source_type: 'curriculum_consumable_low',
    source_ref: `consumable-low-${assetId}`,
    icon: '📉',
    link_tab: 'curriculum',
  }).catch(() => {})
}
