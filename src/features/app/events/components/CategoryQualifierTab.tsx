import { TrophyOutlineIcon } from '@/components/icons/TrophyIcon'
import { QualifierMatchCard } from './QualifierMatchCard'
import { QualifierStandingsTable } from './QualifierStandingsTable'
import type { QualifierZone } from '../types'

export function QualifierZoneSection({ zone }: { zone: QualifierZone }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-[#e7e7e8] bg-surface">
        <div className="flex items-center gap-3 border-b border-[#e5e5e5] bg-[#f9fafb] px-4 py-3">
          <TrophyOutlineIcon size={20} color="#C9CF38" />
          <p className="text-body-sm font-semibold text-dark-900">{zone.name}</p>
        </div>
        <QualifierStandingsTable rows={zone.standings} />
      </div>
      {zone.matches.map((match) => (
        <QualifierMatchCard key={match.id} match={match} />
      ))}
    </div>
  )
}

export function CategoryQualifierTab({ zones }: { zones: QualifierZone[] }) {
  if (zones.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e7e7e8] bg-surface p-4">
        <p className="text-body-sm text-[#605e64]">Sin datos de clasificatoria.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {zones.map((zone) => (
        <QualifierZoneSection key={zone.id} zone={zone} />
      ))}
    </div>
  )
}
