'use client'

import { useState, useEffect } from 'react'
import {
  GraduationCap, CalendarCheck, BookOpen, ClipboardList, Mail, FileText,
  AlertTriangle, Plus, Trash2, Save, Check, Printer, ChevronDown, ChevronUp, X, Shield
} from 'lucide-react'
import SpecialEdTab from './SpecialEdTab'
import AbScheduleSetup from './AbScheduleSetup'
import PublicMakeupWork from './PublicMakeupWork'

const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const HOMESCHOOL = ['amos', 'ellie', 'wyatt', 'hannah']
const PUBLIC_SCHOOL = ['zoey', 'kaylee']
const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }
const SUBJECTS = ['Math', 'ELAR/Writing', 'Science', 'Social Studies', 'Reading', 'Life Skills']
const LIFE_CATS = ['Life Skills', 'Practical Arts', 'Character', 'Extracurricular']

type SubTab = 'overview' | 'attendance' | 'academic' | 'makeup' | 'excuse' | 'special_ed'

export default function TeacherDashboard() {
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [selectedKid, setSelectedKid] = useState('amos')
  const [data, setData] = useState<any>(null)
  const [kidData, setKidData] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)

  // Sick day modal
  const [showSickModal, setShowSickModal] = useState(false)
  const [sickKid, setSickKid] = useState('amos')
  const [sickDate, setSickDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
  const [sickSymptoms, setSickSymptoms] = useState('')
  const [sickSeverity, setSickSeverity] = useState('Mild')
  const [sickDoctor, setSickDoctor] = useState(false)
  const [sickResult, setSickResult] = useState<any>(null)

  // Subject edit
  const [editSubject, setEditSubject] = useState<string | null>(null)
  const [editLevel, setEditLevel] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAssessment, setEditAssessment] = useState('')

  // Life skill add
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [skillText, setSkillText] = useState('')
  const [skillCat, setSkillCat] = useState('Life Skills')

  // Excuse letters
  const [letters, setLetters] = useState<any[]>([])
  const [contact, setContact] = useState<any>(null)
  const [editLetter, setEditLetter] = useState<number | null>(null)
  const [letterBody, setLetterBody] = useState('')
  const [showContactEdit, setShowContactEdit] = useState(false)
  const [contactForm, setContactForm] = useState({ school_name: '', school_email: '', attendance_contact: '', teacher_name: '', teacher_email: '' })

  useEffect(() => {
    fetch('/api/parent/teacher?action=get_overview')
      .then(r => r.json())
      .then(d => { setData(d); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const loadKidData = (kid: string) => {
    setSelectedKid(kid)
    fetch(`/api/parent/teacher?action=get_kid_records&kid=${kid}`)
      .then(r => r.json())
      .then(d => setKidData(d))
      .catch(() => {})
  }

  const loadExcuseLetters = (kid: string) => {
    setSelectedKid(kid)
    fetch(`/api/parent/teacher?action=get_excuse_letters&kid=${kid}`)
      .then(r => r.json())
      .then(d => { setLetters(d.letters || []); setContact(d.contact); if (d.contact) setContactForm(d.contact) })
      .catch(() => {})
  }

  useEffect(() => {
    if (subTab === 'attendance' || subTab === 'academic') loadKidData(selectedKid)
    if (subTab === 'excuse') loadExcuseLetters(PUBLIC_SCHOOL.includes(selectedKid) ? selectedKid : 'zoey')
  }, [subTab])

  const logSickDay = async () => {
    const res = await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_sick_day', kid_name: sickKid, sick_date: sickDate, symptoms: sickSymptoms, severity: sickSeverity, doctor_visit: sickDoctor })
    }).then(r => r.json())
    setSickResult(res)
  }

  const saveSubject = async () => {
    if (!editSubject) return
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_subject_progress', kid_name: selectedKid, subject: editSubject, current_level: editLevel, notes: editNotes, last_assessment: editAssessment })
    })
    setEditSubject(null)
    loadKidData(selectedKid)
  }

  const addLifeSkill = async () => {
    if (!skillText.trim()) return
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_life_skill', kid_name: selectedKid, skill: skillText.trim(), category: skillCat })
    })
    setSkillText(''); setShowAddSkill(false)
    loadKidData(selectedKid)
  }

  const updateMakeup = async (id: number, status: string) => {
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_makeup_work', id, status })
    })
    if (subTab === 'overview') {
      fetch('/api/parent/teacher?action=get_overview').then(r => r.json()).then(d => setData(d))
    } else loadKidData(selectedKid)
  }

  const saveContact = async () => {
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_school_contact', kid_name: selectedKid, ...contactForm })
    })
    setShowContactEdit(false)
    setContact(contactForm)
  }

  const updateLetter = async (id: number, status: string) => {
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_excuse_letter', id, status, letter_body: editLetter === id ? letterBody : undefined, sent_date: status === 'sent' ? new Date().toLocaleDateString('en-CA') : undefined })
    })
    setEditLetter(null)
    loadExcuseLetters(selectedKid)
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const tabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'academic', label: 'Academic Records', icon: BookOpen },
    { id: 'makeup', label: 'Make-Up Work', icon: ClipboardList },
    { id: 'excuse', label: 'Excuse Letters', icon: Mail },
    { id: 'special_ed', label: 'Special Ed & 504', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Teacher's Dashboard</h1>
        <p className="text-emerald-200">Academic records, attendance, and homeschool management</p>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white border rounded-lg">
        <div className="flex border-b overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap ${subTab === t.id ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ─── Overview ─── */}
          {subTab === 'overview' && data && (
            <div className="space-y-4">
              {data.flaggedPatterns?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {data.flaggedPatterns.map((f: string, i: number) => (
                    <p key={i} className="text-sm text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {f}</p>
                  ))}
                </div>
              )}

              <h3 className="font-semibold text-sm text-gray-700">Attendance at a Glance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-gray-500"><th className="p-2">Kid</th><th className="p-2 text-right">Present</th><th className="p-2 text-right">Sick</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">%</th></tr></thead>
                  <tbody className="divide-y">{ALL_KIDS.map(k => {
                    const a = data.attendance?.[k] || {}
                    return (<tr key={k}><td className="p-2 font-medium">{KID_DISPLAY[k]}</td><td className="p-2 text-right text-green-600">{a.present || 0}</td><td className="p-2 text-right text-red-500">{a.sick || 0}</td><td className="p-2 text-right text-gray-500">{a.total || 0}</td><td className="p-2 text-right font-semibold">{a.pct || 0}%</td></tr>)
                  })}</tbody>
                </table>
              </div>

              {data.openMakeupWork?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mt-4 mb-2">Open Make-Up Work</h3>
                  {(data.openMakeupWork as any[]).map((m: any) => {
                    const overdue = m.due_date < today
                    return (
                      <div key={m.id} className={`flex items-center justify-between p-2 border rounded mb-1 text-sm ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
                        <span>{KID_DISPLAY[m.kid_name]} — {m.subject} (sick {m.sick_date})</span>
                        <div className="flex gap-1">
                          <button onClick={() => updateMakeup(m.id, 'completed')} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200">Done</button>
                          <button onClick={() => updateMakeup(m.id, 'excused')} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200">Excuse</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button onClick={() => setShowSickModal(true)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 flex items-center gap-1 mt-2">
                <Plus className="w-4 h-4" /> Log Sick Day
              </button>
            </div>
          )}

          {/* ─── Attendance ─── */}
          {subTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex gap-1 overflow-x-auto">
                {ALL_KIDS.map(k => (
                  <button key={k} onClick={() => loadKidData(k)} className={`px-3 py-1 rounded-full text-xs font-medium ${selectedKid === k ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-gray-100 text-gray-600'}`}>
                    {KID_DISPLAY[k]}
                  </button>
                ))}
              </div>

              {kidData && (
                <div>
                  {HOMESCHOOL.includes(selectedKid) && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">{(kidData.attendance || []).filter((a: any) => a.status === 'present').length} school days logged</p>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${Math.min(100, ((kidData.attendance || []).filter((a: any) => a.status === 'present').length / 180) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Target: 180 days</p>
                    </div>
                  )}

                  {PUBLIC_SCHOOL.includes(selectedKid) && (
                    <>
                      <p className="text-sm text-gray-500 mb-3">Attendance is tracked by the school. Sick days logged here.</p>
                      <AbScheduleSetup kid={selectedKid} />
                    </>
                  )}

                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setShowSickModal(true)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 flex items-center gap-1"><Plus className="w-3 h-3" /> Log Sick Day</button>
                  </div>

                  <div className="border rounded-lg divide-y text-sm">
                    {(kidData.attendance || []).slice(0, 30).map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="text-gray-600">{new Date(a.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'present' ? 'bg-green-100 text-green-700' : a.status === 'sick' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                      </div>
                    ))}
                    {(kidData.attendance || []).length === 0 && <div className="p-4 text-center text-gray-400">No attendance records yet</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Academic Records ─── */}
          {subTab === 'academic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 overflow-x-auto">
                  {HOMESCHOOL.map(k => (
                    <button key={k} onClick={() => loadKidData(k)} className={`px-3 py-1 rounded-full text-xs font-medium ${selectedKid === k ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-gray-100 text-gray-600'}`}>
                      {KID_DISPLAY[k]}
                    </button>
                  ))}
                </div>
                <button onClick={() => window.open(`/api/parent/teacher?action=get_transcript&kid=${selectedKid}`, '_blank')}
                  className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Transcript</button>
              </div>

              {kidData && (
                <>
                  <h3 className="font-semibold text-sm text-gray-700">Subject Progress</h3>
                  {SUBJECTS.map(subject => {
                    const prog = (kidData.subjects || []).find((s: any) => s.subject === subject)
                    const isEditing = editSubject === subject
                    return (
                      <div key={subject} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-gray-900">{subject}</span>
                          {!isEditing && <button onClick={() => { setEditSubject(subject); setEditLevel(prog?.current_level || ''); setEditNotes(prog?.notes || ''); setEditAssessment(prog?.last_assessment || '') }}
                            className="text-xs text-emerald-600">Edit</button>}
                        </div>
                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <input type="text" value={editLevel} onChange={e => setEditLevel(e.target.value)} placeholder="Level" className="w-full border rounded px-2 py-1 text-sm" />
                            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full border rounded px-2 py-1 text-sm resize-none" />
                            <input type="text" value={editAssessment} onChange={e => setEditAssessment(e.target.value)} placeholder="Last assessment" className="w-full border rounded px-2 py-1 text-sm" />
                            <div className="flex gap-2">
                              <button onClick={saveSubject} className="bg-emerald-500 text-white px-3 py-1 rounded text-xs"><Save className="w-3 h-3 inline mr-1" />Save</button>
                              <button onClick={() => setEditSubject(null)} className="text-gray-500 text-xs">Cancel</button>
                            </div>
                          </div>
                        ) : prog ? (
                          <div className="mt-1 text-sm text-gray-600">
                            {prog.current_level && <p>Level: {prog.current_level}</p>}
                            {prog.notes && <p className="text-gray-500">{prog.notes}</p>}
                            {prog.last_assessment && <p className="text-xs text-gray-400">Assessment: {prog.last_assessment}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">Not yet documented — tap Edit</p>
                        )}
                      </div>
                    )
                  })}

                  <h3 className="font-semibold text-sm text-gray-700 mt-4">Life Skills & Enrichment</h3>
                  <button onClick={() => setShowAddSkill(true)} className="text-xs text-emerald-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                  {showAddSkill && (
                    <div className="flex gap-2 mt-1">
                      <input type="text" value={skillText} onChange={e => setSkillText(e.target.value)} placeholder="Skill" className="flex-1 border rounded px-2 py-1 text-sm" />
                      <select value={skillCat} onChange={e => setSkillCat(e.target.value)} className="border rounded px-2 py-1 text-sm">
                        {LIFE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={addLifeSkill} className="bg-emerald-500 text-white px-2 py-1 rounded text-xs">Add</button>
                    </div>
                  )}
                  <div className="space-y-1 mt-2">
                    {(kidData.lifeSkills || []).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{s.skill} <span className="text-xs text-gray-400">({s.category})</span></span>
                        <span className="text-xs text-gray-400">{new Date(s.date_achieved).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Make-Up Work ─── */}
          {subTab === 'makeup' && data && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">Homeschool Make-Up Work</h3>
              {(data.openMakeupWork || []).filter((m: any) => HOMESCHOOL.includes(m.kid_name)).length === 0 && <p className="text-center text-gray-400 py-2 text-sm">No open homeschool make-up work</p>}
              {HOMESCHOOL.map(k => {
                const items = (data.openMakeupWork || []).filter((m: any) => m.kid_name === k)
                if (items.length === 0) return null
                return (
                  <div key={k}>
                    <h3 className="font-medium text-sm text-gray-700 mb-1">{KID_DISPLAY[k]} ({items.length})</h3>
                    {items.map((m: any) => {
                      const overdue = m.due_date < today
                      return (
                        <div key={m.id} className={`flex items-center justify-between p-2 border rounded mb-1 text-sm ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
                          <div>
                            <span className="font-medium">{m.subject}</span>
                            <span className="text-gray-400 text-xs ml-2">sick {m.sick_date} · due {m.due_date}</span>
                            {overdue && <span className="text-red-600 text-xs ml-1 font-medium">OVERDUE</span>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => updateMakeup(m.id, 'completed')} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Done</button>
                            <button onClick={() => updateMakeup(m.id, 'excused')} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excuse</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* Public School Makeup */}
              <PublicMakeupWork />
            </div>
          )}

          {/* ─── Special Ed & 504 ─── */}
          {subTab === 'special_ed' && <SpecialEdTab />}

          {/* ─── Excuse Letters ─── */}
          {subTab === 'excuse' && (
            <div className="space-y-4">
              <div className="flex gap-1">
                {PUBLIC_SCHOOL.map(k => (
                  <button key={k} onClick={() => loadExcuseLetters(k)} className={`px-3 py-1 rounded-full text-xs font-medium ${selectedKid === k ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-gray-100 text-gray-600'}`}>
                    {KID_DISPLAY[k]}
                  </button>
                ))}
              </div>
              {!PUBLIC_SCHOOL.includes(selectedKid) && <p className="text-sm text-gray-500">Select Zoey or Kaylee — excuse letters are for public school kids only.</p>}

              {PUBLIC_SCHOOL.includes(selectedKid) && (
                <>
                  {/* School Contact */}
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">School Contact</h4>
                      <button onClick={() => setShowContactEdit(!showContactEdit)} className="text-xs text-emerald-600">{contact?.school_name ? 'Edit' : 'Set Up'}</button>
                    </div>
                    {contact?.school_name && !showContactEdit && (
                      <p className="text-xs text-gray-500 mt-1">{contact.school_name} · {contact.attendance_contact}</p>
                    )}
                    {showContactEdit && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input type="text" value={contactForm.school_name} onChange={e => setContactForm(p => ({ ...p, school_name: e.target.value }))} placeholder="School name" className="border rounded px-2 py-1 text-sm" />
                        <input type="text" value={contactForm.school_email} onChange={e => setContactForm(p => ({ ...p, school_email: e.target.value }))} placeholder="School email" className="border rounded px-2 py-1 text-sm" />
                        <input type="text" value={contactForm.attendance_contact} onChange={e => setContactForm(p => ({ ...p, attendance_contact: e.target.value }))} placeholder="Attendance secretary" className="border rounded px-2 py-1 text-sm" />
                        <input type="text" value={contactForm.teacher_name} onChange={e => setContactForm(p => ({ ...p, teacher_name: e.target.value }))} placeholder="Teacher name" className="border rounded px-2 py-1 text-sm" />
                        <button onClick={saveContact} className="bg-emerald-500 text-white px-3 py-1 rounded text-xs col-span-2 w-fit">Save Contact</button>
                      </div>
                    )}
                  </div>

                  {/* Letters */}
                  {letters.map((l: any) => (
                    <div key={l.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sick Day: {new Date(l.sick_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${l.status === 'draft' ? 'bg-gray-100 text-gray-600' : l.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {l.status === 'draft' ? '📝 Draft' : l.status === 'sent' ? '📨 Sent' : '✅ Filed'}
                        </span>
                      </div>
                      {editLetter === l.id ? (
                        <div className="space-y-2">
                          <textarea value={letterBody} onChange={e => setLetterBody(e.target.value)} rows={8} className="w-full border rounded px-2 py-1 text-sm resize-none font-mono print:border-0" />
                          <div className="flex gap-2 print:hidden">
                            <button onClick={() => updateLetter(l.id, l.status)} className="bg-emerald-500 text-white px-3 py-1 rounded text-xs">Save</button>
                            <button onClick={() => window.print()} className="text-xs text-gray-600 flex items-center gap-1"><Printer className="w-3 h-3" /> Print</button>
                            {contact?.school_email && (
                              <a href={`mailto:${contact.school_email}?subject=${encodeURIComponent(`Absence Notification – ${selectedKid === 'zoey' ? 'Zoey Moses' : 'Kaylee Moses'} – ${l.sick_date}`)}&body=${encodeURIComponent(letterBody)}`}
                                className="text-xs text-blue-600 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</a>
                            )}
                            <button onClick={() => setEditLetter(null)} className="text-gray-400 text-xs">Close</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditLetter(l.id); setLetterBody(l.letter_body) }} className="text-xs text-emerald-600">Preview/Edit</button>
                          {l.status === 'draft' && <button onClick={() => updateLetter(l.id, 'sent')} className="text-xs text-blue-600">Mark Sent</button>}
                          {l.status === 'sent' && <button onClick={() => updateLetter(l.id, 'filed')} className="text-xs text-green-600">Mark Filed</button>}
                        </div>
                      )}
                    </div>
                  ))}
                  {letters.length === 0 && <p className="text-center text-gray-400 py-4">No excuse letters yet</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sick Day Modal */}
      {showSickModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => { setShowSickModal(false); setSickResult(null) }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            {sickResult ? (
              <div className="text-center">
                <p className="text-lg font-bold text-green-700 mb-2">Sick Day Logged</p>
                <p className="text-sm text-gray-600">✓ Attendance logged</p>
                {sickResult.makeup_created > 0 && <p className="text-sm text-gray-600">✓ {sickResult.makeup_created} make-up items created</p>}
                {sickResult.excuse_letter_created && <p className="text-sm text-gray-600">✓ Excuse letter drafted</p>}
                <button onClick={() => { setShowSickModal(false); setSickResult(null); fetch('/api/parent/teacher?action=get_overview').then(r=>r.json()).then(d=>setData(d)) }}
                  className="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm">Done</button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg mb-3">Log Sick Day</h3>
                <div className="space-y-3">
                  <select value={sickKid} onChange={e => setSickKid(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {ALL_KIDS.map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
                  </select>
                  <input type="date" value={sickDate} onChange={e => setSickDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <input type="text" value={sickSymptoms} onChange={e => setSickSymptoms(e.target.value)} placeholder="Symptoms" className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    {['Mild', 'Moderate', 'Severe'].map(s => (
                      <button key={s} onClick={() => setSickSeverity(s)} className={`px-3 py-1 rounded-full text-xs ${sickSeverity === s ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sickDoctor} onChange={e => setSickDoctor(e.target.checked)} className="rounded" /> Doctor visit</label>
                  <button onClick={logSickDay} className="w-full bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600">Log Sick Day</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
