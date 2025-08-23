'use client'

import { useState } from 'react'
import { Printer, Calendar } from 'lucide-react'
import { getAllFamilyData } from '@/lib/familyConfig'

export default function PrintTab() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Get current week number
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const diff = now.getTime() - start.getTime()
    const oneWeek = 1000 * 60 * 60 * 24 * 7
    return Math.ceil(diff / oneWeek)
  })

  const familyData = getAllFamilyData()
  const allMembers = familyData.allMembers

  const handlePrint = () => {
    window.print()
  }

  const getWeekDates = (weekNumber: number) => {
    const year = new Date().getFullYear()
    const firstDay = new Date(year, 0, 1)
    const daysToAdd = (weekNumber - 1) * 7
    const weekStart = new Date(firstDay.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    
    // Adjust to Monday start
    const dayOfWeek = weekStart.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(weekStart.getTime() + mondayOffset * 24 * 60 * 60 * 1000)
    
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000)
      weekDays.push({
        day: day.toLocaleDateString('en-US', { weekday: 'long' }),
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })
    }
    
    return weekDays
  }

  const weekDays = getWeekDates(selectedWeek)

  return (
    <div className="space-y-6">
      {/* Control Panel - Hidden when printing */}
      <div className="print:hidden bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Print Center</h1>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <label htmlFor="week-select" className="text-sm font-medium text-gray-700">
              Week Number:
            </label>
          </div>
          <select
            id="week-select"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Chore Sheet */}
      <div className="bg-white p-8 rounded-lg border print:border-0 print:shadow-none print:rounded-none">
        <style jsx>{`
          @media print {
            .print\\:page-break-before {
              page-break-before: always;
            }
            .print\\:text-xs {
              font-size: 0.75rem;
            }
            .print\\:text-sm {
              font-size: 0.875rem;
            }
            .print\\:text-base {
              font-size: 1rem;
            }
            .print\\:mb-1 {
              margin-bottom: 0.25rem;
            }
            .print\\:mb-2 {
              margin-bottom: 0.5rem;
            }
            .print\\:mb-4 {
              margin-bottom: 1rem;
            }
            .print\\:p-1 {
              padding: 0.25rem;
            }
            .print\\:border {
              border: 1px solid #000;
            }
            .print\\:border-b {
              border-bottom: 1px solid #000;
            }
          }
        `}</style>

        {/* Header */}
        <div className="text-center mb-8 print:mb-4">
          <h1 className="text-3xl print:text-base font-bold mb-2 print:mb-1">
            Moses Family Weekly Dishes Chore Chart
          </h1>
          <div className="text-lg print:text-sm text-gray-600 mb-4 print:mb-2">
            <span className="font-semibold">Week {selectedWeek}</span> • 
            <span className="ml-2">{weekDays[0].date} - {weekDays[6].date}</span>
          </div>
          
          {/* Instructions */}
          <div className="bg-blue-50 print:bg-transparent border print:border border-blue-200 print:border-black rounded-lg print:rounded-none p-4 print:p-1 mb-6 print:mb-2">
            <h2 className="font-bold text-lg print:text-sm mb-2 print:mb-1">Daily Dishes Responsibilities:</h2>
            <div className="text-left text-sm print:text-xs space-y-1">
              <p>• <strong>Each person:</strong> Hand wash, dry, and put away 5 dishes daily</p>
              <p>• <strong>Dishwasher:</strong> Must run every day - everyone helps load/unload</p>
              <p>• <strong>Teamwork:</strong> We all pitch in to keep our kitchen clean!</p>
            </div>
          </div>
        </div>

        {/* Chore Chart Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border print:border border-gray-300 print:border-black">
            <thead>
              <tr className="bg-gray-100 print:bg-transparent">
                <th className="border print:border border-gray-300 print:border-black p-3 print:p-1 text-left font-bold">
                  Family Member
                </th>
                {weekDays.map(({ day, date }) => (
                  <th key={day} className="border print:border border-gray-300 print:border-black p-3 print:p-1 text-center font-bold print:text-xs">
                    <div>{day}</div>
                    <div className="text-xs print:text-xs text-gray-600 print:text-black">{date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMembers.map((member) => (
                <tr key={member.name} className="hover:bg-gray-50 print:hover:bg-transparent">
                  <td className="border print:border border-gray-300 print:border-black p-3 print:p-1 font-semibold print:text-xs">
                    <div>{member.name}</div>
                    <div className="text-xs print:text-xs text-gray-500 print:text-black">
                      {member.role === 'child' ? `Age ${member.age}` : 'Parent'}
                    </div>
                  </td>
                  {weekDays.map(({ day }) => (
                    <td key={`${member.name}-${day}`} className="border print:border border-gray-300 print:border-black p-3 print:p-1 text-center">
                      <div className="space-y-2 print:space-y-1">
                        {/* 5 Dishes Checkbox */}
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 print:w-3 print:h-3" 
                            id={`${member.name}-${day}-dishes`}
                          />
                          <label 
                            htmlFor={`${member.name}-${day}-dishes`}
                            className="text-xs print:text-xs cursor-pointer select-none"
                          >
                            5 Dishes
                          </label>
                        </div>
                        {/* Dishwasher Help Checkbox */}
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 print:w-3 print:h-3" 
                            id={`${member.name}-${day}-dishwasher`}
                          />
                          <label 
                            htmlFor={`${member.name}-${day}-dishwasher`}
                            className="text-xs print:text-xs cursor-pointer select-none"
                          >
                            Dishwasher
                          </label>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-6 print:mt-2 text-center">
          <div className="text-sm print:text-xs text-gray-600 print:text-black space-y-2 print:space-y-1">
            <p><strong>Remember:</strong> Clean kitchen = Happy family! 🏠</p>
            <p>Check off tasks as you complete them each day.</p>
            <div className="border-t print:border-t border-gray-300 print:border-black pt-4 print:pt-1 mt-4 print:mt-1">
              <p className="text-xs print:text-xs">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}