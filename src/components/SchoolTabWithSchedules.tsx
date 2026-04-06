'use client'

import { useState, useEffect } from 'react'
import {
  GraduationCap, Home as HomeIcon, School, Calendar, X,
  ClipboardList, Users, FileText, Heart, History, BarChart3,
  CheckCircle, AlertTriangle, Clock
} from 'lucide-react'
import ScheduleDisplay from './ScheduleDisplay'
import SpecialEdTab from './SpecialEdTab'
import SchoolContactCards from './SchoolContactCards'
import SchoolDocuments from './SchoolDocuments'
import KidProgressDashboard from './school/KidProgressDashboard'
import { getAllFamilyData } from '@/lib/familyConfig'

const ALL_KIDS = [
  { name: 'amos', display: 'Amos', grade: '10th', type: 'home', plan: 'IEP', color: 'bg-blue-500' },
  { name: 'zoey', display: 'Zoey', grade: '9th', type: 'public', plan: '504', color: 'bg-purple-500' },
  { name: 'kaylee', display: 'Kaylee', grade: '7th', type: 'public', plan: 'IEP', color: 'bg-pink-500' },
  { name: 'ellie', display: 'Ellie', grade: '6th', type: 'home', plan: '504', color: 'bg-emerald-500' },
  { name: 'wyatt', display: 'Wyatt', grade: '4th', type: 'home', plan: 'IEP', color: 'bg-orange-500' },
  { name: 'hannah', display: 'Hannah', grade: '3rd', type: 'home', plan: '504', color: 'bg-rose-500' },
]

type DetailTab = 'overview' | 'iep-504' | 'contacts' | 'documents' | 'attendance' | 'progress'

interface SchoolTabWithSchedulesProps {
  children?: any[]
}

