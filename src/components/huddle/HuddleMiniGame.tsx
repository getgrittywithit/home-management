'use client'

import { useState, useEffect, useRef } from 'react'
import { Gamepad2, RefreshCw, Check, Timer, ArrowRight } from 'lucide-react'

interface GameOption { game_type: string; display_name: string; description: string; quick_version_description: string }

const postAction = async (action: string, body: any = {}) => {
  const res = await fetch('/api/family-huddle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) })
  return res.json()
}

interface HuddleMiniGameProps {
  huddleId: number
  mode: 'quick' | 'full'
}

export default function HuddleMiniGame({ huddleId, mode }: HuddleMiniGameProps) {
  const [phase, setPhase] = useState<'picking' | 'playing' | 'done'>('picking')
  const [options, setOptions] = useState<GameOption[]>([])
  const [game, setGame] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [memorableMoment, setMemorableMoment] = useState('')
  const startTime = useRef(Date.now())

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    setLoading(true)
    const res = await postAction('get_game_options', { huddle_id: huddleId })
    setOptions(res.options || [])
    setLoading(false)

    // Quick mode: auto-pick first option
    if (mode === 'quick' && res.options?.length > 0) {
      pickGame(res.options[0].game_type)
    }
  }

  const pickGame = async (gameType: string) => {
    setLoading(true)
    startTime.current = Date.now()
    const res = await postAction('load_game', { game_type: gameType, mode })
    setGame(res.game || null)
    setPhase('playing')
    setLoading(false)
  }

  const finishGame = async () => {
    if (!game) return
    const duration = Math.round((Date.now() - startTime.current) / 1000)
    await postAction('save_game', {
      huddle_id: huddleId, game_type: game.type,
      game_data: game, memorable_moment: memorableMoment || null,
      duration_seconds: duration,
    })
    setPhase('done')
  }

  if (loading && phase === 'picking') return (
    <div className="bg-white rounded-lg border shadow-sm p-5 text-center text-gray-400">
      <Gamepad2 className="w-5 h-5 mx-auto mb-2 animate-pulse" /> Loading games...
    </div>
  )

  // ── Picking phase ──
  if (phase === 'picking') return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Gamepad2 className="w-4 h-4 text-purple-500" /> Mini Game — Host Picks!
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map(opt => (
          <button key={opt.game_type} onClick={() => pickGame(opt.game_type)}
            className="text-left p-4 rounded-lg border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition">
            <p className="font-semibold text-gray-900">{opt.display_name}</p>
            <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Done phase ──
  if (phase === 'done') return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border shadow-sm p-5 text-center">
      <p className="text-lg font-bold text-gray-900 mb-1">{'\uD83C\uDF89'} Great game!</p>
      <p className="text-sm text-gray-500">That was {game?.type?.replace(/_/g, ' ')}.</p>
    </div>
  )

  // ── Playing phase ──
  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Gamepad2 className="w-4 h-4 text-purple-500" /> {game?.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
      </h3>

      {game?.type === 'mad_libs' && <MadLibsGame game={game} />}
      {game?.type === 'family_trivia' && <TriviaGame game={game} />}
      {game?.type === 'vocab_showdown' && <VocabShowdownGame game={game} />}
      {game?.type === 'this_or_that' && <ThisOrThatGame game={game} />}

      <div className="mt-4 pt-3 border-t space-y-2">
        <input type="text" value={memorableMoment} onChange={e => setMemorableMoment(e.target.value)}
          placeholder="Save a memorable moment from this game (optional)"
          className="w-full border rounded px-3 py-1.5 text-sm" />
        <button onClick={finishGame}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Done with Game
        </button>
      </div>
    </div>
  )
}

// ── Mad Libs ──
function MadLibsGame({ game }: { game: any }) {
  const [blanks, setBlanks] = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)

  const template: string = game.template || ''
  const tags: string[] = game.blank_tags || []
  const vocabBank: any[] = game.vocab_bank || []

  // Parse template to find blanks
  const parts = template.split(/(\{[^}]+\})/g)
  let blankIdx = 0
  const renderedParts = parts.map((part, i) => {
    const match = part.match(/^\{(.+)\}$/)
    if (match) {
      const idx = blankIdx++
      const tag = match[1].replace(/_/g, ' ')
      if (revealed) {
        return <span key={i} className="font-bold text-purple-700 bg-purple-100 px-1 rounded">{blanks[idx] || `[${tag}]`}</span>
      }
      return (
        <input key={i} type="text" value={blanks[idx] || ''} placeholder={tag}
          onChange={e => setBlanks(prev => ({ ...prev, [idx]: e.target.value }))}
          className="inline-block w-28 border-b-2 border-purple-300 px-1 py-0.5 text-sm text-center mx-0.5 focus:border-purple-500 outline-none" />
      )
    }
    return <span key={i}>{part}</span>
  })

  return (
    <div>
      {vocabBank.length > 0 && !revealed && (
        <div className="mb-3 p-2 bg-purple-50 rounded-lg">
          <p className="text-xs font-semibold text-purple-600 mb-1">Word Bank (vocab words):</p>
          <div className="flex flex-wrap gap-1">
            {vocabBank.map((w: any, i: number) => (
              <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border text-purple-700">{w.word}</span>
            ))}
          </div>
        </div>
      )}
      <div className="text-sm leading-relaxed">{renderedParts}</div>
      {!revealed && (
        <button onClick={() => setRevealed(true)}
          className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">
          {'\uD83D\uDCD6'} Read the Story!
        </button>
      )}
    </div>
  )
}

