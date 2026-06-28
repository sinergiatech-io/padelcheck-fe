import { Pencil, Trash2 } from 'lucide-react'
import { PlayerPersonIcon } from '@/components/icons/PlayerPersonIcon'
import { useEnrollmentModal } from '../context/EnrollmentModalContext'
import type { Registration, RegistrationPlayer } from '../types'

function RegistrationPlayerCell({ player }: { player: RegistrationPlayer }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
        <PlayerPersonIcon size={20} color="#C9CF38" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-body-sm font-semibold leading-6 text-dark-900">{player.name}</p>
        <p className="truncate text-caption leading-4 text-[#6b7280]">{player.location}</p>
      </div>
    </div>
  )
}

type RegistrationPairItemProps = {
  registration: Registration
  rank: number
  showDivider: boolean
}

function RegistrationPairItem({ registration, rank, showDivider }: RegistrationPairItemProps) {
  const { openEdit } = useEnrollmentModal()

  return (
    <div className="flex flex-col gap-2 p-2">
      <p className="text-lg font-bold leading-7 text-primary-500">#{rank}</p>
      <div className="flex gap-3 py-2">
        <RegistrationPlayerCell player={registration.players[0]} />
        <RegistrationPlayerCell player={registration.players[1]} />
      </div>
      {registration.isOwn ? (
        <div className="flex gap-4">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#fdecec] px-2 py-2 text-body-sm font-medium text-[#d93e3e]"
          >
            <Trash2 className="h-6 w-6 shrink-0" aria-hidden />
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => openEdit(registration)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#fef5e7] px-2 py-2 text-body-sm font-medium text-[#df900a]"
          >
            <Pencil className="h-6 w-6 shrink-0" aria-hidden />
            Editar
          </button>
        </div>
      ) : null}
      {showDivider ? <div className="h-px w-full bg-[#e7e7e8]" /> : null}
    </div>
  )
}

export function RegistrationList({ registrations }: { registrations: Registration[] }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-[#e7e7e8] bg-surface p-2">
      {registrations.map((registration, index) => (
        <RegistrationPairItem
          key={registration.id}
          registration={registration}
          rank={index + 1}
          showDivider={index < registrations.length - 1}
        />
      ))}
    </div>
  )
}
