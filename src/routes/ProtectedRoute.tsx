import { Navigate, useLocation } from 'react-router-dom'
import { SessionUnverifiedPage } from '@/features/auth/pages/SessionUnverifiedPage'
import { guardRedirect, safeInternalPath } from '@/features/auth/access-destination'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { phase, destination } = useAuth()
  const location = useLocation()

  if (phase === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#120F18]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9CF38] border-t-transparent" />
      </div>
    )
  }

  if (phase === 'unverified') return <SessionUnverifiedPage />

  if (phase !== 'ready' || !destination) {
    const path = safeInternalPath(location.pathname)
    const returnUrl = path === '/app' || path === '/app/events' ? `?returnUrl=${encodeURIComponent(path)}` : ''
    return <Navigate to={`${ROUTES.login}${returnUrl}`} replace />
  }

  const redirect = guardRedirect('web', destination, location.pathname)
  if (redirect && redirect !== location.pathname) return <Navigate to={redirect} replace />

  return <>{children}</>
}
