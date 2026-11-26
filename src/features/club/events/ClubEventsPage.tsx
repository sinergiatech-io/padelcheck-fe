import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { useAuth } from '@/context/AuthContext'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { Notice } from '../venues/ClubVenuesPage'
import backIcon from '@/assets/venues/back.svg'
import editIcon from '@/assets/venues/edit.svg'
import listPin from '@/assets/club-events/list-pin.svg'
import listDate from '@/assets/club-events/list-date.svg'
import listArrow from '@/assets/club-events/list-arrow.svg'
import hubPin from '@/assets/club-events/hub-pin.svg'
import hubDate from '@/assets/club-events/hub-date.svg'
import hubPrice from '@/assets/club-events/hub-price.svg'
import hubMenu from '@/assets/club-events/hub-menu.svg'
import hubEmpty from '@/assets/club-events/hub-empty.svg'
import hubCalendarNotice from '@/assets/club-events/hub-calendar-notice.svg'
import hubCancelled from '@/assets/club-events/hub-cancelled.svg'
import menuOpen from '@/assets/club-events/menu-open.svg'
import menuPublish from '@/assets/club-events/menu-publish.svg'
import menuEdit from '@/assets/club-events/menu-edit.svg'
import menuCancel from '@/assets/club-events/menu-cancel.svg'
import modalClose from '@/assets/club-events/modal-close.svg'
import { categoryCount, hubNotice, statusBackground } from './hub-model'
import { clubEvents } from './event-api'
import {
  availableInfrastructure, customNotice, eventDates, eventPrice, isCancellable, presets, statusLabels, toggleChoice, toggleVenue,
  validEventDates, validInfrastructure, venueLocation, type ClubEvent, type ClubEventDetail, type EventDraft,
} from './event-model'
import { detailKey, listKey, useEventDetail, useEventList, useEventSearch, useEventWizard } from './use-club-events'

const ROOT = '/club/events'
const field = 'mt-2 h-14 rounded-lg border-[#929195] bg-[#fefefe] px-4 text-sm shadow-none'
const primary = 'h-12 w-full rounded-lg'
const secondary = 'h-12 rounded-lg border-0 bg-[#f8f8e9] text-[#646707] hover:bg-[#eef0c1]'
const danger = 'h-12 rounded-lg border-0 bg-[#fdecec] text-[#b51e15] hover:bg-[#fac5c5]'

type WizardContinuation = (draft: EventDraft, back: () => void) => ReactNode

export function ClubEventsPage({ continuation }: { continuation?: WizardContinuation }) {
  const { user, destination } = useAuth()
  const { eventId, '*': rest } = useParams()
  if (destination?.kind !== 'club') return <Navigate to="/app" replace />
  const clubId = destination.clubId
  const permissions = user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.permissions
  if (!permissions?.includes('MANAGE_TOURNAMENTS')) {
    return <Shell title="Eventos"><Notice error>No tenés permiso para gestionar los eventos de este club.</Notice></Shell>
  }
  if (eventId === 'new') return <Wizard key={clubId} clubId={clubId} continuation={continuation} />
  if (eventId) return <EventScreen key={clubId + ':' + eventId} clubId={clubId} eventId={eventId} editing={rest === 'edit'} />
  return <EventList key={clubId} clubId={clubId} />
}

function Shell({ title, children, footer, back, headerAction, hub = false, wizard = false }: {
  title: string; children: ReactNode; footer?: ReactNode; back?: () => void; headerAction?: ReactNode; hub?: boolean; wizard?: boolean
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const initials = [user?.firstName, user?.lastName].map(name => name?.[0] ?? '').join('')
  return <div className="flex h-dvh flex-col bg-[#f6f6f6] text-[#120f18]">
    <header className="shrink-0 bg-[#120f18] text-[#fefefe]">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
        {back && <button type="button" onClick={back} aria-label="Volver" className="flex h-10 w-8 items-center justify-center"><img src={backIcon} alt="" /></button>}
        <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
        {headerAction}
        {!back && initials && <span className="mr-1 flex size-8 items-center justify-center rounded-full bg-[#c9cf38] text-xs font-medium text-[#120f18]">{initials}</span>}
      </div>
    </header>
    <main className={'flex-1 overflow-y-auto ' + (wizard ? 'bg-[#fefefe]' : '')}>
      <div className={'mx-auto flex max-w-xl flex-col pb-6 ' + (hub ? 'gap-7 pt-5 ' : 'gap-4 pt-6 ') + (wizard ? 'px-8' : 'px-4')}>{children}</div>
    </main>
    {footer && <footer className={'shrink-0 px-8 pb-6 pt-4 ' + (wizard ? 'bg-[#fefefe]' : '')}>
      <div className="mx-auto max-w-[32rem]">{footer}</div>
    </footer>}
    {!wizard && <ClubBottomNav selectedLabel="Eventos" onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} />}
  </div>
}

