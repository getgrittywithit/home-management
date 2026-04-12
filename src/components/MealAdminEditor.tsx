'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Plus, Edit3, Eye, EyeOff, Star, Trash2, ChevronDown, ChevronRight,
  ArrowRightLeft, Save, ArrowUp, ArrowDown, Clock, Users, BookOpen, Download
} from 'lucide-react'
import BulkRecipeImport from './BulkRecipeImport'

// ── Theme config ──

const THEME_LABELS: Record<string, { label: string; emoji: string }> = {
  'american-comfort': { label: 'American Comfort Night', emoji: '🇺🇸' },
  'asian': { label: 'Asian Night', emoji: '🥡' },
  'mexican': { label: 'Mexican Night', emoji: '🌮' },
  'soup-comfort': { label: 'Soup/Comfort Night', emoji: '🍲' },
  'bar-night': { label: 'Bar Night', emoji: '🥗' },
  'easy-lazy': { label: 'Easy/Lazy Night', emoji: '🥪' },
  'pizza-italian': { label: 'Pizza & Italian Night', emoji: '🍕' },
  'grill': { label: 'Grill Night', emoji: '🔥' },
  'experiment': { label: 'Experiment/Big Cook', emoji: '🔬' },
  'roast-comfort': { label: 'Roast/Comfort Sunday', emoji: '🏡' },
  'brunch': { label: 'Brunch Sunday', emoji: '🍳' },
}

const THEME_KEYS = Object.keys(THEME_LABELS)

const SEASON_OPTIONS = [
  { value: 'both', label: 'Both', chip: '🔄 Both' },
  { value: 'spring-summer', label: 'Spring/Summer', chip: '🌸 Spring/Summer' },
  { value: 'fall-winter', label: 'Fall/Winter', chip: '🍂 Fall/Winter' },
] as const

function seasonChip(season: string) {
  if (season === 'spring-summer') return '🌸 Spring/Summer'
  if (season === 'fall-winter') return '🍂 Fall/Winter'
  return '🔄 Both'
}

function normalizeSeason(dbSeason: string): string {
  if (dbSeason === 'year-round') return 'both'
  return dbSeason
}

// ── Types ──

interface Meal {
  id: string
  name: string
  theme: string
  season: string
  description: string | null
  sides: string | null
  sides_starch_options: string[] | null
  sides_veggie_options: string[] | null
  notes: string | null
  active: boolean
  created_at: string
}

type StepGroup = 'prep' | 'cook' | 'finish'

interface RecipeStep {
  order: number
  text: string
  group: StepGroup
}

interface RecipeData {
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  source: string
  recipe_steps: RecipeStep[]
}

const STEP_GROUPS: { value: StepGroup; label: string; emoji: string }[] = [
  { value: 'prep', label: 'Prep', emoji: '🔪' },
  { value: 'cook', label: 'Cook', emoji: '🔥' },
  { value: 'finish', label: 'Finish', emoji: '🍽️' },
]

interface SubOption {
  id: string
  label: string
  category: string | null
  heat_level: string | null
  display_type: string
  is_favorite: boolean
  active: boolean
  sort_order: number
}

interface Ingredient {
  id: string
  meal_id: string
  name: string
  quantity: number | null
  unit: string | null
  department: string
  preferred_store: string
  notes: string | null
}

const DEPARTMENTS = ['Meat', 'Frozen', 'Pantry', 'Produce', 'Dairy', 'Bakery', 'Other'] as const
const STORE_OPTIONS = ['either', 'walmart', 'heb'] as const

const DEPT_COLORS: Record<string, string> = {
  Meat: 'bg-red-100 text-red-700',
  Frozen: 'bg-cyan-100 text-cyan-700',
  Pantry: 'bg-amber-100 text-amber-700',
  Produce: 'bg-green-100 text-green-700',
  Dairy: 'bg-blue-100 text-blue-700',
  Bakery: 'bg-yellow-100 text-yellow-700',
  Other: 'bg-gray-100 text-gray-700',
}

const STORE_COLORS: Record<string, string> = {
  either: 'bg-gray-100 text-gray-600',
  walmart: 'bg-blue-100 text-blue-700',
  heb: 'bg-red-100 text-red-700',
}

const STORE_LABELS: Record<string, string> = {
  either: 'Either',
  walmart: 'Walmart',
  heb: 'H-E-B',
}

// ── Toast System ──

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white transition-all animate-in slide-in-from-right ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {t.message}
          <button onClick={() => onDismiss(t.id)} className="ml-3 opacity-70 hover:opacity-100">
            <X className="w-3 h-3 inline" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ──

