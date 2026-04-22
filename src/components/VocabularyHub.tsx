'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Play, FileText, Search, Star, Check } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY, KID_GRADES } from '@/lib/constants'
import SpeakerButton from './SpeakerButton'

type Tab = 'baseline' | 'books' | 'sets'

export default function VocabularyHub() {
  const [kid, setKid] = useState('hannah')
  const [tab, setTab] = useState<Tab>('baseline')
  const [baseline, setBaseline] = useState<any[]>([])
  const [bookWords, setBookWords] = useState<any[]>([])
  const [sets, setSets] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async (k: string) => {
    setLoading(true)
    const [b, bw, s] = await Promise.all([
      fetch(`/api/vocabulary/baseline?kid_name=${k}`).then(r => r.json()).catch(() => ({ words: [] })),
      fetch(`/api/vocabulary/book-words?kid_name=${k}`).then(r => r.json()).catch(() => ({ words: [] })),
      fetch(`/api/vocabulary/study-sets?kid_name=${k}`).then(r => r.json()).catch(() => ({ sets: [] })),
    ])
    setBaseline(b.words || [])
    setBookWords(bw.words || [])
    setSets(s.sets || [])
    setLoading(false)
  }

  useEffect(() => { fetchData(kid) }, [kid])

  const mastered = baseline.filter(w => w.progress_status === 'mastered').length
  const learning = baseline.filter(w => w.progress_status === 'learning').length
  const total = baseline.length

  const markWord = async (wordId: number, status: string) => {
    await fetch('/api/vocabulary/baseline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_name: kid, word_id: wordId, status }),
    }).catch(() => {})
    setBaseline(prev => prev.map(w => w.id === wordId ? { ...w, progress_status: status } : w))
  }

  const filtered = baseline.filter(w => !search || w.word?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> Vocabulary Hub</h2>
        <div className="flex items-center gap-3 mt-2 text-sm text-purple-200">
          <span>{mastered} mastered</span>
          <span>{learning} learning</span>
          <span>{total - mastered - learning} new</span>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {[...ALL_KIDS].map(k => (
          <button key={k} onClick={() => setKid(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${kid === k ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {KID_DISPLAY[k]} <span className="text-[9px] opacity-60">Gr.{KID_GRADES[k]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {(['baseline', 'books', 'sets'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === t ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t === 'baseline' ? 'Baseline' : t === 'books' ? 'Book Words' : 'Study Sets'}
          </button>
        ))}
      </div>

      {loading ? <div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto" /></div> : (
        <>
          {tab === 'baseline' && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words..."
                    className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs" />
                </div>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Your word bank is ready. Words will appear as your grade baseline loads.</p>}
                {filtered.map(w => (
                  <div key={w.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{w.word}</span>
                        <SpeakerButton text={w.word} size="sm" />
                        <span className={`text-[9px] px-1 py-0.5 rounded ${
                          w.progress_status === 'mastered' ? 'bg-green-100 text-green-700' :
                          w.progress_status === 'learning' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{w.progress_status || 'new'}</span>
                      </div>
                      <p className="text-gray-500 truncate">{w.definition}</p>
                    </div>
                    {w.progress_status !== 'mastered' && (
                      <button onClick={() => markWord(w.id, 'mastered')} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Mark mastered">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'books' && (
            <div className="bg-white rounded-xl border p-4">
              {bookWords.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  Finish a few cards and the mixer will have words to shuffle — come back after your next session.
                </p>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {bookWords.map((w: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900">{w.word}</span>
                        <span className="text-gray-400 ml-1.5 text-[10px]">from {w.book_title}</span>
                        <p className="text-gray-500 truncate">{w.definition}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'sets' && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              {sets.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No study sets yet. Create one to mix words from different sources.</p>}
              {sets.map((s: any) => (
                <div key={s.id} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.set_name}</p>
                    <p className="text-[10px] text-gray-400">{s.description || `${(s.word_ids || []).length} words`}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="p-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100" title="Start Quiz">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Print Worksheet">
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
