'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type Props = {
  minRole?: 'VIEWER' | 'EDITOR' | 'ADMIN'
  children: React.ReactNode
}

const ROLE_ORDER = ['VIEWER', 'EDITOR', 'ADMIN']

export default function AuthGuard({ minRole = 'VIEWER', children }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const role = session?.user?.role ?? ''
  const hasAccess = ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minRole)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/login')
    } else if (!hasAccess) {
      router.replace('/scan')
    }
  }, [status, session, hasAccess, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || !hasAccess) return null

  return <>{children}</>
}
