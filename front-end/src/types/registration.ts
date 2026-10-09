import type { User } from './user'
import type { Workshop } from './workshop'

export const REGISTRATION_STATUSES = ['ACTIVE', 'WAITLISTED', 'CANCELLED'] as const
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]

export interface Registration {
  id: string
  workshopId: string
  workshop?: Workshop
  attendeeName: string
  attendeeEmail: string
  status: RegistrationStatus
  registeredBy: User
  registeredAt: string
  /** Set when a waitlisted registration was given a freed seat. */
  promotedAt: string | null
  cancelledBy: User | null
  cancelledAt: string | null
  cancelReason: string | null
}
