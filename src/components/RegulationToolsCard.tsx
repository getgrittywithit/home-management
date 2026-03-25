'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function RegulationToolsCard() {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [bodyChecks, setBodyChecks] = useState<Record<string, boolean>>({})

  const toggle = (section: string) => {
    setOpenSection(prev => prev === section ? null : section)
  }

  return (
    <div className="bg-gradient-to-b from-green-50 to-white rounded-lg border border-green-100 shadow-sm p-5">
      <h3 className="font-semibold text-green-800 mb-4">🌿 Feeling Overwhelmed?</h3>

      <div className="space-y-2">
        {/* Breathe */}
        <div className="rounded-lg border border-green-100 overflow-hidden">
          <button onClick={() => toggle('breathe')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50">
            <span>🌬 Breathe</span>
            {openSection === 'breathe' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === 'breathe' && (
            <div className="px-4 pb-4 text-sm text-green-700">
              <p className="font-medium mb-2">Box Breathing — repeat 3 times:</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-green-100 rounded-lg">Breathe in<br /><span className="text-lg font-bold">4 sec</span></div>
                <div className="p-3 bg-green-100 rounded-lg">Hold<br /><span className="text-lg font-bold">4 sec</span></div>
                <div className="p-3 bg-green-100 rounded-lg">Breathe out<br /><span className="text-lg font-bold">4 sec</span></div>
                <div className="p-3 bg-green-100 rounded-lg">Hold<br /><span className="text-lg font-bold">4 sec</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Body Check */}
        <div className="rounded-lg border border-green-100 overflow-hidden">
          <button onClick={() => toggle('body')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50">
            <span>🧍 Body Check</span>
            {openSection === 'body' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === 'body' && (
            <div className="px-4 pb-4 space-y-2">
              {['Am I hungry?', 'Am I tired?', 'Do I need to move?', 'Do I need quiet?', 'Do I need to talk to someone?'].map(q => (
                <label key={q} className="flex items-center gap-2 text-sm text-green-700">
                  <input type="checkbox" checked={!!bodyChecks[q]}
                    onChange={() => setBodyChecks(prev => ({ ...prev, [q]: !prev[q] }))}
                    className="rounded border-green-300 text-green-600 focus:ring-green-500" />
                  {q}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Things That Help Me */}
        <div className="rounded-lg border border-green-100 overflow-hidden">
          <button onClick={() => toggle('helps')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50">
            <span>💚 Things That Help Me</span>
            {openSection === 'helps' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === 'helps' && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { emoji: '🚶', text: 'Go for a walk' },
                  { emoji: '🎨', text: 'Draw or color' },
                  { emoji: '🎵', text: 'Listen to music' },
                  { emoji: '🐕', text: 'Pet Belle' },
                  { emoji: '🤗', text: 'Ask for a hug' },
                  { emoji: '💧', text: 'Drink some water' },
                  { emoji: '🌳', text: 'Go outside' },
                  { emoji: '📖', text: 'Read a book' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-2 text-sm text-green-700 p-2 bg-green-50 rounded-lg">
                    <span>{item.emoji}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
