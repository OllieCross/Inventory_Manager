'use client'

import { useEffect, useRef } from 'react'
import type { Html5QrcodeScanner as ScannerType } from 'html5-qrcode'

type Props = {
  onScan: (result: string) => void
}

export default function QRScanner({ onScan }: Props) {
  const scannerRef = useRef<ScannerType | null>(null)

  useEffect(() => {
    let scanner: ScannerType

    async function init() {
      const { Html5QrcodeScanner, Html5QrcodeScanType } = await import('html5-qrcode')

      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      )

      scanner.render(
        (decoded) => {
          scanner.clear().catch(() => {})
          onScan(decoded)
        },
        () => {} // suppress per-frame errors
      )

      scannerRef.current = scanner
    }

    init()

    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="w-full">
      {/* html5-qrcode injects its UI here */}
      <div id="qr-reader" className="w-full" />
    </div>
  )
}
