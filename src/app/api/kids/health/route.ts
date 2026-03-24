import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const child = searchParams.get('child')?.toLowerCase()

    if (!child) {
      return NextResponse.json({ error: 'child parameter required' }, { status: 400 })
    }

    // Fetch providers from the health_providers table (kids or shared)
    const providers = await query(
      `SELECT id, name, specialty, practice_name, phone, address
       FROM health_providers
       WHERE member_group IN ('kids', 'both')
       ORDER BY name`
    )

    // Also check health_profiles for this kid's primary doctor (fallback source)
    const profileResult = await query(
      `SELECT primary_doctor, primary_doctor_phone, primary_doctor_address, pharmacy_name, pharmacy_phone
       FROM health_profiles
       WHERE member_group = 'kids' AND LOWER(family_member_name) = $1
       LIMIT 1`,
      [child]
    )
    const profile = profileResult[0] || null

    // If the kid has a primary doctor in their profile but it's not in the providers list, include it
    if (profile?.primary_doctor && profile.primary_doctor.trim()) {
      const alreadyListed = providers.some(
        (p: any) => p.name.toLowerCase() === profile.primary_doctor.toLowerCase()
      )
      if (!alreadyListed) {
        providers.unshift({
          id: `profile-primary`,
          name: profile.primary_doctor,
          specialty: 'Primary Care',
          practice_name: '',
          phone: profile.primary_doctor_phone || null,
          address: profile.primary_doctor_address || null,
        })
      }
    }

    // Fetch upcoming appointments for this child (match by name, case-insensitive)
    const appointments = await query(
      `SELECT id, provider_name, appointment_type, appointment_date, location, reason, status
       FROM health_appointments
       WHERE member_group = 'kids'
         AND LOWER(family_member_name) = $1
         AND appointment_date >= CURRENT_DATE
         AND status = 'scheduled'
       ORDER BY appointment_date ASC`,
      [child]
    )

    // Fetch this kid's health requests
    const requests = await query(
      `SELECT id, category, duration, severity, notes, status, parent_response, created_at, resolved_at
       FROM kid_health_requests
       WHERE child_name = $1
       ORDER BY created_at DESC`,
      [child]
    )

    return NextResponse.json({ providers, appointments, requests })
  } catch (error) {
    console.error('Kids health GET error:', error)
    return NextResponse.json({ error: 'Failed to load health data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'submit_health_request': {
        const { child, category, duration, severity, notes } = body
        if (!child || !category || !duration || !severity) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const result = await query(
          `INSERT INTO kid_health_requests (child_name, category, duration, severity, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [child.toLowerCase(), category, duration, severity, notes || null]
        )
        return NextResponse.json({ success: true, id: result[0]?.id })
      }

      case 'update_request_status': {
        const { requestId, status, parent_response } = body
        if (!requestId || !status) {
          return NextResponse.json({ error: 'Missing requestId or status' }, { status: 400 })
        }
        const resolvedAt = ['scheduled', 'handled', 'dismissed'].includes(status) ? 'NOW()' : 'NULL'
        await query(
          `UPDATE kid_health_requests
           SET status = $1, parent_response = $2, resolved_at = ${resolvedAt}
           WHERE id = $3`,
          [status, parent_response || null, requestId]
        )
        return NextResponse.json({ success: true })
      }

      case 'get_all_requests': {
        // Parent portal: get all pending requests across all kids
        const requests = await query(
          `SELECT id, child_name, category, duration, severity, notes, status, parent_response, created_at, resolved_at
           FROM kid_health_requests
           ORDER BY
             CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
             created_at DESC`
        )
        return NextResponse.json({ requests })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Kids health POST error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
