import { CalendarDays, Clock, MapPin } from 'lucide-react'
import type { QualifierMatch } from '../types'

function TeamNames({ names, isWinner }: { names: [string, string]; isWinner: boolean }) {
  const colorClass = isWinner ? 'text-[#7a7d24]' : 'text-dark-900'
  return (
    <div className={`min-w-[88px] shrink ${colorClass}`}>
      <p className="truncate text-body-sm font-semibold leading-[27px]">{names[0]}</p>
      <p className="truncate text-body-sm font-semibold leading-[27px]">{names[1]}</p>
    </div>
  )
}

export function QualifierMatchCard({ match }: { match: QualifierMatch }) {
  return (
    <div className="rounded-2xl border border-[#e7e7e8] bg-surface p-2">
      <div className="flex items-center justify-between px-4 py-2">
        <TeamNames names={match.teamA} isWinner={match.winnerSide === 'A'} />
        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
          <p className="text-caption text-dark-900">vs</p>
          <p className="text-body-sm font-semibold text-dark-900">{match.score}</p>
        </div>
        <TeamNames names={match.teamB} isWinner={match.winnerSide === 'B'} />
      </div>
      <div className="space-y-2 px-4 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="flex items-center gap-2 text-body-sm text-[#6b7280]">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            {match.dateLabel}
          </p>
          <p className="flex items-center gap-2 text-body-sm text-[#6b7280]">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            {match.timeLabel}
          </p>
        </div>
        <p className="flex items-center gap-2 text-body-sm text-[#6b7280]">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{match.venueLabel}</span>
        </p>
      </div>
    </div>
  )
}
