'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Check, RotateCcw } from 'lucide-react'

interface ZonePhotoUploadProps {
  kidName: string
  zoneName: string
  onSubmitted?: () => void
}

export default function ZonePhotoUpload({ kidName, zoneName, onSubmitted }: ZonePhotoUploadProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'submitted' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setStatus('uploading')
    try {
      // Convert to base64 for simple storage (no external file service needed)
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.readAsDataURL(file)
      })

      const res = await fetch('/api/kids/zone-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_photo',
          kid_name: kidName.toLowerCase(),
          zone_name: zoneName,
          photo_url: base64.slice(0, 500000), // cap at ~375KB to fit in DB text column
        }),
      })

      if (res.ok) {
        setStatus('submitted')
        onSubmitted?.()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'submitted') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <Check className="w-3.5 h-3.5" />
        Photo sent — waiting for review
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={status === 'uploading'}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        title="Take a photo of your finished zone"
      >
        {status === 'uploading' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        {status === 'error' ? 'Retry' : 'Photo'}
      </button>
    </div>
  )
}
