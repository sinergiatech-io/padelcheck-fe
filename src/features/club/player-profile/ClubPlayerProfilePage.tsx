import { useEffect, useRef } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import playedIcon from '@/assets/player-profile/matches-played.svg'
import wonIcon from '@/assets/player-profile/matches-won.svg'
import emptyActivityIcon from '@/assets/player-profile/empty-activity.svg'
import { activityMonth, futureNotice, profileError, useClubPlayerProfile, type ClubPlayerProfile } from './use-club-player-profile'

const button = 'h-12 rounded-lg'
const restriction = 'No tenés permiso para consultar a este jugador.'

function Identity({ player }: { player: ClubPlayerProfile }) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ')
  const initials = [player.firstName, player.lastName].map(part => part?.charAt(0)).join('')
  const branch = player.gender === 'MALE' ? 'Caballeros' : player.gender === 'FEMALE' ? 'Damas' : ''
  return <section className="space-y-3 rounded-[20px] bg-[#f8f8e9] p-4">
    <div className="flex items-start gap-3">
      {player.profilePhotoUrl
        ? <img className="size-16 rounded-full object-cover" src={player.profilePhotoUrl} alt="" />
        : <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-500 text-2xl font-bold text-white">{initials}</span>}
      <div>
        <h2 className="break-words text-[26px] font-bold leading-8">{name}</h2>
        {player.city && <p className="mt-1 text-sm text-[#605e64]">{player.city}</p>}
      </div>
    </div>
    <div className="text-xs text-[#605e64]">
      <p>Categoría global</p>
      <p className="mt-1 inline-block rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold text-dark-900">
        {player.globalCategory ? [player.globalCategory.name, branch].filter(Boolean).join(' ') : 'Sin categoría'}
      </p>
    </div>
  </section>
}

function Activity({ entries }: { entries: ClubPlayerProfile['recentActivity'] }) {
  if (!entries.length) return <p className="text-sm text-[#605e64]">Sin participaciones en este club.</p>
  return <ul className="space-y-5">
    {entries.map((entry, index) => <li key={`${entry.eventId}-${index}`}>
      <p className="text-sm font-semibold">{entry.eventName}</p>
      <p className="text-xs text-[#605e64]">{entry.divisionName} · {activityMonth(entry.startDate)}</p>
    </li>)}
  </ul>
}

export function ClubPlayerProfilePage() {
  const { user, destination, phase } = useAuth()
  const { playerId } = useParams()
  const clubId = destination?.kind === 'club' ? destination.clubId : undefined
  if (phase !== 'ready' || !clubId || !playerId || !user) return <p role="alert">{restriction}</p>
  return <Profile key={`${user.userId}:${clubId}:${playerId}`} clubId={clubId} playerId={playerId} accountId={user.userId} />
}

