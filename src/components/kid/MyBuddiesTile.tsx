'use client'

import { useState, useEffect } from 'react'
import { HOMESCHOOL_KIDS } from '@/lib/constants'
import BuddyChatUI from './BuddyChatUI'

interface Persona {
  persona_key: string
  display_name: string
  short_description: string
  icon: string
  color_theme: string
}

const THEME_COLORS: Record<string, string> = {
  purple: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
  teal: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100',
  amber: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
  blue: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
}

export default function MyBuddiesTile({ kidName }: { kidName: string }) {
  const kid = kidName.toLowerCase()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [openBuddy, setOpenBuddy] = useState<Persona | null>(null)

  if (!(HOMESCHOOL_KIDS as readonly string[]).includes(kid)) return null

  useEffect(() => {
    fetch('/api/ai-buddy?action=admin_get_personas')
      .then(r => r.json())
      .then(d => setPersonas((d.personas || []).filter((p: any) => p.active)))
      .catch(() => {})
  }, [])

  if (personas.length === 0) return null

  return (
    <>
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">My Buddies</h3>
        <div className="grid grid-cols-2 gap-2">
          {personas.map(p => (
            <button key={p.persona_key} onClick={() => setOpenBuddy(p)}
              className={`p-3 rounded-lg border text-left ${THEME_COLORS[p.color_theme] || THEME_COLORS.blue}`}>
              <span className="text-lg">{p.icon}</span>
              <p className="text-xs font-medium mt-1">{p.display_name}</p>
              <p className="text-[10px] opacity-60">{p.short_description}</p>
            </button>
          ))}
        </div>
      </div>

      {openBuddy && (
        <BuddyChatUI
          kidName={kidName}
          personaKey={openBuddy.persona_key}
          personaName={openBuddy.display_name}
          personaIcon={openBuddy.icon}
          onClose={() => setOpenBuddy(null)}
        />
      )}
    </>
  )
}
