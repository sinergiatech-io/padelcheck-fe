import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import logo from '@/assets/auth/logo.png'
import { ROUTES } from '@/lib/constants'
import { CloseIcon, MenuIcon } from './PricingIcons'
import { focusRing } from './styles'

/** Public pattern F links. FAQ is intentionally omitted (document-scope FAQ exception, KAN-228 M0). */
const LINKS = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.pricing, label: 'Planes' },
  { to: ROUTES.login, label: 'Iniciar sesión' },
] as const


function Logo({ size = 56 }: { size?: number }) {
  return <img src={logo} alt="" width={size} height={size} className="block object-contain" style={{ width: size, height: size }} />
}

function PublicMenu({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('a,button')?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a,button'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div id={id} ref={panel} role="dialog" aria-modal="true" aria-label="Menú" className="fixed inset-0 z-50 flex flex-col bg-[#120F18] font-sans text-[#FAFAEB]">
      <div className="mx-auto flex h-[88px] w-full max-w-[768px] shrink-0 items-center justify-between px-4 md:px-8">
        <Link to={ROUTES.home} aria-label="Padel Check, inicio" onClick={onClose} className={`rounded-full ${focusRing}`}><Logo /></Link>
        <button type="button" aria-label="Cerrar menú" onClick={onClose} className={`-mr-2.5 flex h-11 w-11 items-center justify-center rounded-lg ${focusRing}`}>
          <CloseIcon />
        </button>
      </div>
      <nav aria-label="Navegación pública" className="mx-auto w-full max-w-[768px] px-4 md:px-8">
        <ul className="border-t border-[#2E2B33]">
          {LINKS.map(({ to, label }) => (
            <li key={to} className="border-b border-[#2E2B33]">
              <Link
                to={to}
                onClick={onClose}
                aria-current={to === ROUTES.pricing ? 'page' : undefined}
                className={`flex min-h-14 items-center justify-between text-base font-medium leading-6 ${focusRing}`}
              >
                {label}
                <span aria-hidden="true" className={`h-0.5 w-4 rounded-full ${to === ROUTES.pricing ? 'bg-[#C9CF38]' : 'bg-[#605E64]'}`} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>,
    document.body,
  )
}

export function PricingHeader() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }, [])

  return (
    <header className="mx-auto flex h-[88px] w-full max-w-[768px] items-center justify-between px-4 md:px-8">
      <Link to={ROUTES.home} aria-label="Padel Check, inicio" className={`rounded-full ${focusRing}`}><Logo /></Link>
      <div className="flex items-center gap-2">
        <Link to={ROUTES.login} className={`flex h-11 items-center rounded-lg px-2 text-sm font-medium leading-5 text-[#FAFAEB] ${focusRing}`}>
          Iniciar sesión
        </Link>
        <button
          ref={trigger}
          type="button"
          aria-label="Abrir menú"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen(true)}
          className={`-mr-2.5 flex h-11 w-11 items-center justify-center rounded-lg ${focusRing}`}
        >
          <MenuIcon />
        </button>
      </div>
      <PublicMenu id={menuId} open={open} onClose={close} />
    </header>
  )
}

export function PricingFooter() {
  return (
    <footer className="mx-auto w-full max-w-[768px] px-4 pb-10 pt-16 md:px-8">
      <Link to={ROUTES.home} aria-label="Padel Check, inicio" className={`inline-block rounded-full ${focusRing}`}><Logo size={48} /></Link>
      <nav aria-label="Enlaces del pie" className="mt-8">
        <ul className="flex flex-col gap-1">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} className={`flex min-h-9 items-center justify-between text-sm font-medium leading-5 text-[#FAFAEB] ${focusRing}`}>
                {label}
                <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-[#C9CF38]" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  )
}

export function PricingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#120F18] font-sans text-[#FAFAEB]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <PricingHeader />
      <main className="flex-1">{children}</main>
      <PricingFooter />
    </div>
  )
}
