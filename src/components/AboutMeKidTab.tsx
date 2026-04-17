'use client'

import { useState, useEffect } from 'react'
import {
  User, Heart, Star, Palette, Gift, Edit3, Save, X,
  Camera, BookOpen, Gamepad2, Music, Film, Ruler
} from 'lucide-react'

interface AboutMeKidTabProps {
  childName: string
}

interface KidProfile {
  kid_name: string
  display_name: string | null
  favorite_color: string | null
  favorite_animal: string | null
  favorite_food: string | null
  favorite_snack: string | null
  favorite_drink: string | null
  favorite_movie: string | null
  favorite_show: string | null
  favorite_game: string | null
  favorite_song: string | null
  favorite_book: string | null
  interests: string[]
  self_description: string | null
  photo_url: string | null
  updated_at: string | null
}

interface Sizes {
  shirt: string
  pants: string
  shoe: string
}

interface WishItem {
  id: number
  item_name: string
  priority: string
  status: string
}

const SHIRT_SIZES = ['Youth XS', 'Youth S', 'Youth M', 'Youth L', 'Youth XL', 'Adult XS', 'Adult S', 'Adult M', 'Adult L', 'Adult XL']
const PANTS_SIZES = ['8', '8 Slim', '10', '10 Slim', '12', '12 Reg', '14', '14 Slim', '16', '26x28', '28x30', '30x30', '30x32', '32x30', '32x32', '34x32']
const SHOE_SIZES = ['1Y', '2Y', '3Y', '4Y', '5Y', '6Y', '7Y', '7W', '8W', '8M', '9M', '9W', '10M', '10W', '11M', '12M']

