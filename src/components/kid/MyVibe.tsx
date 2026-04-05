'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Target, Trophy, Save, Plus, X } from 'lucide-react'

const AESTHETICS = ['Cozy', 'Bold', 'Minimal', 'Creative', 'Sporty', 'Artsy', 'Techy', 'Nature', 'Retro']

export default function MyVibe({ kidName }: { kidName: string }) {
  const [profile, setProfile] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [quote, setQuote] = useState('')
  const [aesthetic, setAesthetic] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [view, setView] = useState<'profile' | 'portfolio'>('profile')

  const kid = kidName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/vibe?action=get_vibe&kid_name=${kid}`)
      .then(r => r.json()).then(d => {
        const p = d.profile
        if (p) {
          setProfile(p)
          setQuote(p.quote || '')
          setAesthetic(p.aesthetic || '')
          const parse = (v: any) => { if (!v) return []; if (typeof v === 'string') try { return JSON.parse(v) } catch { return [] } return v }
          setInterests(parse(p.interests))
          setGoals(parse(p.goals))
        }
      }).catch(() => {})
    fetch(`/api/kids/vibe?action=get_portfolio&kid_name=${kid}`)
      .then(r => r.json()).then(d => setPortfolio(d)).catch(() => {})
  }, [kid])

  const handleSave = async () => {
    await fetch('/api/kids/vibe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_vibe', kid_name: kid, quote, aesthetic, interests, goals }) })
    setEditing(false)
  }

  const addInterest = () => { if (newInterest.trim()) { setInterests(prev => [...prev, newInterest.trim()]); setNewInterest('') } }
  const addGoal = () => { if (newGoal.trim()) { setGoals(prev => [...prev, newGoal.trim()]); setNewGoal('') } }

  const achievements = portfolio?.achievements || []

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setView('profile')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'profile' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          My Vibe
        </button>
        <button onClick={() => setView('portfolio')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'portfolio' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Portfolio
        </button>
      </div>

      {view === 'profile' && (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                <Sparkles className="w-7 h-7 text-purple-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{kidName}&apos;s Vibe</h2>
                {profile?.zodiac && profile.zodiac !== 'Unknown' && (
                  <p className="text-xs text-gray-500">{profile.zodiac}</p>
                )}
              </div>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-sm text-purple-600 hover:text-purple-700 font-medium">Edit</button>
            ) : (
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">
                <Save className="w-3 h-3" /> Save
              </button>
            )}
          </div>

          {/* Quote */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">My Quote</p>
            {editing ? (
              <input type="text" value={quote} onChange={e => setQuote(e.target.value)}
                placeholder="What's your motto?" className="w-full border rounded-lg px-3 py-2 text-sm" />
            ) : (
              <p className="text-gray-700 italic">{quote || 'No quote set yet'}</p>
            )}
          </div>

          {/* Aesthetic */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">My Aesthetic</p>
            {editing ? (
              <div className="flex flex-wrap gap-1.5">
                {AESTHETICS.map(a => (
                  <button key={a} onClick={() => setAesthetic(a)}
                    className={`px-3 py-1 rounded-full text-sm ${aesthetic === a ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {a}
                  </button>
                ))}
              </div>
            ) : (
              <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">{aesthetic || 'Not set'}</span>
            )}
          </div>

          {/* Interests */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">My Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {interests.map((interest, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-sm flex items-center gap-1">
                  {interest}
                  {editing && <button onClick={() => setInterests(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>}
                </span>
              ))}
              {editing && (
                <div className="flex gap-1">
                  <input type="text" value={newInterest} onChange={e => setNewInterest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addInterest()}
                    placeholder="Add..." className="border rounded px-2 py-0.5 text-sm w-24" />
                  <button onClick={addInterest} className="text-blue-500"><Plus className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Goals */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">My Goals</p>
            <div className="space-y-1">
              {goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Target className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-gray-700">{goal}</span>
                  {editing && <button onClick={() => setGoals(prev => prev.filter((_, j) => j !== i))} className="text-red-400"><X className="w-3 h-3" /></button>}
                </div>
              ))}
              {editing && (
                <div className="flex gap-1">
                  <input type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGoal()}
                    placeholder="Add a goal..." className="border rounded px-2 py-1 text-sm flex-1" />
                  <button onClick={addGoal} className="text-green-500"><Plus className="w-4 h-4" /></button>
                </div>
              )}
              {!editing && goals.length === 0 && <p className="text-sm text-gray-400">No goals set yet</p>}
            </div>
          </div>
        </div>
      )}

      {view === 'portfolio' && (
        <div className="space-y-4">
          {/* Achievements */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" /> My Achievements
            </h3>
            {achievements.length > 0 ? (
              <div className="space-y-2">
                {achievements.map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-800">{a.title}</span>
                    <span className="text-xs text-gray-500">{a.tier}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Complete tasks to earn achievements!</p>
            )}
          </div>

          {/* Interests from vibe */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Things I Want to Learn</h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm">{interest}</span>
              ))}
              {interests.length === 0 && <p className="text-sm text-gray-400">Add interests in your Vibe profile!</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
