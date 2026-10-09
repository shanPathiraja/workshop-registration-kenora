import { createContext } from 'react'
import type { User } from '../types'

export interface AuthContextValue {
  token: string | null
  user: User | null
  /** True while a stored token is being checked with GET /auth/me. */
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
