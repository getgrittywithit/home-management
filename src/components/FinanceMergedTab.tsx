'use client'

import { useState } from 'react'
import { DollarSign, Wallet, PieChart, CreditCard, Wrench } from 'lucide-react'
import FinanceTab from './FinanceTab'
import MoeMoneyTab from './MoeMoneyTab'
import BudgetOverviewTab from './finance/BudgetOverviewTab'
import TransactionsTab from './finance/TransactionsTab'
import TritonDashboard from './finance/TritonDashboard'

type SubTab = 'budget' | 'transactions' | 'triton' | 'finance' | 'moe-money'

export default function FinanceMergedTab() {
  const [subTab, setSubTab] = useState<SubTab>('budget')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {([
          { id: 'budget' as const, label: 'Budget', icon: PieChart },
          { id: 'transactions' as const, label: 'Transactions', icon: CreditCard },
          { id: 'triton' as const, label: 'Triton', icon: Wrench },
          { id: 'finance' as const, label: 'Finance', icon: DollarSign },
          { id: 'moe-money' as const, label: 'Moe-Money', icon: Wallet },
        ]).map(tab => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {subTab === 'budget' && <BudgetOverviewTab />}
      {subTab === 'transactions' && <TransactionsTab />}
      {subTab === 'triton' && <TritonDashboard />}
      {subTab === 'finance' && <FinanceTab />}
      {subTab === 'moe-money' && <MoeMoneyTab />}
    </div>
  )
}
