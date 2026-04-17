import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import {
  createPDF, addHeader, addFooter, addSectionTitle, addKeyValue, addTable,
  addMoodChart, pdfToUint8Array,
} from '@/lib/pdf/generate'

async function aggregatePacketData(kidName: string, startDate: string, endDate: string) {
  const kid = kidName.toLowerCase()

  // 1. IEP Goals
  const goals = await db.query(
    `SELECT * FROM iep_goal_progress WHERE kid_name = $1 ORDER BY created_at`,
    [kid]
  ).catch(() => [])

  // 2. Attendance
  const attendance = await db.query(
    `SELECT * FROM kid_attendance WHERE kid_name = $1 AND attendance_date BETWEEN $2 AND $3 ORDER BY attendance_date`,
    [kid, startDate, endDate]
  ).catch(() => [])
  const sickDays = await db.query(
    `SELECT flagged_at::date AS date, note FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date BETWEEN $2 AND $3`,
    [kid, startDate, endDate]
  ).catch(() => [])

  // 3. Academic Progress
  const elarProgress = await db.query(
    `SELECT skill_id, skill_name, current_mastery, questions_attempted, questions_correct FROM kid_elar_progress WHERE kid_name = $1`,
    [kid]
  ).catch(() => [])
  const mathProgress = await db.query(
    `SELECT skill_id, skill_name, current_mastery, questions_attempted, questions_correct FROM kid_math_progress WHERE kid_name = $1`,
    [kid]
  ).catch(() => [])
  const scienceProgress = await db.query(
    `SELECT skill_id, skill_name, current_mastery FROM kid_science_progress WHERE kid_name = $1`,
    [kid]
  ).catch(() => [])

  // 4. Behavioral & Emotional
  const moods = await db.query(
    `SELECT log_date, mood_score, mood, energy, focus, anxiety FROM kid_mood_log WHERE child_name = $1 AND log_date BETWEEN $2 AND $3 ORDER BY log_date`,
    [kid, startDate, endDate]
  ).catch(() => [])
  const behaviorEvents = await db.query(
    `SELECT * FROM behavior_events WHERE reporter_kid = $1 AND created_at::date BETWEEN $2 AND $3 ORDER BY created_at`,
    [kid, startDate, endDate]
  ).catch(() => [])
  const breakFlags = await db.query(
    `SELECT * FROM kid_break_flags WHERE kid_name = $1 AND flagged_at::date BETWEEN $2 AND $3`,
    [kid, startDate, endDate]
  ).catch(() => [])

  // 5. Health & Medications
  const medications = await db.query(
    `SELECT * FROM active_medications WHERE LOWER(family_member_name) = $1 AND is_active = TRUE`,
    [kid]
  ).catch(() => [])
  const medAdherence = await db.query(
    `SELECT * FROM med_adherence_log WHERE kid_name = $1 AND log_date BETWEEN $2 AND $3`,
    [kid, startDate, endDate]
  ).catch(() => [])
  const providers = await db.query(
    `SELECT * FROM health_providers WHERE kid_name = $1`,
    [kid]
  ).catch(() => [])

  // 6. Accommodations
  const accommodations = await db.query(
    `SELECT * FROM kid_accommodations WHERE kid_name = $1 AND active = TRUE`,
    [kid]
  ).catch(() => [])
  const accPlans = await db.query(
    `SELECT * FROM accommodation_plans WHERE kid_name = $1 ORDER BY created_at DESC LIMIT 1`,
    [kid]
  ).catch(() => [])

  // Compute attendance stats
  const present = attendance.filter((a: any) => a.status === 'present').length
  const absent = attendance.filter((a: any) => a.status === 'absent').length
  const totalDays = present + absent || 1
  const attendanceRate = Math.round((present / totalDays) * 100)

  // Compute avg mood
  const moodScores = moods.filter((m: any) => m.mood_score != null).map((m: any) => Number(m.mood_score))
  const avgMood = moodScores.length > 0 ? (moodScores.reduce((a: number, b: number) => a + b, 0) / moodScores.length).toFixed(1) : null

  return {
    iep_goals: goals,
    attendance: { total: totalDays, present, absent, sick_days: sickDays.length, rate: attendanceRate, details: attendance, sick_detail: sickDays },
    academics: {
      elar: elarProgress,
      math: mathProgress,
      science: scienceProgress,
      elar_mastered: elarProgress.filter((s: any) => s.current_mastery >= 80).length,
      elar_total: elarProgress.length,
      math_mastered: mathProgress.filter((s: any) => s.current_mastery >= 80).length,
      math_total: mathProgress.length,
    },
    behavioral: {
      moods, avg_mood: avgMood,
      behavior_events: behaviorEvents,
      break_count: breakFlags.length,
      mood_chart_data: moods.map((m: any) => ({ date: m.log_date, score: Number(m.mood_score) || 3 })),
    },
    health: { medications, med_adherence: medAdherence, providers },
    accommodations: { active: accommodations, plan: accPlans[0] || null },
  }
}

