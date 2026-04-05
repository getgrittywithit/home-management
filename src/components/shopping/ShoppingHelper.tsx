'use client'

import { useState, useEffect } from 'react'
import { Copy, Link, Trash2, Eye, Edit3, Save, X } from 'lucide-react'

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function ShoppingHelper() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [selectedKid, setSelectedKid] = useState('amos')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [toast, setToast] = useState('')

  const fetchData = () => {
    fetch('/api/shopping?action=get_all_profiles').then(r => r.json()).then(d => setProfiles(d.profiles || [])).catch(() => {})
    fetch('/api/shopping?action=list_share_links').then(r => r.json()).then(d => setLinks(d.links || [])).catch(() => {})
  }
  useEffect(() => { fetchData() }, [])

  const profile = profiles.find(p => p.kid_name === selectedKid) || {}
  const parse = (v: any) => { if (!v) return []; if (typeof v === 'string') try { return JSON.parse(v) } catch { return [] } return v }
  const parseSizes = (v: any) => { if (!v) return {}; if (typeof v === 'string') try { return JSON.parse(v) } catch { return {} } return v }

  const startEdit = () => {
    setForm({
      sizes: parseSizes(profile.sizes),
      sensory_triggers: parse(profile.sensory_triggers).join(', '),
      fabric_preferences: parse(profile.fabric_preferences).join(', '),
      fit_preferences: parse(profile.fit_preferences).join(', '),
      wish_list: parse(profile.wish_list).join('\n'),
      avoid_list: parse(profile.avoid_list).join('\n'),
      notes: profile.notes || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    const toArr = (s: string) => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean)
    await fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile', kid_name: selectedKid,
        sizes: form.sizes, sensory_triggers: toArr(form.sensory_triggers),
        fabric_preferences: toArr(form.fabric_preferences), fit_preferences: toArr(form.fit_preferences),
        wish_list: toArr(form.wish_list), avoid_list: toArr(form.avoid_list), notes: form.notes,
      })
    })
    setEditing(false); fetchData()
  }

  const handleShare = async (kidName: string) => {
    const res = await fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_share_link', kid_name: kidName }) }).then(r => r.json())
    if (res.success) {
      const url = `${window.location.origin}${res.url}`
      navigator.clipboard.writeText(url).catch(() => {})
      setToast(`Link copied! Share with family.`)
      setTimeout(() => setToast(''), 3000)
      fetchData()
    }
  }

  const handleRevoke = async (id: number) => {
    await fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_share_link', id }) })
    fetchData()
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900">{'\uD83D\uDED2'} Shopping Helper</h2>

      {toast && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{toast}</div>}

      {/* Kid selector */}
      <div className="flex gap-2 flex-wrap">
        {KIDS.map(k => (
          <button key={k} onClick={() => { setSelectedKid(k); setEditing(false) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedKid === k ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cap(k)}
          </button>
        ))}
      </div>

      {/* Profile view/edit */}
      <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{cap(selectedKid)}&apos;s Shopping Profile</h3>
          <div className="flex gap-2">
            <button onClick={() => handleShare(selectedKid)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600">
              <Link className="w-3 h-3" /> Share for Shopping
            </button>
            {!editing ? (
              <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600">
                  <Save className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Sizes</p>
              {Object.entries(parseSizes(profile.sizes)).map(([k, v]) => (
                <p key={k} className="text-sm text-gray-700">{k}: <span className="font-medium">{v as string}</span></p>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Fabric Preferences</p>
              <p className="text-sm text-gray-700">{parse(profile.fabric_preferences).join(', ') || 'None set'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Sensory Triggers</p>
              <p className="text-sm text-amber-700">{parse(profile.sensory_triggers).join(', ') || 'None'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Fit</p>
              <p className="text-sm text-gray-700">{parse(profile.fit_preferences).join(', ') || 'Not specified'}</p>
            </div>
            {parse(profile.wish_list).length > 0 && (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Wish List</p>
                <ul className="text-sm text-gray-700 space-y-0.5">
                  {parse(profile.wish_list).map((item: string, i: number) => <li key={i}>{'\u2022'} {item}</li>)}
                </ul>
              </div>
            )}
            {profile.notes && (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700">{profile.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {['shirt', 'pants', 'shoe', 'hat'].map(field => (
                <div key={field}>
                  <label className="text-xs text-gray-600 capitalize">{field}</label>
                  <input type="text" value={form.sizes?.[field] || ''} onChange={e => setForm((f: any) => ({ ...f, sizes: { ...f.sizes, [field]: e.target.value } }))}
                    className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-600">Sensory Triggers (comma-separated)</label>
              <input type="text" value={form.sensory_triggers} onChange={e => setForm((f: any) => ({ ...f, sensory_triggers: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Fabric Preferences (comma-separated)</label>
              <input type="text" value={form.fabric_preferences} onChange={e => setForm((f: any) => ({ ...f, fabric_preferences: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Wish List (one per line)</label>
              <textarea value={form.wish_list} onChange={e => setForm((f: any) => ({ ...f, wish_list: e.target.value }))}
                rows={3} className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Notes</label>
              <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                rows={2} className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Active Share Links */}
      {links.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Active Share Links</h3>
          <div className="space-y-2">
            {links.map((link: any) => (
              <div key={link.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{cap(link.kid_name)}</span>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${link.share_token}`) }}
                    className="text-blue-500 hover:text-blue-600"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span><Eye className="w-3 h-3 inline" /> {link.views} views</span>
                  <span>Exp: {new Date(link.expires_at).toLocaleDateString()}</span>
                  <button onClick={() => handleRevoke(link.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
