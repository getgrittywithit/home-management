'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (code: string, format: string) => void
  onClose: () => void
  onError?: (error: string) => void
}

export default function BarcodeScanner({ onScan, onClose, onError }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)
  const containerId = 'barcode-scanner-container'

  useEffect(() => {
    let mounted = true
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return
      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.777 },
        (decodedText: string, result: any) => {
          const format = result?.result?.format?.formatName || 'UNKNOWN'
          scanner.stop().then(() => {
            if (mounted) {
              setScanning(false)
              onScan(decodedText, format)
            }
          })
        },
        () => {}
      ).then(() => { if (mounted) setScanning(true) })
       .catch(() => {
         if (mounted) {
           setError('Camera access denied or not available.')
           onError?.('Camera access denied')
         }
       })
    })

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">Scan Barcode</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">{error}</p>
              <p className="text-sm text-gray-500">Try entering the number manually instead.</p>
            </div>
          ) : (
            <>
              <div id={containerId} className="w-full rounded-lg overflow-hidden" />
              {!scanning && (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Starting camera...
                </div>
              )}
              <p className="text-sm text-gray-500 text-center mt-3">
                Point at the barcode on the back of the book, game, or item.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
