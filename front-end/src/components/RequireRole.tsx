import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import type { Role } from '../types'

/** Must be nested inside <RequireAuth />. */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) return <ForbiddenPage />

  return <Outlet />
}
