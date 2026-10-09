import type { User } from '../types'
import { api } from './client'

export interface LoginResult {
  accessToken: string
  user: User
}

export const login = (email: string, password: string) =>
  api<LoginResult>('/auth/login', { method: 'POST', body: { email, password } })

export const getMe = () => api<User>('/auth/me')
