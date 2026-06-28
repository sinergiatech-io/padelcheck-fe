import { cn } from '@/lib/utils'
import type { MyTournamentTab } from '../types'

type MyTournamentsTabsProps = {
  activeTab: MyTournamentTab
  onChange: (tab: MyTournamentTab) => void
}

export function MyTournamentsTabs({ activeTab, onChange }: MyTournamentsTabsProps) {
  return (
    <div
      className="flex bg-surface shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_2px_6px_2px_rgba(0,0,0,0.15)]"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'activos'}
        className={cn(
          'flex h-[57px] flex-1 items-center justify-center px-2 py-4 text-body-sm leading-6',
          activeTab === 'activos'
            ? 'border-b border-primary-600 bg-[#FAFAEB] font-semibold text-primary-600'
            : 'bg-surface font-medium text-[#605e64]',
        )}
        onClick={() => onChange('activos')}
      >
        Activos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'historial'}
        className={cn(
          'flex h-[57px] flex-1 items-center justify-center px-2 py-4 text-body-sm leading-6',
          activeTab === 'historial'
            ? 'border-b border-primary-600 bg-[#FAFAEB] font-semibold text-primary-600'
            : 'bg-surface font-medium text-[#605e64]',
        )}
        onClick={() => onChange('historial')}
      >
        Historial
      </button>
    </div>
  )
}
