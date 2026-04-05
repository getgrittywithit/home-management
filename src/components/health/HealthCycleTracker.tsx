'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface HealthCycleTrackerProps {
  overview: any
  onRefresh: () => void
  onError: (msg: string) => void
}

const PRODUCT_LABELS: Record<string, string> = {
  pad_regular: 'Regular Pad', pad_overnight: 'Overnight Pad', pad_thin: 'Thin Pad',
  tampon_light: 'Tampon (Light)', tampon_regular: 'Tampon (Regular)', tampon_heavy: 'Tampon (Heavy)',
  liner: 'Liner', heating_pad: 'Heating Pad', heat_patch: 'Heat Patch',
  epsom_bath: 'Epsom Bath', gel_cream: 'Gel/Cream', other: 'Other',
}
const PRODUCT_TYPES = Object.keys(PRODUCT_LABELS)
const MED_OPTIONS = ['tylenol', 'ibuprofen', 'midol', 'naproxen', 'tums', 'pepto', 'other']
const TIME_OPTIONS = ['morning', 'afternoon', 'evening', 'bedtime']

const TIP_CARDS = [
  { title: '\uD83C\uDF0A Understanding Flow Types', body: 'Flow can be light, medium, or heavy \u2014 and it changes day to day. Day 1-2 is usually heaviest. Light days near the end are normal. If you soak through a pad in under 2 hours, that\u2019s very heavy \u2014 tell Mom so we can talk to your doctor.' },
  { title: '\uD83D\uDECF\uFE0F Choosing the Right Product', body: 'Bedtime: Overnight pads (longer, more absorbent). School/Active day: Regular pads or tampons. Light days: Thin pads or liners. Swimming: Tampons only (pads don\u2019t work in water). Cramp days: Heating pad on lower belly + comfy clothes. Bad cramp days: Epsom salt bath (ask Mom to run one).' },
  { title: '\uD83E\uDD57 Food & Exercise for Better Periods', body: 'Helps cramps: Bananas (potassium), dark chocolate (magnesium), warm herbal tea, salmon/nuts (omega-3). Helps mood: Walking, stretching, yoga \u2014 even 10 minutes helps. Drink extra water during your period. Avoid if cramps are bad: Too much salt, caffeine, sugary snacks (can make bloating worse).' },
  { title: '\uD83E\uDDF4 Care & Hygiene Tips', body: 'Change pads every 3-4 hours (more often on heavy days). Wrap used products in toilet paper before putting in trash \u2014 never flush. Wash with warm water and mild soap (no fragranced products). If you notice a strong or unusual smell, or itching, tell Mom \u2014 it might just need a simple fix.' },
]

