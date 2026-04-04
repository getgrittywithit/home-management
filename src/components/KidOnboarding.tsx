'use client'

import { useState } from 'react'
import {
  CheckSquare, Sparkles, Heart, ChevronRight, ChevronLeft,
  Star, Camera, Gift, Palette, User, Home, X
} from 'lucide-react'

interface KidOnboardingProps {
  kidName: string
  kidColor?: string
  onComplete: () => void
}

const INTEREST_OPTIONS = [
  'Art', 'Music', 'Reading', 'Gaming', 'Cooking', 'Animals', 'Science',
  'Sports', 'Dance', 'Building', 'Nature', 'Writing', 'Math', 'Coding',
  'Drawing', 'Crafts', 'Photography', 'Theater', 'Puzzles', 'History',
]

const COLOR_OPTIONS = [
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-500' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
]

const ANIMAL_OPTIONS = ['Dog', 'Cat', 'Bunny', 'Horse', 'Dolphin', 'Dragon', 'Penguin', 'Fox', 'Owl', 'Panda']

const TOTAL_SCREENS = 12

export default function KidOnboarding({ kidName, kidColor, onComplete }: KidOnboardingProps) {
  const [screen, setScreen] = useState(0)
  const [profile, setProfile] = useState({
    favorite_color: '',
    favorite_animal: '',
    favorite_food: '',
    favorite_snack: '',
    favorite_drink: '',
    favorite_movie: '',
    favorite_show: '',
    favorite_game: '',
    favorite_song: '',
    interests: [] as string[],
    self_description: '',
  })
  const [wishItem, setWishItem] = useState('')
  const [wishList, setWishList] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const kidKey = kidName.toLowerCase()
  const themeColor = kidColor || 'blue'
  const gradientClass = `from-${themeColor}-500 to-${themeColor}-600`

  const saveProfile = async () => {
    setSaving(true)
    try {
      await fetch('/api/kid-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', kid_name: kidKey, ...profile }),
      })
      // Save wish list items
      for (const item of wishList) {
        await fetch('/api/kid-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_wish_item', kid_name: kidKey, item_name: item }),
        })
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const finishOnboarding = async () => {
    const payload = JSON.stringify({ action: 'mark_onboarding_complete', kid_name: kidKey })

    // Try sendBeacon first (bypasses connection pool)
    const sent = navigator.sendBeacon('/api/kid-profile', new Blob([payload], { type: 'application/json' }))

    if (!sent) {
      // Fallback: fetch with 5-second timeout
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 5000)
        await fetch('/api/kid-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        })
      } catch { /* proceed regardless */ }
    }

    // Non-blocking profile save
    saveProfile().catch(() => {})
    onComplete()
  }

  const saveAndFinishLater = async () => {
    await saveProfile()
    try {
      await fetch('/api/kid-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', kid_name: kidKey, onboarding_step: `screen-${screen}` }),
      })
    } catch (err) {
      console.error('Save later error:', err)
    }
    onComplete()
  }

  const next = () => setScreen(s => Math.min(TOTAL_SCREENS - 1, s + 1))
  const prev = () => setScreen(s => Math.max(0, s - 1))
  const skip = () => finishOnboarding()

  const toggleInterest = (interest: string) => {
    setProfile(p => ({
      ...p,
      interests: p.interests.includes(interest)
        ? p.interests.filter(i => i !== interest)
        : [...p.interests, interest],
    }))
  }

  const addWishItem = () => {
    if (wishItem.trim()) {
      setWishList(prev => [...prev, wishItem.trim()])
      setWishItem('')
    }
  }

  // Progress dots
  const ProgressDots = () => (
    <div className="flex justify-center gap-1.5 mb-6">
      {Array.from({ length: TOTAL_SCREENS }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === screen ? 'bg-blue-500' : i < screen ? 'bg-blue-300' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )

  const NavButtons = ({ showSaveLater }: { showSaveLater?: boolean }) => (
    <div className="flex items-center justify-between mt-8">
      {screen > 0 ? (
        <button onClick={prev} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      ) : <div />}
      <div className="flex items-center gap-3">
        <button onClick={skip} className="text-sm text-gray-400 hover:text-gray-600">Skip</button>
        {showSaveLater && (
          <button
            onClick={saveAndFinishLater}
            disabled={saving}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Save & Finish Later
          </button>
        )}
        {screen < TOTAL_SCREENS - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={finishOnboarding}
            disabled={saving}
            className="bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'All Done!'}
          </button>
        )}
      </div>
    </div>
  )

  const renderScreen = () => {
    // Section A: Orientation (screens 0-3)
    if (screen === 0) {
      return (
        <div className="text-center space-y-6">
          <div className="text-5xl">
            <Home className="w-16 h-16 mx-auto text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {kidName}!</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            This is your personal portal. Here you can see your daily tasks,
            school schedule, and keep track of everything that matters to you.
          </p>
          <p className="text-sm text-gray-500">Let&apos;s take a quick tour and set things up!</p>
        </div>
      )
    }

    if (screen === 1) {
      return (
        <div className="text-center space-y-6">
          <CheckSquare className="w-16 h-16 mx-auto text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900">Your Daily Tasks</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Every day, you&apos;ll see your checklist of tasks. Required tasks come first
            (zone chores, dishes, school cleanup). Once those are done, you can unlock
            earn-money chores!
          </p>
          <div className="bg-green-50 rounded-lg p-4 max-w-sm mx-auto text-left">
            <p className="text-sm text-green-800 font-medium">Tip:</p>
            <p className="text-sm text-green-700">Tap a task to mark it done. Your progress saves automatically.</p>
          </div>
        </div>
      )
    }

    if (screen === 2) {
      return (
        <div className="text-center space-y-6">
          <Sparkles className="w-16 h-16 mx-auto text-pink-500" />
          <h2 className="text-2xl font-bold text-gray-900">Your Digi-Pet</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Complete tasks to earn stars! Use stars to feed, play with, and
            dress up your very own digital pet. The more you do, the happier
            your pet gets.
          </p>
          <div className="bg-pink-50 rounded-lg p-4 max-w-sm mx-auto">
            <p className="text-sm text-pink-700">You can name your pet and choose what it looks like on the Digi-Pet tab.</p>
          </div>
        </div>
      )
    }

    if (screen === 3) {
      return (
        <div className="text-center space-y-6">
          <Heart className="w-16 h-16 mx-auto text-rose-500" />
          <h2 className="text-2xl font-bold text-gray-900">Mom&apos;s Availability</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            On your dashboard, you&apos;ll see whether Mom is available, in a meeting,
            or busy. If you&apos;re not feeling well, there&apos;s a button to let her know.
          </p>
          <div className="bg-rose-50 rounded-lg p-4 max-w-sm mx-auto">
            <p className="text-sm text-rose-700">You can also send Mom a message anytime from the Requests tab.</p>
          </div>
        </div>
      )
    }

    // Transition screen (4)
    if (screen === 4) {
      return (
        <div className="text-center space-y-6">
          <User className="w-16 h-16 mx-auto text-teal-500" />
          <h2 className="text-2xl font-bold text-gray-900">Now let&apos;s set up your profile!</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Tell us about your favorites so we can make your portal feel like yours.
            You can always change these later from the About Me tab.
          </p>
        </div>
      )
    }

    // Section B: Profile (screens 5-10)
    if (screen === 5) {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 text-center">Pick Your Color & Animal</h2>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Favorite Color</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setProfile(p => ({ ...p, favorite_color: c.value }))}
                  className={`w-12 h-12 rounded-full ${c.class} transition-transform ${
                    profile.favorite_color === c.value ? 'ring-4 ring-offset-2 ring-blue-400 scale-110' : 'hover:scale-105'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Favorite Animal</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ANIMAL_OPTIONS.map(a => (
                <button
                  key={a}
                  onClick={() => setProfile(p => ({ ...p, favorite_animal: a }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    profile.favorite_animal === a
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (screen === 6) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900 text-center">Favorite Foods</h2>
          {[
            { label: 'Favorite Food', key: 'favorite_food' as const, placeholder: 'e.g. Tacos' },
            { label: 'Favorite Snack', key: 'favorite_snack' as const, placeholder: 'e.g. Goldfish crackers' },
            { label: 'Favorite Drink', key: 'favorite_drink' as const, placeholder: 'e.g. Lemonade' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">{field.label}</label>
              <input
                type="text"
                value={profile[field.key]}
                onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      )
    }

    if (screen === 7) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900 text-center">Your Interests</h2>
          <p className="text-sm text-gray-500 text-center">Tap all that apply:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {INTEREST_OPTIONS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  profile.interests.includes(interest)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (screen === 8) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900 text-center">Entertainment</h2>
          {[
            { label: 'Favorite Movie', key: 'favorite_movie' as const, placeholder: 'e.g. Frozen' },
            { label: 'Favorite Show', key: 'favorite_show' as const, placeholder: 'e.g. Bluey' },
            { label: 'Favorite Game', key: 'favorite_game' as const, placeholder: 'e.g. Minecraft' },
            { label: 'Favorite Song', key: 'favorite_song' as const, placeholder: 'e.g. Happy by Pharrell' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">{field.label}</label>
              <input
                type="text"
                value={profile[field.key]}
                onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      )
    }

    if (screen === 9) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900 text-center">Wish List</h2>
          <p className="text-sm text-gray-500 text-center">Things you&apos;d love to have someday:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={wishItem}
              onChange={e => setWishItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWishItem()}
              placeholder="Type an item and press Enter"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addWishItem}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          {wishList.length > 0 && (
            <div className="space-y-2">
              {wishList.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Gift className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-800 flex-1">{item}</span>
                  <button
                    onClick={() => setWishList(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (screen === 10) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900 text-center">About Me</h2>
          <p className="text-sm text-gray-500 text-center">Write a little about yourself:</p>
          <textarea
            value={profile.self_description}
            onChange={e => setProfile(p => ({ ...p, self_description: e.target.value }))}
            placeholder="I am... I like... My favorite thing about me is..."
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      )
    }

    // Final screen (11)
    return (
      <div className="text-center space-y-6">
        <div className="text-5xl">
          <Star className="w-16 h-16 mx-auto text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">You&apos;re all set!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Your portal is ready. You can always update your profile from the About Me tab.
          Have a great day, {kidName}!
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          {profile.favorite_color && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Palette className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Color</p>
              <p className="text-sm font-medium capitalize">{profile.favorite_color}</p>
            </div>
          )}
          {profile.favorite_animal && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <Heart className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Animal</p>
              <p className="text-sm font-medium">{profile.favorite_animal}</p>
            </div>
          )}
          {profile.interests.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2">
              <Star className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Interests</p>
              <p className="text-sm font-medium">{profile.interests.slice(0, 4).join(', ')}{profile.interests.length > 4 ? '...' : ''}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const isInSectionB = screen >= 5

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <ProgressDots />
        {renderScreen()}
        <NavButtons showSaveLater={isInSectionB} />
      </div>
    </div>
  )
}
