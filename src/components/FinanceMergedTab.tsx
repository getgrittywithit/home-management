'use client'

import { useState } from 'react'
import { DollarSign, Wallet, PieChart } from 'lucide-react'
import FinanceTab from './FinanceTab'
import MoeMoneyTab from './MoeMoneyTab'
import BudgetOverviewTab from './finance/BudgetOverviewTab'

type SubTab = 'budget' | 'finance' | 'moe-money'

export default function FinanceMergedTab() {
  const [subTab, setSubTab] = useState<SubTab>('budget')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setSubTab('budget')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            subTab === 'budget' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart className="w-4 h-4" /> Budget
        </button>
        <button
          onClick={() => setSubTab('finance')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            subTab === 'finance' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Finance
        </button>
        <button
          onClick={() => setSubTab('moe-money')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            subTab === 'moe-money' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wallet className="w-4 h-4" /> Moe-Money
        </button>
      </div>

      {subTab === 'budget' && <BudgetOverviewTab />}
      {subTab === 'finance' && <FinanceTab />}
      {subTab === 'moe-money' && <MoeMoneyTab />}
    </div>
  )
}
