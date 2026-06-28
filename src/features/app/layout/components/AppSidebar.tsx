import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { APP_NAME } from '@/lib/constants'
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserPlus,
  MapPin,
  Calendar,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/ui/drawer'

const navItems = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.events, label: 'Eventos', icon: Trophy },
  { to: ROUTES.tournaments, label: 'Torneos', icon: Trophy },
  { to: ROUTES.categories, label: 'Categorías', icon: LayoutDashboard },
  { to: ROUTES.players, label: 'Jugadores', icon: Users },
  { to: ROUTES.pairs, label: 'Parejas', icon: UserPlus },
  { to: ROUTES.courts, label: 'Canchas', icon: MapPin },
  { to: ROUTES.matches, label: 'Partidos', icon: Calendar },
] as const

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-100 text-dark-900'
      : 'text-dark-700 hover:bg-background hover:text-dark-900',
  )

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-divider px-4">
        <span className="text-body font-semibold text-dark-900">{APP_NAME}</span>
      </div>
      <nav className="flex flex-1 flex-col space-y-0.5 overflow-y-auto p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass} onClick={() => onNavigate?.()}>
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
        <div className="my-2 border-t border-divider pt-2">
          <NavLink
            to={ROUTES.settings}
            className={navLinkClass}
            onClick={() => onNavigate?.()}
          >
            <Settings className="h-5 w-5 shrink-0" />
            Configuración
          </NavLink>
        </div>
      </nav>
    </>
  )
}

export type AppSidebarProps = {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

export function AppSidebar({ mobileOpen, onMobileOpenChange }: AppSidebarProps) {
  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-divider bg-surface md:flex">
        <SidebarNav />
      </aside>
      <Drawer open={mobileOpen} onOpenChange={onMobileOpenChange} side="left">
        <SidebarNav onNavigate={() => onMobileOpenChange(false)} />
      </Drawer>
    </>
  )
}
