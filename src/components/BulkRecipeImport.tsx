'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, FileText, Link as LinkIcon, Upload, Loader2, ArrowLeft, ArrowRight,
  Plus, Trash2, ArrowUp, ArrowDown, Check, SkipForward, Video, Sparkles,
} from 'lucide-react'

type StepGroup = 'prep' | 'cook' | 'finish'

interface ReviewIngredient {
  quantity: number | null
  unit: string | null
  name: string
  department: string
  notes: string | null
}

interface ReviewStep {
  order: number
  text: string
  group: StepGroup
}

interface ReviewRecipe {
  tempId: string
  matched_meal_id: string | null
  matched_meal_name: string | null
  name: string
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  source: string
  ingredients: ReviewIngredient[]
  steps: ReviewStep[]
  status: 'pending' | 'saved' | 'skipped'
  suggested_theme?: string | null
  suggested_season?: string | null
  confidence?: number
  suggestion_dismissed?: boolean
}

const THEME_INFO: Record<string, { label: string; emoji: string }> = {
  'american-comfort': { label: 'American Comfort', emoji: '🇺🇸' },
  'asian':            { label: 'Asian Night',      emoji: '🥡' },
  'mexican':          { label: 'Mexican Night',    emoji: '🌮' },
  'pizza-italian':    { label: 'Pizza & Italian',  emoji: '🍕' },
  'soup-comfort':     { label: 'Soup / Comfort',   emoji: '🍲' },
  'bar-night':        { label: 'Bar Night',        emoji: '🥗' },
  'easy-lazy':        { label: 'Easy / Lazy',      emoji: '🥪' },
  'grill':            { label: 'Grill Night',      emoji: '🔥' },
  'experiment':       { label: 'Experiment',       emoji: '🔬' },
  'brunch':           { label: 'Brunch',           emoji: '🍳' },
  'roast-comfort':    { label: 'Roast / Comfort',  emoji: '🏡' },
}

const SEASON_LABEL: Record<string, string> = {
  'both':          '🔄 Both seasons',
  'spring-summer': '🌸 Spring/Summer',
  'fall-winter':   '🍂 Fall/Winter',
}

// Client-side video → base64 JPEG frames. Extracts `count` evenly-spaced
// frames from the uploaded video file via a hidden <video> element and a
// canvas. Keeps the server payload small and avoids any ffmpeg dependency.
async function extractVideoFrames(file: File, count: number, maxWidth = 960): Promise<string[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { video.removeEventListener('error', onError); resolve() }
      const onError = () => { video.removeEventListener('loadedmetadata', onLoaded); reject(new Error('Failed to load video metadata')) }
      video.addEventListener('loadedmetadata', onLoaded, { once: true })
      video.addEventListener('error', onError, { once: true })
    })

    const duration = video.duration
    if (!isFinite(duration) || duration <= 0) {
      throw new Error("Couldn't read video duration — try a different file.")
    }
    if (duration > 600) {
      throw new Error('Video is over 10 minutes — try a shorter recipe video.')
    }

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) throw new Error("Couldn't read video dimensions.")

    const scale = w > maxWidth ? maxWidth / w : 1
    const cw = Math.round(w * scale)
    const ch = Math.round(h * scale)

    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Canvas unavailable in this browser.")

    const frames: string[] = []
    // Skip the first and last frame — usually blank or branding.
    const start = Math.min(0.5, duration * 0.05)
    const end = Math.max(duration - 0.5, duration * 0.95)
    const step = (end - start) / Math.max(1, count - 1)

    for (let i = 0; i < count; i++) {
      const t = start + step * i
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => { video.removeEventListener('error', onError); resolve() }
        const onError = () => { video.removeEventListener('seeked', onSeeked); reject(new Error('Failed to seek video')) }
        video.addEventListener('seeked', onSeeked, { once: true })
        video.addEventListener('error', onError, { once: true })
        video.currentTime = Math.min(Math.max(0, t), duration - 0.05)
      })
      ctx.drawImage(video, 0, 0, cw, ch)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
      frames.push(dataUrl.split(',')[1] || '')
    }
    return frames.filter(Boolean)
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface MealOption {
  id: string
  name: string
  theme: string
}

interface Props {
  onClose: () => void
  onSaved?: () => void
}

