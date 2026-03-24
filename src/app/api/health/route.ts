import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group') as 'parents' | 'kids'

    if (!group || !['parents', 'kids'].includes(group)) {
      return NextResponse.json(
        { error: 'Invalid or missing group parameter. Must be "parents" or "kids".' },
        { status: 400 }
      )
    }

    // Fetch insurance plan
    const insurancePlanResult = await query(
      `SELECT * FROM insurance_plans WHERE member_group = $1 LIMIT 1`,
      [group]
    )
    const insurancePlan = insurancePlanResult[0] || null

    // Fetch health providers
    const providersResult = await query(
      `SELECT * FROM health_providers WHERE member_group = $1 OR member_group = 'both' ORDER BY name`,
      [group]
    )

    // Fetch health profiles
    const profilesResult = await query(
      `SELECT * FROM health_profiles WHERE member_group = $1 ORDER BY family_member_name`,
      [group]
    )

    // Fetch benefit rules
    const benefitRulesResult = insurancePlan
      ? await query(
        `SELECT * FROM benefit_rules WHERE insurance_plan_id = $1 ORDER BY rule_category, rule_title`,
        [insurancePlan.id]
      )
      : []

    // Fetch appointments
    const appointmentsResult = await query(
      `SELECT * FROM health_appointments WHERE member_group = $1 ORDER BY appointment_date DESC`,
      [group]
    )

    // Fetch medications
    const medicationsResult = await query(
      `SELECT * FROM medications WHERE member_group = $1 ORDER BY is_active DESC, medication_name ASC`,
      [group]
    )

    // Fetch visit notes
    const visitNotesResult = await query(
      `SELECT * FROM health_visit_notes WHERE member_group = $1 ORDER BY visit_date DESC`,
      [group]
    )

    // Fetch health tasks
    const healthTasksResult = await query(
      `SELECT * FROM health_tasks WHERE member_group = $1 ORDER BY
        CASE WHEN status = 'pending' THEN 0 WHEN status = 'in_progress' THEN 1 ELSE 2 END,
        CASE WHEN priority = 'urgent' THEN 0 WHEN priority = 'high' THEN 1 WHEN priority = 'medium' THEN 2 ELSE 3 END,
        due_date ASC NULLS LAST`,
      [group]
    )

    return NextResponse.json({
      insurancePlan,
      providers: providersResult,
      healthProfiles: profilesResult,
      benefitRules: benefitRulesResult,
      appointments: appointmentsResult,
      medications: medicationsResult,
      visitNotes: visitNotesResult,
      healthTasks: healthTasksResult
    })
  } catch (error) {
    console.error('Error fetching health data:', error)
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (!action || !data) {
      return NextResponse.json(
        { error: 'Missing action or data in request body' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_insurance_plan': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 })

        const result = await query(
          `UPDATE insurance_plans
           SET plan_name = COALESCE($2, plan_name),
               copay_primary = COALESCE($3, copay_primary),
               copay_specialist = COALESCE($4, copay_specialist),
               copay_urgent_care = COALESCE($5, copay_urgent_care),
               copay_er = COALESCE($6, copay_er),
               deductible = COALESCE($7, deductible),
               out_of_pocket_max = COALESCE($8, out_of_pocket_max),
               notes = COALESCE($9, notes),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.plan_name,
            updates.copay_primary,
            updates.copay_specialist,
            updates.copay_urgent_care,
            updates.copay_er,
            updates.deductible,
            updates.out_of_pocket_max,
            updates.notes
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'add_provider': {
        if (!data.name) {
          return NextResponse.json({ error: 'Provider name is required' }, { status: 400 })
        }

        const result = await query(
          `INSERT INTO health_providers (
            name, specialty, practice_name, phone, fax, address,
            accepts_insurance, portal_url, notes, member_group
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            data.name,
            data.specialty || null,
            data.practice_name || null,
            data.phone || null,
            data.fax || null,
            data.address || null,
            data.accepts_insurance || null,
            data.portal_url || null,
            data.notes || null,
            data.member_group || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_provider': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing provider ID' }, { status: 400 })

        const result = await query(
          `UPDATE health_providers
           SET name = COALESCE($2, name),
               specialty = COALESCE($3, specialty),
               practice_name = COALESCE($4, practice_name),
               phone = COALESCE($5, phone),
               fax = COALESCE($6, fax),
               address = COALESCE($7, address),
               accepts_insurance = COALESCE($8, accepts_insurance),
               portal_url = COALESCE($9, portal_url),
               notes = COALESCE($10, notes),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.name,
            updates.specialty,
            updates.practice_name,
            updates.phone,
            updates.fax,
            updates.address,
            updates.accepts_insurance,
            updates.portal_url,
            updates.notes
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_provider': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing provider ID' }, { status: 400 })

        await query(`DELETE FROM health_providers WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'add_health_profile': {
        if (!data.family_member_name) {
          return NextResponse.json(
            { error: 'Family member name is required' },
            { status: 400 }
          )
        }

        const result = await query(
          `INSERT INTO health_profiles (
            family_member_name, member_group, insurance_plan_id, primary_doctor,
            primary_doctor_phone, primary_doctor_address, pharmacy_name,
            pharmacy_phone, pharmacy_address, blood_type, allergies,
            chronic_conditions, emergency_contact, emergency_phone, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING *`,
          [
            data.family_member_name,
            data.member_group,
            data.insurance_plan_id || null,
            data.primary_doctor || null,
            data.primary_doctor_phone || null,
            data.primary_doctor_address || null,
            data.pharmacy_name || null,
            data.pharmacy_phone || null,
            data.pharmacy_address || null,
            data.blood_type || null,
            data.allergies || null,
            data.chronic_conditions || null,
            data.emergency_contact || null,
            data.emergency_phone || null,
            data.notes || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_health_profile': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing profile ID' }, { status: 400 })

        const result = await query(
          `UPDATE health_profiles
           SET family_member_name = COALESCE($2, family_member_name),
               primary_doctor = COALESCE($3, primary_doctor),
               primary_doctor_phone = COALESCE($4, primary_doctor_phone),
               primary_doctor_address = COALESCE($5, primary_doctor_address),
               pharmacy_name = COALESCE($6, pharmacy_name),
               pharmacy_phone = COALESCE($7, pharmacy_phone),
               pharmacy_address = COALESCE($8, pharmacy_address),
               blood_type = COALESCE($9, blood_type),
               allergies = COALESCE($10, allergies),
               chronic_conditions = COALESCE($11, chronic_conditions),
               emergency_contact = COALESCE($12, emergency_contact),
               emergency_phone = COALESCE($13, emergency_phone),
               notes = COALESCE($14, notes),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.family_member_name,
            updates.primary_doctor,
            updates.primary_doctor_phone,
            updates.primary_doctor_address,
            updates.pharmacy_name,
            updates.pharmacy_phone,
            updates.pharmacy_address,
            updates.blood_type,
            updates.allergies,
            updates.chronic_conditions,
            updates.emergency_contact,
            updates.emergency_phone,
            updates.notes
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_health_profile': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing profile ID' }, { status: 400 })

        await query(`DELETE FROM health_profiles WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'add_benefit_rule': {
        if (!data.insurance_plan_id || !data.rule_category || !data.rule_title || !data.rule_description) {
          return NextResponse.json(
            { error: 'Missing required fields for benefit rule' },
            { status: 400 }
          )
        }

        const result = await query(
          `INSERT INTO benefit_rules (
            insurance_plan_id, rule_category, rule_title, rule_description, applies_to
          ) VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            data.insurance_plan_id,
            data.rule_category,
            data.rule_title,
            data.rule_description,
            data.applies_to || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_benefit_rule': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing rule ID' }, { status: 400 })

        const result = await query(
          `UPDATE benefit_rules
           SET rule_category = COALESCE($2, rule_category),
               rule_title = COALESCE($3, rule_title),
               rule_description = COALESCE($4, rule_description),
               applies_to = COALESCE($5, applies_to)
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.rule_category,
            updates.rule_title,
            updates.rule_description,
            updates.applies_to
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_benefit_rule': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing rule ID' }, { status: 400 })

        await query(`DELETE FROM benefit_rules WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      // =============================================
      // PHASE 2: APPOINTMENTS
      // =============================================
      case 'add_appointment': {
        if (!data.family_member_name || !data.appointment_type || !data.appointment_date) {
          return NextResponse.json(
            { error: 'Family member name, appointment type, and date are required' },
            { status: 400 }
          )
        }

        const result = await query(
          `INSERT INTO health_appointments (
            family_member_name, member_group, provider_id, provider_name,
            appointment_type, appointment_date, location, reason,
            status, notes, copay_amount, referral_needed, referral_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            data.family_member_name,
            data.member_group,
            data.provider_id || null,
            data.provider_name || null,
            data.appointment_type,
            data.appointment_date,
            data.location || null,
            data.reason || null,
            data.status || 'scheduled',
            data.notes || null,
            data.copay_amount || null,
            data.referral_needed || false,
            data.referral_status || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_appointment': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 })

        const result = await query(
          `UPDATE health_appointments
           SET family_member_name = COALESCE($2, family_member_name),
               provider_name = COALESCE($3, provider_name),
               appointment_type = COALESCE($4, appointment_type),
               appointment_date = COALESCE($5, appointment_date),
               location = COALESCE($6, location),
               reason = COALESCE($7, reason),
               status = COALESCE($8, status),
               notes = COALESCE($9, notes),
               copay_amount = COALESCE($10, copay_amount),
               referral_needed = COALESCE($11, referral_needed),
               referral_status = COALESCE($12, referral_status),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.family_member_name,
            updates.provider_name,
            updates.appointment_type,
            updates.appointment_date,
            updates.location,
            updates.reason,
            updates.status,
            updates.notes,
            updates.copay_amount,
            updates.referral_needed,
            updates.referral_status
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_appointment': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 })

        await query(`DELETE FROM health_appointments WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      // =============================================
      // PHASE 2: MEDICATIONS
      // =============================================
      case 'add_medication': {
        if (!data.family_member_name || !data.medication_name) {
          return NextResponse.json(
            { error: 'Family member name and medication name are required' },
            { status: 400 }
          )
        }

        const result = await query(
          `INSERT INTO medications (
            family_member_name, member_group, medication_name, dosage,
            frequency, prescribing_doctor, pharmacy, start_date, end_date,
            refill_date, refills_remaining, purpose, side_effects, is_active, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING *`,
          [
            data.family_member_name,
            data.member_group,
            data.medication_name,
            data.dosage || null,
            data.frequency || null,
            data.prescribing_doctor || null,
            data.pharmacy || null,
            data.start_date || null,
            data.end_date || null,
            data.refill_date || null,
            data.refills_remaining ?? null,
            data.purpose || null,
            data.side_effects || null,
            data.is_active ?? true,
            data.notes || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_medication': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing medication ID' }, { status: 400 })

        const result = await query(
          `UPDATE medications
           SET medication_name = COALESCE($2, medication_name),
               dosage = COALESCE($3, dosage),
               frequency = COALESCE($4, frequency),
               prescribing_doctor = COALESCE($5, prescribing_doctor),
               pharmacy = COALESCE($6, pharmacy),
               start_date = COALESCE($7, start_date),
               end_date = COALESCE($8, end_date),
               refill_date = COALESCE($9, refill_date),
               refills_remaining = COALESCE($10, refills_remaining),
               purpose = COALESCE($11, purpose),
               side_effects = COALESCE($12, side_effects),
               is_active = COALESCE($13, is_active),
               notes = COALESCE($14, notes),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.medication_name,
            updates.dosage,
            updates.frequency,
            updates.prescribing_doctor,
            updates.pharmacy,
            updates.start_date,
            updates.end_date,
            updates.refill_date,
            updates.refills_remaining,
            updates.purpose,
            updates.side_effects,
            updates.is_active,
            updates.notes
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_medication': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing medication ID' }, { status: 400 })

        await query(`DELETE FROM medications WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'toggle_medication_active': {
        const { id, is_active } = data
        if (!id) return NextResponse.json({ error: 'Missing medication ID' }, { status: 400 })

        const result = await query(
          `UPDATE medications SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id, is_active]
        )
        return NextResponse.json(result[0])
      }

      // =============================================
      // PHASE 3: VISIT NOTES
      // =============================================
      case 'add_visit_note': {
        if (!data.family_member_name || !data.visit_date) {
          return NextResponse.json(
            { error: 'Family member name and visit date are required' },
            { status: 400 }
          )
        }

        const result = await query(
          `INSERT INTO health_visit_notes (
            appointment_id, family_member_name, member_group, visit_date,
            provider_name, raw_notes, ai_synopsis, ai_tasks, ai_prescriptions,
            ai_diagnoses, ai_followup
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            data.appointment_id || null,
            data.family_member_name,
            data.member_group,
            data.visit_date,
            data.provider_name || null,
            data.raw_notes || null,
            data.ai_synopsis || null,
            data.ai_tasks ? JSON.stringify(data.ai_tasks) : null,
            data.ai_prescriptions ? JSON.stringify(data.ai_prescriptions) : null,
            data.ai_diagnoses ? JSON.stringify(data.ai_diagnoses) : null,
            data.ai_followup || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_visit_note': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing visit note ID' }, { status: 400 })

        const result = await query(
          `UPDATE health_visit_notes
           SET raw_notes = COALESCE($2, raw_notes),
               ai_synopsis = COALESCE($3, ai_synopsis),
               ai_tasks = COALESCE($4, ai_tasks),
               ai_prescriptions = COALESCE($5, ai_prescriptions),
               ai_diagnoses = COALESCE($6, ai_diagnoses),
               ai_followup = COALESCE($7, ai_followup),
               provider_name = COALESCE($8, provider_name),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.raw_notes,
            updates.ai_synopsis,
            updates.ai_tasks ? JSON.stringify(updates.ai_tasks) : null,
            updates.ai_prescriptions ? JSON.stringify(updates.ai_prescriptions) : null,
            updates.ai_diagnoses ? JSON.stringify(updates.ai_diagnoses) : null,
            updates.ai_followup,
            updates.provider_name
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_visit_note': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing visit note ID' }, { status: 400 })

        await query(`DELETE FROM health_visit_notes WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      // =============================================
      // PHASE 3: HEALTH TASKS
      // =============================================
      case 'add_health_task': {
        if (!data.family_member_name || !data.task) {
          return NextResponse.json(
            { error: 'Family member name and task description are required' },
            { status: 400 }
          )
        }

        const result = await query(
          `INSERT INTO health_tasks (
            family_member_name, member_group, visit_note_id, task,
            due_date, priority, status, category, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            data.family_member_name,
            data.member_group,
            data.visit_note_id || null,
            data.task,
            data.due_date || null,
            data.priority || 'medium',
            data.status || 'pending',
            data.category || null,
            data.notes || null
          ]
        )
        return NextResponse.json(result[0], { status: 201 })
      }

      case 'update_health_task': {
        const { id, ...updates } = data
        if (!id) return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })

        const result = await query(
          `UPDATE health_tasks
           SET task = COALESCE($2, task),
               due_date = COALESCE($3, due_date),
               priority = COALESCE($4, priority),
               status = COALESCE($5, status),
               category = COALESCE($6, category),
               notes = COALESCE($7, notes),
               completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            updates.task,
            updates.due_date,
            updates.priority,
            updates.status,
            updates.category,
            updates.notes
          ]
        )
        return NextResponse.json(result[0])
      }

      case 'delete_health_task': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })

        await query(`DELETE FROM health_tasks WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'complete_health_task': {
        const { id } = data
        if (!id) return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })

        const result = await query(
          `UPDATE health_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
          [id]
        )
        return NextResponse.json(result[0])
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in health API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
