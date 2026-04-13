'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function VocabTestPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <VocabTestPage />
    </Suspense>
  )
}

interface VocabWord {
  id: string
  word: string
  definition: string
  example_sentence: string | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function VocabTestPage() {
  const params = useSearchParams()
  const bookId = params.get('book_id') || ''
  const setName = params.get('set_name') || ''
  const testDate = params.get('test_date') || new Date().toLocaleDateString('en-CA')
  const bookTitle = params.get('title') || 'Vocabulary Test'

  const [words, setWords] = useState<VocabWord[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!bookId) return
    const url = setName
      ? `/api/assessments?action=get_vocab_words&book_id=${bookId}&set_name=${encodeURIComponent(setName)}`
      : `/api/assessments?action=get_vocab_words&book_id=${bookId}`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setWords(data.words || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [bookId, setName])

  if (!bookId) {
    return <div className="p-8">Missing book_id parameter.</div>
  }
  if (!loaded) {
    return <div className="p-8">Loading…</div>
  }
  if (words.length === 0) {
    return <div className="p-8">No vocab words found for this book/set.</div>
  }

  // Test structure:
  // Part A: definitions — all words (or up to 10)
  // Part B: use in sentence — 5 randomly selected words
  // Part C: fill-in-blank — 5 randomly selected words (using example_sentence with the word blanked)
  const partAWords = words.slice(0, Math.min(words.length, 10))
  const partBWords = shuffle(words).slice(0, Math.min(words.length, 5))
  const partCWords = shuffle(words.filter(w => w.example_sentence)).slice(0, Math.min(5, words.length))
  const wordBank = shuffle(words.map(w => w.word)).join(' · ')

  const blankSentence = (w: VocabWord): string => {
    if (!w.example_sentence) return '__________'
    const re = new RegExp(`\\b${w.word}\\b`, 'i')
    return w.example_sentence.replace(re, '__________')
  }

  return (
    <div className="vocab-test-page">
      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between z-10">
        <div>
          <h1 className="font-bold text-lg">Vocab Test — {bookTitle}{setName ? ` · ${setName}` : ''}</h1>
          <p className="text-sm text-gray-500">{words.length} words · 3 sections · fill in student name at top before printing</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          🖨️ Print Test
        </button>
      </div>

      <div className="print-body max-w-3xl mx-auto bg-white text-black p-8">
        {/* Header */}
        <div className="border-b-2 border-black pb-3 mb-5">
          <h1 className="text-2xl font-bold text-center">Moses Family Homeschool — Vocabulary Test</h1>
          <div className="mt-3 flex justify-between text-sm">
            <span><strong>Book:</strong> {bookTitle}{setName ? ` — ${setName}` : ''}</span>
            <span><strong>Date:</strong> {testDate}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span><strong>Name:</strong> _________________________</span>
            <span><strong>Score:</strong> ___/{partAWords.length * 2 + partBWords.length + partCWords.length}</span>
          </div>
        </div>

        {/* Part A: Definitions */}
        <section className="mb-6">
          <h2 className="font-bold text-base mb-1">PART A — Definitions ({partAWords.length * 2} points)</h2>
          <p className="text-xs text-gray-600 mb-3 italic">Write the definition for each word. 2 points each.</p>
          <ol className="space-y-4">
            {partAWords.map((w, i) => (
              <li key={w.id} className="text-sm">
                <strong>{i + 1}. {w.word}:</strong>
                <div className="mt-1 border-b border-gray-400 h-5"></div>
                <div className="mt-1 border-b border-gray-400 h-5"></div>
              </li>
            ))}
          </ol>
        </section>

        {/* Part B: Use It */}
        <section className="mb-6">
          <h2 className="font-bold text-base mb-1">PART B — Use It ({partBWords.length} points)</h2>
          <p className="text-xs text-gray-600 mb-3 italic">Write a sentence using each word correctly. 1 point each.</p>
          <ol className="space-y-4">
            {partBWords.map((w, i) => (
              <li key={w.id} className="text-sm">
                <strong>{i + 1}. {w.word}:</strong>
                <div className="mt-1 border-b border-gray-400 h-5"></div>
                <div className="mt-1 border-b border-gray-400 h-5"></div>
              </li>
            ))}
          </ol>
        </section>

        {/* Part C: Fill in Blank */}
        {partCWords.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold text-base mb-1">PART C — Fill in the Blank ({partCWords.length} points)</h2>
            <p className="text-xs text-gray-600 mb-2 italic">
              Choose the correct word from the word bank. 1 point each.
            </p>
            <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 mb-3 text-sm">
              <strong>Word Bank:</strong> {wordBank}
            </div>
            <ol className="space-y-3">
              {partCWords.map((w, i) => (
                <li key={w.id} className="text-sm">
                  {i + 1}. {blankSentence(w)}
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-8 text-center text-xs text-gray-500 border-t pt-3">
          Moses Family Homeschool · {testDate}
        </div>

        {/* Answer key — page break before, print-only */}
        <div className="answer-key-page">
          <h2 className="text-xl font-bold mb-4">Answer Key (Parent Reference)</h2>
          <p className="text-xs text-gray-500 mb-4 italic">Cut this page off before giving the test to students.</p>

          <h3 className="font-bold mt-4 mb-2">Part A — Definitions</h3>
          <ol className="space-y-1 text-sm">
            {partAWords.map((w, i) => (
              <li key={w.id}>
                <strong>{i + 1}. {w.word}:</strong> {w.definition}
              </li>
            ))}
          </ol>

          <h3 className="font-bold mt-4 mb-2">Part B — Use It</h3>
          <p className="text-xs italic text-gray-500 mb-1">Accept any correct sentence demonstrating the meaning.</p>
          <ol className="space-y-1 text-sm">
            {partBWords.map((w, i) => (
              <li key={w.id}>
                <strong>{i + 1}. {w.word}:</strong> <span className="text-gray-600">{w.definition}</span>
                {w.example_sentence && <div className="text-xs text-gray-400 pl-4">e.g. {w.example_sentence}</div>}
              </li>
            ))}
          </ol>

          {partCWords.length > 0 && (
            <>
              <h3 className="font-bold mt-4 mb-2">Part C — Fill in the Blank</h3>
              <ol className="space-y-1 text-sm">
                {partCWords.map((w, i) => (
                  <li key={w.id}>
                    <strong>{i + 1}. {w.word}</strong>
                    {w.example_sentence && <div className="text-xs text-gray-500 pl-4">{w.example_sentence}</div>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 0.5in; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .vocab-test-page { padding: 0 !important; }
          .print-body { padding: 0 !important; max-width: 100% !important; }
          .answer-key-page { page-break-before: always; }
        }
        @media screen {
          body { background: #f5f5f5; }
          .vocab-test-page { padding: 1rem; }
          .print-body { box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; margin-top: 1rem; }
          .answer-key-page { margin-top: 2rem; border-top: 2px dashed #888; padding-top: 1.5rem; }
        }
      `}</style>
    </div>
  )
}