export default function MealAdminEditor() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set())

  // Drawer state
  const [drawerMeal, setDrawerMeal] = useState<Meal | null>(null)
  const [drawerIsNew, setDrawerIsNew] = useState(false)
  const [drawerPrefilledTheme, setDrawerPrefilledTheme] = useState<string | null>(null)
  const [showMoveTheme, setShowMoveTheme] = useState(false)
  const [moveThemeTarget, setMoveThemeTarget] = useState('')

  // Sub-options
  const [subOptions, setSubOptions] = useState<SubOption[]>([])
  const [subLoading, setSubLoading] = useState(false)
  const [newSubLabel, setNewSubLabel] = useState('')
  const [newSubCategory, setNewSubCategory] = useState('')

  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingredientsLoading, setIngredientsLoading] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '', department: 'Other', preferred_store: 'either' })

  // Recipe
  const [recipe, setRecipe] = useState<RecipeData>({ prep_time_min: null, cook_time_min: null, servings: 8, source: '', recipe_steps: [] })
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeExpanded, setRecipeExpanded] = useState(false)
  const [showRecipePreview, setShowRecipePreview] = useState(false)

  // Shuffle options
  const [newStarchOption, setNewStarchOption] = useState('')
  const [newVeggieOption, setNewVeggieOption] = useState('')

  // Bulk add
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSeason, setBulkSeason] = useState('both')
  const [bulkSides, setBulkSides] = useState('')
  const [bulkAdding, setBulkAdding] = useState(false)

  // Bulk import
  const [showImport, setShowImport] = useState(false)

  // ── Toast helpers ──

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Data fetching ──

  const fetchAllMeals = useCallback(async () => {
    try {
      const res = await fetch('/api/meals?action=list_all&include_inactive=true')
      const data = await res.json()
      setMeals((data.meals || []).map((m: Meal) => ({ ...m, season: normalizeSeason(m.season) })))
    } catch {
      addToast('Failed to load meals', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { fetchAllMeals() }, [fetchAllMeals])

  // Fetch sub-options when drawer opens
  useEffect(() => {
    if (!drawerMeal?.id || drawerIsNew) {
      setSubOptions([])
      return
    }
    setSubLoading(true)
    fetch(`/api/meals?action=get_sub_options&meal_id=${drawerMeal.id}&include_inactive=true`)
      .then(res => res.json())
      .then(data => setSubOptions(data.options || []))
      .catch(() => setSubOptions([]))
      .finally(() => setSubLoading(false))
  }, [drawerMeal?.id, drawerIsNew])

  // Fetch ingredients when drawer opens
  useEffect(() => {
    if (!drawerMeal?.id || drawerIsNew) {
      setIngredients([])
      return
    }
    setIngredientsLoading(true)
    fetch(`/api/meals?action=get_ingredients&meal_id=${drawerMeal.id}`)
      .then(res => res.json())
      .then(data => setIngredients(data.ingredients || []))
      .catch(() => setIngredients([]))
      .finally(() => setIngredientsLoading(false))
  }, [drawerMeal?.id, drawerIsNew])

  // Fetch recipe when drawer opens
  useEffect(() => {
    if (!drawerMeal?.id || drawerIsNew) {
      setRecipe({ prep_time_min: null, cook_time_min: null, servings: 8, source: '', recipe_steps: [] })
      setRecipeExpanded(false)
      return
    }
    setRecipeLoading(true)
    fetch(`/api/meals?action=get_recipe&meal_id=${drawerMeal.id}`)
      .then(res => res.json())
      .then(data => {
        const m = data.meal || {}
        const steps: RecipeStep[] = Array.isArray(m.recipe_steps) ? m.recipe_steps : []
        setRecipe({
          prep_time_min: m.prep_time_min ?? null,
          cook_time_min: m.cook_time_min ?? null,
          servings: m.servings ?? 8,
          source: m.source || '',
          recipe_steps: steps
            .map((s, i) => ({ order: s.order ?? i + 1, text: s.text || '', group: (s.group as StepGroup) || 'cook' }))
            .sort((a, b) => a.order - b.order),
        })
      })
      .catch(() => setRecipe({ prep_time_min: null, cook_time_min: null, servings: 8, source: '', recipe_steps: [] }))
      .finally(() => setRecipeLoading(false))
  }, [drawerMeal?.id, drawerIsNew])

  // ── Recipe helpers ──

  const renumberSteps = (steps: RecipeStep[]): RecipeStep[] =>
    steps.map((s, i) => ({ ...s, order: i + 1 }))

  const saveRecipe = useCallback(async (next: RecipeData) => {
    if (!drawerMeal?.id || drawerIsNew) return
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_recipe',
          meal_id: drawerMeal.id,
          prep_time_min: next.prep_time_min,
          cook_time_min: next.cook_time_min,
          servings: next.servings,
          source: next.source,
          recipe_steps: next.recipe_steps,
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      addToast('Failed to save recipe', 'error')
    }
  }, [drawerMeal?.id, drawerIsNew, addToast])

  const updateRecipeField = <K extends keyof RecipeData>(field: K, value: RecipeData[K]) => {
    const next = { ...recipe, [field]: value }
    setRecipe(next)
    saveRecipe(next)
  }

  const addStep = () => {
    const next = {
      ...recipe,
      recipe_steps: renumberSteps([...recipe.recipe_steps, { order: recipe.recipe_steps.length + 1, text: '', group: 'cook' as StepGroup }]),
    }
    setRecipe(next)
  }

  const updateStepText = (idx: number, text: string) => {
    const steps = [...recipe.recipe_steps]
    steps[idx] = { ...steps[idx], text }
    setRecipe({ ...recipe, recipe_steps: steps })
  }

  const updateStepGroup = (idx: number, group: StepGroup) => {
    const steps = [...recipe.recipe_steps]
    steps[idx] = { ...steps[idx], group }
    const next = { ...recipe, recipe_steps: steps }
    setRecipe(next)
    saveRecipe(next)
  }

  const deleteStep = (idx: number) => {
    if (!confirm('Delete this step?')) return
    const next = { ...recipe, recipe_steps: renumberSteps(recipe.recipe_steps.filter((_, i) => i !== idx)) }
    setRecipe(next)
    saveRecipe(next)
  }

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= recipe.recipe_steps.length) return
    const steps = [...recipe.recipe_steps]
    ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
    const next = { ...recipe, recipe_steps: renumberSteps(steps) }
    setRecipe(next)
    saveRecipe(next)
  }

  // ── Ingredient helpers ──

  const addIngredient = async () => {
    if (!newIngredient.name.trim() || !drawerMeal?.id) return
    const tempId = 'temp-' + Date.now()
    const temp: Ingredient = {
      id: tempId,
      meal_id: drawerMeal.id,
      name: newIngredient.name.trim(),
      quantity: newIngredient.quantity ? parseFloat(newIngredient.quantity) : null,
      unit: newIngredient.unit || null,
      department: newIngredient.department,
      preferred_store: newIngredient.preferred_store,
      notes: null,
    }
    setIngredients(prev => [...prev, temp])
    setNewIngredient({ name: '', quantity: '', unit: '', department: 'Other', preferred_store: 'either' })

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_ingredient',
          meal_id: drawerMeal.id,
          name: temp.name,
          quantity: temp.quantity,
          unit: temp.unit,
          department: temp.department,
          preferred_store: temp.preferred_store,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setIngredients(prev => prev.map(i => i.id === tempId ? data.ingredient : i))
      addToast('Ingredient added')
    } catch {
      setIngredients(prev => prev.filter(i => i.id !== tempId))
      addToast('Failed to add ingredient', 'error')
    }
  }

  const updateIngredient = async (ing: Ingredient, updates: Partial<Ingredient>) => {
    const updated = { ...ing, ...updates }
    setIngredients(prev => prev.map(i => i.id === ing.id ? updated : i))
    setEditingIngredientId(null)

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_ingredient',
          id: ing.id,
          name: updated.name,
          quantity: updated.quantity,
          unit: updated.unit,
          department: updated.department,
          preferred_store: updated.preferred_store,
          notes: updated.notes,
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setIngredients(prev => prev.map(i => i.id === ing.id ? ing : i))
      addToast('Failed to update ingredient', 'error')
    }
  }

  const deleteIngredient = async (id: string) => {
    const prev = ingredients
    setIngredients(p => p.filter(i => i.id !== id))
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_ingredient', id }),
      })
      if (!res.ok) throw new Error()
      addToast('Ingredient removed')
    } catch {
      setIngredients(prev)
      addToast('Failed to remove ingredient', 'error')
    }
  }

  // ── Group meals by theme ──

  const mealsByTheme: Record<string, Meal[]> = {}
  for (const key of THEME_KEYS) mealsByTheme[key] = []
  for (const m of meals) {
    if (!mealsByTheme[m.theme]) mealsByTheme[m.theme] = []
    mealsByTheme[m.theme].push(m)
  }

  // ── Collapse toggle ──

  const toggleThemeCollapse = (theme: string) => {
    setCollapsedThemes(prev => {
      const next = new Set(prev)
      if (next.has(theme)) next.delete(theme)
      else next.add(theme)
      return next
    })
  }

  // ── Season cycle (inline on card) ──

  const cycleSeason = async (meal: Meal) => {
    const order = ['both', 'spring-summer', 'fall-winter'] as const
    const idx = order.indexOf(meal.season as typeof order[number])
    const next = order[(idx + 1) % 3]

    // Optimistic
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, season: next } : m))

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', id: meal.id, name: meal.name, theme: meal.theme, season: next }),
      })
      if (!res.ok) throw new Error()
      addToast('Season updated')
    } catch {
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, season: meal.season } : m))
      addToast('Something went wrong — try again', 'error')
    }
  }

  // ── Toggle active (inline on card) ──

  const toggleActive = async (meal: Meal) => {
    const newActive = !meal.active
    setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, active: newActive } : m))

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', id: meal.id, active: newActive }),
      })
      if (!res.ok) throw new Error()
      addToast(newActive ? 'Meal activated' : 'Meal deactivated')
    } catch {
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, active: !newActive } : m))
      addToast('Something went wrong — try again', 'error')
    }
  }

  // ── Drawer: open for editing ──

  const openEditDrawer = (meal: Meal) => {
    setDrawerMeal({ ...meal })
    setDrawerIsNew(false)
    setDrawerPrefilledTheme(null)
    setShowMoveTheme(false)
    setMoveThemeTarget('')
    setShowBulk(false)
  }

  const openNewDrawer = (theme: string) => {
    setDrawerMeal({
      id: '',
      name: '',
      theme,
      season: 'both',
      description: null,
      sides: null,
      sides_starch_options: null,
      sides_veggie_options: null,
      notes: null,
      active: true,
      created_at: '',
    })
    setDrawerIsNew(true)
    setDrawerPrefilledTheme(theme)
    setShowMoveTheme(false)
    setMoveThemeTarget('')
    setShowBulk(false)
    setBulkText('')
    setBulkSeason('both')
    setBulkSides('')
  }

  const closeDrawer = () => {
    setDrawerMeal(null)
    setDrawerIsNew(false)
    setShowBulk(false)
  }

  // ── Drawer: save changes ──

  const saveDrawerMeal = async () => {
    if (!drawerMeal || !drawerMeal.name.trim()) return

    const payload = {
      action: 'upsert' as const,
      id: drawerIsNew ? undefined : drawerMeal.id,
      name: drawerMeal.name.trim(),
      theme: drawerMeal.theme,
      season: drawerMeal.season,
      description: drawerMeal.description || undefined,
      sides: drawerMeal.sides || undefined,
      sides_starch_options: drawerMeal.sides_starch_options || undefined,
      sides_veggie_options: drawerMeal.sides_veggie_options || undefined,
      notes: drawerMeal.notes || undefined,
      active: drawerMeal.active,
    }

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const saved = { ...data.meal, season: normalizeSeason(data.meal.season) }

      if (drawerIsNew) {
        setMeals(prev => [...prev, saved])
        addToast('Meal added')
      } else {
        setMeals(prev => prev.map(m => m.id === saved.id ? saved : m))
        addToast('Meal updated')
      }
      closeDrawer()
    } catch {
      addToast('Something went wrong — try again', 'error')
    }
  }

  // ── Drawer: auto-save on blur ──

  const autoSaveField = async (field: string, value: string) => {
    if (drawerIsNew || !drawerMeal?.id) return
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          id: drawerMeal.id,
          name: drawerMeal.name || 'Untitled',
          theme: drawerMeal.theme,
          season: drawerMeal.season,
          [field]: value || null,
        }),
      })
      if (!res.ok) throw new Error()
      // Optimistic update to main list
      setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, [field]: value || null } : m))
      addToast('Saved')
    } catch {
      addToast('Something went wrong — try again', 'error')
    }
  }

  // ── Move theme ──

  const moveToTheme = async () => {
    if (!drawerMeal?.id || !moveThemeTarget) return
    const oldTheme = drawerMeal.theme
    setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, theme: moveThemeTarget } : m))
    setDrawerMeal(prev => prev ? { ...prev, theme: moveThemeTarget } : prev)

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move_theme', id: drawerMeal.id, theme: moveThemeTarget }),
      })
      if (!res.ok) throw new Error()
      addToast('Moved to ' + (THEME_LABELS[moveThemeTarget]?.label || moveThemeTarget))
      setShowMoveTheme(false)
    } catch {
      setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, theme: oldTheme } : m))
      setDrawerMeal(prev => prev ? { ...prev, theme: oldTheme } : prev)
      addToast('Something went wrong — try again', 'error')
    }
  }

  // ── Bulk add ──

  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !drawerMeal?.theme) return
    setBulkAdding(true)
    const names = bulkText.split('\n').map(l => l.trim()).filter(Boolean)

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_add',
          theme: drawerMeal.theme,
          season: bulkSeason,
          meals: names.map(n => ({ name: n, sides: bulkSides || undefined })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const added = (data.meals || []).map((m: Meal) => ({ ...m, season: normalizeSeason(m.season) }))
      setMeals(prev => [...prev, ...added])
      addToast(`Added ${data.inserted} meals`)
      setBulkText('')
      setBulkSides('')
      setShowBulk(false)
    } catch {
      addToast('Something went wrong — try again', 'error')
    } finally {
      setBulkAdding(false)
    }
  }

  // ── Sub-option helpers ──

  const toggleSubFavorite = async (opt: SubOption) => {
    const newFav = !opt.is_favorite
    setSubOptions(prev => prev.map(o => o.id === opt.id ? { ...o, is_favorite: newFav } : o))
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sub_option_toggle_favorite', id: opt.id, is_favorite: newFav }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSubOptions(prev => prev.map(o => o.id === opt.id ? { ...o, is_favorite: !newFav } : o))
      addToast('Something went wrong — try again', 'error')
    }
  }

  const toggleSubActive = async (opt: SubOption) => {
    const newActive = !opt.active
    setSubOptions(prev => prev.map(o => o.id === opt.id ? { ...o, active: newActive } : o))
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sub_option_toggle_active', id: opt.id, active: newActive }),
      })
      if (!res.ok) throw new Error()
      addToast(newActive ? 'Option restored' : 'Option removed')
    } catch {
      setSubOptions(prev => prev.map(o => o.id === opt.id ? { ...o, active: !newActive } : o))
      addToast('Something went wrong — try again', 'error')
    }
  }

  const addSubOption = async () => {
    if (!newSubLabel.trim() || !drawerMeal?.id) return
    const tempId = 'temp-' + Date.now()
    const temp: SubOption = {
      id: tempId,
      label: newSubLabel.trim(),
      category: newSubCategory || null,
      heat_level: null,
      display_type: 'show-all',
      is_favorite: false,
      active: true,
      sort_order: subOptions.length,
    }
    setSubOptions(prev => [...prev, temp])
    setNewSubLabel('')
    setNewSubCategory('')

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sub_option_upsert',
          meal_id: drawerMeal.id,
          label: temp.label,
          category: temp.category,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSubOptions(prev => prev.map(o => o.id === tempId ? data.sub_option : o))
      addToast('Option added')
    } catch {
      setSubOptions(prev => prev.filter(o => o.id !== tempId))
      addToast('Something went wrong — try again', 'error')
    }
  }

  const updateSubLabel = async (opt: SubOption, newLabel: string) => {
    if (newLabel === opt.label || !newLabel.trim()) return
    setSubOptions(prev => prev.map(o => o.id === opt.id ? { ...o, label: newLabel } : o))
    try {
      await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sub_option_upsert',
          id: opt.id,
          meal_id: drawerMeal?.id,
          label: newLabel.trim(),
          category: opt.category,
        }),
      })
    } catch {
      setSubOptions(prev => prev.map(o => o.id === opt.id ? { ...o, label: opt.label } : o))
      addToast('Something went wrong — try again', 'error')
    }
  }

  // ── Group sub-options by category ──

  const subsByCategory: Record<string, SubOption[]> = {}
  for (const opt of subOptions) {
    const cat = opt.category || 'General'
    if (!subsByCategory[cat]) subsByCategory[cat] = []
    subsByCategory[cat].push(opt)
  }

  // ── Render ──

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading meal library...</div>
  }

  return (
    <div className="space-y-4">
      {/* Admin banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-amber-800 font-medium">Admin Mode — changes save automatically</span>
        <button
          onClick={() => setShowImport(true)}
          className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Import Recipes
        </button>
      </div>

      {/* Theme sections */}
      {THEME_KEYS.map(themeKey => {
        const info = THEME_LABELS[themeKey]
        const themeMeals = mealsByTheme[themeKey] || []
        const collapsed = collapsedThemes.has(themeKey)
        const activeCount = themeMeals.filter(m => m.active).length

        return (
          <div key={themeKey} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Theme header */}
            <button
              onClick={() => toggleThemeCollapse(themeKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{info.emoji}</span>
                <span className="font-bold text-gray-900">{info.label}</span>
                <span className="text-xs text-gray-500 ml-1">
                  {activeCount} active / {themeMeals.length} total
                </span>
              </div>
              {collapsed ? <ChevronRight className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {!collapsed && (
              <div className="p-3">
                {/* Meal cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {themeMeals.map(meal => (
                    <div
                      key={meal.id}
                      className={`relative border rounded-lg p-3 transition-all ${
                        meal.active
                          ? 'border-gray-200 bg-white hover:shadow-sm'
                          : 'border-gray-100 bg-gray-50 opacity-60'
                      }`}
                    >
                      {/* Edit icon */}
                      <button
                        onClick={() => openEditDrawer(meal)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 transition-colors"
                        title="Edit meal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Name */}
                      <div className="font-semibold text-gray-900 pr-7 text-sm">{meal.name}</div>

                      {/* Season chip */}
                      <button
                        onClick={() => cycleSeason(meal)}
                        className="mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        title="Click to cycle season"
                      >
                        {seasonChip(meal.season)}
                      </button>

                      {/* Sides */}
                      {meal.sides && (
                        <div className="text-xs text-gray-500 mt-1.5 line-clamp-1">{meal.sides}</div>
                      )}

                      {/* Bottom row: inactive badge + active toggle */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        {!meal.active && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-red-400 bg-red-50 px-1.5 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                        <div className="ml-auto">
                          <button
                            onClick={() => toggleActive(meal)}
                            className={`p-1 rounded transition-colors ${
                              meal.active ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'
                            }`}
                            title={meal.active ? 'Deactivate' : 'Activate'}
                          >
                            {meal.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add meal button */}
                <button
                  onClick={() => openNewDrawer(themeKey)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Meal
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Edit Meal Drawer ── */}
      {drawerMeal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={closeDrawer}
          />

          {/* Drawer panel */}
          <div
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={drawerIsNew ? 'Add Meal' : 'Edit Meal'}
            onKeyDown={e => { if (e.key === 'Escape') closeDrawer() }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {drawerIsNew ? 'Add Meal' : 'Edit Meal'}
              </h2>
              <button
                onClick={closeDrawer}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Meal Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal Name</label>
                <input
                  type="text"
                  value={drawerMeal.name}
                  onChange={e => setDrawerMeal({ ...drawerMeal, name: e.target.value })}
                  onBlur={e => autoSaveField('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Meal name..."
                  autoFocus
                />
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <select
                  value={drawerMeal.theme}
                  onChange={e => {
                    setDrawerMeal({ ...drawerMeal, theme: e.target.value })
                    if (!drawerIsNew) autoSaveField('theme', e.target.value)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {THEME_KEYS.map(k => (
                    <option key={k} value={k}>
                      {THEME_LABELS[k].emoji} {THEME_LABELS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                <select
                  value={drawerMeal.season}
                  onChange={e => {
                    setDrawerMeal({ ...drawerMeal, season: e.target.value })
                    if (!drawerIsNew) autoSaveField('season', e.target.value)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {SEASON_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Sides */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sides</label>
                <input
                  type="text"
                  value={drawerMeal.sides || ''}
                  onChange={e => setDrawerMeal({ ...drawerMeal, sides: e.target.value })}
                  onBlur={e => autoSaveField('sides', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. rice, green beans, cornbread"
                />
              </div>

              {/* Shuffle Options — Starch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Starch Options</label>
                {(drawerMeal.sides_starch_options && drawerMeal.sides_starch_options.length > 0) ? (
                  <div className="space-y-1 mb-2">
                    {drawerMeal.sides_starch_options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white text-sm">
                        <span className="text-base">🍚</span>
                        <span className="flex-1">{opt}</span>
                        <button
                          onClick={() => {
                            const updated = drawerMeal.sides_starch_options!.filter((_, i) => i !== idx)
                            const newArr = updated.length > 0 ? updated : null
                            setDrawerMeal({ ...drawerMeal, sides_starch_options: newArr })
                            if (!drawerIsNew && drawerMeal.id) {
                              fetch('/api/meals', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'upsert', id: drawerMeal.id, name: drawerMeal.name, theme: drawerMeal.theme, season: drawerMeal.season,
                                  sides_starch_options: newArr,
                                }),
                              }).then(() => {
                                setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, sides_starch_options: newArr } : m))
                                addToast('Starch option removed')
                              }).catch(() => addToast('Something went wrong', 'error'))
                            }
                          }}
                          className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-2">No starch options yet.</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStarchOption}
                    onChange={e => setNewStarchOption(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newStarchOption.trim()) {
                        const updated = [...(drawerMeal.sides_starch_options || []), newStarchOption.trim()]
                        setDrawerMeal({ ...drawerMeal, sides_starch_options: updated })
                        setNewStarchOption('')
                        if (!drawerIsNew && drawerMeal.id) {
                          fetch('/api/meals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'upsert', id: drawerMeal.id, name: drawerMeal.name, theme: drawerMeal.theme, season: drawerMeal.season,
                              sides_starch_options: updated,
                            }),
                          }).then(() => {
                            setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, sides_starch_options: updated } : m))
                            addToast('Starch option added')
                          }).catch(() => addToast('Something went wrong', 'error'))
                        }
                      }
                    }}
                    className="flex-1 border rounded px-2.5 py-1.5 text-sm"
                    placeholder="e.g. Steamed Rice"
                  />
                  <button
                    onClick={() => {
                      if (!newStarchOption.trim()) return
                      const updated = [...(drawerMeal.sides_starch_options || []), newStarchOption.trim()]
                      setDrawerMeal({ ...drawerMeal, sides_starch_options: updated })
                      setNewStarchOption('')
                      if (!drawerIsNew && drawerMeal.id) {
                        fetch('/api/meals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'upsert', id: drawerMeal.id, name: drawerMeal.name, theme: drawerMeal.theme, season: drawerMeal.season,
                            sides_starch_options: updated,
                          }),
                        }).then(() => {
                          setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, sides_starch_options: updated } : m))
                          addToast('Starch option added')
                        }).catch(() => addToast('Something went wrong', 'error'))
                      }
                    }}
                    disabled={!newStarchOption.trim()}
                    className="p-1.5 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                    title="Add"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Shuffle Options — Veggie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Veggie Options</label>
                {(drawerMeal.sides_veggie_options && drawerMeal.sides_veggie_options.length > 0) ? (
                  <div className="space-y-1 mb-2">
                    {drawerMeal.sides_veggie_options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white text-sm">
                        <span className="text-base">🥦</span>
                        <span className="flex-1">{opt}</span>
                        <button
                          onClick={() => {
                            const updated = drawerMeal.sides_veggie_options!.filter((_, i) => i !== idx)
                            const newArr = updated.length > 0 ? updated : null
                            setDrawerMeal({ ...drawerMeal, sides_veggie_options: newArr })
                            if (!drawerIsNew && drawerMeal.id) {
                              fetch('/api/meals', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'upsert', id: drawerMeal.id, name: drawerMeal.name, theme: drawerMeal.theme, season: drawerMeal.season,
                                  sides_veggie_options: newArr,
                                }),
                              }).then(() => {
                                setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, sides_veggie_options: newArr } : m))
                                addToast('Veggie option removed')
                              }).catch(() => addToast('Something went wrong', 'error'))
                            }
                          }}
                          className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-2">No veggie options yet.</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newVeggieOption}
                    onChange={e => setNewVeggieOption(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newVeggieOption.trim()) {
                        const updated = [...(drawerMeal.sides_veggie_options || []), newVeggieOption.trim()]
                        setDrawerMeal({ ...drawerMeal, sides_veggie_options: updated })
                        setNewVeggieOption('')
                        if (!drawerIsNew && drawerMeal.id) {
                          fetch('/api/meals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'upsert', id: drawerMeal.id, name: drawerMeal.name, theme: drawerMeal.theme, season: drawerMeal.season,
                              sides_veggie_options: updated,
                            }),
                          }).then(() => {
                            setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, sides_veggie_options: updated } : m))
                            addToast('Veggie option added')
                          }).catch(() => addToast('Something went wrong', 'error'))
                        }
                      }
                    }}
                    className="flex-1 border rounded px-2.5 py-1.5 text-sm"
                    placeholder="e.g. Bag Salad"
                  />
                  <button
                    onClick={() => {
                      if (!newVeggieOption.trim()) return
                      const updated = [...(drawerMeal.sides_veggie_options || []), newVeggieOption.trim()]
                      setDrawerMeal({ ...drawerMeal, sides_veggie_options: updated })
                      setNewVeggieOption('')
                      if (!drawerIsNew && drawerMeal.id) {
                        fetch('/api/meals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'upsert', id: drawerMeal.id, name: drawerMeal.name, theme: drawerMeal.theme, season: drawerMeal.season,
                            sides_veggie_options: updated,
                          }),
                        }).then(() => {
                          setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, sides_veggie_options: updated } : m))
                          addToast('Veggie option added')
                        }).catch(() => addToast('Something went wrong', 'error'))
                      }
                    }}
                    disabled={!newVeggieOption.trim()}
                    className="p-1.5 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                    title="Add"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={drawerMeal.description || ''}
                  onChange={e => setDrawerMeal({ ...drawerMeal, description: e.target.value })}
                  onBlur={e => autoSaveField('description', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Short description..."
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes <span className="text-gray-400 font-normal">(parent-only, optional)</span></label>
                <textarea
                  value={drawerMeal.notes || ''}
                  onChange={e => setDrawerMeal({ ...drawerMeal, notes: e.target.value })}
                  onBlur={e => autoSaveField('notes', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Notes for parents..."
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <button
                  onClick={() => {
                    const newActive = !drawerMeal.active
                    setDrawerMeal({ ...drawerMeal, active: newActive })
                    if (!drawerIsNew && drawerMeal.id) {
                      setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, active: newActive } : m))
                      fetch('/api/meals', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'toggle_active', id: drawerMeal.id, active: newActive }),
                      }).catch(() => {
                        setMeals(prev => prev.map(m => m.id === drawerMeal.id ? { ...m, active: !newActive } : m))
                        setDrawerMeal(prev => prev ? { ...prev, active: !newActive } : prev)
                        addToast('Something went wrong — try again', 'error')
                      })
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    drawerMeal.active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      drawerMeal.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Save / Actions */}
              {drawerIsNew ? (
                <button
                  onClick={saveDrawerMeal}
                  disabled={!drawerMeal.name.trim()}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Add Meal
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={saveDrawerMeal}
                    disabled={!drawerMeal.name.trim()}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>

                  {/* Move theme */}
                  {!showMoveTheme ? (
                    <button
                      onClick={() => setShowMoveTheme(true)}
                      className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Move to Different Theme
                    </button>
                  ) : (
                    <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                      <select
                        value={moveThemeTarget}
                        onChange={e => setMoveThemeTarget(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Select theme...</option>
                        {THEME_KEYS.filter(k => k !== drawerMeal.theme).map(k => (
                          <option key={k} value={k}>{THEME_LABELS[k].emoji} {THEME_LABELS[k].label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={moveToTheme}
                          disabled={!moveThemeTarget}
                          className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                        >
                          Move
                        </button>
                        <button
                          onClick={() => setShowMoveTheme(false)}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Deactivate */}
                  {drawerMeal.active && (
                    <button
                      onClick={() => {
                        toggleActive(drawerMeal)
                        setDrawerMeal({ ...drawerMeal, active: false })
                      }}
                      className="w-full py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      Deactivate Meal
                    </button>
                  )}
                </div>
              )}

              {/* ── Bulk Add (only in new mode) ── */}
              {drawerIsNew && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowBulk(!showBulk)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {showBulk ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Add Multiple at Once
                  </button>

                  {showBulk && (
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        rows={5}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        placeholder={"One meal name per line:\nSpaghetti & Meatballs\nChicken Parmesan\nBaked Ziti"}
                      />
                      <select
                        value={bulkSeason}
                        onChange={e => setBulkSeason(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        {SEASON_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={bulkSides}
                        onChange={e => setBulkSides(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Sides (applied to all, optional)"
                      />
                      <button
                        onClick={handleBulkAdd}
                        disabled={bulkAdding || !bulkText.trim()}
                        className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {bulkAdding ? 'Adding...' : 'Add All'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Sub-Options Section (existing meals only) ── */}
              {!drawerIsNew && drawerMeal.id && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Sub-Options</h3>

                  {subLoading ? (
                    <div className="text-xs text-gray-400 py-2">Loading...</div>
                  ) : subOptions.length === 0 ? (
                    <p className="text-xs text-gray-400 mb-3">No sub-options yet.</p>
                  ) : (
                    <div className="space-y-4 mb-3">
                      {Object.entries(subsByCategory).map(([cat, opts]) => (
                        <div key={cat}>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{cat}</div>
                          <div className="space-y-1">
                            {opts.map(opt => (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                                  opt.active ? 'bg-white' : 'bg-gray-50 opacity-50'
                                }`}
                              >
                                {/* Inline-editable label */}
                                <input
                                  type="text"
                                  defaultValue={opt.label}
                                  onBlur={e => updateSubLabel(opt, e.target.value.trim())}
                                  className="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none text-sm px-0 py-0"
                                />

                                {/* Heat level badge */}
                                {opt.heat_level && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                                    {opt.heat_level}
                                  </span>
                                )}

                                {/* Favorite toggle */}
                                <button
                                  onClick={() => toggleSubFavorite(opt)}
                                  className={`p-0.5 transition-colors ${opt.is_favorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                                  title="Toggle favorite"
                                >
                                  <Star className={`w-3.5 h-3.5 ${opt.is_favorite ? 'fill-current' : ''}`} />
                                </button>

                                {/* Deactivate toggle */}
                                <button
                                  onClick={() => toggleSubActive(opt)}
                                  className={`p-0.5 transition-colors ${opt.active ? 'text-gray-300 hover:text-red-400' : 'text-red-400 hover:text-green-500'}`}
                                  title={opt.active ? 'Deactivate' : 'Reactivate'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add sub-option inline */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubLabel}
                      onChange={e => setNewSubLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubOption() }}
                      className="flex-1 border rounded px-2.5 py-1.5 text-sm"
                      placeholder="New option name..."
                    />
                    <input
                      type="text"
                      value={newSubCategory}
                      onChange={e => setNewSubCategory(e.target.value)}
                      className="w-24 border rounded px-2.5 py-1.5 text-sm"
                      placeholder="Category"
                    />
                    <button
                      onClick={addSubOption}
                      disabled={!newSubLabel.trim()}
                      className="p-1.5 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                      title="Add"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Recipe Section (existing meals only) ── */}
              {!drawerIsNew && drawerMeal.id && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => setRecipeExpanded(e => !e)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-orange-500" />
                      Recipe
                      {recipe.recipe_steps.length > 0 && (
                        <span className="text-xs font-normal text-gray-500">({recipe.recipe_steps.length} steps)</span>
                      )}
                    </h3>
                    {recipeExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>

                  {recipeExpanded && (
                    <>
                      {recipeLoading ? (
                        <div className="text-xs text-gray-400 py-2">Loading...</div>
                      ) : (
                        <div className="space-y-3">
                          {/* Prep / Cook / Servings */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">
                                <Clock className="w-3 h-3 inline mr-0.5" />Prep (min)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={recipe.prep_time_min ?? ''}
                                onChange={e => setRecipe({ ...recipe, prep_time_min: e.target.value ? parseInt(e.target.value) : null })}
                                onBlur={() => saveRecipe(recipe)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                placeholder="20"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">
                                <Clock className="w-3 h-3 inline mr-0.5" />Cook (min)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={recipe.cook_time_min ?? ''}
                                onChange={e => setRecipe({ ...recipe, cook_time_min: e.target.value ? parseInt(e.target.value) : null })}
                                onBlur={() => saveRecipe(recipe)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                placeholder="15"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">
                                <Users className="w-3 h-3 inline mr-0.5" />Servings
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={recipe.servings}
                                onChange={e => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 8 })}
                                onBlur={() => saveRecipe(recipe)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                placeholder="8"
                              />
                            </div>
                          </div>

                          {/* Source */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                            <input
                              type="text"
                              value={recipe.source}
                              onChange={e => setRecipe({ ...recipe, source: e.target.value })}
                              onBlur={() => saveRecipe(recipe)}
                              className="w-full border rounded px-3 py-1.5 text-sm"
                              placeholder="Family recipe, URL, or cookbook"
                            />
                          </div>

                          {/* Steps */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Steps</label>
                            {recipe.recipe_steps.length === 0 ? (
                              <p className="text-xs text-gray-400 mb-2">No steps yet — add your first one below.</p>
                            ) : (
                              <div className="space-y-2 mb-2">
                                {recipe.recipe_steps.map((step, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 bg-gray-50 rounded p-2">
                                    <span className="text-xs font-bold text-gray-400 mt-2 w-5 text-right flex-shrink-0">{step.order}.</span>
                                    <div className="flex-1 space-y-1.5">
                                      <textarea
                                        value={step.text}
                                        onChange={e => updateStepText(idx, e.target.value)}
                                        onBlur={() => saveRecipe(recipe)}
                                        rows={2}
                                        className="w-full border rounded px-2 py-1 text-xs resize-none"
                                        placeholder="One action per step..."
                                      />
                                      <select
                                        value={step.group}
                                        onChange={e => updateStepGroup(idx, e.target.value as StepGroup)}
                                        className="border rounded px-1.5 py-0.5 text-[10px] bg-white"
                                      >
                                        {STEP_GROUPS.map(g => (
                                          <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        onClick={() => moveStep(idx, -1)}
                                        disabled={idx === 0}
                                        className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                                        title="Move up"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => moveStep(idx, 1)}
                                        disabled={idx === recipe.recipe_steps.length - 1}
                                        className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                                        title="Move down"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteStep(idx)}
                                        className="p-0.5 text-gray-300 hover:text-red-500"
                                        title="Delete step"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={addStep}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Step
                            </button>
                          </div>

                          {/* Preview */}
                          {recipe.recipe_steps.length > 0 && (
                            <button
                              onClick={() => setShowRecipePreview(true)}
                              className="w-full py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Preview Recipe Card
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Ingredients Section (existing meals only) ── */}
              {!drawerIsNew && drawerMeal.id && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Ingredients</h3>

                  {ingredientsLoading ? (
                    <div className="text-xs text-gray-400 py-2">Loading...</div>
                  ) : ingredients.length === 0 ? (
                    <p className="text-xs text-gray-400 mb-3">No ingredients yet.</p>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {ingredients.map(ing => (
                        <div key={ing.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white text-sm group">
                          {editingIngredientId === ing.id ? (
                            <>
                              <input
                                type="text"
                                defaultValue={ing.name}
                                onBlur={e => updateIngredient(ing, { name: e.target.value.trim() || ing.name })}
                                className="flex-1 border rounded px-1.5 py-0.5 text-xs"
                                autoFocus
                              />
                              <input
                                type="text"
                                defaultValue={ing.quantity?.toString() || ''}
                                onBlur={e => updateIngredient(ing, { quantity: parseFloat(e.target.value) || null })}
                                className="w-12 border rounded px-1.5 py-0.5 text-xs"
                                placeholder="qty"
                              />
                              <input
                                type="text"
                                defaultValue={ing.unit || ''}
                                onBlur={e => updateIngredient(ing, { unit: e.target.value.trim() || null })}
                                className="w-12 border rounded px-1.5 py-0.5 text-xs"
                                placeholder="unit"
                              />
                              <select
                                defaultValue={ing.department}
                                onChange={e => updateIngredient(ing, { department: e.target.value })}
                                className="border rounded px-1 py-0.5 text-[10px]"
                              >
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <select
                                defaultValue={ing.preferred_store}
                                onChange={e => updateIngredient(ing, { preferred_store: e.target.value })}
                                className="border rounded px-1 py-0.5 text-[10px]"
                              >
                                {STORE_OPTIONS.map(s => <option key={s} value={s}>{STORE_LABELS[s]}</option>)}
                              </select>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-xs font-medium text-gray-900 truncate">{ing.name}</span>
                              {(ing.quantity || ing.unit) && (
                                <span className="text-[10px] text-gray-500">
                                  {ing.quantity || ''}{ing.unit ? ` ${ing.unit}` : ''}
                                </span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${DEPT_COLORS[ing.department] || DEPT_COLORS.Other}`}>
                                {ing.department}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STORE_COLORS[ing.preferred_store] || STORE_COLORS.either}`}>
                                {STORE_LABELS[ing.preferred_store] || 'Either'}
                              </span>
                              <button
                                onClick={() => setEditingIngredientId(ing.id)}
                                className="p-0.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteIngredient(ing.id)}
                                className="p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add ingredient inline */}
                  <div className="space-y-2 bg-gray-50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newIngredient.name}
                        onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') addIngredient() }}
                        className="flex-1 border rounded px-2 py-1.5 text-xs"
                        placeholder="Ingredient name..."
                      />
                      <input
                        type="text"
                        value={newIngredient.quantity}
                        onChange={e => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                        className="w-14 border rounded px-2 py-1.5 text-xs"
                        placeholder="qty"
                      />
                      <input
                        type="text"
                        value={newIngredient.unit}
                        onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                        className="w-14 border rounded px-2 py-1.5 text-xs"
                        placeholder="unit"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={newIngredient.department}
                        onChange={e => setNewIngredient({ ...newIngredient, department: e.target.value })}
                        className="flex-1 border rounded px-2 py-1.5 text-xs"
                      >
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select
                        value={newIngredient.preferred_store}
                        onChange={e => setNewIngredient({ ...newIngredient, preferred_store: e.target.value })}
                        className="flex-1 border rounded px-2 py-1.5 text-xs"
                      >
                        {STORE_OPTIONS.map(s => <option key={s} value={s}>{STORE_LABELS[s]}</option>)}
                      </select>
                      <button
                        onClick={addIngredient}
                        disabled={!newIngredient.name.trim()}
                        className="p-1.5 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
                        title="Add ingredient"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Recipe Preview Modal */}
      {showRecipePreview && drawerMeal && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowRecipePreview(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{drawerMeal.name}</h3>
              <button onClick={() => setShowRecipePreview(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                {recipe.prep_time_min != null && <span><Clock className="w-3 h-3 inline mr-0.5" />Prep: {recipe.prep_time_min}m</span>}
                {recipe.cook_time_min != null && <span><Clock className="w-3 h-3 inline mr-0.5" />Cook: {recipe.cook_time_min}m</span>}
                <span><Users className="w-3 h-3 inline mr-0.5" />Serves: {recipe.servings}</span>
              </div>
              {recipe.source && <div className="text-xs text-gray-500 italic">Source: {recipe.source}</div>}
              {drawerMeal.description && <p className="text-sm text-gray-700">{drawerMeal.description}</p>}

              {ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1.5">Ingredients</h4>
                  <ul className="text-sm text-gray-800 space-y-0.5">
                    {ingredients.map(ing => (
                      <li key={ing.id}>
                        • {ing.quantity ? `${ing.quantity} ` : ''}{ing.unit ? `${ing.unit} ` : ''}{ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {STEP_GROUPS.map(g => {
                const groupSteps = recipe.recipe_steps.filter(s => s.group === g.value)
                if (groupSteps.length === 0) return null
                return (
                  <div key={g.value}>
                    <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1.5">
                      {g.emoji} {g.label}
                    </h4>
                    <ol className="text-sm text-gray-800 space-y-1.5">
                      {groupSteps.map(s => (
                        <li key={s.order} className="flex gap-2">
                          <span className="font-bold text-gray-400 w-5 flex-shrink-0">{s.order}.</span>
                          <span className="flex-1">{s.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bulk recipe import */}
      {showImport && (
        <BulkRecipeImport
          onClose={() => setShowImport(false)}
          onSaved={fetchAllMeals}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
