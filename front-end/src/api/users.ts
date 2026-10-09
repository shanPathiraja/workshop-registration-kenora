import type { Role, User } from '../types'
import { api } from './client'

export interface CreateUserBody {
  name: string
  email: string
  password: string
  role?: Role
}

export type UpdateUserBody = Partial<CreateUserBody> & { isActive?: boolean }

export const listUsers = () => api<User[]>('/users')

export const getUser = (id: string) => api<User>(`/users/${id}`)

export const createUser = (body: CreateUserBody) =>
  api<User>('/users', { method: 'POST', body })

export const updateUser = (id: string, body: UpdateUserBody) =>
  api<User>(`/users/${id}`, { method: 'PATCH', body })

/** DELETE /users/:id soft-deactivates the account (isActive = false); it does not remove the row. */
export const deactivateUser = (id: string) => api<void>(`/users/${id}`, { method: 'DELETE' })
