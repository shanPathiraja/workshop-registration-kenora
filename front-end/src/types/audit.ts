import type { User } from './user'

export type AuditEntityType = 'USER' | 'WORKSHOP' | 'REGISTRATION'

export interface AuditLog {
  id: string
  actor: User | null
  action: string
  entityType: AuditEntityType
  entityId: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  createdAt: string
}
