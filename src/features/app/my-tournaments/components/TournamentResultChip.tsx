import type { MyTournamentResult } from '../types'

const RESULT_META: Record<MyTournamentResult, { label: string; className: string }> = {
  campeon: { label: 'Campeón', className: 'text-[#1fb356]' },
  final: { label: 'Final', className: 'text-primary-600' },
  semifinal: { label: 'Semifinal', className: 'text-[#605e64]' },
  cuartos: { label: 'Cuartos', className: 'text-[#605e64]' },
}

export function TournamentResultChip({ result }: { result: MyTournamentResult }) {
  const meta = RESULT_META[result]
  return (
    <span className={`rounded-lg p-1 text-body-sm font-medium ${meta.className}`}>{meta.label}</span>
  )
}
