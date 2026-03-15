'use client'

import { useState } from 'react'
import { Printer, Calendar, X } from 'lucide-react'
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

  const [showPrintModal, setShowPrintModal] = useState(false)

  const familyData = getAllFamilyData()
  const allMembers = familyData.allMembers

  const handlePrint = () => {
    setShowPrintModal(true)
  }

  const handlePrintDocument = () => {
    window.print()
  }

  const handleClosePrintModal = () => {
    setShowPrintModal(false)
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
    <>
      <div className="space-y-6">
        {/* Control Panel */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Print Center</h1>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-5 h-5" />
              Preview & Print
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

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Available Print Templates:</h3>
            <div className="text-sm text-blue-800">
              <p>• <strong>Weekly Dishes Chore Chart</strong> - Track daily dish washing and dishwasher duties for all family members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <h2 className="text-xl font-bold text-gray-900">Print Preview - Weekly Dishes Chart</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleClosePrintModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Content */}
            <div className="p-8 print:p-0">
              <style jsx>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .printable, .printable * {
                    visibility: visible;
                  }
                  .printable {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    font-family: Arial, sans-serif;
                  }
                  .print-title {
                    font-size: 24px !important;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 16px;
                  }
                  .print-subtitle {
                    font-size: 16px !important;
                    text-align: center;
                    margin-bottom: 20px;
                  }
                  .print-instructions {
                    border: 2px solid #000;
                    padding: 12px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    background: none !important;
                  }
                  .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                  }
                  .print-table th {
                    border: 2px solid #000;
                    padding: 8px;
                    text-align: center;
                    font-weight: bold;
                    background: #f5f5f5 !important;
                  }
                  .print-table td {
                    border: 1px solid #000;
                    padding: 6px;
                    text-align: center;
                  }
                  .print-checkbox {
                    width: 12px !important;
                    height: 12px !important;
                    border: 2px solid #000 !important;
                    margin-right: 4px !important;
                    display: inline-block !important;
                  }
                  .print-footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 12px;
                  }
                }
              `}</style>

              <div className="printable">
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className="print-title text-3xl font-bold mb-2">
                    Moses Family Weekly Dishes Chore Chart
                  </h1>
                  <div className="print-subtitle text-lg text-gray-600 mb-4">
                    <span className="font-semibold">Week {selectedWeek}</span> • 
                    <span className="ml-2">{weekDays[0].date} - {weekDays[6].date}</span>
                  </div>
                  
                  {/* Instructions */}
                  <div className="print-instructions bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="font-bold text-lg mb-2">Daily Dishes Responsibilities:</h2>
                    <div className="text-left text-sm space-y-1">
                      <p>• <strong>Each person:</strong> Hand wash, dry, and put away 5 dishes daily</p>
                      <p>• <strong>Dishwasher:</strong> Must run every day - everyone helps load/unload</p>
                      <p>• <strong>Teamwork:</strong> We all pitch in to keep our kitchen clean!</p>
                    </div>
                  </div>
                </div>

                {/* Chore Chart Table */}
                <table className="print-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border-2 border-gray-800 p-3 text-left font-bold bg-gray-100">
                        Family Member
                      </th>
                      {weekDays.map(({ day, date }) => (
                        <th key={day} className="border-2 border-gray-800 p-3 text-center font-bold bg-gray-100">
                          <div className="font-bold">{day}</div>
                          <div className="text-xs font-normal">{date}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allMembers.map((member) => (
                      <tr key={member.name}>
                        <td className="border-2 border-gray-800 p-3 font-semibold text-left">
                          <div className="font-bold">{member.name}</div>
                          <div className="text-xs text-gray-600">
                            {member.role === 'child' ? `Age ${member.age}` : 'Parent'}
                          </div>
                        </td>
                        {weekDays.map(({ day }) => (
                          <td key={`${member.name}-${day}`} className="border border-gray-600 p-2 text-center">
                            <div className="space-y-2">
                              {/* 5 Dishes Checkbox */}
                              <div className="flex items-center justify-center gap-1">
                                <div className="print-checkbox w-4 h-4 border-2 border-gray-800 rounded-sm bg-white"></div>
                                <label className="text-xs font-medium">5 Dishes</label>
                              </div>
                              {/* Dishwasher Help Checkbox */}
                              <div className="flex items-center justify-center gap-1">
                                <div className="print-checkbox w-4 h-4 border-2 border-gray-800 rounded-sm bg-white"></div>
                                <label className="text-xs font-medium">Dishwasher</label>
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="print-footer mt-6 text-center">
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Remember:</strong> Clean kitchen = Happy family! 🏠</p>
                    <p>Check off tasks as you complete them each day.</p>
                    <div className="border-t border-gray-300 pt-4 mt-4">
                      <p className="text-xs">Generated on: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}