function EventList({ clubId }: { clubId: string }) {
  const events = useEventList(clubId)
  const search = useEventSearch(events.data ?? [])
  const navigate = useNavigate()
  return <Shell title="Eventos" footer={<Button className={primary} onClick={() => navigate(ROOT + '/new')}>Crear evento</Button>}>
    <label className="relative block">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"><SearchFieldIcon size={24} color="#605E64" /></span>
      <Input className="h-10 rounded-2xl border-[#b6b5b7] bg-[#fefefe] pl-12 text-sm shadow-none"
        aria-label="Buscar eventos" placeholder="Buscar eventos" value={search.search} onChange={event => search.setSearch(event.target.value)} />
    </label>
    {events.isPending && <div className="flex flex-col gap-4" role="status" aria-label="Cargando eventos">{[1, 2].map(item =>
      <div key={item} className="h-[259px] animate-pulse rounded-2xl bg-[#dedede] motion-reduce:animate-none" />,
    )}</div>}
    {events.isError && <Retry retry={() => void events.refetch()}>No pudimos cargar los eventos.</Retry>}
    {search.searching && events.data && <div role="status" className="flex items-center gap-4 rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3">
      <img src={listDate} alt="" /><div><strong className="text-sm">Buscando eventos</strong><p className="text-xs text-[#605e64]">Esperá un momento.</p></div>
    </div>}
    {events.data && !search.searching && search.events.length === 0 &&
      <section className="flex flex-col items-center gap-4 py-12 text-center">
        <h2 className="text-base font-semibold">{search.search.trim() ? 'Sin resultados' : 'Todavía no hay eventos'}</h2>
        <p className="text-sm text-[#605e64]">{search.search.trim() ? 'Probá otra búsqueda.' : 'Creá un evento para empezar.'}</p>
        {search.search.trim() && <Button variant="secondary" onClick={() => search.setSearch('')}>Limpiar búsqueda</Button>}
      </section>}
    {search.events.map(event => <EventCard key={event.id} event={event} />)}
  </Shell>
}

function EventCard({ event }: { event: ClubEvent }) {
  const location = venueLocation(event.venues)
  return <article className="overflow-hidden rounded-2xl border border-[#e7e7e8] bg-[#fefefe]">
    <div className="flex h-[110px] items-start justify-end bg-gradient-to-br from-[#e5e8a0] to-[#eef0c1] p-3">
      <span className={'rounded-lg px-2 py-1 text-xs leading-4 ' + (event.status === 'INSCRIPTION_OPEN' ? 'bg-[#c9cf38]' : 'bg-[#dedde0]')}>{statusLabels[event.status]}</span>
    </div>
    <div className="flex flex-col gap-1 px-4 pb-2 pt-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className={'flex-1 text-base font-semibold ' + (event.status !== 'DRAFT' ? 'text-center' : '')}>{event.name}</h2>
        {event.status === 'DRAFT' && <Link to={ROOT + '/' + event.id + '/edit'} aria-label={'Editar ' + event.name}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff5e7]"><img src={editIcon} alt="" /></Link>}
      </div>
      <p className="text-sm text-[#605e64]">{event.venues.map(venue => venue.name).join(' y ')}</p>
      {location && <p className="flex items-center gap-2 text-xs text-[#605e64]"><img src={listPin} alt="" />{location}</p>}
      <p className="flex items-center gap-2 text-xs text-[#605e64]"><img src={listDate} alt="" />{eventDates(event.startDate, event.endDate)}</p>
      <Link className="mt-2 flex min-h-8 items-center justify-between text-sm font-semibold text-[#6b7009]" to={ROOT + '/' + event.id}>Ver detalles<img src={listArrow} alt="" /></Link>
    </div>
  </article>
}

