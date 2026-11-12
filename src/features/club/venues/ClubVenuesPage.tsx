import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { useInfrastructure, useVenueDraft } from './use-infrastructure'
import { catalogMatch, failureCode, failureCopy as failureMessage, parseLocation, pointValid, type Venue, type VenueLocation, type VenueWrite, type Point } from './venues-model'
import { VenueMap } from './VenueMap'
import backIcon from '@/assets/venues/back.svg'
import pinIcon from '@/assets/venues/pin.svg'
import courtIcon from '@/assets/venues/court.svg'
import arrowIcon from '@/assets/venues/arrow.svg'
import editIcon from '@/assets/venues/edit.svg'
import editCourtIcon from '@/assets/venues/edit-court.svg'
import plusIcon from '@/assets/venues/plus.svg'
import venueBadge from '@/assets/venues/venue-badge.svg'
import courtVenueBadge from '@/assets/venues/court-venue-badge.svg'
import infoIcon from '@/assets/venues/info.svg'
import chevronIcon from '@/assets/venues/chevron.svg'
import errorIcon from '@/assets/category-policy/error.svg'
import checkIcon from '@/assets/category-policy/check.svg'
import warningIcon from '@/assets/venues/warning.svg'
import closeIcon from '@/assets/venues/close.svg'

