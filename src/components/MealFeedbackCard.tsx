'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, X } from 'lucide-react'

const RATING_OPTIONS = [
  { emoji: '\ud83d\ude0d', label: 'Loved it', value: 4 },
  { emoji: '\ud83d\ude0a', label: 'Liked it', value: 3 },
  { emoji: '\ud83d\ude10', label: 'Okay', value: 2 },
  { emoji: '\ud83d\ude12', label: "Didn't like it", value: 1 },
]

const GENERAL_TAGS = [
  'too-spicy', 'too-bland', 'too-salty', 'wanted-more', 'too-much-food',
  'loved-the-sides', 'didnt-like-sides', 'would-eat-again', 'not-again',
]

const SENSORY_TAGS = [
  'texture-too-soft', 'texture-too-crunchy', 'texture-mixed', 'strong-smell',
  'foods-touching', 'temperature-issue', 'color-put-me-off', 'looked-weird',
  'same-as-always-good', 'new-and-liked-it', 'new-and-didnt-like-it',
]

const TAG_LABELS: Record<string, string> = {
  'too-spicy': 'Too Spicy', 'too-bland': 'Too Bland', 'too-salty': 'Too Salty',
  'wanted-more': 'Wanted More', 'too-much-food': 'Too Much Food',
  'loved-the-sides': 'Loved the Sides', 'didnt-like-sides': "Didn't Like Sides",
  'would-eat-again': 'Would Eat Again', 'not-again': 'Not Again',
  'texture-too-soft': 'Too Soft', 'texture-too-crunchy': 'Too Crunchy',
  'texture-mixed': 'Mixed Textures', 'strong-smell': 'Strong Smell',
  'foods-touching': 'Foods Touching', 'temperature-issue': 'Temperature Issue',
  'color-put-me-off': 'Color Put Me Off', 'looked-weird': 'Looked Weird',
  'same-as-always-good': 'Same as Always (Good)', 'new-and-liked-it': 'New & Liked It',
  'new-and-didnt-like-it': "New & Didn't Like It",
}

interface FeedbackPrompt {
  meal_name: string
  // PR2 Item 2.2: ratings can now come from meal_week_plan (no request id)
  // or the legacy meal_requests path (no meal_id required). At least one
  // must be present, but neither is mandatory.
  meal_id: string | number | null
  meal_request_id: string | number | null
  date: string
  source?: 'meal_request' | 'meal_week_plan'
}

export default function MealFeedbackCard({ childName }: { childName: string }) {
  const [prompt, setPrompt] = useState<FeedbackPrompt | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [freeText, setFreeText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!childName) return
    fetch(`/api/feedback?action=get_prompt&kid=${encodeURIComponent(childName)}`)
      .then(r => r.json())
      .then(data => {
        setPrompt(data.prompt || null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childName])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!rating || !prompt) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          meal_id: prompt.meal_id,
          meal_request_id: prompt.meal_request_id,
          kid_name: childName,
          rating,
          tags: Array.from(selectedTags),
          free_text: freeText.trim() || null,
          meal_date: prompt.date,
        }),
      })
      setSubmitted(true)
    } catch {
      alert('Could not save feedback. Try again.')
    }
    setSubmitting(false)
  }

  if (!loaded || !prompt || submitted) return null

  // Compact trigger
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">How was dinner tonight?</p>
            <p className="text-xs text-gray-500">{prompt.meal_name}</p>
          </div>
          <MessageSquare className="w-5 h-5 text-orange-400" />
        </div>
      </button>
    )
  }

  // Expanded flow
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Rate Tonight&apos;s Dinner</h3>
          <p className="text-xs text-gray-500">{prompt.meal_name}</p>
        </div>
        <button onClick={() => setExpanded(false)} className="p-1 hover:bg-orange-100 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Step 1: Rating */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">How was it?</p>
          <div className="grid grid-cols-4 gap-2">
            {RATING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRating(opt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  rating === opt.value
                    ? 'border-orange-400 bg-orange-50 scale-105'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-[10px] font-medium text-gray-600 leading-tight text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Tags */}
        {rating && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Tell us more (optional)</p>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {GENERAL_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {TAG_LABELS[tag] || tag}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-2 mb-1">Sensory</p>
              <div className="flex flex-wrap gap-1.5">
                {SENSORY_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    {TAG_LABELS[tag] || tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Free text */}
        {rating && (
          <div>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Anything else you want to say? (optional)"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              rows={2}
            />
          </div>
        )}

        {/* Submit */}
        {rating && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Saving...' : 'Submit Feedback'}
          </button>
        )}
      </div>
    </div>
  )
}
