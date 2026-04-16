'use client'

import { useState, useEffect } from 'react'
import {
  X, Send, Plus, Trash2, Loader2, UserPlus, Clock, MapPin,
  Users, Car, MessageCircle, Sparkles,
} from 'lucide-react'

const ACTIVITY_OPTIONS = [
  'Hang out / chill', 'Watch movies or TV', 'Play video games', 'Go swimming',
  'Go to a park', 'Go out to eat', 'Birthday party', 'Play outside',
  'Arts & crafts', 'Cook or bake', 'Board games / card games', 'Go shopping',
  'Go to the movies', 'Sports (practice/game)', 'Church event', 'Other',
]
const HOW_KNOW = ['School', 'Church', 'Neighborhood', 'Sports/Activity', 'Family friend', 'Online/Gaming', 'Other']
const VISIT_TYPES = [
  { id: 'hangout', label: 'Hangout (few hours)' },
  { id: 'sleepover', label: 'Sleepover (1 night)' },
  { id: 'weekend', label: 'Weekend stay (2-3 nights)' },
  { id: 'extended', label: 'Extended stay / Vacation (4+ days)' },
]
const LOCATION_TYPES = ["Friend's house", "Friend's apartment/condo", 'Restaurant / public place', 'Park / outdoors', 'Ranch / property', 'Out of town', 'Other']
const RIDE_OPTIONS = ['Yes — need Mom/Dad to drive', 'Their parent is picking me up', 'Ride with someone else', 'Walking/biking']
const EVENTS = ['No — just hanging out', 'Birthday party', 'Holiday gathering', 'Team event', 'School project', 'Church event', 'Other celebration']
const MARITAL = ['Yes', 'No', 'Not sure', 'Prefer not to say']

type Profile = { id: string; friend_name: string; [k: string]: any }
type Sibling = { name: string; age: string; gender: string }

interface Props {
  kidName: string
  onClose: () => void
  onSubmitted?: () => void
}

const today = () => new Date().toLocaleDateString('en-CA')

