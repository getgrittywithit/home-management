'use client'

import { useState, useEffect } from 'react'
import { Droplets, Minus, AlertTriangle, XOctagon } from 'lucide-react'

interface HydrationTrackerProps {
  kidName: string
}

const CUP_SIZES = [
  { oz: 4, label: '4 oz', desc: 'tiny' },
  { oz: 8, label: '8 oz', desc: 'small' },
  { oz: 12, label: '12 oz', desc: 'medium' },
  { oz: 16, label: '16 oz', desc: 'large' },
  { oz: 32, label: '32 oz', desc: 'XL' },
]

export default function HydrationTracker({ kidName }: HydrationTrackerProps) {
  const [ozLogged, setOzLogged] = useState(0)
  const [goalOz, setGoalOz] = useState(64)
  const [warning, setWarning] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState(8)
  const [customOz, setCustomOz] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const kid = kidName.toLowerCase()

  useEffect(() => {
    fetch(`/api/hydration?action=get_today&kid_name=${kid}`)
      .then(r => r.json())
      .then(data => {
        if (data.hydration) {
          setOzLogged(data.hydration.oz_logged || 0)
          setGoalOz(data.hydration.goal_oz || 64)
          setWarning(data.hydration.warning_level)
          setBlocked(data.hydration.warning_level === 'blocked')
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kid])

  const logWater = async (oz: number) => {
    if (blocked) return
    setOzLogged(prev => prev + oz)
    const res = await fetch('/api/hydration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_water', kid_name: kid, amount_oz: oz, cup_size_oz: oz }),
    }).then(r => r.json()).catch(() => null)

    if (res?.hydration) {
      setOzLogged(res.hydration.oz_logged)
      setWarning(res.hydration.warning_level)
      setBlocked(res.hydration.warning_level === 'blocked')
    }
    if (res?.blocked) {
      setBlocked(true)
      setWarning('blocked')
    }
  }

  const removeWater = async () => {
    if (ozLogged <= 0) return
    const removeAmt = selectedSize
    setOzLogged(prev => Math.max(0, prev - removeAmt))
    const res = await fetch('/api/hydration', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_water', kid_name: kid, amount_oz: removeAmt }),
    }).then(r => r.json()).catch(() => null)
    if (res?.hydration) {
      setOzLogged(res.hydration.oz_logged)
      setWarning(res.hydration.warning_level)
      setBlocked(res.hydration.warning_level === 'blocked')
    }
  }

  if (!loaded) return null

  const fillPct = goalOz > 0 ? Math.round((ozLogged / goalOz) * 100) : 0

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
          <Droplets className="w-4 h-4 text-blue-500" /> Water Today
        </h3>
        <span className={`text-sm font-bold ${
          warning === 'blocked' ? 'text-red-600' :
          warning === 'caution' ? 'text-amber-600' :
          warning === 'goal_met' ? 'text-green-600' :
          'text-blue-600'
        }`}>
          {ozLogged} / {goalOz} oz
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${
          warning === 'blocked' ? 'bg-red-500' :
          warning === 'caution' ? 'bg-amber-400' :
          warning === 'goal_met' || warning === 'encouraged' ? 'bg-green-500' :
          'bg-blue-400'
        }`}
          style={{ width: `${Math.min(100, fillPct)}%` }} />
      </div>

      {/* Warning messages */}
      {warning === 'encouraged' && (
        <p className="text-xs text-green-600 font-medium mb-3 text-center bg-green-50 rounded-lg py-1.5">
          Almost there! Great job staying hydrated!
        </p>
      )}
      {warning === 'goal_met' && (
        <p className="text-xs text-green-600 font-medium mb-3 text-center bg-green-50 rounded-lg py-1.5">
          You hit your goal! You can keep sipping but don&apos;t overdo it.
        </p>
      )}
      {warning === 'caution' && (
        <div className="flex items-center gap-2 text-xs text-amber-700 font-medium mb-3 bg-amber-50 rounded-lg py-2 px-3 border border-amber-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          That&apos;s a lot of water! Your body might not need more right now. Take a break from drinking.
        </div>
      )}
      {warning === 'blocked' && (
        <div className="flex items-center gap-2 text-xs text-red-700 font-medium mb-3 bg-red-50 rounded-lg py-2 px-3 border border-red-200">
          <XOctagon className="w-4 h-4 flex-shrink-0" />
          STOP — Drinking too much water can make you sick. No more water logging today. Talk to Mom or Dad if you feel weird.
        </div>
      )}

      {/* Cup size selector */}
      {!blocked && (
        <>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {CUP_SIZES.map(size => (
              <button key={size.oz} onClick={() => { setSelectedSize(size.oz); setShowCustom(false) }}
                className={`flex-1 min-w-[52px] py-1.5 rounded-lg text-xs font-medium border transition ${
                  selectedSize === size.oz && !showCustom
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}>
                <div>{size.label}</div>
                <div className="text-[10px] opacity-70">{size.desc}</div>
              </button>
            ))}
            <button onClick={() => setShowCustom(!showCustom)}
              className={`min-w-[52px] py-1.5 rounded-lg text-xs font-medium border transition ${
                showCustom ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}>
              Custom
            </button>
          </div>

          {showCustom && (
            <div className="flex items-center gap-2 mb-3">
              <input type="number" value={customOz} onChange={e => setCustomOz(e.target.value)}
                placeholder="oz" min="1" max="48"
                className="w-20 px-2 py-1.5 border rounded-lg text-sm text-center" />
              <span className="text-xs text-gray-500">oz</span>
              <button onClick={() => {
                const oz = parseInt(customOz)
                if (oz > 0 && oz <= 48) { setSelectedSize(oz); setShowCustom(false) }
              }}
                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg">Set</button>
            </div>
          )}

          {/* Log + Remove buttons */}
          <div className="flex items-center gap-2">
            <button onClick={removeWater} disabled={ozLogged <= 0}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => logWater(selectedSize)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition">
              <Droplets className="w-4 h-4" /> Log {selectedSize} oz
            </button>
          </div>
        </>
      )}
    </div>
  )
}
