import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getStoredToken, setStoredToken, clearStoredToken } from '@/lib/auth'
import type { AuthPrincipal } from '@/types/auth'

interface AuthState {
  user: AuthPrincipal | null
  token: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthPrincipal) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_STORAGE_KEY = 'padelcheck_user'

function getStoredUser(): AuthPrincipal | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthPrincipal) : null
  } catch {
    return null
  }
}

function setStoredUser(user: AuthPrincipal): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getStoredUser(),
    token: getStoredToken(),
    isLoading: true,
  })

  const login = useCallback((token: string, user: AuthPrincipal) => {
    setStoredToken(token)
    setStoredUser(user)
    setState({ user, token, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setState({ user: null, token: null, isLoading: false })
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    const user = getStoredUser()
    if (!token || !user) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }
    setState((s) => ({ ...s, isLoading: false }))
  }, [])

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    isAuthenticated: !!state.token && !!state.user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
