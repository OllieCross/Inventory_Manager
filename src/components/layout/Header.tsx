'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

const NAV_LINKS = [
  { href: '/scan', label: 'Scan' },
  { href: '/editor', label: 'Inventory' },
  { href: '/events', label: 'Events' },
]

export default function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role ?? ''
  const name = session?.user?.name ?? ''
  const theme = useTheme()
  const logoSrc = theme === 'dark' ? '/logo.jpg' : '/logo2.jpg'

  const [menuOpen, setMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile nav on route change
  useEffect(() => { setNavOpen(false) }, [pathname])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.className = next
    localStorage.setItem('theme', next)
    setMenuOpen(false)
  }

  const initial = (name || role).charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/scan" className="flex items-center gap-2.5 shrink-0">
          <Image
            src={logoSrc}
            alt="Inventory Manager"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="font-bold text-sm hidden sm:block">Inventory Manager</span>
        </Link>

        {/* Primary nav - hidden below 390px */}
        <nav className="hidden min-[390px]:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-brand text-white'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: hamburger (narrow) + user menu */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Hamburger - only below 390px */}
          <button
            className="min-[390px]:hidden p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
            onClick={() => setNavOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {navOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>

          {/* User menu */}
          {session && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
                aria-label="User menu"
                aria-expanded={menuOpen}
              >
                <span className="w-6 h-6 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center shrink-0">
                  {initial}
                </span>
                <span className="hidden sm:block text-sm text-foreground/80 max-w-[96px] truncate">{name}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={cn('text-muted transition-transform duration-150', menuOpen && 'rotate-180')}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-foreground/10 rounded-xl shadow-xl overflow-hidden z-50">
                  {role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-foreground/5 transition-colors"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-foreground/5 transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-foreground/5 transition-colors"
                  >
                    <span>Theme</span>
                    <span className="text-muted text-xs">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                  </button>
                  <div className="border-t border-foreground/10 mt-1 pt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer - below 390px only */}
      {navOpen && (
        <div className="min-[390px]:hidden border-t border-foreground/10 px-4 py-2 flex flex-col gap-1 bg-background/95">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-brand text-white'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
