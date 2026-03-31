'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Gamepad2, Puzzle, Search, Plus, Archive, Edit3, Star, AlertTriangle, X, Filter, ChevronDown } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================
interface LibraryItem {
  id: string
  item_type: 'book' | 'game' | 'toy' | 'resource'
  title: string
  author_or_publisher: string | null
  isbn: string | null
  upc: string | null
  description: string | null
  cover_image_url: string | null
  grade_min: number | null
  grade_max: number | null
  subject_tags: string[]
  edu_uses: string[]
  player_min: number | null
  player_max: number | null
  play_time_min: number | null
  play_time_max: number | null
  play_style: string | null
  competition_level: string | null
  accessibility_flags: string[]
  who_uses: string[]
  location_in_home: string | null
  condition: string | null
  favorite_flag: boolean
  last_used: string | null
}

interface AccessibilityWarning {
  kid_name: string
  flag: string
  item_flag: string
  tip: string
}

// ============================================================================
// Shared Constants
// ============================================================================
const TYPE_ICONS: Record<string, React.ReactNode> = {
  book: <BookOpen className="w-4 h-4" />,
  game: <Gamepad2 className="w-4 h-4" />,
  toy: <Puzzle className="w-4 h-4" />,
  resource: <BookOpen className="w-4 h-4" />,
}

const TYPE_COLORS: Record<string, string> = {
  book: 'bg-blue-100 text-blue-700',
  game: 'bg-purple-100 text-purple-700',
  toy: 'bg-orange-100 text-orange-700',
  resource: 'bg-green-100 text-green-700',
}

const SUBJECT_OPTIONS = [
  'math', 'elar', 'science', 'social_studies', 'life_skills',
  'financial_literacy', 'art', 'pe_outdoor', 'geography', 'logic', 'memory', 'typing',
]

const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

