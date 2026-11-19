import { useState, type Ref } from 'react'
import { Link } from 'react-router-dom'
import eye from '@/assets/auth/eye.svg?url'
import eyeOn from '@/assets/auth/eye-on.svg?url'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import { NOTICE_COPY, type ClubOnboardingFlow, type FlowState } from './flow'
import { emptyAccount, validateAccount, type AccountDraft } from './model'
import { PrimaryButton, StepFrame, StepHeading, TextField } from './ui'

export function AccountStep({ flow, state, titleRef, loginPath }: { flow: ClubOnboardingFlow; state: FlowState; titleRef: Ref<HTMLHeadingElement>; loginPath: string }) {
  const [draft, setDraft] = useState<AccountDraft>({ ...emptyAccount })
  const [errors, setErrors] = useState<Partial<Record<keyof AccountDraft, string>>>({})
  const [show, setShow] = useState(false)
  const busy = state.busy === 'start'
  const fieldError = (key: keyof AccountDraft) => errors[key] ?? (key === 'email' ? state.fieldErrors.email : undefined)
  const set = (key: keyof AccountDraft) => (value: string) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    setErrors(current => current[key] ? { ...current, [key]: validateAccount(next)[key] } : current)
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (state.busy) return
    const invalid = validateAccount(draft)
    setErrors(invalid)
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    void flow.start({ firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), email: draft.email, password: draft.password, phone: draft.phone })
  }
  return <StepFrame as="form" onSubmit={submit} footer={<PrimaryButton type="submit" label={state.notice === 'account' ? 'Reintentar' : 'Crear cuenta'} loading={busy} />}>
    <StepHeading step="Paso 1 de 5" title="Tu club empieza acá" subtitle="Creá tu cuenta para empezar a organizar tus torneos" titleRef={titleRef} />
    {state.notice === 'account' && <RegistrationBanner tone="error" title={NOTICE_COPY.account.title} detail={NOTICE_COPY.account.detail} />}
    <div className="flex flex-col gap-4">
      <TextField id="firstName" label="Nombre" required value={draft.firstName} onChange={set('firstName')} error={fieldError('firstName')} disabled={busy} maxLength={100} autoComplete="given-name" placeholder="Tu nombre" />
      <TextField id="lastName" label="Apellido" required value={draft.lastName} onChange={set('lastName')} error={fieldError('lastName')} disabled={busy} maxLength={100} autoComplete="family-name" placeholder="Tu apellido" />
      <TextField id="email" label="Email" required type="email" inputMode="email" value={draft.email} onChange={set('email')} error={fieldError('email')} disabled={busy} maxLength={255} autoComplete="email" placeholder="nombre@correo.com" />
      <TextField id="password" label="Contraseña" required type={show ? 'text' : 'password'} value={draft.password} onChange={set('password')} error={fieldError('password')} disabled={busy} autoComplete="new-password" placeholder="Creá una contraseña"
        trailing={<button type="button" disabled={busy} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(value => !value)} className="absolute right-2 top-1 flex h-12 w-10 items-center justify-center"><img src={show ? eyeOn : eye} alt="" /></button>} />
      <TextField id="phone" label="Teléfono" optional type="tel" inputMode="tel" value={draft.phone} onChange={set('phone')} disabled={busy} maxLength={30} autoComplete="tel" placeholder="+54 11 1234-5678" />
    </div>
    <div className="flex min-h-11 items-center justify-center gap-2 text-sm font-medium"><span className="text-[#605E64]">¿Ya tenés cuenta?</span>
      <Link aria-disabled={busy} onClick={event => { if (busy) event.preventDefault() }} className="flex min-h-11 items-center px-3" to={loginPath}>Iniciar sesión</Link></div>
  </StepFrame>
}
