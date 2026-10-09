export const ROLES = ['admin', 'manager', 'staff'] as const
export type Role = (typeof ROLES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}
