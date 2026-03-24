'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  url: string
  title: string
}

export default function PDFViewer({ url, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return

        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)
        await renderPage(1, pdf)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function renderPage(pageNum: number, pdf?: any) {
    const doc = pdf ?? pdfRef.current
    if (!doc || !canvasRef.current) return

    const page = await doc.getPage(pageNum)
    const scale = window.innerWidth < 640 ? 1.2 : 1.6
    const viewport = page.getViewport({ scale })
    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport,
    }).promise
  }

  async function goTo(pageNum: number) {
    setCurrentPage(pageNum)
    await renderPage(pageNum)
  }

  if (error) {
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-muted text-sm">Could not render PDF in browser.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand text-sm hover:underline">
          Open {title} in new tab
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="w-full rounded-lg border border-white/10" />

      {numPages > 1 && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => goTo(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="btn-ghost text-sm"
          >
            Prev
          </button>
          <span className="text-muted text-sm">{currentPage} / {numPages}</span>
          <button
            onClick={() => goTo(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="btn-ghost text-sm"
          >
            Next
          </button>
        </div>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand text-sm hover:underline"
      >
        Open in new tab
      </a>
    </div>
  )
}
