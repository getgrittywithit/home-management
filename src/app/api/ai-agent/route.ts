import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { action, content, message, context, familyContext, chatHistory, sessionId, apiKey } = await request.json()

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
        messages: action === 'chat' ? 
          await buildChatMessages(message, context, familyContext, sessionId) :
          [
            {
              role: 'user',
              content: action === 'process-email' ? 
                createEmailProcessingPrompt(content, familyContext) : 
                createChatPrompt(message, context, familyContext)
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
        
        // Save extracted data to database
        const savedTodos = await saveTodosToDatabase(parsedData.todos || [])
        const savedContacts = await saveContactsToDatabase(parsedData.contacts || [])
        
        return NextResponse.json({
          ...parsedData,
          savedTodos,
          savedContacts
        })
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return NextResponse.json({ error: 'Invalid JSON response from Claude' }, { status: 500 })
      }
    } else {
      // Save chat history and return response
      if (sessionId) {
        await db.saveChatMessage('user', message, sessionId)
        await db.saveChatMessage('assistant', responseContent, sessionId)
      }
      return NextResponse.json({ response: responseContent })
    }

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function buildChatMessages(message: string, context: string | undefined, familyContext: any, sessionId: string) {
  const messages = []
  
  // Add system context
  messages.push({
    role: 'user',
    content: createSystemPrompt(familyContext)
  })
  
  // Add chat history from database
  try {
    const chatHistory = await db.getChatHistory(sessionId, 10)
    if (chatHistory && chatHistory.length > 0) {
      for (const historyItem of chatHistory.reverse()) {
        messages.push({
          role: historyItem.role,
          content: historyItem.content
        })
      }
    }
  } catch (error) {
    console.error('Error loading chat history:', error)
  }
  
  // Add current message
  messages.push({
    role: 'user',
    content: context ? `Context: ${context}\n\n${message}` : message
  })
  
  return messages
}

function createSystemPrompt(familyContext: any): string {
  return `You are an AI assistant for the Moses family management system. Here's what you need to know:

**Family Members:**
- Parents: ${familyContext?.parents?.join(', ') || 'Levi, Lola'}
- Children: ${familyContext?.children?.join(', ') || 'Amos, Zoey, Kaylee, Ellie, Wyatt, Hannah'}

**Schools:** ${familyContext?.schools?.join(', ') || 'Samuel V Champion High School, Princeton Intermediate School, Princeton Elementary'}

**Current Contacts:** ${familyContext?.existingContacts?.slice(0, 5)?.join(', ') || 'Loading...'}

**Recent Todos:** ${familyContext?.recentTodos?.slice(0, 3)?.join(', ') || 'Loading...'}

You help with:
- Processing school emails and newsletters
- Managing family todos and contacts  
- Organizing family operations across 6 kids and 3 schools
- Answering questions about family management
- Providing context-aware responses using real family data

Be helpful, concise, and focus on practical family management solutions.`
}

function createEmailProcessingPrompt(emailContent: string, familyContext: any): string {
  const familyInfo = familyContext ? `
**Family Context:**
- Parents: ${familyContext.parents?.join(', ') || 'Levi, Lola'}
- Children: ${familyContext.children?.join(', ') || 'Amos, Zoey, Kaylee, Ellie, Wyatt, Hannah'} 
- Schools: ${familyContext.schools?.join(', ') || 'Samuel V Champion High School, Princeton Intermediate School, Princeton Elementary'}
- Existing Contacts: ${familyContext.existingContacts?.slice(0, 3)?.join(', ') || 'None'}
` : ''

  return `You are an AI assistant helping the Moses family manage their communications and tasks.${familyInfo}

I will provide you with email content, and you need to extract:

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
- Check against existing contacts to avoid duplicates

For todos, look for:
- Action items that need to be completed
- Deadlines or time-sensitive tasks
- Set priority (high for urgent/deadline items, medium for important, low for optional)
- Categorize (school, family, contacts, development, general)
- Assign to specific family members when clear (${familyContext?.parents?.join(', ') || 'Parents'}, or specific children)

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

Please analyze this email and return the JSON response with extracted contacts, todos, summary, and important information. Use the family context to make intelligent assignments and avoid duplicates.`
}

function createChatPrompt(message: string, context: string | undefined, familyContext: any): string {
  const familyInfo = familyContext ? `
**Family Context:**
- Parents: ${familyContext.parents?.join(', ') || 'Levi, Lola'}
- Children: ${familyContext.children?.join(', ') || 'Amos, Zoey, Kaylee, Ellie, Wyatt, Hannah'}
- Schools: ${familyContext.schools?.join(', ') || 'Samuel V Champion High School, Princeton Intermediate School, Princeton Elementary'}
` : ''

  return `You are an AI assistant for the Moses family management system.${familyInfo}

You help with:
- Processing school emails and newsletters
- Managing family todos and contacts  
- Organizing family operations across 6 kids and 3 schools
- Answering questions about family management
- Providing context-aware responses using real family data

${context ? `Additional Context: ${context}\n\n` : ''}User message: ${message}

Please provide a helpful, concise response focused on family management and organization.`
}

// Database helper functions
async function saveTodosToDatabase(todos: any[]): Promise<any[]> {
  const savedTodos = []
  for (const todo of todos) {
    try {
      const saved = await db.addTodo(
        todo.content,
        todo.priority,
        todo.category,
        todo.assignedTo
      )
      savedTodos.push(saved[0])
    } catch (error) {
      console.error('Error saving todo:', error)
    }
  }
  return savedTodos
}

async function saveContactsToDatabase(contacts: any[]): Promise<any[]> {
  const savedContacts = []
  for (const contact of contacts) {
    try {
      // Check if contact already exists by email
      const existing = contact.email ? await db.findContactByEmail(contact.email) : []
      
      if (existing.length > 0) {
        // Update existing contact
        const updated = await db.updateContact(existing[0].id, contact)
        savedContacts.push({ ...updated[0], updated: true })
      } else {
        // Create new contact
        const saved = await db.addContact(contact)
        savedContacts.push({ ...saved[0], updated: false })
      }
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }
  return savedContacts
}