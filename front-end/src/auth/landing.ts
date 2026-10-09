import type { Role } from '../types'

const LANDING_PATHS: Record<Role, string> = {
  admin: '/users',
  manager: '/workshops',
  staff: '/workshops',
}

export const landingPath = (role: Role) => LANDING_PATHS[role]
