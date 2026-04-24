'use client'

import { useState } from 'react'
import { X, Upload, Loader2, AlertTriangle, Check } from 'lucide-react'

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Keyword → TEFA category inference
function inferCategory(title: string): string {
  const t = title.toLowerCase()
  if (/book|novel|read|story|guide|atlas|encyclopedia/i.test(t)) return 'Nonfiction'
  if (/workbook|worksheet|practice/i.test(t)) return 'Workbooks'
  if (/curriculum|lesson|course/i.test(t)) return 'Curriculum'
  if (/stem|science|experiment|microscope|chemistry|robot/i.test(t)) return 'STEM Kits'
  if (/manipulative|blocks|tiles|counters|abacus/i.test(t)) return 'Learning Manipulatives'
  if (/art|paint|crayon|marker|canvas|easel|craft/i.test(t)) return 'Art Supplies'
  if (/guitar|piano|keyboard|drum|ukulele|flute|recorder/i.test(t)) return 'Keyboard Instruments'
  if (/laptop|tablet|ipad|chromebook|computer/i.test(t)) return 'Laptops'
  if (/headphone|webcam|mouse|keyboard|monitor/i.test(t)) return 'Computer Accessories'
  if (/software|app|subscription|program/i.test(t)) return 'Software Programs'
  if (/sport|ball|bat|glove|net|goal|jump rope/i.test(t)) return 'Sporting Equipment'
  if (/supply|pencil|pen|eraser|notebook|folder|binder/i.test(t)) return 'School Supplies'
  if (/printer|ink|toner|paper/i.test(t)) return 'Printer Supplies'
  if (/calculator/i.test(t)) return 'Calculators'
  return 'Educational Material Kits'
}

interface WishlistItem {
  name: string
  price: number | null
  category: string
  url: string
  include: boolean
}

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function AmazonImportModal({ onClose, onImported }: Props) {
  const [kid, setKid] = useState('amos')
  const [rawText, setRawText] = useState('')
  const [items, setItems] = useState<WishlistItem[]>([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)

  const parseInput = () => {
    const lines = rawText.trim().split('\n').filter(l => l.trim())
    const parsed: WishlistItem[] = []

    for (const line of lines) {
      // Try CSV format: "name","price","url" or name,price,url
      const csvMatch = line.match(/^"?([^",]+)"?\s*,\s*"?\$?([\d.]+)"?\s*(?:,\s*"?(.+?)"?)?$/)
      if (csvMatch) {
        parsed.push({
          name: csvMatch[1].trim(),
          price: parseFloat(csvMatch[2]) || null,
          category: inferCategory(csvMatch[1]),
          url: csvMatch[3]?.trim() || '',
          include: true,
        })
        continue
      }

      // Try "Name  $XX.XX" or "Name - $XX.XX" format (Amazon paste)
      const priceMatch = line.match(/^(.+?)\s+[-–—]?\s*\$?([\d,]+\.?\d*)\s*$/)
      if (priceMatch) {
        parsed.push({
          name: priceMatch[1].trim(),
          price: parseFloat(priceMatch[2].replace(',', '')) || null,
          category: inferCategory(priceMatch[1]),
          url: '',
          include: true,
        })
        continue
      }

      // Plain text line (just a name, no price)
      if (line.trim().length > 3 && !/^(qty|quantity|price|item|product|name)$/i.test(line.trim())) {
        parsed.push({
          name: line.trim(),
          price: null,
          category: inferCategory(line),
          url: '',
          include: true,
        })
      }
    }

    setItems(parsed)
    setParsed(true)
  }

  const doImport = async () => {
    const toImport = items.filter(i => i.include)
    if (toImport.length === 0) return
    setImporting(true)
    try {
      let count = 0
      for (const item of toImport) {
        await fetch('/api/curriculum-planner', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_purchase',
            kid_name: kid,
            school_year: '2026-27',
            tefa_category: item.category,
            item_name: item.name,
            vendor: 'Amazon',
            estimated_cost: item.price || 0,
            status: 'wishlist',
            notes: item.url ? `Amazon: ${item.url}` : 'Imported from Amazon wishlist',
          }),
        })
        count++
      }
      setResult({ count })
      setTimeout(onImported, 1500)
    } finally { setImporting(false) }
  }

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, include: !item.include } : item))
  }

  const updateCategory = (idx: number, category: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, category } : item))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Import Amazon Wishlist</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Warning about TEFA + Amazon */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Amazon is not a direct TEFA vendor. These purchases go through the reimbursement route:
            buy with personal funds, then submit receipt to Odyssey for TEFA reimbursement.
            Confirm current policy at help.tx@withodyssey.com.
          </div>

          {/* Kid selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Budget this against</label>
            <div className="flex gap-2 mt-1">
              {HOMESCHOOL_KIDS.map(k => (
                <button key={k} onClick={() => setKid(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${kid === k ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {cap(k)}
                </button>
              ))}
            </div>
          </div>

          {!parsed ? (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Paste wishlist items (one per line, or CSV)
                </label>
                <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={8}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-xs font-mono"
                  placeholder={"Schleich Ocean Animals Set  $24.99\nNational Geographic Ocean Book  $12.95\nTide Pool Field Guide  $8.99\n\nOR CSV format:\nname,price,url\nSchleich Ocean Set,24.99,https://..."} />
              </div>
              <button onClick={parseInput} disabled={!rawText.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                Parse & Preview
              </button>
            </>
          ) : result ? (
            <div className="text-center py-8">
              <Check className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
              <p className="font-medium text-slate-800">Imported {result.count} item{result.count !== 1 ? 's' : ''} to {cap(kid)}&apos;s wishlist</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">{items.filter(i => i.include).length} of {items.length} items selected</p>
              <div className="border rounded-lg overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b">
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-left">Category</th>
                  </tr></thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className={`border-b ${!item.include ? 'opacity-40' : ''}`}>
                        <td className="p-2">
                          <input type="checkbox" checked={item.include} onChange={() => toggleItem(idx)}
                            className="rounded border-slate-300 text-purple-600" />
                        </td>
                        <td className="p-2 text-slate-800">{item.name}</td>
                        <td className="p-2 text-right text-slate-600">{item.price ? `$${item.price.toFixed(2)}` : '—'}</td>
                        <td className="p-2">
                          <select value={item.category} onChange={e => updateCategory(idx, e.target.value)}
                            className="text-xs border rounded px-1 py-0.5 w-full">
                            {['Nonfiction','Fiction','Workbooks','Curriculum','STEM Kits','Learning Manipulatives',
                              'Art Supplies','School Supplies','Educational Material Kits','Keyboard Instruments',
                              'Sporting Equipment','Laptops','Computer Accessories','Software Programs','Other'].map(c =>
                              <option key={c} value={c}>{c}</option>
                            )}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setParsed(false); setItems([]) }}
                  className="px-4 py-2 text-sm text-slate-600 border rounded-lg">Back to Edit</button>
                <button onClick={doImport} disabled={importing || items.filter(i => i.include).length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Import {items.filter(i => i.include).length} Items to {cap(kid)}&apos;s Wishlist
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
