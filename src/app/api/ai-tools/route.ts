import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'getTodos': {
        const todos = await db.getTodos()
        return NextResponse.json({ success: true, todos })
      }

      case 'addTodo': {
        const { content, priority, category, assignedTo } = data
        const result = await db.addTodo(
          content,
          priority || 'medium',
          category || 'general',
          assignedTo || 'Parents'
        )
        return NextResponse.json({ success: true, todo: result[0] })
      }

      case 'getContacts': {
        const contacts = await db.getContacts()
        return NextResponse.json({ success: true, contacts })
      }

      case 'getFamilyInfo': {
        const [children, parents] = await Promise.all([
          db.getChildren(),
          db.getParents()
        ])
        return NextResponse.json({ 
          success: true, 
          children: children.map((c: any) => ({ name: c.first_name, grade: c.grade })),
          parents: parents.map((p: any) => p.first_name)
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI tools error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}