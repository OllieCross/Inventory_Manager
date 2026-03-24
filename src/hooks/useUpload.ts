'use client'

import { useState } from 'react'

type UploadState = {
  uploading: boolean
  progress: number
  error: string | null
}

type UseUploadOptions = {
  onSuccess?: (fileKey: string) => void
  onError?: (error: string) => void
}

export function useUpload(caseId: string, type: 'image' | 'document', options?: UseUploadOptions) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  })

  async function upload(file: File) {
    setState({ uploading: true, progress: 0, error: null })

    try {
      // 1. Get a presigned URL from our API
      const res = await fetch('/api/minio/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, type, fileName: file.name, mimeType: file.type }),
      })

      if (!res.ok) throw new Error('Failed to get upload URL')

      const { url, fileKey } = await res.json()

      // 2. Upload directly to MinIO via presigned URL
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setState((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }))
          }
        }
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('Upload failed')))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      setState({ uploading: false, progress: 100, error: null })
      options?.onSuccess?.(fileKey)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setState({ uploading: false, progress: 0, error: message })
      options?.onError?.(message)
    }
  }

  return { ...state, upload }
}
