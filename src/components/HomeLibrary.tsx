'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Gamepad2, Puzzle, Search, Plus, Archive, Edit3, Star, AlertTriangle, X, Filter, ChevronDown, Camera, Check } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import KidLibrarySubmit from './KidLibrarySubmit'

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
  hook?: string | null
  cover_image_url: string | null
  grade_min: number | null
  grade_max: number | null
  age_range_min?: number | null
  age_range_max?: number | null
  subject_tags: string[]
  edu_uses: string[]
  genres?: string[]
  topics?: string[]
  player_min: number | null
  player_max: number | null
  play_time_min: number | null
  play_time_max: number | null
  play_style: string | null
  competition_level: string | null
  accessibility_flags: string[]
  who_uses: string[]
  location_in_home: string | null
  location_details?: string | null
  condition: string | null
  favorite_flag: boolean
  last_used: string | null
  custom_tags?: string[]
  // Browse-view extras
  avg_rating?: string | number | null
  rating_count?: number
  review_count?: number
  kid_read_status?: string | null
}

interface ReadStatus {
  kid_name: string
  status: 'not_started' | 'want_to_read' | 'reading' | 'finished' | 'read_again'
  started_at?: string | null
  finished_at?: string | null
  current_page?: number | null
  current_chapter?: string | null
}

interface BookRating {
  rated_by: string
  rating: number
}

interface BookReview {
  id: string
  reviewer: string
  review_text: string
  favorite_part?: string | null
  favorite_character?: string | null
  would_recommend?: boolean | null
  stars_earned: number
  created_at: string
}

interface BookRecommendation {
  id: string
  title: string
  author_or_publisher: string | null
  cover_image_url: string | null
  item_type: string
  score: number
}

interface BookDetailPayload {
  item: LibraryItem
  read_status: ReadStatus[]
  kid_status: ReadStatus | null
  ratings: BookRating[]
  avg_rating: number | null
  reviews: BookReview[]
  recommendations: BookRecommendation[]
}

const READ_STATUS_META: Record<string, { label: string; emoji: string; color: string }> = {
  not_started: { label: 'Not Started', emoji: '➖', color: 'bg-gray-100 text-gray-600' },
  want_to_read: { label: 'Want to Read', emoji: '📋', color: 'bg-amber-100 text-amber-700' },
  reading: { label: 'Currently Reading', emoji: '📖', color: 'bg-blue-100 text-blue-700' },
  finished: { label: 'Finished', emoji: '✅', color: 'bg-green-100 text-green-700' },
  read_again: { label: 'Read Again', emoji: '🔄', color: 'bg-purple-100 text-purple-700' },
}

const GENRE_OPTIONS = [
  'adventure','animals','fantasy','mystery','humor','historical','science fiction',
  'realistic fiction','biography','nature','crafts','cooking','space','geography','art','poetry','faith','family',
]
const TOPIC_OPTIONS = [
  'friendship','courage','growing up','nature','survival','problem solving',
  'kindness','creativity','teamwork','animals','science experiments','world cultures',
]
const LOCATION_OPTIONS = [
  'Bookshelf (living room)','Bookshelf (school room)','Bookshelf (kids\u2019 room)',
  'Nightstand','Library (checked out)','Lent to a friend','Lost / Can\u2019t find','Digital (Kindle/tablet)',
]

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

const VIBE_TAGS = [
  'adventure', 'funny', 'animals', 'space', 'cooking', 'art', 'mystery',
  'sports', 'science experiments', 'building', 'music', 'history', 'fantasy',
  'scary', 'nature',
]