function Retry({ children, retry }: { children: ReactNode; retry: () => void }) {
  return <Notice error>{children} <button type="button" className="font-semibold underline" onClick={retry}>Reintentar</button></Notice>
}

function EventScreen({ clubId, eventId, editing }: { clubId: string; eventId: string; editing: boolean }) {
  const query = useEventDetail(clubId, eventId)
  const navigate = useNavigate()
  const event = query.data
  if (event && editing && event.status === 'DRAFT') return <Wizard clubId={clubId} event={event} />
  const error = query.isError && <div className="flex flex-col gap-7">
    <Notice error><strong>No pudimos cargar el evento</strong><br />Volvé a intentar para ver su información.</Notice>
    <Button className={primary} onClick={() => void query.refetch()}>Reintentar</Button>
  </div>
  if (event) return <EventHub clubId={clubId} event={event} loadError={error} />
  return <Shell title="Gestión del evento" hub back={() => navigate(ROOT)}>
    {query.isPending && <div role="status" aria-label="Cargando evento" className="h-40 animate-pulse rounded-2xl bg-[#dedede] motion-reduce:animate-none" />}
    {error}
  </Shell>
}

function HubSummary({ event }: { event: ClubEventDetail }) {
  const venue = [event.venues.map(item => item.name).join(' y '), venueLocation(event.venues)].filter(Boolean).join(' · ')
  return <article className="rounded-2xl border border-[#e7e7e8] bg-[#fefefe] p-[15px]">
    <div className="mb-2 flex items-start justify-between gap-2">
      <h2 className="min-w-0 break-words text-base font-semibold">{event.name}</h2>
      <span className="shrink-0 rounded-lg px-2 py-1 text-xs leading-4" style={{ backgroundColor: statusBackground(event.status) }}>{statusLabels[event.status]}</span>
    </div>
    <div className="flex flex-col gap-3 text-sm font-medium leading-5 text-[#605e64]">
      {venue && <p className="flex items-start gap-2"><img src={hubPin} alt="" />{venue}</p>}
      <p className="flex items-center gap-2"><img src={hubDate} alt="" />{eventDates(event.startDate, event.endDate)}</p>
      <p className="flex items-center gap-2"><img src={hubPrice} alt="" />{eventPrice(event.entryFee)}</p>
    </div>
  </article>
}

function EventHub({ clubId, event, loadError }: { clubId: string; event: ClubEventDetail; loadError: ReactNode }) {
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [sheet, setSheet] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const pending = useRef(false)
  const more = useRef<HTMLButtonElement>(null)
  const notice = hubNotice(event)
  const editable = event.status === 'DRAFT'
  const cancellable = isCancellable(event.status)

  function dismissDialog() {
    setConfirm(false)
    more.current?.focus()
  }

  async function cancel() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const result = await clubEvents.cancel(clubId, event.id)
      await cache.cancelQueries({ queryKey: detailKey(clubId, event.id) })
      cache.setQueryData(detailKey(clubId, event.id), result)
      void cache.invalidateQueries({ queryKey: listKey(clubId) })
      setConfirm(false)
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <Shell title="Gestión del evento" hub back={() => navigate(ROOT)} headerAction={cancellable && <button type="button" ref={more}
    aria-label="Acciones del evento" aria-haspopup="dialog" aria-expanded={sheet}
    className="flex size-11 shrink-0 items-center justify-center rounded-lg" onClick={() => setSheet(true)}>
    <img src={hubMenu} alt="" />
  </button>}>
    {loadError}
    <HubSummary event={event} />
    {notice && <div role="status" className={'flex items-center gap-3 rounded-lg border p-3 ' +
      (notice.tone === 'warning' ? 'border-[#ffdca8] bg-[#fcf4e6]' : 'border-[#e7e7e8] bg-[#f6f6f6]')}>
      <img src={notice.tone === 'warning' ? hubCalendarNotice : hubCancelled} alt="" />
      <div><strong className="block text-sm leading-5">{notice.title}</strong><p className="text-xs leading-4 text-[#605e64]">{notice.detail}</p></div>
    </div>}
    {event.schedulingMode && <p className="text-sm text-[#605e64]">Programación {event.schedulingMode === 'AUTO' ? 'automática' : 'manual'}</p>}
    <section aria-label="Categorías" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Categorías</h2>
        {event.divisionCount > 0 && <span className="text-xs text-[#605e64]">{categoryCount(event.divisionCount)}</span>}
      </div>
      {event.divisionCount === 0 && <div className="flex flex-col items-center gap-1 rounded-2xl border border-[#dedde0] bg-[#fefefe] p-2 text-center text-sm text-[#605e64]">
        <img src={hubEmpty} alt="" /><p className="font-medium">Todavía no hay categorías</p>
        {editable && <p className="max-w-48 text-left text-xs leading-4">Agregá una categoría para publicar el evento o abrir la inscripción.</p>}
      </div>}
    </section>
    {sheet && cancellable && <EventActionSheet event={event} close={() => setSheet(false)}
      edit={() => navigate(ROOT + '/' + event.id + '/edit')}
      cancel={() => { setSheet(false); setError(false); setConfirm(true) }} />}
    {confirm && <CancelDialog event={event} busy={busy} error={error} close={dismissDialog} cancel={() => void cancel()} />}
  </Shell>
}

