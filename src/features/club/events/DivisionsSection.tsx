import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import hubEmpty from '@/assets/club-events/hub-empty.svg'
import modalClose from '@/assets/club-events/modal-close.svg'
import { Shell, danger, primary, secondary } from './EventShell'
import { divisionApi } from './division-api'
import { DivisionRegistration } from './DivisionRegistration'
import {
  activeDivisions, catalogNames, savedTitle, criterionLabel, divisionTitle, divisionWrite, emptySelection, errorCode, limitReason, planLimitRemaining,
  remainingQuota, savedCatalog, selectionSize, selectionSummary, toSelection, toWrites, validCriterion, validMaxPairs,
  validSelection, type Division, type Selection,
} from './division-model'
import { Banner, CardAction, CardActions, CatalogState, CriterionFields, DivisionCard, LimitBanner, QuotaFields } from './division-ui'
import { statusLabels, type ClubEventDetail } from './event-model'
import { categoryCount } from './hub-model'
import { detailKey, listKey } from './use-club-events'
import { divisionsKey, limitKey, useCatalog, useDivisionLimit, useDivisions } from './use-divisions'

const ROOT = '/club/events'

function useAdmin(clubId: string) {
  const { user } = useAuth()
  return user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.role === 'CLUB_ADMIN'
}

function useRefreshEvent(clubId: string, eventId: string) {
  const cache = useQueryClient()
  return () => Promise.all([
    cache.invalidateQueries({ queryKey: divisionsKey(clubId, eventId) }),
    cache.invalidateQueries({ queryKey: limitKey(clubId, eventId) }),
    cache.invalidateQueries({ queryKey: detailKey(clubId, eventId) }),
    cache.invalidateQueries({ queryKey: listKey(clubId) }),
  ])
}

