'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Image, Trash2, ChevronLeft, Edit3, X, Camera, BookOpen, Beaker, Scissors, Sparkles, GraduationCap } from 'lucide-react'

interface Album {
  id: number
  kid_name: string
  name: string
  album_type: string
  school_year: string | null
  subject_tag: string | null
  description: string | null
  cover_photo_url: string | null
  latest_photo: string | null
  item_count: number
  created_at: string
}

interface PortfolioItem {
  id: number
  album_id: number
  kid_name: string
  title: string | null
  description: string | null
  item_type: string
  file_url: string | null
  lesson_log_id: number | null
  book_id: number | null
  subject_tag: string | null
  date_created: string
  added_by: string
  created_at: string
}

interface LessonLog {
  id: number
  subject_name: string
  subject_emoji: string | null
  notes: string | null
  photo_url: string | null
  log_date: string
}

const ALBUM_TYPES = [
  { value: 'grade_year', label: 'Grade Year', icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
  { value: 'project', label: 'Project', icon: Sparkles, color: 'bg-purple-100 text-purple-600' },
  { value: 'fcs', label: 'FCS', icon: Scissors, color: 'bg-rose-100 text-rose-600' },
  { value: 'stem', label: 'STEM', icon: Beaker, color: 'bg-green-100 text-green-600' },
  { value: 'scrapbook', label: 'Scrapbook', icon: Camera, color: 'bg-amber-100 text-amber-600' },
  { value: 'general', label: 'General', icon: FolderOpen, color: 'bg-gray-100 text-gray-600' },
]

const ALBUM_TYPE_ICONS: Record<string, { icon: typeof FolderOpen; color: string }> = Object.fromEntries(
  ALBUM_TYPES.map(t => [t.value, { icon: t.icon, color: t.color }])
)

export default function PortfolioAlbums({ childName, lessonLogs = [] }: { childName: string; lessonLogs?: LessonLog[] }) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null)
  const [albumItems, setAlbumItems] = useState<PortfolioItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [itemsLoaded, setItemsLoaded] = useState(false)

  // Create album state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('general')
  const [newYear, setNewYear] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false)
  const [itemTitle, setItemTitle] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemType, setItemType] = useState('photo')
  const [itemUrl, setItemUrl] = useState('')
  const [itemSubject, setItemSubject] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/portfolio?action=get_albums&kid_name=${childKey}`)
      .then(r => r.json())
      .then(data => {
        setAlbums(data.albums || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const openAlbum = async (album: Album) => {
    setActiveAlbum(album)
    setItemsLoaded(false)
    try {
      const res = await fetch(`/api/portfolio?action=get_album_items&album_id=${album.id}`)
      const data = await res.json()
      setAlbumItems(data.items || [])
    } catch {
      setAlbumItems([])
    } finally {
      setItemsLoaded(true)
    }
  }

  const createAlbum = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_album',
          kid_name: childKey,
          name: newName.trim(),
          album_type: newType,
          school_year: newYear || null,
          description: newDesc.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.album) {
        setAlbums(prev => [{ ...data.album, item_count: 0, latest_photo: null }, ...prev])
        setShowCreate(false)
        setNewName(''); setNewType('general'); setNewYear(''); setNewDesc('')
        showToast('Album created!')
      }
    } catch {
      showToast('Failed to create album')
    } finally {
      setCreating(false)
    }
  }

  const addItem = async () => {
    if (!activeAlbum) return
    setAddingItem(true)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          album_id: activeAlbum.id,
          kid_name: childKey,
          title: itemTitle.trim() || null,
          description: itemDesc.trim() || null,
          item_type: itemType,
          file_url: itemUrl.trim() || null,
          subject_tag: itemSubject.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.item) {
        setAlbumItems(prev => [data.item, ...prev])
        setAlbums(prev => prev.map(a => a.id === activeAlbum.id ? { ...a, item_count: a.item_count + 1 } : a))
        setShowAddItem(false)
        setItemTitle(''); setItemDesc(''); setItemType('photo'); setItemUrl(''); setItemSubject('')
        showToast('Item added!')
      }
    } catch {
      showToast('Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const deleteItem = async (itemId: number) => {
    try {
      await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_item', item_id: itemId }),
      })
      setAlbumItems(prev => prev.filter(i => i.id !== itemId))
      if (activeAlbum) {
        setAlbums(prev => prev.map(a => a.id === activeAlbum.id ? { ...a, item_count: Math.max(0, a.item_count - 1) } : a))
      }
      showToast('Item removed')
    } catch {
      showToast('Failed to delete')
    }
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>

  // Album detail view
  if (activeAlbum) {
    const typeInfo = ALBUM_TYPE_ICONS[activeAlbum.album_type] || ALBUM_TYPE_ICONS.general
    const TypeIcon = typeInfo.icon

    return (
      <div className="space-y-4">
        {toast && <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">{toast}</div>}

        {/* Album Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveAlbum(null); setAlbumItems([]) }} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{activeAlbum.name}</h2>
            <p className="text-xs text-gray-500">
              {activeAlbum.album_type} {activeAlbum.school_year ? `- ${activeAlbum.school_year}` : ''} - {activeAlbum.item_count} items
            </p>
          </div>
          <button onClick={() => setShowAddItem(true)} className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-600 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {activeAlbum.description && (
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{activeAlbum.description}</p>
        )}

        {/* Add Item Form */}
        {showAddItem && (
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Add Item</h3>
              <button onClick={() => setShowAddItem(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <input type="text" value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="Title" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder="Description (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              {['photo', 'document', 'video', 'link', 'note'].map(t => (
                <button key={t} onClick={() => setItemType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${itemType === t ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-600'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <input type="text" value={itemUrl} onChange={e => setItemUrl(e.target.value)} placeholder="File URL or paste link" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={itemSubject} onChange={e => setItemSubject(e.target.value)} placeholder="Subject tag (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={addItem} disabled={addingItem} className="bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50">
                {addingItem ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => setShowAddItem(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Items */}
        {!itemsLoaded ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div>
        ) : albumItems.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No items yet. Add your first piece of work!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {albumItems.map(item => (
              <div key={item.id} className="border rounded-lg overflow-hidden bg-white group">
                {item.file_url ? (
                  <img src={item.file_url} alt={item.title || 'Portfolio item'} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                    {item.item_type === 'document' ? <BookOpen className="w-8 h-8 text-gray-300" /> :
                     item.item_type === 'note' ? <Edit3 className="w-8 h-8 text-gray-300" /> :
                     <Image className="w-8 h-8 text-gray-300" />}
                  </div>
                )}
                <div className="p-2">
                  {item.title && <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>}
                  {item.description && <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(item.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {item.subject_tag && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{item.subject_tag}</span>
                    )}
                    <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lesson Log Photos auto-linked */}
        {lessonLogs.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Camera className="w-5 h-5 text-emerald-500" /> Lesson Photos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {lessonLogs.map(log => (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  <img src={log.photo_url!} alt={log.notes || 'Lesson photo'} className="w-full h-32 object-cover" />
                  <div className="p-2">
                    <div className="flex items-center gap-1 mb-1">
                      {log.subject_emoji && <span className="text-sm">{log.subject_emoji}</span>}
                      <span className="text-xs font-medium text-gray-700">{log.subject_name}</span>
                    </div>
                    {log.notes && <p className="text-xs text-gray-500 line-clamp-2">{log.notes}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Album grid view
  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-pulse">{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-500" /> Albums
        </h2>
        <button onClick={() => setShowCreate(true)} className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-600 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Create Album
        </button>
      </div>

      {/* Create Album Form */}
      {showCreate && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Create Album</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Album name" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2 flex-wrap">
            {ALBUM_TYPES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.value} onClick={() => setNewType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    newType === t.value ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              )
            })}
          </div>
          <input type="text" value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="School year (e.g. 2025-2026)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={createAlbum} disabled={!newName.trim() || creating} className="bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Albums Grid */}
      {albums.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No albums yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {albums.map(album => {
            const typeInfo = ALBUM_TYPE_ICONS[album.album_type] || ALBUM_TYPE_ICONS.general
            const TypeIcon = typeInfo.icon
            const cover = album.cover_photo_url || album.latest_photo
            return (
              <button
                key={album.id}
                onClick={() => openAlbum(album)}
                className="text-left border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                {cover ? (
                  <img src={cover} alt={album.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className={`w-full h-32 flex items-center justify-center ${typeInfo.color}`}>
                    <TypeIcon className="w-12 h-12 opacity-40" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium text-gray-900 text-sm truncate">{album.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{album.item_count} items</span>
                    {album.school_year && <span className="text-xs text-gray-400">{album.school_year}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Lesson Log Photos (unorganized) */}
      {lessonLogs.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-emerald-500" /> Recent Lesson Photos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {lessonLogs.slice(0, 6).map(log => (
              <div key={log.id} className="border rounded-lg overflow-hidden">
                <img src={log.photo_url!} alt={log.notes || 'Lesson photo'} className="w-full h-32 object-cover" />
                <div className="p-2">
                  <div className="flex items-center gap-1 mb-1">
                    {log.subject_emoji && <span className="text-sm">{log.subject_emoji}</span>}
                    <span className="text-xs font-medium text-gray-700">{log.subject_name}</span>
                  </div>
                  {log.notes && <p className="text-xs text-gray-500 line-clamp-2">{log.notes}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
