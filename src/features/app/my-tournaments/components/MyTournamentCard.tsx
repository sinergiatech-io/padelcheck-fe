import { Link } from 'react-router-dom'
import { ArrowForwardIcon, CalendarTodayIcon, LocationOnIcon } from '@/components/icons/TournamentCardIcons'
import { EventStatusBadge } from '@/features/app/events/components/EventStatusBadge'
import { myTournamentCategoryPath } from '../my-tournament-routes'
import type { MyTournament } from '../types'
import { TournamentResultChip } from './TournamentResultChip'

type MyTournamentCardProps = {
  tournament: MyTournament
  variant: 'active' | 'history'
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-body-sm leading-8">
      <span className="font-medium text-[#605e64]">{label}</span>
      <span className="font-semibold text-[#413f46]">{value}</span>
    </div>
  )
}

function MetaRowLocation({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <LocationOnIcon size={24} color="#605E64" />
      <span className="text-caption font-medium leading-8 text-[#605e64]">{label}</span>
    </div>
  )
}

function MetaRowDate({ label }: { label: string }) {
  return (
    <div className="flex h-6 items-center gap-2">
      <CalendarTodayIcon size={24} color="#605E64" />
      <span className="text-caption font-medium leading-6 text-[#605e64]">{label}</span>
    </div>
  )
}

function CardBody({ tournament, variant }: MyTournamentCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7e7e8] bg-surface">
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between py-2">
          <h3 className="min-w-0 truncate text-base font-bold leading-8 text-dark-900">{tournament.title}</h3>
          <EventStatusBadge status={tournament.status} className="ml-2 shrink-0 rounded-lg px-2 py-1" />
        </div>
        <div className="pb-2">
          <p className="text-body-sm font-medium leading-8 text-[#605e64]">{tournament.club}</p>
          <MetaRowLocation label={tournament.locationName} />
          <MetaRowDate label={tournament.dateLabel} />
        </div>
      </div>

      <div className="border-t border-[#b6b5b7] px-4 py-2">
        <DetailRow label="Categoría" value={tournament.categoryName} />
        <DetailRow label="Compañero" value={tournament.partnerName} />
        {variant === 'history' && tournament.result ? (
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium leading-8 text-[#605e64]">Resultado</span>
            <TournamentResultChip result={tournament.result} />
          </div>
        ) : null}
      </div>

      {variant === 'active' ? (
        <div className="flex items-center justify-between px-4 py-1">
          <span className="text-body-sm font-semibold leading-8 text-primary-600">Ver detalles</span>
          <ArrowForwardIcon size={24} color="#B7BC33" />
        </div>
      ) : null}
    </div>
  )
}

export function MyTournamentCard({ tournament, variant }: MyTournamentCardProps) {
  if (variant === 'active') {
    return (
      <Link to={myTournamentCategoryPath(tournament)} className="block">
        <CardBody tournament={tournament} variant={variant} />
      </Link>
    )
  }

  return <CardBody tournament={tournament} variant={variant} />
}
