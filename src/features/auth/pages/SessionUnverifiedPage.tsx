import { useEffect, useRef, useState } from 'react'
import { AUTH_COPY } from '@/features/auth/auth-copy'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { StartupReady } from '@/features/startup/StartupReady'

export function SessionUnverifiedPage() {
  const { retryValidation, logout } = useAuth()
  const title = useRef<HTMLHeadingElement>(null)
  const [exitFailed, setExitFailed] = useState(false)
  useEffect(() => { title.current?.focus() }, [])

  return (
    <StartupReady><AuthScreen recovery>
      <div className="min-h-0 flex-1 overflow-y-auto md:flex-none">
        <h1 ref={title} tabIndex={-1} className="text-2xl font-semibold leading-8 text-[#120F18] outline-none">{AUTH_COPY.sessionUnverified}</h1>
        {exitFailed && <p role="alert" className="mt-6 text-sm text-[#605E64]">No pudimos cerrar la sesión local. Volvé a intentarlo.</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-3 md:mt-8">
        <Button type="button" className="h-auto min-h-12 w-full whitespace-normal rounded-lg py-2.5" onClick={retryValidation}>
          {AUTH_COPY.retrySession}
        </Button>
        <Button type="button" variant="secondary" className="h-auto min-h-12 w-full whitespace-normal rounded-lg border-0 bg-[#E7E7E8] py-2.5 text-[#413F46] md:border md:border-dark-900 md:bg-transparent md:text-dark-900" onClick={() => {
          if (!logout()) setExitFailed(true)
        }}>
          {AUTH_COPY.backToAccess}
        </Button>
      </div>
    </AuthScreen></StartupReady>
  )
}
