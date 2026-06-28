import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { APP_NAME } from '@/lib/constants'

const footerLinks = [
  { to: ROUTES.home, label: 'Inicio' },
  { to: ROUTES.pricing, label: 'Planes' },
  { to: ROUTES.faq, label: 'FAQ' },
  { to: ROUTES.login, label: 'Iniciar sesión' },
  { to: ROUTES.register, label: 'Registrarse' },
] as const

export function PublicFooter() {
  return (
    <footer className="border-t border-divider bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-body-sm font-medium text-dark-800">{APP_NAME}</span>
          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-body-sm text-dark-700 transition-colors hover:text-dark-900"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-4 text-center text-caption text-dark-700">
          © {new Date().getFullYear()} Sinergia Tech. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