function EventActionSheet({ event, close, edit, cancel }: {
  event: ClubEventDetail; close: () => void; edit: () => void; cancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} aria-labelledby="event-actions-heading"
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}
    className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[85dvh] w-full max-w-xl rounded-t-[20px] bg-[#fefefe] p-0 text-[#120f18] shadow-2xl backdrop:bg-[#120f18]/40">
    <div className="px-5 pb-6 pt-2">
      <div aria-hidden className="mx-auto mb-4 h-1 w-9 rounded bg-[#c4c3c7]" />
      <h2 id="event-actions-heading" className="mb-2 text-lg font-semibold leading-7">Acciones del evento</h2>
      {event.status === 'DRAFT' && <>
        {event.divisionCount === 0 && <>
          <EventAction icon={menuOpen} label="Abrir inscripción" detail="Requiere al menos una categoría" />
          <EventAction icon={menuPublish} label="Publicar" detail="Requiere al menos una categoría" />
        </>}
        <EventAction icon={menuEdit} label="Editar evento" detail="Nombre, sede y fechas" onClick={edit} />
      </>}
      <div className={event.status === 'DRAFT' ? 'mt-2 border-t border-[#e7e7e8] pt-2' : ''}>
        <EventAction icon={menuCancel} label="Cancelar evento" detail="Pide confirmación · se conserva el historial" destructive onClick={cancel} />
      </div>
    </div>
  </dialog>
}

function EventAction({ icon, label, detail, destructive = false, onClick }: {
  icon: string; label: string; detail: string; destructive?: boolean; onClick?: () => void
}) {
  return <button type="button" disabled={!onClick} onClick={onClick} className="flex min-h-[62px] w-full items-center gap-4 rounded-lg text-left enabled:hover:bg-[#f6f6f6]">
    <img src={icon} alt="" />
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className={'text-sm font-semibold ' + (destructive ? 'text-[#b51e15]' : onClick ? 'text-[#120f18]' : 'text-[#605e64]')}>{label}</span>
      <span className="text-xs leading-4 text-[#605e64]">{detail}</span>
    </span>
  </button>
}

function CancelDialog({ event, busy, error, close, cancel }: {
  event: ClubEventDetail; busy: boolean; error: boolean; close: () => void; cancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} aria-labelledby="cancel-event" onCancel={event => { event.preventDefault(); if (!busy) close() }}
    className="w-[calc(100%-24px)] max-w-[374px] rounded-2xl bg-[#fefefe] p-0 text-[#120f18] backdrop:bg-black/40">
    <header className="flex items-center justify-between border-b border-[#e7e7e8] p-4"><h2 id="cancel-event" className="font-semibold">¿Cancelar este evento?</h2><button disabled={busy} aria-label="Cerrar" onClick={close}><img src={modalClose} alt="" /></button></header>
    <div className="flex flex-col gap-4 p-4"><p className="font-semibold">{event.name}</p><p className="text-sm text-[#605e64]">El evento quedará cancelado. Se conservarán su historial y las inscripciones existentes.</p>
      {error && <Notice error>No pudimos cancelar el evento. Podés volver a intentarlo.</Notice>}
      <div className="flex gap-3 pt-3"><Button variant="secondary" className={secondary + ' flex-1'} disabled={busy} onClick={close}>Volver</Button><Button variant="secondary" className={danger + ' flex-1' + (busy ? ' disabled:opacity-100' : '')} loading={busy} loadingLabel="Cancelando evento" onClick={cancel}>Cancelar evento</Button></div>
    </div>
  </dialog>
}

