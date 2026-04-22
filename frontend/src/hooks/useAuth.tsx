'use client'
import {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, setCookie, clearAuthCookies } from '@/lib/api'
import type { User } from '@/types'

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  isHR: boolean
  isApplicant: boolean
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router                = useRouter()

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await authAPI.profile()
      setUser(data)
    } catch {
      clearAuthCookies()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const hasCookie = typeof document !== 'undefined' &&
      document.cookie.includes('access_token=')
    if (hasCookie) {
      loadProfile().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [loadProfile])

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login({ email, password })
    setCookie('access_token',  data.tokens.access)
    setCookie('refresh_token', data.tokens.refresh)
    setCookie('user_role',     data.user.role)
    setUser(data.user)
    router.push(data.user.role === 'HR' ? '/hr/dashboard' : '/jobs')
  }

  const logout = () => {
    const refreshToken = typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/)?.[1] ?? '')
      : ''
    clearAuthCookies()
    setUser(null)
    if (refreshToken) {
      authAPI.logout({ refresh: decodeURIComponent(refreshToken) }).catch(() => {})
    }
    router.push('/auth/login')
  }

  const refreshProfile = async () => { await loadProfile() }

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, refreshProfile,
      isHR:        user?.role === 'HR',
      isApplicant: user?.role === 'APPLICANT',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)