function Profile({ clubId, playerId, accountId }: { clubId: string; playerId: string; accountId: string }) {
  const flow = useClubPlayerProfile(clubId, playerId, accountId)
  const { data: player, view, open, saving, dirty } = flow
  const navigate = useNavigate()
  const { state } = useLocation()
  const blocker = useBlocker(dirty || saving)
  const dialog = useRef<HTMLDialogElement>(null)
  const discard = useRef<(() => void) | null>(null)
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (saving) blocker.reset()
      else if (dirty) dialog.current?.showModal()
      else blocker.proceed()
    }
  }, [blocker, dirty, saving])
  useEffect(() => {
    if (!dirty && !saving) return
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty, saving])
  useEffect(() => { main.current?.scrollTo(0, 0) }, [view])

  const returnToList = () => { if (state?.fromClubPlayers) navigate(-1); else navigate('/app', { replace: true }) }
  function back() {
    if (saving) return
    if (view === 'confirm-category') return open('category')
    if (view === 'profile') return returnToList()
    if (!dirty) return open('profile')
    discard.current = () => open('profile')
    dialog.current?.showModal()
  }
  function closeDiscard(accept: boolean) {
    dialog.current?.close()
    const action = discard.current
    discard.current = null
    if (blocker.state === 'blocked') {
      if (accept) blocker.proceed()
      else blocker.reset()
    } else if (accept) action?.()
  }

  const saveText = view === 'confirm-category' ? 'Guardar categoría' : view === 'remove' ? 'Quitar observación'
    : player?.observed ? 'Guardar nota' : 'Guardar observación'
  const progressText = view === 'confirm-category' ? 'Guardando categoría…' : view === 'remove' ? 'Quitando observación…'
    : player?.observed ? 'Guardando nota…' : 'Guardando observación…'
  const footer = player?.canManage && (view === 'category' || view === 'confirm-category' || view === 'remove' || view === 'observe')
  return <div className="flex h-dvh flex-col bg-[#fefefe] text-dark-900">
    <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
      <button className="flex size-10 items-center justify-center rounded-lg focus-visible:ring-2 disabled:opacity-40" onClick={back} aria-label="Volver" disabled={saving}><ArrowBackIcon /></button>
      <h1 className="text-xl font-bold leading-7">{flow.title}</h1>
    </header>
    <main ref={main} className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-busy={flow.profile.isPending || saving}>
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        {flow.profile.isPending && <p role="status">Cargando ficha…</p>}
        {flow.profile.isError && <div role="alert" className="rounded-lg bg-[#fdecec] p-3 text-sm">
          <p>{profileError(flow.profile.error)}</p>
          <Button variant="secondary" className="mt-2" onClick={() => void flow.profile.refetch()}>Reintentar</Button>
        </div>}
        {flow.notice && <p role={flow.notice.error ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${flow.notice.error ? 'bg-[#fdecec]' : 'bg-[#e9f9ef]'}`}>{flow.notice.text}</p>}
        {saving && <div role="status" className="flex items-center gap-3 rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3">
          <span className="flex size-6 shrink-0 items-center justify-center"><img src={emptyActivityIcon} alt="" width={20} height={20} /></span>
          <div><p className="text-sm font-semibold">{progressText}</p><p className="text-xs text-[#605e64]">Esperá la respuesta para continuar.</p></div>
        </div>}
        {player && <>
          {view !== 'history' && <Identity player={player} />}
          {view === 'profile' && <>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{player.clubName}</h2>
                {player.observed && <span className="rounded-full bg-[#f8f8e9] px-3 py-1 text-xs font-medium">Observado</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold">{player.effectiveCategory?.name ?? 'Sin categoría'}</span>
                <div className="text-xs"><p className="text-sm font-semibold">{player.gender === 'MALE' ? 'Caballeros' : player.gender === 'FEMALE' ? 'Damas' : null}</p>
                  <p>{player.localCategory ? 'Categoría en este club' : 'Usa la categoría global'}</p></div>
              </div>
              {player.globalCategory && !player.localCategory && <p className="text-xs text-[#605e64]">Sin categoría local asignada</p>}
              {player.canManage ? <div className="grid grid-cols-2 gap-2.5">
                <Button className={button} onClick={() => open('category')}>Recategorizar</Button>
                <Button className={`${button} border-[#929096]`} variant="secondary" onClick={() => open('observe')}>{player.observed ? 'Editar nota' : 'Observar'}</Button>
              </div> : <p className="rounded-lg bg-[#f8f8e9] p-3 text-sm">Tenés acceso de solo lectura.</p>}
              {player.observed && player.canManage && <div className="space-y-2 text-sm">
                <p className="text-xs font-medium text-[#605e64]">Nota interna · Solo este club</p>
                <p className="whitespace-pre-wrap break-words text-[#605e64]">{player.observationNote ?? 'Sin nota interna'}</p>
                <Button variant="ghost" className="h-12" onClick={() => open('remove')}>Quitar observación</Button>
              </div>}
            </section>
            <section className="rounded-2xl bg-dark-900 p-5 text-white">
              <h2 className="text-sm font-semibold">Rendimiento en este club</h2>
              <div className="mt-3 grid grid-cols-2 gap-6">
                {[[playedIcon, player.matchesPlayed, 'Partidos jugados'], [wonIcon, player.matchesWon, 'Partidos ganados']].map(([icon, count, label]) => <div key={label}>
                  <p className="flex items-center gap-1.5 text-4xl font-semibold text-primary-500"><img alt="" src={String(icon)} width="20" height="20" />{count}</p>
                  <p className="mt-1 text-xs">{label}</p>
                </div>)}
              </div>
            </section>
            {player.recentActivity.length === 0 ? <section className="flex items-center gap-3 rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3">
              <span className="flex size-6 shrink-0 items-center justify-center"><img src={emptyActivityIcon} alt="" width={20} height={20} /></span>
              <div>
                <h2 className="text-sm font-semibold">Todavía no tiene actividad</h2>
                <p className="text-xs leading-4 text-[#605e64]">{player.canManage
                  ? 'Está vinculado al club. Podés recategorizarlo u observarlo sin que haya jugado un torneo.'
                  : 'Está vinculado al club y todavía no participó en sus torneos.'}</p>
              </div>
            </section> : <section className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Torneos en este club</h2>
                {player.recentActivity.length > 0 && <Button variant="link" className="text-[#777a09]" onClick={() => open('history')}>Ver historial</Button>}
              </div>
              <Activity entries={player.recentActivity} />
            </section>}
          </>}
          {view === 'history' && <>
            {flow.history.isPending ? <p role="status">Cargando historial…</p>
              : <Activity entries={flow.history.data?.pages.flat() ?? []} />}
            {flow.history.isError && <p role="alert">No pudimos cargar el historial. <Button variant="link" onClick={() => void flow.history.refetch()}>Reintentar</Button></p>}
            {flow.history.hasNextPage && <Button className={button} variant="secondary" disabled={flow.history.isFetchingNextPage} onClick={() => void flow.history.fetchNextPage()}>Cargar más</Button>}
          </>}
          {view !== 'profile' && view !== 'history' && <p className="text-xs">{player.clubName} · Categoría actual: {player.effectiveCategory?.name ?? 'Sin categoría'}</p>}
          {view === 'observe' && <section className="space-y-4 pt-1">
            <h2 className="text-lg font-semibold">{player.observed ? 'Editá la nota de observación' : 'Observar para un posible ascenso'}</h2>
            <p className="text-sm font-medium">Marcá al jugador mientras esperás un resultado deportivo. Su categoría no cambia.</p>
            <label className="block space-y-2 text-sm font-medium">Nota interna (opcional)
              <textarea value={flow.note} onChange={event => flow.setNote(event.target.value)} disabled={saving}
                placeholder="Agregá una nota si lo necesitás" rows={1} className="block min-h-14 w-full resize-y rounded-lg border border-[#929096] p-4 text-sm leading-6 [field-sizing:content] disabled:bg-[#f5f5f5]" />
            </label>
            <p className="text-xs text-[#605e64]">Solo el administrador y el staff autorizados de este club pueden ver la nota.</p>
            <p className="text-xs">La marca será visible para el jugador.</p>
          </section>}
          {view === 'category' && <section className="space-y-3">
            <h2 className="text-xl font-bold">Elegí su nueva categoría</h2>
            <p id="category-label" className="text-sm font-medium">Nueva categoría en este club</p>
            {flow.catalog.isPending ? <p role="status">Cargando catálogo…</p> : flow.catalog.isError
              ? <p role="alert">No pudimos cargar las categorías. <Button variant="link" onClick={() => void flow.catalog.refetch()}>Reintentar</Button></p>
              : !flow.catalog.data?.length ? <p role="status">No hay categorías disponibles.</p>
              : <Select value={flow.categoryId} onValueChange={flow.setCategoryId}>
                <SelectTrigger aria-labelledby="category-label" className="h-12"><SelectValue placeholder="Seleccioná una categoría" /></SelectTrigger>
                <SelectContent>{flow.catalog.data.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
              </Select>}
            <p className="text-sm">{futureNotice}</p>
            {player.localCategory && <p className="text-sm">La categoría local puede cambiarse por otra, pero no quitarse.</p>}
          </section>}
          {view === 'confirm-category' && <section className="space-y-3">
            <h2 className="text-xl font-bold">Categoría en este club</h2>
            <p className="text-lg font-semibold">{player.effectiveCategory?.name ?? 'Sin categoría'} → {flow.selected?.name}</p>
            <p className="text-sm">{futureNotice}</p>
            {flow.clearsObservation && <div className="rounded-lg bg-[#f8f8e9] p-3 text-sm"><h3 className="font-semibold">Se quitará la observación</h3><p>Al guardar este cambio se eliminarán la marca y la nota interna de este club.</p></div>}
          </section>}
          {view === 'remove' && <section className="space-y-3">
            <h2 className="text-xl font-bold">¿Quitar la observación?</h2>
            <p className="text-sm">Se quitará la marca y se borrará la nota interna. La categoría y las inscripciones del jugador no cambian.</p>
            <p className="rounded-lg bg-[#f8f8e9] p-3 text-sm">Si volvés a observarlo, la nota anterior no se recuperará.</p>
          </section>}
        </>}
      </div>
    </main>
    {footer && <div className="shrink-0 bg-[#f2f2f2] px-4 pb-6 pt-4">
      <div className="mx-auto flex max-w-xl gap-2.5">
        {(view === 'confirm-category' || view === 'remove') && <Button variant="secondary" className={`${button} flex-1`} disabled={saving} onClick={back}>Cancelar</Button>}
        <Button className={`${button} flex-1`} loading={saving} loadingLabel={`${saveText} en curso`}
          disabled={(view === 'category' || view === 'confirm-category') && !flow.validCategory}
          onClick={() => view === 'category' ? open('confirm-category') : void flow.save()}>{view === 'category' ? 'Continuar' : saveText}</Button>
      </div>
    </div>}
    <ClubBottomNav selectedLabel="Jugadores" busy={saving} onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')}
      onPlayers={returnToList} />
    <dialog ref={dialog} aria-labelledby="discard-title" onCancel={event => { event.preventDefault(); closeDiscard(false) }}
      className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-6 text-dark-900 backdrop:bg-black/40">
      <h2 id="discard-title" className="text-xl font-bold">¿Descartar los cambios?</h2>
      <p className="my-3 text-sm">Tenés cambios sin guardar.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => closeDiscard(false)}>Seguir editando</Button>
        <Button onClick={() => closeDiscard(true)}>Descartar cambios</Button>
      </div>
    </dialog>
  </div>
}
