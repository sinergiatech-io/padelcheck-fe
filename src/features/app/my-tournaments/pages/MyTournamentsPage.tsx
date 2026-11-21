import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MyTournamentCard } from '../components/MyTournamentCard'
import { MyTournamentsTabs } from '../components/MyTournamentsTabs'
import { useMyTournamentsQuery } from '../hooks/use-my-tournaments-query'
import type { MyTournamentTab } from '../types'

export function MyTournamentsPage() {
  const [params, setParams] = useSearchParams()
  const activeTab: MyTournamentTab = params.get('tab') === 'historial' ? 'historial' : 'activos'
  const query = useMyTournamentsQuery(activeTab)
  const variant = activeTab === 'activos' ? 'active' : 'history'

  return (
    <div className="-mt-4 mx-auto flex w-full max-w-[402px] flex-col md:mt-0 md:max-w-3xl">
      <div className="-mx-4 md:mx-0">
        <MyTournamentsTabs activeTab={activeTab} onChange={tab => setParams({ tab }, { replace: true })} />
      </div>
      <div className="flex flex-col gap-2 bg-[#f7f7f7] py-4">
        {query.isPending && <p role="status" className="text-body-sm">Cargando torneos…</p>}
        {query.isError && <div role="status" className="text-body-sm">
          <p>No pudimos cargar los torneos.</p>
          <Button variant="link" onClick={() => { void query.refetch() }}>Reintentar</Button>
        </div>}
        {query.isSuccess && query.rows.length === 0 ? (
          <p className="text-body-sm text-[#605e64]">
            {activeTab === 'activos' ? 'No tenés torneos activos.' : 'No hay torneos en tu historial.'}
          </p>
        ) : (
          query.rows.map((tournament) => (
            <MyTournamentCard key={tournament.id} tournament={tournament} variant={variant} />
          ))
        )}
        {query.hasNextPage && <Button variant="secondary" loading={query.isFetchingNextPage}
          onClick={() => { void query.fetchNextPage() }}>Ver más</Button>}
      </div>
    </div>
  )
}
