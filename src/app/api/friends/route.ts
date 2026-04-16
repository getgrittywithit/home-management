import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list_requests'

  try {
    if (action === 'list_profiles') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM friend_profiles WHERE kid_name = $1 ORDER BY updated_at DESC`,
        [kidName]
      ).catch(() => [])
      return NextResponse.json({ profiles: rows })
    }

    if (action === 'get_profile') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM friend_profiles WHERE id = $1`, [id])
      return NextResponse.json({ profile: rows[0] || null })
    }

    if (action === 'list_requests') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const status = searchParams.get('status')
      let sql = `SELECT fr.*, fp.parent1_name, fp.parent1_phone, fp.parent2_name, fp.address AS profile_address
                   FROM friend_requests fr
                   LEFT JOIN friend_profiles fp ON fp.id = fr.friend_profile_id`
      const params: any[] = []
      const conditions: string[] = []
      if (kidName) { params.push(kidName); conditions.push(`fr.kid_name = $${params.length}`) }
      if (status) { params.push(status); conditions.push(`fr.status = $${params.length}`) }
      if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ')
      sql += ` ORDER BY fr.created_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ requests: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Friends GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'save_profile': {
        const {
          id, kid_name, friend_name, how_know, been_before,
          parent1_name, parent1_phone, parent1_email,
          parent2_name, parent2_phone, parent2_email,
          parents_married, other_adults,
          address, gate_code, has_wifi, siblings,
        } = body
        if (!kid_name || !friend_name) return NextResponse.json({ error: 'kid_name + friend_name required' }, { status: 400 })
        const kid = kid_name.toLowerCase()

        if (id) {
          const rows = await db.query(
            `UPDATE friend_profiles SET
               friend_name=$2, how_know=$3, been_before=$4,
               parent1_name=$5, parent1_phone=$6, parent1_email=$7,
               parent2_name=$8, parent2_phone=$9, parent2_email=$10,
               parents_married=$11, other_adults=$12,
               address=$13, gate_code=$14, has_wifi=$15, siblings=$16,
               updated_at=NOW()
             WHERE id=$1 RETURNING *`,
            [id, friend_name, how_know||null, been_before??null,
             parent1_name||null, parent1_phone||null, parent1_email||null,
             parent2_name||null, parent2_phone||null, parent2_email||null,
             parents_married||null, other_adults||null,
             address||null, gate_code||null, has_wifi??null,
             JSON.stringify(siblings||[])]
          )
          return NextResponse.json({ profile: rows[0] })
        }

        const rows = await db.query(
          `INSERT INTO friend_profiles
             (kid_name, friend_name, how_know, been_before,
              parent1_name, parent1_phone, parent1_email,
              parent2_name, parent2_phone, parent2_email,
              parents_married, other_adults,
              address, gate_code, has_wifi, siblings)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           RETURNING *`,
          [kid, friend_name, how_know||null, been_before??null,
           parent1_name||null, parent1_phone||null, parent1_email||null,
           parent2_name||null, parent2_phone||null, parent2_email||null,
           parents_married||null, other_adults||null,
           address||null, gate_code||null, has_wifi??null,
           JSON.stringify(siblings||[])]
        )
        return NextResponse.json({ profile: rows[0] }, { status: 201 })
      }

      case 'submit_request': {
        const {
          kid_name, friend_name, friend_profile_id,
          visit_type, start_date, start_time, end_date, end_time, return_date,
          location_type, address, gate_code, has_wifi,
          activities, plan_details, special_event,
          leaving_house, leaving_where,
          ride_there, ride_home, ride_other_who,
          travel_details, destination, siblings_present, notes,
          // Profile fields for auto-save
          how_know, been_before,
          parent1_name, parent1_phone, parent1_email,
          parent2_name, parent2_phone, parent2_email,
          parents_married, other_adults, siblings,
        } = body

        if (!kid_name || !friend_name || !start_date) {
          return NextResponse.json({ error: 'kid_name, friend_name, start_date required' }, { status: 400 })
        }
        const kid = kid_name.toLowerCase()

        // Auto-save/update friend profile
        let profileId = friend_profile_id || null
        if (friend_name) {
          const existing = await db.query(
            `SELECT id FROM friend_profiles WHERE kid_name = $1 AND LOWER(friend_name) = LOWER($2) LIMIT 1`,
            [kid, friend_name]
          ).catch(() => [])

          if (existing[0]) {
            profileId = existing[0].id
            await db.query(
              `UPDATE friend_profiles SET
                 how_know=COALESCE($2,how_know), been_before=COALESCE($3,been_before),
                 parent1_name=COALESCE($4,parent1_name), parent1_phone=COALESCE($5,parent1_phone),
                 parent1_email=COALESCE($6,parent1_email),
                 parent2_name=COALESCE($7,parent2_name), parent2_phone=COALESCE($8,parent2_phone),
                 parent2_email=COALESCE($9,parent2_email),
                 parents_married=COALESCE($10,parents_married), other_adults=COALESCE($11,other_adults),
                 address=COALESCE($12,address), gate_code=COALESCE($13,gate_code),
                 has_wifi=COALESCE($14,has_wifi), siblings=COALESCE($15,siblings),
                 updated_at=NOW()
               WHERE id=$1`,
              [profileId, how_know||null, been_before??null,
               parent1_name||null, parent1_phone||null, parent1_email||null,
               parent2_name||null, parent2_phone||null, parent2_email||null,
               parents_married||null, other_adults||null,
               address||null, gate_code||null, has_wifi??null,
               siblings ? JSON.stringify(siblings) : null]
            ).catch(() => {})
          } else {
            const created = await db.query(
              `INSERT INTO friend_profiles (kid_name, friend_name, how_know, been_before,
                 parent1_name, parent1_phone, parent1_email,
                 parent2_name, parent2_phone, parent2_email,
                 parents_married, other_adults, address, gate_code, has_wifi, siblings)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
              [kid, friend_name, how_know||null, been_before??null,
               parent1_name||null, parent1_phone||null, parent1_email||null,
               parent2_name||null, parent2_phone||null, parent2_email||null,
               parents_married||null, other_adults||null,
               address||null, gate_code||null, has_wifi??null,
               JSON.stringify(siblings||[])]
            ).catch(() => [])
            if (created[0]) profileId = created[0].id
          }
        }

        const rows = await db.query(
          `INSERT INTO friend_requests (
             kid_name, friend_name, friend_profile_id,
             visit_type, start_date, start_time, end_date, end_time, return_date,
             location_type, address, gate_code, has_wifi,
             activities, plan_details, special_event,
             leaving_house, leaving_where,
             ride_there, ride_home, ride_other_who,
             travel_details, destination, siblings_present, notes
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
           ) RETURNING *`,
          [kid, friend_name, profileId,
           visit_type||'hangout', start_date, start_time||null, end_date||null, end_time||null, return_date||null,
           location_type||null, address||null, gate_code||null, has_wifi??null,
           JSON.stringify(activities||[]), plan_details||null, special_event||null,
           leaving_house??null, leaving_where||null,
           ride_there||null, ride_home||null, ride_other_who||null,
           travel_details||null, destination||null, siblings_present||null, notes||null]
        )

        await createNotification({
          title: `${cap(kid)} wants to go to ${friend_name}'s`,
          message: `${visit_type === 'sleepover' ? 'Sleepover' : visit_type === 'weekend' ? 'Weekend stay' : visit_type === 'extended' ? 'Extended stay' : 'Hangout'} on ${start_date}`,
          source_type: 'friend_request',
          source_ref: `friend-req:${rows[0]?.id}`,
          icon: '🏠',
          link_tab: 'messages-alerts',
          target_role: 'parent',
        }).catch(() => {})

        return NextResponse.json({ request: rows[0] }, { status: 201 })
      }

      case 'respond': {
        const { id, status, parent_note, responded_by } = body
        if (!id || !status) return NextResponse.json({ error: 'id + status required' }, { status: 400 })
        if (!['approved', 'denied', 'questions'].includes(status)) {
          return NextResponse.json({ error: 'status must be approved, denied, or questions' }, { status: 400 })
        }

        const rows = await db.query(
          `UPDATE friend_requests SET status=$2, parent_note=$3, responded_by=$4, responded_at=NOW(), updated_at=NOW()
           WHERE id=$1 RETURNING *`,
          [id, status, parent_note||null, responded_by||'parent']
        )
        if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 })

        const req = rows[0]
        const kidDisplay = cap(req.kid_name)
        const msgs: Record<string, { title: string; message: string; icon: string }> = {
          approved: { title: 'Approved! 🎉', message: `You can go to ${req.friend_name}'s! Have fun!${parent_note ? ' — ' + parent_note : ''}`, icon: '✅' },
          denied: { title: 'Not this time', message: parent_note || `Your request to visit ${req.friend_name} wasn't approved.`, icon: '❌' },
          questions: { title: 'Mom/Dad has a question', message: parent_note || 'Check your messages for details.', icon: '❓' },
        }
        const msg = msgs[status]
        await createNotification({
          title: msg.title,
          message: msg.message,
          source_type: 'friend_request_response',
          source_ref: `friend-req:${id}`,
          icon: msg.icon,
          target_role: 'kid',
          kid_name: req.kid_name,
        }).catch(() => {})

        return NextResponse.json({ request: rows[0] })
      }

      case 'delete_profile': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM friend_profiles WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Friends POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
