'use client'

import { useState, useEffect } from 'react'
import { Star, Plus, Trash2, Settings, Film, Palette, Save } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

export default function FunFridayAdmin() {
  const [criteria, setCriteria] = useState<any[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [menus, setMenus] = useState<Record<string, any[]>>({})
  const [shared, setShared] = useState<any[]>([])
  const [section, setSection] = useState<'status' | 'criteria' | 'menus' | 'shared' | 'movies' | 'themes' | 'history'>('status')
  const [newOption, setNewOption] = useState({ kid: 'amos', text: '', category: 'home_activity', icon: '', duration: '', supplies: '' })
  const [newMovie, setNewMovie] = useState({ title: '', source: 'netflix', rating: 'PG', duration: '' })
  const [newTheme, setNewTheme] = useState({ name: '', description: '', supplies: '' })

  const fetchAll = async () => {
    const [crit, evals] = await Promise.all([
      fetch('/api/fun-friday?action=get_criteria').then(r => r.json()).catch(() => ({ criteria: [] })),
      fetch('/api/fun-friday?action=get_evaluations').then(r => r.json()).catch(() => ({ evaluations: [] })),
    ])
    setCriteria(crit.criteria || [])
    setEvaluations(evals.evaluations || [])

    const menuMap: Record<string, any[]> = {}
    for (const kid of [...HOMESCHOOL_KIDS]) {
      const res = await fetch(`/api/fun-friday?action=get_menu&kid_name=${kid}`).then(r => r.json()).catch(() => ({ menu: [], shared: [] }))
      menuMap[kid] = res.menu || []
      if (!shared.length) setShared(res.shared || [])
    }
    setMenus(menuMap)
  }

  useEffect(() => { fetchAll() }, [])

  const updateCriteria = async (kid: string, field: string, value: any) => {
    await fetch('/api/fun-friday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_update_criteria', kid_name: kid, [field]: value }),
    }).catch(() => {})
    fetchAll()
  }

  const addMenuOption = async () => {
    if (!newOption.text.trim()) return
    await fetch('/api/fun-friday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_add_menu_option', kid_name: newOption.kid, option_text: newOption.text, option_category: newOption.category, icon: newOption.icon, estimated_duration_min: parseInt(newOption.duration) || null, supplies_needed: newOption.supplies }),
    }).catch(() => {})
    setNewOption({ ...newOption, text: '', icon: '', duration: '', supplies: '' })
    fetchAll()
  }

  const deactivate = async (id: number) => {
    await fetch('/api/fun-friday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_deactivate_menu_option', menu_id: id }),
    }).catch(() => {})
    fetchAll()
  }

  const addMovie = async () => {
    if (!newMovie.title.trim()) return
    await fetch('/api/fun-friday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_add_movie', ...newMovie, duration_min: parseInt(newMovie.duration) || null }),
    }).catch(() => {})
    setNewMovie({ title: '', source: 'netflix', rating: 'PG', duration: '' })
  }

  const addTheme = async () => {
    if (!newTheme.name.trim()) return
    await fetch('/api/fun-friday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_add_theme', theme_name: newTheme.name, description: newTheme.description, supplies_needed: newTheme.supplies }),
    }).catch(() => {})
    setNewTheme({ name: '', description: '', supplies: '' })
  }

  const SECTIONS = [
    { id: 'status', label: 'This Week' }, { id: 'criteria', label: 'Criteria' },
    { id: 'menus', label: 'Menus' }, { id: 'shared', label: 'Shared Pool' },
    { id: 'movies', label: 'Movies' }, { id: 'themes', label: 'Themes' }, { id: 'history', label: 'History' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><Star className="w-6 h-6 fill-white" /> Fun Friday Admin</h2>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${section === s.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'status' && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">This Week&apos;s Progress</h3>
          {evaluations.filter((e: any) => {
            const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
            return e.week_of?.startsWith(monday.toLocaleDateString('en-CA'))
          }).length === 0 && <p className="text-xs text-gray-400">No evaluations yet this week</p>}
          <div className="space-y-2">
            {criteria.map((c: any) => {
              const evalRow = evaluations.find((e: any) => e.kid_name === c.kid_name)
              return (
                <div key={c.kid_name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium">{KID_DISPLAY[c.kid_name]}</span>
                  <span className="text-xs text-gray-500">{c.threshold_pct}% threshold · {c.days_required} days</span>
                  {evalRow && <span className={`text-xs font-medium ${evalRow.qualified ? 'text-green-600' : 'text-gray-400'}`}>{evalRow.qualified ? 'Earned' : `${evalRow.days_hit_threshold}/${evalRow.days_required}`}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {section === 'criteria' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Per-Kid Criteria</h3>
          {criteria.map((c: any) => (
            <div key={c.kid_name} className="p-3 rounded-lg border space-y-2">
              <p className="font-medium text-sm">{KID_DISPLAY[c.kid_name]}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-gray-500">Threshold %</label>
                  <input type="number" defaultValue={c.threshold_pct} className="w-full border rounded px-2 py-1 mt-0.5"
                    onBlur={e => { if (parseInt(e.target.value) !== c.threshold_pct) updateCriteria(c.kid_name, 'threshold_pct', parseInt(e.target.value)) }} />
                </div>
                <div>
                  <label className="text-gray-500">Days Required</label>
                  <input type="number" defaultValue={c.days_required} className="w-full border rounded px-2 py-1 mt-0.5"
                    onBlur={e => { if (parseInt(e.target.value) !== c.days_required) updateCriteria(c.kid_name, 'days_required', parseInt(e.target.value)) }} />
                </div>
                <div>
                  <label className="text-gray-500">Core Only</label>
                  <select defaultValue={c.core_only ? 'true' : 'false'} className="w-full border rounded px-2 py-1 mt-0.5"
                    onChange={e => updateCriteria(c.kid_name, 'core_only', e.target.value === 'true')}>
                    <option value="true">Core Only</option>
                    <option value="false">All Subjects</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'menus' && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Per-Kid Menus</h3>
          {[...HOMESCHOOL_KIDS].map(kid => (
            <div key={kid}>
              <p className="text-xs font-semibold text-gray-500 mb-1">{KID_DISPLAY[kid]}</p>
              <div className="space-y-1">
                {(menus[kid] || []).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-gray-50">
                    <span>{m.icon} {m.option_text}</span>
                    <button onClick={() => deactivate(m.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Add Option</p>
            <select value={newOption.kid} onChange={e => setNewOption({ ...newOption, kid: e.target.value })} className="border rounded px-2 py-1 text-xs w-full">
              {[...HOMESCHOOL_KIDS].map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
            </select>
            <input value={newOption.text} onChange={e => setNewOption({ ...newOption, text: e.target.value })} placeholder="Option text" className="border rounded px-2 py-1 text-xs w-full" />
            <button onClick={addMenuOption} disabled={!newOption.text.trim()} className="bg-amber-500 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 w-full"><Plus className="w-3 h-3 inline mr-1" />Add</button>
          </div>
        </div>
      )}

      {section === 'movies' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1"><Film className="w-4 h-4" /> Movie Library</h3>
          <div className="grid grid-cols-2 gap-2">
            <input value={newMovie.title} onChange={e => setNewMovie({ ...newMovie, title: e.target.value })} placeholder="Title" className="border rounded px-2 py-1 text-xs col-span-2" />
            <select value={newMovie.source} onChange={e => setNewMovie({ ...newMovie, source: e.target.value })} className="border rounded px-2 py-1 text-xs">
              <option value="netflix">Netflix</option><option value="prime">Prime</option><option value="dvd">DVD</option><option value="youtube_free">YouTube</option>
            </select>
            <select value={newMovie.rating} onChange={e => setNewMovie({ ...newMovie, rating: e.target.value })} className="border rounded px-2 py-1 text-xs">
              <option>G</option><option>PG</option><option>PG-13</option>
            </select>
          </div>
          <button onClick={addMovie} disabled={!newMovie.title.trim()} className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 w-full">Add Movie</button>
        </div>
      )}

      {section === 'themes' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1"><Palette className="w-4 h-4" /> Theme Library</h3>
          <input value={newTheme.name} onChange={e => setNewTheme({ ...newTheme, name: e.target.value })} placeholder="Theme name" className="border rounded px-2 py-1 text-xs w-full" />
          <input value={newTheme.description} onChange={e => setNewTheme({ ...newTheme, description: e.target.value })} placeholder="Description" className="border rounded px-2 py-1 text-xs w-full" />
          <input value={newTheme.supplies} onChange={e => setNewTheme({ ...newTheme, supplies: e.target.value })} placeholder="Supplies needed" className="border rounded px-2 py-1 text-xs w-full" />
          <button onClick={addTheme} disabled={!newTheme.name.trim()} className="bg-purple-500 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 w-full">Add Theme</button>
        </div>
      )}

      {section === 'history' && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Evaluation History</h3>
          <div className="space-y-1.5">
            {evaluations.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded bg-gray-50">
                <span className="font-medium">{KID_DISPLAY[e.kid_name]}</span>
                <span className="text-gray-400">{e.week_of?.split('T')[0]}</span>
                <span>{e.days_hit_threshold}/{e.days_required} days</span>
                <span className={e.qualified ? 'text-green-600 font-medium' : 'text-gray-400'}>{e.qualified ? 'Earned' : 'Not earned'}</span>
              </div>
            ))}
            {evaluations.length === 0 && <p className="text-xs text-gray-400">No evaluations yet</p>}
          </div>
        </div>
      )}
    </div>
  )
}
