'use client'

import { useState, useEffect } from 'react'
import { ChefHat, Check, Clock, Shuffle } from 'lucide-react'
import HelpDropdown from './HelpDropdown'
import SpeakerButton from './SpeakerButton'
import RecipeCard from './RecipeCard'

interface KidMealPickerProps {
  kidName: string
  previewMode?: boolean
  onPick?: () => void
}

const DINNER_MANAGERS: Record<number, { kid: string; theme1: string; theme2: string; emoji: string; label1: string; label2: string }> = {
  0: { kid: 'kaylee', theme1: 'american-comfort', theme2: 'soup-comfort', emoji: '🇺🇸', label1: 'American Comfort', label2: 'Soup/Comfort' },
  1: { kid: 'zoey', theme1: 'asian', theme2: 'asian', emoji: '🥡', label1: 'Asian Night', label2: 'Asian Night' },
  2: { kid: 'wyatt', theme1: 'bar-night', theme2: 'easy-lazy', emoji: '🥗', label1: 'Bar Night', label2: 'Easy/Lazy Night' },
  3: { kid: 'amos', theme1: 'mexican', theme2: 'mexican', emoji: '🌮', label1: 'Mexican Night', label2: 'Mexican Night' },
  4: { kid: 'ellie', theme1: 'pizza-italian', theme2: 'pizza-italian', emoji: '🍕', label1: 'Pizza & Italian', label2: 'Pizza & Italian' }, // Ellie + Hannah always
  5: { kid: 'parents', theme1: 'grill', theme2: 'experiment', emoji: '🔥', label1: 'Grill Night', label2: 'Experiment' },
  6: { kid: 'parents', theme1: 'roast-comfort', theme2: 'brunch', emoji: '🏡', label1: 'Roast Sunday', label2: 'Brunch Sunday' },
}

function getMonday(d: Date): string {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toLocaleDateString('en-CA')
}

