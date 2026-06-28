import { useAuth } from '@/context/AuthContext'
import { displayName } from '@/types/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { LogOut, Menu, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { eventsMockService } from '@/features/app/events/api/events.mock'
import { getEventBackPath, getEventIdFromAppPath } from '@/features/app/events/event-route'

export type AppTopbarProps = {
  onOpenSidebar: () => void
}

export function AppTopbar({ onOpenSidebar }: AppTopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const isEventsRoute = location.pathname.startsWith('/app/events')
  const isMyTournamentsRoute = location.pathname.startsWith('/app/my-tournaments')
  const isLocationPicker = location.pathname === '/app/events/location'
  const isPlayerMobileHeader = isEventsRoute || isMyTournamentsRoute
  const eventId = getEventIdFromAppPath(location.pathname)
  const [eventTitle, setEventTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setEventTitle(null)
      return
    }
    eventsMockService.getEvent(eventId).then((event) => setEventTitle(event?.title ?? null))
  }, [eventId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate(ROUTES.home)
    setOpen(false)
  }

  const showEventContextHeader = Boolean(eventId)
  const showLocationHeader = isLocationPicker

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b px-4 md:px-6',
        isPlayerMobileHeader ? 'border-dark-900 bg-dark-900 text-surface' : 'border-divider bg-surface',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showEventContextHeader ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-surface hover:bg-dark-800"
              aria-label="Volver"
              onClick={() => navigate(getEventBackPath(location.pathname))}
            >
              <ArrowBackIcon size={20} color="#FFFFFF" />
            </Button>
            <span className="truncate text-h3 font-semibold text-surface">{eventTitle ?? '…'}</span>
          </>
        ) : showLocationHeader ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-surface hover:bg-dark-800"
              aria-label="Volver"
              onClick={() => navigate(ROUTES.events)}
            >
              <ArrowBackIcon size={20} color="#FFFFFF" />
            </Button>
            <span className="truncate text-lg font-bold leading-7 text-surface">Ubicacion</span>
          </>
        ) : isMyTournamentsRoute ? (
          <span className="text-h3 font-bold text-surface">Mis Torneos</span>
        ) : isEventsRoute ? (
          <span className="text-h3 font-semibold text-surface">Eventos</span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Abrir navegación"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
      {!showEventContextHeader && !showLocationHeader && (
        <div className="relative shrink-0" ref={ref}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('gap-2 px-2 font-normal text-dark-800', isPlayerMobileHeader && 'text-surface hover:bg-dark-800')}
            onClick={() => setOpen((o) => !o)}
          >
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-divider', isPlayerMobileHeader && 'bg-dark-800')}>
              <User className={cn('h-4 w-4 text-dark-700', isPlayerMobileHeader && 'text-surface')} />
            </div>
            <span className="hidden max-w-[12rem] truncate font-medium md:inline">
              {displayName(user) || user?.email}
            </span>
          </Button>
          <div
            className={cn(
              'absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-divider bg-surface py-1 shadow-lg',
              !open && 'hidden',
            )}
          >
            <div className="border-b border-divider px-3 py-2 text-caption text-dark-700">{user?.email}</div>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2 font-normal text-dark-800 hover:bg-background"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
