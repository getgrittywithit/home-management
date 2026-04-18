'use client'

import { useState, useEffect } from 'react'
import { Trophy, Plus, Flame, Target, X, Users } from 'lucide-react'
import { ALL_KIDS } from '@/lib/constants'

interface Challenge {
  id: string
  title: string
  description: string | null
  category: string | null
  started_by: string
  participants: string[]
  tracking_metric: string
  start_date: string
  end_date: string
  star_prize: number
  status: string
  winner: string | null
}

interface Progress {
  kid_name: string
  progress_count: number
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const CATEGORIES = ['reading', 'math', 'chores', 'exercise', 'kindness', 'custom'] as const
const METRICS: Record<string, string> = { reading: 'pages', math: 'problems', chores: 'tasks', exercise: 'minutes', kindness: 'acts', custom: 'points' }
const DURATIONS = [{ label: '3 days', days: 3 }, { label: '1 week', days: 7 }, { label: '2 weeks', days: 14 }]
const PRIZES = [25, 50, 100]

export default function ChallengeBoard({ kidName }: { kidName: string }) {
  const kid = kidName.toLowerCase()
  const [active, setActive] = useState<Challenge[]>([])
  const [completed, setCompleted] = useState<Challenge[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, Progress[]>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [updateId, setUpdateId] = useState<string | null>(null)
  const [updateVal, setUpdateVal] = useState('')
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    title: '', description: '', category: 'reading' as string,
    participants: [] as string[], duration: 7, starPrize: 50,
  })

  const fetchChallenges = async () => {
    const [activeRes, completedRes] = await Promise.all([
      fetch('/api/social?action=list_challenges&status=active').then(r => r.json()).catch(() => ({ challenges: [] })),
      fetch('/api/social?action=list_challenges&status=completed').then(r => r.json()).catch(() => ({ challenges: [] })),
    ])
    setActive(activeRes.challenges || [])
    setCompleted((completedRes.challenges || []).slice(0, 5))

    const pMap: Record<string, Progress[]> = {}
    for (const c of (activeRes.challenges || [])) {
      const res = await fetch(`/api/social?action=get_challenge&id=${c.id}`).then(r => r.json()).catch(() => ({}))
      pMap[c.id] = res.progress || []
    }
    setProgressMap(pMap)
    setLoading(false)
  }

  useEffect(() => { fetchChallenges() }, [])

  const createChallenge = async () => {
    if (!form.title.trim() || form.participants.length === 0) return
    const allParticipants = Array.from(new Set([kid, ...form.participants]))
    const endDate = new Date(Date.now() + form.duration * 86400000).toLocaleDateString('en-CA')
    await fetch('/api/social', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start_challenge', title: form.title.trim(), description: form.description.trim() || null,
        category: form.category, started_by: kid, participants: allParticipants,
        tracking_metric: METRICS[form.category] || 'points',
        end_date: endDate, star_prize: Math.min(form.starPrize, 100),
      }),
    })
    setShowCreate(false)
    setForm({ title: '', description: '', category: 'reading', participants: [], duration: 7, starPrize: 50 })
    await fetchChallenges()
  }

  const updateProgress = async (challengeId: string) => {
    const inc = parseInt(updateVal) || 1
    await fetch('/api/social', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_progress', challenge_id: challengeId, kid_name: kid, increment: inc }),
    })
    setUpdateId(null)
    setUpdateVal('')
    await fetchChallenges()
  }

  const toggleParticipant = (sib: string) => {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(sib) ? f.participants.filter(p => p !== sib) : [...f.participants, sib],
    }))
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>

  const siblings = ALL_KIDS.filter(k => k !== kid)

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6" /> Challenges</h2>
          <p className="text-amber-100 text-sm mt-1">Compete with your siblings</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Create Challenge</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Challenge title..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${form.category === c ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {cap(c)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Challenge who?</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.map(sib => (
                <button key={sib} onClick={() => toggleParticipant(sib)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${form.participants.includes(sib) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {cap(sib)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1.5">Duration</p>
              <div className="flex gap-1.5">
                {DURATIONS.map(d => (
                  <button key={d.days} onClick={() => setForm(f => ({ ...f, duration: d.days }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${form.duration === d.days ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1.5">Star Prize</p>
              <div className="flex gap-1.5">
                {PRIZES.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, starPrize: p }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${form.starPrize === p ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {p} ⭐
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={createChallenge} disabled={!form.title.trim() || form.participants.length === 0}
            className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50">
            Start Challenge
          </button>
        </div>
      )}

      {active.length === 0 && !showCreate && (
        <div className="bg-white border rounded-xl p-8 text-center">
          <Trophy className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No active challenges. Create one to compete with your siblings!</p>
        </div>
      )}

      {active.map(c => {
        const progress = progressMap[c.id] || []
        const maxProgress = Math.max(1, ...progress.map(p => p.progress_count))
        const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
        return (
          <div key={c.id} className="bg-white border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> {c.title}
                </h4>
                {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
              </div>
              <span className="text-xs text-gray-400">{daysLeft}d left</span>
            </div>
            <div className="space-y-2">
              {(c.participants || []).map((p: string) => {
                const prog = progress.find(pr => pr.kid_name === p)
                const count = prog?.progress_count || 0
                const pct = Math.round((count / maxProgress) * 100)
                return (
                  <div key={p} className="flex items-center gap-2">
                    <span className={`text-xs font-medium w-16 ${p === kid ? 'text-blue-600' : 'text-gray-600'}`}>{cap(p)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${p === kid ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{count} {c.tracking_metric}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-400">⭐ {c.star_prize} stars to winner</span>
              {updateId === c.id ? (
                <div className="flex items-center gap-1.5">
                  <input type="number" value={updateVal} onChange={e => setUpdateVal(e.target.value)}
                    placeholder="+" className="w-16 border rounded px-2 py-1 text-xs" autoFocus min="1" />
                  <button onClick={() => updateProgress(c.id)} className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded font-medium">Add</button>
                  <button onClick={() => setUpdateId(null)} className="text-gray-400 text-xs">Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setUpdateId(c.id); setUpdateVal('1') }}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium hover:bg-blue-100">
                  <Target className="w-3 h-3 inline mr-0.5" /> Update My Progress
                </button>
              )}
            </div>
          </div>
        )
      })}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500">Completed</h3>
          {completed.map(c => (
            <div key={c.id} className="bg-gray-50 border rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{c.title}</p>
                <p className="text-xs text-gray-400">{c.category}</p>
              </div>
              {c.winner && (
                <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                  🏆 {cap(c.winner)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
