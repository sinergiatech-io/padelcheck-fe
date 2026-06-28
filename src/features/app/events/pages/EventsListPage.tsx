import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { Input, InputGroup } from '@/components/ui/input'
import { eventsMockService } from '../api/events.mock'
import { EventCard } from '../components/EventCard'
import { getSelectedLocationId } from '../selected-location'
import type { Event, Location } from '../types'

export function EventsListPage() {
  const location = useLocation()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState(getSelectedLocationId)
  const [events, setEvents] = useState<Event[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    eventsMockService.listLocations().then(setLocations)
  }, [])

  useEffect(() => {
    setSelectedLocation(getSelectedLocationId())
  }, [location.pathname])

  useEffect(() => {
    eventsMockService.listEventsByLocation(selectedLocation).then(setEvents)
  }, [selectedLocation])

  const filteredEvents = events.filter((event) => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return true
    return (
      event.title.toLowerCase().includes(normalizedQuery) ||
      event.club.toLowerCase().includes(normalizedQuery) ||
      event.locationName.toLowerCase().includes(normalizedQuery)
    )
  })

  return (
    <div className="-mt-4 mx-auto flex w-full max-w-[402px] flex-col gap-4 md:mt-0 md:max-w-3xl">
      <Link
        to="/app/events/location"
        className="-mx-4 flex h-12 items-center justify-between border-b border-divider bg-surface px-4"
      >
        <div className="flex items-center gap-2 text-body-sm font-semibold text-dark-900">
          <MapPin className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
          {locations.find((location) => location.id === selectedLocation)?.name ?? ''}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-dark-700" aria-hidden />
      </Link>
      <InputGroup left={<SearchFieldIcon size={24} color="#605E64" />}>
        <Input
          className="min-h-11 rounded-2xl border border-[#b6b5b7] bg-[#fefefe] py-2 pl-11 text-body-sm text-dark-900 shadow-none placeholder:text-[#605e64] focus-visible:ring-primary-500/40"
          placeholder="Buscar..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </InputGroup>
      <div className="grid gap-4">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
