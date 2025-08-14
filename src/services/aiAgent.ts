// AI Agent service for processing emails and extracting contacts/todos
import { db } from '@/lib/database'

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

  // Get family context for AI processing
  async getFamilyContext(): Promise<FamilyContext> {
    try {
      const [children, parents, contacts, todos] = await Promise.all([
        db.getChildren(),
        db.getParents(),
        db.getContacts(),
        db.getTodos()
      ])

      return {
        children: children.map((child: any) => child.first_name),
        parents: parents.map((parent: any) => parent.first_name),
        schools: ['Samuel V Champion High School', 'Princeton Intermediate School', 'Princeton Elementary'],
        existingContacts: contacts.map((contact: any) => `${contact.name} (${contact.organization || 'No org'})`),
        recentTodos: todos.slice(0, 10).map((todo: any) => todo.content)
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
      
      // Save extracted data to database
      const savedTodos = await this.saveTodosToDatabase(data.todos)
      const savedContacts = await this.saveContactsToDatabase(data.contacts)
      
      return {
        ...data,
        savedTodos,
        savedContacts
      }

    } catch (error) {
      console.error('Error processing email with Claude:', error)
      throw error
    }
  }

  // Save todos to database
  async saveTodosToDatabase(todos: Todo[]): Promise<any[]> {
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

  // Save contacts to database  
  async saveContactsToDatabase(contacts: Contact[]): Promise<any[]> {
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
      // Save user message to chat history
      await db.saveChatMessage('user', message, sessionId)
      
      // Get family context and chat history for better responses
      const [familyContext, chatHistory] = await Promise.all([
        this.getFamilyContext(),
        db.getChatHistory(sessionId, 10)
      ])
      
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
          chatHistory: chatHistory.reverse(), // Oldest first for context
          apiKey: this.apiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      
      // Save assistant response to chat history
      await db.saveChatMessage('assistant', data.response, sessionId)
      
      return data.response

    } catch (error) {
      console.error('Error getting chat response from Claude:', error)
      throw error
    }
  }

  // Clear chat history for a session
  async clearChatHistory(sessionId: string = 'default'): Promise<void> {
    try {
      await db.clearChatHistory(sessionId)
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }
  }
}

export const aiAgent = new AIAgentService()
export type { ProcessedEmailData, Contact, Todo }