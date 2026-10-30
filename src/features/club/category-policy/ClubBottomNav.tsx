import dashboardIcon from '@/assets/category-policy/nav-dashboard.svg'
import eventsIcon from '@/assets/category-policy/nav-events.svg'
import playersIcon from '@/assets/category-policy/nav-players.svg'
import clubIcon from '@/assets/category-policy/nav-club.svg'

interface ClubBottomNavProps {
  onDashboard: () => void
  onClub: () => void
  onEvents?: () => void
  onPlayers?: () => void
  busy?: boolean
}

/** KAN-105's club navigation; KAN-134 connects the remaining global destinations. */
export function ClubBottomNav({ onDashboard, onClub, onEvents, onPlayers, busy }: ClubBottomNavProps) {
  const items = [
    { label: 'Dashboard', icon: dashboardIcon, onPress: onDashboard },
    { label: 'Eventos', icon: eventsIcon, onPress: onEvents },
    { label: 'Jugadores', icon: playersIcon, onPress: onPlayers },
    { label: 'Mi Club', icon: clubIcon, onPress: onClub },
  ]
  return (
    <nav aria-label="Navegación del club" className="h-16 shrink-0 bg-dark-900">
      <div className="mx-auto flex h-full w-full max-w-xl items-center justify-between px-4 py-1">
        {items.map(item => <button key={item.label} type="button" disabled={busy || !item.onPress}
          aria-current={item.label === 'Mi Club' ? 'page' : undefined} onClick={item.onPress}
          className={`flex h-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-normal leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${item.label === 'Mi Club' ? 'text-primary-500' : 'text-[#FAFAEB]'}`}>
          <img src={item.icon} alt="" width={19.9832} height={19.9832} className="shrink-0" />
          <span>{item.label}</span>
        </button>)}
      </div>
    </nav>
  )
}
