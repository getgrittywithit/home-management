import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { action, content, message, apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: action === 'chat' ? 1000 : 4000,
        messages: [
          {
            role: 'user',
            content: action === 'process-email' ? createEmailProcessingPrompt(content) : createChatPrompt(message)
          }
        ]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, errorText)
      return NextResponse.json(
        { error: `Claude API error: ${claudeResponse.status}` }, 
        { status: claudeResponse.status }
      )
    }

    const data = await claudeResponse.json()
    const responseContent = data.content[0].text

    if (action === 'process-email') {
      // Extract JSON from the response for email processing
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return NextResponse.json({ error: 'Could not parse JSON response from Claude' }, { status: 500 })
        }
        const parsedData = JSON.parse(jsonMatch[0])
        return NextResponse.json(parsedData)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return NextResponse.json({ error: 'Invalid JSON response from Claude' }, { status: 500 })
      }
    } else {
      // Return chat response directly
      return NextResponse.json({ response: responseContent })
    }

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function createEmailProcessingPrompt(emailContent: string): string {
  return `You are an AI assistant helping a family manage their communications and tasks. I will provide you with email content, and you need to extract:

1. **Contacts** - Any people or organizations mentioned with contact information
2. **Todos** - Action items, deadlines, or things that need to be done
3. **Summary** - Brief overview of what this email is about
4. **Important Info** - Key dates, deadlines, or urgent items

For contacts, look for:
- Names, titles, and organizations
- Phone numbers, email addresses, physical addresses
- Office locations or room numbers
- Tag them appropriately (School, Medical, Emergency, Family, Services, etc.)
- Set importance level (high for urgent contacts, medium for regular, low for reference)

For todos, look for:
- Action items that need to be completed
- Deadlines or time-sensitive tasks
- Set priority (high for urgent/deadline items, medium for important, low for optional)
- Categorize (school, family, contacts, development, general)

Return the response in this EXACT JSON format:

{
  "contacts": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "organization": "Organization Name",
      "phone": "(123) 456-7890",
      "email": "email@domain.com",
      "address": "Full Address",
      "office": "Room/Office",
      "notes": "Any relevant notes or context",
      "tags": ["School", "Principal"],
      "importance": "high"
    }
  ],
  "todos": [
    {
      "content": "Specific action item with context",
      "priority": "high",
      "category": "school",
      "assignedTo": "Parents"
    }
  ],
  "summary": "Brief summary of email content",
  "importantInfo": [
    "Key piece of information 1",
    "Key piece of information 2"
  ]
}

Here is the email content to process:

${emailContent}

Please analyze this email and return the JSON response with extracted contacts, todos, summary, and important information. Be thorough but focus on actionable items and useful contact information for family management.`
}

function createChatPrompt(message: string): string {
  return `You are an AI assistant for a family management system. You help with:
- Processing school emails and newsletters
- Managing family todos and contacts
- Organizing family operations
- Answering questions about family management

Context: This is a parent portal for managing 6 kids across 3 different schools. The family uses this system to track todos, contacts, schedules, and communications.

User message: ${message}

Please provide a helpful, concise response focused on family management and organization.`
}