'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChefHat, Plus, ChevronDown, ChevronUp, ListChecks,
  RefreshCw, X, Check, AlertCircle
} from 'lucide-react'

// ── Types ──

interface Ingredient {
  name: string
  quantity: number
  unit: string
  in_stock: boolean
}

interface ScratchRecipe {
  id: string
  name: string
  category: string
  yield_text: string
  ingredients: Ingredient[]
  readiness_pct: number
  missing: string[]
}

const CATEGORIES = ['All', 'Dressings', 'Dips', 'Salsas', 'Seasonings', 'Baked Goods', 'Sauces'] as const

const READINESS_COLOR = (pct: number) =>
  pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'

const READINESS_TEXT_COLOR = (pct: number) =>
  pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'

const READINESS_BG = (pct: number) =>
  pct >= 80 ? 'bg-green-50 border-green-200' : pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

const CATEGORY_COLORS: Record<string, string> = {
  Dressings: 'bg-emerald-100 text-emerald-700',
  Dips: 'bg-purple-100 text-purple-700',
  Salsas: 'bg-red-100 text-red-700',
  Seasonings: 'bg-amber-100 text-amber-700',
  'Baked Goods': 'bg-yellow-100 text-yellow-700',
  Sauces: 'bg-orange-100 text-orange-700',
}

// ── Component ──

export default function ScratchRecipeManager() {
  const [recipes, setRecipes] = useState<ScratchRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRecipe, setNewRecipe] = useState({ name: '', category: 'Dressings', yield_text: '', ingredients_text: '' })
  const [saving, setSaving] = useState(false)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock?action=check_scratch_readiness')
      const json = await res.json()
      if (!json.error) setRecipes(json.recipes || [])
    } catch {
      console.error('Failed to load scratch recipes')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const addToMakeList = async (recipe: ScratchRecipe) => {
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_to_make_list', recipe_id: recipe.id, recipe_name: recipe.name }),
      })
      showToast('Added to your to-do list')
    } catch {
      showToast('Failed to add to list')
    }
  }

  const addRecipe = async () => {
    if (!newRecipe.name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_scratch_recipe',
          name: newRecipe.name.trim(),
          category: newRecipe.category,
          yield_text: newRecipe.yield_text.trim(),
          ingredients_text: newRecipe.ingredients_text.trim(),
        }),
      })
      setNewRecipe({ name: '', category: 'Dressings', yield_text: '', ingredients_text: '' })
      setShowAddForm(false)
      fetchRecipes()
      showToast('Recipe added')
    } catch {
      showToast('Failed to add recipe')
    }
    setSaving(false)
  }

  const filtered = recipes.filter(r => catFilter === 'All' || r.category === catFilter)

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              catFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Recipe
          </button>
          <button onClick={fetchRecipes} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Add Recipe form */}
      {showAddForm && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newRecipe.name}
              onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })}
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Recipe name..."
            />
            <select
              value={newRecipe.category}
              onChange={e => setNewRecipe({ ...newRecipe, category: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input
            type="text"
            value={newRecipe.yield_text}
            onChange={e => setNewRecipe({ ...newRecipe, yield_text: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Yield (e.g. Makes 2 cups)"
          />
          <textarea
            value={newRecipe.ingredients_text}
            onChange={e => setNewRecipe({ ...newRecipe, ingredients_text: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm h-24 resize-none"
            placeholder="Ingredients (one per line, e.g. '2 cups olive oil')"
          />
          <div className="flex gap-2">
            <button onClick={addRecipe} disabled={!newRecipe.name.trim() || saving} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-green-700">
              {saving ? 'Adding...' : 'Add Recipe'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Recipe cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No scratch recipes{catFilter !== 'All' ? ` in "${catFilter}"` : ''}</p>
          <p className="text-xs mt-1">Add your homemade recipes to see what you can make today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(recipe => {
            const isExpanded = expandedId === recipe.id
            return (
              <div key={recipe.id} className={`border rounded-lg bg-white overflow-hidden transition-all ${READINESS_BG(recipe.readiness_pct)}`}>
                <div className="p-3 space-y-2">
                  {/* Name and category */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{recipe.name}</h4>
                      {recipe.yield_text && (
                        <span className="text-[10px] text-gray-500">{recipe.yield_text}</span>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[recipe.category] || 'bg-gray-100 text-gray-600'}`}>
                      {recipe.category}
                    </span>
                  </div>

                  {/* Readiness bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold ${READINESS_TEXT_COLOR(recipe.readiness_pct)}`}>
                        {recipe.readiness_pct}% ready
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${READINESS_COLOR(recipe.readiness_pct)}`}
                        style={{ width: `${recipe.readiness_pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Missing items */}
                  {recipe.missing.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.missing.slice(0, 3).map(m => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                          {m}
                        </span>
                      ))}
                      {recipe.missing.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{recipe.missing.length - 3} more</span>
                      )}
                    </div>
                  )}

                  {/* Expand/actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Hide' : 'View Recipe'}
                    </button>
                    <button
                      onClick={() => addToMakeList(recipe)}
                      className="ml-auto flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700"
                    >
                      <ListChecks className="w-3 h-3" />
                      Add to Make List
                    </button>
                  </div>
                </div>

                {/* Expanded ingredients */}
                {isExpanded && (
                  <div className="border-t px-3 py-2 bg-white space-y-1">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ingredients</p>
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {ing.in_stock ? (
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        )}
                        <span className={ing.in_stock ? 'text-gray-600' : 'text-red-600 font-medium'}>
                          {ing.quantity} {ing.unit} {ing.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
