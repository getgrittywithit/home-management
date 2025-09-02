'use client'

import React, { useState, useEffect } from 'react'
import { BarChart3, PieChart, TrendingUp, Download, Calendar, DollarSign, Building2, X } from 'lucide-react'

interface ReportData {
  categoryBreakdown: { category: string; amount: number; count: number; color?: string }[]
  businessBreakdown: { business: string; amount: number; count: number }[]
  monthlyTrend: { month: string; expenses: number; income: number }[]
  totalExpenses: number
  totalIncome: number
  netAmount: number
  transactionCount: number
  averageTransaction: number
}

interface MoeMoneyReportsProps {
  onClose: () => void
  selectedMonth: string
}

export default function MoeMoneyReports({ onClose, selectedMonth }: MoeMoneyReportsProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportType, setReportType] = useState<'overview' | 'categories' | 'business' | 'trends'>('overview')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [expenseType, setExpenseType] = useState<'all' | 'personal' | 'business'>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Set default date range to current year
    const currentYear = new Date().getFullYear()
    setDateRange({
      start: `${currentYear}-01-01`,
      end: `${currentYear}-12-31`
    })
    loadReportData()
  }, [])

  const loadReportData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start || `${new Date().getFullYear()}-01-01`,
        endDate: dateRange.end || `${new Date().getFullYear()}-12-31`,
        expenseType
      })

      const response = await fetch(`/api/reports/expenses?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load report data')
      }

      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateCSVReport = () => {
    if (!reportData) return

    const csvContent = [
      'Financial Report',
      `Period: ${dateRange.start} to ${dateRange.end}`,
      `Type: ${expenseType}`,
      '',
      'SUMMARY',
      `Total Expenses,$${reportData.totalExpenses.toFixed(2)}`,
      `Total Income,$${reportData.totalIncome.toFixed(2)}`,
      `Net Amount,$${reportData.netAmount.toFixed(2)}`,
      `Transaction Count,${reportData.transactionCount}`,
      '',
      'CATEGORY BREAKDOWN',
      'Category,Amount,Count,Percentage',
      ...reportData.categoryBreakdown.map(cat => 
        `${cat.category},$${cat.amount.toFixed(2)},${cat.count},${((cat.amount / reportData.totalExpenses) * 100).toFixed(1)}%`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moe-money-report-${dateRange.start}-${dateRange.end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderOverviewReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">${reportData?.totalExpenses.toFixed(2)}</div>
          <div className="text-sm text-red-700">Total Expenses</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">${reportData?.totalIncome.toFixed(2)}</div>
          <div className="text-sm text-green-700">Total Income</div>
        </div>
        <div className={`${reportData?.netAmount && reportData.netAmount >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4 text-center`}>
          <Calendar className="w-8 h-8 mx-auto mb-2" />
          <div className={`text-2xl font-bold ${reportData?.netAmount && reportData.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${reportData?.netAmount.toFixed(2)}
          </div>
          <div className="text-sm">Net Amount</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{reportData?.transactionCount}</div>
          <div className="text-sm text-blue-700">Transactions</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Top Spending Categories</h3>
        <div className="space-y-3">
          {reportData?.categoryBreakdown.slice(0, 5).map((category, index) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-600">#{index + 1}</div>
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                />
                <span className="font-medium capitalize">{category.category.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">${category.amount.toFixed(2)}</div>
                <div className="text-sm text-gray-500">{category.count} transactions</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderCategoryReport = () => (
    <div className="space-y-4">
      {reportData?.categoryBreakdown.map((category) => (
        <div key={category.category} className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color || '#3B82F6' }}
              />
              <span className="font-semibold capitalize">{category.category.replace(/_/g, ' ')}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">${category.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">
                {((category.amount / (reportData?.totalExpenses || 1)) * 100).toFixed(1)}% of total
              </div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: category.color || '#3B82F6',
                width: `${((category.amount / (reportData?.totalExpenses || 1)) * 100)}%`
              }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-1">{category.count} transactions</div>
        </div>
      ))}
    </div>
  )

  const renderBusinessReport = () => (
    <div className="space-y-4">
      {reportData?.businessBreakdown.map((business) => (
        <div key={business.business} className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">{business.business || 'Personal'}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">${business.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">
                {((business.amount / (reportData?.totalExpenses || 1)) * 100).toFixed(1)}% of total
              </div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
                width: `${((business.amount / (reportData?.totalExpenses || 1)) * 100)}%`
              }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-1">{business.count} transactions</div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Financial Reports</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={generateCSVReport}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                disabled={!reportData}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">All Expenses</option>
                <option value="personal">Personal Only</option>
                <option value="business">Business Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadReportData}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="flex border-b">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'categories', name: 'Categories', icon: PieChart },
            { id: 'business', name: 'Business', icon: Building2 },
            { id: 'trends', name: 'Trends', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex-1 px-4 py-3 font-medium transition-colors ${
                reportType === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4 inline mr-2" />
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading report data...</div>
          ) : !reportData ? (
            <div className="text-center py-8 text-gray-500">No data available for the selected period.</div>
          ) : (
            <>
              {reportType === 'overview' && renderOverviewReport()}
              {reportType === 'categories' && renderCategoryReport()}
              {reportType === 'business' && renderBusinessReport()}
              {reportType === 'trends' && (
                <div className="text-center py-8 text-gray-500">
                  Monthly trends chart coming soon...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}