export default function FriendRequestForm({ kidName, onClose, onSubmitted }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  // Form state
  const [f, setF] = useState({
    friend_name: '', how_know: '', been_before: false,
    visit_type: 'hangout', start_date: today(), start_time: '', end_date: '', end_time: '', return_date: '',
    location_type: '', address: '', gate_code: '', has_wifi: true,
    parent1_name: '', parent1_phone: '', parent1_email: '',
    parent2_name: '', parent2_phone: '', parent2_email: '',
    parents_married: '', other_adults: '',
    has_siblings: '', siblings_present: '',
    plan_details: '', special_event: '', leaving_house: false, leaving_where: '',
    ride_there: '', ride_home: '', ride_other_who: '',
    travel_details: '', destination: '', notes: '',
  })
  const [activities, setActivities] = useState<string[]>([])
  const [siblings, setSiblings] = useState<Sibling[]>([])

  const set = (key: string, val: any) => setF(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    fetch(`/api/friends?action=list_profiles&kid_name=${kidName}`)
      .then(r => r.json())
      .then(d => setProfiles(d.profiles || []))
      .catch(() => {})
  }, [kidName])

  const loadProfile = (profileId: string) => {
    const p = profiles.find(pr => pr.id === profileId)
    if (!p) return
    setSelectedProfileId(profileId)
    setF(prev => ({
      ...prev,
      friend_name: p.friend_name || prev.friend_name,
      how_know: p.how_know || '', been_before: p.been_before ?? false,
      parent1_name: p.parent1_name || '', parent1_phone: p.parent1_phone || '', parent1_email: p.parent1_email || '',
      parent2_name: p.parent2_name || '', parent2_phone: p.parent2_phone || '', parent2_email: p.parent2_email || '',
      parents_married: p.parents_married || '', other_adults: p.other_adults || '',
      address: p.address || '', gate_code: p.gate_code || '', has_wifi: p.has_wifi ?? true,
    }))
    if (Array.isArray(p.siblings) && p.siblings.length > 0) {
      setSiblings(p.siblings)
      set('has_siblings', 'yes')
    }
  }

  const addSibling = () => { if (siblings.length < 8) setSiblings(s => [...s, { name: '', age: '', gender: '' }]) }
  const removeSibling = (i: number) => setSiblings(s => s.filter((_, idx) => idx !== i))
  const updateSibling = (i: number, key: string, val: string) => setSiblings(s => s.map((sib, idx) => idx === i ? { ...sib, [key]: val } : sib))

  const toggleActivity = (a: string) => setActivities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const handleSubmit = async () => {
    if (!f.friend_name.trim() || !f.start_date) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_request',
          kid_name: kidName,
          friend_profile_id: selectedProfileId || null,
          ...f,
          activities,
          siblings: siblings.filter(s => s.name.trim()),
        }),
      })
      if (res.ok) {
        setToast('Request sent!')
        setTimeout(() => { onSubmitted?.(); onClose() }, 1500)
      }
    } catch { /* silent */ }
    setSubmitting(false)
  }

  const showTimes = f.visit_type === 'hangout' || f.visit_type === 'sleepover'
  const showEndDate = f.visit_type !== 'hangout'
  const showReturnDate = f.visit_type === 'extended'
  const showRideOther = f.ride_there === 'Ride with someone else' || f.ride_home === 'Ride with someone else'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            Friend Request
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {toast && (
          <div className="mx-5 mt-3 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
            {toast}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Recent friends quick-pick */}
          {profiles.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Recent friends</label>
              <select value={selectedProfileId} onChange={e => loadProfile(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Pick a friend you've visited before...</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.friend_name}</option>)}
              </select>
            </div>
          )}

          {/* Section 1: Basics */}
          <Section title="The Basics" icon={<Sparkles className="w-4 h-4" />}>
            <Input label="Friend's name *" value={f.friend_name} onChange={v => set('friend_name', v)} placeholder="Jake S." />
            <Select label="How do you know them?" value={f.how_know} onChange={v => set('how_know', v)} options={HOW_KNOW} />
            <Toggle label="Been to their house before?" value={f.been_before} onChange={v => set('been_before', v)} />
          </Section>

          {/* Section 2: When & How Long */}
          <Section title="When & How Long" icon={<Clock className="w-4 h-4" />}>
            <Select label="Visit type *" value={f.visit_type} onChange={v => set('visit_type', v)} options={VISIT_TYPES.map(t => t.label)} values={VISIT_TYPES.map(t => t.id)} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Start date *" type="date" value={f.start_date} onChange={v => set('start_date', v)} />
              {showTimes && <Input label="Start time" type="time" value={f.start_time} onChange={v => set('start_time', v)} />}
            </div>
            {showEndDate && (
              <div className="grid grid-cols-2 gap-2">
                <Input label="End date" type="date" value={f.end_date} onChange={v => set('end_date', v)} />
                {f.visit_type === 'sleepover' && <Input label="Pick up by" type="time" value={f.end_time} onChange={v => set('end_time', v)} />}
              </div>
            )}
            {f.visit_type === 'hangout' && (
              <Input label="Pick up by *" type="time" value={f.end_time} onChange={v => set('end_time', v)} />
            )}
            {showReturnDate && (
              <>
                <Input label="Return date" type="date" value={f.return_date} onChange={v => set('return_date', v)} />
                <Input label="Where are you going?" value={f.destination} onChange={v => set('destination', v)} placeholder="San Antonio, Grandma's ranch, etc." />
                <Textarea label="Travel details" value={f.travel_details} onChange={v => set('travel_details', v)} placeholder="Driving? Flying? Who's driving?" />
              </>
            )}
          </Section>

          {/* Section 3: Where */}
          <Section title="Where" icon={<MapPin className="w-4 h-4" />}>
            <Select label="Where will you be? *" value={f.location_type} onChange={v => set('location_type', v)} options={LOCATION_TYPES} />
            <Input label="Address *" value={f.address} onChange={v => set('address', v)} placeholder="123 Oak St, Boerne TX" />
            <Input label="Gate code / Entry instructions" value={f.gate_code} onChange={v => set('gate_code', v)} placeholder="Gate #1234" />
            <Toggle label="Will you have wifi / phone connection?" value={f.has_wifi} onChange={v => set('has_wifi', v)} />
          </Section>

          {/* Section 4: Friend's Family */}
          <Section title="Friend's Family" icon={<Users className="w-4 h-4" />}>
            <Input label="Parent/Guardian 1 name *" value={f.parent1_name} onChange={v => set('parent1_name', v)} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Phone *" type="tel" value={f.parent1_phone} onChange={v => set('parent1_phone', v)} />
              <Input label="Email" type="email" value={f.parent1_email} onChange={v => set('parent1_email', v)} />
            </div>
            <Input label="Parent/Guardian 2 name" value={f.parent2_name} onChange={v => set('parent2_name', v)} placeholder="If applicable" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Parent 2 phone" type="tel" value={f.parent2_phone} onChange={v => set('parent2_phone', v)} />
              <Input label="Parent 2 email" type="email" value={f.parent2_email} onChange={v => set('parent2_email', v)} />
            </div>
            <Select label="Parents married / together?" value={f.parents_married} onChange={v => set('parents_married', v)} options={MARITAL} />
            <Input label="Other adults in the home?" value={f.other_adults} onChange={v => set('other_adults', v)} placeholder="Grandparent, roommate, etc." />
          </Section>

          {/* Section 5: Siblings */}
          <Section title="Siblings" icon={<Users className="w-4 h-4" />}>
            <Select label="Does your friend have siblings?" value={f.has_siblings} onChange={v => set('has_siblings', v)} options={['Yes', 'No', 'Not sure']} />
            {f.has_siblings === 'Yes' && (
              <>
                {siblings.map((s, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <Input label={i === 0 ? 'Name' : ''} value={s.name} onChange={v => updateSibling(i, 'name', v)} placeholder="Name" />
                    <Input label={i === 0 ? 'Age' : ''} value={s.age} onChange={v => updateSibling(i, 'age', v)} placeholder="Age" className="w-16" />
                    <select value={s.gender} onChange={e => updateSibling(i, 'gender', e.target.value)}
                      className="px-2 py-2 border rounded-lg text-sm bg-white h-[38px]">
                      <option value="">—</option><option value="boy">Boy</option><option value="girl">Girl</option><option value="other">Other</option>
                    </select>
                    <button onClick={() => removeSibling(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={addSibling} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  <Plus className="w-3 h-3" /> Add sibling
                </button>
                <Select label="Will siblings be there?" value={f.siblings_present} onChange={v => set('siblings_present', v)} options={['Yes', 'No', 'Not sure']} />
              </>
            )}
          </Section>

          {/* Section 6: The Plan */}
          <Section title="The Plan" icon={<MessageCircle className="w-4 h-4" />}>
            <label className="text-xs font-semibold text-gray-600 block mb-1">What are you planning to do? *</label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ACTIVITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggleActivity(a)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                    activities.includes(a)
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                  }`}>{a}</button>
              ))}
            </div>
            <Textarea label="Tell us more about your plans" value={f.plan_details} onChange={v => set('plan_details', v)} placeholder="Going to see a movie at Santikos, then pizza after" />
            <Select label="Is this a special event?" value={f.special_event} onChange={v => set('special_event', v)} options={EVENTS} />
            <Toggle label="Will you be leaving their house at any point?" value={f.leaving_house} onChange={v => set('leaving_house', v)} />
            {f.leaving_house && <Input label="Where?" value={f.leaving_where} onChange={v => set('leaving_where', v)} />}
          </Section>

          {/* Section 7: Transportation */}
          <Section title="Transportation" icon={<Car className="w-4 h-4" />}>
            <Select label="Need a ride there? *" value={f.ride_there} onChange={v => set('ride_there', v)} options={RIDE_OPTIONS} />
            <Select label="Need a ride home? *" value={f.ride_home} onChange={v => set('ride_home', v)} options={RIDE_OPTIONS} />
            {showRideOther && <Input label="Who's giving the ride?" value={f.ride_other_who} onChange={v => set('ride_other_who', v)} />}
          </Section>

          {/* Section 8: Notes */}
          <Section title="Anything Else" icon={<MessageCircle className="w-4 h-4" />}>
            <Textarea label="Anything else Mom & Dad should know?" value={f.notes} onChange={v => set('notes', v)} placeholder="Allergies, house rules, special instructions..." />
          </Section>
        </div>

        {/* Submit */}
        <div className="px-5 py-4 border-t shrink-0 flex gap-2">
          <button onClick={onClose} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !f.friend_name.trim() || !f.start_date}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Request
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-2">{icon} {title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Input({ label, value, onChange, type, placeholder, className }: { label?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="text-xs font-semibold text-gray-600 block mb-0.5">{label}</label>}
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none" />
    </div>
  )
}

function Select({ label, value, onChange, options, values }: { label: string; value: string; onChange: (v: string) => void; options: string[]; values?: string[] }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-0.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
        <option value="">Select...</option>
        {options.map((o, i) => <option key={o} value={values ? values[i] : o}>{o}</option>)}
      </select>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
      {label}
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-0.5">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none" />
    </div>
  )
}