/** Hub «Categorías» (KAN-254 vocabulary): loading, error + retry, empty, one/many, cancelled history. */
export function DivisionsSection({ clubId, event }: { clubId: string; event: ClubEventDetail }) {
  const navigate = useNavigate()
  const location = useLocation()
  const admin = useAdmin(clubId)
  const editable = event.status === 'DRAFT'
  const divisions = useDivisions(clubId, event.id)
  const limit = useDivisionLimit(clubId, event.id, editable)
  const refresh = useRefreshEvent(clubId, event.id)
  const [cancelling, setCancelling] = useState<Division | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const saved = (location.state as { divisionSaved?: boolean } | null)?.divisionSaved === true
  const opener = useRef<HTMLButtonElement | null>(null)

  const all = divisions.data ?? []
  const active = activeDivisions(all)
  const history = all.filter(division => division.status === 'CANCELLED')
  const remaining = remainingQuota(limit.data, active.length)
  const atLimit = editable && remaining === 0
  const base = ROOT + '/' + event.id + '/divisions'

  return <section aria-label="Categorías" className="flex flex-col gap-3">
    {saved && !cancelled && <Banner tone="success" title="Cambios guardados">La categoría se actualizó y el evento sigue en borrador.</Banner>}
    {cancelled && <Banner tone="success" title="Categoría cancelada">Historial conservado. Las demás categorías no cambian.</Banner>}
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Categorías</h2>
      {divisions.isSuccess && active.length > 0 && <span className="text-xs text-[#605e64]">{categoryCount(active.length)}</span>}
    </div>
    {divisions.isPending && <Banner tone="loading" title="Cargando categorías">Estamos consultando la configuración del evento.</Banner>}
    {divisions.isError && <>
      <Banner tone="error" title="No pudimos cargar las categorías">Volvé a intentar para consultar y gestionar las categorías.</Banner>
      <Button variant="secondary" className={secondary} onClick={() => void divisions.refetch()}>Reintentar</Button>
    </>}
    {divisions.isSuccess && active.length === 0 && <div className="flex flex-col items-center gap-1 rounded-2xl border border-[#dedde0] bg-[#fefefe] p-2 text-center text-sm text-[#605e64]">
      <img src={hubEmpty} alt="" /><p className="font-medium">Todavía no hay categorías</p>
      {editable && <p className="max-w-48 text-left text-xs leading-4">Agregá una categoría para publicar el evento o abrir la inscripción.</p>}
    </div>}
    {active.map(division => {
      const title = savedTitle(division)
      return <div key={division.id} className="flex flex-col gap-2">
        <DivisionCard title={title} maxPairs={division.maxPairs} type={criterionLabel(division)} substitutes={division.substitutesAllowed} />
        <CardActions>
          {editable ? <>
            <CardAction label="Editar" aria={'Editar ' + title} onClick={() => navigate(base + '/' + division.id + '/edit')} />
            <CardAction label="Cancelar categoría" aria={'Cancelar categoría ' + title} onClick={() => {
              opener.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
              setCancelled(false)
              setCancelling(division)
            }} />
          </> : <CardAction label="Consultar" aria={'Consultar ' + title} onClick={() => navigate(base + '/' + division.id)} />}
        </CardActions>
      </div>
    })}
    {history.length > 0 && <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[#605e64]">Canceladas</h3>
      {history.map(division => <DivisionCard key={division.id} muted title={savedTitle(division)} maxPairs={division.maxPairs}
        type={criterionLabel(division)} substitutes={division.substitutesAllowed}
        footer={<p className="border-t border-[#e7e7e8] px-4 py-3 text-xs leading-4 text-[#605e64]"><strong className="block text-sm text-[#b51e15]">Categoría cancelada</strong>Historial conservado. Las demás categorías no cambian.</p>} />)}
    </div>}
    {editable && divisions.isSuccess && <Button variant="secondary" className={secondary + ' disabled:bg-[#eef0c1] disabled:text-[#605e64] disabled:opacity-100'}
      disabled={atLimit} onClick={() => navigate(base + '/new')}>Agregar categoría</Button>}
    {atLimit && limit.data && <LimitBanner admin={admin} reason={limitReason(limit.data.limit ?? 0, limit.data.planCode, 'hub')} />}
    {cancelling && <CancelDivisionDialog clubId={clubId} eventId={event.id} division={cancelling}
      close={() => { setCancelling(null); opener.current?.focus() }}
      done={() => { setCancelling(null); setCancelled(true); void refresh() }} />}
  </section>
}

function CancelDivisionDialog({ clubId, eventId, division, close, done }: {
  clubId: string; eventId: string; division: Division; close: () => void; done: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const pending = useRef(false)
  const cache = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => { dialog.current?.showModal() }, [])
  async function cancel() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const result = await divisionApi.cancel(clubId, eventId, division.id)
      cache.setQueryData<Division[]>(divisionsKey(clubId, eventId), list => list?.map(item => item.id === result.id ? result : item))
      done()
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <dialog ref={dialog} aria-labelledby="cancel-division" aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) close() }}
    className="w-[calc(100%-24px)] max-w-[374px] rounded-2xl bg-[#fefefe] p-0 text-[#120f18] backdrop:bg-black/40">
    <header className="flex items-center justify-between border-b border-[#e7e7e8] p-4">
      <h2 id="cancel-division" className="text-lg font-semibold">¿Cancelar esta categoría?</h2>
      <button type="button" disabled={busy} aria-label="Cerrar" onClick={close}><img src={modalClose} alt="" /></button>
    </header>
    <div className="flex flex-col gap-4 p-4">
      <p className="text-base font-semibold">{savedTitle(division)}</p>
      <p className="text-sm text-[#605e64]">Se conservará su historial y las demás categorías del evento no se modificarán.</p>
      {busy && <Banner tone="loading" title="Cancelando categoría">Esperá a que termine la operación.</Banner>}
      {error && <Banner tone="error" title="No pudimos cancelar">La categoría sigue activa. Volvé a intentar.</Banner>}
      <div className="flex gap-3 pt-3">
        <Button variant="secondary" className={secondary + ' flex-1'} disabled={busy} onClick={close}>Volver</Button>
        <Button variant="secondary" className={danger + ' flex-1' + (busy ? ' disabled:opacity-100' : '')} loading={busy}
          loadingLabel="Cancelando categoría" onClick={() => void cancel()}>Cancelar categoría</Button>
      </div>
    </div>
  </dialog>
}

