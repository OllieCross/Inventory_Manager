import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'
import RoleSelector from '@/components/admin/RoleSelector'
import { formatDate } from '@/lib/utils'

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/scan')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-10">
        <section>
          <h1 className="text-xl font-bold mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-400 mb-6">Manage users and their access roles.</p>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr
                    key={user.id}
                    className={i < users.length - 1 ? 'border-b border-white/5' : ''}
                  >
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-gray-400">{user.email}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <RoleSelector
                        userId={user.id}
                        currentRole={user.role}
                        isSelf={user.id === session.user.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">Audit Log</h2>
          <p className="text-sm text-gray-400 mb-4">
            A record of case edits, uploads, and role changes.
          </p>
          <div className="card flex items-center justify-center py-12 text-gray-500 text-sm">
            Audit logging is not yet implemented.
          </div>
        </section>
      </main>
    </>
  )
}
