import { NavLink } from 'react-router-dom'
import {
  BOTTOM_NAV_ICON_SIZE,
  BottomNavEventsIcon,
  BottomNavPlayersIcon,
  BottomNavProfileIcon,
  BottomNavTournamentsIcon,
} from '@/components/icons/BottomNavIcons'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/** Bottom nav jugador — alineado con Figma: Eventos, Mis torneos, Jugadores, Perfil. */
const navItems = [
  { to: ROUTES.events, label: 'Eventos', Icon: BottomNavEventsIcon },
  { to: ROUTES.myTournaments, label: 'Mis torneos', Icon: BottomNavTournamentsIcon },
  { to: ROUTES.players, label: 'Jugadores', Icon: BottomNavPlayersIcon },
  { to: ROUTES.settings, label: 'Perfil', Icon: BottomNavProfileIcon },
] as const

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-caption font-medium',
    isActive ? 'text-primary-500' : 'text-surface',
  )

export function AppBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-dark-900 md:hidden">
      <div className="mx-auto flex max-w-xl items-center">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={linkClass} end={to !== ROUTES.events}>
            {({ isActive }) => (
              <>
                <Icon color={isActive ? '#C9CF38' : '#FAFAEB'} size={BOTTOM_NAV_ICON_SIZE} />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
