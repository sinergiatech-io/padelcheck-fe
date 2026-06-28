import { Link } from 'react-router-dom'
import {
  ArrowForwardIcon,
  CalendarTodayIcon,
  LocationOnIcon,
} from '@/components/icons/TournamentCardIcons'
import { Card, CardContent } from '@/components/ui/card'
import type { Event } from '../types'
import { EventStatusBadge } from './EventStatusBadge'
import { EVENT_HERO_GRADIENT_CSS } from '../event-visual'

export function EventCard({ event }: { event: Event }) {
  return (
    <Link to={`/app/events/${event.id}`} className="block">
      <Card className="overflow-hidden rounded-2xl border border-[#e7e7e8]">
        <div
          className="relative h-[111px] shrink-0 overflow-hidden rounded-t-2xl"
          style={{ backgroundImage: EVENT_HERO_GRADIENT_CSS }}
        >
          <div className="absolute right-2.5 top-3">
            <EventStatusBadge status={event.status} className="rounded-lg px-2 py-1 text-caption font-normal" />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="space-y-0 px-4 pt-2">
            <p className="text-base font-bold leading-8 text-dark-900">{event.title}</p>
            <p className="text-body-sm font-medium leading-8 text-[#605e64]">{event.club}</p>
            <div className="flex flex-col gap-1 pb-2 pt-0">
              <p className="flex items-center gap-2 text-caption font-medium leading-6 text-[#605e64]">
                <LocationOnIcon size={24} color="#C9CF38" />
                {event.locationName}
              </p>
              <p className="flex min-h-6 items-center gap-2 text-caption font-medium leading-6 text-[#605e64]">
                <CalendarTodayIcon size={24} color="#C9CF38" />
                {event.dateLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-body-sm font-semibold text-primary-600">
            Ver detalles
            <ArrowForwardIcon size={24} color="#B4BA2F" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
