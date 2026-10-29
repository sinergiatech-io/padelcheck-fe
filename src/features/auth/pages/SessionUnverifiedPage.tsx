import { AUTH_COPY } from '@/features/auth/auth-copy'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

export function SessionUnverifiedPage() {
  const { retryValidation, logout } = useAuth()

  return (
    <AuthScreen>
      <h1 className="text-2xl font-semibold leading-8 text-[#120F18]">{AUTH_COPY.sessionUnverified}</h1>
      <div className="mt-8 flex flex-col gap-3">
        <Button type="button" className="h-12 w-full rounded-lg" onClick={retryValidation}>
          {AUTH_COPY.retrySession}
        </Button>
        <Button type="button" variant="secondary" className="h-12 w-full rounded-lg" onClick={() => logout()}>
          {AUTH_COPY.backToAccess}
        </Button>
      </div>
    </AuthScreen>
  )
}