function Wizard({ clubId, event, continuation }: { clubId: string; event?: ClubEventDetail; continuation?: WizardContinuation }) {
  const navigate = useNavigate()
  const cache = useQueryClient()
  const { step, setStep, draft, setDraft, calendar, preview, infrastructure } = useEventWizard(clubId, event)
  const [showVenues, setShowVenues] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const pending = useRef(false)
  const options = infrastructure.data ?? []
  const selected = options.filter(venue => draft.venueIds.includes(venue.id))
  const available = availableInfrastructure(draft, options)
  const removedResources = available.venueIds.length !== draft.venueIds.length ||
    available.courtIds.length !== draft.courtIds.length
  const set = (values: Partial<EventDraft>) => setDraft(value => ({ ...value, ...values }))
  const back = () => {
    if (pending.current) return
    if (step > 1) setStep(step - 1)
    else navigate(event ? ROOT + '/' + event.id : ROOT)
  }
  async function next() {
    if (pending.current) return
    if (step === 1 && !validEventDates(draft)) {
      setInvalid(true)
      return
    }
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (!event) {
      setStep(4)
      return
    }
    pending.current = true
    setBusy(true)
    setError(false)
    try {
      const saved = await clubEvents.update(clubId, event.id, { ...draft, name: draft.name.trim() })
      await cache.cancelQueries({ queryKey: detailKey(clubId, event.id) })
      cache.setQueryData(detailKey(clubId, event.id), saved)
      void cache.invalidateQueries({ queryKey: listKey(clubId) })
      navigate(ROOT + '/' + event.id, { replace: true })
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (step === 4 && continuation) return continuation(draft, back)
  const disabled = step === 2 && !draft.playCalendarPreset || step === 3 &&
    (!infrastructure.data || !validInfrastructure(draft, infrastructure.data))
  return <Shell title={event ? 'Editar evento' : 'Crear evento'} wizard back={back}
    footer={step < 4 && <div className="flex flex-col gap-2">{event && <Button variant="secondary" className={secondary} disabled={busy} onClick={() => navigate(ROOT + '/' + event.id)}>Volver sin guardar</Button>}<Button className={primary + (busy ? ' max-md:disabled:opacity-100' : '')} disabled={disabled} loading={busy} loadingLabel="Guardando evento" onClick={() => void next()}>{event && step === 3 ? 'Guardar' : 'Siguiente'}</Button></div>}>
    <p className="text-sm text-[#605e64]">Paso {step} de {event ? 3 : 6}</p>
    {step === 1 && <>
      <h2 className="text-base font-semibold">Datos del evento</h2>
      <label className="text-sm font-medium">Nombre del evento <span className="text-red-600">*</span>
        <Input className={field} required maxLength={255} value={draft.name} onChange={event => set({ name: event.target.value })} /></label>
      <label className="text-sm font-medium">Fecha de inicio <span className="text-red-600">*</span>
        <Input className={field} required type="date" value={draft.startDate} onChange={event => set({ startDate: event.target.value })} /></label>
      <label className="text-sm font-medium">Fecha de finalización <span className="text-red-600">*</span>
        <Input className={field} required type="date" min={draft.startDate || undefined} value={draft.endDate} onChange={event => set({ endDate: event.target.value })} /></label>
      {invalid && !validEventDates(draft) && <Notice error>Completá el nombre y las fechas. La fecha de finalización debe ser igual o posterior al inicio.</Notice>}
    </>}
    {step === 2 && <fieldset className="flex flex-col gap-3"><legend className="mb-3 text-base font-semibold">Calendario de juego</legend>
      <p className="text-sm text-[#605e64]">{eventDates(draft.startDate, draft.endDate)} · Horario base del club</p>
      {presets.map(preset => <label key={preset.value} className={'flex min-h-16 cursor-pointer items-center justify-between rounded-xl p-3 pr-8 ' + (draft.playCalendarPreset === preset.value ? 'bg-[#f8f8e9]' : 'bg-[#fdfdfc]')}>
        <span><span className="block text-base font-semibold">{preset.title}</span><span className="block text-sm text-[#605e64]">{preset.subtitle}</span></span>
        <input type="radio" name="play-calendar" value={preset.value} checked={draft.playCalendarPreset === preset.value} onChange={() => set({ playCalendarPreset: preset.value })} className="h-5 w-5 accent-[#a9b12b]" />
      </label>)}
      {draft.playCalendarPreset === 'CUSTOM' && <Notice>{customNotice}</Notice>}
      {preview.isFetching && <p role="status" className="text-sm">Consultando horarios…</p>}
      {preview.isError && <Retry retry={() => void preview.refetch()}>No pudimos consultar los horarios.</Retry>}
      {calendar && draft.playCalendarPreset !== 'CUSTOM' && <Notice success={calendar.status === 'COMPLETE'}>
        <strong>{calendar.status === 'COMPLETE' ? 'Calendario completo' : 'Horarios a confirmar'}</strong>
        {calendar.days.slice(0, 3).map(day => <span className="block" key={day.date}>{eventDates(day.date, day.date)} · {day.intervals.map(interval => interval.open.slice(0, 5) + '–' + interval.close.slice(0, 5)).join(' y ')}</span>)}
      </Notice>}
    </fieldset>}
    {step === 3 && <>
      <h2 className="text-base font-semibold">Sedes y canchas</h2>
      <p className="text-sm text-[#605e64]">Seleccioná al menos una sede y una cancha para continuar.</p>
      {infrastructure.isPending && <p role="status" className="text-sm">Cargando sedes y canchas…</p>}
      {infrastructure.isError && <Retry retry={() => void infrastructure.refetch()}>No pudimos cargar las sedes.</Retry>}
      {infrastructure.data?.length === 0 && <Notice>No hay sedes activas en el club.</Notice>}
      {infrastructure.data && infrastructure.data.length > 0 && <>
        <p className="text-sm text-[#605e64]">{selected.length} sedes · {draft.courtIds.length} canchas seleccionadas</p>
        <Button variant="secondary" className={secondary} aria-expanded={showVenues} onClick={() => setShowVenues(!showVenues)}>Agregar sede</Button>
        {showVenues && <fieldset className="flex flex-col gap-3 rounded-2xl bg-[#f6f7f8] p-4"><legend className="text-sm font-semibold">Sedes del club</legend>
          {infrastructure.data.map(venue => <label key={venue.id} className="flex items-center gap-3 text-sm"><input className="accent-[#a9b12b]" type="checkbox" checked={draft.venueIds.includes(venue.id)} onChange={() => setDraft(value => toggleVenue(value, venue))} />{venue.name}</label>)}
        </fieldset>}
        {selected.map(venue => <fieldset disabled={busy} key={venue.id} className="flex flex-col rounded-2xl bg-[#f6f7f8] p-3">
          <h3 className="font-semibold">{venue.name} · {venue.courts.length} canchas</h3>
          {venue.courts.length === 0 && <p className="py-2 text-sm text-[#605e64]">Esta sede no tiene canchas activas.</p>}
          {venue.courts.map(court => <label key={court.id} className="flex min-h-14 items-center gap-6 pl-4 text-sm text-[#605e64]"><input type="checkbox" className="h-[18px] w-[18px] accent-[#a9b12b]" checked={draft.courtIds.includes(court.id)} onChange={() => setDraft(value => ({ ...value, courtIds: toggleChoice(value.courtIds, court.id) }))} />{court.name}</label>)}
        </fieldset>)}
        {removedResources && <Retry retry={() => set(available)}>Hay recursos que ya no están disponibles.</Retry>}
      </>}
      {error && <Notice error>No pudimos guardar el evento. Tus cambios siguen disponibles para reintentar.</Notice>}
    </>}
    {step === 4 && <><h2 className="font-semibold">Categorías</h2><Notice>La configuración de categorías todavía no está disponible.</Notice></>}
  </Shell>
}
