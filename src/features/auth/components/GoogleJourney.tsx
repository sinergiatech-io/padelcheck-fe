
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseCatalog, type Category } from '@/features/club/category-policy/category-policy'
import { useAuth } from '@/context/AuthContext'
import { API_BASE, ROUTES } from '@/lib/constants'
import { ApiError, createApiClient } from '@/lib/http-client'
import { Button } from '@/components/ui/button'
import { ButtonLoadingContent } from '@/components/ui/button-loading-content'
import { AuthScreen } from './AuthScreen'
import { GoogleProviderButton } from './GoogleProviderButton'
import { RegistrationBanner } from './RegistrationShell'
import {
  addAccountActivity, confirmGoogleEmail, exchangeGoogleIdentity, resolveGoogleContinuation,
  type AccessActivity, type GoogleAuthResponse, type GoogleContinuation,
} from '../api/google'
import { currentSessionGeneration } from '../session-generation'
import { rememberGoogleClubDraft } from '@/features/club-onboarding/google-club-draft'
import person from '@/assets/auth/person.svg?url'
import club from '@/assets/auth/club.svg?url'
import chevron from '@/assets/auth/register-chevron.svg?url'
import spinner from '@/assets/ui/button-spinner.svg?url'

const unauthenticated = createApiClient({ baseUrl: API_BASE, getToken: () => null })

let emailProof: string | undefined
if (typeof window !== 'undefined' && window.location.pathname === '/auth/google/verify-email') {
  const values = new URLSearchParams(window.location.search).getAll('token')
  emailProof = values.length === 1 ? values[0] : ''
  window.history.replaceState(window.history.state, '', '/auth/google/verify-email')
}

interface JourneyState {
  busy: boolean
  error?: string
  response?: GoogleAuthResponse
  success?: string
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.kind === 'timeout') {
    return 'La validación tardó demasiado. Volvé a intentar en unos momentos.'
  }
  switch (error instanceof ApiError ? error.code : undefined) {
    case 'AUTH_EMAIL_OWNERSHIP_EXPIRED': return 'El enlace venció. Volvé al acceso para solicitar otro.'
    case 'AUTH_EMAIL_OWNERSHIP_USED': return 'Este enlace ya se usó. Volvé al acceso para continuar.'
    case 'AUTH_EMAIL_OWNERSHIP_INVALID': return 'El enlace de verificación no es válido.'
    case 'AUTH_GOOGLE_INVALID_TOKEN':
    case 'AUTH_CONTINUATION_INVALID': return 'Tu acceso venció. Volvé a iniciar sesión con Google.'
    case 'AUTH_ACCOUNT_BLOCKED': return 'Tu cuenta está bloqueada.'
    case 'AUTH_ACCOUNT_UNAVAILABLE': return 'Tu cuenta no está disponible.'
    case 'AUTH_RATE_LIMITED': return 'Hiciste demasiados intentos. Esperá un momento y volvé a probar.'
    case 'AUTH_ACTIVITY_CONFLICT': return 'Esta actividad o identidad ya está vinculada.'
    default: return 'No pudimos continuar. Revisá tu conexión e intentá de nuevo.'
  }
}

function useGoogleJourney() {
  const [state, setState] = useState<JourneyState>({ busy: false })
  const request = useRef<AbortController>()
  const lastAction = useRef<(() => void)>()
  const resultGeneration = useRef<number>()
  const { login, entryPath } = useAuth()
  const navigate = useNavigate()
  useEffect(() => () => request.current?.abort(), [])

  const proceed = (response: GoogleAuthResponse) => {
    if (resultGeneration.current !== currentSessionGeneration()) {
      setState({ busy: false, error: "Tu sesión cambió. Volvé al acceso para continuar." })
      return
    }
    if (response.outcome === 'SESSION') {
      if (!login(response.accessToken, response.context, response.expiresIn)) return
      navigate(response.context.platformRole === 'SUPER_ADMIN' ? '/owner'
        : entryPath(response.context, response.returnPath), { replace: true })
    } else if (response.continuation.purpose === 'COMPLETE_CLUB_ONBOARDING') {
      const { token, expiresIn, progress } = response.continuation
      if (!progress.onboardingSessionId || !rememberGoogleClubDraft(progress.onboardingSessionId, token, expiresIn)) {
        setState({ busy: false, error: 'No pudimos guardar la continuación de tu club.' })
        return
      }
      navigate(ROUTES.registerClub, { replace: true })
    } else setState({ busy: false, response })
  }

  const run = (
    send: (signal: AbortSignal) => Promise<GoogleAuthResponse>,
    label?: string,
    repeatable = true,
  ) => {
    if (request.current && !request.current.signal.aborted) return
    const controller = new AbortController()
    request.current = controller
    lastAction.current = repeatable ? () => run(send, label) : undefined
    const generation = currentSessionGeneration()
    setState(current => ({ ...current, busy: true, error: undefined }))
    void send(controller.signal).then(response => {
      if (controller.signal.aborted || generation !== currentSessionGeneration()) return
      lastAction.current = undefined
      resultGeneration.current = generation
      const success = label
        ?? (response.identityChange === 'GOOGLE_LINKED' ? 'Cuenta vinculada'
          : response.identityChange === 'ACCOUNT_ACTIVATED' ? 'Cuenta activada' : undefined)
      if (success) setState({ busy: false, response, success })
      else proceed(response)
    }).catch(error => {
      if (!controller.signal.aborted && generation === currentSessionGeneration()) {
        setState(current => ({ ...current, busy: false, error: errorMessage(error) }))
      }
    }).finally(() => {
      if (request.current === controller) {
        request.current = undefined
        if (!controller.signal.aborted) setState(current => current.busy ? { ...current, busy: false } : current)
      }
    })
  }
  const close = () => {
    request.current?.abort()
    request.current = undefined
    lastAction.current = undefined
    resultGeneration.current = undefined
    setState({ busy: false })
  }
  return { state, run, close, proceed, retry: lastAction.current }
}

