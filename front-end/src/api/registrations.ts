import type { Paged, Registration, RegistrationStatus } from '../types'
import { api } from './client'
import { toQuery, type PageParams } from './query'

export interface RegistrationFilters extends PageParams {
  status?: RegistrationStatus
  search?: string
}

export interface RegisterAttendeeBody {
  attendeeName: string
  attendeeEmail: string
}

export const listRegistrations = (workshopId: string, filters?: RegistrationFilters) =>
  api<Paged<Registration>>(`/workshops/${workshopId}/registrations${toQuery(filters)}`)

export const registerAttendee = (workshopId: string, body: RegisterAttendeeBody) =>
  api<Registration>(`/workshops/${workshopId}/registrations`, { method: 'POST', body })

export const cancelRegistration = (id: string, reason?: string) =>
  api<Registration>(`/registrations/${id}/cancel`, { method: 'POST', body: { reason } })
