import { eventCategoryTabPath } from './category-routes'
import { ROUTES } from '@/lib/constants'

/** Primer segmento bajo `/app/events/` cuando es un evento (no listado ni selector de ubicación). */
export function getEventIdFromAppPath(pathname: string): string | null {
  const prefix = '/app/events/'
  if (!pathname.startsWith(prefix)) return null
  const rest = pathname.slice(prefix.length)
  const first = rest.split('/').filter(Boolean)[0]
  if (!first || first === 'location') return null
  return first
}

/** Destino del botón volver según la pantalla actual del flujo de eventos. */
export function getEventBackPath(pathname: string): string {
  const eventId = getEventIdFromAppPath(pathname)
  if (!eventId) return ROUTES.events

  const segments = pathname.split('/').filter(Boolean)
  const categoriesIndex = segments.indexOf('categories')

  if (categoriesIndex === -1) {
    return ROUTES.events
  }

  const categoryId = segments[categoriesIndex + 1]
  if (!categoryId) {
    return `${ROUTES.events}/${eventId}`
  }

  if (segments[segments.length - 1] === 'enroll') {
    return eventCategoryTabPath(eventId, categoryId, 'inscripciones')
  }

  return `${ROUTES.events}/${eventId}`
}
