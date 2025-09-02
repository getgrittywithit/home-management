'use client'

import React, { useState, useRef } from 'react'
import { Upload, Download, MessageSquare, TrendingUp, DollarSign, Calendar, Search } from 'lucide-react'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = [
    'all',
    'housing',
    'transportation', 
    'food_dining',
    'utilities',
    'healthcare',
    'entertainment',
    'shopping',
    'personal_care',
    'education',
    'savings',
    'income',
    'other'
  ]

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setIsUploading(true)
    
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const newTransactions: Transaction[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (values.length >= 4) {
          const transaction: Transaction = {
            id: `${Date.now()}-${i}`,
            date: values[0] || new Date().toISOString().slice(0, 10),
            description: values[1] || 'Unknown',
            amount: parseFloat(values[2]) || 0,
            category: values[3]?.toLowerCase().replace(/\s+/g, '_') || 'other',
            account: values[4] || 'Unknown',
            type: parseFloat(values[2]) >= 0 ? 'income' : 'expense'
          }
          newTransactions.push(transaction)
        }
      }
      
      setTransactions(prev => [...prev, ...newTransactions])
      setFilteredTransactions(prev => [...prev, ...newTransactions])
      alert(`Successfully imported ${newTransactions.length} transactions`)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert('Error parsing CSV file. Please check the format.')
    } finally {
      setIsUploading(false)
    }
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Moe-Money Financial Manager</h1>
        <p className="text-gray-600">Import and analyze your Copilot Money transactions</p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
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
    </div>
  )
}