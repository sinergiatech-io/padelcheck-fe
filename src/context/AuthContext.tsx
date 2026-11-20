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
import { accessChoices, accountEntry, resolveAccessDestination, type AccessDestination } from '@/features/auth/access-destination'
import { rememberExpiredLoginNotice } from '@/features/auth/login-notice'
import { decideSessionCheck } from '@/features/auth/session-check'
import { bumpSessionGeneration, currentSessionGeneration } from '@/features/auth/session-generation'
import { ApiError } from '@/lib/api-client'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/auth'
import { setHttpErrorListener } from '@/lib/http-client'
import { billingBrowserStore, endBillingAuth } from '@/features/club/plan/billing-session'
import { clearGoogleClubDraft } from '@/features/club-onboarding/google-club-draft'
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
  logout: (notice?: 'expired') => boolean
  retryValidation: () => void
  isAuthenticated: boolean
  isLoading: boolean
  destination: AccessDestination | null
  chooseContext: (key: string) => boolean
  entryPath: (user: AuthPrincipal, requested?: string | null) => string
}

const AuthContext = createContext<AuthContextValue | null>(null)

function preferredKey(userId: string) { return 'padelcheck.activity.' + userId }

function readPreferred(userId: string) {
  try { return localStorage.getItem(preferredKey(userId)) } catch { return null }
}

function writePreferred(userId: string, key: string) {
  try { localStorage.setItem(preferredKey(userId), key) } catch { /* The in-memory preference is still available. */ }
}

const USER_KEY = 'padelcheck_user'
const EXPIRES_KEY = 'padelcheck_session_expires_at'
function readExpires(): number | null {
  const raw = localStorage.getItem(EXPIRES_KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function clearPrivateSession() {
  endBillingAuth(billingBrowserStore())
  queryClient.clear()
  clearStoredToken()
  clearGoogleClubDraft()
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRES_KEY)
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
    try {
      clearPrivateSession()
      if (notice === 'expired') rememberExpiredLoginNotice()
    } catch {
      setState({ phase: 'unverified', user: null, token: null, expiresAt: null })
      return false
    }
    setState({ phase: 'anonymous', user: null, token: null, expiresAt: null })
    return true
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
    endBillingAuth(billingBrowserStore())
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
    try {
      const token = getStoredToken()
      if (!token) {
        logout()
        return
      }
      const expiresAt = readExpires()
      setState((current) => ({ ...current, phase: 'checking' }))
      void validate(token, expiresAt)
    } catch {
      // Failure to read storage is not proof that credentials are absent/expired.
      bumpSessionGeneration()
      setState({ phase: 'unverified', user: null, token: null, expiresAt: null })
    }
  }, [logout, validate])

  useEffect(() => {
    // /me is authoritative; a missing/corrupt cached principal need not discard a token.
    retryValidation()
  }, [retryValidation])

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
      if (path.includes('/auth/login') || path.includes('/auth/google') || path.includes('/auth/continuations/')) return
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

  const [preferred, setPreferred] = useState<{ userId: string; key: string }>()
  const preferredFor = useCallback((userId: string) =>
    preferred?.userId === userId ? preferred.key : readPreferred(userId), [preferred])
  const entryPath = useCallback((user: AuthPrincipal, requested?: string | null) => {
    const entry = accountEntry('web', user.accessContexts, requested, preferredFor(user.userId))
    if (entry.choice) {
      writePreferred(user.userId, entry.choice.key)
      setPreferred({ userId: user.userId, key: entry.choice.key })
    }
    return entry.path
  }, [preferredFor])
  const chooseContext = useCallback((key: string) => {
    const user = stateRef.current.phase === 'ready' ? stateRef.current.user : null
    if (!user || !accessChoices(user.accessContexts).some(item => item.key === key)) return false
    writePreferred(user.userId, key)
    setPreferred({ userId: user.userId, key })
    return true
  }, [])
  const user = state.phase === 'ready' ? state.user : null
  const chosen = user ? accessChoices(user.accessContexts).find(item => item.key === preferredFor(user.userId)) : undefined
  const destination = user ? chosen?.destination ?? resolveAccessDestination(user.accessContexts) : null

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    retryValidation,
    isAuthenticated: state.phase === 'ready' && !!state.token && !!state.user,
    isLoading: state.phase === 'checking',
    destination,
    chooseContext,
    entryPath,
  }), [chooseContext, destination, entryPath, login, logout, retryValidation, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
