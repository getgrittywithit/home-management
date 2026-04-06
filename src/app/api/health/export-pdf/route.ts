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
    const body = await request.json()
    const { kid_name, date_range = 30, action, meeting_type } = body

    // ── ARD/IEP Packet Generator ──
    if (action === 'generate_ard_packet') {
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
      const mType = meeting_type || 'ARD'
      const mDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const info = KID_INFO[kid] || { dob: 'Unknown', grade: 'Unknown', school: 'Unknown' }

      const doc = createPDF({ title: `${kidDisplay} — ${mType} Meeting Packet`, orientation: 'portrait' })

      // Page 1: Cover + Summary
      addHeader(doc, `${kidDisplay} — ${mType} Meeting Packet`, `${info.grade} | ${info.school} | Generated: ${mDate}`)
      let y = 55

      const goals = await db.query(`SELECT * FROM iep_goals WHERE kid_name = $1 AND active = true`, [kid]).catch(() => [])
      const accoms = await db.query(`SELECT * FROM accommodations WHERE kid_name = $1 AND active = true`, [kid]).catch(() => [])
      const attendanceRows = await db.query(
        `SELECT status, COUNT(*)::int as c FROM attendance_log WHERE kid_name = $1 AND log_date >= CURRENT_DATE - INTERVAL '90 days' GROUP BY status`, [kid]
      ).catch(() => [])
      const taskComp = await db.query(
        `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE completed = TRUE)::int as done FROM kid_daily_checklist WHERE child_name = $1 AND event_date >= CURRENT_DATE - INTERVAL '30 days'`, [kid]
      ).catch(() => [])

      const attendMap: Record<string, number> = {}
      attendanceRows.forEach((r: any) => { attendMap[r.status] = r.c })
      const totalDays = Object.values(attendMap).reduce((a, b) => a + b, 0)
      const presentDays = attendMap['present'] || 0
      const attendRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      const totalTasks = taskComp[0]?.total || 0
      const doneTasks = taskComp[0]?.done || 0
      const compRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

      addSectionTitle(doc, 'Quick Summary', y); y += 12
      addKeyValue(doc, 'Active IEP Goals', `${goals.length}`, y); y += 8
      addKeyValue(doc, 'Active Accommodations', `${accoms.length}`, y); y += 8
      addKeyValue(doc, 'Attendance Rate (90d)', `${attendRate}% (${presentDays}/${totalDays})`, y); y += 8
      addKeyValue(doc, 'Task Completion (30d)', `${compRate}% (${doneTasks}/${totalTasks})`, y); y += 8
      addKeyValue(doc, 'Sick Days (90d)', `${attendMap['sick'] || 0}`, y); y += 12

      // Page 2: IEP Goals
      if (goals.length > 0) {
        doc.addPage()
        addHeader(doc, `${kidDisplay} — IEP Goals & Progress`, mType)
        y = 55
        const goalRows = goals.map((g: any) => [g.goal_area || 'General', (g.goal_text || '').slice(0, 60), g.target || '', g.current_progress || '', g.status || 'active'])
        y = addTable(doc, ['Area', 'Goal', 'Target', 'Progress', 'Status'], goalRows, y, [25, 65, 25, 30, 25])
      }

      // Page 3: Accommodations
      if (accoms.length > 0) {
        doc.addPage()
        addHeader(doc, `${kidDisplay} — Active Accommodations`, mType)
        y = 55
        const accomRows = accoms.map((a: any) => [a.accommodation_type || 'General', (a.description || '').slice(0, 80), a.setting || 'All'])
        y = addTable(doc, ['Type', 'Description', 'Setting'], accomRows, y, [35, 100, 35])
      }

      // Page 4: Behavioral & Emotional
      doc.addPage()
      addHeader(doc, `${kidDisplay} — Behavioral & Emotional`, mType)
      y = 55

      const behaviors = await db.query(
        `SELECT behavior_type, COUNT(*)::int as c FROM behavior_logs WHERE kid_name = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY behavior_type ORDER BY c DESC`, [kid]
      ).catch(() => [])
      if (behaviors.length > 0) {
        addSectionTitle(doc, 'Behavior Summary (30 Days)', y); y += 12
        y = addTable(doc, ['Behavior Type', 'Count'], behaviors.map((b: any) => [b.behavior_type, `${b.c}`]), y, [100, 40])
        y += 8
      }

      const moods = await db.query(
        `SELECT AVG(COALESCE(mood_score, mood))::numeric(3,1) as avg_mood, COUNT(*)::int as entries FROM kid_mood_log WHERE child_name = $1 AND log_date >= CURRENT_DATE - INTERVAL '30 days'`, [kid]
      ).catch(() => [])
      if (moods[0]?.entries > 0) {
        addSectionTitle(doc, 'Mood (30 Days)', y); y += 12
        addKeyValue(doc, 'Average Mood', `${moods[0].avg_mood}/5 (${moods[0].entries} entries)`, y); y += 10
      }

      const breaks = await db.query(`SELECT COUNT(*)::int as c FROM kid_break_flags WHERE kid_name = $1 AND flagged_at >= CURRENT_DATE - INTERVAL '30 days'`, [kid]).catch(() => [])
      addKeyValue(doc, 'Break Requests (30d)', `${breaks[0]?.c || 0}`, y); y += 10

      const regTools = await db.query(
        `SELECT strategy_name, times_used, times_helped, effectiveness_score FROM kid_regulation_profiles WHERE kid_name = $1 AND times_used > 0 ORDER BY effectiveness_score DESC`, [kid]
      ).catch(() => [])
      if (regTools.length > 0) {
        addSectionTitle(doc, 'Regulation Strategies Used', y); y += 12
        y = addTable(doc, ['Strategy', 'Used', 'Helped', 'Effect.'], regTools.map((r: any) => [r.strategy_name, `${r.times_used}`, `${r.times_helped}`, `${Math.round((r.effectiveness_score || 0) * 100)}%`]), y, [70, 25, 25, 30])
      }

      // Page 5: Attendance & Academic
      doc.addPage()
      addHeader(doc, `${kidDisplay} — Attendance & Academic`, mType)
      y = 55
      addSectionTitle(doc, 'Attendance (90 Days)', y); y += 12
      for (const s of ['present', 'absent', 'tardy', 'sick', 'excused']) {
        addKeyValue(doc, s.charAt(0).toUpperCase() + s.slice(1), `${attendMap[s] || 0} days`, y); y += 8
      }
      y += 5
      const benchmarks = await db.query(`SELECT subject, score, assessment_date, notes FROM benchmarks WHERE kid_name = $1 ORDER BY assessment_date DESC LIMIT 10`, [kid]).catch(() => [])
      if (benchmarks.length > 0) {
        addSectionTitle(doc, 'Academic Benchmarks', y); y += 12
        y = addTable(doc, ['Subject', 'Score', 'Date', 'Notes'], benchmarks.map((b: any) => [b.subject || '', `${b.score || ''}`, b.assessment_date?.toString()?.slice(0, 10) || '', (b.notes || '').slice(0, 40)]), y, [35, 25, 30, 80])
      }

      // Footers
      const pages = doc.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        addFooter(doc, `Family Ops \u2022 Confidential \u2022 Page ${i}/${pages}`)
      }

      const pdfBytes = pdfToUint8Array(doc)
      return new NextResponse(pdfBytes as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${kidDisplay}-${mType}-Packet.pdf"`,
          'Content-Length': String(pdfBytes.length),
        },
      })
    }

    // ── Standard Provider Report ──
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

    // ── PAGE 5 (conditional): Cycle Health ──
    const cycleSettings = await db.query(
      `SELECT * FROM kid_cycle_settings WHERE kid_name = $1 AND mode = 'full' AND onboarded = TRUE`,
      [kid]
    ).catch(() => [])

    if (cycleSettings.length > 0) {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const cycleStart = sixMonthsAgo.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      const cycleLogs = await db.query(
        `SELECT event_type, event_date FROM kid_cycle_log WHERE kid_name = $1 AND event_date >= $2 ORDER BY event_date ASC`,
        [kid, cycleStart]
      ).catch(() => [])
      const cycleSymptoms = await db.query(
        `SELECT log_date, mood, cramps, flow, notes, irregularities FROM kid_cycle_symptoms
         WHERE kid_name = $1 AND log_date >= $2 ORDER BY log_date ASC`,
        [kid, cycleStart]
      ).catch(() => [])
      const cycleProducts = await db.query(
        `SELECT product_type, SUM(quantity)::int as total FROM kid_cycle_products
         WHERE kid_name = $1 AND log_date >= $2 GROUP BY product_type ORDER BY total DESC`,
        [kid, cycleStart]
      ).catch(() => [])
      const cycleOtc = await db.query(
        `SELECT medication, COUNT(*)::int as count, COUNT(*) FILTER (WHERE helped = TRUE)::int as helped_count
         FROM kid_cycle_otc_meds WHERE kid_name = $1 AND log_date >= $2
         GROUP BY medication ORDER BY count DESC`,
        [kid, cycleStart]
      ).catch(() => [])

      doc.addPage()
      y = addHeader(doc, `Health Summary — ${kidDisplay}`, 'Cycle Health')
      addFooter(doc, 'Confidential — Prepared for healthcare provider use')

      const cs = cycleSettings[0]
      y = addSectionTitle(doc, 'Cycle Overview', y)
      y = addKeyValue(doc, 'Regularity', cs.cycle_regularity || 'Unknown', y)
      y = addKeyValue(doc, 'Avg Cycle Length', `${cs.avg_cycle_length || '?'} days`, y)
      y = addKeyValue(doc, 'Avg Period Duration', `${cs.avg_period_duration || '?'} days`, y)
      if (cs.common_symptoms?.length) {
        y = addKeyValue(doc, 'Common Symptoms', cs.common_symptoms.join(', '), y)
      }
      y += 3

      // Cycle history table
      const starts = cycleLogs.filter((l: any) => l.event_type === 'start')
      const ends = cycleLogs.filter((l: any) => l.event_type === 'end')
      if (starts.length > 0) {
        const toStr = (d: any) => {
          if (!d) return ''
          if (typeof d === 'string') return d.slice(0, 10)
          try { return new Date(d).toISOString().slice(0, 10) } catch { return '' }
        }
        y = addSectionTitle(doc, 'Cycle History (Last 6 Months)', y)
        const cycleRows = starts.map((s: any, i: number) => {
          const sd = toStr(s.event_date)
          const matchEnd = ends.find((e: any) => toStr(e.event_date) >= sd)
          const ed = matchEnd ? toStr(matchEnd.event_date) : 'Ongoing'
          const dur = matchEnd ? Math.round((new Date(toStr(matchEnd.event_date) + 'T12:00:00').getTime() - new Date(sd + 'T12:00:00').getTime()) / 86400000) + 1 : '-'
          let cycLen = '-'
          if (i > 0) {
            const prevStart = toStr(starts[i-1].event_date)
            cycLen = String(Math.round((new Date(sd + 'T12:00:00').getTime() - new Date(prevStart + 'T12:00:00').getTime()) / 86400000))
          }
          return [sd, ed === 'Ongoing' ? 'Ongoing' : ed, String(dur), cycLen]
        })
        y = addTable(doc, ['Start', 'End', 'Duration', 'Cycle Length'], cycleRows, y, [40, 40, 35, 40])
        y += 3
      }

      // Symptom patterns
      if (cycleSymptoms.length > 0) {
        y = addSectionTitle(doc, 'Symptom Patterns', y)
        const moodCounts: Record<string, number> = {}
        let crampTotal = 0, crampCount = 0
        cycleSymptoms.forEach((s: any) => {
          if (s.mood) moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1
          if (s.cramps != null) { crampTotal += s.cramps; crampCount++ }
        })
        const topMoods = Object.entries(moodCounts).sort(([,a],[,b]) => b - a).slice(0, 3).map(([m,c]) => `${m} (${c}x)`).join(', ')
        y = addKeyValue(doc, 'Most Common Moods', topMoods || 'None logged', y)
        y = addKeyValue(doc, 'Avg Cramp Severity', crampCount > 0 ? `${(crampTotal / crampCount).toFixed(1)}/3` : 'N/A', y)

        const allIrr: Record<string, number> = {}
        cycleSymptoms.forEach((s: any) => { (s.irregularities || []).forEach((ir: string) => { allIrr[ir] = (allIrr[ir] || 0) + 1 }) })
        const irrText = Object.entries(allIrr).map(([k,v]) => `${k} (${v}x)`).join(', ')
        if (irrText) y = addKeyValue(doc, 'Irregularities', irrText, y)
        y += 3
      }

      // Product usage summary
      if (cycleProducts.length > 0) {
        const productLabels: Record<string, string> = {
          pad_regular: 'Regular Pad', pad_overnight: 'Overnight Pad', pad_thin: 'Thin Pad',
          liner: 'Liner', heating_pad: 'Heating Pad', epsom_bath: 'Epsom Bath',
          tampon_regular: 'Tampon', heat_patch: 'Heat Patch', gel_cream: 'Gel/Cream',
        }
        y = addSectionTitle(doc, 'Product Usage (6-Month Totals)', y)
        y = addTable(doc, ['Product', 'Total Used'],
          cycleProducts.map((p: any) => [productLabels[p.product_type] || p.product_type, String(p.total)]),
          y, [120, 65])
        y += 3
      }

      // OTC medication summary
      if (cycleOtc.length > 0) {
        y = addSectionTitle(doc, 'OTC Medications (6-Month Totals)', y)
        y = addTable(doc, ['Medication', 'Doses', 'Helped'],
          cycleOtc.map((m: any) => [
            m.medication.charAt(0).toUpperCase() + m.medication.slice(1),
            String(m.count),
            m.count > 0 ? `${Math.round((m.helped_count / m.count) * 100)}%` : 'N/A',
          ]),
          y, [80, 50, 55])
      }
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