export default function AboutMeKidTab({ childName }: AboutMeKidTabProps) {
  const [profile, setProfile] = useState<KidProfile | null>(null)
  const [wishes, setWishes] = useState<WishItem[]>([])
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<KidProfile>>({})
  const [newWish, setNewWish] = useState('')
  const [sizes, setSizes] = useState<Sizes>({ shirt: '', pants: '', shoe: '' })
  const [editSizes, setEditSizes] = useState<Sizes>({ shirt: '', pants: '', shoe: '' })
  const [sizesEditing, setSizesEditing] = useState(false)
  const [sizesSaving, setSizesSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const kidKey = childName.toLowerCase()

  useEffect(() => {
    Promise.all([
      fetch(`/api/kid-profile?action=get_profile&kid_name=${kidKey}`).then(r => r.json()),
      fetch(`/api/kid-profile?action=get_wish_list&kid_name=${kidKey}`).then(r => r.json()),
      fetch(`/api/shopping?action=get_profile&kid_name=${kidKey}`).then(r => r.json()),
    ])
      .then(([profileData, wishData, shopData]) => {
        setProfile(profileData.profile || null)
        setWishes(wishData.wishes || [])
        const s = shopData.profile?.sizes
        if (s) {
          const parsed = typeof s === 'string' ? JSON.parse(s) : s
          setSizes({ shirt: parsed.shirt || '', pants: parsed.pants || '', shoe: parsed.shoe || '' })
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [kidKey])

  const startEditing = () => {
    if (profile) {
      setEditData({
        favorite_color: profile.favorite_color || '',
        favorite_animal: profile.favorite_animal || '',
        favorite_food: profile.favorite_food || '',
        favorite_snack: profile.favorite_snack || '',
        favorite_drink: profile.favorite_drink || '',
        favorite_movie: profile.favorite_movie || '',
        favorite_show: profile.favorite_show || '',
        favorite_game: profile.favorite_game || '',
        favorite_song: profile.favorite_song || '',
        favorite_book: profile.favorite_book || '',
        self_description: profile.self_description || '',
      })
      setEditing(true)
    }
  }

  const saveEdits = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/kid-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', kid_name: kidKey, ...editData }),
      })
      const data = await res.json()
      if (data.success && data.profile) {
        setProfile(data.profile)
      }
      setEditing(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const addWishItem = async () => {
    if (!newWish.trim()) return
    try {
      const res = await fetch('/api/kid-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_wish_item', kid_name: kidKey, item_name: newWish.trim() }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setWishes(prev => [data.item, ...prev])
        setNewWish('')
      }
    } catch (err) {
      console.error('Add wish error:', err)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return <div className="text-center text-gray-500 py-12">Profile not found</div>
  }

  const FavoriteRow = ({ icon, label, value, editKey }: { icon: React.ReactNode; label: string; value: string | null; editKey?: string }) => (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-shrink-0 text-gray-400">{icon}</div>
      <div className="flex-1">
        <span className="text-xs text-gray-500">{label}</span>
        {editing && editKey ? (
          <input
            type="text"
            value={(editData as any)[editKey] || ''}
            onChange={e => setEditData(prev => ({ ...prev, [editKey]: e.target.value }))}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
          />
        ) : (
          <p className="text-sm text-gray-900">{value || '...'}</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={childName} className="w-16 h-16 rounded-full object-cover border-2 border-white" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name || childName}</h1>
              <p className="text-teal-100">About Me</p>
            </div>
          </div>
          {!editing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm"
            >
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveEdits}
                disabled={saving}
                className="flex items-center gap-1 bg-white text-teal-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-50 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Self Description */}
      {(profile.self_description || editing) && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">About Me</h3>
          {editing ? (
            <textarea
              value={editData.self_description || ''}
              onChange={e => setEditData(prev => ({ ...prev, self_description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Tell us about yourself..."
            />
          ) : (
            <p className="text-sm text-gray-700">{profile.self_description}</p>
          )}
        </div>
      )}

      {/* Favorites */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Favorites</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0">
          <div className="space-y-1">
            <FavoriteRow icon={<Palette className="w-4 h-4" />} label="Color" value={profile.favorite_color} editKey="favorite_color" />
            <FavoriteRow icon={<Heart className="w-4 h-4" />} label="Animal" value={profile.favorite_animal} editKey="favorite_animal" />
            <FavoriteRow icon={<Star className="w-4 h-4" />} label="Food" value={profile.favorite_food} editKey="favorite_food" />
            <FavoriteRow icon={<Star className="w-4 h-4" />} label="Snack" value={profile.favorite_snack} editKey="favorite_snack" />
            <FavoriteRow icon={<Star className="w-4 h-4" />} label="Drink" value={profile.favorite_drink} editKey="favorite_drink" />
          </div>
          <div className="space-y-1">
            <FavoriteRow icon={<Film className="w-4 h-4" />} label="Movie" value={profile.favorite_movie} editKey="favorite_movie" />
            <FavoriteRow icon={<Film className="w-4 h-4" />} label="Show" value={profile.favorite_show} editKey="favorite_show" />
            <FavoriteRow icon={<Gamepad2 className="w-4 h-4" />} label="Game" value={profile.favorite_game} editKey="favorite_game" />
            <FavoriteRow icon={<Music className="w-4 h-4" />} label="Song" value={profile.favorite_song} editKey="favorite_song" />
            <FavoriteRow icon={<BookOpen className="w-4 h-4" />} label="Book" value={profile.favorite_book} editKey="favorite_book" />
          </div>
        </div>
      </div>

      {/* Interests */}
      {(profile.interests?.length > 0) && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map(interest => (
              <span key={interest} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* My Sizes */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-indigo-500" /> My Sizes
          </h3>
          {!sizesEditing ? (
            <button onClick={() => { setEditSizes({ ...sizes }); setSizesEditing(true) }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button disabled={sizesSaving} onClick={async () => {
                setSizesSaving(true)
                try {
                  await fetch('/api/shopping', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_profile', kid_name: kidKey, sizes: editSizes }),
                  })
                  setSizes({ ...editSizes })
                  setSizesEditing(false)
                } catch {} finally { setSizesSaving(false) }
              }} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-medium hover:bg-indigo-700 disabled:opacity-50">
                {sizesSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setSizesEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
            </div>
          )}
        </div>
        {sizesEditing ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">👕 Shirt</label>
              <select value={editSizes.shirt} onChange={e => setEditSizes(p => ({ ...p, shirt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Select...</option>
                {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">👖 Pants</label>
              <select value={editSizes.pants} onChange={e => setEditSizes(p => ({ ...p, pants: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Select...</option>
                {PANTS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">👟 Shoes</label>
              <select value={editSizes.shoe} onChange={e => setEditSizes(p => ({ ...p, shoe: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Select...</option>
                {SHOE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <span className="text-lg">👕</span>
              <p className="text-xs text-gray-500 mt-1">Shirt</p>
              <p className="text-sm font-medium text-gray-900">{sizes.shirt || '—'}</p>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <span className="text-lg">👖</span>
              <p className="text-xs text-gray-500 mt-1">Pants</p>
              <p className="text-sm font-medium text-gray-900">{sizes.pants || '—'}</p>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <span className="text-lg">👟</span>
              <p className="text-xs text-gray-500 mt-1">Shoes</p>
              <p className="text-sm font-medium text-gray-900">{sizes.shoe || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Wish List */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" /> Wish List
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newWish}
            onChange={e => setNewWish(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWishItem()}
            placeholder="Add something to your wish list..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={addWishItem}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600"
          >
            Add
          </button>
        </div>
        {wishes.length > 0 ? (
          <div className="space-y-2">
            {wishes.map(w => (
              <div key={w.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-gray-800 flex-1">{w.item_name}</span>
                <span className="text-xs text-gray-400 capitalize">{w.priority}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No wish list items yet</p>
        )}
      </div>
    </div>
  )
}
