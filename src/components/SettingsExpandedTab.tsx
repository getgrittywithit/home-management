'use client'

import { useState } from 'react'
import { Settings, User, Phone, Printer, Upload, CheckSquare, Shield, ShieldCheck } from 'lucide-react'
import AboutMeAdminTab from './AboutMeAdminTab'
import ContactsTab from './ContactsTab'
import PrintTab from './PrintTab'
import BulkDocumentProcessor from './BulkDocumentProcessor'
import TodoTab from './TodoTab'
import FamilyConfigAdmin from './FamilyConfigAdmin'
import PortalSettingsPanel from './PortalSettingsPanel'
import FamilyAccountsPanel from './parent/FamilyAccountsPanel'
import { getAllFamilyData } from '@/lib/familyConfig'

type SubTab = 'config' | 'accounts' | 'aboutme' | 'contacts' | 'print' | 'bulk-docs' | 'todos'

const familyData = getAllFamilyData()
const familyChildren = familyData.children.filter(Boolean)

export default function SettingsExpandedTab() {
  const [subTab, setSubTab] = useState<SubTab>('config')
  const [portalSettingsKid, setPortalSettingsKid] = useState<string | null>(null)

  const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'config', label: 'Family Config', icon: Settings },
    { id: 'accounts', label: 'Accounts', icon: ShieldCheck },
    { id: 'aboutme', label: 'About Me', icon: User },
    { id: 'contacts', label: 'Contacts', icon: Phone },
    { id: 'todos', label: 'Todos', icon: CheckSquare },
    { id: 'print', label: 'Print', icon: Printer },
    { id: 'bulk-docs', label: 'Bulk Docs', icon: Upload },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {subTab === 'config' && (
        <div className="space-y-6">
          {/* Portal Settings per kid */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-indigo-500" /> Kid Portal Settings
            </h3>
            <p className="text-sm text-gray-500 mb-4">Manage PINs, lockouts, and portal access for each kid.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {familyChildren.map(child => (
                <button
                  key={child.name}
                  onClick={() => setPortalSettingsKid(portalSettingsKid === child.name ? null : child.name)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                    portalSettingsKid === child.name
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {child.name}
                </button>
              ))}
            </div>
            {portalSettingsKid && (
              <PortalSettingsPanel kidName={portalSettingsKid} />
            )}
          </div>

          <FamilyConfigAdmin />
        </div>
      )}
      {subTab === 'accounts' && <FamilyAccountsPanel />}
      {subTab === 'aboutme' && <AboutMeAdminTab />}
      {subTab === 'contacts' && <ContactsTab />}
      {subTab === 'todos' && <TodoTab />}
      {subTab === 'print' && <PrintTab />}
      {subTab === 'bulk-docs' && <BulkDocumentProcessor />}
    </div>
  )
}
