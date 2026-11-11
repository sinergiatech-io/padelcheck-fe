import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ButtonLoadingContent } from '@/components/ui/button-loading-content'
import { usePlayerRegistration, statusCopy, type Proof } from '@/features/auth/player-registration'
import { useRegistrationLocation } from '@/features/auth/use-registration-location'
import { browserPosition } from '@/features/auth/browser-location'
import { RegistrationLocationFields } from '@/features/auth/RegistrationLocationFields'
import court from '@/assets/auth/court.svg?url'
import logo from '@/assets/auth/logo.png'
import eye from '@/assets/auth/eye.svg?url'
import eyeOn from '@/assets/auth/eye-on.svg?url'
import chevron from '@/assets/auth/register-chevron.svg?url'
import info from '@/assets/auth/register-info.svg?url'
import success from '@/assets/auth/register-success.svg?url'
import error from '@/assets/auth/register-error.svg?url'
import warning from '@/assets/auth/register-warning.svg?url'
import './player-registration.css'

const tones = { info: 'border-[#C2D8FC] bg-[#EBF3FE]', success: 'border-[#BAEDCD] bg-[#E9F9EF]', error: 'border-[#FAC5C5] bg-[#FDECEC]', warning: 'border-[#FCE1B3] bg-[#FEF5E7]' }
function Banner({ title, detail, tone = 'error' }: { title: string; detail: string; tone?: keyof typeof tones }) {
  return <div role="status" className={`flex items-center gap-3 rounded-[8px] border p-3 ${tones[tone]}`}>
    <div className="flex h-6 w-6 shrink-0 items-center justify-center"><img src={{ info, success, error, warning }[tone]} alt="" /></div>
    <div><p className="text-sm font-semibold leading-5">{title}</p><p className="mt-0.5 text-xs leading-4 text-[#605E64]">{detail}</p></div>
  </div>
}
function Shell({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState(() => window.visualViewport?.height ?? window.innerHeight)
  const [keyboard, setKeyboard] = useState(false)
  useEffect(() => {
    const update = () => {
      setViewport(window.visualViewport?.height ?? window.innerHeight)
      setKeyboard(window.innerHeight - (window.visualViewport?.height ?? window.innerHeight) > 100)
    }
    window.visualViewport?.addEventListener('resize', update)
    return () => window.visualViewport?.removeEventListener('resize', update)
  }, [])
  return <div className="player-registration flex justify-center bg-[#120F18] text-[#120F18]">
    <div className="flex w-full max-w-[402px] flex-col overflow-hidden" style={{ height: viewport, paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="relative shrink-0 overflow-hidden" style={{ height: keyboard ? 72 : 124 }}>
        <img src={court} alt="" className="absolute left-0 top-0 h-[172px] w-full" />
        <img src={logo} alt="Padel Check" className="absolute left-1/2 -translate-x-1/2 object-contain" style={{ top: keyboard ? 8 : 16, height: keyboard ? 55 : 91, width: keyboard ? 56 : 92 }} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl bg-[#FEFEFE]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>{children}</div>
    </div>
  </div>
}
const fieldClass = 'h-14 w-full rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-4 text-sm font-medium leading-5 text-[#120F18] shadow-none placeholder:text-[#605E64] focus-visible:ring-2 focus-visible:ring-[#C9CF38]'

export function PlayerRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [initialProof] = useState<Proof | undefined>(() => location.pathname.endsWith('/verify') ? {
    sessionId: params.get('sessionId') ?? '', email: params.get('email') ?? '', token: params.get('token') ?? '',
  } : undefined)
  const registration = usePlayerRegistration('WEB', initialProof)
  const { draft, updateField, errors, categories, catalogState, retryCatalog, stage, proof, busy, busyAction, notice, resent, action } = registration
  const geography = useRegistrationLocation(browserPosition, stage === 'form')
  const [showPassword, setShowPassword] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnUrl = params.get('returnUrl')
  const loginPath = `/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`
  useEffect(() => {
    if (initialProof) window.history.replaceState(null, '', location.pathname)
  }, [initialProof, location.pathname])
  useEffect(() => { titleRef.current?.focus() }, [stage])
  const setField = updateField
  const button = (label: string, onClick: () => void, type: 'submit' | 'button' = 'button') => <button type={type} onClick={onClick}
    disabled={busy || stage === 'verifying'} aria-busy={busy || stage === 'verifying'} aria-label={busy ? `${label}…` : label}
    className={`flex h-12 w-full shrink-0 items-center justify-center rounded-[8px] text-sm font-medium ${busy ? 'bg-[#EEF0C1]' : 'bg-[#C9CF38]'}`}>
    <ButtonLoadingContent loading={busy || stage === 'verifying'}>{label}</ButtonLoadingContent>
  </button>
  const heading = (title: string, subtitle: string) => <div className="flex flex-col gap-2"><h1 ref={titleRef} tabIndex={-1} className="text-xl font-bold leading-7 outline-none">{title}</h1><p className="text-base leading-6 text-[#605E64]">{subtitle}</p></div>
  if (stage !== 'form') {
    const [title, subtitle, banner, detail, label, tone] = statusCopy[busyAction === 'complete' ? 'activating' : stage]
    const act = () => {
      if (stage === 'active') return
      if (stage === 'invalid') { registration.reset(); navigate('/register/player'); return }
      void action(stage === 'verified' || stage === 'activationError' ? 'complete' : stage === 'verifyError' ? 'verify' : 'resend')
    }
    return <Shell><div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pt-6">
      {heading(title, subtitle + (stage === 'pending' ? `${proof?.email}.` : ''))}
      <Banner title={notice ?? (resent ? "Email reenviado" : banner)} detail={notice ? "Intentá de nuevo." : resent ? "Revisá tu bandeja de entrada y la carpeta de spam." : detail} tone={notice ? "error" : resent ? "success" : tone} />
      <div className="mt-auto flex flex-col gap-2 pb-8 pt-4">
        {label && (stage === 'active' ? <Link className="flex h-12 items-center justify-center rounded-[8px] bg-[#C9CF38] text-sm font-medium" to={loginPath}>{label}</Link> : button(notice ? "Reintentar" : label, act))}
        {stage === 'pending' && <Link className="flex h-11 items-center justify-center text-sm font-medium" to={loginPath}>Iniciar sesión</Link>}
      </div>
    </div></Shell>
  }
  return <Shell><form noValidate className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 pb-8 pt-6" onSubmit={event => {
    event.preventDefault(); geography.model.validate(); void action('start', geography.model.request()).then(() => requestAnimationFrame(() => {
      const invalid = [...document.querySelectorAll<HTMLElement>('[aria-invalid="true"]')]
      ;(invalid.find(field => !field.hasAttribute('disabled')) ?? invalid[0])?.focus()
    }))
  }}>
    {heading('Creá tu cuenta de jugador', 'Completá tus datos y elegí tu categoría para empezar.')}
    {notice && <Banner title={notice} detail="Intentá de nuevo." />}
    <div className="flex flex-col gap-3">
      {(['firstName', 'lastName', 'email', 'password', 'gender', 'baseCategoryId'] as const).map(key => {
        const label = { firstName: 'Nombre', lastName: 'Apellido', email: 'Email', password: 'Contraseña', gender: 'Sexo', baseCategoryId: 'Categoría' }[key]
        return <div key={key} className="flex flex-col gap-2"><label htmlFor={key} className="text-sm font-medium leading-5">{label}<span className="ml-0.5 text-[#EF4444]" aria-hidden="true">*</span></label>
          {key === 'gender' || key === 'baseCategoryId' ? <Select value={draft[key]} onValueChange={value => setField(key, value)} disabled={busy || key === 'baseCategoryId' && catalogState !== 'ready'} required>
            <SelectTrigger id={key} aria-label={label} aria-required="true" aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} className={`${fieldClass} data-[placeholder]:text-[#605E64] ${errors[key] ? 'border-[#EF4444]' : ''}`} indicator={<img src={chevron} alt="" />}>
              <SelectValue placeholder={key === 'gender' ? 'Seleccioná tu sexo' : catalogState === 'loading' ? 'Cargando categorías…' : 'Seleccioná tu categoría'} />
            </SelectTrigger><SelectContent>{(key === 'gender' ? [{ id: 'MALE', name: 'Caballeros' }, { id: 'FEMALE', name: 'Damas' }] : categories).map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
          </Select> : <div className="relative"><Input id={key} required disabled={busy} value={draft[key]} maxLength={key === 'firstName' || key === 'lastName' ? 100 : key === 'email' ? 255 : undefined}
            type={key === 'password' && !showPassword ? 'password' : key === 'email' ? 'email' : 'text'} autoComplete={{ firstName: 'given-name', lastName: 'family-name', email: 'email', password: 'new-password' }[key]}
            placeholder={{ firstName: 'Tu nombre', lastName: 'Tu apellido', email: 'nombre@correo.com', password: 'Creá una contraseña' }[key]}
            aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined}
            className={`${fieldClass} ${errors[key] ? 'border-[#EF4444]' : ''} ${key === 'password' ? 'pr-14' : ''}`} onChange={event => setField(key, event.target.value)} />
            {key === 'password' && <button type="button" disabled={busy} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1 flex h-12 w-10 items-center justify-center"><img src={showPassword ? eyeOn : eye} alt="" /></button>}
          </div>}
          {errors[key] && <p id={`${key}-error`} className="text-right text-sm font-medium leading-5 text-[#AA3030]">{errors[key]}</p>}
          {key === 'baseCategoryId' && catalogState === 'error' && <div role="status"><p className="text-sm text-[#AA3030]">No pudimos cargar las categorías.</p><button type="button" onClick={retryCatalog} className="min-h-11 text-sm underline">Reintentar</button></div>}
        </div>
      })}
      <RegistrationLocationFields model={geography.model} state={geography.state} disabled={busy} />
    </div>
    <p className="text-base leading-6 text-[#605E64]">Vas a necesitar verificar tu email para activar tu cuenta.</p>
    <div className="flex flex-col gap-2">{button(notice ? 'Reintentar' : 'Crear cuenta', () => {}, 'submit')}
      <div className="flex min-h-11 items-center justify-center gap-2 text-sm font-medium"><span className="text-[#605E64]">¿Ya tenés cuenta?</span><Link aria-disabled={busy} onClick={event => { if (busy) event.preventDefault() }} className={`flex min-h-11 items-center px-3 ${busy ? 'text-[#929195]' : ''}`} to={loginPath}>Iniciar sesión</Link></div>
    </div>
  </form></Shell>
}
