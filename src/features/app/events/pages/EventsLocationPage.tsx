import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, MapPin, X } from 'lucide-react'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { Input, InputGroup } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { eventsMockService } from '../api/events.mock'
import { getSelectedLocationId, setSelectedLocationId } from '../selected-location'
import type { Location } from '../types'

export function EventsLocationPage() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedId, setSelectedId] = useState(getSelectedLocationId)
  const [query, setQuery] = useState('')

  useEffect(() => {
    eventsMockService.listLocations().then(setLocations)
  }, [])

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return locations
    return locations.filter((location) => location.name.toLowerCase().includes(normalizedQuery))
  }, [locations, query])

  function selectLocation(locationId: string) {
    setSelectedLocationId(locationId)
    setSelectedId(locationId)
    navigate('/app/events')
  }

  function removeLocation(locationId: string) {
    setLocations((prev) => prev.filter((location) => location.id !== locationId))
    if (selectedId === locationId && locations.length > 1) {
      const next = locations.find((location) => location.id !== locationId)
      if (next) setSelectedId(next.id)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[402px] flex-col gap-2 md:max-w-3xl">
      <InputGroup left={<SearchFieldIcon size={24} color="#605E64" />}>
        <Input
          className="min-h-11 rounded-2xl border border-[#b6b5b7] bg-[#fefefe] py-2 pl-10 text-body-sm text-dark-900 shadow-none placeholder:text-[#605e64] focus-visible:ring-primary-500/40"
          placeholder="Buscar..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </InputGroup>

      <div className="flex flex-col gap-3 px-0 pt-1">
        <p className="px-2 text-body-sm font-semibold uppercase tracking-[0.35px] text-[#6b7280]">
          Mis Ubicaciones
        </p>
        <div className="overflow-hidden rounded-2xl bg-surface">
          {filteredLocations.map((location, index) => {
            const isSelected = location.id === selectedId
            const isLast = index === filteredLocations.length - 1
            return (
              <div
                key={location.id}
                className={
                  isLast
                    ? 'flex h-[69px] items-center justify-between px-4 py-4'
                    : 'flex h-[69px] items-center justify-between border-b border-[#e5e5e5] px-4 py-4'
                }
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => selectLocation(location.id)}
                >
                  <MapPin
                    className={`h-5 w-5 shrink-0 ${isSelected ? 'text-primary-500' : 'text-[#6b7280]'}`}
                    aria-hidden
                  />
                  <span className="text-base font-medium leading-6 text-dark-900">{location.name}</span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  {isSelected ? (
                    <Check className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-[#6b7280] hover:bg-background"
                    aria-label={`Quitar ${location.name}`}
                    onClick={() => removeLocation(location.id)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
