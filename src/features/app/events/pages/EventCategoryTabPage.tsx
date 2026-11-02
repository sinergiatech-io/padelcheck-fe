import { useEffect, useState } from 'react'
import { StartupReady } from '@/features/startup/StartupReady'
import { Navigate, useOutletContext, useParams } from 'react-router-dom'
import { eventsMockService } from '../api/events.mock'
import {
  CategoryBracketsTabPanel as CategoryBracketsTab,
  CategoryMatchesTab,
  CategoryQualifierTabPanel as CategoryQualifierTab,
  CategoryRegistrationsTab,
} from '../components/CategoryTabPanels'
import {
  eventCategoryOpenEnrollmentPath,
  eventCategoryTabPath,
  findEventCategory,
  getDefaultCategoryTab,
  isCategoryTab,
} from '../category-routes'
import type { Event, EventCategory } from '../types'

type CategoryOutletContext = {
  event: Event
  category: EventCategory
}

export function EventCategoryTabPage() {
  const { eventId = '', categoryId = '', tab = '' } = useParams()
  const context = useOutletContext<CategoryOutletContext | undefined>()

  if (!isCategoryTab(tab)) {
    return <Navigate to={eventCategoryTabPath(eventId, categoryId, 'inscripciones')} replace />
  }

  const event = context?.event
  const category = context?.category ?? findEventCategory(event, categoryId)

  if (!event || !category) return null

  if (tab === 'partidos') return <StartupReady><CategoryMatchesTab category={category} /></StartupReady>
  if (tab === 'inscripciones') return <StartupReady><CategoryRegistrationsTab category={category} /></StartupReady>
  if (tab === 'clasificatoria') return <StartupReady><CategoryQualifierTab category={category} /></StartupReady>
  return <StartupReady><CategoryBracketsTab category={category} /></StartupReady>
}

export function LegacyEventTabRedirect({ tab }: { tab: 'inscripciones' | 'clasificatoria' | 'cuadros' }) {
  const { eventId = '' } = useParams()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    eventsMockService.getEvent(eventId).then((event) => {
      const categoryId = event?.categories[0]?.id
      if (!event || !categoryId) {
        setTarget(`/app/events/${eventId}`)
        return
      }
      setTarget(eventCategoryTabPath(event.id, categoryId, tab))
    })
  }, [eventId, tab])

  if (!target) return <p className="text-body-sm text-dark-700">Cargando…</p>
  return <Navigate to={target} replace />
}

export function LegacyEventEnrollRedirect() {
  const { eventId = '' } = useParams()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    eventsMockService.getEvent(eventId).then((event) => {
      const categoryId = event?.categories[0]?.id
      if (!event || !categoryId) {
        setTarget(`/app/events/${eventId}`)
        return
      }
      setTarget(eventCategoryOpenEnrollmentPath(event.id, categoryId))
    })
  }, [eventId])

  if (!target) return <p className="text-body-sm text-dark-700">Cargando…</p>
  return <Navigate to={target} replace />
}

export function EventCategoryDefaultRedirect() {
  const { eventId = '', categoryId = '' } = useParams()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    eventsMockService.getEvent(eventId).then((event) => {
      if (!event) {
        setTarget(`/app/events/${eventId}`)
        return
      }
      const tab = getDefaultCategoryTab(event.status)
      setTarget(eventCategoryTabPath(event.id, categoryId, tab))
    })
  }, [eventId, categoryId])

  if (!target) return <p className="text-body-sm text-dark-700">Cargando…</p>
  return <Navigate to={target} replace />
}
