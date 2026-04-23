'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Printer, Clock, Users, Loader2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react'
import SpeakerButton from './SpeakerButton'

type StepGroup = 'prep' | 'cook' | 'finish'

interface RecipeStep {
  order: number
  text: string
  group: StepGroup
}

interface RecipeIngredient {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  department: string
  notes: string | null
}

interface RecipeMeal {
  id: string
  name: string
  theme: string
  description: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  source: string | null
  sides: string | null
  notes: string | null
  difficulty: string | null
  tips: string | null
  recipe_steps: RecipeStep[]
  kid_friendly_directions: string[]
  adult_directions: string[]
}

interface Props {
  mealId: string
  mode?: 'full' | 'preview'
  audience?: 'kid' | 'parent'  // Controls which directions + tips to show
  onClose: () => void
  dayLabel?: string
  onPick?: () => void          // Preview mode: turns footer into Pick / Back
  pickLabel?: string           // Override the default "Pick This Meal"
  picking?: boolean            // Shows spinner on pick button
}

const DIFFICULTY_BADGE: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700' },
}

const THEME_EMOJI: Record<string, string> = {
  'american-comfort': '🇺🇸', 'soup-comfort': '🍲', 'asian': '🥡', 'bar-night': '🥗',
  'easy-lazy': '🥪', 'pizza-italian': '🍕', 'grill': '🔥', 'experiment': '🔬',
  'roast-comfort': '🏡', 'brunch': '🍳', 'mexican': '🌮',
}

const THEME_LABEL: Record<string, string> = {
  'american-comfort': 'American Comfort', 'soup-comfort': 'Soup/Comfort',
  'asian': 'Asian Night', 'bar-night': 'Bar Night',
  'easy-lazy': 'Easy/Lazy Night', 'pizza-italian': 'Pizza & Italian',
  'grill': 'Grill Night', 'experiment': 'Experiment/Big Cook',
  'roast-comfort': 'Roast/Comfort', 'brunch': 'Brunch Sunday',
  'mexican': 'Mexican Night',
}

const STEP_GROUPS: { value: StepGroup; label: string }[] = [
  { value: 'prep', label: 'Prep' },
  { value: 'cook', label: 'Cook' },
  { value: 'finish', label: 'Finish' },
]

const FRACTIONS: Array<{ value: number; display: string }> = [
  { value: 0,     display: '' },
  { value: 1/8,   display: '⅛' },
  { value: 1/4,   display: '¼' },
  { value: 1/3,   display: '⅓' },
  { value: 3/8,   display: '⅜' },
  { value: 1/2,   display: '½' },
  { value: 5/8,   display: '⅝' },
  { value: 2/3,   display: '⅔' },
  { value: 3/4,   display: '¾' },
  { value: 1,     display: '' },
]

function formatQuantity(q: number | null): string {
  if (q == null || isNaN(q)) return ''
  if (q < 0.01) return '0'
  const rounded = Math.round(q * 10000) / 10000
  const whole = Math.floor(rounded)
  const frac = rounded - whole

  let best = FRACTIONS[0]
  let bestDist = Math.abs(frac - best.value)
  for (const f of FRACTIONS) {
    const d = Math.abs(frac - f.value)
    if (d < bestDist) { bestDist = d; best = f }
  }

  // Rolled up to next whole
  if (best.value === 1) return String(whole + 1)
  if (best.value === 0) return whole === 0 ? '0' : String(whole)
  if (whole === 0) return best.display
  return `${whole} ${best.display}`
}

const MIN_SERVINGS = 4
const MAX_SERVINGS = 32
const BASE_DEFAULT = 8

