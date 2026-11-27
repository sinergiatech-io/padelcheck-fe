import { Link, useSearchParams } from 'react-router-dom'
import { ArrowForwardIcon } from '@/components/icons/TournamentCardIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CircleX, Search } from 'lucide-react'
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
  const categoryOptions = categories.data?.slice().reverse()
  function update(key: string, next?: string) {
    setParams(current => {
      const updated = new URLSearchParams(current)
      if (next) updated.set(key, next)
      else updated.delete(key)
      return updated
    }, { replace: true })
  }
  return <div className="-mx-4 -mt-4 min-h-[calc(100dvh-120px)] bg-[#f2f2f3] p-4 md:mx-auto md:mt-0 md:min-h-[70dvh] md:max-w-[560px]">
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
      {categoryOptions?.map(category => <Filter key={category.id} label={category.name} current={categoryId === category.id} onClick={() => update('categoryId', category.id)} />)}
    </div>
    {categories.isError && <div className="mt-3 flex items-center justify-between gap-2 text-sm" role="status">
      <p>No pudimos cargar las categorías.</p><Button variant="link" onClick={() => { void categories.refetch() }}>Reintentar</Button>
    </div>}
    {!active && <p role="status" className="py-5 text-sm text-[#605e64]">Buscá por nombre o elegí un filtro.</p>}
    {active && results.isPending && <div role="status" aria-label="Buscando jugadores" className="mt-3 space-y-2">
      {[1, 2, 3, 4, 5].map(id => <div key={id} className="flex h-[66px] items-center gap-3 rounded-xl border border-divider bg-white px-3 motion-safe:animate-pulse">
        <div className="size-10 rounded-full bg-divider" />
        <div className="space-y-2">
          <div className="h-3.5 w-[140px] rounded bg-divider" />
          <div className="h-2.5 w-[90px] rounded bg-divider" />
        </div>
      </div>)}
    </div>}
    {active && results.isError && <div className="mt-3">
      <div role="status" className="flex flex-col items-center gap-1 rounded-2xl border border-divider bg-white p-2 text-[#605e64]">
        <CircleX size={20} aria-hidden="true" />
        <p className="text-sm font-medium">No pudimos cargar jugadores</p>
        <p className="max-w-[176px] text-xs text-muted-foreground">Revisá tu conexión e intentá de nuevo.</p>
      </div>
      <Button size="lg" className="mt-3 w-full rounded-lg" loading={results.isFetching}
        onClick={() => { void results.refetch({ cancelRefetch: false }) }}>Reintentar</Button>
    </div>}
    {active && results.isSuccess && !rows.length && <div role="status" className="mt-3 flex min-h-[106px] flex-col items-center justify-center gap-1 rounded-2xl border border-divider bg-white p-2 text-[#605e64]">
      <Search size={20} aria-hidden="true" />
      <p className="text-sm font-medium">Sin resultados</p>
      <p className="max-w-[176px] text-xs text-muted-foreground">Probá con otro nombre o cambiá los filtros.</p>
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