// ── Family Trivia ──
function TriviaGame({ game }: { game: any }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const questions: any[] = game.questions || []

  if (questions.length === 0) return <p className="text-sm text-gray-400">No trivia questions available.</p>
  const q = questions[currentQ]

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Question {currentQ + 1} of {questions.length}</p>
      <div className="bg-amber-50 rounded-lg p-4">
        <p className="font-medium text-gray-900">{q.question}</p>
        {q.about_kid && <p className="text-xs text-gray-400 mt-1">About: {q.about_kid}</p>}
      </div>
      {showAnswer ? (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="font-semibold text-green-800">{'\u2705'} {q.answer}</p>
        </div>
      ) : (
        <button onClick={() => setShowAnswer(true)}
          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600">
          Reveal Answer
        </button>
      )}
      {showAnswer && currentQ < questions.length - 1 && (
        <button onClick={() => { setCurrentQ(prev => prev + 1); setShowAnswer(false) }}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
          <ArrowRight className="w-3.5 h-3.5" /> Next Question
        </button>
      )}
      {showAnswer && currentQ === questions.length - 1 && (
        <p className="text-sm text-gray-500 font-medium">{'\uD83C\uDF89'} That&apos;s all the questions! Great round!</p>
      )}
    </div>
  )
}

// ── Vocab Showdown ──
function VocabShowdownGame({ game }: { game: any }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(game.timer_seconds || 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const words: any[] = game.words || []

  const startTimer = () => {
    setRunning(true)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setRunning(false)
          setFinished(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  if (words.length === 0) return <p className="text-sm text-gray-400">No vocab words available.</p>

  const w = words[currentIdx % words.length]
  const pct = (timeLeft / (game.timer_seconds || 60)) * 100

  return (
    <div className="space-y-3">
      {!running && !finished && (
        <button onClick={startTimer}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          <Timer className="w-3.5 h-3.5 inline mr-1" /> Start Timer ({game.timer_seconds}s)
        </button>
      )}

      {(running || finished) && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${pct > 25 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-mono font-bold text-gray-700 w-10 text-right">{timeLeft}s</span>
          </div>

          {finished ? (
            <p className="text-center font-semibold text-gray-900">{'\u23F0'} Time&apos;s up! Great round!</p>
          ) : (
            <div className="bg-emerald-50 rounded-lg p-6 text-center">
              <p className="text-xs text-gray-500 mb-1">Definition:</p>
              <p className="text-lg font-medium text-gray-900">{w.definition || 'No definition'}</p>
              <p className="text-xs text-gray-400 mt-2">Who can name the word first?</p>
              <p className="text-sm text-emerald-700 font-bold mt-2 opacity-0 hover:opacity-100 transition">{w.word}</p>
            </div>
          )}

          {running && (
            <button onClick={() => setCurrentIdx(prev => prev + 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 mx-auto">
              <ArrowRight className="w-3.5 h-3.5" /> Next Word
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── This or That ──
function ThisOrThatGame({ game }: { game: any }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const prompts: any[] = game.prompts || []

  if (prompts.length === 0) return <p className="text-sm text-gray-400">No prompts available.</p>

  const done = currentIdx >= prompts.length
  const p = !done ? prompts[currentIdx] : null

  return (
    <div className="space-y-3">
      {done ? (
        <p className="text-center font-semibold text-gray-900">{'\uD83C\uDF89'} That&apos;s a wrap! Great debates!</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">Prompt {currentIdx + 1} of {prompts.length}</p>
          <p className="text-sm font-medium text-gray-800 mb-2">{p.prompt_text}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer transition">
              <p className="font-bold text-blue-700">A</p>
              <p className="text-sm text-gray-800 mt-1">{p.option_a}</p>
            </div>
            <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 text-center hover:border-pink-400 cursor-pointer transition">
              <p className="font-bold text-pink-700">B</p>
              <p className="text-sm text-gray-800 mt-1">{p.option_b}</p>
            </div>
          </div>
          <button onClick={() => setCurrentIdx(prev => prev + 1)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 mx-auto">
            <ArrowRight className="w-3.5 h-3.5" /> Next Prompt
          </button>
        </>
      )}
    </div>
  )
}
