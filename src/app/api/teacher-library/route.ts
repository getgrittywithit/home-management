import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'

  try {
    if (action === 'list') {
      const subject = searchParams.get('subject')
      const grade = searchParams.get('grade_level')
      const tag = searchParams.get('tag')
      let sql = `SELECT * FROM teacher_resources`
      const params: any[] = []
      const conditions: string[] = []
      if (subject) { params.push(subject); conditions.push(`subject = $${params.length}`) }
      if (grade)   { params.push(grade);   conditions.push(`grade_level = $${params.length}`) }
      if (tag)     { params.push(tag);     conditions.push(`$${params.length} = ANY(tags)`) }
      if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ')
      sql += ` ORDER BY times_used DESC, created_at DESC LIMIT 100`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ resources: rows })
    }

    if (action === 'search') {
      const q = searchParams.get('q') || ''
      if (!q.trim()) return NextResponse.json({ resources: [] })
      const rows = await db.query(
        `SELECT * FROM teacher_resources
          WHERE title ILIKE $1 OR description ILIKE $1 OR $2 = ANY(tags)
          ORDER BY times_used DESC LIMIT 50`,
        [`%${q.trim()}%`, q.trim().toLowerCase()]
      ).catch(() => [])
      return NextResponse.json({ resources: rows })
    }

    if (action === 'frequently_used') {
      const rows = await db.query(
        `SELECT * FROM teacher_resources WHERE times_used > 0 ORDER BY times_used DESC LIMIT 10`
      ).catch(() => [])
      return NextResponse.json({ resources: rows })
    }

    if (action === 'get_assignments') {
      const kidName = searchParams.get('kid_name')
      const status = searchParams.get('status') || 'assigned'
      let sql = `SELECT wa.*, tr.title, tr.file_url, tr.file_type, tr.subject, tr.grade_level
                   FROM worksheet_assignments wa
                   JOIN teacher_resources tr ON tr.id = wa.resource_id`
      const params: any[] = []
      const conditions: string[] = []
      if (kidName) { params.push(kidName.toLowerCase()); conditions.push(`wa.kid_name = $${params.length}`) }
      if (status !== 'all') { params.push(status); conditions.push(`wa.status = $${params.length}`) }
      if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ')
      sql += ` ORDER BY wa.due_date ASC NULLS LAST, wa.assigned_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ assignments: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Teacher library GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'add': {
        const { title, description, file_url, file_type, thumbnail_url, subject, skills, grade_level, tags, source, canva_link, created_by } = body
        if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
        const rows = await db.query(
          `INSERT INTO teacher_resources (title, description, file_url, file_type, thumbnail_url, subject, skills, grade_level, tags, source, canva_link, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [title, description || null, file_url || null, file_type || 'pdf', thumbnail_url || null,
           subject || null, skills || null, grade_level || null, tags || null,
           source || 'uploaded', canva_link || null, created_by || null]
        )
        return NextResponse.json({ resource: rows[0] }, { status: 201 })
      }

      case 'update': {
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const allowed = ['title', 'description', 'file_url', 'file_type', 'subject', 'skills', 'grade_level', 'tags', 'canva_link']
        const sets: string[] = []
        const params: any[] = [id]
        for (const [k, v] of Object.entries(updates)) {
          if (allowed.includes(k)) {
            params.push(v === '' ? null : v)
            sets.push(`${k} = $${params.length}`)
          }
        }
        if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
        const rows = await db.query(`UPDATE teacher_resources SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
        return NextResponse.json({ resource: rows[0] })
      }

      case 'delete': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(`DELETE FROM teacher_resources WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
      }

      case 'assign': {
        const { resource_id, kid_names, due_date, notes, assigned_by } = body
        if (!resource_id || !kid_names?.length) return NextResponse.json({ error: 'resource_id + kid_names required' }, { status: 400 })
        const assignments: any[] = []
        for (const kidName of kid_names) {
          const rows = await db.query(
            `INSERT INTO worksheet_assignments (resource_id, kid_name, due_date, notes, assigned_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [resource_id, kidName.toLowerCase(), due_date || null, notes || null, assigned_by || null]
          )
          assignments.push(rows[0])
        }
        await db.query(
          `UPDATE teacher_resources SET times_used = times_used + 1, last_used_at = NOW() WHERE id = $1`,
          [resource_id]
        )
        return NextResponse.json({ assignments })
      }

      case 'complete_assignment': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        const rows = await db.query(
          `UPDATE worksheet_assignments SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
          [id]
        )
        return NextResponse.json({ assignment: rows[0] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Teacher library POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
