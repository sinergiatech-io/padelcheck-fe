import { X } from 'lucide-react'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { useEffect, useState } from 'react'
import { PlayerPersonIcon } from '@/components/icons/PlayerPersonIcon'
import { cn } from '@/lib/utils'
import { eventsMockService } from '../api/events.mock'
import { useEnrollmentModal } from '../context/EnrollmentModalContext'
import { useEnrollmentForm } from '../hooks/use-enrollment-form'
import type { EnrollablePlayer } from '../types'

type EnrollmentModalProps = {
  eventId: string
  categoryId: string
  onSuccess: () => void
}

function StepHeading({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-caption font-bold text-primary-500">
        {step}
      </span>
      <p className="text-body-sm font-semibold text-dark-900">{label}</p>
    </div>
  )
}

function SelectedPlayerCard({
  player,
  clearable,
  onClear,
}: {
  player: EnrollablePlayer
  clearable: boolean
  onClear?: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#b7bc33] bg-[#fafaeb] p-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef0c1]">
          <PlayerPersonIcon size={20} color="#C9CF38" />
        </div>
        <p className="truncate text-body-sm font-semibold text-dark-900">{player.name}</p>
      </div>
      {clearable ? (
        <button
          type="button"
          aria-label="Quitar jugador"
          onClick={onClear}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#605e64]"
        >
          <X className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  )
}

function PlayerSearchSlot({
  step,
  label,
  player,
  readOnly,
  excludeIds,
  onSelect,
  onClear,
}: {
  step: number
  label: string
  player: EnrollablePlayer | null
  readOnly?: boolean
  excludeIds: string[]
  onSelect: (player: EnrollablePlayer) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EnrollablePlayer[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (player) {
      setQuery('')
      setResults([])
      setDropdownOpen(false)
      return
    }
    if (!dropdownOpen) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      eventsMockService.searchEnrollmentPlayers(query, { excludeIds }).then((items) => {
        if (!cancelled) setResults(items)
      })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, excludeIds, player, dropdownOpen])

  const showResults = dropdownOpen && !player && results.length > 0

  return (
    <div className="flex flex-col gap-4">
      <StepHeading step={step} label={label} />
      {player && readOnly ? (
        <SelectedPlayerCard player={player} clearable={false} />
      ) : player ? (
        <SelectedPlayerCard player={player} clearable onClear={onClear} />
      ) : (
        <div className="relative">
          <div className="flex h-14 items-center gap-2 rounded-lg border border-[#b7bc33] bg-[#fefefe] px-4 py-2">
            <SearchFieldIcon size={24} color="#929195" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Buscar jugador..."
              className="min-w-0 flex-1 bg-transparent text-body-sm text-dark-900 outline-none placeholder:text-[#929195]"
            />
          </div>
          {showResults && results.length > 0 ? (
            <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-48 overflow-y-auto rounded-lg border border-[#e7e7e8] bg-surface shadow-md">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-primary-500/5"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(item)
                      setQuery('')
                      setDropdownOpen(false)
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
                      <PlayerPersonIcon size={16} color="#C9CF38" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-dark-900">{item.name}</p>
                      <p className="truncate text-caption text-[#6b7280]">{item.location}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function EnrollmentModal({ eventId, categoryId, onSuccess }: EnrollmentModalProps) {
  const { isOpen, mode, registration, close } = useEnrollmentModal()
  const [currentPlayer, setCurrentPlayer] = useState<EnrollablePlayer | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    eventsMockService.getCurrentEnrollmentPlayer().then(setCurrentPlayer)
  }, [isOpen])

  const { player1, player2, setPlayer1, setPlayer2, canConfirm, player1ReadOnly } = useEnrollmentForm({
    mode,
    registration,
    currentPlayer,
    isOpen,
  })

  if (!isOpen) return null

  const title = mode === 'create' ? 'Nueva inscripción' : 'Editar inscripción'
  const excludeForSlot1 = player2 ? [player2.id] : []
  const excludeForSlot2 = player1 ? [player1.id] : []
  const isConfirmEnabled = canConfirm && !submitting

  const onConfirm = async () => {
    if (!player1 || !player2 || submitting) return
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await eventsMockService.enroll(eventId, categoryId, player1, player2)
      } else if (registration) {
        await eventsMockService.updateRegistration(eventId, categoryId, registration.id, player1, player2)
      }
      close()
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
      role="presentation"
    >
      <div
        className="flex w-full max-w-[375px] flex-col overflow-hidden rounded-2xl bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-modal-title"
      >
        <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] pl-4 pr-2">
          <h2 id="enrollment-modal-title" className="text-body-sm font-bold text-dark-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-dark-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6">
          <PlayerSearchSlot
            step={1}
            label="Jugador 1"
            player={player1}
            readOnly={player1ReadOnly}
            excludeIds={excludeForSlot1}
            onSelect={setPlayer1}
            onClear={() => setPlayer1(null)}
          />
          <PlayerSearchSlot
            step={2}
            label="Jugador 2"
            player={player2}
            excludeIds={excludeForSlot2}
            onSelect={setPlayer2}
            onClear={() => setPlayer2(null)}
          />

          <div className="flex gap-3 border-t border-[#e5e5e5] pt-4">
            <button
              type="button"
              onClick={close}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#e7e7e8] text-body-sm font-medium text-[#605e64]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!isConfirmEnabled}
              onClick={() => void onConfirm()}
              className={cn(
                'flex h-10 flex-1 items-center justify-center rounded-lg text-body-sm font-medium',
                isConfirmEnabled
                  ? 'bg-primary-500 text-dark-900'
                  : 'bg-[#eef0c1] text-[#605e64] opacity-50',
              )}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
