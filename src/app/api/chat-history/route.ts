import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    await db.clearChatHistory(sessionId || 'default')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing chat history:', error)
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 })
  }
}