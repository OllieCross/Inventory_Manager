'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Header from '@/components/layout/Header'
import AuthGuard from '@/components/layout/AuthGuard'

// Dynamically import to avoid SSR - html5-qrcode uses browser APIs
const QRScanner = dynamic(() => import('@/components/scanner/QRScanner'), { ssr: false })

export default function ScanPage() {
  const router = useRouter()
  const [manualInput, setManualInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [scannerVisible, setScannerVisible] = useState(true)

  async function lookup(qrdata: string) {
    if (!qrdata.trim()) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch(
        `/api/cases/lookup?qrdata=${encodeURIComponent(qrdata.trim())}`
      )

      if (res.ok) {
        const { id } = await res.json()
        router.push(`/case/${id}`)
      } else if (res.status === 404) {
        setStatus('error')
        setErrorMsg(`No case found for: ${qrdata.trim()}`)
        setScannerVisible(true)
      } else {
        setStatus('error')
        setErrorMsg('Something went wrong. Try again.')
        setScannerVisible(true)
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Check your connection.')
      setScannerVisible(true)
    }
  }

  const handleScan = useCallback(
    (result: string) => {
      setScannerVisible(false)
      lookup(result)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setScannerVisible(false)
    lookup(manualInput)
  }

  return (
    <AuthGuard minRole="VIEWER">
      <Header />
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">Scan QR Code</h1>
          <p className="text-muted text-sm mt-1">Point your camera at the sticker on the case.</p>
        </div>

        {/* Camera scanner */}
        {scannerVisible && status !== 'loading' && (
          <div className="rounded-xl overflow-hidden border border-foreground/10">
            <QRScanner onScan={handleScan} />
          </div>
        )}

        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-sm">Looking up case...</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Manual input fallback */}
        <form onSubmit={handleManualSubmit} className="card space-y-3 bg-foreground/[0.03]">
          <label className="block text-sm font-medium">Or enter code manually</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field"
              placeholder="e.g. A3F9K2..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || status === 'loading'}
              className="btn-primary shrink-0 min-w-[64px] min-h-[44px]"
            >
              Go
            </button>
          </div>
        </form>
      </main>
    </AuthGuard>
  )
}
