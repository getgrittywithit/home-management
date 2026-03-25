'use client'

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  available: { dot: 'bg-green-500', label: 'Available' },
  busy: { dot: 'bg-yellow-500', label: 'Busy' },
  out: { dot: 'bg-red-500', label: 'Out today' },
}

interface Props {
  status: string
  note: string | null
}

export default function MomAvailabilityBadge({ status, note }: Props) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.available

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border shadow-sm text-sm">
      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
      <span className="text-gray-700 font-medium">Mom: {s.label}</span>
      {note && status !== 'available' && (
        <span className="text-gray-500 text-xs">· {note}</span>
      )}
    </div>
  )
}