export default function SchoolTabWithSchedules({ children: _children }: SchoolTabWithSchedulesProps) {
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [kidStatuses, setKidStatuses] = useState<Record<string, { label: string; color: string; icon: string }>>({})

  const familyData = getAllFamilyData()
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })

  // Load quick status for each kid
  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    const statuses: Record<string, { label: string; color: string; icon: string }> = {}
    for (const kid of ALL_KIDS) {
      try {
        const goalsRes = await fetch(`/api/iep-goals?kid_name=${kid.name}`).then(r => r.json()).catch(() => ({}))
        const goals = goalsRes.goals || []
        const activeGoals = goals.filter((g: any) => g.status === 'in_progress' && (g.goal_type || 'official') === 'official')

        if (activeGoals.length > 0) {
          statuses[kid.name] = { label: `${activeGoals.length} Goals`, color: 'text-blue-600', icon: '\uD83D\uDCCB' }
        } else {
          statuses[kid.name] = { label: 'On Track', color: 'text-green-600', icon: '\u2705' }
        }
      } catch {
        statuses[kid.name] = { label: 'No Data', color: 'text-gray-400', icon: '\u2796' }
      }
    }
    setKidStatuses(statuses)
  }

  const DETAIL_TABS: { id: DetailTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: ClipboardList },
    { id: 'iep-504', label: 'IEP / 504', icon: FileText },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
  ]

  const selectedKidData = ALL_KIDS.find(k => k.name === selectedKid)
  const publicSchoolKids = familyData.children?.filter((c: any) => c.school?.name !== 'Homeschool') || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-6 h-6" /> School Management
            </h1>
            <p className="text-blue-100 mt-1">{todayStr}</p>
            <p className="text-blue-200 text-sm">Homeschool + public school records &amp; progress</p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{familyData.schoolYear || '2025-2026'}</span>
          </div>
        </div>
      </div>

      {/* Kid Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_KIDS.map(kid => {
          const isSelected = selectedKid === kid.name
          const status = kidStatuses[kid.name]
          return (
            <button key={kid.name} onClick={() => { setSelectedKid(isSelected ? null : kid.name); setDetailTab('overview') }}
              className={`bg-white rounded-lg border-2 p-3 text-left transition hover:shadow-md ${isSelected ? 'border-indigo-400 shadow-md' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-full ${kid.color} text-white flex items-center justify-center text-sm font-bold`}>
                  {kid.display[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{kid.display}</p>
                  <p className="text-[10px] text-gray-500">{kid.grade}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${kid.type === 'home' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {kid.type === 'home' ? 'Home' : 'Public'}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{kid.plan}</span>
              </div>
              {status && (
                <p className={`text-[10px] mt-1.5 ${status.color} font-medium`}>{status.icon} {status.label}</p>
              )}
            </button>
          )
        })}
      </div>

      {/* Per-Kid Profile Panel */}
      {selectedKid && selectedKidData && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${selectedKidData.color} text-white flex items-center justify-center text-xs font-bold`}>
                {selectedKidData.display[0]}
              </div>
              <span className="font-semibold text-gray-900">{selectedKidData.display}</span>
              <span className="text-xs text-gray-500">{selectedKidData.grade} &bull; {selectedKidData.type === 'home' ? 'Homeschool' : 'Public School'}</span>
            </div>
            <button onClick={() => setSelectedKid(null)} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Detail tabs */}
          <div className="flex border-b overflow-x-auto">
            {DETAIL_TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setDetailTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition ${
                    detailTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {detailTab === 'overview' && (
              <KidOverview kidName={selectedKid} kidData={selectedKidData} />
            )}
            {detailTab === 'iep-504' && (
              <SpecialEdTab preSelectedKid={selectedKid} embedded />
            )}
            {detailTab === 'contacts' && (
              <SchoolContactCards kid={selectedKid} />
            )}
            {detailTab === 'documents' && (
              <SchoolDocuments kid={selectedKid} />
            )}
            {detailTab === 'attendance' && (
              <KidAttendanceView kidName={selectedKid} />
            )}
            {detailTab === 'progress' && (
              <KidProgressDashboard kidName={selectedKid} />
            )}
          </div>
        </div>
      )}

      {/* Public School Schedules (when no kid selected) */}
      {!selectedKid && publicSchoolKids.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <School className="w-4 h-4 text-blue-500" /> Public School Schedules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicSchoolKids.map((child: any) => (
              <button key={child.id} onClick={() => { setSelectedKid(child.name.toLowerCase()); setDetailTab('overview') }}
                className="text-left border rounded-lg p-4 hover:shadow-md transition">
                <p className="font-medium text-gray-900">{child.fullName || child.name}</p>
                <p className="text-sm text-gray-500">{child.grade} &bull; {child.school?.name || 'Public School'}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Kid Overview (quick snapshot) ──
function KidOverview({ kidName, kidData }: { kidName: string; kidData: any }) {
  const [planInfo, setPlanInfo] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/parent/teacher?action=get_special_ed_plans&kid=${kidName}`).then(r => r.json())
      .then(d => setPlanInfo((d.plans || [])[0] || null)).catch(() => {})
  }, [kidName])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500">Grade</p>
          <p className="text-lg font-bold text-gray-900">{kidData.grade}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500">School Type</p>
          <p className="text-lg font-bold text-gray-900">{kidData.type === 'home' ? 'Homeschool' : 'Public School'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500">Plan</p>
          <p className="text-lg font-bold text-gray-900">{kidData.plan}</p>
          {planInfo?.status && <p className="text-xs text-green-600 capitalize">{planInfo.status}</p>}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500">Next Meeting</p>
          <p className="text-sm font-medium text-gray-900">{planInfo?.next_meeting_date ? new Date(planInfo.next_meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not scheduled'}</p>
        </div>
      </div>
      {planInfo?.notes && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Plan Notes</p>
          <p className="text-sm text-blue-800 line-clamp-3">{planInfo.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Kid Attendance View ──
function KidAttendanceView({ kidName }: { kidName: string }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/parent/teacher?action=get_attendance&kid=${kidName}`)
      .then(r => r.json()).then(d => setRecords(d.records || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [kidName])

  if (loading) return <div className="text-center py-4 text-gray-400">Loading...</div>

  const summary: Record<string, number> = {}
  records.forEach((r: any) => { summary[r.status] = (summary[r.status] || 0) + 1 })
  const total = records.length
  const present = summary['present'] || 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-700">{present}</p>
          <p className="text-xs text-green-600">Present</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-700">{summary['absent'] || 0}</p>
          <p className="text-xs text-red-600">Absent</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-700">{summary['sick'] || 0}</p>
          <p className="text-xs text-amber-600">Sick</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{total > 0 ? Math.round((present / total) * 100) : '--'}%</p>
          <p className="text-xs text-blue-600">Rate</p>
        </div>
      </div>
      {records.length === 0 && <p className="text-sm text-gray-400 text-center">No attendance records yet.</p>}
      {records.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {records.slice(0, 20).map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-100">
              <span className="text-gray-600">{new Date(r.attendance_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'sick' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
