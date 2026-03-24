import { useSession } from 'next-auth/react'

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role

  return {
    isViewer: role === 'VIEWER' || role === 'EDITOR' || role === 'ADMIN',
    isEditor: role === 'EDITOR' || role === 'ADMIN',
    isAdmin: role === 'ADMIN',
    role,
  }
}
