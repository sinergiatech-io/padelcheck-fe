import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PlayerPersonIcon } from '@/components/icons/PlayerPersonIcon'
import modalClose from '@/assets/club-events/modal-close.svg'
import pairPlayer from '@/assets/club-events/pair-selected-player.svg'
import pairRejected from '@/assets/club-events/pair-rejected.svg'
import pairSearch from '@/assets/club-events/pair-search.svg'
import { Banner } from './division-ui'
import { useCreateClubPair, useDivisionEntries, usePairPlayerSearch, type Entry, type EntryScope, type PairPlayer } from './club-pair-registration'

export function DivisionRegistration({ scope, open, admin }: { scope: EntryScope; open: boolean; admin: boolean }) {
  const entries = useDivisionEntries(scope)
  const [showModal, setShowModal] = useState(false)
  const [result, setResult] = useState<Entry | null>(null)
  const opener = useRef<HTMLButtonElement>(null)

  function close() {
    setShowModal(false)
    requestAnimationFrame(() => opener.current?.focus())
  }

  const active = entries.data?.filter(entry => entry.status !== 'CANCELLED')
  return <section aria-labelledby="club-division-entries" className="flex flex-col gap-3">
    <h3 id="club-division-entries" className="text-base font-semibold">Inscripciones</h3>
    {result && (result.status === 'WAITLIST'
      ? <Banner tone="info" title="Pareja en lista de espera">La pareja quedó como suplente.</Banner>
      : <Banner tone="success" title="Pareja confirmada">La pareja ya está inscripta en esta división.</Banner>)}
    {entries.isPending && <p role="status" className="text-sm">Cargando inscripciones…</p>}
    {entries.isError && <Banner tone="error" title="No pudimos cargar las inscripciones">
      <button type="button" className="underline" onClick={() => void entries.refetch()}>Reintentar</button>
    </Banner>}
    {active?.length === 0 && <p className="text-sm text-[#605e64]">Todavía no hay parejas inscriptas.</p>}
    {!!active?.length && <ul className="divide-y rounded-lg border bg-white">
      {active.map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
        <strong>{entry.displayName}</strong>
        <span>{entry.status === 'WAITLIST' ? 'Lista de espera · ' + entry.waitlistPosition : 'Confirmada'}</span>
      </li>)}
    </ul>}
    {open && <Button ref={opener} type="button" onClick={() => { setResult(null); setShowModal(true) }}>Nueva inscripción</Button>}
    {showModal && <RegistrationDialog scope={scope} admin={admin} close={close} done={entry => {
      setResult(entry)
      close()
      void entries.refetch()
    }} />}
  </section>
}

function RegistrationDialog({ scope, admin, close, done }: {
  scope: EntryScope; admin: boolean; close: () => void; done: (entry: Entry) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { players, select, busy, submitting, error, submit } = useCreateClubPair(scope, done)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} aria-labelledby="club-pair-title" aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!submitting.current) close() }}
    className="max-h-[calc(100dvh-24px)] w-[calc(100%-28px)] max-w-[374px] overflow-hidden rounded-2xl bg-[#fefefe] p-0 text-[#120f18] backdrop:bg-black/40">
    <form className="flex max-h-[inherit] flex-col" onSubmit={event => { event.preventDefault(); void submit() }}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e5e5] pl-4 pr-2">
        <h2 id="club-pair-title" className="text-sm font-semibold">Nueva inscripción</h2>
        <button type="button" className="grid size-9 place-items-center" aria-label="Cerrar" disabled={busy} onClick={close}>
          <img src={modalClose} alt="" />
        </button>
      </header>
      <div className="flex min-h-0 flex-col gap-8 overflow-y-auto px-6 py-6">
        {error && <div className="flex flex-col gap-2">
          <Banner tone="error" title={error.title} icon={<img src={pairRejected} alt="" width={20} height={20} className="shrink-0" />}>
            {error.detail}
          </Banner>
          {error.planLimit && admin && <Link to="/club/plan" className="self-center px-4 py-2 text-sm font-semibold">Ver plan</Link>}
        </div>}
        <PlayerSlot number={1} player={players[0]} excludeId={players[1]?.playerId} disabled={busy} select={player => select(0, player)} />
        <PlayerSlot number={2} player={players[1]} excludeId={players[0]?.playerId} disabled={busy} select={player => select(1, player)} />
      </div>
      <footer className="mx-6 mb-7 flex shrink-0 gap-3 border-t border-[#e5e5e5] pt-4">
        <Button type="button" variant="secondary" className="h-10 flex-1 rounded-lg border-transparent bg-[#e7e7e8] font-medium text-[#605e64]" disabled={busy} onClick={close}>Cancelar</Button>
        <Button type="submit" className="h-10 flex-1 rounded-lg font-medium disabled:bg-[#eef0c1] disabled:text-[#605e64] disabled:opacity-100"
          loading={busy} loadingLabel="Confirmando inscripción…" disabled={busy || !players[0] || !players[1]}>Confirmar</Button>
      </footer>
    </form>
  </dialog>
}

