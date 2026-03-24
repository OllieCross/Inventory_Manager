'use client'

import { useState, useCallback } from 'react'

type GalleryImage = {
  url: string
  fileName: string
}

type Props = {
  images: GalleryImage[]
}

export default function CaseGallery({ images }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  const prev = useCallback(() => {
    setSelected((s) => (s !== null ? (s > 0 ? s - 1 : images.length - 1) : null))
  }, [images.length])

  const next = useCallback(() => {
    setSelected((s) => (s !== null ? (s < images.length - 1 ? s + 1 : 0) : null))
  }, [images.length])

  if (images.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="aspect-square rounded-lg overflow-hidden bg-surface border border-white/10 hover:border-brand transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {selected !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-full max-h-[80vh] flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[selected].url}
              alt={images[selected].fileName}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
            <p className="text-muted text-xs">{images[selected].fileName}</p>

            <div className="flex items-center gap-6">
              <button onClick={prev} className="btn-ghost px-6">Prev</button>
              <span className="text-muted text-sm">{selected + 1} / {images.length}</span>
              <button onClick={next} className="btn-ghost px-6">Next</button>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="absolute top-0 right-0 text-muted hover:text-foreground text-2xl leading-none p-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
