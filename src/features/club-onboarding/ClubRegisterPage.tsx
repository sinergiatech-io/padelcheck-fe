import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { RegistrationShell } from '@/features/auth/components/RegistrationShell'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'
import { AccountStep } from './AccountStep'
import { ClubStep } from './ClubStep'
import type { Proof } from './flow'
import { PlanStep } from './PlanStep'
import { StatusStep } from './StatusStep'
import { useClubOnboarding } from './use-club-onboarding'
import { VenueStep } from './VenueStep'
import { clearGoogleClubDraft, readGoogleClubDraft } from './google-club-draft'

/** `bearer`: an authenticated club admin whose setup is still PENDING resumes by session, not by the stored id. */
export function ClubRegisterPage({ bearer = false }: { bearer?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { isAuthenticated, retryValidation } = useAuth()
  const [googleDraft] = useState(() => !location.pathname.endsWith('/verify') ? readGoogleClubDraft() : undefined)
  const { flow, state } = useClubOnboarding(googleDraft)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [proof] = useState<Proof | undefined>(() => {
    if (!location.pathname.endsWith('/verify')) return undefined
    const value = { sessionId: params.get('sessionId') ?? '', email: params.get('email') ?? '', token: params.get('token') ?? '' }
    return value.sessionId && value.email && value.token ? value : undefined
  })
  useEffect(() => {
    // The one-time token never stays in the address bar, history or a reload.
    if (location.pathname.endsWith('/verify')) window.history.replaceState(null, '', ROUTES.registerClub)
  }, [location.pathname])
  useEffect(() => { void flow.init({ proof, bearer, googleSessionId: googleDraft?.sessionId }) }, [flow, proof, bearer, googleDraft])
  useEffect(() => { if (state.screen !== 'loading') titleRef.current?.focus() }, [state.screen])

  const returnUrl = params.get('returnUrl')
  const loginPath = `/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`
  const finish = () => {
    flow.finish()
    if (googleDraft) clearGoogleClubDraft()
    if (isAuthenticated) {
      // The cached principal still says PENDING: revalidate, then the access gate chooses the dashboard.
      retryValidation()
      navigate(ROUTES.authContinue, { replace: true })
    } else navigate(`/login?returnUrl=${encodeURIComponent(ROUTES.dashboard)}`, { replace: true })
  }

  const { screen } = state
  let body
  if (screen === 'loading') body = <div className="flex flex-1 items-center justify-center" role="status" aria-label="Cargando"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9CF38] border-t-transparent" /></div>
  else if (screen === 'account') body = <AccountStep flow={flow} state={state} titleRef={titleRef} loginPath={loginPath} />
  else if (screen === 'club') body = <ClubStep flow={flow} state={state} titleRef={titleRef} />
  else if (screen === 'plan') body = <PlanStep flow={flow} state={state} titleRef={titleRef} />
  else if (screen === 'venue') body = <VenueStep flow={flow} state={state} titleRef={titleRef} />
  else body = <StatusStep flow={flow} state={state} screen={screen} titleRef={titleRef} onLogin={() => navigate('/login')} onFinish={finish} />
  return <RegistrationShell hero={state.screen === 'account'}>{body}</RegistrationShell>
}
