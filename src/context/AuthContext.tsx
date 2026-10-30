import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchCurrentUser } from '@/features/auth/api/me'
import { resolveAccessDestination, type AccessDestination } from '@/features/auth/access-destination'
import { rememberExpiredLoginNotice } from '@/features/auth/login-notice'
import { decideSessionCheck } from '@/features/auth/session-check'
import { bumpSessionGeneration, currentSessionGeneration } from '@/features/auth/session-generation'
import { ApiError } from '@/lib/api-client'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/auth'
import { setHttpErrorListener } from '@/lib/http-client'
import { queryClient } from '@/lib/query-client'
import type { AuthPrincipal } from '@/types/auth'

export type SessionPhase = 'checking' | 'anonymous' | 'ready' | 'unverified'

interface AuthState {
  phase: SessionPhase
  user: AuthPrincipal | null
  token: string | null
  expiresAt: number | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthPrincipal, expiresIn: number) => boolean
  logout: (notice?: 'expired') => void
  retryValidation: () => void
  isAuthenticated: boolean
  isLoading: boolean
  destination: AccessDestination | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'padelcheck_user'
const EXPIRES_KEY = 'padelcheck_session_expires_at'
function readUser(): AuthPrincipal | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthPrincipal) : null
  } catch {
    return null
  }
}

function readExpires(): number | null {
  const raw = localStorage.getItem(EXPIRES_KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function clearPrivateSession() {
  clearStoredToken()
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  queryClient.clear()
}

function errorPath(error: ApiError): string {
  const details = error.details
  if (!details || typeof details !== 'object' || !('path' in details)) return ''
  return typeof details.path === 'string' ? details.path : ''
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    phase: 'checking',
    user: null,
    token: null,
    expiresAt: null,
  })
  const stateRef = useRef(state)
  stateRef.current = state

  const logout = useCallback((notice?: 'expired') => {
    bumpSessionGeneration()
    clearPrivateSession()
    if (notice === 'expired') rememberExpiredLoginNotice()
    setState({ phase: 'anonymous', user: null, token: null, expiresAt: null })
  }, [])

  const validate = useCallback(async (token: string, expiresAt: number | null) => {
    const generation = bumpSessionGeneration()
    if (expiresAt !== null && Date.now() >= expiresAt) {
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      logout('expired')
      return
    }
    try {
      const user = await fetchCurrentUser()
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      if (decideSessionCheck({ attempt: generation, current: currentSessionGeneration(), error: null }) !== 'ready') return
      setState({ phase: 'ready', user, token, expiresAt })
    } catch (error) {
      const decision = decideSessionCheck({
        attempt: generation,
        current: currentSessionGeneration(),
        error: error instanceof ApiError ? error : { status: 0 },
      })
      if (decision === 'ignore') return
      if (decision === 'expired') {
        logout('expired')
        return
      }
      setState({ phase: 'unverified', user: null, token, expiresAt })
    }
  }, [logout])

  const login = useCallback((token: string, user: AuthPrincipal, expiresIn: number) => {
    const generation = bumpSessionGeneration()
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : null
    setStoredToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    if (expiresAt === null) localStorage.removeItem(EXPIRES_KEY)
    else localStorage.setItem(EXPIRES_KEY, String(expiresAt))
    if (generation !== currentSessionGeneration()) {
      clearPrivateSession()
      return false
    }
    setState({ phase: 'ready', user, token, expiresAt })
    return true
  }, [])

  const retryValidation = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      logout()
      return
    }
    setState((current) => ({ ...current, phase: 'checking' }))
    void validate(token, readExpires())
  }, [logout, validate])

  useEffect(() => {
    const token = getStoredToken()
    const storedUser = readUser()
    if (!token || !storedUser) {
      clearPrivateSession()
      setState({ phase: 'anonymous', user: null, token: null, expiresAt: null })
      return
    }
    void validate(token, readExpires())
  }, [validate])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const current = stateRef.current
      if (current.phase !== 'ready' || !current.token) return
      setState((value) => ({ ...value, phase: 'checking' }))
      void validate(current.token, current.expiresAt)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [validate])

  useEffect(() => {
    if (state.phase !== 'ready' || state.expiresAt === null) return
    const delay = state.expiresAt - Date.now()
    if (delay <= 0) {
      logout('expired')
      return
    }
    const timer = window.setTimeout(() => logout('expired'), delay)
    return () => window.clearTimeout(timer)
  }, [logout, state.expiresAt, state.phase])

  useEffect(() => {
    setHttpErrorListener((error) => {
      if (error.kind !== 'http') return
      const path = errorPath(error)
      if (path.includes('/auth/login')) return
      if (error.status === 401 && error.code !== 'AUTH_INVALID_CREDENTIALS') {
        if (stateRef.current.phase === 'anonymous') return
        logout('expired')
        return
      }
      if (error.status === 403 && error.code === 'AUTH_FORBIDDEN' && !path.includes('/auth/me')) {
        if (stateRef.current.phase !== 'ready' || !stateRef.current.token) return
        setState((value) => ({ ...value, phase: 'checking' }))
        void validate(stateRef.current.token as string, stateRef.current.expiresAt)
      }
    })
    return () => setHttpErrorListener(null)
  }, [logout, validate])

  const destination = state.phase === 'ready' && state.user
    ? resolveAccessDestination(state.user.accessContexts)
    : null

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    retryValidation,
    isAuthenticated: state.phase === 'ready' && !!state.token && !!state.user,
    isLoading: state.phase === 'checking',
    destination,
  }), [destination, login, logout, retryValidation, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
