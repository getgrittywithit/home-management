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

    return NextResponse.json({
      insurancePlan,
      providers: providersResult,
      healthProfiles: profilesResult,
      benefitRules: benefitRulesResult
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