function generatePacketPDF(kidName: string, data: any, meta: any): Uint8Array {
  const doc = createPDF({ title: 'ARD/IEP Packet', orientation: 'portrait' })
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const pageW = doc.internal.pageSize.getWidth()

  // ── Page 1: Cover ──
  let y = 40
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 184, 166)
  doc.text('Coral — The Family Ecosystem', pageW / 2, y, { align: 'center' })
  y += 15
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text('ARD/IEP Meeting Documentation', pageW / 2, y, { align: 'center' })
  y += 20
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const coverFields = [
    ['Student', cap(kidName)],
    ['Plan Type', meta.meeting_type ? cap(meta.meeting_type) : 'IEP/504'],
    ['Meeting Date', meta.meeting_date || 'TBD'],
    ['Report Period', `${meta.date_range_start} to ${meta.date_range_end}`],
    ['Prepared by', 'Lola Moses (Parent)'],
    ['Contact', 'mosesfamily2008@gmail.com'],
  ]
  for (const [k, v] of coverFields) {
    y = addKeyValue(doc, k, v, y)
  }
  addFooter(doc, `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — CONFIDENTIAL`)

  // ── Page 2: IEP Goals ──
  doc.addPage()
  y = addHeader(doc, 'IEP Goals & Progress', cap(kidName))
  if (data.iep_goals.length > 0) {
    const goalRows = data.iep_goals.map((g: any) => [
      g.goal_text || '', g.status || 'in_progress', `${g.current_value || 0}/${g.target_value || 100}`,
    ])
    y = addTable(doc, ['Goal', 'Status', 'Progress'], goalRows, y + 4)
  } else {
    doc.setFontSize(10)
    doc.text('No IEP goals recorded in the system for this period.', 10, y + 6)
    y += 12
  }
  addFooter(doc, 'Page 2 — IEP Goals')

  // ── Page 3: Attendance ──
  doc.addPage()
  y = addHeader(doc, 'Attendance Summary', cap(kidName))
  y = addKeyValue(doc, 'Attendance Rate', `${data.attendance.rate}%`, y + 4)
  y = addKeyValue(doc, 'Days Present', String(data.attendance.present), y)
  y = addKeyValue(doc, 'Days Absent', String(data.attendance.absent), y)
  y = addKeyValue(doc, 'Sick Days', String(data.attendance.sick_days), y)
  if (data.attendance.sick_detail.length > 0) {
    y = addSectionTitle(doc, 'Sick Day Details', y + 4)
    const sickRows = data.attendance.sick_detail.map((s: any) => [s.date || '', s.note || ''])
    y = addTable(doc, ['Date', 'Note'], sickRows, y)
  }
  addFooter(doc, 'Page 3 — Attendance')

  // ── Page 4: Academic Progress ──
  doc.addPage()
  y = addHeader(doc, 'Academic Progress', cap(kidName))
  y = addSectionTitle(doc, 'ELAR', y + 4, '📖')
  y = addKeyValue(doc, 'Skills Mastered', `${data.academics.elar_mastered}/${data.academics.elar_total}`, y)
  if (data.academics.elar.length > 0) {
    const elarRows = data.academics.elar.map((s: any) => [s.skill_name || s.skill_id, `${s.current_mastery || 0}%`, `${s.questions_correct || 0}/${s.questions_attempted || 0}`])
    y = addTable(doc, ['Skill', 'Mastery', 'Correct/Attempted'], elarRows, y)
  }
  y = addSectionTitle(doc, 'Math', y + 4, '🔢')
  y = addKeyValue(doc, 'Skills Mastered', `${data.academics.math_mastered}/${data.academics.math_total}`, y)
  if (data.academics.math.length > 0) {
    const mathRows = data.academics.math.map((s: any) => [s.skill_name || s.skill_id, `${s.current_mastery || 0}%`, `${s.questions_correct || 0}/${s.questions_attempted || 0}`])
    y = addTable(doc, ['Skill', 'Mastery', 'Correct/Attempted'], mathRows, y)
  }
  addFooter(doc, 'Page 4 — Academics')

  // ── Page 5: Behavioral & Emotional ──
  doc.addPage()
  y = addHeader(doc, 'Behavioral & Emotional', cap(kidName))
  if (data.behavioral.avg_mood) {
    y = addKeyValue(doc, 'Average Mood Score', `${data.behavioral.avg_mood}/5`, y + 4)
  }
  y = addKeyValue(doc, 'Break Requests', String(data.behavioral.break_count), y)
  y = addKeyValue(doc, 'Behavior Incidents', String(data.behavioral.behavior_events.length), y)
  if (data.behavioral.mood_chart_data.length > 0) {
    y = addSectionTitle(doc, 'Mood Trend', y + 4)
    y = addMoodChart(doc, data.behavioral.mood_chart_data, y)
  }
  addFooter(doc, 'Page 5 — Behavioral')

  // ── Page 6: Health & Medications ──
  doc.addPage()
  y = addHeader(doc, 'Health & Medications', cap(kidName))
  if (data.health.medications.length > 0) {
    y = addSectionTitle(doc, 'Current Medications', y + 4, '💊')
    const medRows = data.health.medications.map((m: any) => [m.medication_name || '', m.dosage || '', m.frequency || '', m.purpose || ''])
    y = addTable(doc, ['Medication', 'Dose', 'Frequency', 'Purpose'], medRows, y)
  }
  if (data.health.providers.length > 0) {
    y = addSectionTitle(doc, 'Providers', y + 4)
    const provRows = data.health.providers.map((p: any) => [p.provider_name || p.name || '', p.specialty || '', p.phone || ''])
    y = addTable(doc, ['Provider', 'Specialty', 'Phone'], provRows, y)
  }
  addFooter(doc, 'Page 6 — Health')

  // ── Page 7: Accommodations ──
  doc.addPage()
  y = addHeader(doc, 'Accommodations & Supports', cap(kidName))
  if (data.accommodations.active.length > 0) {
    const accRows = data.accommodations.active.map((a: any) => [
      a.accommodation_type || a.accommodation_text || '', a.source || '', a.active ? 'Active' : 'Inactive',
    ])
    y = addTable(doc, ['Accommodation', 'Source', 'Status'], accRows, y + 4)
  } else {
    doc.setFontSize(10)
    doc.text('No accommodations recorded for this period.', 10, y + 6)
  }
  addFooter(doc, 'Page 7 — Accommodations')

  // ── Page 8: Parent Notes ──
  doc.addPage()
  y = addHeader(doc, 'Parent Observations & Requests', cap(kidName))
  if (meta.parent_notes) {
    y = addSectionTitle(doc, 'Observations', y + 4)
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(meta.parent_notes, pageW - 20)
    doc.text(lines, 10, y)
    y += lines.length * 4.5 + 4
  }
  if (meta.concerns?.length > 0) {
    y = addSectionTitle(doc, 'Concerns', y + 4, '⚠️')
    for (const c of meta.concerns) {
      doc.setFontSize(9)
      doc.text(`• ${c}`, 12, y)
      y += 5
    }
  }
  if (meta.requested_changes?.length > 0) {
    y = addSectionTitle(doc, 'Requested Changes', y + 4)
    for (const r of meta.requested_changes) {
      doc.setFontSize(9)
      doc.text(`• ${r}`, 12, y)
      y += 5
    }
  }
  addFooter(doc, 'Page 8 — Parent Notes')

  return pdfToUint8Array(doc)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'list_packets') {
      const kidName = searchParams.get('kid_name')
      let sql = `SELECT id, kid_name, meeting_date, meeting_type, date_range_start, date_range_end, status, created_at FROM ard_packets`
      const params: any[] = []
      if (kidName) { params.push(kidName.toLowerCase()); sql += ` WHERE kid_name = $1` }
      sql += ` ORDER BY created_at DESC LIMIT 20`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ packets: rows })
    }

    if (action === 'get_packet') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const rows = await db.query(`SELECT * FROM ard_packets WHERE id = $1`, [id])
      return NextResponse.json({ packet: rows[0] || null })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('ARD GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'generate_packet') {
      const { kid_name, date_range_start, date_range_end } = body
      if (!kid_name || !date_range_start || !date_range_end) {
        return NextResponse.json({ error: 'kid_name + date_range_start + date_range_end required' }, { status: 400 })
      }
      const data = await aggregatePacketData(kid_name, date_range_start, date_range_end)
      return NextResponse.json({ data })
    }

    if (action === 'save_packet') {
      const { kid_name, meeting_date, meeting_type, date_range_start, date_range_end, packet_data, parent_notes, concerns, requested_changes, id } = body
      if (!kid_name || !date_range_start || !date_range_end) {
        return NextResponse.json({ error: 'kid_name + date range required' }, { status: 400 })
      }

      if (id) {
        const rows = await db.query(
          `UPDATE ard_packets SET meeting_date=$2, meeting_type=$3, packet_data=$4, parent_notes=$5, concerns=$6, requested_changes=$7, updated_at=NOW()
           WHERE id=$1 RETURNING *`,
          [id, meeting_date || null, meeting_type || null, JSON.stringify(packet_data || {}), parent_notes || null, concerns || null, requested_changes || null]
        )
        return NextResponse.json({ packet: rows[0] })
      }

      const rows = await db.query(
        `INSERT INTO ard_packets (kid_name, meeting_date, meeting_type, date_range_start, date_range_end, packet_data, parent_notes, concerns, requested_changes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [kid_name.toLowerCase(), meeting_date || null, meeting_type || null, date_range_start, date_range_end,
         JSON.stringify(packet_data || {}), parent_notes || null, concerns || null, requested_changes || null]
      )
      return NextResponse.json({ packet: rows[0] }, { status: 201 })
    }

    if (action === 'export_pdf') {
      const { kid_name, date_range_start, date_range_end, meeting_date, meeting_type, parent_notes, concerns, requested_changes } = body
      if (!kid_name || !date_range_start || !date_range_end) {
        return NextResponse.json({ error: 'kid_name + date range required' }, { status: 400 })
      }

      const data = await aggregatePacketData(kid_name, date_range_start, date_range_end)
      const pdfBytes = generatePacketPDF(kid_name, data, { meeting_date, meeting_type, date_range_start, date_range_end, parent_notes, concerns, requested_changes })

      const filename = `ARD-${kid_name}-${date_range_end}.pdf`
      return new NextResponse(pdfBytes as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('ARD POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