const DEPARTMENTS = ['Meat', 'Frozen', 'Pantry', 'Produce', 'Dairy', 'Bakery', 'Spices', 'Canned', 'Other'] as const
const STEP_GROUPS: { value: StepGroup; label: string }[] = [
  { value: 'prep', label: 'Prep' },
  { value: 'cook', label: 'Cook' },
  { value: 'finish', label: 'Finish' },
]

let tmpId = 0
const nextTempId = () => `tmp-${++tmpId}-${Date.now()}`

export default function BulkRecipeImport({ onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'select' | 'paste' | 'url' | 'csv' | 'video' | 'review'>('select')
  const [pasteText, setPasteText] = useState('')
  const [url, setUrl] = useState('')
  const [csvText, setCsvText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [allMeals, setAllMeals] = useState<MealOption[]>([])
  const [recipes, setRecipes] = useState<ReviewRecipe[]>([])
  const [cursor, setCursor] = useState(0)

  // Video import
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoStep, setVideoStep] = useState<'idle' | 'frames' | 'extracting' | 'done'>('idle')
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Load meal options on mount (used by match dropdowns)
  useEffect(() => {
    fetch('/api/meals?action=list_all&include_inactive=true')
      .then(r => r.json())
      .then(data => setAllMeals(data.meals || []))
      .catch(() => {})
  }, [])

  // ── Helpers ──────────────────────────────────────────────

  const matchByName = useCallback((name: string | null): MealOption | null => {
    if (!name) return null
    const lower = name.toLowerCase().trim()
    const exact = allMeals.find(m => m.name.toLowerCase().trim() === lower)
    if (exact) return exact
    return allMeals.find(m =>
      m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase())
    ) || null
  }, [allMeals])

  const toReviewRecipe = useCallback((
    parsed: any,
    overrideMatch?: { id: string; name: string } | null,
    suggestion?: { theme: string | null; season: string | null; confidence: number }
  ): ReviewRecipe => {
    const match = overrideMatch === undefined ? matchByName(parsed.name) : overrideMatch
    return {
      tempId: nextTempId(),
      matched_meal_id: match?.id || null,
      matched_meal_name: match?.name || null,
      name: parsed.name || '',
      prep_time_min: parsed.prep_time_min ?? null,
      cook_time_min: parsed.cook_time_min ?? null,
      servings: parsed.servings ?? 8,
      source: parsed.source || '',
      ingredients: (parsed.ingredients || []).map((ing: any) => ({
        quantity: ing.quantity ?? null,
        unit: ing.unit || null,
        name: ing.name || '',
        department: ing.department || 'Other',
        notes: ing.notes || null,
      })),
      steps: (parsed.steps || []).map((s: any, i: number) => ({
        order: s.order ?? i + 1,
        text: s.text || '',
        group: (s.group as StepGroup) || 'cook',
      })),
      status: 'pending',
      suggested_theme: suggestion?.theme || null,
      suggested_season: suggestion?.season || null,
      confidence: suggestion?.confidence ?? 0,
    }
  }, [matchByName])

  // ── Parse actions ────────────────────────────────────────

  const runParseText = async () => {
    if (!pasteText.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse_recipe_text', text: pasteText }),
      })
      if (!res.ok) throw new Error('Parse failed')
      const data = await res.json()
      setRecipes([toReviewRecipe(data.recipe)])
      setCursor(0)
      setMode('review')
    } catch (e: any) {
      setError(e.message || 'Parse failed')
    } finally {
      setBusy(false)
    }
  }

  const runFetchUrl = async () => {
    if (!url.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_recipe_url', url: url.trim() }),
      })
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const parsed = data.recipe
      if (!parsed.name && parsed.ingredients.length === 0 && parsed.steps.length === 0) {
        throw new Error("Couldn't find a recipe on that page — paste the text manually instead.")
      }
      setRecipes([toReviewRecipe(parsed)])
      setCursor(0)
      setMode('review')
    } catch (e: any) {
      setError(e.message || 'Fetch failed')
    } finally {
      setBusy(false)
    }
  }

  const runVideoExtract = async () => {
    if (!videoFile) return
    setBusy(true)
    setError(null)
    setVideoStep('frames')
    try {
      const frames = await extractVideoFrames(videoFile, 6)
      if (frames.length === 0) throw new Error("Couldn't capture frames from that video.")

      setVideoStep('extracting')
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_from_video', frames, source: videoFile.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Video extraction failed')
      if (data.error) throw new Error(data.error)

      const recipe = data.recipe
      if (!recipe.name && recipe.ingredients.length === 0 && recipe.steps.length === 0) {
        throw new Error("Couldn't find recipe content in the video. Try a reel with clear on-screen text.")
      }

      setRecipes([toReviewRecipe(recipe, undefined, {
        theme: data.suggested_theme,
        season: data.suggested_season,
        confidence: data.confidence,
      })])
      setCursor(0)
      setVideoStep('done')
      setMode('review')
    } catch (e: any) {
      setError(e.message || 'Video extraction failed')
      setVideoStep('idle')
    } finally {
      setBusy(false)
    }
  }

  const runVideoUrl = () => {
    // yt-dlp / Instagram scraping doesn't work on Vercel serverless without
    // extra infrastructure — for now, route URL imports back to the file
    // upload path with a clear message.
    setError("Paste the URL into your browser, download the video, then upload the file below. Social media sites block automated downloads.")
  }

  const runCsvImport = async () => {
    if (!csvText.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_recipe_csv', csv: csvText }),
      })
      if (!res.ok) throw new Error('CSV import failed')
      const data = await res.json()
      const matches = data.matches || []
      if (matches.length === 0) throw new Error('No recipes parsed from CSV — check column headers (meal_name, step_text, etc.)')
      const reviewed: ReviewRecipe[] = matches.map((m: any) => {
        const override = m.matched_meal_id ? { id: m.matched_meal_id, name: m.matched_meal_name } : null
        return toReviewRecipe({ ...m.recipe, name: m.meal_name }, override)
      })
      setRecipes(reviewed)
      setCursor(0)
      setMode('review')
    } catch (e: any) {
      setError(e.message || 'CSV import failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Review edits ────────────────────────────────────────

  const current = recipes[cursor]

  const updateCurrent = (fields: Partial<ReviewRecipe>) => {
    setRecipes(prev => prev.map((r, i) => i === cursor ? { ...r, ...fields } : r))
  }

  const updateIngredient = (idx: number, fields: Partial<ReviewIngredient>) => {
    if (!current) return
    const next = current.ingredients.map((ing, i) => i === idx ? { ...ing, ...fields } : ing)
    updateCurrent({ ingredients: next })
  }

  const addIngredient = () => {
    if (!current) return
    updateCurrent({
      ingredients: [...current.ingredients, { quantity: null, unit: null, name: '', department: 'Other', notes: null }],
    })
  }

  const deleteIngredient = (idx: number) => {
    if (!current) return
    updateCurrent({ ingredients: current.ingredients.filter((_, i) => i !== idx) })
  }

  const updateStep = (idx: number, fields: Partial<ReviewStep>) => {
    if (!current) return
    const next = current.steps.map((s, i) => i === idx ? { ...s, ...fields } : s)
    updateCurrent({ steps: next })
  }

  const addStep = () => {
    if (!current) return
    const next = [...current.steps, { order: current.steps.length + 1, text: '', group: 'cook' as StepGroup }]
    updateCurrent({ steps: next })
  }

  const deleteStep = (idx: number) => {
    if (!current) return
    const next = current.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }))
    updateCurrent({ steps: next })
  }

  const moveStep = (idx: number, dir: -1 | 1) => {
    if (!current) return
    const target = idx + dir
    if (target < 0 || target >= current.steps.length) return
    const next = [...current.steps]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    updateCurrent({ steps: next.map((s, i) => ({ ...s, order: i + 1 })) })
  }

  // ── Save actions ────────────────────────────────────────

  const saveCurrent = async () => {
    if (!current || !current.matched_meal_id) {
      setError('Pick a meal to match this recipe to before saving.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_imported_recipe',
          meal_id: current.matched_meal_id,
          recipe: {
            prep_time_min: current.prep_time_min,
            cook_time_min: current.cook_time_min,
            servings: current.servings,
            source: current.source,
            ingredients: current.ingredients,
            steps: current.steps,
          },
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      updateCurrent({ status: 'saved' })
      onSaved?.()
      if (cursor < recipes.length - 1) setCursor(cursor + 1)
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const skipCurrent = () => {
    if (!current) return
    updateCurrent({ status: 'skipped' })
    if (cursor < recipes.length - 1) setCursor(cursor + 1)
  }

  const saveAll = async () => {
    const ready = recipes.filter(r => r.status === 'pending' && r.matched_meal_id)
    if (ready.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_imported_batch',
          items: ready.map(r => ({
            meal_id: r.matched_meal_id,
            recipe: {
              prep_time_min: r.prep_time_min,
              cook_time_min: r.cook_time_min,
              servings: r.servings,
              source: r.source,
              ingredients: r.ingredients,
              steps: r.steps,
            },
          })),
        }),
      })
      if (!res.ok) throw new Error('Batch save failed')
      const data = await res.json()
      const savedIds = new Set(ready.map(r => r.tempId))
      setRecipes(prev => prev.map(r => savedIds.has(r.tempId) ? { ...r, status: 'saved' } : r))
      onSaved?.()
      setError(null)
      alert(`Saved ${data.saved} recipes`)
    } catch (e: any) {
      setError(e.message || 'Batch save failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Render ──────────────────────────────────────────────

  const goBack = () => { setMode('select'); setError(null) }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-stretch justify-center">
      <div className="bg-white w-full max-w-4xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3 border-b bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📥 Import Recipes
            {mode === 'review' && recipes.length > 1 && (
              <span className="text-xs font-normal text-gray-600">— {cursor + 1} of {recipes.length}</span>
            )}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'select' && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImportModeCard
                icon={<FileText className="w-6 h-6" />}
                title="Paste Recipe"
                desc="Paste text from any site, doc, or cookbook"
                onClick={() => setMode('paste')}
              />
              <ImportModeCard
                icon={<LinkIcon className="w-6 h-6" />}
                title="Recipe URL"
                desc="Fetch from allrecipes.com, foodnetwork, etc."
                onClick={() => setMode('url')}
              />
              <ImportModeCard
                icon={<Upload className="w-6 h-6" />}
                title="CSV Batch"
                desc="Upload multiple recipes at once"
                onClick={() => setMode('csv')}
              />
              <ImportModeCard
                icon={<Video className="w-6 h-6" />}
                title="Video / Reel"
                desc="Upload an Instagram, TikTok, or YouTube recipe video"
                onClick={() => setMode('video')}
              />
            </div>
          )}

          {mode === 'paste' && (
            <div className="p-6 space-y-3">
              <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <p className="text-sm text-gray-600">Paste a recipe from any source. The parser will split it into ingredients and steps — you can edit everything before saving.</p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={14}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                placeholder={`Beef Tacos\nPrep time: 20 min\nCook time: 15 min\nServes: 8\n\n1.5 lb ground beef\n1 packet taco seasoning\n12 taco shells\n2 cups shredded cheese\n\n1. Brown ground beef, drain fat\n2. Add seasoning + water, simmer 5 min\n3. Warm shells per package\n4. Set out toppings\n5. Serve — build your own`}
              />
              <button
                onClick={runParseText}
                disabled={!pasteText.trim() || busy}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Parse
              </button>
            </div>
          )}

          {mode === 'url' && (
            <div className="p-6 space-y-3">
              <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <p className="text-sm text-gray-600">Paste a recipe URL. We'll look for the recipe schema on the page — most major recipe sites work.</p>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="https://www.allrecipes.com/recipe/..."
              />
              <button
                onClick={runFetchUrl}
                disabled={!url.trim() || busy}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Fetch
              </button>
            </div>
          )}

          {mode === 'csv' && (
            <div className="p-6 space-y-3">
              <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <p className="text-sm text-gray-600">
                Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">meal_name, step_order, step_text, step_group, prep_time, cook_time, servings, source</code>. One row per step. Meals are grouped by name.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  setCsvText(text)
                }}
                className="text-sm"
              />
              {csvText && (
                <>
                  <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    rows={8}
                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono"
                  />
                  <button
                    onClick={runCsvImport}
                    disabled={busy}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Parse CSV
                  </button>
                </>
              )}
            </div>
          )}

          {mode === 'video' && (
            <div className="p-6 space-y-4">
              <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-orange-500" />
                  Paste a video URL
                </h3>
                <p className="text-xs text-gray-500 mb-2">Instagram Reels, TikTok, YouTube Shorts, Facebook Reels.</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="https://www.instagram.com/reel/..."
                  />
                  <button
                    onClick={runVideoUrl}
                    disabled={!videoUrl.trim()}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
                  >
                    Fetch
                  </button>
                </div>
              </div>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-white px-2 text-gray-400">Or upload a video file</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-orange-500" />
                  Upload a recipe video
                </h3>
                <p className="text-xs text-gray-500 mb-2">Save the reel to your phone, then upload the file here. Max 100MB · .mp4, .mov, .webm.</p>
                <label
                  className="block border-2 border-dashed border-orange-300 rounded-xl p-6 text-center cursor-pointer hover:bg-orange-50 transition-colors"
                  onDragOver={e => { e.preventDefault() }}
                  onDrop={e => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f && f.type.startsWith('video/')) {
                      setVideoFile(f)
                      setError(null)
                    }
                  }}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (f.size > 100 * 1024 * 1024) {
                        setError('Video is over 100MB — try a shorter clip.')
                        return
                      }
                      setVideoFile(f)
                      setError(null)
                    }}
                  />
                  {videoFile ? (
                    <div>
                      <Video className="w-8 h-8 text-orange-500 mx-auto mb-1" />
                      <div className="text-sm font-medium text-gray-900">{videoFile.name}</div>
                      <div className="text-xs text-gray-500">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB · tap to change</div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <div className="text-sm text-gray-700">Tap to pick a video · or drag-and-drop</div>
                    </div>
                  )}
                </label>
              </div>

              {videoStep !== 'idle' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm space-y-1">
                  <div className={`flex items-center gap-2 ${videoStep === 'frames' ? 'text-orange-700 font-semibold' : 'text-gray-500'}`}>
                    {videoStep === 'frames' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-500" />}
                    Capturing frames from video...
                  </div>
                  <div className={`flex items-center gap-2 ${videoStep === 'extracting' ? 'text-orange-700 font-semibold' : videoStep === 'done' ? 'text-gray-500' : 'text-gray-300'}`}>
                    {videoStep === 'extracting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : videoStep === 'done' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <span className="w-3.5 h-3.5" />}
                    Reading ingredients + steps with AI...
                  </div>
                  <div className={`flex items-center gap-2 ${videoStep === 'done' ? 'text-green-700 font-semibold' : 'text-gray-300'}`}>
                    {videoStep === 'done' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <span className="w-3.5 h-3.5" />}
                    Done — review your recipe below.
                  </div>
                </div>
              )}

              <button
                onClick={runVideoExtract}
                disabled={!videoFile || busy}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Extract Recipe
              </button>
            </div>
          )}

          {mode === 'review' && current && (
            <div className="p-5 space-y-4">
              {/* AI suggestion banner (video import only, confidence >= 0.5) */}
              {current.suggested_theme
                && (current.confidence ?? 0) >= 0.5
                && !current.suggestion_dismissed
                && THEME_INFO[current.suggested_theme] && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div className="text-sm text-gray-800 flex-1 min-w-0">
                    <span className="text-xs text-purple-700 font-semibold mr-1">AI suggests:</span>
                    <span className="mr-2">{THEME_INFO[current.suggested_theme].emoji} {THEME_INFO[current.suggested_theme].label}</span>
                    {current.suggested_season && (
                      <span className="text-xs text-gray-600">· {SEASON_LABEL[current.suggested_season] || current.suggested_season}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const firstMatch = allMeals.find(m => m.theme === current.suggested_theme)
                      if (firstMatch) {
                        updateCurrent({
                          matched_meal_id: firstMatch.id,
                          matched_meal_name: firstMatch.name,
                          suggestion_dismissed: true,
                        })
                      } else {
                        updateCurrent({ suggestion_dismissed: true })
                        setError(`No existing meal in the ${THEME_INFO[current.suggested_theme!]?.label} theme to match — create one in the Meal Library first.`)
                      }
                    }}
                    className="px-2 py-1 bg-purple-500 text-white rounded-lg text-xs font-semibold hover:bg-purple-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateCurrent({ suggestion_dismissed: true })}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-white"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Match + status */}
              <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">Matched to:</label>
                  <select
                    value={current.matched_meal_id || ''}
                    onChange={e => {
                      const m = allMeals.find(x => x.id === e.target.value)
                      updateCurrent({ matched_meal_id: m?.id || null, matched_meal_name: m?.name || null })
                    }}
                    className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value="">— Pick a meal —</option>
                    {allMeals.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.theme})</option>
                    ))}
                  </select>
                  {current.status === 'saved' && <span className="text-xs text-green-600 font-semibold">✅ Saved</span>}
                  {current.status === 'skipped' && <span className="text-xs text-gray-500">Skipped</span>}
                  {current.status === 'pending' && current.matched_meal_id && <span className="text-xs text-blue-600">Ready to save</span>}
                </div>
                {!current.matched_meal_id && (
                  <p className="text-xs text-amber-700">Parsed name: "{current.name || '(unknown)'}" — pick a matching meal from the dropdown above.</p>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Prep (min)</label>
                  <input type="number" min={0} value={current.prep_time_min ?? ''} onChange={e => updateCurrent({ prep_time_min: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Cook (min)</label>
                  <input type="number" min={0} value={current.cook_time_min ?? ''} onChange={e => updateCurrent({ cook_time_min: e.target.value ? parseInt(e.target.value) : null })} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Servings</label>
                  <input type="number" min={1} value={current.servings} onChange={e => updateCurrent({ servings: parseInt(e.target.value) || 8 })} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Source</label>
                  <input type="text" value={current.source} onChange={e => updateCurrent({ source: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" placeholder="URL, cookbook, Family" />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Ingredients</h3>
                <div className="space-y-1.5">
                  {current.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input type="number" step="0.01" value={ing.quantity ?? ''} onChange={e => updateIngredient(idx, { quantity: e.target.value ? parseFloat(e.target.value) : null })} className="w-16 border rounded px-2 py-1 text-xs" placeholder="qty" />
                      <input type="text" value={ing.unit || ''} onChange={e => updateIngredient(idx, { unit: e.target.value || null })} className="w-16 border rounded px-2 py-1 text-xs" placeholder="unit" />
                      <input type="text" value={ing.name} onChange={e => updateIngredient(idx, { name: e.target.value })} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="name" />
                      <select value={ing.department} onChange={e => updateIngredient(idx, { department: e.target.value })} className="border rounded px-1 py-1 text-[10px]">
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <button onClick={() => deleteIngredient(idx)} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addIngredient} className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Ingredient
                </button>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Steps</h3>
                <div className="space-y-2">
                  {current.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 bg-gray-50 rounded p-2">
                      <span className="text-xs font-bold text-gray-400 mt-2 w-5 text-right flex-shrink-0">{step.order}.</span>
                      <div className="flex-1 space-y-1.5">
                        <textarea
                          value={step.text}
                          onChange={e => updateStep(idx, { text: e.target.value })}
                          rows={2}
                          className="w-full border rounded px-2 py-1 text-xs resize-none"
                          placeholder="Step text..."
                        />
                        <select value={step.group} onChange={e => updateStep(idx, { group: e.target.value as StepGroup })} className="border rounded px-1.5 py-0.5 text-[10px] bg-white">
                          {STEP_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveStep(idx, 1)} disabled={idx === current.steps.length - 1} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteStep(idx)} className="p-0.5 text-gray-300 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addStep} className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>

              {/* Per-recipe actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <button onClick={skipCurrent} disabled={busy} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1">
                  <SkipForward className="w-3.5 h-3.5" /> Skip This Recipe
                </button>
                <button onClick={saveCurrent} disabled={busy || !current.matched_meal_id} className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save This Recipe
                </button>
                <div className="flex-1" />
                {recipes.length > 1 && (
                  <>
                    <button onClick={() => setCursor(Math.max(0, cursor - 1))} disabled={cursor === 0} className="p-1.5 border rounded disabled:opacity-30">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-gray-500">{cursor + 1} / {recipes.length}</span>
                    <button onClick={() => setCursor(Math.min(recipes.length - 1, cursor + 1))} disabled={cursor >= recipes.length - 1} className="p-1.5 border rounded disabled:opacity-30">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'review' && recipes.length > 1 && (
          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-gray-600">
              Pending: {recipes.filter(r => r.status === 'pending').length} ·
              Saved: {recipes.filter(r => r.status === 'saved').length} ·
              Skipped: {recipes.filter(r => r.status === 'skipped').length}
            </div>
            <button
              onClick={saveAll}
              disabled={busy || recipes.filter(r => r.status === 'pending' && r.matched_meal_id).length === 0}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Save All Reviewed
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ImportModeCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border-2 border-gray-200 rounded-xl p-5 text-left hover:border-orange-400 hover:bg-orange-50 transition-colors"
    >
      <div className="text-orange-500 mb-2">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-600">{desc}</p>
    </button>
  )
}
