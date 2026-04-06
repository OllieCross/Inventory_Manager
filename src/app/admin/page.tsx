import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Header from '@/components/layout/Header'
import RoleSelector from '@/components/admin/RoleSelector'
import { formatDate, formatDateTime } from '@/lib/utils'

const ACTION_LABEL: Record<string, string> = {
  CASE_CREATED:             'Created case',
  CASE_UPDATED:             'Updated case',
  CASE_DELETED:             'Deleted case',
  IMAGE_UPLOADED:           'Uploaded image',
  IMAGE_DELETED:            'Deleted image',
  DOCUMENT_UPLOADED:        'Uploaded document',
  DOCUMENT_DELETED:         'Deleted document',
  ITEM_MOVED:               'Moved item',
  ROLE_CHANGED:             'Changed role',
  DEVICE_CREATED:           'Created device',
  DEVICE_UPDATED:           'Updated device',
  DEVICE_DELETED:           'Deleted device',
  LOGBOOK_ENTRY_ADDED:      'Added logbook entry',
  CONSUMABLE_CREATED:       'Created consumable',
  CONSUMABLE_UPDATED:       'Updated consumable',
  CONSUMABLE_STOCK_ADJUSTED:'Adjusted consumable stock',
  GROUP_CREATED:            'Created group',
  GROUP_UPDATED:            'Updated group',
  GROUP_DELETED:            'Deleted group',
  EVENT_CREATED:            'Created event',
  EVENT_UPDATED:            'Updated event',
  EVENT_COMPLETED:          'Completed event',
}

function auditDetail(action: string, meta: Record<string, unknown> | null): string {
  if (!meta) return ''
  switch (action) {
    case 'CASE_CREATED':
    case 'CASE_UPDATED':
    case 'CASE_DELETED':
      return (meta.caseName as string) ?? ''
    case 'IMAGE_UPLOADED':
    case 'IMAGE_DELETED':
      return (meta.fileName as string) ?? ''
    case 'DOCUMENT_UPLOADED':
    case 'DOCUMENT_DELETED':
      return (meta.title as string) ?? (meta.fileName as string) ?? ''
    case 'ITEM_MOVED':
      return (meta.itemName as string) ?? ''
    case 'ROLE_CHANGED':
      return `${meta.targetName}: ${meta.oldRole} -> ${meta.newRole}`
    case 'DEVICE_CREATED':
    case 'DEVICE_UPDATED':
    case 'DEVICE_DELETED':
      return (meta.deviceName as string) ?? ''
    case 'LOGBOOK_ENTRY_ADDED':
      return (meta.comment as string) ?? ''
    case 'CONSUMABLE_CREATED':
    case 'CONSUMABLE_UPDATED':
    case 'CONSUMABLE_STOCK_ADJUSTED':
      return (meta.name as string) ?? ''
    case 'GROUP_CREATED':
    case 'GROUP_UPDATED':
    case 'GROUP_DELETED':
      return (meta.name as string) ?? ''
    case 'EVENT_CREATED':
    case 'EVENT_UPDATED':
    case 'EVENT_COMPLETED':
      return (meta.name as string) ?? ''
    default:
      return ''
  }
}

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/scan')

  const [users, auditLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
  ])

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-10">
        <section>
          <h1 className="text-xl font-bold mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-400 mb-6">Manage users and their access roles.</p>

          <div className="card overflow-hidden p-0 overflow-x-auto">
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
          <p className="text-sm text-gray-400 mb-4">Last 100 events, most recent first.</p>

          {auditLogs.length === 0 ? (
            <div className="card flex items-center justify-center py-12 text-gray-500 text-sm">
              No events recorded yet.
            </div>
          ) : (
            <div className="card overflow-hidden p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, i) => (
                    <tr
                      key={log.id}
                      className={i < auditLogs.length - 1 ? 'border-b border-white/5' : ''}
                    >
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user.name}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {ACTION_LABEL[log.action] ?? log.action}
                      </td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">
                        {auditDetail(log.action, log.meta as Record<string, unknown> | null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
