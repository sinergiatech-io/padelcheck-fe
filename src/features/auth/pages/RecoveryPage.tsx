import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecovery } from '../use-recovery'
import { recoveryCopy } from '../recovery-copy'
import { takeRecoveryProof } from '../recovery-proof'
import { Input } from '@/components/ui/input'
import { ButtonLoadingContent } from '@/components/ui/button-loading-content'
import court from '@/assets/auth/recovery/court.svg?url'
import logo from '@/assets/auth/logo.png'
import eye from '@/assets/auth/eye.svg?url'
import eyeOn from '@/assets/auth/eye-on.svg?url'
import success from '@/assets/auth/register-success.svg?url'
import './recovery.css'

export function RecoveryPage({ reset = false }: { reset?: boolean }) {
  // The wrapper is keyed by route; switching to email cannot retain an old proof.
  return <RecoveryForm key={reset ? 'reset' : 'request'} reset={reset} />
}
function RecoveryForm({ reset }: { reset: boolean }) {
  const [token] = useState(() => reset ? takeRecoveryProof() : undefined)
  const { machine, state, blocked } = useRecovery('WEB', token)
  const copy = recoveryCopy(state)
  const navigate = useNavigate()
  const title = useRef<HTMLHeadingElement>(null)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [height, setHeight] = useState(() => window.visualViewport?.height ?? window.innerHeight)
  const [keyboard, setKeyboard] = useState(false)
  useEffect(() => {
    const resize = () => { setHeight(window.visualViewport?.height ?? window.innerHeight); setKeyboard(window.innerHeight - (window.visualViewport?.height ?? window.innerHeight) > 100) }
    window.visualViewport?.addEventListener('resize', resize)
    return () => window.visualViewport?.removeEventListener('resize', resize)
  }, [])
  useEffect(() => { title.current?.focus() }, [state.stage])
  const leave = (path: string) => { machine.cancel(); navigate(path, { replace: true }) }
  const submit = async () => {
    if (state.stage === 'success') return leave('/login')
    if (state.stage === 'invalid') return leave('/forgot-password')
    await machine.run()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }
  const keys = state.stage === 'request' ? ['email'] as const : state.stage === 'password' ? ['password', 'confirmPassword'] as const : []
  const busyLabel = state.stage === 'request' ? 'Enviando…' : state.stage === 'password' ? 'Guardando…' : state.stage === 'cleanup' ? 'Cerrando sesión…' : 'Verificando enlace…'
  return <main className="password-recovery" style={{ height }}>
    <div className="recovery-shell">
      <div className={`recovery-brand ${keyboard ? 'with-keyboard' : ''}`}><img className="recovery-court" src={court} alt="" /><img className="recovery-logo" src={logo} alt="Padel Check" /></div>
      <form noValidate className="recovery-surface" onSubmit={event => { event.preventDefault(); void submit() }}>
        <div className="recovery-content">
          <h1 ref={title} tabIndex={-1}>{copy.title}</h1>
          {copy.detail && <p>{copy.detail}</p>}
          {state.notice && <div role="alert" className="recovery-notice"><strong>{state.notice}</strong><p>{state.retryAt > Date.now() ? 'Intentá de nuevo cuando termine el límite indicado por el servidor.' : state.stage === 'request' ? 'Intentá de nuevo en unos minutos.' : 'Intentá de nuevo.'}</p></div>}
          {state.stage === 'success' && <div role="status" className="recovery-success"><img src={success} alt="" /><div><strong>Dos formas de ingresar</strong><p>Podés usar tu email y contraseña. Si vinculaste Google, también sigue disponible.</p></div></div>}
          {keys.map(key => {
            const label = key === 'email' ? 'Email' : key === 'password' ? 'Nueva contraseña' : 'Confirmar contraseña'
            return <div className="recovery-field" key={key}><label htmlFor={key}>{label}</label><div className="relative"><Input id={key} value={state.fields[key]} disabled={state.busy}
              autoComplete={key === 'email' ? 'email' : 'new-password'} type={key === 'email' ? 'email' : visible[key] ? 'text' : 'password'}
              maxLength={key === 'email' ? 254 : undefined} placeholder={key === 'email' ? 'nombre@correo.com' : ''}
              aria-required="true" aria-invalid={!!state.errors[key]} aria-describedby={state.errors[key] ? `${key}-error` : key === 'password' ? 'password-help' : undefined}
              className={`recovery-input ${state.errors[key] ? 'recovery-input-error' : ''} ${key !== 'email' ? 'pr-14' : ''}`} onChange={event => machine.setField(key, event.target.value)} />
              {key !== 'email' && <button type="button" className="recovery-eye" aria-label={`${visible[key] ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} onClick={() => setVisible(v => ({ ...v, [key]: !v[key] }))}><img src={visible[key] ? eyeOn : eye} alt="" /></button>}</div>
              {state.errors[key] && <p role="alert" className="recovery-error" id={`${key}-error`}>{state.errors[key]}</p>}
            </div>
          })}
          {copy.help && <p id="password-help">{copy.help}</p>}
          <span className="sr-only" role="status">{state.busy ? busyLabel : ''}</span>
        </div>
        <div className="recovery-actions">
          {copy.action && <button type="submit" disabled={blocked || state.stage === 'inspect'} aria-busy={state.busy} aria-label={state.busy ? busyLabel : copy.action} className="recovery-primary"><ButtonLoadingContent loading={state.busy}>{copy.action}</ButtonLoadingContent></button>}
          {state.stage !== 'success' && <button type="button" className="recovery-secondary" onClick={() => leave('/login')}>Volver al acceso</button>}
        </div>
      </form>
    </div>
  </main>
}