/**
 * Hub add / edit / view of one category. DRAFT: configuration (KAN-77 3090:33678) then quota and
 * substitutes (3088:33060). Outside DRAFT the quota screen is read-only (3094:33750).
 */
export function DivisionScreen({ clubId, event, divisionId }: { clubId: string; event: ClubEventDetail; divisionId: string | null; }) {
  const navigate = useNavigate()
  const location = useLocation()
  const divisions = useDivisions(clubId, event.id)
  const division = divisionId ? divisions.data?.find(item => item.id === divisionId) : undefined
  const hub = ROOT + '/' + event.id
  const leave = () => navigate(hub, { replace: true })
  if (divisionId && divisions.isSuccess && !division) {
    return <Shell title="Consultar división" wizard back={leave}><Banner tone="error" title="No encontramos la división">Volvé al evento para ver sus categorías.</Banner></Shell>
  }
  if (divisionId && !division) {
    return <Shell title="Editar división" wizard back={leave}>
      {divisions.isPending && <Banner tone="loading" title="Cargando división">Estamos consultando la configuración del evento.</Banner>}
      {divisions.isError && <>
        <Banner tone="error" title="No pudimos cargar la división">Volvé a intentar para consultar y gestionar la categoría.</Banner>
        <Button variant="secondary" className={secondary} onClick={() => void divisions.refetch()}>Reintentar</Button>
      </>}
    </Shell>
  }
  const readOnly = event.status !== 'DRAFT' || division?.status === 'CANCELLED' || !location.pathname.endsWith(divisionId ? '/edit' : '/new')
  if (division && readOnly) return <DivisionView clubId={clubId} event={event} division={division} leave={leave} />
  return <DivisionEditor key={division?.id ?? 'new'} clubId={clubId} event={event} division={division} leave={leave}
    activeCount={activeDivisions(divisions.data ?? []).length} />
}

function DivisionView({ clubId, event, division, leave }: { clubId: string; event: ClubEventDetail; division: Division; leave: () => void }) {
  const selection = toSelection([divisionWrite(division)])
  const admin = useAdmin(clubId)
  const showRegistration = division.status !== 'CANCELLED' &&
    (event.status === 'INSCRIPTION_OPEN' || event.status === 'INSCRIPTION_CLOSED')
  return <Shell title="Consultar división" wizard back={leave} footer={<Button className={primary} onClick={leave}>Volver al evento</Button>}>
    <p className="text-xs text-[#605e64]">{division.status === 'CANCELLED' ? 'Categoría cancelada' : statusLabels[event.status]}</p>
    <h2 className="text-xl font-bold leading-7">{savedTitle(division)}</h2>
    <p className="text-sm font-medium text-[#605e64]">{selectionSummary(selection, savedCatalog(division))}</p>
    {showRegistration && <DivisionRegistration key={clubId + '/' + event.id + '/' + division.id}
      scope={{ clubId, eventId: event.id, divisionId: division.id }}
      open={event.status === 'INSCRIPTION_OPEN' && division.status === 'INSCRIPTION_OPEN'} admin={admin} />}
    <QuotaFields selection={selection} set={() => undefined} touched={false} fixed />
  </Shell>
}

