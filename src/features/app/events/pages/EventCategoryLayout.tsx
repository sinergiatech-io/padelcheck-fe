import { Outlet, useParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { eventsMockService } from '../api/events.mock'
import { CategoryEnrollFab } from '../components/CategoryEnrollFab'
import { EnrollmentModal } from '../components/EnrollmentModal'
import { EnrollmentModalAutoOpen } from '../components/EnrollmentModalAutoOpen'
import { categoryEnrollFabScrollPadding } from '../components/category-enroll-fab.constants'
import { CategorySelector } from '../components/CategorySelector'
import { CategoryTabs } from '../components/CategoryTabs'
import { EnrollmentModalProvider } from '../context/EnrollmentModalContext'
import { findEventCategory } from '../category-routes'
import type { Event } from '../types'

export function EventCategoryLayout() {
  const { eventId = '', categoryId = '', tab = '' } = useParams()
  const [event, setEvent] = useState<Event>()

  const loadEvent = useCallback(() => {
    eventsMockService.getEvent(eventId).then(setEvent)
  }, [eventId])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const category = findEventCategory(event, categoryId)

  if (!event) return <p className="text-body-sm text-dark-700">Evento no encontrado.</p>
  if (!category) return <p className="text-body-sm text-dark-700">Categoría no encontrada.</p>

  return (
    <EnrollmentModalProvider>
      <div className="mx-auto flex w-full max-w-[402px] flex-col bg-[#f7f7f7] md:max-w-3xl">
        <div className="shrink-0 bg-surface">
          <CategorySelector event={event} category={category} activeTab={tab} />
          <CategoryTabs />
        </div>
        <div
          className="min-h-0 flex-1 px-4 pt-4"
          style={{ paddingBottom: categoryEnrollFabScrollPadding() }}
        >
          <Outlet context={{ event, category }} />
        </div>
        {/* Visibilidad según reglas de negocio: pendiente (canEnroll, tab, estado evento). */}
        <CategoryEnrollFab eventId={event.id} categoryId={category.id} />
        <EnrollmentModalAutoOpen />
        <EnrollmentModal eventId={event.id} categoryId={category.id} onSuccess={loadEvent} />
      </div>
    </EnrollmentModalProvider>
  )
}