type Journey = ReturnType<typeof useGoogleJourney>

export function GoogleEntry({ intent, returnPath, disabled = false }: {
  intent?: AccessActivity; returnPath?: string | null; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const journey = useGoogleJourney()
  const close = () => {
    journey.close()
    setOpen(false)
  }
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [open])
  return (
    <>
      <GoogleProviderButton disabled={disabled || open} onCredential={idToken => {
        setOpen(true)
        journey.run(signal => exchangeGoogleIdentity({ idToken, intent, returnPath: returnPath ?? undefined }, signal),
          undefined, false)
      }} />
      {open && <dialog ref={dialog} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-auto bg-[#120F18]"
        aria-label="Continuar con Google" onCancel={event => { event.preventDefault(); close() }}>
        <GoogleJourneyScreen journey={journey} onClose={close} />
      </dialog>}
    </>
  )
}

export function GoogleVerifyEmailPage() {
  const navigate = useNavigate()
  const [proof, setProof] = useState(() => emailProof ?? '')
  const journey = useGoogleJourney()
  useEffect(() => {
    emailProof = undefined
    if (!proof) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      journey.run(signal => confirmGoogleEmail(proof, signal), "Email confirmado")
      setProof("")
    })
    return () => { cancelled = true }
  // Confirm the ownership proof once per link, including when React remounts effects in development.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proof])
  return <GoogleJourneyScreen journey={journey} onClose={() => navigate(ROUTES.login, { replace: true })} />
}


function GoogleJourneyScreen({ journey, onClose }: { journey: Journey; onClose: () => void }) {
  const { state: { response, busy, error, success }, run, proceed, retry } = journey
  const continuation = !success && response?.outcome === 'CONTINUATION' ? response.continuation : undefined
  const profile = continuation?.purpose === 'COMPLETE_PLAYER_PROFILE' ? continuation : undefined
  const [showPlayerFields, setShowPlayerFields] = useState(false)
  const playerName = [profile?.progress.givenName, profile?.progress.familyName].filter(Boolean).join(' ')
  const reviewProfile = !!profile && !showPlayerFields
  const heading = useRef<HTMLHeadingElement>(null)
  const send = (action: 'SEND_EMAIL_OWNERSHIP' | 'LINK_GOOGLE_ACCOUNT') => {
    if (continuation) run(signal => resolveGoogleContinuation(continuation.token, { action }, signal))
  }
  const emailSent = continuation?.progress.allowedActions.includes('CONFIRM_EMAIL_OWNERSHIP')
  let title = success ?? (busy ? 'Estamos validando tu acceso…' : error ? 'No pudimos continuar' : 'Enlace no disponible')
  let detail: string | undefined
  let primary = success && response ? { label: 'Continuar', action: () => proceed(response) } : undefined
  if (continuation?.purpose === 'LINK_GOOGLE_ACCOUNT') {
    title = 'Tu cuenta, como siempre'
    detail = 'Google confirmó tu email. Continuá para vincular este acceso a tu cuenta de PadelCheck.'
    primary = { label: 'Vincular y continuar', action: () => send('LINK_GOOGLE_ACCOUNT') }
  }
  if (continuation?.purpose === 'EMAIL_VERIFICATION_REQUIRED') {
    title = emailSent ? 'Revisá tu email' : 'Confirmá tu email'
    detail = emailSent ? 'Te enviamos un enlace de un solo uso. Abrilo para continuar.'
      : 'Para continuar con esta cuenta de Google, necesitamos verificar tu correo.'
    primary = { label: emailSent ? 'Reenviar enlace' : 'Enviar enlace', action: () => send('SEND_EMAIL_OWNERSHIP') }
  }
  if (continuation?.purpose === 'SELECT_ACTIVITY') {
    title = 'Elegí tu perfil'
    detail = 'Seleccioná la opción que mejor te represente'
  }
  if (profile) {
    title = reviewProfile ? 'Completá tu perfil de jugador' : 'Completá tus datos deportivos'
    detail = reviewProfile ? 'Faltan tus datos deportivos para completar el registro.' : undefined
    if (reviewProfile) primary = { label: 'Completar datos deportivos', action: () => setShowPlayerFields(true) }
  }
  useEffect(() => { heading.current?.focus() }, [title])
  const validating = busy && !continuation && !primary

  return <AuthScreen identity>
    <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold leading-8 outline-none">{title}</h1>
    {validating && <>
      <div className="mt-5"><RegistrationBanner title="Comprobando tu identidad"
        detail="Esperá un momento. No hace falta iniciar el acceso otra vez." tone="info" clock /></div>
      <div className="flex min-h-28 flex-1 items-center justify-center">
        <img src={spinner} alt="" width={40} height={40}
          className="animate-spin [animation-duration:800ms] motion-reduce:animate-none" />
      </div>
    </>}
    {detail && <p className="mt-4 text-base leading-6 text-[#605E64]">{detail}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg border border-[#FAC5C5] bg-[#FDECEC] p-3 text-sm text-[#AA3030]">{error}</p>}
    {reviewProfile && <>
      <div className="mt-5"><RegistrationBanner title="Identidad confirmada" detail={profile.progress.emailHint ?? undefined} tone="success" /></div>
      <p className="mt-5 text-base leading-6 text-[#605E64]">Usamos únicamente tus datos guardados. Revisá tu nombre, rama y categoría en el siguiente paso.</p>
    </>}
    {!profile && continuation?.progress.emailHint && <div className="mt-5 rounded-lg border border-[#BED4FF] bg-[#EAF1FB] p-3 text-sm">
      <p className="font-semibold">{continuation.purpose === 'LINK_GOOGLE_ACCOUNT' ? 'Mismo email acreditado' : 'Un paso para cuidar tu cuenta'}</p>
      <p className="mt-1 text-xs text-[#605E64]">{continuation.progress.emailHint}</p>
    </div>}
    {continuation?.purpose === 'LINK_GOOGLE_ACCOUNT' && <p className="mt-5 leading-6 text-[#605E64]">Conservás tu perfil, clubes e historial. También podés seguir usando tu contraseña.</p>}
    {continuation?.purpose === 'SELECT_ACTIVITY' && <div className="mt-8 grid gap-4">
      {([{ intent: 'PLAYER', label: 'Jugador', icon: person, copy: 'Participá en torneos y seguí tus resultados.' },
        { intent: 'CLUB', label: 'Administrador de club', icon: club, copy: 'Registrá tu club y organizá torneos.' }] as const).map(item =>
          <button type="button" disabled={busy} key={item.intent} onClick={() =>
            run(signal => resolveGoogleContinuation(continuation.token, { action: 'SELECT_ACTIVITY', activity: item.intent }, signal))}
            className="flex min-h-[120px] items-center gap-3 rounded-lg border border-[#E7E7E8] bg-white p-4 text-left focus-visible:ring-2">
            <span className="rounded-lg bg-[#EEF0C1] p-2"><img src={item.icon} alt="" width={24} height={24} /></span>
            <span className="flex flex-1 flex-col gap-1"><strong>{item.label}</strong><span className="text-sm text-[#605E64]">{item.copy}</span></span>
            <img className="-rotate-90" src={chevron} alt="" width={20} height={20} />
          </button>)}
    </div>}
    {profile && <div className={showPlayerFields ? 'flex flex-1 flex-col' : 'hidden'}>
      {playerName && <dl className="mt-6 rounded-lg border border-[#E7E7E8] bg-[#F7F7F7] p-3">
        <dt className="text-sm font-medium text-[#605E64]">Nombre y apellido</dt>
        <dd className="mt-1 break-words text-base font-medium">{playerName}</dd>
      </dl>}
      <GooglePlayerFields key={profile.token} progress={profile.progress} busy={busy} onBack={() => setShowPlayerFields(false)} submit={(gender, category) =>
        run(signal => resolveGoogleContinuation(profile.token, { action: 'COMPLETE_PLAYER_PROFILE', gender, baseCategoryId: category }, signal))} />
    </div>}
    {!validating && (!profile || reviewProfile) && <div className="mt-auto flex flex-col gap-2 pt-8">
      {primary && <Button type="button" disabled={busy} className="h-12" onClick={primary.action}>
        <ButtonLoadingContent loading={busy}>{primary.label}</ButtonLoadingContent>
      </Button>}
      {!primary && !continuation && error && retry && <Button type="button" className="h-12" onClick={retry}>Reintentar</Button>}
      <Button type="button" variant="secondary" className="h-12" onClick={onClose}>{profile ? 'Volver' : 'Volver al acceso'}</Button>
    </div>}
  </AuthScreen>
}

type Gender = 'MALE' | 'FEMALE'

export function AddPlayerActivity({ onClose }: { onClose: () => void }) {
  const journey = useGoogleJourney()
  return <AuthScreen identity>
    <h1 className="text-2xl font-semibold">Creá tu perfil de jugador</h1>
    <p className="mt-4 text-[#605E64]">Completá tus datos deportivos para usar tu cuenta como jugador.</p>
    {journey.state.error && <p role="alert" className="mt-4 text-[#AA3030]">{journey.state.error}</p>}
    <GooglePlayerFields progress={{}} busy={journey.state.busy} submit={(gender, baseCategoryId) =>
      journey.run(signal => addAccountActivity({ activity: 'PLAYER', gender, baseCategoryId }, signal))} />
    <Button type="button" variant="secondary" className="mt-3 h-12" onClick={onClose}>Cancelar</Button>
  </AuthScreen>
}

export function useAddClubActivity() {
  const journey = useGoogleJourney()
  return { ...journey.state, addClub: () => journey.run(signal => addAccountActivity({ activity: 'CLUB' }, signal)) }
}

function GooglePlayerFields({ progress, busy, submit, onBack }: {
  progress: Pick<GoogleContinuation['progress'], 'gender' | 'baseCategoryId'>; busy: boolean
  submit: (gender: Gender, category: string) => void
  onBack?: () => void
}) {
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE'>(progress.gender ?? '')
  const [category, setCategory] = useState(progress.baseCategoryId ?? '')
  const [categories, setCategories] = useState<Category[]>([])
  const [catalogError, setCatalogError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (progress.baseCategoryId) return
    const controller = new AbortController()
    void unauthenticated.get<unknown>('/categories', { signal: controller.signal }).then(value => {
      const catalog = parseCatalog(value)
      if (!catalog?.length) throw new Error('Unavailable category catalog')
      if (!controller.signal.aborted) setCategories(catalog)
    }).catch(() => { if (!controller.signal.aborted) setCatalogError(true) })
    return () => controller.abort()
  }, [progress.baseCategoryId, attempt])

  return <form className="mt-6 flex flex-1 flex-col gap-4" onSubmit={event => {
    event.preventDefault()
    if (gender && category) submit(gender, category)
  }}>
    {!progress.gender && <label className="grid gap-2 text-sm font-medium">
      <span>Sexo <span aria-hidden="true" className="text-[#EF4444]">*</span></span>
      <select className="h-14 rounded-lg border border-[#929195] bg-white p-4" required value={gender}
        onChange={event => setGender(event.target.value === 'MALE' || event.target.value === 'FEMALE' ? event.target.value : '')}>
        <option value="">Seleccioná tu sexo</option><option value="MALE">Caballeros</option><option value="FEMALE">Damas</option>
      </select>
    </label>}
    {!progress.baseCategoryId && <label className="grid gap-2 text-sm font-medium">
      <span>Categoría <span aria-hidden="true" className="text-[#EF4444]">*</span></span>
      <select className="h-14 rounded-lg border border-[#929195] bg-white p-4" required value={category}
        onChange={event => setCategory(event.target.value)} disabled={!categories.length}>
        <option value="">{categories.length ? 'Seleccioná tu categoría' : 'Cargando categorías…'}</option>
        {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>}
    {catalogError && <button type="button" className="min-h-11 self-start underline" onClick={() => {
      setCatalogError(false)
      setAttempt(value => value + 1)
    }}>Reintentar la carga de categorías</button>}
    <div className="mt-auto flex flex-col gap-2">
      <Button type="submit" className="h-12" disabled={busy || !gender || !category}>
        <ButtonLoadingContent loading={busy}>Continuar</ButtonLoadingContent>
      </Button>
      {onBack && <Button type="button" variant="secondary" disabled={busy} className="h-12" onClick={onBack}>Volver</Button>}
    </div>
  </form>
}
