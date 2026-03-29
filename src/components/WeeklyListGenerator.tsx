'use client'

import { useState, useEffect } from 'react'
import {
  ShoppingCart, CheckCircle2, Circle, ChevronDown, ChevronUp,
  RefreshCw, Share2, ListChecks, Package, Copy, Send, X, Check, Settings
} from 'lucide-react'
import { getGrocerySettings } from './GrocerySettings'

interface ListItem {
  name: string
  quantity: number
  unit: string
  department: string
  in_stock: boolean
  avg_price: number | null
  checked?: boolean
}

interface WeeklyListData {
  walmart_items: ListItem[]
  heb_items: ListItem[]
  in_stock: ListItem[]
  estimated_walmart: number
  estimated_heb: number
  meal_count: number
}

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function getWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function groupByDepartment(items: ListItem[]): Record<string, ListItem[]> {
  const groups: Record<string, ListItem[]> = {}
  for (const item of items) {
    const dept = item.department || 'Other'
    if (!groups[dept]) groups[dept] = []
    groups[dept].push(item)
  }
  return groups
}

export default function WeeklyListGenerator() {
  const [weekStart] = useState(() => getMonday(new Date()))
  const [data, setData] = useState<WeeklyListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [showInStock, setShowInStock] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [appleNotesModal, setAppleNotesModal] = useState(false)
  const [anylistModal, setAnylistModal] = useState(false)
  const [appleNotesText, setAppleNotesText] = useState('')
  const [anylistData, setAnylistData] = useState<{ walmart_text: string; heb_text: string; walmart_count: number; heb_count: number } | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [anylistTab, setAnylistTab] = useState<'walmart' | 'heb'>('walmart')

  useEffect(() => {
    fetchList()
  }, [weekStart])

  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/grocery?action=generate_weekly_list&weekStart=${weekStart}`)
      const json = await res.json()
      if (!json.error) setData(json)
    } catch {}
    setLoading(false)
  }

  const toggleItem = (store: string, name: string) => {
    const key = `${store}:${name}`
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  const totalItems = (data?.walmart_items.length || 0) + (data?.heb_items.length || 0)
  const checkedCount = checkedItems.size

  const renderStoreSection = (
    items: ListItem[],
    store: string,
    headerColor: string,
    headerBg: string,
    estimated: number,
  ) => {
    if (items.length === 0) return null
    const groups = groupByDepartment(items)
    const deptNames = Object.keys(groups).sort()

    return (
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className={`px-4 py-3 ${headerBg}`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-bold ${headerColor} flex items-center gap-2`}>
              <ShoppingCart className="w-4 h-4" />
              {store}
            </h3>
            <div className={`text-sm ${headerColor}`}>
              {items.length} items {estimated > 0 && `· ~$${estimated.toFixed(2)}`}
            </div>
          </div>
        </div>
        <div className="divide-y">
          {deptNames.map(dept => (
            <div key={dept}>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {dept}
              </div>
              {groups[dept].map(item => {
                const key = `${store}:${item.name}`
                const isChecked = checkedItems.has(key)
                return (
                  <button
                    key={item.name}
                    onClick={() => toggleItem(store, item.name)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`flex-1 text-sm ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {item.quantity} {item.unit}
                    </span>
                    {item.avg_price && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ~${item.avg_price.toFixed(2)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-green-600" />
            This Week&apos;s Shopping List
          </h2>
          <p className="text-sm text-gray-500">{getWeekRange(weekStart)}</p>
        </div>
        <button
          onClick={fetchList}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Summary */}
      {data && totalItems > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-green-800">
            <span className="font-semibold">{totalItems}</span> items needed from <span className="font-semibold">{data.meal_count}</span> meals
          </div>
          <div className="text-sm font-semibold text-green-700">
            {checkedCount}/{totalItems} checked
          </div>
        </div>
      )}

      {/* Store lists */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderStoreSection(data.walmart_items, 'Walmart Pickup', 'text-blue-700', 'bg-blue-50', data.estimated_walmart)}
          {renderStoreSection(data.heb_items, 'H-E-B Run', 'text-red-700', 'bg-red-50', data.estimated_heb)}
        </div>
      )}

      {/* In-stock items */}
      {data && data.in_stock.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowInStock(!showInStock)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Already In Stock ({data.in_stock.length} items)
              </span>
            </div>
            {showInStock ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showInStock && (
            <div className="border-t divide-y">
              {data.in_stock.map(item => (
                <div key={item.name} className="px-4 py-2 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-500 line-through flex-1">{item.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">In Stock</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            setExportLoading(true)
            try {
              const res = await fetch(`/api/grocery?action=export_apple_notes&weekStart=${weekStart}`)
              const json = await res.json()
              setAppleNotesText(json.text || 'No items to export.')
              setAppleNotesModal(true)
            } catch {
              showToast('Failed to generate Apple Notes export')
            }
            setExportLoading(false)
          }}
          disabled={exportLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Share2 className="w-4 h-4" />
          Send to Apple Notes
        </button>
        <button
          onClick={async () => {
            const settings = getGrocerySettings()
            if (!settings.anylist_email) {
              showToast('Set up AnyList email in Settings first')
              return
            }
            setExportLoading(true)
            try {
              const res = await fetch(`/api/grocery?action=export_anylist&weekStart=${weekStart}`)
              const json = await res.json()
              setAnylistData(json)
              setAnylistTab(json.walmart_count > 0 ? 'walmart' : 'heb')
              setAnylistModal(true)
            } catch {
              showToast('Failed to generate AnyList export')
            }
            setExportLoading(false)
          }}
          disabled={exportLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Send to AnyList
        </button>
      </div>

      {/* Apple Notes Modal */}
      {appleNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-green-600" />
                Apple Notes Export
              </h3>
              <button onClick={() => { setAppleNotesModal(false); setCopied(false) }} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 border">
                {appleNotesText}
              </pre>
            </div>
            <div className="px-4 py-3 border-t flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(appleNotesText)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  } catch {
                    showToast('Failed to copy — try selecting the text manually')
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={() => { setAppleNotesModal(false); setCopied(false) }}
                className="px-4 py-2.5 text-gray-600 text-sm font-medium hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AnyList Modal */}
      {anylistModal && anylistData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                Send to AnyList
              </h3>
              <button onClick={() => { setAnylistModal(false); setCopied(false) }} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              <p className="text-xs text-gray-500">
                AnyList email: <span className="font-medium text-gray-700">{getGrocerySettings().anylist_email}</span>
              </p>
              {/* Store tabs */}
              <div className="flex gap-2">
                {anylistData.walmart_count > 0 && (
                  <button
                    onClick={() => setAnylistTab('walmart')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      anylistTab === 'walmart' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Walmart ({anylistData.walmart_count})
                  </button>
                )}
                {anylistData.heb_count > 0 && (
                  <button
                    onClick={() => setAnylistTab('heb')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      anylistTab === 'heb' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    H-E-B ({anylistData.heb_count})
                  </button>
                )}
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 border">
                {anylistTab === 'walmart' ? anylistData.walmart_text : anylistData.heb_text}
              </pre>
              {(anylistTab === 'walmart' ? anylistData.walmart_text : anylistData.heb_text) === '' && (
                <p className="text-xs text-gray-400 text-center py-2">No items for this store</p>
              )}
            </div>
            <div className="px-4 py-3 border-t flex items-center gap-3">
              <button
                onClick={async () => {
                  const text = anylistTab === 'walmart' ? anylistData.walmart_text : anylistData.heb_text
                  const listName = anylistTab === 'walmart' ? 'Walmart Pickup' : 'H-E-B Run'
                  try {
                    const res = await fetch('/api/grocery', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'send_anylist_email',
                        email: getGrocerySettings().anylist_email,
                        list_name: listName,
                        items_text: text,
                      }),
                    })
                    const json = await res.json()
                    if (json.success) {
                      // Copy the email text since SMTP is not yet configured
                      await navigator.clipboard.writeText(json.text)
                      setCopied(true)
                      showToast('Email text copied — paste into your email app to send to AnyList')
                      setTimeout(() => setCopied(false), 2000)
                    }
                  } catch {
                    showToast('Failed to send — try copying manually')
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {copied ? 'Copied Email Text!' : 'Send to AnyList'}
              </button>
              <button
                onClick={() => { setAnylistModal(false); setCopied(false) }}
                className="px-4 py-2.5 text-gray-600 text-sm font-medium hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data && totalItems === 0 && (
        <div className="text-center py-8 text-gray-400">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No items on this week&apos;s list</p>
          <p className="text-xs mt-1">Approve meals in the Meal Plan tab and add ingredients to generate a list</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-fadeIn">
          {toast}
        </div>
      )}
    </div>
  )
}
