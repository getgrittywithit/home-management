'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Printer, ShieldAlert, Pill, AlertTriangle, Phone, ClipboardList, User } from 'lucide-react'
import { getFamilyMemberData } from '@/lib/familyConfig'

// ============================================================================
// Per-kid emergency medical card (D74 EMERGENCY-1)
// Offline-accessible via the existing service worker cache. Combines:
//   • familyConfig birth data (DOB, age, grade)
//   • hardcoded medical profile facts from CLAUDE.md (conditions, allergies)
//   • live /api/health data (medications, insurance, providers)
//   • static emergency contacts (Lola, Levi)
// ============================================================================

interface MedicalProfile {
  conditions: string[]
  allergies: string[]
  sensoryNotes?: string
  bloodType?: string
}

// Canonical medical facts from CLAUDE.md Family table. Hardcoded here so the
// emergency card is available even when the app can't reach the DB.
const MEDICAL_PROFILES: Record<string, MedicalProfile> = {
  amos: {
    conditions: [
      'ADHD Combined (F90.2)',
      'Autism Spectrum Disorder (Level 1, Mild)',
      'Dyslexia',
      'Dyscalculia',
      'Speech Delay',
      'Auditory Processing Disorder (APD)',
      'Bilateral hearing loss (high-frequency)',
      'Color vision deficiency',
    ],
    allergies: [],
    sensoryNotes: 'Does NOT wear glasses. APD — speak clearly, reduce background noise.',
  },
  zoey: {
    conditions: [
      'Unspecified mood disorder (Clarity CGC, Apr 2024)',
      '504 plan (Emotional Disability)',
      'History of SI w/ plan/intent + SIB (stabilized)',
    ],
    allergies: [],
    sensoryNotes: 'Auditory sensitivity (bell panic). Touch sensitivity. Escitalopram 20mg / Hydroxyzine 10mg PRN / Quetiapine 25mg at last discharge.',
  },
  kaylee: {
    conditions: [
      'Intellectual Disability (school IEP)',
      'Speech Delay',
      'Suspected dyslexia (not formally qualified)',
    ],
    allergies: [],
  },
  ellie: {
    conditions: [
      'Possible ADHD (undiagnosed)',
      '504 plan',
    ],
    allergies: [],
  },
  wyatt: {
    conditions: [
      'Severe ADHD',
      'Sleep issues',
      'Color vision deficiency',
      'Speech IEP (working on /r/ sounds)',
    ],
    allergies: [],
    sensoryNotes: 'Focalin AM, Clonidine PM. Struggles with self-regulation.',
  },
  hannah: {
    conditions: [
      '504 plan',
      'Speech IEP (/r/ sounds + grammar)',
      'Auditory sensitivity to loud noises',
    ],
    allergies: [],
    sensoryNotes: 'Uses ear protectors for loud noises.',
  },
}

const EMERGENCY_CONTACTS = [
  { role: 'Mom (Lola Moses)', phone: '(512) 962-3957', email: 'mosesfamily2008@gmail.com' },
  { role: 'Dad (Levi Moses)', phone: '', email: 'mosestx2008@gmail.com' },
]

const INSURANCE_FALLBACK = {
  name: 'TX Benefits Medicaid',
  type: 'HMO',
  phone: '2-1-1 (Texas Health & Human Services)',
}

interface HealthData {
  insurancePlan: any
  medications: any[]
  providers: any[]
  healthProfiles: any[]
}

function ageFromDate(d: Date): number {
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
}

