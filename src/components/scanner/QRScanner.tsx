'use client'

import { useEffect, useRef } from 'react'
import type { Html5Qrcode as ScannerType } from 'html5-qrcode'

type Props = {
  onScan: (result: string) => void
}

function safeStop(scanner: ScannerType | null) {
  if (!scanner) return
  try {
    scanner.stop().catch(() => {})
  } catch {
    // html5-qrcode throws a string (not an Error) when stop() is called
    // while the scanner is not running - safe to ignore
  }
}

export default function QRScanner({ onScan }: Props) {
  const scannerRef = useRef<ScannerType | null>(null)

  useEffect(() => {
    // Prevents the foreverScan loop from firing onScan more than once
    // before the scanner has fully stopped
    let didScan = false

    async function init() {
      const { Html5Qrcode } = await import('html5-qrcode')

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10 },
        (decoded) => {
          if (didScan) return
          didScan = true
          safeStop(scanner)
          onScan(decoded)
        },
        () => {} // suppress per-frame errors
      )
    }

    init()

    return () => {
      safeStop(scannerRef.current)
      scannerRef.current = null
    }
  }, [onScan])

  return (
    <div className="w-full relative">
      <div id="qr-reader" className="w-full" />
      {/* Crosshair overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Top-left */}
          <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl-sm" />
          {/* Top-right */}
          <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr-sm" />
          {/* Bottom-left */}
          <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl-sm" />
          {/* Bottom-right */}
          <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br-sm" />
        </div>
      </div>
    </div>
  )
}