// ============================================================================
// Item Card (shared between kid/parent views)
// ============================================================================
function ItemCard({ item, onClick, compact }: { item: LibraryItem; onClick?: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex gap-3">
        {item.cover_image_url && (
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="w-12 h-16 object-cover rounded shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[item.item_type]}`}>
              {TYPE_ICONS[item.item_type]} {item.item_type}
            </span>
            {item.favorite_flag && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
          </div>
          <h4 className="font-medium text-gray-900 text-sm truncate">{item.title}</h4>
          {item.author_or_publisher && (
            <p className="text-xs text-gray-500">{item.author_or_publisher}</p>
          )}
          {!compact && item.subject_tags && item.subject_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.subject_tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {!compact && item.item_type === 'game' && item.player_min && (
            <div className="text-xs text-gray-400 mt-1">
              {item.player_min}-{item.player_max || '?'} players
              {item.play_time_min && ` · ${item.play_time_min}-${item.play_time_max || '?'} min`}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// AI Library Buddy
// ============================================================================
function LibraryBuddy({ kidName, onClose }: { kidName: string; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [format, setFormat] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [timeAvail, setTimeAvail] = useState<string | null>(null)
  const [results, setResults] = useState<LibraryItem[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = async (f: string, m: string, t: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buddy_search',
          format: f,
          subject_mood: m,
          time_available: t,
          kid_name: kidName,
        }),
      })
      const json = await res.json()
      setResults(json.items || [])
      setSuggestions(json.suggestions || [])
    } catch (err) {
      console.error('Buddy search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = (choice: string) => {
    setMood(choice)
    setStep(3)
  }

  const handleStep3 = (choice: string) => {
    setTimeAvail(choice)
    setStep(4)
    doSearch(format!, mood || choice, choice)
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">🦉</span> Library Buddy
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step 1 — Format */}
      {step === 1 && (
        <div>
          <p className="text-gray-700 mb-3">Hey! Looking for something to read or something to play?</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setFormat('read'); setStep(2) }}
              className="flex-1 bg-white border-2 border-blue-200 hover:border-blue-400 rounded-xl p-4 text-center"
            >
              <div className="text-3xl mb-1">📖</div>
              <div className="font-medium text-sm">Read / Look at</div>
            </button>
            <button
              onClick={() => { setFormat('play'); setStep(2) }}
              className="flex-1 bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-4 text-center"
            >
              <div className="text-3xl mb-1">🎲</div>
              <div className="font-medium text-sm">Play a Game</div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Subject/Mood */}
      {step === 2 && format === 'read' && (
        <div>
          <p className="text-gray-700 mb-3">What sounds good right now?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'math', icon: '🔢', label: 'Math or Numbers' },
              { key: 'story', icon: '📖', label: 'A Story' },
              { key: 'nature', icon: '🌿', label: 'Nature or Animals' },
              { key: 'places', icon: '🌎', label: 'Places & People' },
              { key: 'art', icon: '🎨', label: 'Art or Create' },
              { key: 'surprise', icon: '🎲', label: 'Surprise me!' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleStep2(opt.key)}
                className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-3 text-left"
              >
                <span className="text-xl mr-2">{opt.icon}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && format === 'play' && (
        <div>
          <p className="text-gray-700 mb-3">How do you want to play?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'with_someone', icon: '👫', label: 'With someone' },
              { key: 'just_me', icon: '🙋', label: 'Just me' },
              { key: 'work_together', icon: '🤝', label: 'Work together' },
              { key: 'compete', icon: '⚔️', label: 'Compete' },
              { key: 'surprise', icon: '🎲', label: 'Surprise me!' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleStep2(opt.key)}
                className="bg-white border border-gray-200 hover:border-purple-300 rounded-lg p-3 text-left"
              >
                <span className="text-xl mr-2">{opt.icon}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Time */}
      {step === 3 && (
        <div>
          <p className="text-gray-700 mb-3">How much time do you have?</p>
          <div className="space-y-2">
            {[
              { key: 'quick', icon: '⚡', label: 'Just 10 minutes' },
              { key: 'medium', icon: '🕐', label: 'Like 20-30 minutes' },
              { key: 'long', icon: '🌙', label: "A while — I'm not in a hurry" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleStep3(opt.key)}
                className="w-full bg-white border border-gray-200 hover:border-amber-300 rounded-lg p-3 text-left flex items-center gap-2"
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — Results */}
      {step === 4 && (
        <div>
          {loading ? (
            <p className="text-center text-gray-500 py-4">🦉 Looking through your shelves...</p>
          ) : (
            <>
              {results.length > 0 ? (
                <>
                  <p className="text-gray-700 mb-3">Here&apos;s what I found for you at home:</p>
                  <div className="space-y-2">
                    {results.map((item) => (
                      <ItemCard key={item.id} item={item} compact />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-600 mb-3">
                  Hmm, I don&apos;t see anything perfect on your shelf for that right now.
                </p>
              )}

              {suggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {results.length > 0 ? 'Also check out:' : 'Here are some ideas your mom might want to add someday:'}
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((s: any, i: number) => (
                      <div key={i} className="rounded-lg border border-dashed border-gray-200 p-3 bg-white/50">
                        <div className="flex gap-2">
                          {s.cover_image_url && (
                            <img src={s.cover_image_url} alt="" className="w-10 h-14 object-cover rounded" />
                          )}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">{s.title}</h5>
                            {s.author && <p className="text-xs text-gray-500">{s.author}</p>}
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{s.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setStep(1); setFormat(null); setMood(null); setTimeAvail(null); setResults([]); setSuggestions([]) }}
                className="mt-3 w-full py-2 text-sm text-amber-700 hover:text-amber-900 border border-amber-200 rounded-lg bg-white"
              >
                Ask me something different
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Kid Library View
// ============================================================================
export function KidLibraryView({ kidName }: { kidName: string }) {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterSubject, setFilterSubject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBuddy, setShowBuddy] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [warnings, setWarnings] = useState<AccessibilityWarning[]>([])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/library?action=get_all_items'
      if (filterType) url += `&filter_type=${filterType}`
      if (filterSubject) url += `&subject=${filterSubject}`
      const res = await fetch(url)
      const json = await res.json()
      setItems(json.items || [])
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      setLoading(false)
    }
  }, [filterType, filterSubject])

  useEffect(() => { loadItems() }, [loadItems])

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadItems(); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/library?action=search&q=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      setItems(json.items || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = async (item: LibraryItem) => {
    setSelectedItem(item)
    // Check accessibility warnings
    if (item.accessibility_flags && item.accessibility_flags.length > 0) {
      try {
        const res = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_accessibility_match',
            item_id: item.id,
            kid_names: [kidName],
          }),
        })
        const json = await res.json()
        setWarnings(json.warnings || [])
      } catch {
        setWarnings([])
      }
    } else {
      setWarnings([])
    }
    // Log usage
    fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_item_used', item_id: item.id, kid_name: kidName }),
    }).catch(() => {})
  }

  if (showBuddy) {
    return <LibraryBuddy kidName={kidName} onClose={() => setShowBuddy(false)} />
  }

  if (selectedItem) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <button
          onClick={() => { setSelectedItem(null); setWarnings([]) }}
          className="text-sm text-blue-600 hover:text-blue-800 mb-3 flex items-center gap-1"
        >
          ← Back to library
        </button>

        <div className="flex gap-4 mb-4">
          {selectedItem.cover_image_url && (
            <img src={selectedItem.cover_image_url} alt="" className="w-20 h-28 object-cover rounded-lg" />
          )}
          <div>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded mb-1 ${TYPE_COLORS[selectedItem.item_type]}`}>
              {TYPE_ICONS[selectedItem.item_type]} {selectedItem.item_type}
            </span>
            <h3 className="text-lg font-semibold text-gray-900">{selectedItem.title}</h3>
            {selectedItem.author_or_publisher && (
              <p className="text-sm text-gray-500">{selectedItem.author_or_publisher}</p>
            )}
          </div>
        </div>

        {/* Accessibility warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <h4 className="text-sm font-medium text-amber-800 flex items-center gap-1 mb-2">
              <AlertTriangle className="w-4 h-4" /> Heads up
            </h4>
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700">{w.tip}</li>
              ))}
            </ul>
          </div>
        )}

        {selectedItem.description && (
          <p className="text-sm text-gray-600 mb-3">{selectedItem.description}</p>
        )}

        {selectedItem.subject_tags && selectedItem.subject_tags.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 mb-1">Subjects</h4>
            <div className="flex flex-wrap gap-1">
              {selectedItem.subject_tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {selectedItem.edu_uses && selectedItem.edu_uses.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 mb-1">Learning Uses</h4>
            <div className="flex flex-wrap gap-1">
              {selectedItem.edu_uses.map((use) => (
                <span key={use} className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded">{use}</span>
              ))}
            </div>
          </div>
        )}

        {selectedItem.item_type === 'game' && (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            {selectedItem.player_min && (
              <div>Players: {selectedItem.player_min}-{selectedItem.player_max || '?'}</div>
            )}
            {selectedItem.play_time_min && (
              <div>Time: {selectedItem.play_time_min}-{selectedItem.play_time_max || '?'} min</div>
            )}
            {selectedItem.play_style && <div>Style: {selectedItem.play_style}</div>}
          </div>
        )}

        {selectedItem.location_in_home && (
          <p className="text-xs text-gray-400 mt-3">Location: {selectedItem.location_in_home}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + Buddy button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Our Library
        </h3>
        <button
          onClick={() => setShowBuddy(true)}
          className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
        >
          🦉 Ask Buddy
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search books, games, resources..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* Type filters */}
      <div className="flex gap-2">
        {[null, 'book', 'game', 'toy', 'resource'].map((type) => (
          <button
            key={type || 'all'}
            onClick={() => { setFilterType(type); setSearchQuery('') }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filterType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}s` : 'All'}
          </button>
        ))}
      </div>

      {/* Subject filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterSubject(null)}
          className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
            !filterSubject ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          All Subjects
        </button>
        {SUBJECT_OPTIONS.slice(0, 8).map((subj) => (
          <button
            key={subj}
            onClick={() => setFilterSubject(subj)}
            className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
              filterSubject === subj ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {subj.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading library...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No items found. Try a different filter or ask Buddy!</p>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => handleSelectItem(item)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Parent Library Admin
// ============================================================================
export function ParentLibraryAdmin() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null)
  const [usageStats, setUsageStats] = useState<any[]>([])
  const [showStats, setShowStats] = useState(false)

  // Add form state
  const [formData, setFormData] = useState({
    item_type: 'book' as string,
    title: '',
    author_or_publisher: '',
    isbn: '',
    upc: '',
    description: '',
    grade_min: '' as string | number,
    grade_max: '' as string | number,
    subject_tags: [] as string[],
    edu_uses: '' as string,
    player_min: '' as string | number,
    player_max: '' as string | number,
    play_time_min: '' as string | number,
    play_time_max: '' as string | number,
    play_style: '' as string,
    competition_level: '' as string,
    accessibility_flags: [] as string[],
    who_uses: [] as string[],
    location_in_home: '',
    condition: 'great' as string,
  })

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/library?action=get_all_items'
      if (filterType) url += `&filter_type=${filterType}`
      const res = await fetch(url)
      const json = await res.json()
      setItems(json.items || [])
    } catch (err) {
      console.error('Failed to load items:', err)
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => { loadItems() }, [loadItems])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/library?action=get_usage_stats')
      const json = await res.json()
      setUsageStats(json.stats || [])
      setShowStats(true)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleBarcodeLookup = async () => {
    const code = formData.isbn || formData.upc
    if (!code) return
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lookup_barcode',
          barcode: code,
          barcode_type: formData.isbn ? 'isbn' : 'upc',
        }),
      })
      const json = await res.json()
      if (json.found && json.item) {
        setFormData((prev) => ({
          ...prev,
          title: json.item.title || prev.title,
          author_or_publisher: json.item.author_or_publisher || prev.author_or_publisher,
          description: json.item.description || prev.description,
          item_type: json.item.item_type || prev.item_type,
          subject_tags: json.item.subject_tags || prev.subject_tags,
        }))
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err)
    }
  }

  const handleSave = async () => {
    const payload: any = {
      action: editingItem ? 'update_item' : 'add_item',
      ...(editingItem ? { id: editingItem.id } : {}),
      item_type: formData.item_type,
      title: formData.title,
      author_or_publisher: formData.author_or_publisher || null,
      isbn: formData.isbn || null,
      upc: formData.upc || null,
      description: formData.description || null,
      grade_min: formData.grade_min ? Number(formData.grade_min) : null,
      grade_max: formData.grade_max ? Number(formData.grade_max) : null,
      subject_tags: formData.subject_tags.length > 0 ? formData.subject_tags : null,
      edu_uses: formData.edu_uses ? formData.edu_uses.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
      player_min: formData.player_min ? Number(formData.player_min) : null,
      player_max: formData.player_max ? Number(formData.player_max) : null,
      play_time_min: formData.play_time_min ? Number(formData.play_time_min) : null,
      play_time_max: formData.play_time_max ? Number(formData.play_time_max) : null,
      play_style: formData.play_style || null,
      competition_level: formData.competition_level || null,
      accessibility_flags: formData.accessibility_flags.length > 0 ? formData.accessibility_flags : null,
      who_uses: formData.who_uses.length > 0 ? formData.who_uses : null,
      location_in_home: formData.location_in_home || null,
      condition: formData.condition || null,
    }

    try {
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setShowAddForm(false)
      setEditingItem(null)
      resetForm()
      loadItems()
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_item', id }),
      })
      loadItems()
    } catch (err) {
      console.error('Archive failed:', err)
    }
  }

  const startEdit = (item: LibraryItem) => {
    setEditingItem(item)
    setFormData({
      item_type: item.item_type,
      title: item.title,
      author_or_publisher: item.author_or_publisher || '',
      isbn: item.isbn || '',
      upc: item.upc || '',
      description: item.description || '',
      grade_min: item.grade_min ?? '',
      grade_max: item.grade_max ?? '',
      subject_tags: item.subject_tags || [],
      edu_uses: (item.edu_uses || []).join(', '),
      player_min: item.player_min ?? '',
      player_max: item.player_max ?? '',
      play_time_min: item.play_time_min ?? '',
      play_time_max: item.play_time_max ?? '',
      play_style: item.play_style || '',
      competition_level: item.competition_level || '',
      accessibility_flags: item.accessibility_flags || [],
      who_uses: item.who_uses || [],
      location_in_home: item.location_in_home || '',
      condition: item.condition || 'great',
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      item_type: 'book', title: '', author_or_publisher: '', isbn: '', upc: '',
      description: '', grade_min: '', grade_max: '', subject_tags: [], edu_uses: '',
      player_min: '', player_max: '', play_time_min: '', play_time_max: '',
      play_style: '', competition_level: '', accessibility_flags: [], who_uses: [],
      location_in_home: '', condition: 'great',
    })
  }

  const toggleArrayField = (field: 'subject_tags' | 'accessibility_flags' | 'who_uses', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v: string) => v !== value)
        : [...prev[field], value],
    }))
  }

  // Add/Edit Form
  if (showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h3>
          <button
            onClick={() => { setShowAddForm(false); setEditingItem(null); resetForm() }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barcode lookup */}
        {!editingItem && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700 mb-2 font-medium">Quick Add — ISBN / UPC Lookup</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.isbn}
                onChange={(e) => setFormData((p) => ({ ...p, isbn: e.target.value }))}
                placeholder="ISBN (books)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button onClick={handleBarcodeLookup} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                Look Up
              </button>
            </div>
          </div>
        )}

        {/* Core fields */}
        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={formData.item_type}
              onChange={(e) => setFormData((p) => ({ ...p, item_type: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="book">Book</option>
              <option value="game">Game</option>
              <option value="toy">Toy / Manipulative</option>
              <option value="resource">Resource</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Author / Publisher</label>
            <input
              type="text"
              value={formData.author_or_publisher}
              onChange={(e) => setFormData((p) => ({ ...p, author_or_publisher: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Grade Min</label>
              <input
                type="number"
                value={formData.grade_min}
                onChange={(e) => setFormData((p) => ({ ...p, grade_min: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                min="1" max="12"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Grade Max</label>
              <input
                type="number"
                value={formData.grade_max}
                onChange={(e) => setFormData((p) => ({ ...p, grade_max: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                min="1" max="12"
              />
            </div>
          </div>

          {/* Subject tags */}
          <div>
            <label className="text-sm font-medium text-gray-700">Subjects</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SUBJECT_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleArrayField('subject_tags', s)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.subject_tags.includes(s)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Educational Uses (comma-separated)</label>
            <input
              type="text"
              value={formData.edu_uses}
              onChange={(e) => setFormData((p) => ({ ...p, edu_uses: e.target.value }))}
              placeholder="vocabulary, math facts, spelling..."
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          {/* Game-specific fields */}
          {(formData.item_type === 'game' || formData.item_type === 'toy') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Min Players</label>
                  <input type="number" value={formData.player_min} onChange={(e) => setFormData((p) => ({ ...p, player_min: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Players</label>
                  <input type="number" value={formData.player_max} onChange={(e) => setFormData((p) => ({ ...p, player_max: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Play Time Min (min)</label>
                  <input type="number" value={formData.play_time_min} onChange={(e) => setFormData((p) => ({ ...p, play_time_min: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Play Time Max (min)</label>
                  <input type="number" value={formData.play_time_max} onChange={(e) => setFormData((p) => ({ ...p, play_time_max: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Play Style</label>
                  <select value={formData.play_style} onChange={(e) => setFormData((p) => ({ ...p, play_style: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">--</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="competitive">Competitive</option>
                    <option value="mixed">Mixed</option>
                    <option value="solo">Solo</option>
                    <option value="any">Any</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Competition Level</label>
                  <select value={formData.competition_level} onChange={(e) => setFormData((p) => ({ ...p, competition_level: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">--</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Accessibility flags */}
          <div>
            <label className="text-sm font-medium text-gray-700">Accessibility Flags</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['color_heavy', 'reading_heavy', 'math_heavy', 'verbal_required', 'auditory_instruction_heavy', 'timed_pressure', 'complex_rules', 'loud_chaotic', 'highly_competitive'].map((flag) => (
                <button
                  key={flag}
                  type="button"
                  onClick={() => toggleArrayField('accessibility_flags', flag)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.accessibility_flags.includes(flag)
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {flag.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Who uses */}
          <div>
            <label className="text-sm font-medium text-gray-700">Who Uses</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ALL_KIDS.map((kid) => (
                <button
                  key={kid}
                  type="button"
                  onClick={() => toggleArrayField('who_uses', kid)}
                  className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                    formData.who_uses.includes(kid)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {kid}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Location in Home</label>
              <input type="text" value={formData.location_in_home} onChange={(e) => setFormData((p) => ({ ...p, location_in_home: e.target.value }))} placeholder="school shelf, living room..." className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Condition</label>
              <select value={formData.condition} onChange={(e) => setFormData((p) => ({ ...p, condition: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="great">Great</option>
                <option value="good">Good</option>
                <option value="worn">Worn</option>
                <option value="missing pieces">Missing Pieces</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!formData.title.trim()}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {editingItem ? 'Save Changes' : 'Add to Library'}
          </button>
          <button
            onClick={() => { setShowAddForm(false); setEditingItem(null); resetForm() }}
            className="px-4 py-2.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Usage stats view
  if (showStats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Usage Stats</h3>
          <button onClick={() => setShowStats(false)} className="text-sm text-blue-600 hover:text-blue-800">
            ← Back
          </button>
        </div>
        <div className="space-y-2">
          {usageStats.map((stat: any) => (
            <div key={stat.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
              <div>
                <div className="font-medium text-sm">{stat.title}</div>
                <div className="text-xs text-gray-500">{stat.item_type}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">{stat.times_selected} uses</div>
                {stat.last_selected && (
                  <div className="text-xs text-gray-400">Last: {new Date(stat.last_selected).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Main admin list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Home Library ({items.length} items)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={loadStats}
            className="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            Stats
          </button>
          <button
            onClick={() => { resetForm(); setShowAddForm(true) }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2">
        {[null, 'book', 'game', 'toy', 'resource'].map((type) => (
          <button
            key={type || 'all'}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filterType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}s` : 'All'}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1">
                <ItemCard item={item} compact />
              </div>
              <button
                onClick={() => startEdit(item)}
                className="p-2 text-gray-400 hover:text-blue-600"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleArchive(item.id)}
                className="p-2 text-gray-400 hover:text-red-600"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