function DivisionEditor({ clubId, event, division, leave, activeCount }: {
  clubId: string; event: ClubEventDetail; division?: Division; leave: () => void; activeCount: number
}) {
  const navigate = useNavigate()
  const admin = useAdmin(clubId)
  const catalog = useCatalog()
  const limit = useDivisionLimit(clubId, event.id)
  const refresh = useRefreshEvent(clubId, event.id)
  const [selection, setSelection] = useState<Selection>(() => division ? toSelection([divisionWrite(division)]) : emptySelection())
  const [step, setStep] = useState<'config' | 'quota'>('config')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [overflow, setOverflow] = useState(false)
  const [rejected, setRejected] = useState<number | null>(null)
  const pending = useRef(false)
  const categories = catalog.data ?? []
  const editing = Boolean(division)
  const remaining = editing ? null : remainingQuota(limit.data, activeCount)
  const batchTooLarge = remaining !== null && selectionSize(selection) > remaining
  const reason = (left?: number) => limitReason(limit.data?.limit ?? 0, limit.data?.planCode ?? '', 'hub', left)
  const set = (next: Selection) => { setOverflow(false); setSelection(next) }

  function back() {
    if (pending.current) return
    if (step === 'quota') { setStep('config'); setFailed(null); return }
    leave()
  }

  async function save() {
    if (pending.current) return
    if (!validSelection(selection, categories)) { setTouched(true); return }
    pending.current = true
    setBusy(true)
    setFailed(null)
    setRejected(null)
    try {
      if (division) await divisionApi.update(clubId, event.id, division.id, toWrites(selection)[0])
      else await divisionApi.createBatch(clubId, event.id, toWrites(selection))
      await refresh()
      navigate(ROOT + '/' + event.id, { replace: true, state: { divisionSaved: editing } })
    } catch (error) {
      const left = planLimitRemaining(error)
      if (left !== null) {
        setRejected(left)
        void limit.refetch()
      } else {
        const code = errorCode(error)
        setFailed(code === 'EVENT_NOT_DRAFT' || code === 'DIVISION_NOT_DRAFT'
          ? 'El evento ya no está en borrador. Volvé al evento para ver su estado.'
          : 'Conservamos los cambios. Volvé a intentar.')
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  const title = editing ? 'Editar división' : 'Agregar división'
  if (step === 'config') {
    return <Shell title={title} wizard back={back}
      footer={<Button className={primary} disabled={!catalog.isSuccess || !validCriterion(selection, categories) || batchTooLarge}
        onClick={() => setStep('quota')}>Continuar</Button>}>
      <p className="text-xs text-[#605e64]">Evento en borrador · Configuración</p>
      <h2 className="text-xl font-bold leading-7">{title}</h2>
      {!catalog.isSuccess && <CatalogState pending={catalog.isPending} error={catalog.isError} retry={() => void catalog.refetch()} genderType={selection.genderType} />}
      {catalog.isSuccess && <>
        <p className="text-sm font-medium text-[#605e64]">{editing ? 'Actualizá la configuración de esta división.' : 'Definí quiénes pueden competir.'}</p>
        <CriterionFields selection={selection} set={set} catalog={categories} single={editing}
          canAdd={next => remaining === null || next <= remaining} onOverflow={() => setOverflow(true)} />
        {(overflow || batchTooLarge) && remaining !== null && <LimitBanner admin={admin} reason={reason(remaining)} />}
      </>}
    </Shell>
  }
  const invalid = !validMaxPairs(selection.maxPairsText) || selection.substitutesAllowed === null
  return <Shell title={title} wizard back={back}
    footer={<div className="flex flex-col gap-2">
      <Button variant="secondary" className={secondary} disabled={busy} onClick={leave}>Volver sin guardar</Button>
      <Button className={primary + (busy ? ' max-md:disabled:opacity-100' : '')} disabled={invalid} loading={busy}
        loadingLabel="Guardando división" onClick={() => void save()}>{editing ? 'Guardar cambios' : 'Guardar división'}</Button>
    </div>}>
    <p className="text-xs text-[#605e64]">Evento en borrador</p>
    <h2 className="text-xl font-bold leading-7">{editing ? divisionTitle(toWrites(selection)[0], catalogNames(categories)) : 'Cupo de la división'}</h2>
    <p className="text-sm font-medium text-[#605e64]">{selectionSummary(selection, categories)}</p>
    {failed && <Banner tone="error" title="No pudimos guardar">{failed}</Banner>}
    {rejected !== null && <LimitBanner admin={admin} reason={reason(rejected)} />}
    <QuotaFields selection={selection} busy={busy} touched={touched || selection.maxPairsText !== ''} set={next => { setTouched(true); setSelection(next) }} />
  </Shell>
}
