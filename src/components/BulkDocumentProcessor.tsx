'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Upload, Folder, FileText, Mail, CheckCircle, AlertCircle, 
  Loader2, MoveRight, Trash2, Eye, Bot, Users, ListTodo
} from 'lucide-react'
import { aiAgent } from '@/services/aiAgent'

interface ProcessedFile {
  id: string
  name: string
  type: 'email' | 'pdf' | 'doc' | 'image'
  size: number
  content: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  aiResults?: {
    contacts: Contact[]
    todos: Todo[]
    summary: string
    suggestedStudent?: string
    suggestedFolder?: string
  }
  targetFolder?: string
}

interface Contact {
  name: string
  email?: string
  phone?: string
  organization?: string
  role?: string
}

interface Todo {
  content: string
  priority: 'high' | 'medium' | 'low'
  category: string
  dueDate?: string
  assignedTo?: string
}

const STUDENT_FOLDERS = [
  'Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah', 'General'
]

export default function BulkDocumentProcessor() {
  const [files, setFiles] = useState<ProcessedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [apiKeySet, setApiKeySet] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if API key is set on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasApiKey = localStorage.getItem('claude-api-key') !== null
      setApiKeySet(hasApiKey)
    }
  }, [])

  const handleFileUpload = async (uploadedFiles: FileList) => {
    const newFiles: ProcessedFile[] = []
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const content = await readFileContent(file)
      
      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: getFileType(file.name),
        size: file.size,
        content,
        status: 'pending'
      })
    }
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const getFileType = (filename: string): ProcessedFile['type'] => {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf': return 'pdf'
      case 'doc':
      case 'docx': return 'doc'
      case 'jpg':
      case 'jpeg':
      case 'png': return 'image'
      default: return 'email'
    }
  }

  const processAllFiles = async () => {
    if (!apiKeySet) {
      alert('Please set your Claude API key first')
      return
    }

    setIsProcessing(true)
    
    for (const file of files.filter(f => f.status === 'pending')) {
      await processSingleFile(file.id)
    }
    
    setIsProcessing(false)
  }

  const processSingleFile = async (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing' } : f
    ))

    try {
      const file = files.find(f => f.id === fileId)
      if (!file) return

      // Process with AI agent
      const result = await aiAgent.processEmail(file.content)
      
      // Determine suggested student and folder
      const suggestedStudent = determineSuggestedStudent(file.content, result.summary)
      const suggestedFolder = suggestedStudent || 'General'

      setFiles(prev => prev.map(f => 
        f.id === fileId ? {
          ...f,
          status: 'completed',
          aiResults: {
            contacts: result.contacts || [],
            todos: result.todos || [],
            summary: result.summary,
            suggestedStudent,
            suggestedFolder
          },
          targetFolder: suggestedFolder
        } : f
      ))

    } catch (error) {
      console.error('Error processing file:', error)
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' } : f
      ))
    }
  }

  const determineSuggestedStudent = (content: string, summary: string): string | undefined => {
    const text = (content + ' ' + summary).toLowerCase()
    
    // Look for student names in content
    const students = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
    for (const student of students) {
      if (text.includes(student.toLowerCase())) {
        return student.charAt(0).toUpperCase() + student.slice(1)
      }
    }
    
    // Look for grade levels to infer student
    if (text.includes('4th grade') || text.includes('fourth grade')) return 'Kaylee'
    if (text.includes('high school') || text.includes('9th') || text.includes('10th')) return 'Zoey'
    
    return undefined
  }

  const moveToFolder = async (fileId: string, folder: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, targetFolder: folder } : f
    ))
    
    // Actually organize the file
    try {
      const response = await fetch('/api/bulk-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'organize-file',
          fileName: file.name,
          content: file.content,
          targetFolder: folder,
          fileType: file.type
        })
      })
      
      if (response.ok) {
        console.log(`Successfully moved ${file.name} to ${folder} folder`)
      }
    } catch (error) {
      console.error('Error moving file:', error)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const saveContactsAndTodos = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file?.aiResults) return

    try {
      // Save contacts to localStorage (since ContactsTab uses localStorage)
      const existingContacts = JSON.parse(localStorage.getItem('family-contacts') || '[]')
      const newContacts = file.aiResults.contacts.map(contact => ({
        id: `contact-${Date.now()}-${Math.random()}`,
        ...contact,
        source: file.name,
        dateAdded: new Date().toISOString()
      }))
      
      const updatedContacts = [...existingContacts, ...newContacts]
      localStorage.setItem('family-contacts', JSON.stringify(updatedContacts))

      // Save todos to localStorage (since TodoTab uses localStorage) 
      const existingTodos = JSON.parse(localStorage.getItem('family-todos') || '[]')
      const newTodos = file.aiResults.todos.map(todo => ({
        id: `todo-${Date.now()}-${Math.random()}`,
        content: todo.content,
        status: 'pending',
        priority: todo.priority,
        category: todo.category,
        assignedTo: todo.assignedTo,
        createdAt: new Date().toISOString(),
        source: file.name,
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString() : undefined
      }))
      
      const updatedTodos = [...existingTodos, ...newTodos]
      localStorage.setItem('family-todos', JSON.stringify(updatedTodos))

      alert(`Saved ${newContacts.length} contacts and ${newTodos.length} todos from ${file.name}`)
    } catch (error) {
      console.error('Error saving contacts and todos:', error)
      alert('Error saving contacts and todos')
    }
  }

  const getStatusIcon = (status: ProcessedFile['status']) => {
    switch (status) {
      case 'pending': return <FileText className="w-4 h-4 text-gray-400" />
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const selectedFileData = files.find(f => f.id === selectedFile)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bulk Document Processor</h1>
            <p className="text-blue-100">Process school emails and documents automatically</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{files.length}</div>
            <div className="text-sm text-blue-100">Files Loaded</div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <div className="text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Upload School Documents</h3>
          <p className="text-gray-600 mb-4">
            Drop email files, PDFs, or documents here, or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.eml,.msg"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Choose Files
          </button>
        </div>
      </div>

      {/* Processing Controls */}
      {files.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={processAllFiles}
                disabled={isProcessing || files.filter(f => f.status === 'pending').length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Process All Files'}
              </button>
              
              <div className="text-sm text-gray-600">
                {files.filter(f => f.status === 'completed').length} / {files.length} processed
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">API Key:</span>
              <div className={`w-3 h-3 rounded-full ${apiKeySet ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Files Panel */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Documents ({files.length})</h2>
          </div>
          
          <div className="divide-y max-h-96 overflow-y-auto">
            {files.map(file => (
              <div
                key={file.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedFile === file.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setSelectedFile(file.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB • {file.type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.targetFolder && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        → {file.targetFolder}
                      </span>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {file.aiResults && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {file.aiResults.contacts.length} contacts
                    </span>
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-3 h-3" />
                      {file.aiResults.todos.length} todos
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {files.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No files uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">
              {selectedFileData ? 'File Details' : 'Select a File'}
            </h2>
          </div>
          
          <div className="p-4">
            {selectedFileData ? (
              <div className="space-y-4">
                {/* File Info */}
                <div>
                  <h3 className="font-medium mb-2">{selectedFileData.name}</h3>
                  <p className="text-sm text-gray-600">
                    Status: {selectedFileData.status} • Size: {(selectedFileData.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Folder Assignment */}
                <div>
                  <label className="block text-sm font-medium mb-2">Assign to Folder:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STUDENT_FOLDERS.map(folder => (
                      <button
                        key={folder}
                        onClick={() => moveToFolder(selectedFileData.id, folder)}
                        className={`p-2 text-sm rounded border ${
                          selectedFileData.targetFolder === folder
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                        }`}
                      >
                        <Folder className="w-4 h-4 inline mr-2" />
                        {folder}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Results */}
                {selectedFileData.aiResults && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Summary:</h4>
                      <p className="text-sm text-gray-600">{selectedFileData.aiResults.summary}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">
                          Contacts Found ({selectedFileData.aiResults.contacts.length}):
                        </h4>
                        {selectedFileData.aiResults.contacts.length > 0 && (
                          <button
                            onClick={() => saveContactsAndTodos(selectedFileData.id)}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                          >
                            Save All
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {selectedFileData.aiResults.contacts.map((contact, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="font-medium">{contact.name}</div>
                            {contact.organization && (
                              <div className="text-gray-600">{contact.organization}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        Todos Created ({selectedFileData.aiResults.todos.length}):
                      </h4>
                      <div className="space-y-1">
                        {selectedFileData.aiResults.todos.map((todo, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="font-medium">{todo.content}</div>
                            <div className="text-gray-600">
                              Priority: {todo.priority} • Category: {todo.category}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Select a file to view details and processing results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}