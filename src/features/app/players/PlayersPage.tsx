import { Link, useSearchParams } from 'react-router-dom'
import { ArrowForwardIcon } from '@/components/icons/TournamentCardIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { categoryLabel, genderOptions, usePlayerSearch } from './use-player-search'

function Filter({ current, label, onClick }: { current: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={current} onClick={onClick}
    className={'h-[34px] shrink-0 rounded-full border px-3 text-xs ' + (current ? 'border-primary-500 bg-[#f8f9e9]' : 'border-[#b6b5b7] bg-white text-[#605e64]')}>
    {label}
  </button>
}

export function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const value = params.get('gender')
  const gender = value === 'MALE' || value === 'FEMALE' ? value : undefined
  const rawCategory = params.get('categoryId') ?? ''
  const categoryId = /^[a-f\d-]{36}$/i.test(rawCategory) ? rawCategory : undefined
  const { categories, results, active, rows } = usePlayerSearch({ query, gender, categoryId })
  function update(key: string, next?: string) {
    setParams(current => {
      const updated = new URLSearchParams(current)
      if (next) updated.set(key, next)
      else updated.delete(key)
      return updated
    }, { replace: true })
  }
  return <div className="-mx-4 -mt-4 min-h-[70dvh] bg-[#f2f2f3] p-4 md:mx-auto md:mt-0 md:max-w-[560px]">
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-4 text-[#929195]" />
      <Input type="search" aria-label="Buscar jugadores" placeholder="Buscar jugadores…" maxLength={128}
        className="h-12 rounded-lg border-[#b6b5b7] bg-white pl-9 shadow-none" value={query}
        onChange={event => update('q', event.currentTarget.value)} />
    </div>
    <div className="mt-3 flex gap-2" role="group" aria-label="Filtrar por sexo">
      {genderOptions.map(option => <Filter key={option.label} label={option.label} current={gender === option.value} onClick={() => update('gender', option.value)} />)}
    </div>
    <div className="mt-2 flex gap-2 overflow-x-auto" role="group" aria-label="Filtrar por categoría">
      <Filter label="Todos" current={!categoryId} onClick={() => update('categoryId')} />
      {categories.data?.map(category => <Filter key={category.id} label={category.name} current={categoryId === category.id} onClick={() => update('categoryId', category.id)} />)}
    </div>
    {categories.isError && <div className="mt-3 flex items-center justify-between gap-2 text-sm" role="status">
      <p>No pudimos cargar las categorías.</p><Button variant="link" onClick={() => { void categories.refetch() }}>Reintentar</Button>
    </div>}
    {!active && <p role="status" className="py-5 text-sm text-[#605e64]">Buscá por nombre o elegí un filtro.</p>}
    {active && results.isPending && <div role="status" aria-label="Buscando jugadores" className="mt-3 space-y-1">
      {[1, 2, 3, 4].map(id => <div key={id} className="h-16 rounded-lg bg-divider motion-safe:animate-pulse" />)}
    </div>}
    {active && results.isError && <div role="status" className="mt-3 rounded-lg bg-white p-4 text-sm">
      <p>No pudimos cargar los jugadores. Revisá tu conexión.</p>
      <Button variant="link" className="mt-2" onClick={() => { void results.refetch() }}>Reintentar</Button>
    </div>}
    {active && results.isSuccess && !rows.length && <div role="status" className="mt-3 space-y-1 rounded-lg bg-white p-4 text-sm">
      <p className="font-semibold">Sin resultados</p><p className="text-[#605e64]">Probá con otro nombre o cambiá los filtros.</p>
    </div>}
    <ul className="mt-3 divide-y divide-[#f2f2f3] overflow-hidden rounded-t-xl">
      {rows.map(player => <li key={player.playerId}>
        <Link to={'/app/players/' + player.playerId} state={{ fromSearch: true }} className="flex min-h-16 items-center gap-3 bg-white px-3 py-2 text-sm">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-500 font-semibold text-white">
            {(player.firstName.slice(0, 1) + player.lastName.slice(0, 1)).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words font-semibold">{player.firstName} {player.lastName}</span>
            <span className="block text-xs text-[#605e64]">{categoryLabel(player)}</span>
          </span>
          <ArrowForwardIcon size={20} color="#605E64" />
        </Link>
      </li>)}
    </ul>
    {results.hasNextPage && <Button variant="secondary" className="mt-3 w-full" loading={results.isFetchingNextPage}
      onClick={() => { void results.fetchNextPage() }}>Ver más</Button>}
  </div>
}