export default function RecipeCard({ mealId, mode = 'full', audience = 'kid', onClose, dayLabel, onPick, pickLabel, picking }: Props) {
  const [meal, setMeal] = useState<RecipeMeal | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [servings, setServings] = useState(BASE_DEFAULT)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const [checkedIng, setCheckedIng] = useState<Set<string>>(new Set())
  const [checkedStep, setCheckedStep] = useState<Set<number>>(new Set())
  const [ingredientsCollapsed, setIngredientsCollapsed] = useState(false)

  // Fetch recipe
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/meals?action=get_recipe&meal_id=${mealId}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load recipe')
        return r.json()
      })
      .then(data => {
        const m = data.meal
        if (!m) throw new Error('Meal not found')
        const steps: RecipeStep[] = Array.isArray(m.recipe_steps) ? m.recipe_steps : []
        const kidDirs: string[] = Array.isArray(m.kid_friendly_directions) ? m.kid_friendly_directions : []
        const adultDirs: string[] = Array.isArray(m.adult_directions) ? m.adult_directions : []
        const normalized: RecipeMeal = {
          id: m.id,
          name: m.name,
          theme: m.theme,
          description: m.description,
          prep_time_min: m.prep_time_min,
          cook_time_min: m.cook_time_min,
          servings: m.servings || BASE_DEFAULT,
          source: m.source,
          sides: m.sides || null,
          notes: m.notes || null,
          difficulty: m.difficulty || null,
          tips: m.tips || null,
          kid_friendly_directions: kidDirs,
          adult_directions: adultDirs,
          recipe_steps: steps
            .map((s, i) => ({ order: s.order ?? i + 1, text: s.text || '', group: (s.group as StepGroup) || 'cook' }))
            .sort((a, b) => a.order - b.order),
        }
        setMeal(normalized)
        setIngredients(data.ingredients || [])
        setServings(normalized.servings)
      })
      .catch(e => setError(e.message || 'Failed to load recipe'))
      .finally(() => setLoading(false))
  }, [mealId])

  const baseServings = meal?.servings || BASE_DEFAULT
  const multiplier = servings / baseServings

  const scaledIngredients = useMemo(() => {
    return ingredients.map(ing => ({
      ...ing,
      scaledQty: ing.quantity != null ? ing.quantity * multiplier : null,
    }))
  }, [ingredients, multiplier])

  const preset = (target: number) => {
    setServings(target)
    setCustomOpen(false)
  }

  const applyCustom = () => {
    const n = parseInt(customValue)
    if (!isNaN(n) && n >= MIN_SERVINGS && n <= MAX_SERVINGS) {
      setServings(n)
      setCustomOpen(false)
    }
  }

  const toggleIng = (id: string) => {
    if (mode !== 'full') return
    setCheckedIng(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleStep = (order: number) => {
    if (mode !== 'full') return
    setCheckedStep(prev => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })
  }

  const handlePrint = () => {
    document.body.classList.add('printing-recipe')
    const cleanup = () => {
      document.body.classList.remove('printing-recipe')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    setTimeout(() => window.print(), 50)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-600">Loading recipe...</span>
        </div>
      </div>
    )
  }

  if (error || !meal) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-sm" onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-gray-900 mb-2">Can't load recipe</h3>
          <p className="text-sm text-gray-600 mb-4">{error || 'Something went wrong.'}</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    )
  }

  // Pick the right directions for this audience, with fallback chain
  const audienceDirections: string[] = audience === 'kid'
    ? (meal.kid_friendly_directions.length > 0 ? meal.kid_friendly_directions
      : meal.adult_directions.length > 0 ? meal.adult_directions : [])
    : (meal.adult_directions.length > 0 ? meal.adult_directions
      : meal.kid_friendly_directions.length > 0 ? meal.kid_friendly_directions : [])

  const hasAudienceDirections = audienceDirections.length > 0
  const hasSteps = hasAudienceDirections || meal.recipe_steps.length > 0
  const hasIngredients = ingredients.length > 0
  const themeEmoji = THEME_EMOJI[meal.theme] || '🍽️'
  const themeLabel = THEME_LABEL[meal.theme] || meal.theme

  const multiplierLabel = multiplier === 1 ? '1x' : multiplier === 2 ? '2x' : multiplier === 3 ? '3x' : `${multiplier.toFixed(1)}x`

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 recipe-card-overlay"
      onClick={onClose}
    >
      <div
        className="recipe-card-print bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Recipe: ${meal.name}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50 flex items-start gap-3">
          <div className="text-3xl flex-shrink-0" aria-hidden>{themeEmoji}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{meal.name}</h2>
            <div className="text-xs text-gray-600 mt-0.5">
              {themeLabel}
              {dayLabel && <span> · {dayLabel}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-600">
              {meal.prep_time_min != null && (
                <span><Clock className="w-3 h-3 inline mr-0.5" />Prep: {meal.prep_time_min} min</span>
              )}
              {meal.cook_time_min != null && (
                <span><Clock className="w-3 h-3 inline mr-0.5" />Cook: {meal.cook_time_min} min</span>
              )}
              <span className="recipe-servings-header">
                <Users className="w-3 h-3 inline mr-0.5" />Serves: {servings}{multiplier !== 1 ? ` (${multiplierLabel})` : ''}
              </span>
              {meal.difficulty && DIFFICULTY_BADGE[meal.difficulty] && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${DIFFICULTY_BADGE[meal.difficulty].color}`}>
                  {DIFFICULTY_BADGE[meal.difficulty].label}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="close-button p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Servings multiplier controls */}
        {mode === 'full' && (
          <div className="multiplier-controls px-5 py-3 border-b bg-white flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium text-gray-500 flex-shrink-0">Servings:</span>
            {[1, 2, 3].map(m => {
              const target = baseServings * m
              const active = servings === target
              return (
                <button
                  key={m}
                  onClick={() => preset(target)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {m}x · {target}
                </button>
              )
            })}
            {customOpen ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={MIN_SERVINGS}
                  max={MAX_SERVINGS}
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyCustom() }}
                  autoFocus
                  className="w-16 border rounded-lg px-2 py-1 text-xs"
                  placeholder="4-32"
                />
                <button
                  onClick={applyCustom}
                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded-lg font-semibold"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setCustomOpen(true); setCustomValue(String(servings)) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  ![1, 2, 3].some(m => servings === baseServings * m) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit3 className="w-3 h-3 inline mr-0.5" />
                Custom
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!hasIngredients && !hasSteps ? (
            <div className="px-5 py-6 text-sm text-gray-700 space-y-3">
              {meal.description && (
                <p className="text-gray-700">{meal.description}</p>
              )}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">{themeLabel}</span>
                  <span className="text-xs text-orange-500">{themeEmoji}</span>
                </div>
                <div className="font-bold text-gray-900 text-base">{meal.name}</div>
                {meal.sides && (
                  <div className="text-sm">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sides</span>
                    <span className="text-gray-700">{meal.sides}</span>
                  </div>
                )}
                {meal.notes && (
                  <div className="text-sm">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Prep Notes</span>
                    <span className="text-gray-700">{meal.notes}</span>
                  </div>
                )}
              </div>
              <p className="text-xs italic text-gray-400 text-center">Full recipe steps being added — Mom can cook from memory or the box.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
              {/* Ingredients */}
              {hasIngredients && (
                <div className="px-5 py-4 recipe-ingredients">
                  <button
                    onClick={() => setIngredientsCollapsed(c => !c)}
                    className="sm:pointer-events-none w-full flex items-center justify-between mb-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Ingredients</h3>
                    <span className="sm:hidden text-gray-400">
                      {ingredientsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </span>
                  </button>
                  {(!ingredientsCollapsed || typeof window === 'undefined') && (
                    <ul className="space-y-2">
                      {scaledIngredients.map(ing => {
                        const checked = checkedIng.has(ing.id)
                        return (
                          <li key={ing.id} className="flex items-start gap-2 recipe-ingredient-line">
                            {mode === 'full' ? (
                              <button
                                onClick={() => toggleIng(ing.id)}
                                className={`mt-0.5 flex-shrink-0 w-4 h-4 border-2 rounded transition-colors recipe-checkbox-print cursor-pointer ${
                                  checked
                                    ? 'bg-orange-500 border-orange-500'
                                    : 'border-gray-300 hover:border-orange-400'
                                }`}
                                aria-label={checked ? 'Uncheck' : 'Check'}
                              >
                                {checked && (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ) : (
                              <span className="mt-1.5 flex-shrink-0 text-orange-400" aria-hidden>•</span>
                            )}
                            <span className={`text-sm flex-1 ${checked ? 'line-through text-gray-400 checked' : 'text-gray-800'}`}>
                              {ing.scaledQty != null && <span className="font-semibold">{formatQuantity(ing.scaledQty)} </span>}
                              {ing.unit && <span>{ing.unit} </span>}
                              {ing.name}
                              {ing.notes && <span className="text-gray-400 italic"> — {ing.notes}</span>}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* Steps — prefer audience-specific directions, fall back to grouped recipe_steps */}
              {hasSteps ? (
                <div className="px-5 py-4 recipe-steps">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {audience === 'kid' ? 'How to Make It' : 'Directions'}
                    </h3>
                    <SpeakerButton
                      steps={hasAudienceDirections ? audienceDirections : meal.recipe_steps.map(s => s.text)}
                      size="sm"
                      rate={0.9}
                    />
                  </div>

                  {hasAudienceDirections ? (
                    /* Audience-specific flat numbered list */
                    <ol className="space-y-2.5">
                      {audienceDirections.map((text, idx) => {
                        const stepNum = idx + 1
                        const checked = checkedStep.has(stepNum)
                        return (
                          <li key={stepNum} className="flex items-start gap-2 recipe-step-line">
                            {mode === 'full' ? (
                              <button
                                onClick={() => toggleStep(stepNum)}
                                className={`mt-0.5 flex-shrink-0 w-4 h-4 border-2 rounded transition-colors recipe-checkbox-print cursor-pointer ${
                                  checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300 hover:border-orange-400'
                                }`}
                                aria-label={checked ? 'Uncheck' : 'Check'}
                              >
                                {checked && (
                                  <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ) : null}
                            <span className={`text-sm flex-1 leading-relaxed ${checked ? 'line-through text-gray-400 checked' : 'text-gray-800'}`}>
                              <span className="font-bold text-gray-500 mr-1">{stepNum}.</span>
                              {text}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  ) : (
                    /* Legacy grouped recipe_steps fallback */
                    STEP_GROUPS.map(group => {
                      const groupSteps = meal.recipe_steps.filter(s => s.group === group.value)
                      if (groupSteps.length === 0) return null
                      return (
                        <div key={group.value} className="mb-4 last:mb-0">
                          <div className="text-[11px] uppercase tracking-wider font-semibold text-orange-600 mb-2">
                            — {group.label} —
                          </div>
                          <ol className="space-y-2.5">
                            {groupSteps.map(step => {
                              const checked = checkedStep.has(step.order)
                              return (
                                <li key={step.order} className="flex items-start gap-2 recipe-step-line">
                                  {mode === 'full' ? (
                                    <button
                                      onClick={() => toggleStep(step.order)}
                                      className={`mt-0.5 flex-shrink-0 w-4 h-4 border-2 rounded transition-colors recipe-checkbox-print cursor-pointer ${
                                        checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300 hover:border-orange-400'
                                      }`}
                                      aria-label={checked ? 'Uncheck' : 'Check'}
                                    >
                                      {checked && (
                                        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </button>
                                  ) : null}
                                  <span className={`text-sm flex-1 leading-relaxed ${checked ? 'line-through text-gray-400 checked' : 'text-gray-800'}`}>
                                    <span className="font-bold text-gray-500 mr-1">{step.order}.</span>
                                    {step.text}
                                  </span>
                                </li>
                              )
                            })}
                          </ol>
                        </div>
                      )
                    })
                  )}

                  {/* Parent tips — only shown for parent audience */}
                  {audience === 'parent' && meal.tips && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Tips</p>
                      <p className="text-sm text-amber-800">{meal.tips}</p>
                    </div>
                  )}
                </div>
              ) : hasIngredients ? (
                <div className="px-5 py-4 recipe-no-steps">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Steps</h3>
                  <p className="text-sm text-gray-500 italic">
                    {mode === 'full' ? 'Recipe steps coming soon — ask Mom!' : 'No steps added yet.'}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between gap-2 recipe-footer">
          <div className="text-xs text-gray-500 min-w-0 truncate">
            {meal.source ? <>Source: <span className="font-medium">{meal.source}</span></> : <span className="italic">No source</span>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {onPick ? (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white close-button"
                >
                  Back to List
                </button>
                <button
                  onClick={onPick}
                  disabled={picking}
                  className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {picking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>✓</span>}
                  {pickLabel || 'Pick This Meal'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 flex items-center gap-1 recipe-print-btn"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-white close-button"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>

        {/* Print-only footer (hidden on screen, shown on paper) */}
        <div className="hidden recipe-print-footer px-5 py-2 text-[10pt] text-black border-t">
          Moses Family · Printed {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
