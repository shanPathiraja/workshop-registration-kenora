import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { clearSession, getToken, setToken as storeToken } from './session'

const ME_KEY = ['auth', 'me']

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(getToken)
  
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.getMe,
    enabled: token !== null,
    retry: false,
    staleTime: Infinity,
  })

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password)
      storeToken(result.accessToken)
      setToken(result.accessToken)
      queryClient.setQueryData(ME_KEY, result.user)
      return result.user
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: token ? (me.data ?? null) : null,
      isLoading: token !== null && me.isPending,
      login,
      logout,
    }),
    [token, me.data, me.isPending, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
