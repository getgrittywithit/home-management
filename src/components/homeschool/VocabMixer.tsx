'use client'

import { useState, useEffect } from 'react'
import { Shuffle, CheckCircle2, Clock, Trophy } from 'lucide-react'

interface VocabWord { id: number; word: string; definition: string; book_title: string }
interface QuizSection { word: string; definition: string; [key: string]: any }

const postAction = async (action: string, body: any) => {
  const res = await fetch('/api/learning-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) })
  return res.json()
}
const getAction = async (action: string, params: string) => {
  const res = await fetch(`/api/learning-engine?action=${action}&${params}`)
  return res.json()
}

export default function VocabMixer({ kidName }: { kidName: string }) {
  const [words, setWords] = useState<VocabWord[]>([])
  const [wordCount, setWordCount] = useState(15)
  const [quiz, setQuiz] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [score, setScore] = useState<number | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [view, setView] = useState<'setup' | 'quiz' | 'results' | 'history'>('setup')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAction('get_vocab_words', `kid_name=${kidName}`).then(d => setWords(d.words || []))
    getAction('get_vocab_history', `kid_name=${kidName}`).then(d => setHistory(d.history || []))
  }, [kidName])

  const handleMix = async () => {
    if (words.length < 5) return alert('Need at least 5 vocab words. Add more from your reading!')
    setLoading(true)
    const session = await postAction('create_vocab_mix', { kid_name: kidName, book_ids: [], word_count: wordCount })
    if (session.success) {
      const quizRes = await postAction('generate_vocab_quiz', { session_id: session.session.id })
      if (quizRes.success) {
        setQuiz(quizRes.quiz)
        setAnswers({})
        setScore(null)
        setView('quiz')
      } else {
        alert(quizRes.error || 'Could not generate quiz')
      }
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!quiz) return
    const data = quiz.quiz_data ? (typeof quiz.quiz_data === 'string' ? JSON.parse(quiz.quiz_data) : quiz.quiz_data) : {}
    let earned = 0

    // Score unscramble
    ;(data.unscramble || []).forEach((q: any, i: number) => {
      if ((answers[`unscramble_${i}`] || '').toLowerCase().trim() === q.answer.toLowerCase()) earned++
    })
    // Score match
    ;(data.matchIt || []).forEach((q: any, i: number) => {
      if ((answers[`match_${i}`] || '').toLowerCase().trim() === q.definition.toLowerCase().trim()) earned++
    })
    // Use in sentence: 1 point each if non-empty
    ;(data.useInSentence || []).forEach((_: any, i: number) => {
      if ((answers[`sentence_${i}`] || '').trim().length > 10) earned++
    })
    // Spot error: 1 point each if answered
    ;(data.spotError || []).forEach((_: any, i: number) => {
      if ((answers[`spot_${i}`] || '').trim().length > 0) earned++
    })

    setScore(earned)
    await postAction('submit_vocab_quiz', { quiz_id: quiz.id, score: earned })
    setView('results')
  }

  const quizData = quiz?.quiz_data ? (typeof quiz.quiz_data === 'string' ? JSON.parse(quiz.quiz_data) : quiz.quiz_data) : {}

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-purple-500" /> Vocab Mixer
        </h3>
        <div className="flex gap-2">
          {view !== 'setup' && <button onClick={() => setView('setup')} className="text-xs text-purple-600 hover:text-purple-700">New Mix</button>}
          <button onClick={() => setView(view === 'history' ? 'setup' : 'history')} className="text-xs text-gray-500 hover:text-gray-700">
            {view === 'history' ? 'Back' : 'History'}
          </button>
        </div>
      </div>

      {view === 'setup' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Shuffle your vocab words into a mixed review quiz!</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Words:</label>
            <input type="range" min={5} max={Math.min(30, words.length || 30)} value={wordCount}
              onChange={e => setWordCount(Number(e.target.value))} className="flex-1" />
            <span className="text-sm font-medium w-8">{wordCount}</span>
          </div>
          <p className="text-xs text-gray-400">{words.length} vocab words available</p>
          <button onClick={handleMix} disabled={loading || words.length < 5}
            className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white py-2.5 rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 transition">
            <Shuffle className="w-4 h-4" /> {loading ? 'Mixing...' : 'Mix It Up!'}
          </button>
        </div>
      )}

      {view === 'quiz' && quiz && (
        <div className="space-y-6">
          {/* Unscramble */}
          {(quizData.unscramble || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">1. Unscramble the Word</h4>
              {quizData.unscramble.map((q: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-purple-700 tracking-wider">{q.scrambled}</span>
                  <input type="text" value={answers[`unscramble_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`unscramble_${i}`]: e.target.value }))}
                    placeholder="Type the word" className="border rounded px-2 py-1 text-sm flex-1" />
                  <span className="text-xs text-gray-400 truncate max-w-32">{q.definition}</span>
                </div>
              ))}
            </div>
          )}

          {/* Use in Sentence */}
          {(quizData.useInSentence || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">2. Use in a Sentence</h4>
              {quizData.useInSentence.map((q: QuizSection, i: number) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm"><span className="font-semibold text-purple-700">{q.word}</span> — {q.definition}</p>
                  <input type="text" value={answers[`sentence_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`sentence_${i}`]: e.target.value }))}
                    placeholder="Write a sentence using this word..." className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          )}

          {/* Spot the Error */}
          {(quizData.spotError || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">3. Does this sentence use the word correctly?</h4>
              {quizData.spotError.map((q: QuizSection, i: number) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm italic text-gray-700">&quot;{q.sentence}&quot;</p>
                  <input type="text" value={answers[`spot_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`spot_${i}`]: e.target.value }))}
                    placeholder="Yes/No and explain..." className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          )}

          {/* Match It */}
          {(quizData.matchIt || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">4. Match Word to Definition</h4>
              {quizData.matchIt.map((q: QuizSection, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-purple-700 w-28">{q.word}</span>
                  <input type="text" value={answers[`match_${i}`] || ''} onChange={e => setAnswers(a => ({ ...a, [`match_${i}`]: e.target.value }))}
                    placeholder="Type the definition" className="border rounded px-2 py-1 text-sm flex-1" />
                </div>
              ))}
            </div>
          )}

          <button onClick={handleSubmit}
            className="w-full bg-green-500 text-white py-2.5 rounded-lg font-medium hover:bg-green-600 transition">
            Submit Quiz
          </button>
        </div>
      )}

      {view === 'results' && score !== null && (
        <div className="text-center space-y-3">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-2xl font-bold text-gray-900">{score} / {quiz?.max_score || 21}</p>
          <p className="text-sm text-gray-500">{score >= (quiz?.max_score || 21) * 0.8 ? 'Great job!' : score >= (quiz?.max_score || 21) * 0.5 ? 'Good effort! Keep practicing.' : 'Keep studying — you\'ll get there!'}</p>
          <button onClick={() => setView('setup')} className="text-sm text-purple-600 hover:text-purple-700 font-medium">Try Again</button>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No quizzes taken yet.</p>
          ) : history.map((h: any) => (
            <div key={h.id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                {h.completed_at ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-gray-400" />}
                <span>{h.word_count} words</span>
              </div>
              <div className="flex items-center gap-3">
                {h.score != null && <span className="font-medium">{h.score}/{h.max_score}</span>}
                <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
