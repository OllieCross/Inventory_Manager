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
        { fps: 10, qrbox: { width: 260, height: 260 } },
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
    <div className="w-full">
      <div id="qr-reader" className="w-full" />
    </div>
  )
}
