
import { useEffect, useRef, useState } from 'react'

interface Credential {
  credential: string
  state?: string
}

interface GoogleIdentity {
  initialize(config: { client_id: string; callback: (response: Credential) => void; ux_mode: 'popup' }): void
  renderButton(node: HTMLElement, config: {
    theme: 'outline'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; width: number; locale: string
    state: string; click_listener: () => void
  }): void
}

const scriptUrl = 'https://accounts.google.com/gsi/client'
let loading: Promise<GoogleIdentity> | undefined
const readIdentity = () =>
  (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id

function loadIdentity() {
  const ready = readIdentity()
  if (ready) return Promise.resolve(ready)
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => fail(), 15000)
    function fail() {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('Google Identity Services unavailable'))
    }
    script.src = scriptUrl
    script.async = true
    script.onload = () => {
      window.clearTimeout(timer)
      const identity = readIdentity()
      if (identity) resolve(identity)
      else fail()
    }
    script.onerror = fail
    document.head.append(script)
  }).catch(error => {
    loading = undefined
    throw error
  })
  return loading
}

export function GoogleProviderButton({
  onCredential, disabled,
}: { onCredential: (idToken: string) => void; disabled: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const listener = useRef(onCredential)
  const inactive = useRef(disabled)
  listener.current = onCredential
  inactive.current = disabled
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  useEffect(() => {
    const node = container.current
    if (!clientId || !node) return
    const state = crypto.randomUUID()
    let current = true
    let clicked = false
    let timer: number | undefined
    let observer: ResizeObserver | undefined
    void loadIdentity().then(identity => {
      if (!current) return
      identity.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: response => {
          if (!current || !clicked || inactive.current || response.state !== state || !response.credential) return
          clicked = false
          window.clearTimeout(timer)
          setWaiting(false)
          listener.current(response.credential)
        },
      })
      let lastWidth = 0
      const render = () => {
        const width = Math.min(400, Math.floor(node.clientWidth))
        if (width < 100 || width === lastWidth || clicked) return
        lastWidth = width
        node.replaceChildren()
        identity.renderButton(node, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width, locale: 'es',
          state,
          click_listener: () => {
            if (inactive.current || clicked) return
            clicked = true
            setWaiting(true)
            timer = window.setTimeout(() => {
              if (!current) return
              clicked = false
              setWaiting(false)
              setFailed(true)
            }, 90000)
          },
        })
      }
      render()
      observer = new ResizeObserver(render)
      observer.observe(node)
    }).catch(() => { if (current) setFailed(true) })
    return () => {
      current = false
      window.clearTimeout(timer)
      observer?.disconnect()
      node.replaceChildren()
    }
  }, [clientId, attempt])

  useEffect(() => {
    if (container.current) container.current.inert = disabled || waiting || failed
  }, [disabled, waiting, failed])

  if (!clientId) return null
  return (
    <div className="flex w-full flex-col gap-2">
      <div ref={container} className="min-h-10 w-full" />
      {waiting && <p role="status" className="text-sm text-[#605E64]">Completá el acceso en la ventana de Google.</p>}
      {(failed || waiting) && (
        <button type="button" className="min-h-11 self-start text-sm font-medium underline" onClick={() => {
          setFailed(false)
          setWaiting(false)
          setAttempt(value => value + 1)
        }}>
          {waiting ? 'Cancelar' : 'Reintentar Google'}
        </button>
      )}
      {failed && <p role="alert" className="text-sm text-[#AA3030]">No pudimos completar el acceso con Google. Permití las ventanas emergentes e intentá de nuevo.</p>}
    </div>
  )
}