export default function KidMealPicker({ kidName, previewMode, onPick }: KidMealPickerProps) {
  const [meals, setMeals] = useState<any[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [existingPick, setExistingPick] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [previewMeal, setPreviewMeal] = useState<{ id: string; name: string } | null>(null)

  const kid = kidName.toLowerCase()
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const EPOCH = new Date('2026-03-30T00:00:00')
  const nextWeekDate = new Date(now)
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeekStart = getMonday(nextWeekDate)
  const weeksSinceEpoch = Math.floor((new Date(nextWeekStart + 'T00:00:00').getTime() - EPOCH.getTime()) / (7 * 86400000))
  const weekNum = weeksSinceEpoch % 2 === 0 ? 1 : 2

  // Find this kid's dinner night
  const myDow = Object.entries(DINNER_MANAGERS).find(([_, v]) => v.kid === kid || (kid === 'hannah' && v.kid === 'ellie'))
  const myDowNum = myDow ? parseInt(myDow[0]) : -1
  const myMgr = myDow ? myDow[1] : null
  const myTheme = myMgr ? (weekNum === 1 ? myMgr.theme1 : myMgr.theme2) : null
  const myLabel = myMgr ? (weekNum === 1 ? myMgr.label1 : myMgr.label2) : null
  const myEmoji = myMgr?.emoji || '🍽️'
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const THEME_HELP: Record<string, string> = {
    'american-comfort': 'Classic American food — mac and cheese, meatloaf, burgers, casseroles. Comfort food!',
    'soup-comfort': 'Soup, stew, or crockpot meals. Warm and cozy.',
    'asian': 'Chinese, Japanese, Thai, or Korean food. Stir fry, noodles, rice bowls.',
    'bar-night': 'Build-your-own bar! Taco bar, baked potato bar, nacho bar — everyone picks their toppings.',
    'easy-lazy': 'Quick and simple. Sandwiches, quesadillas, frozen pizza upgrades. Under 20 minutes.',
    'mexican': 'Tacos, enchiladas, burritos, quesadillas. Mexican and Tex-Mex favorites.',
    'pizza-italian': 'Pizza (homemade or frozen), pasta, garlic bread. Italian night!',
    'grill': 'Dad fires up the grill. Burgers, hot dogs, chicken, kebabs.',
    'experiment': 'Try something NEW. A recipe nobody has made before. Be brave!',
    'roast-comfort': 'Sunday roast — chicken, pot roast, or pork with all the sides.',
    'brunch': 'Breakfast for dinner! Pancakes, waffles, eggs, bacon, French toast.',
  }

  const getSeason = () => {
    const month = now.getMonth() + 1
    return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
  }

  useEffect(() => {
    if (!myTheme || myMgr?.kid === 'parents') { setLoading(false); return }

    // Check existing pick for next week
    fetch('/api/meal-plan/week?action=get_current_and_next')
      .then(r => r.json())
      .then(data => {
        const nextDays = data.next_week?.days || []
        const myDay = nextDays.find((d: any) => d.day_of_week === myDowNum)
        if (myDay?.meal_id) setExistingPick(myDay)
      })
      .catch(() => {})

    // Load available meals
    fetch(`/api/parent/meal-requests?action=available_meals&theme=${myTheme}&season=${getSeason()}`)
      .then(r => r.json())
      .then(data => { setMeals(data.meals || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kid, myTheme])

  const handleShuffle = () => {
    if (meals.length === 0) return
    // Avoid landing on the same meal twice in a row — kids were seeing
    // the same options cycle through. Exclude the current preview from the pool.
    const pool = previewMeal && meals.length > 1
      ? meals.filter(m => m.id !== previewMeal.id)
      : meals
    const random = pool[Math.floor(Math.random() * pool.length)]
    setPreviewMeal({ id: random.id, name: random.name })
  }

  const handlePreview = (meal: any) => {
    setPreviewMeal({ id: meal.id, name: meal.name })
  }

  const handleConfirmPick = async () => {
    if (!previewMeal || previewMode) return
    setSubmitting(true)
    await fetch('/api/meal-plan/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'kid_pick', kid_name: kid,
        week_start: nextWeekStart, day_of_week: myDowNum, meal_id: previewMeal.id,
      }),
    }).catch(() => {})
    setSubmitting(false)
    setSubmitted(true)
    setPreviewMeal(null)
    onPick?.()
  }

  if (!myTheme || myMgr?.kid === 'parents') return null
  if (loading) return null

  if (existingPick?.meal_name) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-green-800 text-sm">Your Dinner Pick (Next Week)</span>
        </div>
        <p className="text-sm text-green-700">{myEmoji} {existingPick.meal_name} — {dayNames[myDowNum]}</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
        <Check className="w-6 h-6 text-green-600 mx-auto mb-1" />
        <p className="text-sm font-medium text-green-800">Pick submitted for next {dayNames[myDowNum]}!</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-orange-800 flex items-center gap-2 text-sm">
          <ChefHat className="w-4 h-4" /> Pick Your Meal — Next {dayNames[myDowNum]}
        </h3>
        <span className="text-xs text-orange-600">{myEmoji} {myLabel}</span>
      </div>

      {/* Feature help + theme description */}
      <HelpDropdown
        instructions={[
          "This is YOUR dinner night — you pick what the family eats!",
          "Tap Shuffle for a random idea, or pick from the list below.",
          "After you pick, Mom gets a notification to approve it.",
          "Once approved, your meal goes on the calendar and Mom adds it to the grocery list.",
          ...(myTheme && THEME_HELP[myTheme] ? [`This week's theme: ${myLabel} — ${THEME_HELP[myTheme]}`] : []),
        ]}
        label="How meal picking works"
        compact
      />

      {/* Shuffle */}
      {meals.length > 0 && (
        <button onClick={handleShuffle}
          className="w-full flex items-center justify-center gap-2 bg-orange-100 text-orange-700 py-2.5 rounded-xl font-medium hover:bg-orange-200 transition-colors">
          <Shuffle className="w-4 h-4" /> Shuffle a Meal
        </button>
      )}

      {/* Full list */}
      <div className="space-y-1.5">
        <p className="text-xs text-orange-600 font-medium">Tap a meal to see the recipe:</p>
        {meals.map(meal => (
          <div key={meal.id} className="flex items-center gap-1">
            <button onClick={() => handlePreview(meal)} disabled={previewMode || submitting}
              className="flex-1 text-left px-3 py-2 rounded-xl border border-orange-100 bg-white text-sm hover:border-orange-300 disabled:opacity-50">
              <span className="font-medium">{meal.name}</span>
              {meal.sides && <span className="text-xs text-gray-500 ml-2">· {meal.sides}</span>}
            </button>
            <SpeakerButton text={`${meal.name}${meal.sides ? '. Sides: ' + meal.sides : ''}`} size="sm" />
          </div>
        ))}
        {meals.length === 0 && <p className="text-xs text-gray-500 italic">No meals available for this theme.</p>}
      </div>

      <p className="text-[10px] text-orange-500 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pick by deadline so Mom can shop!
      </p>

      {previewMeal && (
        <RecipeCard
          mealId={previewMeal.id}
          mode="preview"
          dayLabel={dayNames[myDowNum]}
          onClose={() => setPreviewMeal(null)}
          onPick={previewMode ? undefined : handleConfirmPick}
          picking={submitting}
        />
      )}
    </div>
  )
}
