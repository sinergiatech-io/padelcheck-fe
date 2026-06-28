import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { TrophyFilledIcon } from '@/components/icons/TrophyIcon'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { eventCategoryTabPath, isCategoryTab } from '../category-routes'
import type { Event, EventCategory } from '../types'

type CategorySelectorProps = {
  event: Event
  category: EventCategory
  activeTab: string
}

export function CategorySelector({ event, category, activeTab }: CategorySelectorProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectCategory(nextCategoryId: string) {
    setOpen(false)
    const tab = isCategoryTab(activeTab) ? activeTab : 'inscripciones'
    navigate(eventCategoryTabPath(event.id, nextCategoryId, tab))
  }

  return (
    <div className="relative px-2 py-4" ref={ref}>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-[#b6b5b7] bg-surface px-4 py-2"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 text-body-sm font-medium leading-8 text-dark-900">
          <TrophyFilledIcon size={24} color="#C9CF38" />
          {category.name}
        </span>
        <ChevronDown className={cn('h-6 w-6 text-dark-900 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-lg border border-divider bg-surface shadow-lg">
          {event.categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-4 py-3 text-left text-body-sm',
                item.id === category.id ? 'bg-[#FAFAEB] font-semibold text-dark-900' : 'text-dark-700 hover:bg-background',
              )}
              onClick={() => selectCategory(item.id)}
            >
              <TrophyFilledIcon size={20} color="#C9CF38" />
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