const VIBE_EMOJI: Record<string, string> = {
  adventure: '\u{1F5FA}\uFE0F', funny: '\u{1F602}', animals: '\u{1F43E}', space: '\u{1F680}', cooking: '\u{1F373}',
  art: '\u{1F3A8}', mystery: '\u{1F50D}', sports: '\u26BD', 'science experiments': '\u{1F9EA}',
  building: '\u{1F527}', music: '\u{1F3B5}', history: '\u{1F4DC}', fantasy: '\u{1F409}', scary: '\u{1F47B}', nature: '\u{1F33F}',
}

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
// Book Card — rich grid card with cover, rating, read-status badge
// ============================================================================
function BookCard({ item, onClick }: { item: LibraryItem; onClick: () => void }) {
  const avg = item.avg_rating != null ? Number(item.avg_rating) : null
  const statusMeta = item.kid_read_status ? READ_STATUS_META[item.kid_read_status] : null
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-lg overflow-hidden bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="relative aspect-[2/3] bg-gray-50 overflow-hidden">
        {item.cover_image_url ? (
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {statusMeta && item.kid_read_status !== 'not_started' && (
          <div className="absolute top-1.5 right-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-sm ${statusMeta.color}`}>
              {statusMeta.emoji}
            </span>
          </div>
        )}
        {item.favorite_flag && (
          <div className="absolute top-1.5 left-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 drop-shadow" />
          </div>
        )}
      </div>
      <div className="p-2">
        <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{item.title}</h4>
        {item.author_or_publisher && (
          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{item.author_or_publisher}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          {avg != null ? (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-gray-600 font-medium">{avg}</span>
              {item.review_count != null && item.review_count > 0 && (
                <span className="text-[10px] text-gray-400 ml-0.5">· {item.review_count}</span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-gray-300">No ratings</span>
          )}
          {item.subject_tags && item.subject_tags[0] && (
            <span className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded">{item.subject_tags[0]}</span>
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
// My Books Section (kid reading progress)
// ============================================================================
function MyBooksSection({ kidName }: { kidName: string }) {
  const [books, setBooks] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/reading?action=get_my_books&kid_name=${kidName.toLowerCase()}`)
      .then(r => r.json())
      .then(data => { setBooks(data.books || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [kidName])

  if (!loaded || books.length === 0) return null

  const reading = books.filter((b: any) => b.status === 'reading')
  const finished = books.filter((b: any) => b.status === 'finished').slice(0, 3)

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-600" /> My Books
      </h4>
      {reading.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Currently Reading</p>
          {reading.map((b: any) => (
            <div key={b.id || b.book_title} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <span className="text-lg">{'\u{1F4D6}'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{b.book_title}</p>
                {b.total_pages && <p className="text-xs text-gray-500">Page {b.current_page || 0} of {b.total_pages}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {finished.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Recently Finished</p>
          {finished.map((b: any) => (
            <div key={b.id || b.book_title} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{'\u2705'}</span>
              <span className="truncate">{b.book_title}</span>
              {b.rating && <span className="text-xs text-amber-500">{'\u2B50'.repeat(Math.min(b.rating, 5))}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Star Rating — interactive 1..5
// ============================================================================
function StarRating({
  value,
  onChange,
  size = 'md',
  readOnly = false,
}: {
  value: number
  onChange?: (n: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const px = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover ?? value) >= n
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange?.(n)}
            className={readOnly ? 'cursor-default' : 'cursor-pointer'}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              className={`${px} ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Book Detail View — full redesign (LIB-1..9)
// ============================================================================
function BookDetailView({
  bookId,
  kidName,
  onBack,
  onOpenBook,
}: {
  bookId: string
  kidName: string
  onBack: () => void
  onOpenBook: (id: string) => void
}) {
  const [detail, setDetail] = useState<BookDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [warnings, setWarnings] = useState<AccessibilityWarning[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [favoritePart, setFavoritePart] = useState('')
  const [favoriteCharacter, setFavoriteCharacter] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [savingReview, setSavingReview] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/library?action=get_book_detail&id=${bookId}&kid_name=${encodeURIComponent(kidName)}`
      )
      const json = await res.json()
      if (json.item) {
        setDetail(json)
        // Accessibility warnings
        if (json.item.accessibility_flags?.length > 0) {
          try {
            const w = await fetch('/api/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'check_accessibility_match',
                item_id: json.item.id,
                kid_names: [kidName],
              }),
            })
            const wJson = await w.json()
            setWarnings(wJson.warnings || [])
          } catch { setWarnings([]) }
        }
      }
    } catch (err) {
      console.error('get_book_detail failed', err)
    } finally {
      setLoading(false)
    }
  }, [bookId, kidName])

  useEffect(() => { loadDetail() }, [loadDetail])

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const setReadStatus = async (status: string) => {
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_read_status', book_id: bookId, kid_name: kidName, status }),
      })
      if (res.ok) {
        flashToast(`Marked as ${READ_STATUS_META[status]?.label || status}`)
        loadDetail()
      }
    } catch (err) {
      console.error('set_read_status failed', err)
    }
  }

  const rate = async (n: number) => {
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rate_book', book_id: bookId, rated_by: kidName, rating: n }),
      })
      if (res.ok) {
        flashToast(`Rated ${n} star${n > 1 ? 's' : ''}`)
        loadDetail()
      }
    } catch (err) {
      console.error('rate_book failed', err)
    }
  }

  const submitReview = async () => {
    if (reviewText.trim().length < 10) {
      flashToast('Write at least 10 characters to earn stars')
      return
    }
    setSavingReview(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_review',
          book_id: bookId,
          reviewer: kidName,
          review_text: reviewText,
          favorite_part: favoritePart || null,
          favorite_character: favoriteCharacter || null,
          would_recommend: wouldRecommend,
        }),
      })
      if (res.ok) {
        flashToast('+3 stars earned for your review!')
        setShowReviewForm(false)
        setReviewText('')
        setFavoritePart('')
        setFavoriteCharacter('')
        setWouldRecommend(null)
        loadDetail()
      }
    } catch (err) {
      console.error('add_review failed', err)
    } finally {
      setSavingReview(false)
    }
  }

  if (loading || !detail) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 mb-3">
          ← Back to library
        </button>
        <p className="text-center text-gray-500 py-8">Loading...</p>
      </div>
    )
  }

  const item = detail.item
  const myRating = detail.ratings.find((r) => r.rated_by === kidName.toLowerCase())?.rating || 0
  const myStatus = detail.kid_status?.status || 'not_started'
  const avg = detail.avg_rating != null ? Number(detail.avg_rating) : null
  const ageLabel = item.age_range_min != null && item.age_range_max != null
    ? `Ages ${item.age_range_min}–${item.age_range_max}`
    : item.age_range_min != null ? `Ages ${item.age_range_min}+` : null
  const gradeLabel = item.grade_min != null && item.grade_max != null
    ? `Grades ${item.grade_min}–${item.grade_max}`
    : item.grade_min != null ? `Grade ${item.grade_min}+` : null
  const whatsItAbout = item.hook || item.description

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
          ← Back to library
        </button>

        {/* Header: cover + title/author/badges */}
        <div className="flex gap-5 mb-5">
          <div className="shrink-0">
            {item.cover_image_url ? (
              <img
                src={item.cover_image_url}
                alt={item.title}
                className="w-32 h-44 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-32 h-44 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                <BookOpen className="w-10 h-10 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${TYPE_COLORS[item.item_type]}`}>
              {TYPE_ICONS[item.item_type]} {item.item_type}
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-1 leading-tight">{item.title}</h2>
            {item.author_or_publisher && (
              <p className="text-sm text-gray-500 mt-0.5">by {item.author_or_publisher}</p>
            )}

            {/* Age / Grade badges */}
            {(ageLabel || gradeLabel) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ageLabel && (
                  <span className="text-xs px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full border border-cyan-100">
                    {ageLabel}
                  </span>
                )}
                {gradeLabel && (
                  <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
                    {gradeLabel}
                  </span>
                )}
              </div>
            )}

            {/* Average rating */}
            <div className="mt-3 flex items-center gap-2">
              <StarRating value={Math.round(avg || 0)} readOnly size="sm" />
              <span className="text-xs text-gray-500">
                {avg != null
                  ? `${avg} avg · ${detail.ratings.length} rating${detail.ratings.length !== 1 ? 's' : ''}`
                  : 'No ratings yet'}
              </span>
            </div>
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

        {/* What's it about? */}
        {whatsItAbout && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">What&apos;s it about?</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{whatsItAbout}</p>
          </div>
        )}

        {/* Read status selector */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">My read status</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['want_to_read', 'reading', 'finished', 'read_again'] as const).map((s) => {
              const meta = READ_STATUS_META[s]
              const active = myStatus === s
              return (
                <button
                  key={s}
                  onClick={() => setReadStatus(active ? 'not_started' : s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 ${
                    active
                      ? `${meta.color} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg leading-none mb-1">{meta.emoji}</div>
                  {meta.label}
                </button>
              )
            })}
          </div>
          {detail.kid_status?.current_page && (
            <p className="text-xs text-gray-500 mt-2">
              On page {detail.kid_status.current_page}
              {detail.kid_status.current_chapter && ` · ${detail.kid_status.current_chapter}`}
            </p>
          )}
        </div>

        {/* My rating */}
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Rate this book</h4>
          <div className="flex items-center gap-3">
            <StarRating value={myRating} onChange={rate} size="lg" />
            {myRating > 0 && <span className="text-xs text-gray-500">You rated this {myRating}/5</span>}
          </div>
        </div>

        {/* Tag groups */}
        {(item.subject_tags?.length || item.edu_uses?.length || item.genres?.length || item.topics?.length || item.custom_tags?.length) ? (
          <div className="mb-5 space-y-2">
            {item.subject_tags?.length > 0 && (
              <TagGroup label="Subjects" tags={item.subject_tags} color="bg-blue-50 text-blue-700" />
            )}
            {item.edu_uses?.length > 0 && (
              <TagGroup label="Learning Uses" tags={item.edu_uses} color="bg-green-50 text-green-700" />
            )}
            {item.genres && item.genres.length > 0 && (
              <TagGroup label="Genres" tags={item.genres} color="bg-indigo-50 text-indigo-700" />
            )}
            {item.topics && item.topics.length > 0 && (
              <TagGroup label="Topics" tags={item.topics} color="bg-orange-50 text-orange-700" />
            )}
            {item.custom_tags && item.custom_tags.length > 0 && (
              <TagGroup
                label="Vibes"
                tags={item.custom_tags.map((t) => `${VIBE_EMOJI[t] || '\u2728'} ${t}`)}
                color="bg-purple-50 text-purple-700"
              />
            )}
          </div>
        ) : null}

        {/* Location */}
        {item.location_in_home && (
          <div className="mb-5 flex items-center gap-1.5 text-xs text-gray-500">
            <span>📍</span>
            <span>{item.location_in_home}</span>
            {item.location_details && <span className="text-gray-400">· {item.location_details}</span>}
          </div>
        )}

        {/* Reviews */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Reviews {detail.reviews.length > 0 && <span className="text-gray-400">({detail.reviews.length})</span>}
            </h4>
            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
              >
                ✍️ Leave a review (+3 ⭐)
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="mb-4 rounded-lg border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Your review (10+ characters)</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="What did you think?"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">What was your favorite part? (optional)</label>
                <input
                  value={favoritePart}
                  onChange={(e) => setFavoritePart(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Who was your favorite character? (optional)</label>
                <input
                  value={favoriteCharacter}
                  onChange={(e) => setFavoriteCharacter(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Would you tell a friend to read it?</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWouldRecommend(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${
                      wouldRecommend === true ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    👍 Yes
                  </button>
                  <button
                    onClick={() => setWouldRecommend(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${
                      wouldRecommend === false ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    👎 No
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitReview}
                  disabled={savingReview}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingReview ? 'Saving...' : 'Save review & earn 3 ⭐'}
                </button>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {detail.reviews.length === 0 && !showReviewForm && (
            <p className="text-xs text-gray-400">No reviews yet. Be the first!</p>
          )}

          <div className="space-y-2">
            {detail.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 capitalize">{r.reviewer}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{r.review_text}</p>
                {(r.favorite_part || r.favorite_character) && (
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    {r.favorite_part && <div><span className="font-medium">Favorite part:</span> {r.favorite_part}</div>}
                    {r.favorite_character && <div><span className="font-medium">Favorite character:</span> {r.favorite_character}</div>}
                  </div>
                )}
                {r.would_recommend != null && (
                  <div className="mt-1 text-xs">
                    {r.would_recommend ? '👍 Would recommend' : '👎 Wouldn\u2019t recommend'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {detail.recommendations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">You might also like...</h4>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {detail.recommendations.map((rec) => (
              <button
                key={rec.id}
                onClick={() => onOpenBook(rec.id)}
                className="shrink-0 w-28 text-left hover:opacity-80 transition-opacity"
              >
                {rec.cover_image_url ? (
                  <img
                    src={rec.cover_image_url}
                    alt={rec.title}
                    className="w-28 h-40 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-28 h-40 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                    <BookOpen className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <p className="text-xs font-medium text-gray-900 mt-1.5 line-clamp-2">{rec.title}</p>
                {rec.author_or_publisher && (
                  <p className="text-[10px] text-gray-500 line-clamp-1">{rec.author_or_publisher}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TagGroup({ label, tags, color }: { label: string; tags: string[]; color: string }) {
  return (
    <div>
      <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</h5>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className={`text-xs px-2 py-0.5 rounded ${color}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Kid Library View
// ============================================================================
export function KidLibraryView({ kidName }: { kidName: string }) {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string | null>('book')
  const [filterSubject, setFilterSubject] = useState<string | null>(null)
  const [filterGenre, setFilterGenre] = useState<string | null>(null)
  const [filterReadStatus, setFilterReadStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'title' | 'recent' | 'rating' | 'reviews'>('title')
  const [searchQuery, setSearchQuery] = useState('')
  const [showBuddy, setShowBuddy] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [warnings, setWarnings] = useState<AccessibilityWarning[]>([])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      // Books use the browse endpoint (with avg rating + read status per kid)
      if (filterType === 'book' || !filterType) {
        const params = new URLSearchParams()
        params.set('action', 'get_library_browse')
        params.set('kid_name', kidName)
        params.set('sort', sortBy)
        if (filterType) params.set('filter_type', filterType)
        if (filterSubject) params.set('subject', filterSubject)
        if (filterGenre) params.set('genre', filterGenre)
        if (filterReadStatus) params.set('read_status', filterReadStatus)
        const res = await fetch(`/api/library?${params.toString()}`)
        const json = await res.json()
        setItems(json.items || [])
      } else {
        let url = '/api/library?action=get_all_items'
        if (filterType) url += `&filter_type=${filterType}`
        if (filterSubject) url += `&subject=${filterSubject}`
        const res = await fetch(url)
        const json = await res.json()
        setItems(json.items || [])
      }
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      setLoading(false)
    }
  }, [filterType, filterSubject, filterGenre, filterReadStatus, sortBy, kidName])

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
    // Game/toy/resource uses the lightweight inline view; books get the full
    // redesigned detail page with cover, ratings, reviews, recs.
    if (selectedItem.item_type === 'book') {
      return (
        <BookDetailView
          bookId={selectedItem.id}
          kidName={kidName}
          onBack={() => { setSelectedItem(null); setWarnings([]) }}
          onOpenBook={(id) => {
            const next = items.find((i) => i.id === id)
            if (next) setSelectedItem(next)
            else {
              // Fetch item from API if not in current list
              fetch(`/api/library?action=get_item&id=${id}`)
                .then((r) => r.json())
                .then((j) => { if (j.item) setSelectedItem(j.item) })
                .catch(() => {})
            }
          }}
        />
      )
    }

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

        {selectedItem.custom_tags && selectedItem.custom_tags.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 mb-1">Vibes</h4>
            <div className="flex flex-wrap gap-1">
              {selectedItem.custom_tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                  {VIBE_EMOJI[tag] || '\u2728'} {tag}
                </span>
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

      {/* Kid submission form */}
      <KidLibrarySubmit kidName={kidName} />

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

      {/* Interest / Vibe filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterSubject(null)}
          className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
            !filterSubject ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {VIBE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterSubject(tag)}
            className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
              filterSubject === tag ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {VIBE_EMOJI[tag] || '\u2728'} {tag}
          </button>
        ))}
      </div>

      {/* Genre filter (books only) */}
      {filterType === 'book' && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterGenre(null)}
            className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
              !filterGenre ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            All genres
          </button>
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGenre(g === filterGenre ? null : g)}
              className={`shrink-0 px-2 py-1 rounded text-xs font-medium capitalize ${
                filterGenre === g ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Read status filter + sort (books only) */}
      {filterType === 'book' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: null, label: 'All books' },
              { key: 'not_started', label: '📖 Not read yet' },
              { key: 'reading', label: '📘 Reading now' },
              { key: 'want_to_read', label: '📋 Want to read' },
              { key: 'finished', label: '✅ Finished' },
            ] as const).map((opt) => (
              <button
                key={opt.label}
                onClick={() => setFilterReadStatus(opt.key)}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  filterReadStatus === opt.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-blue-300"
            >
              <option value="title">Title A–Z</option>
              <option value="recent">Recently added</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
            </select>
          </div>
        </div>
      )}

      {/* For You — personalized picks */}
      {!filterType && !filterSubject && !searchQuery && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
          <h4 className="font-semibold text-purple-900 text-sm mb-2">{'\u2728'} Picked for You</h4>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {items.filter(i => i.who_uses?.includes(kidName.toLowerCase()) || i.favorite_flag).slice(0, 5).map(item => (
              <button key={item.id} onClick={() => handleSelectItem(item)}
                className="shrink-0 w-28 text-center p-2 bg-white rounded-lg border hover:border-purple-300 transition">
                <div className="text-2xl mb-1">{TYPE_ICONS[item.item_type] ? '\u{1F4DA}' : '\u{1F3AE}'}</div>
                <p className="text-xs font-medium text-gray-900 line-clamp-2">{item.title}</p>
              </button>
            ))}
            {items.filter(i => i.who_uses?.includes(kidName.toLowerCase()) || i.favorite_flag).length === 0 && (
              <p className="text-xs text-purple-600">Start reading and rating to get personalized picks!</p>
            )}
          </div>
        </div>
      )}

      {/* My Books section */}
      {!filterType && !filterSubject && !searchQuery && (
        <MyBooksSection kidName={kidName} />
      )}

      {/* Items grid */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading library...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No items found. Try a different filter or ask Buddy!</p>
      ) : filterType === 'book' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <BookCard key={item.id} item={item} onClick={() => handleSelectItem(item)} />
          ))}
        </div>
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
  const [showScanner, setShowScanner] = useState(false)
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([])
  const [showPending, setShowPending] = useState(false)
  const [titleSearch, setTitleSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [discoveryMode, setDiscoveryMode] = useState(false)

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

  useEffect(() => { loadPending() }, [])

  const loadPending = async () => {
    try {
      const res = await fetch('/api/library?action=get_pending_submissions')
      const json = await res.json()
      setPendingSubmissions(json.submissions || [])
    } catch {}
  }

  const handleApproveSubmission = async (id: number) => {
    await fetch('/api/library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_submission', submission_id: id }),
    }).catch(() => {})
    loadPending()
    loadItems()
  }

  const handleRejectSubmission = async (id: number) => {
    const note = prompt('Let them know why (optional):') || 'Not right now'
    await fetch('/api/library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_submission', submission_id: id, parent_note: note }),
    }).catch(() => {})
    loadPending()
  }

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

  const handleTitleSearch = async () => {
    if (!titleSearch.trim() || titleSearch.trim().length < 2) return
    setSearching(true)
    setSearchResults([])
    try {
      const query = encodeURIComponent(titleSearch.trim())
      const res = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=8&fields=key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median,subject`)
      const json = await res.json()
      const results = (json.docs || []).map((doc: any) => ({
        title: doc.title,
        author: doc.author_name?.[0] || '',
        year: doc.first_publish_year || '',
        isbn: doc.isbn?.[0] || '',
        cover_id: doc.cover_i,
        pages: doc.number_of_pages_median || null,
        subjects: (doc.subject || []).slice(0, 5),
      }))
      setSearchResults(results)
    } catch { setSearchResults([]) }
    setSearching(false)
  }

  const selectSearchResult = (result: any) => {
    setFormData(prev => ({
      ...prev,
      title: result.title || prev.title,
      author_or_publisher: result.author || prev.author_or_publisher,
      isbn: result.isbn || prev.isbn,
      description: result.cover_id ? `Cover: https://covers.openlibrary.org/b/id/${result.cover_id}-M.jpg` : prev.description,
    }))
    setSearchResults([])
    setTitleSearch('')
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
              <button onClick={() => setShowScanner(true)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center gap-1">
                <Camera className="w-4 h-4" /> Scan
              </button>
              <button onClick={handleBarcodeLookup} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                Look Up
              </button>
            </div>
            {showScanner && (
              <BarcodeScanner
                onScan={(code) => {
                  setShowScanner(false)
                  setFormData((p) => ({ ...p, isbn: code }))
                  // Auto-trigger lookup
                  setTimeout(() => handleBarcodeLookup(), 100)
                }}
                onClose={() => setShowScanner(false)}
              />
            )}
          </div>
        )}

        {/* Title / Author Search */}
        {!editingItem && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-sm text-emerald-700 mb-2 font-medium">Search by Title or Author</p>
            <div className="flex gap-2">
              <input type="text" value={titleSearch}
                onChange={e => setTitleSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTitleSearch()}
                placeholder='Type a title or author name (e.g., "Land of Stories")'
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={handleTitleSearch} disabled={searching || titleSearch.trim().length < 2}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                <Search className="w-4 h-4" /> {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg bg-white max-h-64 overflow-y-auto divide-y">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => selectSearchResult(r)}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center gap-3 text-sm">
                    {r.cover_id ? (
                      <img src={`https://covers.openlibrary.org/b/id/${r.cover_id}-S.jpg`} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-400">?</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.author}{r.year ? ` (${r.year})` : ''}{r.isbn ? ` — ISBN: ${r.isbn}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && <p className="text-xs text-gray-400 mt-2">Searching Open Library...</p>}
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

      {/* Pending kid submissions */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Kid Suggestions ({pendingSubmissions.length} pending)
            </h4>
            <button onClick={() => setShowPending(!showPending)} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
              {showPending ? 'Hide' : 'Review'}
            </button>
          </div>
          {showPending && pendingSubmissions.map((sub: any) => (
            <div key={sub.id} className="bg-white rounded-lg p-3 mb-2 border border-amber-100">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{sub.title}</p>
                  <p className="text-xs text-gray-500">
                    Suggested by {sub.kid_name?.charAt(0).toUpperCase()}{sub.kid_name?.slice(1)} · {sub.item_type}
                    {sub.author_or_publisher ? ` · ${sub.author_or_publisher}` : ''}
                  </p>
                  {sub.reason && <p className="text-xs text-blue-600 italic mt-1">&ldquo;{sub.reason}&rdquo;</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleApproveSubmission(sub.id)}
                  className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Add to Library
                </button>
                <button onClick={() => handleRejectSubmission(sub.id)}
                  className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-red-200">
                  Not Right Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setDiscoveryMode(false)}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${!discoveryMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {'\u{1F4DA}'} Curriculum
        </button>
        <button
          onClick={() => setDiscoveryMode(true)}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${discoveryMode ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {'\u{1F3AF}'} Discovery
        </button>
      </div>

      {/* Subject / Vibe filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {!discoveryMode ? (
          <>
            {SUBJECT_OPTIONS.map((subj) => (
              <button
                key={subj}
                onClick={() => setFilterType(subj)}
                className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
                  filterType === subj ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {subj.replace('_', ' ')}
              </button>
            ))}
          </>
        ) : (
          <>
            {VIBE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterType(tag)}
                className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
                  filterType === tag ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {VIBE_EMOJI[tag] || '\u2728'} {tag}
              </button>
            ))}
          </>
        )}
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
