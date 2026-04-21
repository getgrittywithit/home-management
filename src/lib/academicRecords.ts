import 'server-only'
import { db } from '@/lib/database'

export async function logAcademicRecord(params: {
  kid_name: string
  record_type: string
  subject: string
  occurred_at?: Date
  details?: Record<string, any>
  evidence_ref?: string
}) {
  const { kid_name, record_type, subject, occurred_at, details, evidence_ref } = params
  await db.query(
    `INSERT INTO academic_records (kid_name, record_type, subject, occurred_at, details, evidence_ref)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [kid_name.toLowerCase(), record_type, subject, occurred_at || new Date(), details ? JSON.stringify(details) : null, evidence_ref || null]
  ).catch(e => console.error('[academicRecords] log failed:', e.message))
}

export async function recordIEPGoalProgress(params: {
  kid_name: string
  goal_area: string
  evidence_type: string
  evidence_ref?: string
  progress_value: number
  notes?: string
}) {
  const { kid_name, goal_area, evidence_type, evidence_ref, progress_value, notes } = params
  await db.query(
    `INSERT INTO iep_goal_progress (kid_name, goal_area, evidence_type, evidence_ref, progress_value, notes, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [kid_name.toLowerCase(), goal_area, evidence_type, evidence_ref || null, progress_value, notes || null]
  ).catch(e => console.error('[iepGoals] progress log failed:', e.message))
}

export async function logAdminAction(params: {
  action: string
  target_entity?: string
  target_id?: string
  before_state?: any
  after_state?: any
  actor?: string
}) {
  await db.query(
    `INSERT INTO parent_admin_audit_log (action, target_entity, target_id, before_state, after_state, actor_account)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [params.action, params.target_entity || null, params.target_id || null,
     params.before_state ? JSON.stringify(params.before_state) : null,
     params.after_state ? JSON.stringify(params.after_state) : null,
     params.actor || 'parent']
  ).catch(e => console.error('[auditLog] failed:', e.message))
}
