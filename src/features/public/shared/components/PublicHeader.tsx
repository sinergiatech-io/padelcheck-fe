import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'

const navLinks = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.pricing, label: 'Planes' },
  { to: ROUTES.faq, label: 'FAQ' },
] as const

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-divider bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link to={ROUTES.home} className="flex min-w-0 items-center gap-2 text-body font-semibold text-dark-900">
          {APP_NAME}
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'text-body-sm font-medium text-dark-700 transition-colors hover:text-dark-900',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex md:gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={ROUTES.login}>Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={ROUTES.register}>Registrarse</Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen} side="right">
        <div className="flex h-14 shrink-0 items-center border-b border-divider px-4">
          <span className="text-body font-semibold text-dark-900">{APP_NAME}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-md px-3 py-3 text-body font-medium text-dark-800 hover:bg-background"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 border-t border-divider p-3">
          <Button className="w-full" variant="secondary" asChild>
            <Link to={ROUTES.login} onClick={() => setMenuOpen(false)}>
              Iniciar sesión
            </Link>
          </Button>
          <Button className="mt-2 w-full" asChild>
            <Link to={ROUTES.register} onClick={() => setMenuOpen(false)}>
              Registrarse
            </Link>
          </Button>
        </div>
      </Drawer>
    </header>
  )
}
