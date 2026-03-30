import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

// ── helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return NextResponse.json(data)
}
function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'list':
        return await listStudents()
      case 'profile':
        return await getProfile(searchParams.get('kid'))
      case 'expiring_docs':
        return await expiringDocs()
      case 'expiring_exemptions':
        return await expiringExemptions()
      case 'missing_data':
        return await missingData()
      case 'dashboard_school_health':
        return await dashboardSchoolHealth()
      default:
        return err('Missing or invalid action parameter', 400)
    }
  } catch (error) {
    console.error(`[students GET action=${action}]`, error)
    return err('Internal server error', 500)
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return err('Invalid JSON body', 400)
  }

  const { action, ...data } = body

  try {
    switch (action) {
      case 'upsert_profile':
        return await upsertProfile(data)
      case 'upsert_plan':
        return await upsertPlan(data)
      case 'add_provider':
        return await addProvider(data)
      case 'update_provider':
        return await updateProvider(data)
      case 'delete_provider':
        return await deleteProvider(data)
      case 'upload_document':
        return await uploadDocument(data)
      case 'delete_document':
        return await deleteDocument(data)
      case 'add_health_condition':
        return await addHealthCondition(data)
      case 'update_health_condition':
        return await updateHealthCondition(data)
      case 'delete_health_condition':
        return await deleteHealthCondition(data)
      case 'toggle_diagnosis_tag':
        return await toggleDiagnosisTag(data)
      case 'update_diagnosis_note':
        return await updateDiagnosisNote(data)
      case 'upsert_transition_plan':
        return await upsertTransitionPlan(data)
      case 'add_school_history':
        return await addSchoolHistory(data)
      case 'generate_health_email':
        return await generateHealthEmail(data)
      default:
        return err('Missing or invalid action', 400)
    }
  } catch (error) {
    console.error(`[students POST action=${action}]`, error)
    return err('Internal server error', 500)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET action handlers
// ═══════════════════════════════════════════════════════════════════════════

async function listStudents() {
  const rows = await query(`
    SELECT sp.*,
      (SELECT COUNT(*)::int FROM student_plans WHERE kid_name = sp.kid_name) as plan_count,
      (SELECT COUNT(*)::int FROM student_documents WHERE kid_name = sp.kid_name) as doc_count,
      (SELECT COUNT(*)::int FROM student_health_conditions WHERE kid_name = sp.kid_name) as health_count,
      (SELECT COUNT(*)::int FROM student_service_providers WHERE kid_name = sp.kid_name AND status = 'active') as provider_count
    FROM student_profiles sp
    ORDER BY sp.display_name
  `)
  return ok(rows)
}

async function getProfile(kidName: string | null) {
  if (!kidName) return err('kid parameter required')

  const results = await Promise.all([
    // 0 – profile
    query(`SELECT * FROM student_profiles WHERE kid_name = $1`, [kidName])
      .catch(e => { console.error('[profile]', e); return [] }),
    // 1 – plans
    query(`SELECT * FROM student_plans WHERE kid_name = $1 ORDER BY status = 'active' DESC, updated_at DESC`, [kidName])
      .catch(e => { console.error('[plans]', e); return [] }),
    // 2 – active providers
    query(`SELECT * FROM student_service_providers WHERE kid_name = $1 AND status = 'active' ORDER BY provider_name`, [kidName])
      .catch(e => { console.error('[active providers]', e); return [] }),
    // 3 – former providers
    query(`SELECT * FROM student_service_providers WHERE kid_name = $1 AND status = 'former' ORDER BY active_until DESC NULLS LAST`, [kidName])
      .catch(e => { console.error('[former providers]', e); return [] }),
    // 4 – documents
    query(`SELECT * FROM student_documents WHERE kid_name = $1 ORDER BY upload_date DESC`, [kidName])
      .catch(e => { console.error('[documents]', e); return [] }),
    // 5 – health conditions
    query(`SELECT * FROM student_health_conditions WHERE kid_name = $1 ORDER BY condition_name`, [kidName])
      .catch(e => { console.error('[health conditions]', e); return [] }),
    // 6 – school history
    query(`SELECT * FROM student_school_history WHERE kid_name = $1 ORDER BY start_date DESC`, [kidName])
      .catch(e => { console.error('[school history]', e); return [] }),
  ])

  const profile = results[0][0] ?? null
  if (!profile) return err('Student not found', 404)

  // Fetch transition plan if one exists for this kid
  let transitionPlan = null
  try {
    const tp = await query(
      `SELECT * FROM student_transition_plans WHERE kid_name = $1 LIMIT 1`,
      [kidName]
    )
    transitionPlan = tp[0] ?? null
  } catch (e) {
    console.error('[transition plan]', e)
  }

  return ok({
    profile,
    plans: results[1],
    providers: { active: results[2], former: results[3] },
    documents: results[4],
    health_conditions: results[5],
    school_history: results[6],
    transition_plan: transitionPlan,
  })
}

async function expiringDocs() {
  const rows = await query(`
    SELECT * FROM student_documents
    WHERE expiration_date IS NOT NULL
      AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
    ORDER BY expiration_date
  `)
  return ok(rows)
}

async function expiringExemptions() {
  const rows = await query(`
    SELECT kid_name, display_name, vaccine_exemption_expiry
    FROM student_profiles
    WHERE vaccine_exemption = true
      AND vaccine_exemption_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
    ORDER BY vaccine_exemption_expiry
  `)
  return ok(rows)
}

async function missingData() {
  // Fetch all active plans with their related counts in one shot
  const plans = await query(`
    SELECT
      sp.kid_name,
      sp.id as plan_id,
      sp.plan_type,
      (SELECT COUNT(*)::int FROM student_documents WHERE kid_name = sp.kid_name) as doc_count,
      sp.annual_review_date as review_date,
      sp.goals,
      (SELECT COUNT(*)::int FROM student_service_providers WHERE kid_name = sp.kid_name AND status = 'active') as provider_count
    FROM student_plans sp
    WHERE sp.plan_status = 'active'
  `)

  const nudges: { kid_name: string; type: string; message: string }[] = []

  for (const plan of plans) {
    if (plan.doc_count === 0) {
      nudges.push({
        kid_name: plan.kid_name,
        type: 'no_documents',
        message: `${plan.kid_name}'s ${plan.plan_type} plan has no uploaded documents`,
      })
    }
    if (!plan.review_date) {
      nudges.push({
        kid_name: plan.kid_name,
        type: 'no_review_date',
        message: `${plan.kid_name}'s ${plan.plan_type} plan has no review date set`,
      })
    }
    const goals = plan.goals
    const goalsEmpty =
      !goals || (Array.isArray(goals) && goals.length === 0)
    if (goalsEmpty) {
      nudges.push({
        kid_name: plan.kid_name,
        type: 'no_goals',
        message: `${plan.kid_name}'s ${plan.plan_type} plan has no goals defined`,
      })
    }
    if (plan.provider_count === 0) {
      nudges.push({
        kid_name: plan.kid_name,
        type: 'no_providers',
        message: `${plan.kid_name} has no active service providers`,
      })
    }
  }

  return ok({ nudges })
}

async function dashboardSchoolHealth() {
  const results = await Promise.all([
    // Plan meeting dates
    query(`
      SELECT kid_name, plan_type, 'next_meeting' as event_type,
        next_meeting_date as event_date
      FROM student_plans
      WHERE next_meeting_date IS NOT NULL
        AND next_meeting_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
    `).catch(e => { console.error('[dashboard meetings]', e); return [] }),

    // Plan annual review dates
    query(`
      SELECT kid_name, plan_type, 'annual_review' as event_type,
        annual_review_date as event_date
      FROM student_plans
      WHERE annual_review_date IS NOT NULL
        AND annual_review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
    `).catch(e => { console.error('[dashboard reviews]', e); return [] }),

    // Vaccine exemption expiry
    query(`
      SELECT kid_name, 'vaccine_exemption' as event_type,
        vaccine_exemption_expiry as event_date
      FROM student_profiles
      WHERE vaccine_exemption = true
        AND vaccine_exemption_expiry IS NOT NULL
        AND vaccine_exemption_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
    `).catch(e => { console.error('[dashboard exemptions]', e); return [] }),

    // Document expirations
    query(`
      SELECT kid_name, doc_type, 'document_expiry' as event_type,
        expiration_date as event_date
      FROM student_documents
      WHERE expiration_date IS NOT NULL
        AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
    `).catch(e => { console.error('[dashboard docs]', e); return [] }),
  ])

  const allEvents = [...results[0], ...results[1], ...results[2], ...results[3]]
  allEvents.sort((a, b) => {
    const da = new Date(a.event_date).getTime()
    const db = new Date(b.event_date).getTime()
    return da - db
  })

  return ok(allEvents.slice(0, 10))
}

// ═══════════════════════════════════════════════════════════════════════════
// POST action handlers
// ═══════════════════════════════════════════════════════════════════════════

async function upsertProfile(data: Record<string, any>) {
  const {
    kid_name, display_name, date_of_birth, grade, school_name, school_district,
    enrollment_status, diagnosis_tags, diagnosis_notes, medications,
    vaccine_exemption, vaccine_exemption_expiry, vaccine_exemption_type,
    primary_language, notes,
  } = data

  if (!kid_name || !display_name) return err('kid_name and display_name required')

  const rows = await query(`
    INSERT INTO student_profiles (
      kid_name, display_name, date_of_birth, grade, school_name, school_district,
      enrollment_status, diagnosis_tags, diagnosis_notes, medications,
      vaccine_exemption, vaccine_exemption_expiry, vaccine_exemption_type,
      primary_language, notes, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
    ON CONFLICT (kid_name) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      date_of_birth = EXCLUDED.date_of_birth,
      grade = EXCLUDED.grade,
      school_name = EXCLUDED.school_name,
      school_district = EXCLUDED.school_district,
      enrollment_status = EXCLUDED.enrollment_status,
      diagnosis_tags = EXCLUDED.diagnosis_tags,
      diagnosis_notes = EXCLUDED.diagnosis_notes,
      medications = EXCLUDED.medications,
      vaccine_exemption = EXCLUDED.vaccine_exemption,
      vaccine_exemption_expiry = EXCLUDED.vaccine_exemption_expiry,
      vaccine_exemption_type = EXCLUDED.vaccine_exemption_type,
      primary_language = EXCLUDED.primary_language,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *
  `, [
    kid_name, display_name, date_of_birth ?? null, grade ?? null,
    school_name ?? null, school_district ?? null, enrollment_status ?? 'active',
    JSON.stringify(diagnosis_tags ?? []), JSON.stringify(diagnosis_notes ?? {}),
    JSON.stringify(medications ?? []),
    vaccine_exemption ?? false, vaccine_exemption_expiry ?? null,
    vaccine_exemption_type ?? null, primary_language ?? 'English', notes ?? null,
  ])

  return ok(rows[0])
}

async function upsertPlan(data: Record<string, any>) {
  const {
    id, kid_name, plan_type, status, start_date, review_date,
    annual_review_date, next_meeting_date, next_meeting_time,
    next_meeting_location, meeting_confirmed, accommodations, goals,
    plan_id_number, case_manager, notes,
  } = data

  if (!kid_name || !plan_type) return err('kid_name and plan_type required')

  if (id) {
    // Update existing
    const rows = await query(`
      UPDATE student_plans SET
        kid_name=$2, plan_type=$3, status=$4, start_date=$5, review_date=$6,
        annual_review_date=$7, next_meeting_date=$8, next_meeting_time=$9,
        next_meeting_location=$10, meeting_confirmed=$11, accommodations=$12,
        goals=$13, plan_id_number=$14, case_manager=$15, notes=$16, updated_at=NOW()
      WHERE id=$1
      RETURNING *
    `, [
      id, kid_name, plan_type, status ?? 'active',
      start_date ?? null, review_date ?? null, annual_review_date ?? null,
      next_meeting_date ?? null, next_meeting_time ?? null,
      next_meeting_location ?? null, meeting_confirmed ?? false,
      JSON.stringify(accommodations ?? []), JSON.stringify(goals ?? []),
      plan_id_number ?? null, case_manager ?? null, notes ?? null,
    ])
    if (!rows.length) return err('Plan not found', 404)
    return ok(rows[0])
  }

  // Insert new
  const rows = await query(`
    INSERT INTO student_plans (
      kid_name, plan_type, status, start_date, review_date,
      annual_review_date, next_meeting_date, next_meeting_time,
      next_meeting_location, meeting_confirmed, accommodations, goals,
      plan_id_number, case_manager, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *
  `, [
    kid_name, plan_type, status ?? 'active',
    start_date ?? null, review_date ?? null, annual_review_date ?? null,
    next_meeting_date ?? null, next_meeting_time ?? null,
    next_meeting_location ?? null, meeting_confirmed ?? false,
    JSON.stringify(accommodations ?? []), JSON.stringify(goals ?? []),
    plan_id_number ?? null, case_manager ?? null, notes ?? null,
  ])
  return ok(rows[0])
}

async function addProvider(data: Record<string, any>) {
  const {
    kid_name, provider_name, provider_role, specialty, organization, phone,
    email, address, fax, portal_url, status, active_since, notes,
  } = data

  if (!kid_name || !provider_name) return err('kid_name and provider_name required')

  const rows = await query(`
    INSERT INTO student_service_providers (
      kid_name, provider_name, provider_role, specialty, organization,
      phone, email, address, fax, portal_url, status, active_since, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, [
    kid_name, provider_name, provider_role ?? null, specialty ?? null,
    organization ?? null, phone ?? null, email ?? null, address ?? null,
    fax ?? null, portal_url ?? null, status ?? 'active',
    active_since ?? null, notes ?? null,
  ])
  return ok(rows[0])
}

async function updateProvider(data: Record<string, any>) {
  const { id, ...fields } = data
  if (!id) return err('id required')

  const setClauses: string[] = []
  const params: any[] = [id]
  let idx = 2

  const allowed = [
    'provider_name', 'provider_role', 'specialty', 'organization',
    'phone', 'email', 'address', 'fax', 'portal_url', 'status',
    'active_since', 'active_until', 'departure_reason', 'notes',
  ]
  for (const key of allowed) {
    if (key in fields) {
      setClauses.push(`${key}=$${idx}`)
      params.push(fields[key])
      idx++
    }
  }

  if (!setClauses.length) return err('No fields to update')
  setClauses.push('updated_at=NOW()')

  const rows = await query(
    `UPDATE student_service_providers SET ${setClauses.join(', ')} WHERE id=$1 RETURNING *`,
    params
  )
  if (!rows.length) return err('Provider not found', 404)
  return ok(rows[0])
}

async function deleteProvider(data: Record<string, any>) {
  const { id, departure_reason } = data
  if (!id) return err('id required')

  const rows = await query(`
    UPDATE student_service_providers
    SET status='former', active_until=CURRENT_DATE, departure_reason=$2, updated_at=NOW()
    WHERE id=$1
    RETURNING *
  `, [id, departure_reason ?? null])
  if (!rows.length) return err('Provider not found', 404)
  return ok(rows[0])
}

async function uploadDocument(data: Record<string, any>) {
  const {
    kid_name, doc_type, doc_name, file_url, file_size_kb,
    academic_year, expiration_date, plan_id, notes,
  } = data

  if (!kid_name || !doc_type || !doc_name) return err('kid_name, doc_type, doc_name required')

  const rows = await query(`
    INSERT INTO student_documents (
      kid_name, doc_type, doc_name, file_url, file_size_kb,
      academic_year, expiration_date, plan_id, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [
    kid_name, doc_type, doc_name, file_url ?? null, file_size_kb ?? null,
    academic_year ?? null, expiration_date ?? null, plan_id ?? null, notes ?? null,
  ])
  return ok(rows[0])
}

async function deleteDocument(data: Record<string, any>) {
  const { id } = data
  if (!id) return err('id required')

  const rows = await query(
    `DELETE FROM student_documents WHERE id=$1 RETURNING *`,
    [id]
  )
  if (!rows.length) return err('Document not found', 404)
  return ok({ deleted: true, id })
}

async function addHealthCondition(data: Record<string, any>) {
  const {
    kid_name, condition_name, condition_type, diagnosed_date,
    diagnosing_provider, severity, status, treatment, medications,
    accommodations_needed, notes,
  } = data

  if (!kid_name || !condition_name) return err('kid_name and condition_name required')

  const rows = await query(`
    INSERT INTO student_health_conditions (
      kid_name, condition_name, condition_type, diagnosed_date,
      diagnosing_provider, severity, status, treatment, medications,
      accommodations_needed, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [
    kid_name, condition_name, condition_type ?? null, diagnosed_date ?? null,
    diagnosing_provider ?? null, severity ?? null, status ?? 'active',
    treatment ?? null, JSON.stringify(medications ?? []),
    JSON.stringify(accommodations_needed ?? []), notes ?? null,
  ])
  return ok(rows[0])
}

async function updateHealthCondition(data: Record<string, any>) {
  const { id, ...fields } = data
  if (!id) return err('id required')

  const setClauses: string[] = []
  const params: any[] = [id]
  let idx = 2

  const allowed = [
    'condition_name', 'condition_type', 'diagnosed_date', 'diagnosing_provider',
    'severity', 'status', 'treatment', 'medications', 'accommodations_needed', 'notes',
  ]
  for (const key of allowed) {
    if (key in fields) {
      const val = ['medications', 'accommodations_needed'].includes(key)
        ? JSON.stringify(fields[key])
        : fields[key]
      setClauses.push(`${key}=$${idx}`)
      params.push(val)
      idx++
    }
  }

  if (!setClauses.length) return err('No fields to update')
  setClauses.push('updated_at=NOW()')

  const rows = await query(
    `UPDATE student_health_conditions SET ${setClauses.join(', ')} WHERE id=$1 RETURNING *`,
    params
  )
  if (!rows.length) return err('Condition not found', 404)
  return ok(rows[0])
}

async function deleteHealthCondition(data: Record<string, any>) {
  const { id } = data
  if (!id) return err('id required')

  const rows = await query(
    `DELETE FROM student_health_conditions WHERE id=$1 RETURNING *`,
    [id]
  )
  if (!rows.length) return err('Condition not found', 404)
  return ok({ deleted: true, id })
}

async function toggleDiagnosisTag(data: Record<string, any>) {
  const { kid_name, tag } = data
  if (!kid_name || !tag) return err('kid_name and tag required')

  // Check if tag exists already
  const existing = await query(
    `SELECT diagnosis_tags FROM student_profiles WHERE kid_name = $1`,
    [kid_name]
  )
  if (!existing.length) return err('Student not found', 404)

  const tags: string[] = existing[0].diagnosis_tags ?? []
  const idx = tags.indexOf(tag)

  let rows
  if (idx >= 0) {
    // Remove
    rows = await query(`
      UPDATE student_profiles
      SET diagnosis_tags = diagnosis_tags - $2, updated_at = NOW()
      WHERE kid_name = $1
      RETURNING *
    `, [kid_name, tag])
  } else {
    // Add
    rows = await query(`
      UPDATE student_profiles
      SET diagnosis_tags = COALESCE(diagnosis_tags, '[]'::jsonb) || to_jsonb($2::text), updated_at = NOW()
      WHERE kid_name = $1
      RETURNING *
    `, [kid_name, tag])
  }

  return ok(rows[0])
}

async function updateDiagnosisNote(data: Record<string, any>) {
  const { kid_name, key, value } = data
  if (!kid_name || !key) return err('kid_name and key required')

  const rows = await query(`
    UPDATE student_profiles
    SET diagnosis_notes = COALESCE(diagnosis_notes, '{}'::jsonb) || jsonb_build_object($2::text, $3::text),
        updated_at = NOW()
    WHERE kid_name = $1
    RETURNING *
  `, [kid_name, key, value ?? ''])

  if (!rows.length) return err('Student not found', 404)
  return ok(rows[0])
}

async function upsertTransitionPlan(data: Record<string, any>) {
  const {
    id, kid_name, target_graduation_year, post_secondary_goal,
    employment_goal, independent_living_goal, agencies, skills_checklist,
    notes,
  } = data

  if (!kid_name) return err('kid_name required')

  if (id) {
    const rows = await query(`
      UPDATE student_transition_plans SET
        kid_name=$2, target_graduation_year=$3, post_secondary_goal=$4,
        employment_goal=$5, independent_living_goal=$6, agencies=$7,
        skills_checklist=$8, notes=$9, updated_at=NOW()
      WHERE id=$1
      RETURNING *
    `, [
      id, kid_name, target_graduation_year ?? null, post_secondary_goal ?? null,
      employment_goal ?? null, independent_living_goal ?? null,
      JSON.stringify(agencies ?? []), JSON.stringify(skills_checklist ?? []),
      notes ?? null,
    ])
    if (!rows.length) return err('Transition plan not found', 404)
    return ok(rows[0])
  }

  // Insert — upsert on kid_name
  const rows = await query(`
    INSERT INTO student_transition_plans (
      kid_name, target_graduation_year, post_secondary_goal,
      employment_goal, independent_living_goal, agencies,
      skills_checklist, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (kid_name) DO UPDATE SET
      target_graduation_year = EXCLUDED.target_graduation_year,
      post_secondary_goal = EXCLUDED.post_secondary_goal,
      employment_goal = EXCLUDED.employment_goal,
      independent_living_goal = EXCLUDED.independent_living_goal,
      agencies = EXCLUDED.agencies,
      skills_checklist = EXCLUDED.skills_checklist,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *
  `, [
    kid_name, target_graduation_year ?? null, post_secondary_goal ?? null,
    employment_goal ?? null, independent_living_goal ?? null,
    JSON.stringify(agencies ?? []), JSON.stringify(skills_checklist ?? []),
    notes ?? null,
  ])
  return ok(rows[0])
}

async function addSchoolHistory(data: Record<string, any>) {
  const {
    kid_name, school_name, school_type, grade_level, start_date,
    end_date, reason_for_leaving, notes,
  } = data

  if (!kid_name || !school_name) return err('kid_name and school_name required')

  const rows = await query(`
    INSERT INTO student_school_history (
      kid_name, school_name, school_type, grade_level,
      start_date, end_date, reason_for_leaving, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `, [
    kid_name, school_name, school_type ?? null, grade_level ?? null,
    start_date ?? null, end_date ?? null, reason_for_leaving ?? null,
    notes ?? null,
  ])
  return ok(rows[0])
}

// ═══════════════════════════════════════════════════════════════════════════
// generate_health_email — compile a kid's full record into draft email text
// ═══════════════════════════════════════════════════════════════════════════

async function generateHealthEmail(data: Record<string, any>) {
  const { kid_name, recipient_name, recipient_role } = data
  if (!kid_name) return err('kid_name required')

  // Fetch all relevant data in parallel
  const results = await Promise.all([
    // 0 – profile
    query(`SELECT * FROM student_profiles WHERE kid_name = $1`, [kid_name])
      .catch(e => { console.error('[email profile]', e); return [] }),
    // 1 – active medications from health module
    query(
      `SELECT medication_name, dosage, frequency, purpose FROM medications
       WHERE family_member_name = $1 AND is_active = true ORDER BY medication_name`,
      [kid_name]
    ).catch(() => []),
    // 2 – plans
    query(`SELECT plan_type, status, accommodations, goals, case_manager FROM student_plans WHERE kid_name = $1 AND status = 'active'`, [kid_name])
      .catch(e => { console.error('[email plans]', e); return [] }),
    // 3 – health conditions
    query(`SELECT condition_name, condition_type, severity, treatment, accommodations_needed FROM student_health_conditions WHERE kid_name = $1 AND status = 'active'`, [kid_name])
      .catch(e => { console.error('[email conditions]', e); return [] }),
    // 4 – active service providers
    query(`SELECT provider_name, provider_role, organization, phone, email FROM student_service_providers WHERE kid_name = $1 AND status = 'active'`, [kid_name])
      .catch(e => { console.error('[email providers]', e); return [] }),
  ])

  const profile = results[0][0]
  if (!profile) return err('Student not found', 404)

  const meds = results[1]
  const plans = results[2]
  const conditions = results[3]
  const providers = results[4]

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const recipientLine = recipient_name
    ? `Dear ${recipient_name}${recipient_role ? ` (${recipient_role})` : ''},`
    : 'To Whom It May Concern,'

  // ── Part 1: Health information ───────────────────────
  const lines: string[] = []
  lines.push(`Date: ${today}`)
  lines.push(`Re: Health & Accommodation Information for ${profile.display_name}`)
  lines.push('')
  lines.push(recipientLine)
  lines.push('')
  lines.push(`This email contains important health and accommodation information for ${profile.display_name} (DOB: ${profile.date_of_birth || 'on file'}).`)
  lines.push('')

  // Diagnoses / tags
  const tags: string[] = profile.diagnosis_tags ?? []
  if (tags.length) {
    lines.push('DIAGNOSES:')
    tags.forEach((t: string) => lines.push(`  - ${t}`))
    lines.push('')
  }

  // Health conditions
  if (conditions.length) {
    lines.push('HEALTH CONDITIONS:')
    for (const c of conditions) {
      lines.push(`  - ${c.condition_name}${c.severity ? ` (${c.severity})` : ''}`)
      if (c.treatment) lines.push(`    Treatment: ${c.treatment}`)
      const accoms = c.accommodations_needed ?? []
      if (Array.isArray(accoms) && accoms.length) {
        lines.push(`    Accommodations needed: ${accoms.join(', ')}`)
      }
    }
    lines.push('')
  }

  // Medications
  if (meds.length) {
    lines.push('CURRENT MEDICATIONS:')
    for (const m of meds) {
      lines.push(`  - ${m.medication_name} ${m.dosage ?? ''} — ${m.frequency ?? ''}${m.purpose ? ` (${m.purpose})` : ''}`)
    }
    lines.push('')
  }

  // Plans & accommodations
  if (plans.length) {
    lines.push('ACTIVE PLANS & ACCOMMODATIONS:')
    for (const p of plans) {
      lines.push(`  ${p.plan_type.toUpperCase()} Plan${p.case_manager ? ` (Case Manager: ${p.case_manager})` : ''}:`)
      const accoms = p.accommodations ?? []
      if (Array.isArray(accoms) && accoms.length) {
        accoms.forEach((a: any) => {
          const label = typeof a === 'string' ? a : a.description || a.name || JSON.stringify(a)
          lines.push(`    - ${label}`)
        })
      }
      const goals = p.goals ?? []
      if (Array.isArray(goals) && goals.length) {
        lines.push(`  Goals:`)
        goals.forEach((g: any) => {
          const label = typeof g === 'string' ? g : g.description || g.name || JSON.stringify(g)
          lines.push(`    - ${label}`)
        })
      }
    }
    lines.push('')
  }

  // Vaccine exemption
  if (profile.vaccine_exemption) {
    lines.push(`VACCINE EXEMPTION: ${profile.vaccine_exemption_type || 'On file'}`)
    if (profile.vaccine_exemption_expiry) {
      lines.push(`  Expires: ${new Date(profile.vaccine_exemption_expiry).toLocaleDateString('en-US')}`)
    }
    lines.push('')
  }

  // ── Part 2: Contact verification ────────────────────
  lines.push('─'.repeat(50))
  lines.push('PART 2: CONTACT & PROVIDER VERIFICATION')
  lines.push('')
  lines.push('Please verify the following contact information is current:')
  lines.push('')

  if (providers.length) {
    lines.push('SERVICE PROVIDERS:')
    for (const prov of providers) {
      lines.push(`  - ${prov.provider_name}${prov.provider_role ? ` (${prov.provider_role})` : ''}`)
      if (prov.organization) lines.push(`    Organization: ${prov.organization}`)
      if (prov.phone) lines.push(`    Phone: ${prov.phone}`)
      if (prov.email) lines.push(`    Email: ${prov.email}`)
    }
    lines.push('')
  }

  lines.push('Please reply to confirm receipt and note any corrections needed.')
  lines.push('')
  lines.push('Thank you,')
  lines.push('The Moses Family')

  const emailText = lines.join('\n')

  return ok({
    kid_name,
    subject: `Health & Accommodation Information — ${profile.display_name}`,
    body: emailText,
  })
}
