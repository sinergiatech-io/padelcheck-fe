import { useState } from 'react'
import { MyTournamentCard } from '../components/MyTournamentCard'
import { MyTournamentsTabs } from '../components/MyTournamentsTabs'
import { useMyTournamentsQuery } from '../hooks/use-my-tournaments-query'
import type { MyTournamentTab } from '../types'

export function MyTournamentsPage() {
  const [activeTab, setActiveTab] = useState<MyTournamentTab>('activos')
  const { active, history } = useMyTournamentsQuery()

  const tournaments = activeTab === 'activos' ? active : history
  const variant = activeTab === 'activos' ? 'active' : 'history'

  return (
    <div className="-mt-4 mx-auto flex w-full max-w-[402px] flex-col md:mt-0 md:max-w-3xl">
      <div className="-mx-4 md:mx-0">
        <MyTournamentsTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div className="flex flex-col gap-2 bg-[#f7f7f7] py-4">
        {tournaments.length === 0 ? (
          <p className="text-body-sm text-[#605e64]">
            {activeTab === 'activos' ? 'No tenés torneos activos.' : 'No hay torneos en tu historial.'}
          </p>
        ) : (
          tournaments.map((tournament) => (
            <MyTournamentCard key={tournament.id} tournament={tournament} variant={variant} />
          ))
        )}
      </div>
    </div>
  )
}
