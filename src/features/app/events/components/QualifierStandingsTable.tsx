import { QUALIFIER_STANDING_COLUMNS } from '../api/qualifier.mock'
import type { QualifierStandingRow } from '../types'

function StandingsHeaderRow() {
  return (
    <div className="flex w-full flex-row items-center bg-[#fafaeb] py-2.5">
      <div className="min-w-0 flex-1 px-4">
        <p className="text-body-sm font-semibold text-primary-600">Pareja</p>
      </div>
      {QUALIFIER_STANDING_COLUMNS.map((column) => (
        <div key={column.key} className="flex w-[26px] shrink-0 items-center justify-center">
          <p className="text-body-sm font-semibold text-primary-600">{column.label}</p>
        </div>
      ))}
    </div>
  )
}

function StandingsDataRow({ row, isLast }: { row: QualifierStandingRow; isLast: boolean }) {
  return (
    <div
      className={`flex w-full flex-row items-center ${isLast ? 'border-b border-[#dfdfdf]' : 'border-b border-[#e7e7e8]'}`}
    >
      <div className="flex min-h-[68px] min-w-0 flex-1 flex-col justify-center px-4 py-2.5">
        <p className="truncate text-caption font-semibold leading-5 text-dark-900">{row.player1}</p>
        <p className="truncate text-caption font-semibold leading-5 text-dark-900">{row.player2}</p>
      </div>
      {QUALIFIER_STANDING_COLUMNS.map((column) => (
        <div
          key={column.key}
          className="flex min-h-[68px] w-[26px] shrink-0 items-center justify-center"
        >
          <p className="text-body-sm text-dark-900">{row[column.key]}</p>
        </div>
      ))}
    </div>
  )
}

export function QualifierStandingsTable({ rows }: { rows: QualifierStandingRow[] }) {
  return (
    <div className="w-full bg-surface">
      <StandingsHeaderRow />
      {rows.map((row, index) => (
        <StandingsDataRow key={row.id} row={row} isLast={index === rows.length - 1} />
      ))}
    </div>
  )
}
