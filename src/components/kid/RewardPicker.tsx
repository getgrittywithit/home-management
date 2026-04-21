'use client'

import { useState, useEffect } from 'react'
import { Star, Check, X, Film, Palette } from 'lucide-react'

interface Props {
  kidName: string
  onClose: () => void
  onPicked?: () => void
}

export default function RewardPicker({ kidName, onClose, onPicked }: Props) {
  const kid = kidName.toLowerCase()
  const [menu, setMenu] = useState<any[]>([])
  const [shared, setShared] = useState<any[]>([])
  const [movies, setMovies] = useState<any[]>([])
  const [themes, setThemes] = useState<any[]>([])
  const [subPicker, setSubPicker] = useState<'movies' | 'themes' | null>(null)
  const [picked, setPicked] = useState(false)

  useEffect(() => {
    fetch(`/api/fun-friday?action=get_menu&kid_name=${kid}`).then(r => r.json())
      .then(d => { setMenu(d.menu || []); setShared(d.shared || []) }).catch(() => {})
  }, [kid])

  const pickReward = async (sourceType: string, sourceId: number, text: string) => {
    await fetch('/api/fun-friday', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pick_reward', kid_name: kid, source_type: sourceType, source_id: sourceId, option_text: text }),
    }).catch(() => {})
    setPicked(true)
    onPicked?.()
    setTimeout(onClose, 1500)
  }

  const openMovies = async () => {
    const res = await fetch('/api/fun-friday?action=get_movies_available').then(r => r.json()).catch(() => ({ movies: [] }))
    setMovies(res.movies || [])
    setSubPicker('movies')
  }

  const openThemes = async () => {
    const res = await fetch('/api/fun-friday?action=get_themes_available').then(r => r.json()).catch(() => ({ themes: [] }))
    setThemes(res.themes || [])
    setSubPicker('themes')
  }

  if (picked) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Pick locked in!</p>
          <p className="text-sm text-gray-500">Enjoy your Fun Friday!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-yellow-400 to-amber-400 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Star className="w-5 h-5 fill-white" /> Pick Your Fun Friday</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {subPicker === 'movies' ? (
          <div className="p-4 space-y-2">
            <button onClick={() => setSubPicker(null)} className="text-xs text-blue-600 mb-2">← Back to all options</button>
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1"><Film className="w-4 h-4" /> Pick a Movie</h3>
            {movies.length === 0 && <p className="text-xs text-gray-400">No movies available — ask Mom to add some!</p>}
            {movies.map((m: any) => (
              <button key={m.id} onClick={() => pickReward('movie', m.id, m.title)}
                className="w-full text-left p-3 rounded-lg border hover:bg-yellow-50 hover:border-yellow-300">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-gray-500">{m.streaming_source} · {m.rating} · {m.duration_min}min</p>
              </button>
            ))}
          </div>
        ) : subPicker === 'themes' ? (
          <div className="p-4 space-y-2">
            <button onClick={() => setSubPicker(null)} className="text-xs text-blue-600 mb-2">← Back to all options</button>
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1"><Palette className="w-4 h-4" /> Pick a Theme</h3>
            {themes.map((t: any) => (
              <button key={t.id} onClick={() => pickReward('themed_afternoon', t.id, t.theme_name)}
                className="w-full text-left p-3 rounded-lg border hover:bg-yellow-50 hover:border-yellow-300">
                <p className="text-sm font-medium">{t.theme_name}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">YOUR PICKS</h3>
              <div className="space-y-1.5">
                {menu.map((m: any) => (
                  <button key={m.id} onClick={() => pickReward('individual_menu', m.id, m.option_text)}
                    className="w-full text-left p-2.5 rounded-lg border hover:bg-yellow-50 hover:border-yellow-300 flex items-center gap-2">
                    <span className="text-lg">{m.icon || '⭐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.option_text}</p>
                      {m.estimated_duration_min && <p className="text-[10px] text-gray-400">{m.estimated_duration_min} min</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">FAMILY OPTIONS</h3>
              <div className="space-y-1.5">
                {shared.map((s: any) => (
                  <button key={s.id} onClick={() => {
                    if (s.option_category === 'movie') { openMovies(); return }
                    if (s.option_category === 'themed_afternoon') { openThemes(); return }
                    pickReward('shared_pool', s.id, s.option_text)
                  }}
                    className="w-full text-left p-2.5 rounded-lg border hover:bg-yellow-50 hover:border-yellow-300 flex items-center gap-2">
                    <span className="text-lg">{s.icon || '🎉'}</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{s.option_text}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
