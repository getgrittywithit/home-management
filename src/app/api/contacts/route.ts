import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_contacts'
  const category = searchParams.get('category')
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const includeArchived = searchParams.get('include_archived') === 'true'

  try {
    if (action === 'get_contacts') {
      let sql = `SELECT * FROM contacts WHERE 1=1`
      const params: any[] = []

      if (!includeArchived) {
        sql += ` AND (is_archived IS NULL OR is_archived = false)`
      }
      if (category) {
        params.push(category)
        sql += ` AND category = $${params.length}`
      }
      if (kid) {
        params.push(`%${kid}%`)
        sql += ` AND (associated_kids::text ILIKE $${params.length} OR associated_kids IS NULL)`
      }
      sql += ` ORDER BY is_archived ASC NULLS FIRST, name ASC`

      const rows = await db.query(sql, params).catch(() => [])
      // Parse JSON fields
      const contacts = rows.map((c: any) => ({
        ...c,
        tags: typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags || [],
        associated_kids: typeof c.associated_kids === 'string' ? JSON.parse(c.associated_kids) : c.associated_kids || [],
      }))
      return NextResponse.json({ contacts })
    }

    if (action === 'get_contact') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const row = (await db.query(`SELECT * FROM contacts WHERE id = $1`, [id]).catch(() => []))[0]
      if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({
        contact: {
          ...row,
          tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
          associated_kids: typeof row.associated_kids === 'string' ? JSON.parse(row.associated_kids) : row.associated_kids || [],
        }
      })
    }

    if (action === 'get_categories') {
      const rows = await db.query(
        `SELECT category, COUNT(*)::int as count FROM contacts WHERE (is_archived IS NULL OR is_archived = false) GROUP BY category ORDER BY category`
      ).catch(() => [])
      return NextResponse.json({ categories: rows })
    }

    // Fallback to legacy behavior
    const contacts = await db.getContacts()
    const processedContacts = contacts.map((contact: any) => ({
      ...contact,
      tags: typeof contact.tags === 'string' ? JSON.parse(contact.tags) : contact.tags || []
    }))
    return NextResponse.json(processedContacts)
  } catch (error) {
    console.error('Contacts GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create_contact') {
      const { name, title, organization, phone, email, category, year_range, associated_kids, notes } = body
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

      // Try to add new columns if they don't exist (migration-safe)
      await db.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'`).catch(() => {})
      await db.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS year_range TEXT`).catch(() => {})
      await db.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS associated_kids JSONB DEFAULT '[]'`).catch(() => {})
      await db.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false`).catch(() => {})

      const rows = await db.query(
        `INSERT INTO contacts (name, title, organization, phone, email, category, year_range, associated_kids, notes, tags, is_archived)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]', false) RETURNING *`,
        [name, title || null, organization || null, phone || null, email || null,
         category || 'other', year_range || null, JSON.stringify(associated_kids || []), notes || null]
      )
      return NextResponse.json({ success: true, contact: rows[0] })
    }

    if (action === 'update_contact') {
      const { id, name, title, organization, phone, email, category, year_range, associated_kids, notes } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const fields: string[] = []
      const values: any[] = []
      let idx = 1
      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name) }
      if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title) }
      if (organization !== undefined) { fields.push(`organization = $${idx++}`); values.push(organization) }
      if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone) }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email) }
      if (category !== undefined) { fields.push(`category = $${idx++}`); values.push(category) }
      if (year_range !== undefined) { fields.push(`year_range = $${idx++}`); values.push(year_range) }
      if (associated_kids !== undefined) { fields.push(`associated_kids = $${idx++}`); values.push(JSON.stringify(associated_kids)) }
      if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes) }
      if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      values.push(id)
      const rows = await db.query(`UPDATE contacts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values)
      return NextResponse.json({ success: true, contact: rows[0] })
    }

    if (action === 'archive_contact') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE contacts SET is_archived = true WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    if (action === 'unarchive_contact') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`UPDATE contacts SET is_archived = false WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    // Legacy: direct POST to create
    if (body.name && !action) {
      const contact = await db.addContact(body)
      return NextResponse.json(contact[0], { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Contacts POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...contactData } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    if (!contactData.tags) contactData.tags = []
    const contact = await db.updateContact(id, contactData)
    return NextResponse.json(contact[0])
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    await db.deleteContact(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
