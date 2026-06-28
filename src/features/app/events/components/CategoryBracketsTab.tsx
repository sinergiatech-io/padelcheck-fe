import { BRACKET_COLUMN_WIDTH, BRACKET_MATCHS_WIDTH } from './bracket-layout.constants'
import { BracketConnector } from './BracketConnector'
import { BracketMatchCard } from './BracketMatchCard'
import {
  computeBracketLayout,
  pairConnectorArms,
  type PairLayout,
  type RoundLayout,
} from './compute-bracket-layout'
import type { BracketRound } from '../types'

function BracketPairRow({ pairLayout }: { pairLayout: PairLayout }) {
  const arms = pairConnectorArms(pairLayout)

  return (
    <div
      className="absolute flex items-stretch px-4"
      style={{ top: pairLayout.top, left: 0, right: 0, height: pairLayout.height }}
    >
      <div className="relative px-2" style={{ width: BRACKET_MATCHS_WIDTH, height: pairLayout.height }}>
        {pairLayout.matches.map((matchLayout) => (
          <div
            key={matchLayout.match.id}
            className="absolute left-2 right-2"
            style={{ top: matchLayout.top }}
          >
            <BracketMatchCard match={matchLayout.match} />
          </div>
        ))}
      </div>
      {pairLayout.pair.connector ? (
        <div className="flex shrink-0 items-center">
          <BracketConnector height={pairLayout.height} arms={arms} />
        </div>
      ) : null}
    </div>
  )
}

function BracketRoundColumn({ roundLayout, contentHeight }: { roundLayout: RoundLayout; contentHeight: number }) {
  const bgClass = roundLayout.round.variant === 'primary' ? 'bg-[#FAFAEB]' : 'bg-surface'

  return (
    <div className={`shrink-0 py-4 ${bgClass}`} style={{ width: BRACKET_COLUMN_WIDTH }}>
      <div className="flex justify-center px-4 pb-4">
        <p className="text-body font-semibold uppercase text-[#8f9328]">{roundLayout.round.name}</p>
      </div>
      <div className="relative" style={{ height: contentHeight }}>
        {roundLayout.pairs.map((pairLayout) => (
          <BracketPairRow key={pairLayout.pair.id} pairLayout={pairLayout} />
        ))}
      </div>
    </div>
  )
}

export function CategoryBracketsTab({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e7e7e8] bg-surface p-4">
        <p className="text-body-sm text-[#605e64]">Sin datos de cuadros.</p>
      </div>
    )
  }

  const { roundLayouts, contentHeight } = computeBracketLayout(rounds)

  return (
    <div className="-mx-4 overflow-x-auto">
      <div className="flex items-start">
        {roundLayouts.map((roundLayout) => (
          <BracketRoundColumn
            key={roundLayout.round.id}
            roundLayout={roundLayout}
            contentHeight={contentHeight}
          />
        ))}
      </div>
    </div>
  )
}
