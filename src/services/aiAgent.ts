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

  constructor() {
    // API key will be set by user and passed with each request
  }

  setApiKey(key: string) {
    this.apiKey = key
  }

  async processEmail(emailContent: string): Promise<ProcessedEmailData> {
    if (!this.apiKey) {
      throw new Error('Claude API key not set')
    }

    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process-email',
          content: emailContent,
          apiKey: this.apiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
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

  async chatResponse(message: string, context?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Claude API key not set')
    }

    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          message: `${context ? `Context: ${context}\n\n` : ''}${message}`,
          apiKey: this.apiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      return data.response

    } catch (error) {
      console.error('Error getting chat response from Claude:', error)
      throw error
    }
  }
}

export const aiAgent = new AIAgentService()
export type { ProcessedEmailData, Contact, Todo }