import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { SessionUnverifiedPage } from '@/features/auth/pages/SessionUnverifiedPage'
import { StartupReady } from '@/features/startup/StartupReady'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'

export function OwnerGate({ children }: { children: ReactNode }) {
  const { phase, user } = useAuth()
  if (phase === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f4]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }
  if (phase === 'unverified') return <SessionUnverifiedPage />
  if (phase !== 'ready' || !user) return <Navigate to={ROUTES.login} replace />
  if (user.platformRole !== 'SUPER_ADMIN') {
    return (
      <StartupReady>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
          <h1 className="text-xl font-semibold text-dark-900">Backoffice</h1>
          <p className="mt-2 text-sm text-dark-700">Esta área es solo del dueño de la plataforma.</p>
        </main>
      </StartupReady>
    )
  }
  return <StartupReady>{children}</StartupReady>
}
