import { CalendarDays, Clock, MapPin } from 'lucide-react'
import type { BracketKnockoutMatch, BracketTeamRow } from '../types'

const BORDER = '#676767'
const SCORE_COL_WIDTH = 28
const NAMES_COL_WIDTH = 204
const ROW_HEIGHT = 52
const CARD_WIDTH = 288

function isSetWinner(setIndex: number, side: 'A' | 'B', teamA: BracketTeamRow, teamB: BracketTeamRow) {
  const scoreA = teamA.sets[setIndex]
  const scoreB = teamB.sets[setIndex]
  if (scoreA === scoreB) return false
  return side === 'A' ? scoreA > scoreB : scoreB > scoreA
}

function TeamNames({ team, isWinner }: { team: BracketTeamRow; isWinner: boolean }) {
  const nameClass = isWinner ? 'font-semibold text-[#8f9328]' : 'text-dark-900'

  return (
    <>
      <p className={`truncate text-body-sm leading-[18px] ${nameClass}`}>{team.player1}</p>
      <p className={`truncate text-body-sm leading-[18px] ${nameClass}`}>{team.player2}</p>
    </>
  )
}

function ScoreRow({
  team,
  opponent,
  side,
  isWinner,
  showBottomBorder,
}: {
  team: BracketTeamRow
  opponent: BracketTeamRow
  side: 'A' | 'B'
  isWinner: boolean
  showBottomBorder: boolean
}) {
  const teamA = side === 'A' ? team : opponent
  const teamB = side === 'B' ? team : opponent

  return (
    <div
      className="flex"
      style={{
        height: ROW_HEIGHT,
        borderBottom: showBottomBorder ? `1px solid ${BORDER}` : undefined,
      }}
    >
      <div
        className="flex flex-col justify-center p-2"
        style={{
          width: NAMES_COL_WIDTH,
          height: ROW_HEIGHT,
          borderRight: `1px solid ${BORDER}`,
        }}
      >
        <TeamNames team={team} isWinner={isWinner} />
      </div>
      {team.sets.map((score, index) => (
        <div
          key={index}
          className="flex items-center justify-center p-2"
          style={{
            width: SCORE_COL_WIDTH,
            height: ROW_HEIGHT,
            borderRight: index < 2 ? `1px solid ${BORDER}` : undefined,
          }}
        >
          <p
            className={`text-body-sm leading-[18px] text-dark-900 ${isSetWinner(index, side, teamA, teamB) ? 'font-semibold' : ''}`}
          >
            {score}
          </p>
        </div>
      ))}
    </div>
  )
}

export function BracketMatchCard({ match }: { match: BracketKnockoutMatch }) {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-surface"
      style={{ width: CARD_WIDTH, border: `1px solid ${BORDER}` }}
    >
      <ScoreRow
        team={match.teamA}
        opponent={match.teamB}
        side="A"
        isWinner={match.winnerSide === 'A'}
        showBottomBorder
      />
      <ScoreRow
        team={match.teamB}
        opponent={match.teamA}
        side="B"
        isWinner={match.winnerSide === 'B'}
        showBottomBorder
      />
      <div className="p-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="flex items-center gap-2 text-body-sm text-[#676767]">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            {match.dateLabel}
          </p>
          <p className="flex items-center gap-2 text-body-sm text-[#676767]">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            {match.timeLabel}
          </p>
        </div>
        <p className="mt-1 flex items-center gap-2 text-body-sm text-[#676767]">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{match.venueLabel}</span>
        </p>
      </div>
    </div>
  )
}