export default function HealthCycleTracker({ overview, onRefresh, onError }: HealthCycleTrackerProps) {
  const [addingKid, setAddingKid] = useState(false)
  const [selectedKid, setSelectedKid] = useState('')
  const [reportKid, setReportKid] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

  // Product + OTC state per kid
  const [productData, setProductData] = useState<Record<string, any[]>>({})
  const [otcData, setOtcData] = useState<Record<string, any[]>>({})
  const [showProductForm, setShowProductForm] = useState<string | null>(null)
  const [showOtcForm, setShowOtcForm] = useState<string | null>(null)
  const [expandedTips, setExpandedTips] = useState<Record<number, boolean>>({})

  // Product form state
  const [pDate, setPDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [pType, setPType] = useState('pad_regular')
  const [pQty, setPQty] = useState(1)
  const [pNotes, setPNotes] = useState('')

  // OTC form state
  const [oDate, setODate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [oMed, setOMed] = useState('ibuprofen')
  const [oDosage, setODosage] = useState('')
  const [oTime, setOTime] = useState('morning')
  const [oHelped, setOHelped] = useState<boolean | null>(null)
  const [oNotes, setONotes] = useState('')

  const settings = overview?.settings || []
  const irrCounts = overview?.irregularityCounts || {}
  const toDateStr = (d: any): string => {
    if (!d) return ''
    if (typeof d === 'string') return d.slice(0, 10)
    try { return new Date(d).toISOString().slice(0, 10) } catch { return '' }
  }
  const recentLogs = (overview?.recentLogs || []).map((l: any) => ({ ...l, event_date: toDateStr(l.event_date) }))
  const trackedKids = settings.map((s: any) => s.kid_name)
  const availableKids = ALL_KIDS.filter(k => !trackedKids.includes(k))

  const logsByKid: Record<string, any[]> = {}
  recentLogs.forEach((l: any) => {
    if (!logsByKid[l.kid_name]) logsByKid[l.kid_name] = []
    logsByKid[l.kid_name].push(l)
  })

  const postAction = async (body: any) => {
    const res = await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json()
  }

  const handleDeleteEntry = async (entryId: number) => {
    try { await postAction({ action: 'delete_cycle_entry', entryId }); onRefresh() }
    catch { onError('Failed to delete entry') }
  }

  const handleToggleMode = async (kid: string, currentMode: string) => {
    const newMode = currentMode === 'full' ? 'learning' : 'full'
    try { await postAction({ action: 'update_cycle_mode', child: kid, mode: newMode }); onRefresh() }
    catch { onError('Failed to update mode') }
  }

  const handleAddKid = async () => {
    if (!selectedKid) return
    try { await postAction({ action: 'add_kid_to_cycle_tracker', child: selectedKid }); setAddingKid(false); setSelectedKid(''); onRefresh() }
    catch { onError('Failed to add kid') }
  }

  const handleGenerateReport = async (kid: string) => {
    setReportKid(kid); setReportLoading(true); setReportData(null)
    try { setReportData(await postAction({ action: 'generate_cycle_report', child: kid })) }
    catch { onError('Failed to generate report') }
    setReportLoading(false)
  }

  // ── Product + OTC fetching ──
  const fetchProducts = async (kid: string) => {
    try {
      const data = await postAction({ action: 'get_cycle_products', child: kid, days: 90 })
      setProductData(prev => ({ ...prev, [kid]: data.products || [] }))
    } catch { /* silent */ }
  }

  const fetchOtc = async (kid: string) => {
    try {
      const data = await postAction({ action: 'get_cycle_otc', child: kid, days: 90 })
      setOtcData(prev => ({ ...prev, [kid]: data.otcMeds || [] }))
    } catch { /* silent */ }
  }

  const loadKidExtras = (kid: string) => {
    if (!productData[kid]) fetchProducts(kid)
    if (!otcData[kid]) fetchOtc(kid)
  }

  const handleLogProduct = async (kid: string) => {
    try {
      await postAction({ action: 'log_cycle_product', child: kid, logDate: pDate, productType: pType, quantity: pQty, notes: pNotes || undefined })
      setShowProductForm(null); setPNotes(''); setPQty(1)
      fetchProducts(kid)
    } catch { onError('Failed to log product') }
  }

  const handleDeleteProduct = async (kid: string, entryId: number) => {
    try { await postAction({ action: 'delete_cycle_product', entryId }); fetchProducts(kid) }
    catch { onError('Failed to delete') }
  }

  const handleLogOtc = async (kid: string) => {
    try {
      await postAction({ action: 'log_cycle_otc', child: kid, logDate: oDate, medication: oMed, dosage: oDosage || undefined, timeTaken: oTime, helped: oHelped, notes: oNotes || undefined })
      setShowOtcForm(null); setODosage(''); setONotes(''); setOHelped(null)
      fetchOtc(kid)
    } catch { onError('Failed to log medication') }
  }

  const handleDeleteOtc = async (kid: string, entryId: number) => {
    try { await postAction({ action: 'delete_cycle_otc', entryId }); fetchOtc(kid) }
    catch { onError('Failed to delete') }
  }

  const buildReportText = (kid: string, data: any) => {
    const s = data.settings
    const logs = (data.logs || []).map((l: any) => ({ ...l, event_date: toDateStr(l.event_date) }))
    const symptoms = (data.symptoms || []).map((sym: any) => ({ ...sym, log_date: toDateStr(sym.log_date) }))
    const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
    const starts = logs.filter((l: any) => l.event_type === 'start').map((l: any) => l.event_date).sort()
    const ends = logs.filter((l: any) => l.event_type === 'end').map((l: any) => l.event_date).sort()

    if (starts.length < 2) return `${capName} \u2014 Cycle Summary\n\nNot enough data yet \u2014 keep tracking and this report will fill in over time.`

    let totalGap = 0
    for (let i = 1; i < starts.length; i++) { totalGap += (new Date(starts[i] + 'T12:00:00').getTime() - new Date(starts[i-1] + 'T12:00:00').getTime()) / 86400000 }
    const avgCycle = Math.round(totalGap / (starts.length - 1))

    let totalDur = 0, durCount = 0
    starts.forEach((st: string) => {
      const end = ends.find((e: string) => e >= st)
      if (end) { totalDur += (new Date(end + 'T12:00:00').getTime() - new Date(st + 'T12:00:00').getTime()) / 86400000 + 1; durCount++ }
    })
    const avgDur = durCount > 0 ? Math.round(totalDur / durCount) : (s?.avg_period_duration || 5)
    const regLabel = s?.cycle_regularity === 'regular' ? 'Regular' : s?.cycle_regularity === 'irregular' ? 'Irregular' : s?.cycle_regularity === 'varies' ? 'Varies' : 'Unknown'

    const allIrr: Record<string, number> = {}
    symptoms.forEach((sym: any) => { (sym.irregularities || []).forEach((ir: string) => { allIrr[ir] = (allIrr[ir] || 0) + 1 }) })
    const irrLines = Object.entries(allIrr).map(([k, v]) => `  - ${k} (${v}x)`).join('\n')
    const commonSym = (s?.common_symptoms || []).join(', ')
    const noteLines = symptoms.filter((sym: any) => sym.notes).map((sym: any) => `  ${sym.log_date}: ${sym.notes}`).join('\n')

    let report = `${capName} \u2014 Cycle Summary\nDate range: last 6 months\n\n`
    report += `Average cycle length: ${avgCycle} days\nAverage period duration: ${avgDur} days\nCycle regularity: ${regLabel}\n\n`
    report += `Periods logged: ${starts.length}\n`
    if (irrLines) { report += `\nIrregularities reported:\n${irrLines}\n` }
    if (commonSym) { report += `\nMost common symptoms: ${commonSym}\n` }
    if (noteLines) { report += `\nCheck-in notes:\n${noteLines}\n` }

    // Product summary
    const prods = data.products || []
    if (prods.length > 0) {
      report += `\nProduct Usage Summary (last 6 months):\n`
      prods.forEach((p: any) => { report += `  ${PRODUCT_LABELS[p.product_type] || p.product_type}: ${p.total}\n` })
    }

    // OTC summary
    const otc = data.otcMeds || []
    if (otc.length > 0) {
      report += `\nOTC Medication Summary (last 6 months):\n`
      otc.forEach((m: any) => {
        const pct = m.count > 0 ? Math.round((m.helped_count / m.count) * 100) : 0
        report += `  ${m.medication.charAt(0).toUpperCase() + m.medication.slice(1)}: ${m.count} doses (${pct}% helped)\n`
      })
    }

    return report
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{'\uD83C\uDF38'} Cycle Tracker</h3>
        {availableKids.length > 0 && (
          <button onClick={() => setAddingKid(!addingKid)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 transition">
            <Plus className="w-4 h-4" />Add to Tracker
          </button>
        )}
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
        Cycle data is private to each child&apos;s profile and is not visible to other kids.
      </div>

      {addingKid && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
            <option value="">Select child...</option>
            {availableKids.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <p className="text-xs text-gray-500">Will start in Learning Mode \u2014 informational only, no tracking.</p>
          <div className="flex gap-2">
            <button onClick={handleAddKid} disabled={!selectedKid}
              className="flex-1 bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition disabled:opacity-50">Add</button>
            <button onClick={() => setAddingKid(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">Cancel</button>
          </div>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="bg-white rounded-lg p-8 shadow-sm border text-center text-gray-400">No kids added to cycle tracker yet.</div>
      ) : (
        settings.map((s: any) => {
          const capName = s.kid_name.charAt(0).toUpperCase() + s.kid_name.slice(1)
          const kidLogs = (logsByKid[s.kid_name] || []).slice(0, 6)
          const hasIrregularities = (irrCounts[s.kid_name] || 0) >= 2
          const isFullMode = s.mode === 'full' && s.onboarded

          // Lazy-load product + OTC data when card renders in full mode
          if (isFullMode && !productData[s.kid_name]) { loadKidExtras(s.kid_name) }

          const kidProducts = productData[s.kid_name] || []
          const kidOtc = otcData[s.kid_name] || []

          return (
            <div key={s.kid_name} className="bg-white rounded-lg p-5 shadow-sm border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{capName}</h4>
                  {hasIrregularities && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{'\u26A0'} patterns to review</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.mode === 'full' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.mode === 'full' ? 'Full Tracking' : 'Learning Mode'}
                  </span>
                  <button onClick={() => handleToggleMode(s.kid_name, s.mode)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                    Switch to {s.mode === 'full' ? 'Learning' : 'Full'}
                  </button>
                </div>
              </div>

              {isFullMode && (
                <div className="flex gap-3 text-xs text-gray-500">
                  {s.cycle_regularity && s.cycle_regularity !== 'unknown' && <span>Regularity: {s.cycle_regularity}</span>}
                  {s.avg_period_duration && <span>Avg duration: ~{s.avg_period_duration}d</span>}
                  {s.common_symptoms?.length > 0 && <span>Symptoms: {s.common_symptoms.join(', ')}</span>}
                </div>
              )}

              {kidLogs.length > 0 ? (
                <div className="space-y-1">
                  {kidLogs.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between text-sm text-gray-600 group">
                      <span>
                        {entry.event_type === 'start' ? '\uD83D\uDD34 Started' : '\u26AA Ended'}{' '}
                        {new Date(entry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button onClick={() => handleDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition" title="Delete this entry">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No cycles logged yet</p>
              )}

              {/* ── Product Usage Section ── */}
              {isFullMode && (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-700">{'\uD83E\uDE79'} Product Usage</h5>
                    <button onClick={() => setShowProductForm(showProductForm === s.kid_name ? null : s.kid_name)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                      {showProductForm === s.kid_name ? 'Cancel' : '+ Log Product'}
                    </button>
                  </div>

                  {/* Product summary bar */}
                  {kidProducts.length > 0 && (() => {
                    const counts: Record<string, number> = {}
                    kidProducts.forEach((p: any) => { counts[p.product_type] = (counts[p.product_type] || 0) + (p.quantity || 1) })
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(counts).slice(0, 6).map(([type, ct]) => (
                          <span key={type} className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                            {PRODUCT_LABELS[type] || type}: {ct}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

                  {showProductForm === s.kid_name && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <input type="date" value={pDate} onChange={e => setPDate(e.target.value)}
                          className="border rounded px-2 py-1 text-sm" />
                        <select value={pType} onChange={e => setPType(e.target.value)}
                          className="border rounded px-2 py-1 text-sm flex-1">
                          {PRODUCT_TYPES.map(t => <option key={t} value={t}>{PRODUCT_LABELS[t]}</option>)}
                        </select>
                        <input type="number" min={1} max={20} value={pQty} onChange={e => setPQty(Number(e.target.value))}
                          className="border rounded px-2 py-1 text-sm w-14" />
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={pNotes} onChange={e => setPNotes(e.target.value)}
                          placeholder="Notes (optional)" className="border rounded px-2 py-1 text-sm flex-1" />
                        <button onClick={() => handleLogProduct(s.kid_name)}
                          className="bg-rose-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-rose-600">Save</button>
                      </div>
                    </div>
                  )}

                  {kidProducts.slice(0, 10).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 group">
                      <span>
                        {toDateStr(p.log_date)} \u2014 {PRODUCT_LABELS[p.product_type] || p.product_type} x{p.quantity || 1}
                        {p.notes && <span className="text-gray-400 ml-1">({p.notes})</span>}
                      </span>
                      <button onClick={() => handleDeleteProduct(s.kid_name, p.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── OTC Medication Section ── */}
              {isFullMode && (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-700">{'\uD83D\uDC8A'} OTC Medications</h5>
                    <button onClick={() => setShowOtcForm(showOtcForm === s.kid_name ? null : s.kid_name)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                      {showOtcForm === s.kid_name ? 'Cancel' : '+ Log Medication'}
                    </button>
                  </div>

                  {showOtcForm === s.kid_name && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <input type="date" value={oDate} onChange={e => setODate(e.target.value)}
                          className="border rounded px-2 py-1 text-sm" />
                        <select value={oMed} onChange={e => setOMed(e.target.value)}
                          className="border rounded px-2 py-1 text-sm flex-1">
                          {MED_OPTIONS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                        </select>
                        <input type="text" value={oDosage} onChange={e => setODosage(e.target.value)}
                          placeholder="Dosage" className="border rounded px-2 py-1 text-sm w-24" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <select value={oTime} onChange={e => setOTime(e.target.value)}
                          className="border rounded px-2 py-1 text-sm">
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs">
                          <span>Helped?</span>
                          <select value={oHelped === null ? '' : oHelped ? 'yes' : 'no'}
                            onChange={e => setOHelped(e.target.value === '' ? null : e.target.value === 'yes')}
                            className="border rounded px-1 py-0.5 text-xs">
                            <option value="">-</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </label>
                        <input type="text" value={oNotes} onChange={e => setONotes(e.target.value)}
                          placeholder="Notes" className="border rounded px-2 py-1 text-sm flex-1" />
                        <button onClick={() => handleLogOtc(s.kid_name)}
                          className="bg-rose-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-rose-600">Save</button>
                      </div>
                    </div>
                  )}

                  {kidOtc.slice(0, 10).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-xs text-gray-600 group">
                      <span>
                        {toDateStr(m.log_date)} \u2014 {m.medication?.charAt(0).toUpperCase() + m.medication?.slice(1)}
                        {m.dosage && ` ${m.dosage}`}
                        {m.time_taken && ` (${m.time_taken})`}
                        {m.helped === true && ' \u2705'}
                        {m.helped === false && ' \u274C'}
                        {m.notes && <span className="text-gray-400 ml-1">({m.notes})</span>}
                      </span>
                      <button onClick={() => handleDeleteOtc(s.kid_name, m.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Report button */}
              {s.mode === 'full' && (
                <div className="border-t pt-3">
                  <button onClick={() => handleGenerateReport(s.kid_name)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                    Generate Report
                  </button>
                </div>
              )}

              {reportKid === s.kid_name && (reportLoading ? (
                <div className="text-sm text-gray-400">Generating report...</div>
              ) : reportData ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{buildReportText(s.kid_name, reportData)}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(buildReportText(s.kid_name, reportData)) }}
                    className="mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium">Copy to clipboard</button>
                </div>
              ) : null)}
            </div>
          )
        })
      )}

      {/* ── Tip Cards ── */}
      {settings.some((s: any) => s.mode === 'full') && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">{'\uD83D\uDCA1'} Tips & Info</h4>
          {TIP_CARDS.map((card, idx) => (
            <div key={idx} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <button onClick={() => setExpandedTips(prev => ({ ...prev, [idx]: !prev[idx] }))}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition">
                <span>{card.title}</span>
                {expandedTips[idx] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {expandedTips[idx] && (
                <div className="px-4 pb-3 text-sm text-gray-600 leading-relaxed">{card.body}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
