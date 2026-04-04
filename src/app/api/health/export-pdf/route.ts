import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import {
  createPDF, addHeader, addFooter, addSectionTitle, addKeyValue,
  addTable, addMoodChart, addAdherenceGrid, pdfToUint8Array,
} from '@/lib/pdf/generate'

const KID_INFO: Record<string, { dob: string; grade: string; school: string }> = {
  amos: { dob: '2008-09-15', grade: '10th', school: 'Homeschool' },
  zoey: { dob: '2010-06-22', grade: '9th', school: 'Champion High School' },
  kaylee: { dob: '2012-03-10', grade: '7th', school: 'Boerne Middle School North' },
  ellie: { dob: '2013-11-08', grade: '6th', school: 'Homeschool' },
  wyatt: { dob: '2015-12-05', grade: '4th', school: 'Homeschool' },
  hannah: { dob: '2017-07-20', grade: '3rd', school: 'Homeschool' },
}

export async function POST(request: NextRequest) {
  try {
    const { kid_name, date_range = 30 } = await request.json()
    if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

    const kid = kid_name.toLowerCase()
    const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
    const days = Math.min(date_range, 90)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const start = startDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const info = KID_INFO[kid] || { dob: 'Unknown', grade: 'Unknown', school: 'Unknown' }
    const genDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const doc = createPDF({ title: `Health Summary — ${kidDisplay}` })

    // ── PAGE 1: Patient Summary ──
    let y = addHeader(doc, `Health Summary — ${kidDisplay}`, `Generated ${genDate}`)
    addFooter(doc, 'Confidential — Prepared for healthcare provider use')

    y = addSectionTitle(doc, 'Patient Information', y)
    y = addKeyValue(doc, 'Name', kidDisplay, y)
    y = addKeyValue(doc, 'Date of Birth', info.dob, y)
    y = addKeyValue(doc, 'Grade', info.grade, y)
    y = addKeyValue(doc, 'School', info.school, y)
    y += 3

    // Diagnoses
    const healthProfile = await db.query(
      `SELECT allergies, chronic_conditions FROM health_profiles WHERE LOWER(family_member_name) = $1 LIMIT 1`,
      [kid]
    ).catch(() => [])
    if (healthProfile[0]) {
      y = addSectionTitle(doc, 'Diagnoses & Conditions', y)
      y = addKeyValue(doc, 'Conditions', healthProfile[0].chronic_conditions || 'None recorded', y)
      y = addKeyValue(doc, 'Allergies', healthProfile[0].allergies || 'None recorded', y)
      y += 3
    }

    // Current medications
    const meds = await db.query(
      `SELECT medication_name, dosage, frequency, prescribing_doctor FROM medications
       WHERE LOWER(family_member_name) = $1 AND is_active = TRUE ORDER BY medication_name`,
      [kid]
    ).catch(() => [])
    if (meds.length > 0) {
      y = addSectionTitle(doc, 'Current Medications', y)
      y = addTable(doc, ['Medication', 'Dosage', 'Frequency', 'Prescriber'],
        meds.map((m: any) => [m.medication_name, m.dosage || '', m.frequency || '', m.prescribing_doctor || '']),
        y, [55, 35, 40, 55])
      y += 3
    }

    // Accommodations
    const accommodations = await db.query(
      `SELECT accommodation_type, source FROM kid_accommodations WHERE kid_name = $1 AND active = TRUE`,
      [kid]
    ).catch(() => [])
    if (accommodations.length > 0) {
      y = addSectionTitle(doc, 'Current Accommodations', y)
      y = addTable(doc, ['Accommodation', 'Source'],
        accommodations.map((a: any) => [a.accommodation_type.replace(/_/g, ' '), a.source || 'Parent']),
        y, [120, 65])
    }

    // ── PAGE 2: Mood & Medication ──
    doc.addPage()
    y = addHeader(doc, `Health Summary — ${kidDisplay}`, 'Mood & Medication')
    addFooter(doc, 'Confidential — Prepared for healthcare provider use')

    // Mood chart
    y = addSectionTitle(doc, `Mood Trend (${days}-Day)`, y)
    const moods = await db.query(
      `SELECT log_date as date, COALESCE(mood_score, mood) as score FROM kid_mood_log
       WHERE child_name = $1 AND log_date >= $2 ORDER BY log_date`,
      [kid, start]
    ).catch(() => [])
    const moodData = moods.map((m: any) => ({
      date: m.date?.toISOString?.()?.slice(0, 10) || String(m.date).slice(0, 10),
      score: parseInt(m.score) || 3,
    }))
    y = addMoodChart(doc, moodData, y)

    if (moodData.length > 0) {
      const avg = (moodData.reduce((s, m) => s + m.score, 0) / moodData.length).toFixed(1)
      y = addKeyValue(doc, 'Average Mood', `${avg}/5 over ${moodData.length} check-ins`, y)
      y += 3
    }

    // Med adherence
    y = addSectionTitle(doc, `Medication Adherence (${days}-Day)`, y)
    const adherence = await db.query(
      `SELECT log_date as date, status FROM medication_adherence_log
       WHERE LOWER(person_name) = $1 AND log_date >= $2 ORDER BY log_date`,
      [kid, start]
    ).catch(() => [])
    const adherenceData = adherence.map((a: any) => ({
      date: a.date?.toISOString?.()?.slice(0, 10) || String(a.date).slice(0, 10),
      taken: a.status === 'taken',
    }))
    if (adherenceData.length > 0) {
      const takenCount = adherenceData.filter(a => a.taken).length
      y = addKeyValue(doc, 'Adherence', `${Math.round((takenCount / adherenceData.length) * 100)}% (${takenCount}/${adherenceData.length} doses)`, y)
      y = addAdherenceGrid(doc, adherenceData, y)
      const missed = adherenceData.filter(a => !a.taken)
      if (missed.length > 0) {
        y = addKeyValue(doc, 'Missed Doses', missed.map(m => m.date).join(', '), y)
      }
    } else {
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('No medication adherence data for this period', 10, y)
      doc.setTextColor(0, 0, 0)
      y += 6
    }

    // ── PAGE 3: Recent Activity ──
    doc.addPage()
    y = addHeader(doc, `Health Summary — ${kidDisplay}`, 'Recent Activity')
    addFooter(doc, 'Confidential — Prepared for healthcare provider use')

    // Health requests
    const requests = await db.query(
      `SELECT category, severity, status, parent_response, resolution_notes, created_at
       FROM kid_health_requests WHERE LOWER(child_name) = $1 AND created_at >= $2 ORDER BY created_at DESC`,
      [kid, start]
    ).catch(() => [])
    if (requests.length > 0) {
      y = addSectionTitle(doc, 'Health Requests', y)
      y = addTable(doc, ['Date', 'Category', 'Severity', 'Status', 'Notes'],
        requests.map((r: any) => [
          new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          r.category || '', r.severity || '', r.status || '',
          r.resolution_notes || r.parent_response || '',
        ]),
        y, [25, 35, 30, 30, 65])
      y += 2
    }

    // Safety events
    const safety = await db.query(
      `SELECT event_type, severity, source, message_snippet, created_at
       FROM safety_events WHERE kid_name = $1 AND created_at >= $2 ORDER BY created_at DESC`,
      [kid, start]
    ).catch(() => [])
    if (safety.length > 0) {
      y = addSectionTitle(doc, 'Safety Events', y)
      y = addTable(doc, ['Date', 'Type', 'Severity', 'Source'],
        safety.map((s: any) => [
          new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          s.event_type?.replace(/_/g, ' ') || '', s.severity || '', s.source || '',
        ]),
        y, [30, 50, 35, 70])
      y += 2
    }

    // Break requests
    const breaks = await db.query(
      `SELECT COUNT(*)::int as count FROM kid_break_flags WHERE kid_name = $1 AND flagged_at >= $2`,
      [kid, start]
    ).catch(() => [])
    if (breaks[0]?.count > 0) {
      y = addKeyValue(doc, 'Break Requests', `${breaks[0].count} in ${days} days`, y)
      y += 2
    }

    // Sick days
    const sickDays = await db.query(
      `SELECT sick_date, status, parent_confirmed FROM kid_sick_days WHERE kid_name = $1 AND sick_date >= $2 ORDER BY sick_date DESC`,
      [kid, start]
    ).catch(() => [])
    if (sickDays.length > 0) {
      y = addSectionTitle(doc, 'Sick Days', y)
      y = addTable(doc, ['Date', 'Status', 'Parent Confirmed'],
        sickDays.map((s: any) => [
          new Date(s.sick_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          s.status || 'active',
          s.parent_confirmed ? 'Yes' : 'No',
        ]),
        y, [50, 65, 70])
    }

    // Behavioral observations
    const behaviors = await db.query(
      `SELECT observation_date, context, antecedent, behavior, consequence, intensity, mood_before, mood_after
       FROM behavioral_observations WHERE kid_name = $1 AND observation_date >= $2 ORDER BY observation_date DESC LIMIT 10`,
      [kid, start]
    ).catch(() => [])
    if (behaviors.length > 0) {
      if (y > 200) { doc.addPage(); y = addHeader(doc, `Health Summary — ${kidDisplay}`, 'Behavioral Observations'); addFooter(doc, 'Confidential — Prepared for healthcare provider use') }
      y = addSectionTitle(doc, 'Behavioral Observations (ABC Format)', y)
      y = addTable(doc, ['Date', 'Antecedent', 'Behavior', 'Consequence', 'Intensity'],
        behaviors.map((b: any) => [
          new Date(b.observation_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          b.antecedent || '', b.behavior || '', b.consequence || '', b.intensity || '',
        ]),
        y, [25, 40, 40, 40, 25])
    }

    // ── PAGE 4: IEP Goals + Attendance ──
    doc.addPage()
    y = addHeader(doc, `Health Summary — ${kidDisplay}`, 'Accommodations & Progress')
    addFooter(doc, 'Confidential — Prepared for healthcare provider use')

    // IEP goals
    const goals = await db.query(
      `SELECT goal_text, target_value, current_value, status FROM iep_goal_progress WHERE kid_name = $1`,
      [kid]
    ).catch(() => [])
    if (goals.length > 0) {
      y = addSectionTitle(doc, 'IEP Goal Progress', y)
      y = addTable(doc, ['Goal', 'Target', 'Current', 'Status'],
        goals.map((g: any) => [g.goal_text || '', g.target_value || '', g.current_value || '', g.status || '']),
        y, [80, 30, 30, 45])
      y += 2
    }

    // Attendance
    const attendance = await db.query(
      `SELECT COUNT(DISTINCT event_date)::int as school_days FROM kid_daily_checklist
       WHERE child_name = $1 AND event_date >= $2 AND completed = TRUE
       AND (event_id LIKE '%school%' OR event_id LIKE '%math%' OR event_id LIKE '%elar%')`,
      [kid, start]
    ).catch(() => [])
    if (attendance[0]) {
      y = addSectionTitle(doc, 'Attendance', y)
      y = addKeyValue(doc, 'School Days (Academic Tasks Completed)', `${attendance[0].school_days || 0} days in ${days}-day period`, y)
    }

    // Generate PDF
    const pdfBytes = pdfToUint8Array(doc)

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Health_Summary_${kidDisplay}_${today}.pdf"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (error) {
    console.error('Health PDF export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
