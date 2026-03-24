import Header from '@/components/layout/Header'
import AuthGuard from '@/components/layout/AuthGuard'

export default function AdminPage() {
  return (
    <AuthGuard minRole="ADMIN">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-muted text-sm">Admin panel coming in Phase 7</p>
      </main>
    </AuthGuard>
  )
}
