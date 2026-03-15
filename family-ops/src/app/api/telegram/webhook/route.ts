import { NextRequest, NextResponse } from 'next/server'
import { TelegramBot } from '@/lib/telegram-bot'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Telegram webhook sends updates in this format
    if (body.message) {
      const message = body.message
      const text = message.text || ''
      const from = message.from?.first_name || 'Unknown'
      const chatId = message.chat?.id?.toString()

      // Only process messages from the family chat
      if (chatId && process.env.FAMILY_CHAT_ID && chatId !== process.env.FAMILY_CHAT_ID) {
        return NextResponse.json({ status: 'ignored - not family chat' })
      }

      // Process the message
      await TelegramBot.processMessage(text, from)
      
      return NextResponse.json({ status: 'processed' })
    }

    return NextResponse.json({ status: 'no message to process' })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook endpoint active' })
}