function PlayerSlot({ number, player, excludeId, disabled, select }: {
  number: number; player: PairPlayer | null; excludeId?: string; disabled: boolean; select: (player: PairPlayer | null) => void
}) {
  const [query, setQuery] = useState('')
  const search = usePairPlayerSearch(query, excludeId, !player && !disabled)
  const results = search.data?.items.filter(item => item.playerId !== excludeId) ?? []
  const id = 'club-pair-player-' + number
  return <div className="flex flex-col gap-4">
    <label htmlFor={player ? undefined : id} className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[#f8f8e5] text-xs text-[#919619]">{number}</span>
      Jugador {number}
    </label>
    {player ? <div className="flex h-14 items-center gap-2 rounded-lg border border-[#b7bc33] bg-[#fafaeb] px-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eef0c1]"><img src={pairPlayer} alt="" /></span>
      <strong className="min-w-0 flex-1 truncate text-sm font-semibold">{player.firstName} {player.lastName}</strong>
      <button type="button" className="grid size-9 place-items-center" aria-label={'Quitar jugador ' + number}
        disabled={disabled} onClick={() => select(null)}><img src={modalClose} alt="" /></button>
    </div> : <div className="flex flex-col gap-1">
      <div className="flex h-14 items-center gap-2 rounded-lg border border-[#b7bc33] px-4 focus-within:ring-2 focus-within:ring-[#919619]">
        <img src={pairSearch} alt="" width={24} height={24} />
        <input id={id} className="min-w-0 flex-1 bg-transparent text-sm outline-none" role="searchbox" inputMode="search" placeholder="Buscar jugador…"
          value={query} disabled={disabled} autoComplete="off" onChange={event => setQuery(event.target.value)} />
      </div>
      {query.trim().length >= 2 && search.isFetching && <p role="status" className="px-2 py-1 text-sm">Buscando…</p>}
      {search.isError && <button type="button" className="p-2 text-left text-sm underline" onClick={() => void search.refetch()}>
        No pudimos buscar jugadores. Reintentar
      </button>}
      {search.isSuccess && results.length === 0 && <div role="status" className="mt-3 rounded-lg border border-[#e7e7e8] bg-[#f6f6f6] p-3 text-sm">
        <strong className="font-semibold">Sin resultados</strong>
        <p className="text-[#605e64]">No encontramos jugadores.</p>
      </div>}
      {results.length > 0 && <ul className="max-h-40 overflow-auto rounded-lg border">
        {results.map(item => <li key={item.playerId}>
          <button type="button" className="flex min-h-10 w-full items-center gap-2 p-2 text-left text-sm hover:bg-[#fafaeb]"
            onClick={() => { select(item); setQuery('') }}><PlayerPersonIcon size={16} />
            <span>{item.firstName} {item.lastName}{item.city && <small className="block text-[#605e64]">{item.city}</small>}</span>
          </button>
        </li>)}
      </ul>}
    </div>}
  </div>
}
