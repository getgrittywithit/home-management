'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { MathSkill } from '@/lib/mathSpeedTest'

interface KidTest {
  kid_name: string
  grade_level: number
  skill_area: MathSkill
  problems: { problem: string; answer: string }[]
}

const SKILL_LABELS: Record<string, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
  fractions: 'Fractions',
  money: 'Money',
  time: 'Time',
  measurement: 'Measurement',
  place_value: 'Place Value',
  decimals: 'Decimals',
  mixed: 'Mixed Skills',
}

export default function MathTestPage() {
  const params = useSearchParams()
  // URL format: ?kids=amos:addition:2,wyatt:multiplication:4,...
  const kidsParam = params.get('kids') || ''
  const testDate = params.get('test_date') || new Date().toLocaleDateString('en-CA')
  const timeLimit = params.get('time') || '1 minute'

  const [tests, setTests] = useState<KidTest[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!kidsParam) { setLoaded(true); return }
    const entries = kidsParam.split(',').map(e => {
      const [kid, skill, grade] = e.split(':')
      return { kid, skill: skill as MathSkill, grade: parseInt(grade, 10) }
    }).filter(e => e.kid && e.skill && e.grade)

    Promise.all(entries.map(async e => {
      const res = await fetch(`/api/assessments?action=generate_math_test&skill=${e.skill}&grade=${e.grade}&count=20`)
      const data = await res.json()
      return {
        kid_name: e.kid.charAt(0).toUpperCase() + e.kid.slice(1),
        grade_level: e.grade,
        skill_area: e.skill,
        problems: data.problems || [],
      } as KidTest
    })).then(setTests).finally(() => setLoaded(true))
  }, [kidsParam])

  if (!loaded) return <div className="p-8">Generating tests…</div>
  if (tests.length === 0) return <div className="p-8">No tests configured. Pass ?kids=name:skill:grade,...</div>

  return (
    <div className="math-test-page">
      <div className="no-print sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between z-10">
        <div>
          <h1 className="font-bold text-lg">Math Speed Test — {tests.length} kids</h1>
          <p className="text-sm text-gray-500">One page per kid · answer key at bottom · prints on separate pages</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          🖨️ Print All Tests
        </button>
      </div>

      {tests.map((test, idx) => {
        const left = test.problems.slice(0, 10)
        const right = test.problems.slice(10, 20)
        return (
          <div key={idx} className="math-test-sheet max-w-3xl mx-auto bg-white text-black p-8">
            <div className="border-b-2 border-black pb-3 mb-4">
              <h1 className="text-2xl font-bold text-center">Math Speed Test — Mad Minute</h1>
              <div className="mt-3 flex justify-between text-sm">
                <span><strong>Name:</strong> {test.kid_name}</span>
                <span><strong>Date:</strong> {testDate}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span><strong>Skill:</strong> {SKILL_LABELS[test.skill_area] || test.skill_area}</span>
                <span><strong>Grade Level:</strong> {test.grade_level}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span><strong>Time:</strong> {timeLimit}</span>
                <span><strong>Score:</strong> ___/{test.problems.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-base">
              {left.map((p, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-6 text-right text-gray-500 mr-2">{i + 1})</span>
                  <span className="font-mono">{p.problem} = ____</span>
                </div>
              ))}
              {right.map((p, i) => (
                <div key={i + 10} className="flex items-center">
                  <span className="w-6 text-right text-gray-500 mr-2">{i + 11})</span>
                  <span className="font-mono">{p.problem} = ____</span>
                </div>
              ))}
            </div>

            <div className="answer-key-inline mt-8 pt-4 border-t-2 border-dashed border-gray-400">
              <p className="text-xs italic text-gray-500 mb-2">✂️ Cut here — Answer Key for parent reference</p>
              <div className="grid grid-cols-4 gap-1 text-xs font-mono">
                {test.problems.map((p, i) => (
                  <span key={i}>{i + 1}) {p.answer}</span>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 0.5in; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .math-test-sheet { page-break-after: always; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .math-test-sheet:last-child { page-break-after: auto; }
        }
        @media screen {
          body { background: #f5f5f5; }
          .math-test-page { padding: 1rem; }
          .math-test-sheet { box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; margin-top: 1rem; margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  )
}
