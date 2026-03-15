import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    const contacts = await db.getContacts()
    
    // Parse tags JSON field
    const processedContacts = contacts.map((contact: any) => ({
      ...contact,
      tags: typeof contact.tags === 'string' ? JSON.parse(contact.tags) : contact.tags || []
    }))
    
    return NextResponse.json(processedContacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contactData = await request.json()
    
    if (!contactData.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Ensure tags is an array
    if (!contactData.tags) {
      contactData.tags = []
    }

    const contact = await db.addContact(contactData)
    
    // Parse tags for response
    const processedContact = {
      ...contact[0],
      tags: typeof contact[0].tags === 'string' ? JSON.parse(contact[0].tags) : contact[0].tags || []
    }
    
    return NextResponse.json(processedContact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...contactData } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Ensure tags is an array
    if (!contactData.tags) {
      contactData.tags = []
    }

    const contact = await db.updateContact(id, contactData)
    
    // Parse tags for response
    const processedContact = {
      ...contact[0],
      tags: typeof contact[0].tags === 'string' ? JSON.parse(contact[0].tags) : contact[0].tags || []
    }
    
    return NextResponse.json(processedContact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.deleteContact(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}