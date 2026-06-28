import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEnrollmentModal } from '../context/EnrollmentModalContext'

/** Abre el modal de inscripción cuando la ruta trae ?openEnrollment=1 (p. ej. desde la card del evento). */
export function EnrollmentModalAutoOpen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { openCreate } = useEnrollmentModal()
  const handledRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('openEnrollment') !== '1') {
      handledRef.current = false
      return
    }
    if (handledRef.current) return
    handledRef.current = true

    openCreate()
    const next = new URLSearchParams(searchParams)
    next.delete('openEnrollment')
    setSearchParams(next, { replace: true })
  }, [searchParams, openCreate, setSearchParams])

  return null
}
