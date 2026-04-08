'use client'

import { useEffect, useState } from 'react'

export function useTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const el = document.documentElement
    setTheme(el.classList.contains('light') ? 'light' : 'dark')

    const observer = new MutationObserver(() => {
      setTheme(el.classList.contains('light') ? 'light' : 'dark')
    })
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
