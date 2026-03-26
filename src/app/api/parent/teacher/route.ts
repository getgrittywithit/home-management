import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const HOMESCHOOL = ['amos', 'ellie', 'wyatt', 'hannah']
const PUBLIC_SCHOOL = ['zoey', 'kaylee']
const ALL_KIDS = [...HOMESCHOOL, ...PUBLIC_SCHOOL]
const FULL_NAMES: Record<string, string> = { zoey: 'Zoey Moses', kaylee: 'Kaylee Moses' }
const MAKEUP_SUBJECTS = ['Math', 'ELAR/Writing', 'Science/SS', 'Reading']

function getToday(): string { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) }

function generateExcuseLetter(kid: string, date: string, symptoms: string, doctorVisit: boolean, contact: any): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const sickDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const fullName = FULL_NAMES[kid] || kid
  const contactName = contact?.attendance_contact || 'Attendance Office'
  const schoolName = contact?.school_name || 'School'
  return `${today}\n\n${schoolName}\nAttention: ${contactName}\n\nDear ${contactName},\n\nThis letter is to notify you that ${fullName} was absent from school on ${sickDate} due to illness. She experienced ${symptoms || 'illness'} and was not well enough to attend.\n\n${doctorVisit ? 'She was seen by a healthcare provider during this illness.\n\n' : ''}Please excuse this absence. If you need any additional information, please don't hesitate to contact me.\n\nSincerely,\nLola Moses\nParent of ${fullName.split(' ')[0]}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const kid = searchParams.get('kid')?.toLowerCase()

    if (action === 'get_overview') {
      const [attendRes, makeupRes, sickRes] = await Promise.all([
        db.query(`SELECT kid_name, status, COUNT(*)::int as cnt FROM kid_attendance WHERE attendance_date >= '2025-08-01' GROUP BY kid_name, status`).catch(() => []),
        db.query(`SELECT id, kid_name, subject, sick_date, due_date, status FROM kid_makeup_work WHERE status = 'assigned' ORDER BY due_date`).catch(() => []),
        db.query(`SELECT kid_name, sick_date, reason, severity FROM kid_sick_days WHERE sick_date >= CURRENT_DATE - INTERVAL '14 days' ORDER BY sick_date DESC`).catch(() => []),
      ])

      // Build attendance map
      const attendance: Record<string, any> = {}
      ALL_KIDS.forEach(k => { attendance[k] = { present: 0, absent: 0, sick: 0, excused: 0, total: 0, pct: 0 } })
      ;(attendRes as any[]).forEach((r: any) => {
        if (attendance[r.kid_name]) { attendance[r.kid_name][r.status] = r.cnt; attendance[r.kid_name].total += r.cnt }
      })
      ALL_KIDS.forEach(k => { const a = attendance[k]; a.pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0 })

      // Sick day patterns
      const flaggedPatterns: string[] = []
      const sickCounts: Record<string, number> = {}
      ;(sickRes as any[]).forEach((r: any) => { sickCounts[r.kid_name] = (sickCounts[r.kid_name] || 0) + 1 })
      Object.entries(sickCounts).forEach(([k, c]) => { if (c > 2) flaggedPatterns.push(`${k.charAt(0).toUpperCase() + k.slice(1)} has ${c} sick days in the last 14 days`) })

      return NextResponse.json({ attendance, openMakeupWork: makeupRes, recentSickDays: sickRes, flaggedPatterns })
    }

    if (action === 'get_kid_records') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      const [attendRes, subjectRes, makeupRes, lifeRes, sickRes] = await Promise.all([
        db.query(`SELECT attendance_date, status, notes, source FROM kid_attendance WHERE kid_name = $1 ORDER BY attendance_date DESC LIMIT 60`, [kid]).catch(() => []),
        db.query(`SELECT subject, current_level, notes, last_assessment FROM kid_subject_progress WHERE kid_name = $1`, [kid]).catch(() => []),
        db.query(`SELECT id, subject, sick_date, due_date, status, completed_date FROM kid_makeup_work WHERE kid_name = $1 ORDER BY due_date DESC`, [kid]).catch(() => []),
        db.query(`SELECT id, skill, category, date_achieved, notes FROM kid_life_skills_log WHERE kid_name = $1 ORDER BY date_achieved DESC LIMIT 20`, [kid]).catch(() => []),
        db.query(`SELECT id, sick_date, reason, severity, saw_doctor, notes FROM kid_sick_days WHERE kid_name = $1 ORDER BY sick_date DESC LIMIT 30`, [kid]).catch(() => []),
      ])
      return NextResponse.json({ attendance: attendRes, subjects: subjectRes, makeupWork: makeupRes, lifeSkills: lifeRes, sickDays: sickRes })
    }

    if (action === 'get_excuse_letters') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      const [letters, contact] = await Promise.all([
        db.query(`SELECT id, sick_date, letter_body, status, sent_date FROM kid_excuse_letters WHERE kid_name = $1 ORDER BY sick_date DESC`, [kid]).catch(() => []),
        db.query(`SELECT * FROM kid_school_contacts WHERE kid_name = $1`, [kid]).catch(() => []),
      ])
      return NextResponse.json({ letters, contact: (contact as any[])[0] || null })
    }

    if (action === 'get_transcript') {
      if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
      const [attendRes, subjectRes, booksRes, lifeRes] = await Promise.all([
        db.query(`SELECT status, COUNT(*)::int as cnt FROM kid_attendance WHERE kid_name = $1 AND attendance_date >= '2025-08-01' GROUP BY status`, [kid]).catch(() => []),
        db.query(`SELECT subject, current_level, notes FROM kid_subject_progress WHERE kid_name = $1`, [kid]).catch(() => []),
        db.query(`SELECT book_title, date_completed FROM kid_reading_log WHERE kid_name = $1 AND status = 'completed' ORDER BY date_completed DESC`, [kid]).catch(() => []),
        db.query(`SELECT skill, date_achieved FROM kid_life_skills_log WHERE kid_name = $1 ORDER BY date_achieved DESC LIMIT 20`, [kid]).catch(() => []),
      ])
      const att: Record<string, number> = {}
      ;(attendRes as any[]).forEach((r: any) => { att[r.status] = r.cnt })
      return NextResponse.json({ attendance: att, subjects: subjectRes, books: booksRes, lifeSkills: lifeRes })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Teacher GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'log_sick_day': {
        const { kid_name, sick_date, symptoms, severity, doctor_visit, notes } = body
        if (!kid_name || !sick_date) return NextResponse.json({ error: 'kid_name, sick_date required' }, { status: 400 })
        const kid = kid_name.toLowerCase()
        const sickDateStr = sick_date

        // 1. Insert sick day (using existing table columns: reason, severity, saw_doctor)
        await db.query(
          `INSERT INTO kid_sick_days (kid_name, sick_date, reason, severity, notes, saw_doctor) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (kid_name, sick_date) DO UPDATE SET reason = $3, severity = $4, notes = $5, saw_doctor = $6`,
          [kid, sickDateStr, symptoms || 'Not feeling well', severity || 'Mild', notes || null, doctor_visit || false]
        )

        // 2. Log attendance
        await db.query(
          `INSERT INTO kid_attendance (kid_name, attendance_date, status, source, notes) VALUES ($1, $2, 'sick', 'sick_log', $3)
           ON CONFLICT (kid_name, attendance_date) DO UPDATE SET status = 'sick', source = 'sick_log', notes = $3`,
          [kid, sickDateStr, symptoms || null]
        )

        let makeupCreated = 0
        let excuseLetterCreated = false

        // 3. Homeschool: create make-up work
        if (HOMESCHOOL.includes(kid)) {
          const dueDate = new Date(new Date(sickDateStr + 'T12:00:00').getTime() + 3 * 86400000).toLocaleDateString('en-CA')
          for (const subject of MAKEUP_SUBJECTS) {
            try {
              await db.query(
                `INSERT INTO kid_makeup_work (kid_name, sick_date, subject, due_date) VALUES ($1, $2, $3, $4)`,
                [kid, sickDateStr, subject, dueDate]
              )
              makeupCreated++
            } catch { /* duplicate, skip */ }
          }
        }

        // 4. Public school: create excuse letter draft
        if (PUBLIC_SCHOOL.includes(kid)) {
          try {
            const contactRes = await db.query(`SELECT * FROM kid_school_contacts WHERE kid_name = $1`, [kid])
            const contact = contactRes[0] || null
            const letter = generateExcuseLetter(kid, sickDateStr, symptoms || '', doctor_visit || false, contact)
            await db.query(
              `INSERT INTO kid_excuse_letters (kid_name, sick_date, letter_body, school_name, school_email) VALUES ($1, $2, $3, $4, $5)`,
              [kid, sickDateStr, letter, contact?.school_name || null, contact?.school_email || null]
            )
            excuseLetterCreated = true
          } catch { /* silent */ }
        }

        return NextResponse.json({ success: true, attendance_logged: true, makeup_created: makeupCreated, excuse_letter_created: excuseLetterCreated })
      }

      case 'delete_sick_day': {
        const { id, kid_name, sick_date } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        // Get info before deleting
        const info = await db.query(`SELECT kid_name, sick_date FROM kid_sick_days WHERE id = $1`, [id])
        if (info.length > 0) {
          const k = info[0].kid_name
          const d = info[0].sick_date
          await db.query(`DELETE FROM kid_sick_days WHERE id = $1`, [id])
          await db.query(`DELETE FROM kid_attendance WHERE kid_name = $1 AND attendance_date = $2 AND source = 'sick_log'`, [k, d])
          await db.query(`DELETE FROM kid_makeup_work WHERE kid_name = $1 AND sick_date = $2`, [k, d])
        }
        return NextResponse.json({ success: true })
      }

      case 'update_makeup_work': {
        const { id, status, completed_date } = body
        if (!id || !status) return NextResponse.json({ error: 'id, status required' }, { status: 400 })
        await db.query(
          `UPDATE kid_makeup_work SET status = $2, completed_date = $3 WHERE id = $1`,
          [id, status, status === 'completed' ? (completed_date || getToday()) : null]
        )
        return NextResponse.json({ success: true })
      }

      case 'save_subject_progress': {
        const { kid_name, subject, current_level, notes, last_assessment } = body
        if (!kid_name || !subject) return NextResponse.json({ error: 'kid_name, subject required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_subject_progress (kid_name, subject, current_level, notes, last_assessment, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (kid_name, subject) DO UPDATE SET current_level = $3, notes = $4, last_assessment = $5, updated_at = NOW()`,
          [kid_name.toLowerCase(), subject, current_level || null, notes || null, last_assessment || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'add_life_skill': {
        const { kid_name, skill, category, date_achieved } = body
        if (!kid_name || !skill) return NextResponse.json({ error: 'kid_name, skill required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_life_skills_log (kid_name, skill, category, date_achieved) VALUES ($1, $2, $3, $4)`,
          [kid_name.toLowerCase(), skill, category || 'Life Skills', date_achieved || getToday()]
        )
        return NextResponse.json({ success: true })
      }

      case 'delete_life_skill': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM kid_life_skills_log WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'update_excuse_letter': {
        const { id, letter_body, status, sent_date } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE kid_excuse_letters SET letter_body = COALESCE($2, letter_body), status = COALESCE($3, status), sent_date = $4, updated_at = NOW() WHERE id = $1`,
          [id, letter_body || null, status || null, sent_date || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'save_school_contact': {
        const { kid_name, school_name, school_email, attendance_contact, teacher_name, teacher_email } = body
        if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_school_contacts (kid_name, school_name, school_email, attendance_contact, teacher_name, teacher_email, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (kid_name) DO UPDATE SET school_name = $2, school_email = $3, attendance_contact = $4, teacher_name = $5, teacher_email = $6, updated_at = NOW()`,
          [kid_name.toLowerCase(), school_name || null, school_email || null, attendance_contact || null, teacher_name || null, teacher_email || null]
        )
        return NextResponse.json({ success: true })
      }

      case 'log_attendance': {
        const { kid_name, attendance_date, status, notes } = body
        if (!kid_name || !attendance_date || !status) return NextResponse.json({ error: 'kid_name, date, status required' }, { status: 400 })
        await db.query(
          `INSERT INTO kid_attendance (kid_name, attendance_date, status, source, notes) VALUES ($1, $2, $3, 'manual', $4)
           ON CONFLICT (kid_name, attendance_date) DO UPDATE SET status = $3, notes = $4`,
          [kid_name.toLowerCase(), attendance_date, status, notes || null]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Teacher POST error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