export default function EmergencyCard({ params }: { params: Promise<{ kidName: string }> }) {
  const { kidName } = use(params)
  const kidKey = kidName.toLowerCase()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt] = useState(new Date())

  const member = getFamilyMemberData(kidKey)
  const profile = MEDICAL_PROFILES[kidKey] || { conditions: [], allergies: [] }

  useEffect(() => {
    fetch('/api/health?group=kids')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false))
  }, [])

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Emergency card for "{kidName}" not found.</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  // Kid's medications (filter by kid name match if column exists; otherwise show all active)
  const kidMedications = (health?.medications || []).filter((m: any) => {
    if (!m.is_active) return false
    const name = (m.for_member || m.family_member_name || '').toLowerCase()
    return !name || name === kidKey
  })

  // Kid's primary provider (if one is tagged)
  const kidProviders = (health?.providers || []).filter((p: any) => {
    const name = (p.kid_name || '').toLowerCase()
    return name === kidKey
  }).slice(0, 2)

  const insurance = health?.insurancePlan || INSURANCE_FALLBACK
  const age = member.birthDate ? ageFromDate(new Date(member.birthDate)) : member.age
  const dobStr = member.birthDate ? new Date(member.birthDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Unknown'

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Top nav (hidden on print) */}
      <div className="bg-red-600 text-white print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/kid/${kidKey}`} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
            <ChevronLeft className="w-4 h-4" /> Back to portal
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShieldAlert className="w-4 h-4" /> Emergency Info
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 print:p-0">
        <div className="bg-white rounded-2xl border-4 border-red-500 shadow-xl overflow-hidden print:shadow-none print:border-2 print:rounded-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-4 print:bg-red-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-semibold opacity-80">Emergency Medical Info</div>
                <h1 className="text-2xl font-bold mt-0.5">{titleCase(kidKey)} Moses</h1>
              </div>
              <ShieldAlert className="w-10 h-10 opacity-80" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-semibold">
              <div><span className="opacity-70">DOB</span>: {dobStr}</div>
              <div><span className="opacity-70">Age</span>: {age}</div>
              <div><span className="opacity-70">Grade</span>: {member.grade}</div>
              {profile.bloodType && <div><span className="opacity-70">Blood</span>: {profile.bloodType}</div>}
            </div>
          </div>

          {/* Conditions */}
          <Section icon={User} title="Conditions & Diagnoses" color="text-purple-700">
            {profile.conditions.length > 0 ? (
              <ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">
                {profile.conditions.map((c) => <li key={c}>{c}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">None listed</p>
            )}
            {profile.sensoryNotes && (
              <p className="mt-2 text-xs text-gray-600 bg-amber-50 border-l-4 border-amber-400 px-2 py-1 rounded">
                <span className="font-semibold text-amber-800">Note:</span> {profile.sensoryNotes}
              </p>
            )}
          </Section>

          {/* Medications */}
          <Section icon={Pill} title="Medications" color="text-blue-700">
            {loading ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : kidMedications.length > 0 ? (
              <ul className="text-sm text-gray-800 space-y-1">
                {kidMedications.map((m: any) => (
                  <li key={m.id} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <div className="flex-1">
                      <span className="font-semibold">{m.medication_name}</span>
                      {m.dosage && <span> — {m.dosage}</span>}
                      {m.frequency && <span className="text-gray-500"> · {m.frequency}</span>}
                      {m.purpose && <div className="text-xs text-gray-500">{m.purpose}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">None on file</p>
            )}
          </Section>

          {/* Allergies */}
          <Section icon={AlertTriangle} title="Allergies" color="text-amber-700">
            {profile.allergies.length > 0 ? (
              <ul className="text-sm text-gray-800 list-disc pl-5 space-y-0.5">
                {profile.allergies.map((a) => <li key={a}>{a}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">None reported</p>
            )}
          </Section>

          {/* Insurance */}
          <Section icon={ClipboardList} title="Insurance" color="text-green-700">
            <div className="text-sm text-gray-800 space-y-0.5">
              <div className="font-semibold">{insurance.provider_name || insurance.name || 'TX Benefits Medicaid'}</div>
              {insurance.plan_type && <div className="text-xs text-gray-500">{insurance.plan_type}</div>}
              {insurance.member_id && <div className="text-xs">Member ID: <span className="font-mono">{insurance.member_id}</span></div>}
              {insurance.group_number && <div className="text-xs">Group: <span className="font-mono">{insurance.group_number}</span></div>}
              {insurance.phone && <div className="text-xs">Phone: {insurance.phone}</div>}
              {!insurance.provider_name && !insurance.name && (
                <div className="text-xs text-gray-500">2-1-1 (Texas Health & Human Services)</div>
              )}
            </div>
          </Section>

          {/* Providers */}
          {kidProviders.length > 0 && (
            <Section icon={ClipboardList} title="Providers" color="text-indigo-700">
              <ul className="text-sm text-gray-800 space-y-1">
                {kidProviders.map((p: any) => (
                  <li key={p.id}>
                    <span className="font-semibold">{p.name}</span>
                    {p.specialty && <span className="text-gray-500"> — {p.specialty}</span>}
                    {p.phone && <div className="text-xs text-gray-500">{p.phone}</div>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Emergency Contacts */}
          <Section icon={Phone} title="Emergency Contacts" color="text-red-700">
            <ul className="text-sm text-gray-800 space-y-1.5">
              {EMERGENCY_CONTACTS.map((c) => (
                <li key={c.role} className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-semibold">{c.role}</div>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^0-9+]/g, '')}`} className="text-xs text-blue-600 hover:underline">
                        {c.phone}
                      </a>
                    )}
                    {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500 flex items-center justify-between print:bg-white">
            <span>🔒 Available offline · Family Hub</span>
            <span>Last updated {updatedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Print styles — wallet-card-ish layout */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5in; }
        }
      `}</style>
    </div>
  )
}

function Section({
  icon: Icon, title, color, children,
}: {
  icon: any; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="px-5 py-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <h2 className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</h2>
      </div>
      {children}
    </div>
  )
}
