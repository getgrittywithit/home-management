// AI Agent service for processing emails and extracting contacts/todos

interface ProcessedEmailData {
  contacts: Contact[]
  todos: Todo[]
  summary: string
  importantInfo: string[]
}

interface Contact {
  name: string
  title?: string
  organization?: string
  phone?: string
  email?: string
  address?: string
  office?: string
  notes?: string
  tags: string[]
  importance: 'high' | 'medium' | 'low'
}

interface Todo {
  content: string
  priority: 'high' | 'medium' | 'low'
  category: 'school' | 'family' | 'contacts' | 'development' | 'general'
  assignedTo?: string
}

class AIAgentService {
  private apiKey: string | null = null
  private baseUrl = 'https://api.anthropic.com/v1/messages'

  constructor() {
    // In production, this would come from environment variables
    // For now, it will be set when user provides their key
  }

  setApiKey(key: string) {
    this.apiKey = key
  }

  async processEmail(emailContent: string): Promise<ProcessedEmailData> {
    if (!this.apiKey) {
      throw new Error('Claude API key not set')
    }

    const prompt = `
You are an AI assistant helping a family manage their communications and tasks. I will provide you with email content, and you need to extract:

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

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.content[0].text

      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse JSON response from Claude')
      }

      const parsedData = JSON.parse(jsonMatch[0])
      return parsedData

    } catch (error) {
      console.error('Error processing email with Claude:', error)
      throw error
    }
  }

  async processWithOCR(file: File): Promise<ProcessedEmailData> {
    // First, extract text using OCR
    const extractedText = await this.performOCR(file)
    
    // Then process the extracted text like an email
    return this.processEmail(extractedText)
  }

  private async performOCR(file: File): Promise<string> {
    // This would integrate with Tesseract.js or similar OCR library
    // For now, return placeholder
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`OCR extracted text from ${file.name}. In production, this would contain the actual extracted text from the PDF or image file.`)
      }, 2000)
    })
  }

  async chatResponse(message: string, context?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Claude API key not set')
    }

    const prompt = `You are an AI assistant for a family management system. You help with:
- Processing school emails and newsletters
- Managing family todos and contacts
- Organizing family operations
- Answering questions about family management

Context: This is a parent portal for managing 6 kids across 3 different schools. The family uses this system to track todos, contacts, schedules, and communications.

${context ? `Additional context: ${context}` : ''}

User message: ${message}

Please provide a helpful, concise response focused on family management and organization.`

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.content[0].text

    } catch (error) {
      console.error('Error getting chat response from Claude:', error)
      throw error
    }
  }
}

export const aiAgent = new AIAgentService()
export type { ProcessedEmailData, Contact, Todo }