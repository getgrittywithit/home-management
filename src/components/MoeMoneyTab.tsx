'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, Download, MessageSquare, TrendingUp, DollarSign, Calendar, Search, Settings, BarChart3, Building2, Tag } from 'lucide-react'
import MoeMoneySettings from './MoeMoneySettings'
import MoeMoneyReports from './MoeMoneyReports'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  account?: string
  type: 'income' | 'expense'
}

export default function MoeMoneyTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [isUploading, setIsUploading] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [expenseType, setExpenseType] = useState<'all' | 'personal' | 'business'>('all')
  const [businessClasses, setBusinessClasses] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryOptions = [
    'all',
    'bank_fees',
    'home_rent',
    'home_essentials',
    'tobacco',
    'shopping',
    'work_food',
    'cheetah_elevation_llc',
    'party_store_and_bars',
    'food_and_drink',
    'b_-_software_and_subscriptions',
    'clothing',
    'future_needs/saving',
    'groceries',
    'gas',
    'restaurants',
    'healthcare',
    'entertainment',
    'utilities',
    'other'
  ]

  // Load data on mount and when month changes
  useEffect(() => {
    loadTransactions()
    loadBusinessClasses()
    loadCategories()
  }, [selectedMonth])

  const loadBusinessClasses = async () => {
    try {
      const response = await fetch('/api/business-classes')
      if (response.ok) {
        const { data } = await response.json()
        setBusinessClasses(data || [])
      }
    } catch (error) {
      console.error('Error loading business classes:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/expense-categories')
      if (response.ok) {
        const { data } = await response.json()
        setExpenseCategories(data || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/expenses?startDate=${selectedMonth}-01&endDate=${selectedMonth}-31`)
      if (!response.ok) {
        throw new Error('Failed to load transactions')
      }
      
      const { data } = await response.json()
      
      // Convert Supabase format to our Transaction format
      const loadedTransactions: Transaction[] = data.map((expense: any) => ({
        id: expense.id,
        date: expense.expense_date,
        description: expense.name || expense.description,
        amount: parseFloat(expense.amount),
        category: (expense.parent_category || 'other').toLowerCase().replace(/\s+/g, '_'),
        account: expense.account || 'Unknown',
        type: expense.transaction_type === 'income' ? 'income' : 'expense'
      }))
      
      setTransactions(loadedTransactions)
      setFilteredTransactions(loadedTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setIsUploading(true)
    
    try {
      const text = await file.text()
      console.log('Raw CSV text:', text.substring(0, 500)) // Debug: show first 500 chars
      
      const lines = text.split('\n').filter(line => line.trim()) // Remove empty lines
      console.log('Total lines:', lines.length)
      
      if (lines.length < 2) {
        alert('CSV file appears to be empty or has no data rows')
        return
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      console.log('Headers found:', headers)
      
      // Set debug info for display
      setDebugInfo(`Headers: ${headers.join(', ')}\nTotal lines: ${lines.length - 1} data rows\n\nFirst few rows:\n${lines.slice(1, 4).join('\n')}`)
      
      const newTransactions: Transaction[] = []
      
      // Detect column indices based on headers
      const dateIndex = headers.findIndex(h => h === 'date')
      const nameIndex = headers.findIndex(h => h === 'name' || h === 'description')
      const amountIndex = headers.findIndex(h => h === 'amount')
      const categoryIndex = headers.findIndex(h => h === 'category')
      const parentCategoryIndex = headers.findIndex(h => h === 'parent category')
      const accountIndex = headers.findIndex(h => h === 'account')
      
      console.log('Column indices:', { dateIndex, nameIndex, amountIndex, categoryIndex, accountIndex })
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // Better CSV parsing - handles commas within quoted fields
        const values = parseCsvLine(line)
        console.log(`Row ${i}:`, values)
        
        if (values.length >= 3) { // Minimum columns needed
          // Parse based on detected indices
          const dateStr = dateIndex >= 0 ? values[dateIndex] : values[0]
          const description = nameIndex >= 0 ? values[nameIndex] : values[1]
          const amountStr = amountIndex >= 0 ? values[amountIndex] : values[2]
          const category = categoryIndex >= 0 ? values[categoryIndex] : 'other'
          const parentCategory = parentCategoryIndex >= 0 ? values[parentCategoryIndex] : ''
          const account = accountIndex >= 0 ? values[accountIndex] : 'Unknown Account'
          
          // Parse date
          let parsedDate = dateStr || ''
          if (parsedDate && !parsedDate.includes('-')) {
            // Convert MM/DD/YYYY to YYYY-MM-DD
            const dateParts = parsedDate.split('/')
            if (dateParts.length === 3) {
              parsedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
            }
          }
          
          // Parse amount
          let amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0
          
          // In Copilot Money format, negative amounts are income (like deposits)
          // Positive amounts are expenses
          const isExpense = amount > 0
          
          // Use parent category if available and category is empty or generic
          let finalCategory = category || 'other'
          if (parentCategory && (!category || category === 'Uncategorized')) {
            finalCategory = parentCategory
          }
          
          const transaction: Transaction = {
            id: `${Date.now()}-${i}`,
            date: parsedDate || new Date().toISOString().slice(0, 10),
            description: description || 'Unknown Transaction',
            amount: Math.abs(amount), // Store as positive value
            category: finalCategory.toLowerCase().replace(/\s+/g, '_').replace(/[&]/g, 'and'),
            account: account,
            type: isExpense ? 'expense' : 'income'
          }
          
          console.log('Parsed transaction:', transaction)
          newTransactions.push(transaction)
        }
      }
      
      console.log('Total transactions parsed:', newTransactions.length)
      
      if (newTransactions.length === 0) {
        alert('No valid transactions found in CSV. Please check the format:\nExpected columns: Date, Description, Amount, Category, Account')
        return
      }
      
      // Save to Supabase
      try {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: newTransactions })
        })
        
        if (!response.ok) {
          throw new Error('Failed to save to database')
        }
        
        const result = await response.json()
        console.log('Saved to Supabase:', result)
        
        // Update local state
        setTransactions(prev => [...prev, ...newTransactions])
        setFilteredTransactions(prev => [...prev, ...newTransactions])
        
        alert(`Successfully imported ${result.imported} of ${newTransactions.length} transactions (${result.total - result.imported} duplicates skipped)`)
      } catch (saveError) {
        console.error('Error saving to database:', saveError)
        // Still update local state even if save fails
        setTransactions(prev => [...prev, ...newTransactions])
        setFilteredTransactions(prev => [...prev, ...newTransactions])
        alert(`Imported ${newTransactions.length} transactions locally (database save failed)`)
      }
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert(`Error parsing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }
  
  // Helper function to parse CSV line with proper comma handling
  const parseCsvLine = (line: string): string[] => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handle escaped quotes
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current.trim())
    return values.map(v => v.replace(/^"|"$/g, '')) // Remove surrounding quotes
  }

  const filterTransactions = () => {
    let filtered = transactions

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedMonth) {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth))
    }

    setFilteredTransactions(filtered)
  }

  React.useEffect(() => {
    filterTransactions()
  }, [selectedCategory, searchTerm, selectedMonth, transactions])

  const askAI = async () => {
    if (!aiQuestion.trim()) return
    
    setAiResponse('Analyzing your transactions...')
    
    // Mock AI response - you can integrate with OpenAI or your preferred AI service
    setTimeout(() => {
      const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      
      const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const topCategory = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
          return acc
        }, {} as Record<string, number>)
      
      const topCategoryName = Object.keys(topCategory).reduce((a, b) => 
        topCategory[a] > topCategory[b] ? a : b, ''
      )
      
      setAiResponse(`Based on your ${filteredTransactions.length} transactions:
      
• Total expenses: $${totalExpenses.toFixed(2)}
• Total income: $${totalIncome.toFixed(2)}
• Net: $${(totalIncome - totalExpenses).toFixed(2)}
• Top spending category: ${topCategoryName.replace('_', ' ')} ($${topCategory[topCategoryName]?.toFixed(2) || '0'})

Your question: "${aiQuestion}"

This appears to be related to your spending patterns. Consider reviewing your ${topCategoryName.replace('_', ' ')} expenses for potential savings opportunities.`)
    }, 2000)
  }

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Moe-Money Financial Manager</h1>
            <p className="text-gray-600">Import and analyze your Copilot Money transactions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowReports(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Reports
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Import Transactions</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <p className="text-sm text-gray-500">
          Upload a CSV file from Copilot Money with columns: Date, Description, Amount, Category, Account
        </p>
        
        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Amount</p>
              <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(totalIncome - totalExpenses).toFixed(2)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* AI Chat Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Ask AI About Your Expenses
        </h2>
        
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Ask about your spending patterns, budgeting tips, or expense analysis..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={askAI}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Ask AI
          </button>
        </div>
        
        {aiResponse && (
          <div className="bg-gray-50 rounded-md p-4">
            <pre className="whitespace-pre-wrap text-sm">{aiResponse}</pre>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter Transactions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Class</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={expenseType !== 'business'}
            >
              <option value="">Select Business</option>
              {businessClasses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search descriptions..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            Transactions ({filteredTransactions.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {transaction.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.account}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {transactions.length === 0 
                  ? 'No transactions uploaded yet. Upload a CSV file to get started.'
                  : 'No transactions match your current filters.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <MoeMoneySettings
          onClose={() => setShowSettings(false)}
          onCategoryUpdate={() => {
            loadCategories()
            loadTransactions()
          }}
        />
      )}

      {showReports && (
        <MoeMoneyReports
          onClose={() => setShowReports(false)}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  )
}