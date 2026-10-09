import type { AuditEntityType, AuditLog, Paged } from '../types'
import { api } from './client'
import { toQuery, type PageParams } from './query'

export interface AuditFilters extends PageParams {
  entityType?: AuditEntityType
  entityId?: string
  actorId?: string
  from?: string
  to?: string
}

export const listAuditLogs = (filters?: AuditFilters) =>
  api<Paged<AuditLog>>(`/audit${toQuery(filters)}`)
