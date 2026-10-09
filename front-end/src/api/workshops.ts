import type { Paged, Workshop, WorkshopStatus } from '../types'
import { api } from './client'
import { toQuery, type PageParams } from './query'

export interface WorkshopFilters extends PageParams {
  search?: string
  status?: WorkshopStatus
  from?: string
  to?: string
}

export interface WorkshopBody {
  code: string
  title: string
  description?: string | null
  instructor: string
  location: string
  startsAt: string
  endsAt: string
  capacity: number
}

export const listWorkshops = (filters?: WorkshopFilters) =>
  api<Paged<Workshop>>(`/workshops${toQuery(filters)}`)

export const getWorkshop = (id: string) => api<Workshop>(`/workshops/${id}`)

export const createWorkshop = (body: WorkshopBody) =>
  api<Workshop>('/workshops', { method: 'POST', body })

export const updateWorkshop = (id: string, body: Partial<WorkshopBody>) =>
  api<Workshop>(`/workshops/${id}`, { method: 'PATCH', body })

export const cancelWorkshop = (id: string) =>
  api<Workshop>(`/workshops/${id}/cancel`, { method: 'POST' })