const HOME = '/club/settings', BASE = `${HOME}/venues`
const fieldClass = 'h-14 rounded-lg border-[#929195] bg-[#fefefe] px-4 text-sm font-medium shadow-none'
const Icon = ({ src }: { src: string }) => <img src={src} alt="" className="shrink-0" />
export function Notice({ children, error = false, success = false }: { children: ReactNode; error?: boolean; success?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className={`flex gap-3 rounded-lg border p-3 text-sm ${error ? 'border-[#fac5c5] bg-[#fdecec]' : success ? 'border-[#baedcd] bg-[#e9f9ef]' : 'border-[#c2d8fc] bg-[#ebf3fe]'}`}><Icon src={error ? errorIcon : success ? checkIcon : infoIcon} /><span>{children}</span></div>
}
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <div className="flex flex-col gap-2"><label className="text-sm font-medium">{label}{required && <span aria-hidden className="ml-0.5 text-[#ef4444]">*</span>}{children}</label>{error && <p role="alert" className="text-sm text-[#aa3030]">{error}</p>}</div>
}
function Dialog({ title, children, cancel, confirm, confirmLabel = 'Desactivar', busy = false }: { title: string; children: ReactNode; cancel: () => void; confirm?: () => void; confirmLabel?: string; busy?: boolean }) {
  const element = useRef<HTMLDialogElement>(null)
  useEffect(() => { element.current?.showModal() }, [])
  return <dialog ref={element} aria-labelledby="infrastructure-dialog-title" onCancel={e => { e.preventDefault(); if (!busy) cancel() }} className="w-[calc(100%-28px)] max-w-[374px] rounded-2xl bg-[#fefefe] p-0 text-[#120f18] backdrop:bg-black/40">
    <header className="flex h-14 items-center justify-between border-b border-[#e7e7e8] pl-4 pr-2"><h2 id="infrastructure-dialog-title" className="text-sm font-semibold">{title}</h2><button aria-label="Cerrar" onClick={cancel} disabled={busy} className="flex h-9 w-9 items-center justify-center"><Icon src={closeIcon} /></button></header>
    <div className="p-6 text-sm leading-5 text-[#605e64]">{children}</div><div className="mx-6 flex gap-3 border-t border-[#e7e7e8] pb-6 pt-4"><Button className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" variant="secondary" disabled={busy} onClick={cancel}>{confirm ? 'Cancelar' : 'Entendido'}</Button>{confirm && <Button className={`h-11 flex-1 rounded-lg ${busy ? 'disabled:opacity-100' : ''} ${confirmLabel.startsWith('Desactivar') ? 'bg-[#fdecec] text-[#d93e3e] hover:bg-[#fac5c5]' : ''}`} loading={busy} onClick={confirm}>{confirmLabel}</Button>}</div>
  </dialog>
}
export function MyClubPage() {
  const navigate = useNavigate(), { user, destination } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const allowed = context?.permissions?.includes('MANAGE_CLUB_SETTINGS')
  return <div className="flex h-dvh flex-col bg-[#f7f7f7] text-[#120f18]">
    <header className="flex h-12 shrink-0 items-center bg-[#100e16] px-4 text-white"><h1 className="text-xl font-bold">Mi Club</h1></header>
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 pt-6"><p className="text-base leading-6 text-[#605e64]">Gestioná la información y configuración de tu club</p>{allowed ? <div className="flex flex-col gap-3">{[['Sedes y canchas', BASE], ['Reglas de categorías', `${HOME}/categories`]].map(([label, path]) => <button key={path} onClick={() => navigate(path)} className="flex min-h-14 items-center justify-between gap-5 text-left text-sm"><span className="flex-1 border-b border-[#dedde0] py-4">{label}</span><Icon src={arrowIcon} /></button>)}</div> : <Notice error>No tenés permiso para gestionar la configuración de este club.</Notice>}</main>
    <ClubBottomNav onDashboard={() => navigate('/app')} onClub={() => {}} />
  </div>
}
export function ClubVenuesPage() {
  const navigate = useNavigate(), route = useLocation(), { user, destination } = useAuth()
  const context = destination?.kind === 'club' ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const allowed = Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS'))
  const clubId = allowed ? context?.clubId ?? null : null
  const { model, state } = useInfrastructure(clubId)
  const [club, setClub] = useState<VenueLocation | null>(null), [clubStatus, setClubStatus] = useState('loading'), [clubAttempt, retryClub] = useState(0)
  useEffect(() => { if (!clubId) return; const abort = new AbortController(); setClubStatus('loading'); setClub(null)
    void apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}/location`, { signal: abort.signal, timeoutMs: 15000 }).then(value => { if (!abort.signal.aborted) { setClub(parseLocation(value)); setClubStatus('ready') } }).catch(() => { if (!abort.signal.aborted) setClubStatus('error') }); return () => abort.abort()
  }, [clubId, clubAttempt])
  const parts = route.pathname.slice(BASE.length).split('/').filter(Boolean), newVenue = parts[0] === 'new'
  const venue = state.venues.find(v => v.id === parts[0]), court = venue?.courts.find(c => c.id === parts[2])
  const editingVenue = newVenue || parts[1] === 'edit', editingCourt = parts[1] === 'courts'
  const editing = editingVenue || editingCourt
  const dirty = useRef(false), busy = useRef(false)
  busy.current = state.saving
  const markDirty = useCallback((value: boolean) => { dirty.current = value }, [])
  const blocker = useBlocker(() => dirty.current || busy.current)
  useEffect(() => { if (blocker.state === 'blocked' && !state.saving && !dirty.current) blocker.proceed() }, [blocker, state.saving])
  useEffect(() => { const unload = (e: BeforeUnloadEvent) => { if (dirty.current || busy.current) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload) }, [])
  useEffect(() => { if (!editing) dirty.current = false }, [editing])
  const [failure, setFailure] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ title: string; message: ReactNode; action: () => Promise<void>; label: string } | null>(null)
  const title = newVenue ? 'Nueva sede' : editingVenue ? 'Editar sede' : editingCourt ? court ? 'Editar cancha' : 'Nueva cancha' : venue?.name ?? 'Sedes y canchas'
  const leave = () => navigate(editing ? venue ? `${BASE}/${venue.id}` : BASE : parts.length ? BASE : HOME)
  const mutate = async (operation: () => Promise<void>) => { setFailure(null); try { await operation(); setConfirmation(null) } catch (e) { if (['VENUE_HAS_PENDING_MATCHES', 'COURT_HAS_PENDING_MATCHES', 'PARENT_VENUE_INACTIVE'].includes(failureCode(e))) { setConfirmation(null); setBlocked(failureMessage(e)) } else setFailure(failureMessage(e)) } }
  const toggle = (active: boolean, courtId?: string) => {
    if (!venue) return
    const operation = (confirm: boolean) => courtId ? model.setCourtStatus(venue.id, courtId, active, confirm) : model.setVenueStatus(venue.id, active, confirm)
    if (active) { void mutate(() => operation(false)); return }
    const last = courtId ? model.lastCourt() : model.lastVenue(venue.id)
    const subject = courtId ? venue.courts.find(c => c.id === courtId)?.name ?? 'cancha' : venue.name
    setConfirmation({ title: `¿Desactivar ${subject}?`, message: <div className="flex flex-col gap-4"><p>{courtId ? 'La cancha dejará de estar disponible para nuevos partidos.' : 'Sus canchas dejarán de estar disponibles para nuevos partidos.'}<br /><br />{courtId ? 'Conservaremos sus datos y el historial.' : 'Conservaremos los datos y el historial. Al reactivar la sede, solo se habilitarán las canchas que estaban activas.'}</p>{last && <div className="flex items-center gap-3 rounded-lg border border-[#fce1b3] bg-[#fef5e7] p-3"><Icon src={warningIcon} /><div><p className="text-sm font-semibold text-[#120f18]">{courtId ? 'Es la última cancha activa disponible' : 'Es la última sede activa con canchas disponibles'}</p><p className="mt-0.5 text-xs leading-4">Podés continuar, pero no podrás programar nuevos partidos hasta tener una sede activa con una cancha activa.</p></div></div>}</div>, label: `Desactivar ${courtId ? 'cancha' : 'sede'}`, action: () => operation(last) })
  }
  const saved = (path: string) => { dirty.current = false; busy.current = false; navigate(path) }
  const unavailable = !state.loading && (state.loaded || !state.error) && parts.length > 0 && !newVenue && (!venue || editingCourt && parts[2] !== 'new' && !court)
  return <div className="flex h-dvh flex-col bg-[#f5f5f5] text-[#120f18]">
    <header className="flex h-14 shrink-0 items-center gap-2 bg-[#100e16] px-4 text-white"><button aria-label="Volver" className="flex h-10 w-8 items-center" disabled={state.saving} onClick={leave}><Icon src={backIcon} /></button><h1 className="truncate text-xl font-bold leading-7">{title}</h1></header>
    {!allowed ? <main className="p-4"><Notice error>No tenés permiso para gestionar las sedes de este club.</Notice></main> : <>
      {editingVenue && (!newVenue || clubStatus === 'ready') && (newVenue || venue) ? <VenueEditor key={newVenue ? 'new' : venue!.id} original={newVenue ? null : venue!} club={club} saving={state.saving} onDirty={markDirty} onCancel={leave} onSave={async body => { const result = await model.saveVenue(newVenue ? null : venue!.id, body); saved(`${BASE}/${result.id}`) }} />
      : editingCourt && venue && (parts[2] === 'new' || court) ? <CourtEditor key={court?.id ?? 'new-court'} name={court?.name ?? ''} venue={venue} saving={state.saving} onDirty={markDirty} onCancel={leave} onSave={async name => { await model.saveCourt(venue.id, court?.id ?? null, name); saved(`${BASE}/${venue.id}`) }} />
      : <><main className="min-h-0 flex-1 overflow-y-auto px-4 py-5"><div className="mx-auto flex max-w-xl flex-col gap-3">
        {state.notice && !state.loading && !state.error && <Notice success>{state.notice}</Notice>}
        {failure && !confirmation && <Notice error>{failure}</Notice>}
        {state.loading ? <div role="status" aria-label="Cargando sedes">{[0, 1, 2].map(i => <div key={i} className="mb-3 flex h-[158px] animate-pulse flex-col gap-4 rounded-[20px] bg-white p-4"><div className="h-5 w-40 rounded bg-[#e7e7e8]" /><div className="h-4 w-52 rounded bg-[#e7e7e8]" /><div className="mt-auto h-4 w-28 rounded bg-[#e7e7e8]" /></div>)}</div> : null}
        {state.error && <Notice error>No pudimos cargar las sedes. <button onClick={() => void model.load()} className="min-h-11 underline">Reintentar</button></Notice>}
        {newVenue && clubStatus !== 'ready' && <Notice error={clubStatus === 'error'}>{clubStatus === 'error' ? <>No pudimos precargar la ubicación del club. <button className="min-h-11 underline" onClick={() => retryClub(n => n + 1)}>Reintentar</button></> : 'Cargando ubicación del club…'}</Notice>}
        {unavailable && <Notice error>No encontramos esta sede.</Notice>}
        {!state.loading && (state.loaded || !state.error) && !parts.length && <><p className="text-sm">{state.venues.length} sedes · {state.venues.filter(v => v.status === 'ACTIVE').length} activas</p>{state.venues.length === 0 && <Notice>Tu club todavía no tiene sedes. Agregá la primera para configurar sus canchas.</Notice>}{state.venues.map(v => <button key={v.id} onClick={() => navigate(`${BASE}/${v.id}`)} className="relative flex min-h-[158px] flex-col rounded-[20px] bg-white p-4 text-left"><div className="flex w-full items-center justify-between gap-3"><h2 className="text-base font-semibold">{v.name}</h2><span className={`flex items-center gap-2 text-xs ${v.status === 'ACTIVE' ? 'text-[#078332]' : 'text-[#605e64]'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{v.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</span></div><div className="mt-1 flex w-full items-start gap-2 pr-8 text-sm leading-5 text-[#605e64]"><Icon src={pinIcon} /><div className="min-w-0 flex-1"><p>{v.address || 'Dirección sin configurar'}</p><p className="text-xs leading-4">{[v.city, v.country].filter(Boolean).join(', ') || 'Ubicación sin configurar'}</p></div><span className="absolute right-4 top-1/2 -translate-y-1/2"><Icon src={arrowIcon} /></span></div><div className="mt-3 flex items-start gap-2"><Icon src={courtIcon} /><div><p className="text-sm font-semibold">{v.courtCount} {v.courtCount === 1 ? 'cancha' : 'canchas'}</p><p className="text-xs text-[#605e64]">{v.status === 'INACTIVE' ? 'Sede inactiva: no permite programar' : `${v.activeCourtCount} activas · ${v.courtCount - v.activeCourtCount} inactivas`}</p></div></div></button>)}</>}
        {!state.loading && (state.loaded || !state.error) && venue && !editing && <><section className="min-h-[192px] rounded-[20px] bg-white p-4"><div className="flex items-center gap-3"><Icon src={venueBadge} /><h2 className="flex-1 text-lg font-semibold">Información de sede</h2><button className="flex h-11 w-11 items-center justify-center" onClick={() => navigate(`${BASE}/${venue.id}/edit`)} aria-label="Editar sede" disabled={state.saving}><Icon src={editIcon} /></button></div><p className="mt-3 text-sm leading-5 text-[#605e64]">{venue.address || 'Dirección sin configurar'}<br />{[venue.city, venue.country].filter(Boolean).join(', ')}</p><div className="mt-5 flex items-center justify-between text-sm text-[#605e64]"><span>Sede {venue.status === 'ACTIVE' ? 'activa' : 'inactiva'}</span><Switch aria-label="Sede activa" checked={venue.status === 'ACTIVE'} onCheckedChange={value => toggle(value)} disabled={state.saving} className="h-6 w-10 [&>span]:h-5 [&>span]:w-5" /></div></section><div className="mt-2 flex items-center justify-between"><h2 className="text-lg font-semibold">Canchas</h2><span className="text-sm">{venue.courtCount} {venue.courtCount === 1 ? 'cancha' : 'canchas'}</span></div>{venue.courts.length === 0 && <Notice>Esta sede todavía no tiene canchas.</Notice>}{venue.status === 'INACTIVE' && <Notice>La sede está inactiva. Sus canchas conservan su estado y no se pueden usar para programar partidos.</Notice>}{venue.courts.map(c => <section key={c.id} className="flex items-center gap-2 rounded-2xl bg-white p-4"><h3 className="flex-1 text-base font-semibold">{c.name}</h3><span className="text-sm text-[#605e64]">{c.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}</span><Switch aria-label={`${c.name} activa`} checked={c.status === 'ACTIVE'} onCheckedChange={value => toggle(value, c.id)} disabled={state.saving || venue.status === 'INACTIVE'} className="h-6 w-10 [&>span]:h-5 [&>span]:w-5" /><button aria-label={`Editar ${c.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff5e7]" onClick={() => navigate(`${BASE}/${venue.id}/courts/${c.id}/edit`)} disabled={state.saving}><Icon src={editCourtIcon} /></button></section>)}</>}
      </div></main>{!editing && !unavailable && <footer className="shrink-0 px-4 pb-5 pt-4">{(!venue || venue.status === 'ACTIVE') && <Button className="mx-auto flex h-11 w-full max-w-xl rounded-lg" disabled={state.loading || state.error || state.saving} onClick={() => navigate(venue ? `${BASE}/${venue.id}/courts/new` : `${BASE}/new`)}><Icon src={plusIcon} />{venue ? 'Agregar cancha' : 'Nueva sede'}</Button>}</footer>}</>}
    </>}
    <ClubBottomNav onDashboard={() => navigate('/app')} onClub={() => navigate(HOME)} busy={state.saving} />
    {confirmation && <Dialog title={confirmation.title} busy={state.saving} cancel={() => { setConfirmation(null); setFailure(null) }} confirm={() => void mutate(confirmation.action)} confirmLabel={failure ? 'Reintentar' : confirmation.label}>{failure ? <Notice error>{failure}</Notice> : confirmation.message}</Dialog>}
    {blocked && <Dialog title="No se puede cambiar el estado" cancel={() => setBlocked(null)}>{blocked}</Dialog>}
    {blocker.state === 'blocked' && !state.saving && dirty.current && <Dialog title="¿Descartar los cambios?" cancel={() => blocker.reset()} confirm={() => { dirty.current = false; blocker.proceed() }} confirmLabel="Descartar cambios">Tenés cambios sin guardar. Podés seguir editando o descartarlos.</Dialog>}
  </div>
}
function VenueEditor({ original, club, saving, onDirty, onSave, onCancel }: { original: Venue | null; club: VenueLocation | null; saving: boolean; onDirty: (value: boolean) => void; onSave: (body: VenueWrite) => Promise<void>; onCancel: () => void }) {
  const { model, state } = useVenueDraft(original, club), [error, setError] = useState<string | null>(null), [map, showMap] = useState(false), [provinceQuery, searchProvince] = useState('')
  useEffect(() => { onDirty(model.dirty); return () => onDirty(false) }, [model, state, onDirty])
  const ready = Boolean(state.name.trim() && state.address.trim() && state.province && state.locality)
  const center = model.validPoint ?? state.locality
  const submit = async () => { if (!model.validate() || saving) return; setError(null); try { await onSave(model.request()) } catch (e) { setError(failureMessage(e)) } }
  return <><main className="min-h-0 flex-1 overflow-y-auto px-4 py-6"><form id="venue-form" noValidate onSubmit={e => { e.preventDefault(); void submit() }} className="mx-auto flex max-w-xl flex-col gap-4">
    {error && <Notice error>{error}</Notice>}{original && !original.location && <Notice>Ubicación anterior: {[original.city, original.countryDivision, original.country].filter(Boolean).join(', ')}. Elegí la ubicación del catálogo para actualizarla.</Notice>}
    <Field label="Nombre" required error={state.errors.name}><Input aria-label="Nombre" required disabled={saving} className={`${fieldClass} mt-2`} value={state.name} maxLength={255} placeholder="Ingresá nombre" onChange={e => model.field('name', e.target.value)} /></Field>
    <Field label="País"><Input aria-label="País" className={`${fieldClass} mt-2 disabled:opacity-100 disabled:bg-[#f7f7f7]`} value="Argentina" disabled /></Field>
    <Field label="Provincia / jurisdicción" required error={state.errors.province}><Select value={state.province?.id ?? ''} onValueChange={id => { const p = state.provinces.find(v => v.id === id); if (p) void model.selectProvince(p) }} disabled={saving || state.provinceStatus !== 'ready'}><SelectTrigger className={`${fieldClass} mt-2 w-full`} aria-label="Provincia" indicator={<Icon src={chevronIcon} />}><SelectValue placeholder="Seleccioná una provincia">{state.province?.name}</SelectValue></SelectTrigger><SelectContent><Input aria-label="Buscar provincia" placeholder="Buscar provincia" value={provinceQuery} onKeyDown={e => e.stopPropagation()} onChange={e => searchProvince(e.target.value)} />{state.provinces.filter(p => catalogMatch(p.name, provinceQuery)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></Field>
    {state.provinceStatus === 'error' && <Notice error>No pudimos cargar las provincias. <button type="button" className="min-h-11 underline" onClick={() => void model.provinces()}>Reintentar</button></Notice>}
    <Field label="Ciudad / localidad" required error={state.errors.locality}><Select value={state.locality?.id ?? ''} disabled={saving || !state.province} onValueChange={id => { const l = state.localities.find(v => v.id === id); if (l) model.selectLocality(l) }}><SelectTrigger aria-label="Localidad" className={`${fieldClass} mt-2 w-full`} indicator={<Icon src={chevronIcon} />}><SelectValue placeholder={state.province ? 'Seleccioná una localidad' : 'Primero elegí una provincia'}>{state.locality?.name}</SelectValue></SelectTrigger><SelectContent><Input aria-label="Buscar localidad" placeholder="Buscar localidad" value={state.query} onKeyDown={e => e.stopPropagation()} onChange={e => void model.localities(e.target.value)} />{state.localities.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}{state.localityStatus === 'loading' ? <p role="status" className="p-3 text-sm">Cargando localidades…</p> : !state.localities.length && <p className="p-3 text-sm">Sin coincidencias</p>}{state.total > state.localities.length && <button type="button" className="min-h-11 w-full underline" disabled={state.localityStatus === 'loading'} onClick={() => void model.localities(state.query, true)}>Cargar más localidades</button>}</SelectContent></Select></Field>
    {state.localityStatus === 'error' && <Notice error>No pudimos cargar las localidades. <button type="button" className="min-h-11 underline" onClick={() => void model.localities()}>Reintentar</button></Notice>}
    <Field label="Dirección" required error={state.errors.address}><Input aria-label="Dirección" className={`${fieldClass} mt-2`} required disabled={saving} value={state.address} maxLength={500} placeholder="Ingresá dirección" onChange={e => model.field('address', e.target.value)} /></Field>
    <Notice><strong>{model.stalePoint ? 'Reconfirmá el punto de la sede' : model.validPoint ? 'Punto de sede confirmado' : 'Ubicación exacta (opcional)'}</strong><p className="mt-1 text-xs">{model.stalePoint ? 'Cambió la dirección o localidad. Revisá el punto o continuá sin ubicación exacta.' : 'Podés confirmar el punto de la sede para que aparezca en búsquedas por cercanía.'}</p></Notice>
    <button type="button" disabled={saving || !state.locality || !center || !pointValid(center)} onClick={() => showMap(true)} className="min-h-11 text-sm font-medium disabled:text-[#929195]">{model.validPoint ? 'Cambiar ubicación en mapa' : 'Elegir ubicación en mapa'}</button>
    {state.point && <button type="button" onClick={() => model.removePoint()} disabled={saving} className="min-h-11 text-sm underline">{model.stalePoint ? 'Continuar sin ubicación exacta' : 'Quitar ubicación exacta'}</button>}
  </form></main><footer className="mx-auto flex w-full max-w-xl shrink-0 flex-col gap-3 px-4 pb-7 pt-4"><Button form="venue-form" type="submit" className={`h-11 rounded-lg ${saving ? 'disabled:opacity-100' : ''}`} disabled={!model.dirty || !ready} loading={saving} loadingLabel="Guardando…">Guardar {original ? 'cambios' : 'sede'}</Button><Button className="h-11 rounded-lg border-0 bg-[#e7e7e8]" variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button></footer>
    {map && center && <MapDialog cancel={() => showMap(false)}><VenueMap center={center} initial={model.validPoint} onCancel={() => showMap(false)} onConfirm={(point: Point) => { model.confirmPoint(point); showMap(false) }} /></MapDialog>}
  </>
}
function MapDialog({ children, cancel }: { children: ReactNode; cancel: () => void }) {
  const element = useRef<HTMLDialogElement>(null)
  useEffect(() => { element.current?.showModal() }, [])
  return <dialog ref={element} aria-label="Elegir ubicación en mapa" onCancel={e => { e.preventDefault(); cancel() }} className="max-h-[calc(100%-32px)] w-[calc(100%-32px)] max-w-xl overflow-y-auto rounded-2xl bg-white p-4 text-[#120f18] backdrop:bg-black/40">{children}</dialog>
}
function CourtEditor({ name, venue, saving, onDirty, onSave, onCancel }: { name: string; venue: Venue; saving: boolean; onDirty: (v: boolean) => void; onSave: (value: string) => Promise<void>; onCancel: () => void }) {
  const [draft, change] = useState(name), [error, setError] = useState<string | null>(null)
  useEffect(() => { onDirty(draft !== name); return () => onDirty(false) }, [draft, name, onDirty])
  return <><main className="min-h-0 flex-1 overflow-y-auto px-4 py-6"><form id="court-form" className="mx-auto flex max-w-xl flex-col gap-4" onSubmit={e => { e.preventDefault(); if (saving || !draft.trim()) return; setError(null); void onSave(draft).catch(e => setError(failureMessage(e))) }}>
    <Field label="Sede"><section className="mt-2 flex items-center gap-3 rounded-2xl bg-white py-3 pl-3 pr-4"><Icon src={courtVenueBadge} /><div><p className="text-base font-semibold">{venue.name}</p><p className="mt-0.5 text-sm font-medium text-[#605e64]">{[venue.address, [venue.city, venue.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p></div></section></Field>{error && <Notice error>{error}</Notice>}<Field label="Nombre" required><Input aria-label="Nombre de cancha" className={`${fieldClass} mt-2`} value={draft} maxLength={100} required disabled={saving} placeholder="Ingresá nombre" onChange={e => change(e.target.value)} /></Field>
  </form></main><footer className="mx-auto flex w-full max-w-xl shrink-0 flex-col gap-3 px-4 pb-7 pt-4"><Button form="court-form" type="submit" className={`h-11 rounded-lg ${saving ? 'disabled:opacity-100' : ''}`} disabled={draft === name || !draft.trim()} loading={saving} loadingLabel="Guardando…">{name ? 'Guardar cambios' : 'Guardar cancha'}</Button><Button variant="secondary" className="h-11 rounded-lg border-0 bg-[#e7e7e8]" disabled={saving} onClick={onCancel}>Cancelar</Button></footer></>
}
