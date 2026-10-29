import { AUTH_COPY, continueMessage } from '@/features/auth/auth-copy'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

export function ContinuePage() {
  const { destination, retryValidation, logout } = useAuth()
  const reason = destination?.kind === 'continue' ? destination.reason : 'unavailable'
  const message = continueMessage(reason)

  return (
    <AuthScreen>
      <h1 className="text-2xl font-semibold leading-8 text-[#120F18]">{message.title}</h1>
      {message.detail ? <p className="mt-3 text-base leading-6 text-[#605E64]">{message.detail}</p> : null}
      <div className="mt-8 flex flex-col gap-3">
        <Button type="button" className="h-12 w-full rounded-lg" onClick={retryValidation}>
          {AUTH_COPY.retry}
        </Button>
        <Button type="button" variant="secondary" className="h-12 w-full rounded-lg" onClick={() => logout()}>
          {AUTH_COPY.backToAccess}
        </Button>
      </div>
    </AuthScreen>
  )
}
