import { useEnrollmentModal } from '../context/EnrollmentModalContext'
import {
  CATEGORY_ENROLL_FAB_BOTTOM_GAP,
  CATEGORY_ENROLL_FAB_HEIGHT,
  CATEGORY_ENROLL_FAB_WIDTH,
} from './category-enroll-fab.constants'

type CategoryEnrollFabProps = {
  eventId: string
  categoryId: string
}

/** CTA flotante centrado — Figma 378:6058 (absolute, sin footer). */
export function CategoryEnrollFab(_props: CategoryEnrollFabProps) {
  const { openCreate } = useEnrollmentModal()

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-20 -translate-x-1/2 px-4"
      style={{ bottom: `calc(4rem + ${CATEGORY_ENROLL_FAB_BOTTOM_GAP}px)` }}
    >
      <button
        type="button"
        onClick={openCreate}
        className="pointer-events-auto flex items-center justify-center rounded-lg bg-primary-500 text-body-sm font-medium text-dark-900 shadow-[0_3px_6px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_3px_rgba(0,0,0,0.15)]"
        style={{
          width: CATEGORY_ENROLL_FAB_WIDTH,
          maxWidth: '100%',
          height: CATEGORY_ENROLL_FAB_HEIGHT,
        }}
      >
        Inscribirse
      </button>
    </div>
  )
}
