import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type AuditAction =
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_DELETED'
  | 'IMAGE_UPLOADED'
  | 'IMAGE_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'ITEM_MOVED'
  | 'ROLE_CHANGED'
  | 'DEVICE_CREATED'
  | 'DEVICE_UPDATED'
  | 'DEVICE_DELETED'
  | 'LOGBOOK_ENTRY_ADDED'
  | 'CONSUMABLE_CREATED'
  | 'CONSUMABLE_UPDATED'
  | 'CONSUMABLE_STOCK_ADJUSTED'
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_COMPLETED'
  | 'TANK_CREATED'
  | 'TANK_UPDATED'
  | 'TANK_DELETED'
  | 'TANK_LOGBOOK_ENTRY_ADDED'

export async function logAudit(
  action: AuditAction,
  userId: string,
  targetId?: string,
  meta?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { action, userId, targetId, meta: meta as Prisma.InputJsonValue | undefined },
  })
}
