'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, Play, Check, RotateCcw, Star } from 'lucide-react'
import SpeakerButton from '../SpeakerButton'

interface Card {
  id: number; front_text: string; back_text: string; target_sound?: string
  example_sentence?: string; leitner_box: number
}

interface Props { kidName: string; onClose?: () => void }

export default function SpeechPractice({ kidName, onClose }: Props) {
  const kid = kidName.toLowerCase()
  const [cards, setCards] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [rated, setRated] = useState(false)
  const [results, setResults] = useState<Array<{ rating: string }>>([])
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    fetch(`/api/flashcards?action=review_queue&kid_name=${kid}&max=5&deck_type=speech_practice`)
      .then(r => r.json()).then(d => { setCards(d.cards || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kid])

  const current = cards[idx]

  const speakWord = () => {
    if (!current) return
    const u = new SpeechSynthesisUtterance(current.front_text)
    u.rate = 0.8; u.pitch = 1
    speechSynthesis.speak(u)
  }

  useEffect(() => { if (current && !loading) speakWord() }, [idx, loading])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRef.current = recorder
      recorder.start()
      setRecording(true)
      setTimeout(() => { if (mediaRef.current?.state === 'recording') { mediaRef.current.stop(); setRecording(false) } }, 5000)
    } catch { /* mic not available */ }
  }

  const stopRecording = () => {
    if (mediaRef.current?.state === 'recording') { mediaRef.current.stop(); setRecording(false) }
  }

  const rate = async (rating: 'like_mom' | 'still_practicing') => {
    setRated(true)
    setResults(prev => [...prev, { rating }])

    await fetch('/api/flashcards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review', card_id: current.id, kid_name: kid, result: rating === 'like_mom' ? 'correct' : 'wrong' }),
    }).catch(() => {})

    await fetch('/api/flashcards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_speech_session', kid_name: kid, card_id: current.id, target_sound: current.target_sound, kid_self_rating: rating }),
    }).catch(() => {})

    setTimeout(() => {
      if (idx + 1 < cards.length) {
        setIdx(idx + 1); setRated(false); setAudioUrl(null)
      } else {
        setDone(true)
      }
    }, 1200)
  }

  if (loading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto" /></div>

  if (cards.length === 0) return (
    <div className="bg-white rounded-xl border p-6 text-center">
      <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
      <p className="text-sm text-gray-700">No speech cards due today!</p>
      <p className="text-xs text-gray-400 mt-1">Your mouth learns a little more every day.</p>
    </div>
  )

  if (done) {
    const likeMom = results.filter(r => r.rating === 'like_mom').length
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <Star className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="text-lg font-bold text-gray-900">Great practice!</p>
        <p className="text-sm text-gray-600 mt-2">
          You practiced {results.length} sounds. {likeMom} sounded just right!
        </p>
        <div className="flex gap-1 justify-center mt-3">
          {results.map((r, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${r.rating === 'like_mom' ? 'bg-green-400' : 'bg-gray-300'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Your mouth learns a little more every time.</p>
        {onClose && <button onClick={onClose} className="mt-4 text-sm text-pink-600">Done</button>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-gradient-to-r from-pink-400 to-rose-400 text-white p-3 flex items-center justify-between">
        <span className="text-sm font-bold flex items-center gap-1.5">🎤 Speech Practice</span>
        <span className="text-xs">{idx + 1} of {cards.length}</span>
      </div>

      <div className="p-6 text-center space-y-4">
        <p className="text-3xl font-bold text-gray-900">{current.front_text}</p>
        {current.example_sentence && (
          <p className="text-sm text-gray-500 italic">{current.example_sentence}</p>
        )}

        <div className="flex justify-center gap-3">
          <button onClick={speakWord} className="p-3 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200" title="Hear it">
            <Play className="w-5 h-5" />
          </button>
          <button onClick={recording ? stopRecording : startRecording}
            className={`p-3 rounded-full ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}>
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {audioUrl && (
          <div className="flex justify-center">
            <audio src={audioUrl} controls className="h-8" />
          </div>
        )}

        {!rated ? (
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => rate('like_mom')}
              className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-100">
              <Check className="w-4 h-4" /> Nailed it!
            </button>
            <button onClick={() => rate('still_practicing')}
              className="flex items-center gap-1.5 bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : (
          <p className="text-sm text-pink-600 font-medium animate-fade-in">
            {results[results.length - 1]?.rating === 'like_mom' ? 'Beautiful! Onto the next one.' : "That was a gentle try. We'll come back to it."}
          </p>
        )}
      </div>
    </div>
  )
}
