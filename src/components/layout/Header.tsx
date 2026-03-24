'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-brand/20 text-brand',
  EDITOR: 'bg-white/10 text-foreground/80',
  VIEWER: 'bg-white/5 text-muted',
}

export default function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role ?? ''

  const navLinks = [
    { href: '/scan', label: 'Scan', minRole: 'VIEWER' },
    { href: '/editor', label: 'Editor', minRole: 'EDITOR' },
    { href: '/admin', label: 'Admin', minRole: 'ADMIN' },
  ]

  const roleOrder = ['VIEWER', 'EDITOR', 'ADMIN']
  const hasAccess = (minRole: string) =>
    roleOrder.indexOf(role) >= roleOrder.indexOf(minRole)

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo + title */}
        <Link href="/scan" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/logo.jpg"
            alt="SFXProOne"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="font-bold text-sm hidden sm:block">CaseManager</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, minRole }) =>
            hasAccess(minRole) ? (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-white/5'
                )}
              >
                {label}
              </Link>
            ) : null
          )}
        </nav>

        {/* User + sign out */}
        <div className="flex items-center gap-2 shrink-0">
          {role && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ROLE_BADGE[role])}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-muted hover:text-foreground text-sm transition-colors"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
