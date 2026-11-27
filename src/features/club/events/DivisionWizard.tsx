import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import logo from '@/assets/auth/logo.png'
import { Shell, primary, secondary } from './EventShell'
import { divisionApi, type EventDraftWrite } from './division-api'
import {
  catalogNames, clearIntent, criterionLabel, divisionTitle, emptySelection, errorCode, intentKey, limitReason,
  planLimitRemaining, remainingQuota, selectionSize, selectionSummary, toSelection, toWrites, validCriterion,
  resumePlan, validMaxPairs, validSelection, withoutLocalId, type DivisionPlan, type Selection, type WizardDivision,
} from './division-model'
import { Banner, CardAction, CardActions, CatalogState, CriterionFields, DivisionCard, LimitBanner, QuotaFields } from './division-ui'
import type { ClubEventDetail, EventDraft } from './event-model'
import { listKey, detailKey } from './use-club-events'
import { divisionsKey, useCatalog, useDivisionLimit } from './use-divisions'

let sequence = 0
const localId = () => 'local-' + Date.now().toString(36) + '-' + (++sequence)
const newKey = () => 'wizard-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2))
const storage = () => { try { return window.sessionStorage } catch { return undefined } }

export function DivisionWizard({ clubId, draft, back, plan, setPlan }: {
  clubId: string; draft: EventDraft; back: () => void; plan: DivisionPlan; setPlan: (update: (plan: DivisionPlan) => DivisionPlan) => void
}) {
  const navigate = useNavigate()
  const cache = useQueryClient()
  const { user } = useAuth()
  const admin = user?.accessContexts?.find(context => context.activity === 'CLUB' && context.clubId === clubId)?.role === 'CLUB_ADMIN'
  const catalog = useCatalog()
  const limit = useDivisionLimit(clubId, null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [rejected, setRejected] = useState<number | null>(null)
  const [created, setCreated] = useState<ClubEventDetail | null>(null)
  const pending = useRef(false)
  const memory = useRef<{ fingerprint: string; key: string } | null>(null)
  const categories = catalog.data ?? []
  const names = catalogNames(categories)
  const { step, selection, divisions } = plan
  // While the confirmation is in flight, browser Back (or any route change) must not unmount the wizard:
  // the navigation is held and cancelled once the save settles, so the result is always shown.
  const blocker = useBlocker(busy)
  useEffect(() => {
    if (blocker.state === 'blocked' && !busy) blocker.reset()
  }, [blocker, busy])
  useEffect(() => {
    if (!busy) return
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', hold)
    return () => window.removeEventListener('beforeunload', hold)
  }, [busy])
  const set = (next: Selection) => { setOverflow(false); setPlan(value => ({ ...value, selection: next })) }

  const others = divisions.filter(division => !plan.editing?.includes(division.localId)).length
  const remaining = remainingQuota(limit.data, others)
  const size = selectionSize(selection)
  const batchTooLarge = remaining !== null && size > remaining
  const reason = (left?: number) => limitReason(limit.data?.limit ?? 0, limit.data?.planCode ?? '', 'wizard', left)
  const reviewRemaining = remainingQuota(limit.data, divisions.length)

  function goBack() {
    if (pending.current) return
    setFailed(false)
    if (step === 6) {
      setPlan(value => ({ ...resumePlan(value), step: value.lastBatch.length && value.divisions.some(d => value.lastBatch.includes(d.localId)) ? 5 : 4 }))
      return
    }
    if (step === 5) { setPlan(value => ({ ...value, step: 4 })); return }
    if (plan.fromReview) { setPlan(value => ({ ...value, step: 6, editing: null, fromReview: false, selection: emptySelection() })); return }
    back()
  }

  function commit() {
    if (!validSelection(selection, categories)) { setPlan(value => ({ ...value, touched: true })); return }
    setPlan(value => {
      const items = toWrites(value.selection).map(write => ({ ...write, localId: localId() }))
      const at = value.editing ? value.divisions.findIndex(division => value.editing!.includes(division.localId)) : -1
      const kept = value.divisions.filter(division => !value.editing?.includes(division.localId))
      const position = at < 0 ? kept.length : value.divisions.slice(0, at).filter(division => !value.editing?.includes(division.localId)).length
      return {
        ...value,
        step: 6,
        divisions: [...kept.slice(0, position), ...items, ...kept.slice(position)],
        lastBatch: items.map(item => item.localId),
        editing: null,
        fromReview: false,
        selection: emptySelection(),
        touched: false,
      }
    })
    setRejected(null)
  }

  function add() {
    if (pending.current || reviewRemaining === 0) return
    setPlan(value => ({ ...value, step: 4, editing: null, fromReview: true, selection: emptySelection(), touched: false }))
  }

  function edit(division: WizardDivision) {
    if (pending.current) return
    setPlan(value => ({ ...value, step: 4, editing: [division.localId], fromReview: true, selection: toSelection([division]), touched: false }))
  }

  function remove(division: WizardDivision) {
    if (pending.current) return
    setPlan(value => ({ ...value, divisions: value.divisions.filter(item => item.localId !== division.localId) }))
    if (divisions.length === 1) setBlocked(true)
    setRejected(null)
  }

  async function confirm() {
    if (pending.current) return
    if (divisions.length === 0) { setBlocked(true); return }
    const event: EventDraftWrite = {
      name: draft.name.trim(), startDate: draft.startDate, endDate: draft.endDate,
      playCalendarPreset: draft.playCalendarPreset, venueIds: draft.venueIds, courtIds: draft.courtIds,
    }
    const items = divisions.map(withoutLocalId)
    const fingerprint = JSON.stringify({ event, items })
    const key = memory.current?.fingerprint === fingerprint ? memory.current.key : intentKey(storage(), clubId, fingerprint, newKey)
    memory.current = { fingerprint, key }
    pending.current = true
    setBusy(true)
    setFailed(false)
    setRejected(null)
    try {
      const saved = await divisionApi.confirm(clubId, key, event, items)
      clearIntent(storage(), clubId)
      memory.current = null
      cache.setQueryData(detailKey(clubId, saved.event.id), saved.event)
      cache.setQueryData(divisionsKey(clubId, saved.event.id), saved.divisions)
      void cache.invalidateQueries({ queryKey: listKey(clubId) })
      setCreated(saved.event)
    } catch (error) {
      const left = planLimitRemaining(error)
      if (left !== null) {
        setRejected(left)
        void limit.refetch()
      } else {
        if (errorCode(error) === 'IDEMPOTENCY_KEY_REUSED') { clearIntent(storage(), clubId); memory.current = null }
        setFailed(true)
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (created) {
    return <div className="flex h-dvh flex-col bg-[#120f18] text-[#fefefe]">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-8 text-center">
        <h1 className="text-xl font-bold leading-7">¡Creaste un evento!</h1>
        <img src={logo} alt="Padel Check" width={140} height={140} className="h-[140px] w-[140px] object-contain" />
        <div className="flex flex-col gap-4">
          <p className="break-words text-[32px] font-bold leading-10">{created.name}</p>
          <p className="text-lg font-semibold leading-6 text-[#c4c3c7]">Tu evento quedó en borrador. Podés revisarlo y abrir las inscripciones desde el evento.</p>
        </div>
      </main>
      <footer className="shrink-0 px-8 pb-6 pt-4"><div className="mx-auto max-w-[32rem]">
        <Button className={primary} onClick={() => navigate('/club/events/' + created.id, { replace: true })}>Ver evento</Button>
      </div></footer>
    </div>
  }

  const catalogReady = catalog.isSuccess
  const continueDisabled = step === 4
    ? !catalogReady || !validCriterion(selection, categories) || batchTooLarge
    : !validMaxPairs(selection.maxPairsText) || selection.substitutesAllowed === null

  if (step === 4 || step === 5) {
    return <Shell title="Crear evento" wizard back={goBack}
      footer={<Button className={primary} disabled={continueDisabled}
        onClick={() => step === 4 ? setPlan(value => ({ ...value, step: 5 })) : commit()}>Continuar</Button>}>
      <p className="text-xs text-[#605e64]">{step === 4 ? 'Paso 4 de 6 · Divisiones' : 'Paso 5 de 6 · Cupo y suplentes'}</p>
      {step === 4 && <>
        <h2 className="text-xl font-bold leading-7">Agregar división</h2>
        {!catalogReady && <CatalogState pending={catalog.isPending} error={catalog.isError} retry={() => void catalog.refetch()} genderType={selection.genderType} />}
        {catalogReady && <>
          <p className="text-sm font-medium text-[#605e64]">Definí quiénes pueden competir.</p>
          <CriterionFields selection={selection} set={set} catalog={categories} single={Boolean(plan.editing && plan.fromReview)}
            canAdd={next => remaining === null || next <= remaining} onOverflow={() => setOverflow(true)} />
          {(overflow || batchTooLarge) && remaining !== null && <LimitBanner admin={admin} reason={reason(remaining)} />}
        </>}
      </>}
      {step === 5 && <>
        <h2 className="text-xl font-bold leading-7">Cupo de la división</h2>
        <p className="text-sm font-medium text-[#605e64]">{selectionSummary(selection, categories)}</p>
        <QuotaFields selection={selection} touched={plan.touched || selection.maxPairsText !== ''}
          set={next => setPlan(value => ({ ...value, selection: next, touched: true }))} />
      </>}
    </Shell>
  }

  return <Shell title="Crear evento" wizard back={goBack}
    footer={<Button className={primary + (busy ? ' max-md:disabled:opacity-100' : '')} disabled={divisions.length === 0}
      loading={busy} loadingLabel="Creando evento" onClick={() => void confirm()}>Crear evento</Button>}>
    <p className="text-xs text-[#605e64]">Paso 6 de 6 · Revisión</p>
    <h2 className="text-xl font-bold leading-7">Divisiones del evento</h2>
    <p className="text-sm font-medium text-[#605e64]">{divisions.length === 0
      ? 'Agregá al menos una división para crear el evento.' : 'Revisá las divisiones antes de crear el evento.'}</p>
    {busy && <Banner tone="loading" title="Creando evento">No cierres esta pantalla mientras guardamos.</Banner>}
    {failed && <Banner tone="error" title="No pudimos crear el evento">Tus datos siguen en el formulario. Volvé a intentar.</Banner>}
    {rejected !== null && <LimitBanner admin={admin} reason={reason(rejected)} />}
    {divisions.length === 0 && (blocked
      ? <Banner tone="error" title="No se puede confirmar">Agregá al menos una división válida para continuar.</Banner>
      : <Banner tone="info" title="Todavía no agregaste divisiones">Agregá al menos una división válida para continuar.</Banner>)}
    {divisions.map(division => <div key={division.localId} className="flex flex-col gap-2">
      <DivisionCard title={divisionTitle(division, names)} maxPairs={division.maxPairs} type={criterionLabel(division)} substitutes={division.substitutesAllowed} />
      <CardActions>
        <CardAction label="Editar" aria={'Editar ' + divisionTitle(division, names)} disabled={busy} onClick={() => edit(division)} />
        <CardAction label="Quitar" aria={'Quitar ' + divisionTitle(division, names)} disabled={busy} onClick={() => remove(division)} />
      </CardActions>
    </div>)}
    <Button variant="secondary" className={secondary + ' disabled:bg-[#f5f5f5] disabled:text-[#929195] disabled:opacity-100'} disabled={busy || reviewRemaining === 0} onClick={add}>Agregar división</Button>
    {reviewRemaining === 0 && rejected === null && <LimitBanner admin={admin} reason={reason()} />}
    <p className="text-xs leading-4 text-[#605e64]">Al confirmar, el evento queda en borrador. Las inscripciones se abren después desde el evento.</p>
  </Shell>
}
