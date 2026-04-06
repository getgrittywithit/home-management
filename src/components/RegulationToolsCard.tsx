'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Check, ThumbsUp, ThumbsDown } from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  sensory: '\uD83C\uDF3F', physical: '\uD83C\uDFC3', cognitive: '\uD83E\uDDE0',
  creative: '\uD83C\uDFA8', social: '\uD83E\uDD1D',
}
const TYPE_LABELS: Record<string, string> = {
  sensory: 'Sensory', physical: 'Physical', cognitive: 'Thinking', creative: 'Creative', social: 'Social',
}

interface RegulationToolsCardProps {
  kidName?: string
  proactive?: boolean // true when mood <= 2 or break button pressed
}

export default function RegulationToolsCard({ kidName, proactive }: RegulationToolsCardProps) {
  const [openSection, setOpenSection] = useState<string | null>(proactive ? 'personalized' : null)
  const [bodyChecks, setBodyChecks] = useState<Record<string, boolean>>({})
  const [tools, setTools] = useState<any[]>([])
  const [usedId, setUsedId] = useState<number | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  useEffect(() => {
    if (kidName) {
      fetch('/api/kids/mood', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_regulation_tools', kid_name: kidName }),
      }).then(r => r.json()).then(d => setTools(d.tools || [])).catch(() => {})
    }
  }, [kidName])

  useEffect(() => {
    if (proactive) setOpenSection('personalized')
  }, [proactive])

  const toggle = (section: string) => setOpenSection(prev => prev === section ? null : section)

  const handleUse = async (id: number) => {
    setUsedId(id)
    await fetch('/api/kids/mood', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_strategy_used', kid_name: kidName, strategy_id: id }),
    }).catch(() => {})
  }

  const handleFeedback = async (helped: boolean) => {
    if (!usedId) return
    setFeedbackGiven(true)
    await fetch('/api/kids/mood', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_strategy_helped', strategy_id: usedId, helped }),
    }).catch(() => {})
  }

  // Group tools by type
  const grouped: Record<string, any[]> = {}
  for (const t of tools) {
    if (!grouped[t.strategy_type]) grouped[t.strategy_type] = []
    grouped[t.strategy_type].push(t)
  }

  return (
    <div className="bg-gradient-to-b from-green-50 to-white rounded-lg border border-green-100 shadow-sm p-5">
      {proactive && (
        <div className="bg-green-100 border border-green-200 rounded-lg px-4 py-2 mb-4 text-sm text-green-800">
          {'\uD83C\uDF3F'} Here are some things that might help right now.
        </div>
      )}
      <h3 className="font-semibold text-green-800 mb-4">{'\uD83C\uDF3F'} Feeling Overwhelmed?</h3>

      <div className="space-y-2">
        {/* Personalized strategies (if kid has them) */}
        {tools.length > 0 && (
          <div className="rounded-lg border border-green-200 overflow-hidden">
            <button onClick={() => toggle('personalized')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50">
              <span>{'\uD83D\uDC9A'} My Strategies</span>
              {openSection === 'personalized' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openSection === 'personalized' && (
              <div className="px-4 pb-4 space-y-3">
                {Object.entries(grouped).map(([type, strats]) => (
                  <div key={type}>
                    <p className="text-xs font-semibold text-green-600 uppercase mb-1">
                      {TYPE_ICONS[type] || ''} {TYPE_LABELS[type] || type}
                    </p>
                    {strats.map((s: any) => (
                      <div key={s.id} className="flex items-start gap-2 mb-2 bg-green-50 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800">{s.strategy_name}</p>
                          <p className="text-xs text-green-600">{s.strategy_description}</p>
                        </div>
                        {usedId === s.id ? (
                          !feedbackGiven ? (
                            <div className="flex gap-1">
                              <span className="text-xs text-gray-500 mt-1">Helped?</span>
                              <button onClick={() => handleFeedback(true)} className="p-1 hover:bg-green-200 rounded" title="Yes">
                                <ThumbsUp className="w-3.5 h-3.5 text-green-600" />
                              </button>
                              <button onClick={() => handleFeedback(false)} className="p-1 hover:bg-red-100 rounded" title="Not really">
                                <ThumbsDown className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-green-500 mt-1">{'\u2705'} Noted</span>
                          )
                        ) : (
                          <button onClick={() => handleUse(s.id)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 whitespace-nowrap">
                            I&apos;m doing this
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Breathe */}
        <div className="rounded-lg border border-green-100 overflow-hidden">
          <button onClick={() => toggle('breathe')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50">
            <span>{'\uD83C\uDF2C\uFE0F'} Breathe</span>
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
            <span>{'\uD83E\uDDCD'} Body Check</span>
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

        {/* Crisis Resources — always visible */}
        <div className="rounded-lg border border-gray-200 overflow-hidden mt-3">
          <button onClick={() => toggle('crisis')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50">
            <span>Need to talk to someone?</span>
            {openSection === 'crisis' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === 'crisis' && (
            <div className="px-4 pb-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700 p-2 bg-blue-50 rounded-lg">
                <span>{'\uD83D\uDCAC'}</span>
                <span>Text <strong>HOME</strong> to <strong>741741</strong> (Crisis Text Line)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 p-2 bg-blue-50 rounded-lg">
                <span>{'\uD83D\uDCDE'}</span>
                <span>Call <strong>988</strong> (Suicide &amp; Crisis Lifeline)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 p-2 bg-green-50 rounded-lg">
                <span>{'\uD83C\uDFE0'}</span>
                <span>Talk to <strong>Mom or Dad</strong> — they always want to help</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
