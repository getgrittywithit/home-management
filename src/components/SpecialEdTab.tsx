'use client'

import { useState, useEffect } from 'react'
import { GraduationCap, Calendar, Check, Plus, ChevronDown, ChevronUp, Trash2, AlertTriangle } from 'lucide-react'
import SchoolContactCards from './SchoolContactCards'
import SchoolDocuments from './SchoolDocuments'

const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']
const KID_DISPLAY: Record<string, string> = { amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah' }
const PLAN_COLORS: Record<string, string> = { '504': 'border-purple-300 bg-purple-50', 'IEP': 'border-blue-300 bg-blue-50', 'Speech': 'border-teal-300 bg-teal-50' }

export default function SpecialEdTab() {
  const [selectedKid, setSelectedKid] = useState('zoey')
  const [plans, setPlans] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAccom, setShowAccom] = useState(true)
  const [showGoals, setShowGoals] = useState(true)
  const [showMeetings, setShowMeetings] = useState(true)
  const [newAccom, setNewAccom] = useState('')
  const [newGoalSubject, setNewGoalSubject] = useState('')
  const [newGoalText, setNewGoalText] = useState('')
  const [showLogMeeting, setShowLogMeeting] = useState(false)
  const [meetForm, setMeetForm] = useState({ meeting_date: '', meeting_time: '', meeting_type: 'annual_review', location: '', attendees: '', outcome: '', notes: '' })

  const loadData = (kid: string) => {
    setSelectedKid(kid)
    Promise.all([
      fetch(`/api/parent/teacher?action=get_special_ed_plans&kid=${kid}`).then(r => r.json()).catch(() => ({ plans: [] })),
      fetch(`/api/parent/teacher?action=get_special_ed_meetings&kid=${kid}`).then(r => r.json()).catch(() => ({ meetings: [] })),
    ]).then(([planData, meetData]) => {
      setPlans(planData.plans || [])
      setMeetings(meetData.meetings || [])
      setLoaded(true)
    })
  }

  useEffect(() => { loadData('zoey') }, [])

  const plan = plans[0] // primary active plan

  const confirmMeeting = async (planId: number) => {
    await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_meeting', plan_id: planId }) })
    loadData(selectedKid)
  }

  const addAccommodation = async () => {
    if (!newAccom.trim() || !plan) return
    const accom = [...(plan.accommodations || []), { text: newAccom.trim() }]
    await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_special_ed_plan', id: plan.id, accommodations: accom }) })
    setNewAccom('')
    loadData(selectedKid)
  }

  const removeAccommodation = async (index: number) => {
    if (!plan) return
    const accom = [...(plan.accommodations || [])]; accom.splice(index, 1)
    await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_special_ed_plan', id: plan.id, accommodations: accom }) })
    loadData(selectedKid)
  }

  const addGoal = async () => {
    if (!newGoalSubject.trim() || !newGoalText.trim() || !plan) return
    const goals = [...(plan.goals || []), { subject: newGoalSubject.trim(), goal: newGoalText.trim() }]
    await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_special_ed_plan', id: plan.id, goals }) })
    setNewGoalSubject(''); setNewGoalText('')
    loadData(selectedKid)
  }

  const logMeeting = async () => {
    if (!meetForm.meeting_date) return
    await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_special_ed_meeting', kid: selectedKid, plan_id: plan?.id, ...meetForm }) })
    setShowLogMeeting(false); setMeetForm({ meeting_date: '', meeting_time: '', meeting_type: 'annual_review', location: '', attendees: '', outcome: '', notes: '' })
    loadData(selectedKid)
  }

  const addToCalendar = async () => {
    if (!plan?.next_meeting_date) return
    try {
      await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          event_data: {
            title: `${plan.plan_type} Meeting — ${KID_DISPLAY[selectedKid]}`,
            event_type: 'school',
            start_time: `${plan.next_meeting_date}T${plan.next_meeting_time?.replace(/\s*(AM|PM)/i, (m: string, ap: string) => { const [h, min] = m.replace(ap, '').trim().split(':'); return '' }) || '13:50'}:00`,
            end_time: plan.next_meeting_date + 'T15:00:00',
            location: plan.next_meeting_location || '',
          }
        }) })
    } catch { /* ignore */ }
  }

  if (!loaded) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" /></div>

  return (
    <div className="space-y-4">
      {/* Kid selector — public school only */}
      <div className="flex gap-1">
        {ALL_KIDS.map(k => (
          <button key={k} onClick={() => loadData(k)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${selectedKid === k ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-gray-100 text-gray-600'}`}>
            {KID_DISPLAY[k]}
          </button>
        ))}
      </div>

      {/* Plan Overview */}
      {plan ? (
        <div className={`border-2 rounded-lg p-4 ${PLAN_COLORS[plan.plan_type] || 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${plan.plan_type === '504' ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'}`}>
                {plan.plan_type}
              </span>
              <span className="text-xs text-gray-500">Status: {plan.status}</span>
            </div>
            {plan.review_date && <span className="text-xs text-gray-500">Last review: {new Date(plan.review_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
          </div>
          {plan.notes && <p className="text-sm text-gray-600 mt-2">{plan.notes}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No active plan on file for {KID_DISPLAY[selectedKid]}.</p>
      )}

      {/* Upcoming Meeting Banner */}
      {plan?.next_meeting_date && new Date(plan.next_meeting_date) >= new Date() && (
        <div className={`border rounded-lg p-4 ${plan.meeting_confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-2">
            {!plan.meeting_confirmed && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="font-medium text-sm">
                Upcoming Meeting — {new Date(plan.next_meeting_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {plan.next_meeting_time && ` at ${plan.next_meeting_time}`}
              </p>
              {plan.next_meeting_location && <p className="text-xs text-gray-600 mt-0.5">{plan.next_meeting_location}</p>}
              <div className="flex gap-2 mt-2">
                {!plan.meeting_confirmed && (
                  <button onClick={() => confirmMeeting(plan.id)} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mark Confirmed
                  </button>
                )}
                <button onClick={addToCalendar} className="text-xs bg-white border px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Add to Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accommodations */}
      <div className="border rounded-lg">
        <button onClick={() => setShowAccom(!showAccom)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
          <span className="font-medium text-sm">Accommodations</span>
          {showAccom ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showAccom && (
          <div className="px-3 pb-3 space-y-1">
            {(plan?.accommodations || []).map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-700">{a.text}</span>
                <button onClick={() => removeAccommodation(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            {(plan?.accommodations || []).length === 0 && <p className="text-xs text-gray-400">No accommodations listed yet</p>}
            <div className="flex gap-2 mt-2">
              <input type="text" value={newAccom} onChange={e => setNewAccom(e.target.value)} placeholder="Add accommodation..." className="flex-1 text-xs border rounded px-2 py-1"
                onKeyDown={e => e.key === 'Enter' && addAccommodation()} />
              <button onClick={addAccommodation} className="text-xs text-purple-600 hover:text-purple-800"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="border rounded-lg">
        <button onClick={() => setShowGoals(!showGoals)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
          <span className="font-medium text-sm">Goals</span>
          {showGoals ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showGoals && (
          <div className="px-3 pb-3 space-y-1">
            {(plan?.goals || []).map((g: any, i: number) => (
              <div key={i} className="text-sm py-1">
                <span className="font-medium text-gray-700">{g.subject}:</span> <span className="text-gray-600">{g.goal}</span>
              </div>
            ))}
            {(plan?.goals || []).length === 0 && <p className="text-xs text-gray-400">No goals listed yet</p>}
            <div className="flex gap-2 mt-2">
              <input type="text" value={newGoalSubject} onChange={e => setNewGoalSubject(e.target.value)} placeholder="Subject" className="w-24 text-xs border rounded px-2 py-1" />
              <input type="text" value={newGoalText} onChange={e => setNewGoalText(e.target.value)} placeholder="Goal description" className="flex-1 text-xs border rounded px-2 py-1"
                onKeyDown={e => e.key === 'Enter' && addGoal()} />
              <button onClick={addGoal} className="text-xs text-purple-600"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Meeting History */}
      <div className="border rounded-lg">
        <button onClick={() => setShowMeetings(!showMeetings)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
          <span className="font-medium text-sm">Meeting History</span>
          {showMeetings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showMeetings && (
          <div className="px-3 pb-3">
            <button onClick={() => setShowLogMeeting(true)} className="text-xs text-purple-600 flex items-center gap-1 mb-2"><Plus className="w-3 h-3" /> Log Meeting</button>
            {showLogMeeting && (
              <div className="bg-gray-50 rounded p-3 space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={meetForm.meeting_date} onChange={e => setMeetForm(p => ({ ...p, meeting_date: e.target.value }))} className="text-xs border rounded px-2 py-1" />
                  <input type="text" value={meetForm.meeting_time} onChange={e => setMeetForm(p => ({ ...p, meeting_time: e.target.value }))} placeholder="Time" className="text-xs border rounded px-2 py-1" />
                </div>
                <select value={meetForm.meeting_type} onChange={e => setMeetForm(p => ({ ...p, meeting_type: e.target.value }))} className="w-full text-xs border rounded px-2 py-1">
                  <option value="annual_review">Annual Review</option><option value="initial">Initial</option>
                  <option value="amendment">Amendment</option><option value="parent_request">Parent Request</option>
                </select>
                <input type="text" value={meetForm.location} onChange={e => setMeetForm(p => ({ ...p, location: e.target.value }))} placeholder="Location" className="w-full text-xs border rounded px-2 py-1" />
                <input type="text" value={meetForm.outcome} onChange={e => setMeetForm(p => ({ ...p, outcome: e.target.value }))} placeholder="Outcome" className="w-full text-xs border rounded px-2 py-1" />
                <textarea value={meetForm.notes} onChange={e => setMeetForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} className="w-full text-xs border rounded px-2 py-1 resize-none" />
                <div className="flex gap-2">
                  <button onClick={logMeeting} className="text-xs bg-purple-600 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => setShowLogMeeting(false)} className="text-xs text-gray-500">Cancel</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {meetings.map((m: any) => (
                <div key={m.id} className="text-sm border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{new Date(m.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-xs text-gray-400">{(m.meeting_type || '').replace(/_/g, ' ')}</span>
                  </div>
                  {m.outcome && <p className="text-xs text-gray-600">{m.outcome}</p>}
                  {m.notes && <p className="text-xs text-gray-400">{m.notes}</p>}
                </div>
              ))}
              {meetings.length === 0 && <p className="text-xs text-gray-400">No meetings logged yet</p>}
            </div>
          </div>
        )}
      </div>

      {/* School Contacts */}
      <SchoolContactCards kid={selectedKid} />

      {/* Documents */}
      <SchoolDocuments kid={selectedKid} filterTypes={['IEP', '504_Plan', 'ARD_Notes', 'Speech_Report']} />
    </div>
  )
}
