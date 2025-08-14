// AI Agent service for processing emails and extracting contacts/todos

interface ProcessedEmailData {
  contacts: Contact[]
  todos: Todo[]
  summary: string
  importantInfo: string[]
  savedTodos?: any[]
  savedContacts?: any[]
}

interface FamilyContext {
  children: string[]
  parents: string[]
  schools: string[]
  existingContacts: string[]
  recentTodos: string[]
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

  constructor() {
    // API key will be set by user and passed with each request
  }

  setApiKey(key: string) {
    this.apiKey = key
  }

  // Get family context for AI processing via API
  async getFamilyContext(): Promise<FamilyContext> {
    try {
      const response = await fetch('/api/family-context')
      if (response.ok) {
        const data = await response.json()
        return data
      } else {
        throw new Error('Failed to fetch family context')
      }
    } catch (error) {
      console.error('Error getting family context:', error)
      return {
        children: ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah'],
        parents: ['Levi', 'Lola'],
        schools: ['Samuel V Champion High School', 'Princeton Intermediate School', 'Princeton Elementary'],
        existingContacts: [],
        recentTodos: []
      }
    }
  }

  async processEmail(emailContent: string): Promise<ProcessedEmailData> {
    if (!this.apiKey) {
      throw new Error('Claude API key not set')
    }

    try {
      // Get family context for better AI processing
      const familyContext = await this.getFamilyContext()
      
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process-email',
          content: emailContent,
          apiKey: this.apiKey,
          familyContext
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      
      // The API will handle saving to database on the server side
      return data

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

  async chatResponse(message: string, context?: string, sessionId: string = 'default'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Claude API key not set')
    }

    try {
      // Get family context for better responses
      const familyContext = await this.getFamilyContext()
      
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          message,
          context,
          familyContext,
          sessionId,
          apiKey: this.apiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      
      // Chat history is handled server-side
      return data.response

    } catch (error) {
      console.error('Error getting chat response from Claude:', error)
      throw error
    }
  }

  // Clear chat history for a session via API
  async clearChatHistory(sessionId: string = 'default'): Promise<void> {
    try {
      await fetch('/api/chat-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }
  }
}

export const aiAgent = new AIAgentService()
export type { ProcessedEmailData, Contact, Todo }