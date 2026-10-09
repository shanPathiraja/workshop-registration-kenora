import type { User } from './user'

export const WORKSHOP_STATUSES = ['SCHEDULED', 'CANCELLED', 'COMPLETED'] as const
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number]

export interface Workshop {
  id: string
  code: string
  title: string
  description: string | null
  instructor: string
  location: string
  startsAt: string
  endsAt: string
  capacity: number
  activeCount: number
  seatsLeft: number
  status: WorkshopStatus
  createdBy: User | null
  updatedBy: User | null
  createdAt: string
  updatedAt: string
}
