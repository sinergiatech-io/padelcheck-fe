import { Navigate, useParams } from 'react-router-dom'
import { eventCategoryOpenEnrollmentPath } from '../category-routes'

/** Legacy /enroll → tab Inscripciones con modal abierto. */
export function EventCategoryEnrollPage() {
  const { eventId = '', categoryId = '' } = useParams()
  return <Navigate to={eventCategoryOpenEnrollmentPath(eventId, categoryId)} replace />
}
