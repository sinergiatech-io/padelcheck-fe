import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarTodayIcon,
  LocationOnIcon,
  MoneyIcon,
} from '@/components/icons/TournamentCardIcons'
import { Card, CardContent } from '@/components/ui/card'
import { eventsMockService } from '../api/events.mock'
import { EventCategoryCard } from '../components/EventCategoryCard'
import { EventStatusBadge } from '../components/EventStatusBadge'
import { EVENT_HERO_GRADIENT_CSS } from '../event-visual'
import type { Event } from '../types'

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const [event, setEvent] = useState<Event>()

  useEffect(() => {
    eventsMockService.getEvent(eventId).then(setEvent)
  }, [eventId])

  if (!event) return <p className="text-body-sm text-dark-700">Evento no encontrado.</p>

  const locationLine = `${event.club} - ${event.locationName}`

  return (
    <div className="mx-auto w-full max-w-[402px] md:max-w-3xl">
      <Card className="overflow-hidden rounded-2xl border border-divider shadow-card">
        <div
          className="relative h-[111px] shrink-0 rounded-t-2xl"
          style={{ backgroundImage: EVENT_HERO_GRADIENT_CSS }}
        >
          <div className="absolute right-2.5 top-3">
            <EventStatusBadge status={event.status} className="rounded-lg px-2 py-1 text-caption font-normal" />
          </div>
        </div>
        <CardContent className="space-y-2 p-4">
          <p className="text-base font-bold leading-7 text-dark-900">{event.title}</p>
          <div className="space-y-3 text-body-sm leading-6 text-[#605e64]">
            <p className="flex items-start gap-2">
              <LocationOnIcon size={24} color="#C9CF38" />
              <span>{locationLine}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarTodayIcon size={24} color="#C9CF38" />
              <span>{event.dateLabel}</span>
            </p>
            <p className="flex items-center gap-2">
              <MoneyIcon size={24} color="#C9CF38" />
              <span>{event.priceLabel}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="mt-6 space-y-4">
        <h2 className="text-base font-bold leading-7 text-dark-900">
          Categorías ({event.categories.length})
        </h2>
        <div className="space-y-3">
          {event.categories.map((category) => (
            <EventCategoryCard key={category.id} event={event} category={category} />
          ))}
        </div>
      </section>
    </div>
  )
}
