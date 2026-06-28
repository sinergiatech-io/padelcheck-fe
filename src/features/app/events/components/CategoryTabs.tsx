import { NavLink, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CATEGORY_TABS, CATEGORY_TAB_LABELS, eventCategoryTabPath } from '../category-routes'
import { CategoryTabIcon } from './CategoryTabIcons'

export function CategoryTabs() {
  const { eventId = '', categoryId = '' } = useParams()

  return (
    <div className="flex overflow-x-auto border-b border-t border-[#b6b5b7] bg-surface">
      {CATEGORY_TABS.map((tab) => {
        const to = eventCategoryTabPath(eventId, categoryId, tab)
        return (
          <NavLink
            key={tab}
            to={to}
            replace
            className={({ isActive }) =>
              cn(
                'flex h-[57px] shrink-0 items-center gap-2 px-2 py-4 text-body-sm leading-6',
                isActive
                  ? 'border-b border-primary-600 bg-[#FAFAEB] font-semibold text-primary-600'
                  : 'bg-surface font-medium text-[#605e64]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <CategoryTabIcon tab={tab} size={20} color={isActive ? '#B7BC33' : '#605E64'} />
                {CATEGORY_TAB_LABELS[tab]}
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}
