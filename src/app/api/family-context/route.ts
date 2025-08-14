import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    const [children, parents, contacts, todos] = await Promise.all([
      db.getChildren(),
      db.getParents(),
      db.getContacts(),
      db.getTodos()
    ])

    const familyContext = {
      children: children.map((child: any) => child.first_name),
      parents: parents.map((parent: any) => parent.first_name),
      schools: ['Samuel V Champion High School', 'Princeton Intermediate School', 'Princeton Elementary'],
      existingContacts: contacts.map((contact: any) => `${contact.name} (${contact.organization || 'No org'})`),
      recentTodos: todos.slice(0, 10).map((todo: any) => todo.content)
    }

    return NextResponse.json(familyContext)
  } catch (error) {
    console.error('Error fetching family context:', error)
    return NextResponse.json(
      {
        children: ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah'],
        parents: ['Levi', 'Lola'],
        schools: ['Samuel V Champion High School', 'Princeton Intermediate School', 'Princeton Elementary'],
        existingContacts: [],
        recentTodos: []
      },
      { status: 200 }
    )
  }
}