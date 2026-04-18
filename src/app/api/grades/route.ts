import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

import { ALL_KIDS as KID_NAMES } from '@/lib/constants'

function detectKidFromEmail(subject: string, body: string): string | null {
  const text = `${subject} ${body}`.toLowerCase()
  for (const kid of KID_NAMES) {
    if (text.includes(kid)) return kid
  }
  return null
}

function parseScore(text: string): number | null {
  const patterns = [/(\d{1,3}(?:\.\d{1,2})?)\s*%/, /grade[:\s]+(\d{1,3})/, /score[:\s]+(\d{1,3})/]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return parseFloat(m[1])
  }
  return null
}

function detectSubject(text: string): string {
  const lower = text.toLowerCase()
  if (lower.match(/science|bio|chem|physics/)) return 'Science'
  if (lower.match(/math|algebra|geometry|calculus/)) return 'Math'
  if (lower.match(/elar|english|reading|language arts|writing/)) return 'ELAR'
  if (lower.match(/history|social studies|geography|government/)) return 'History'
  if (lower.match(/art|music|theater|pe|physical ed/)) return 'Elective'
  return 'General'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'

  try {
    if (action === 'list') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const limit = parseInt(searchParams.get('limit') || '50')
      let sql = `SELECT * FROM grade_alerts`
      const params: any[] = []
      if (kidName) { params.push(kidName); sql += ` WHERE kid_name = $1` }
      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
      params.push(limit)
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ alerts: rows })
    }

    if (action === 'summary') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const avgs = await db.query(
        `SELECT subject, ROUND(AVG(score), 1) AS avg_score, COUNT(*)::int AS count,
                MAX(score) AS highest, MIN(score) AS lowest
           FROM grade_alerts WHERE kid_name = $1 AND score IS NOT NULL
           GROUP BY subject ORDER BY subject`,
        [kidName]
      ).catch(() => [])
      const recent = await db.query(
        `SELECT * FROM grade_alerts WHERE kid_name = $1 ORDER BY created_at DESC LIMIT 10`, [kidName]
      ).catch(() => [])
      return NextResponse.json({ averages: avgs, recent })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Grades GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_grade') {
      const { kid_name, subject, score, score_type, assignment_name, teacher_name, source_email_id } = body
      if (!kid_name || !subject) return NextResponse.json({ error: 'kid_name + subject required' }, { status: 400 })

      const kid = kid_name.toLowerCase()
      const numScore = score != null ? parseFloat(score) : null
      const isHigh = numScore != null && numScore >= 85
      const isLow = numScore != null && numScore < 70
      const needsAction = isLow

      const rows = await db.query(
        `INSERT INTO grade_alerts (kid_name, subject, score, score_type, assignment_name, teacher_name, is_high, is_low, source_email_id, parent_action_needed, parent_action_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [kid, subject, numScore, score_type || 'grade', assignment_name || null, teacher_name || null,
         isHigh, isLow, source_email_id || null, needsAction,
         needsAction ? `Check ${cap(kid)}'s ${subject} grade (${numScore}%) — may need follow-up` : null]
      )

      // Notify kid
      if (numScore != null) {
        if (isHigh) {
          await createNotification({
            title: `🌟 Nice work, ${cap(kid)}!`,
            message: `You got ${numScore}% on ${subject}${assignment_name ? ` (${assignment_name})` : ''}! Keep it up!`,
            source_type: 'grade_alert', source_ref: `grade:${rows[0]?.id}`,
            icon: '🌟', target_role: 'kid', kid_name: kid,
          }).catch(() => {})

          // Bonus stars
          const bonusStars = numScore >= 90 ? 5 : 3
          await db.query(
            `UPDATE digi_pets SET stars_balance = stars_balance + $1 WHERE kid_name = $2`,
            [bonusStars, kid]
          ).catch(() => {})
          await db.query(
            `INSERT INTO bonus_star_events (kid_name, trigger_type, bonus_amount, message) VALUES ($1, 'high_grade', $2, $3)`,
            [kid, bonusStars, `${numScore}% on ${subject}!`]
          ).catch(() => {})
        } else if (isLow) {
          await createNotification({
            title: `📚 Heads up, ${cap(kid)}`,
            message: `Your ${subject} grade is ${numScore}%. That's okay — check if there's makeup work available. You've got this! 💪`,
            source_type: 'grade_alert', source_ref: `grade:${rows[0]?.id}`,
            icon: '📚', target_role: 'kid', kid_name: kid,
          }).catch(() => {})
        }
      }

      // Parent notification for low grades
      if (needsAction) {
        await createNotification({
          title: `⚠️ ${cap(kid)}: ${subject} ${numScore}%`,
          message: `Low grade alert — may need parent conference or makeup work check.`,
          source_type: 'grade_alert', source_ref: `grade:${rows[0]?.id}`,
          icon: '⚠️', link_tab: 'school',
        }).catch(() => {})

        // Auto-create School board task
        await db.query(
          `INSERT INTO action_items (title, description, source_type, source_ref, board, column_name, priority, category)
           VALUES ($1, $2, 'grade_alert', $3, 'school', 'inbox', $4, 'school')`,
          [`Check ${cap(kid)}'s ${subject} grade (${numScore}%)`,
           `Low grade alert: ${numScore}% on ${subject}${assignment_name ? ` — ${assignment_name}` : ''}. Check for makeup work or schedule parent-teacher conference.`,
           `grade:${rows[0]?.id}`,
           numScore < 60 ? 'urgent' : 'high']
        ).catch(() => {})
      }

      return NextResponse.json({ alert: rows[0] }, { status: 201 })
    }

    if (action === 'process_email') {
      const { email_subject, email_body, email_from, source_email_id } = body
      if (!email_subject && !email_body) return NextResponse.json({ error: 'email content required' }, { status: 400 })

      const fullText = `${email_subject || ''} ${email_body || ''}`
      const kidName = detectKidFromEmail(email_subject || '', email_body || '')
      const score = parseScore(fullText)
      const subject = detectSubject(fullText)

      if (!kidName) return NextResponse.json({ success: false, reason: 'Could not detect kid name' })
      if (score == null) return NextResponse.json({ success: false, reason: 'Could not detect score' })

      // Delegate to log_grade
      const res = await fetch(new URL('/api/grades', req.url).toString(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_grade', kid_name: kidName, subject, score, source_email_id }),
      })
      return NextResponse.json({ success: true, ...(await res.json()) })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Grades POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
