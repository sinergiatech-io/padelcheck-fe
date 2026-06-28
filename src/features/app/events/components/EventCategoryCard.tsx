import { Link } from 'react-router-dom'
import { ArrowForwardIcon, UsersIcon } from '@/components/icons/TournamentCardIcons'
import { Button } from '@/components/ui/button'
import {
  eventCategoryOpenEnrollmentPath,
  eventCategoryTabPath,
  getDefaultCategoryTab,
} from '../category-routes'
import type { Event, EventCategory } from '../types'

type EventCategoryCardProps = {
  event: Event
  category: EventCategory
}

export function EventCategoryCard({ event, category }: EventCategoryCardProps) {
  const defaultTab = getDefaultCategoryTab(event.status)
  const detailPath = eventCategoryTabPath(event.id, category.id, defaultTab)

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface p-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_3px_rgba(0,0,0,0.15)]">
      <Link to={detailPath} className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-base font-bold leading-7 text-dark-900">{category.name}</p>
          <div className="flex items-center gap-2 text-body-sm leading-7 text-[#605e64]">
            <UsersIcon size={24} color="#605E64" />
            <span>{category.playerCount} jugadores</span>
          </div>
        </div>
        <ArrowForwardIcon size={24} color="#120F18" />
      </Link>
      {category.canEnroll ? (
        <Button asChild className="mt-4 h-10 w-full rounded-lg bg-primary-500 text-body-sm font-medium text-dark-900 hover:bg-primary-600">
          <Link to={eventCategoryOpenEnrollmentPath(event.id, category.id)}>Inscribirse</Link>
        </Button>
      ) : null}
    </div>
  )
}
