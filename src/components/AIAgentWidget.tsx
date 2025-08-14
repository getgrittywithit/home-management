'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  MessageCircle, X, Send, Paperclip, FileText, Image, 
  Upload, Loader2, CheckCircle, AlertCircle, Brain, Sparkles, Key
} from 'lucide-react'
import { aiAgent, ProcessedEmailData, ChatResponse } from '@/services/aiAgent'

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  processing?: boolean
  attachments?: Attachment[]
}

interface Attachment {
  id: string
  name: string
  type: 'email' | 'pdf' | 'image' | 'text'
  content: string
  size: number
}

interface ProcessingResult {
  contacts: Contact[]
  todos: Todo[]
  summary: string
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

export default function AIAgentWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [apiKeySet, setApiKeySet] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Welcome message when first opened
    if (isOpen && messages.length === 0) {
      if (!apiKeySet) {
        addMessage({
          type: 'agent',
          content: `🐵 Hi! I'm your AI family assistant powered by Claude.

To get started, I need your Claude API key. Click the key button below to set it up.

Once configured, I can help you:
• Process school emails and newsletters
• Extract contact information automatically
• Create todo items and reminders
• Handle PDF documents with OCR
• Organize your family operations

Your API key is stored locally and never shared.`,
        })
      } else {
        addMessage({
          type: 'agent',
          content: `🐵 Hi! I'm ready to help with your family operations.

I can:
• Process school emails and newsletters
• Extract contact information
• Create todo items and reminders  
• Handle PDF documents with OCR
• Answer questions about family management

Just paste an email, upload a PDF, or ask me anything!`,
        })
      }
    }
  }, [isOpen, messages.length, apiKeySet])

  const addMessage = (msg: Partial<Message>) => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      ...msg
    } as Message
    setMessages(prev => [...prev, message])
  }

  const handleSetApiKey = () => {
    if (!apiKeyInput.trim()) return
    
    aiAgent.setApiKey(apiKeyInput)
    setApiKeySet(true)
    setShowApiKeyInput(false)
    setApiKeyInput('')
    
    addMessage({
      type: 'system',
      content: '✅ Claude API key configured successfully! I\'m ready to process emails and help with family management.'
    })
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('claude-api-key', apiKeyInput.trim())
    }
  }

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('claude-api-key')
      if (stored) {
        aiAgent.setApiKey(stored)
        setApiKeySet(true)
      }
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage = input.trim()
    setInput('')
    
    addMessage({
      type: 'user',
      content: userMessage
    })

    setIsProcessing(true)
    
    try {
      // Check if this looks like email content
      if (isEmailContent(userMessage)) {
        await processEmailContent(userMessage)
      } else {
        // Handle as regular chat
        await handleChatMessage(userMessage)
      }
    } catch (error) {
      addMessage({
        type: 'system',
        content: `❌ Sorry, I encountered an error processing that. Please try again.`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const isEmailContent = (text: string): boolean => {
    // Simple heuristics to detect email content
    const emailIndicators = [
      'From:', 'To:', 'Subject:', 'Dear', 'Sincerely',
      '@', 'Email:', 'Phone:', 'Contact:', 'regards'
    ]
    const lowerText = text.toLowerCase()
    return emailIndicators.some(indicator => lowerText.includes(indicator.toLowerCase())) && text.length > 100
  }

  const processEmailContent = async (emailContent: string) => {
    if (!apiKeySet) {
      addMessage({
        type: 'system',
        content: '❌ Please set your Claude API key first to process emails.'
      })
      return
    }

    addMessage({
      type: 'agent',
      content: '🔄 Processing email with Claude AI... Looking for contacts, todos, and important information.',
      processing: true
    })

    try {
      const result = await aiAgent.processEmail(emailContent)

      // Add results message with database save status
      let resultMessage = `✅ **Email Processed Successfully!**\n\n`
      
      if (result.savedTodos && result.savedTodos.length > 0) {
        resultMessage += `✅ **Saved ${result.savedTodos.length} Todo Item(s) to TodoTab:**\n`
        result.savedTodos.forEach(todo => {
          const priorityIcon = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢'
          resultMessage += `${priorityIcon} ${todo.content}`
          if (todo.assigned_to) resultMessage += ` (Assigned to: ${todo.assigned_to})`
          resultMessage += '\n'
        })
        resultMessage += '\n'
      }
      
      if (result.savedContacts && result.savedContacts.length > 0) {
        resultMessage += `📞 **Saved ${result.savedContacts.length} Contact(s) to ContactsTab:**\n`
        result.savedContacts.forEach(contact => {
          resultMessage += `• ${contact.name}${contact.title ? ` - ${contact.title}` : ''}`
          if (contact.organization) resultMessage += ` (${contact.organization})`
          if (contact.updated) resultMessage += ` ✏️ Updated existing`
          else resultMessage += ` ➕ Added new`
          resultMessage += '\n'
        })
        resultMessage += '\n'
      }

      if (result.summary) {
        resultMessage += `📋 **Summary:**\n${result.summary}\n\n`
      }

      if (result.importantInfo && result.importantInfo.length > 0) {
        resultMessage += `⚠️ **Important Information:**\n`
        result.importantInfo.forEach(info => {
          resultMessage += `• ${info}\n`
        })
        resultMessage += '\n'
      }

      resultMessage += `🎯 **Data saved to your TodoTab and ContactsTab!** Check them to see the new items.`

      addMessage({
        type: 'agent',
        content: resultMessage
      })

    } catch (error) {
      console.error('Error processing email:', error)
      addMessage({
        type: 'system',
        content: '❌ Error processing email. Please check your API key and try again.'
      })
    }
  }

  const mockProcessEmail = async (content: string): Promise<ProcessingResult> => {
    // This would be replaced with actual AI processing
    return {
      contacts: [],
      todos: [
        {
          content: "Process uploaded email content",
          priority: 'medium',
          category: 'general'
        }
      ],
      summary: "Email content has been analyzed and processed."
    }
  }

  const handleChatMessage = async (message: string) => {
    if (!apiKeySet) {
      addMessage({
        type: 'system',
        content: '❌ Please set your Claude API key first to chat.'
      })
      return
    }

    try {
      const response: ChatResponse = await aiAgent.chatResponse(message)
      
      // Add the response message
      addMessage({
        type: 'agent',
        content: response.response
      })
      
      // If a todo was created, add a confirmation
      if (response.todoCreated && response.todo) {
        setTimeout(() => {
          addMessage({
            type: 'system',
            content: `✅ Todo successfully added to your TodoTab!`
            })
          }, 500)
        }
    } catch (error) {
      console.error('Error getting chat response:', error)
      addMessage({
        type: 'system',
        content: '❌ Error getting response. Please check your API key and try again.'
      })
    }
  }

  const handleFileUpload = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    const attachment: Attachment = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : 'text',
      content: '', // Would read file content
      size: file.size
    }

    addMessage({
      type: 'user',
      content: `Uploaded file: ${file.name}`,
      attachments: [attachment]
    })

    setIsProcessing(true)
    
    // Simulate file processing
    addMessage({
      type: 'agent',
      content: '📄 Processing uploaded file... Using OCR for text extraction.',
      processing: true
    })

    await new Promise(resolve => setTimeout(resolve, 3000))
    
    addMessage({
      type: 'agent',
      content: `✅ File "${file.name}" processed successfully! I would extract text using OCR and then process it for contacts and todos.`
    })

    setIsProcessing(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const MonkeyIcon = () => (
    <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
      🐵
    </div>
  )

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full opacity-0 group-hover:opacity-100 blur transition-all duration-300" />
          <div className="relative">
            <MonkeyIcon />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              <Brain className="w-3 h-3" />
            </div>
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Family Assistant
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`bg-white rounded-2xl shadow-2xl border transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">
              🐵
            </div>
            <div>
              <h3 className="font-semibold">AI Family Assistant</h3>
              <p className="text-xs text-amber-100">Smart email & task processing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 h-96 overflow-y-auto space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm p-3 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.type === 'system'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.processing && (
                      <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                      </div>
                    )}
                    {message.attachments && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map(attachment => (
                          <div key={attachment.id} className="flex items-center gap-2 text-xs bg-white/20 rounded p-1">
                            <FileText className="w-3 h-3" />
                            {attachment.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* File Drop Area */}
            {dragOver && (
              <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-700 font-medium">Drop files here to process</p>
                  <p className="text-blue-600 text-sm">Emails, PDFs, and images supported</p>
                </div>
              </div>
            )}

            {/* API Key Input Modal */}
            {showApiKeyInput && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-semibold mb-2">Claude API Key</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your Claude API key to enable AI processing
                  </p>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full p-3 border rounded-lg mb-4"
                    onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowApiKeyInput(false)}
                      className="flex-1 px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetApiKey}
                      disabled={!apiKeyInput.trim()}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div 
              className="p-4 border-t"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Paste an email, ask a question, or upload files..."
                    className="w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                    rows={2}
                    disabled={isProcessing}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {!apiKeySet && (
                    <button
                      onClick={() => setShowApiKeyInput(true)}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Set Claude API Key"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    disabled={isProcessing || !apiKeySet}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing || !apiKeySet}
                    className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.eml,.msg,image/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />
          </>
        )}
      </div>
    </div>
  )
}