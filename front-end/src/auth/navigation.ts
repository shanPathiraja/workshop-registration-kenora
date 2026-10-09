import type { Role } from '../types'

export interface NavItem {
  label: string
  to: string
  roles: readonly Role[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Users', to: '/users', roles: ['admin'] },
  { label: 'Workshops', to: '/workshops', roles: ['manager', 'staff'] },
  { label: 'Activity', to: '/activity', roles: ['admin', 'manager'] },
]

export const navItemsFor = (role: Role) => NAV_ITEMS.filter((item) => item.roles.includes(role))
