import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import { useAuth } from '@/context/AuthContext'
import { currentSessionGeneration } from '@/features/auth/session-generation'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { JourneyDialog, usePlanJourney } from './plan-journey'
import {
  businessDateLabel,
  chargeReading,
  includedFeatures,
  limitsUseStoredPlan,
  moneyLabel,
  planActions,
  presentMeter,
  statusLabel,
  type ClubSubscription,
  type ClubUsage,
  type CommercialPeriod,
  type MeterCopy,
  type PlanAction,
  type UsageMeter,
} from './plan-model'
import { useClubPlan } from './use-club-plan'

const METER_TONE = {
  plain: 'bg-[#fefefe]',
  warning: 'border border-[#f5c16c] bg-[#fff8ee]',
  limit: 'border border-[#f5b5b5] bg-[#fdecec]',
  excess: 'border border-[#f5b5b5] bg-[#fdecec]',
  unlimited: 'bg-[#fefefe]',
  absent: 'bg-[#fefefe]',
} as const

const CAPTION_TONE = {
  plain: 'text-[#605e64]',
  warning: 'text-[#7a4e00]',
  limit: 'text-[#aa3030]',
  excess: 'text-[#aa3030]',
  unlimited: 'text-[#605e64]',
  absent: 'text-[#605e64]',
} as const

export function ClubPlanPage() {
  const navigate = useNavigate()
  const { user, destination, phase: authPhase } = useAuth()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find((item) => item.activity === 'CLUB' && item.clubId === destination.clubId)
    : null
  const canView = authPhase === 'ready' && Boolean(context?.permissions?.includes('VIEW_BILLING'))
  const canManage = Boolean(context?.permissions?.includes('MANAGE_SUBSCRIPTION'))
  const clubId = canView ? context?.clubId ?? null : null
  const session = currentSessionGeneration()
  const plan = useClubPlan(clubId, user?.userId ?? null, session)
  const journey = usePlanJourney({
    clubId,
    userId: user?.userId ?? null,
    session,
    canManage,
    posting: plan.posting,
    rememberReference: plan.rememberReference,
    recallReference: plan.recallReference,
    recheck: plan.recheck,
  })
  const recheck = plan.recheck
  const back = () => navigate('/club/settings')

  useEffect(() => {
    const onFocus = () => { void recheck('focus') }
    const onVisible = () => { if (document.visibilityState === 'visible') void recheck('focus') }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [recheck])

  const actions = plan.subscription && plan.usage ? planActions({
    loading: plan.phase === 'loading',
    failed: plan.phase === 'error',
    canManage,
    requestedPlanCode: plan.subscription.requestedPlan?.planCode ?? null,
    resumeAction: plan.subscription.recurrenceResumeAction,
    authorizationUrl: plan.subscription.recurrenceAuthorizationUrl,
    requestAdjustmentQuote: plan.subscription.actions.requestAdjustmentQuote,
    fullCheckout: plan.subscription.actions.fullCheckout,
    hasReference: Boolean(plan.reference),
  }) : { primary: plan.phase === 'error' ? 'retry' as const : null, secondary: [] as PlanAction[] }

  const run = (action: PlanAction) => {
    if (action === 'retry') void plan.reload()
    if (action === 'check-payment') void journey.checkPayment()
    if (action === 'upgrade') void journey.openUpgrade()
    if (action === 'adjust') void journey.openAdjustment()
    if (action === 'resume') void journey.openResume()
    if (action === 'authorize') journey.openAuthorization(plan.subscription?.recurrenceAuthorizationUrl ?? null)
    if (action === 'complete-payment' && plan.subscription) void journey.completeRequestedPayment(plan.subscription)
  }

  const showFooter = canView && (plan.phase === 'loading' || plan.phase === 'error' || Boolean(actions.primary))

  return <div className="flex h-dvh flex-col bg-[#f8f8f8] text-[#120f18]">
    <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
      <button type="button" aria-label="Volver a Mi Club" className="flex h-10 w-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9cf38]" onClick={back}>
        <ArrowBackIcon />
      </button>
      <h1 className="text-xl font-bold leading-7">Plan del club</h1>
    </header>
    <main className="min-h-0 flex-1 overflow-y-auto" aria-busy={plan.phase === 'loading'}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-4">
        {!canView ? <p role="alert" className="text-sm leading-5">No tenés permiso para ver el plan de este club.</p> : plan.phase === 'loading' ? <LoadingState /> : plan.phase === 'forbidden' ? <p role="alert" className="text-sm leading-5">No tenés permiso para ver el plan de este club.</p> : plan.phase === 'error' || !plan.subscription || !plan.usage ? <p role="alert" className="rounded-lg border border-[#fac5c5] bg-[#fdecec] p-3 text-sm leading-5">No pudimos cargar el plan. Reintentá para consultar la suscripción y el uso. No mostramos esos datos como cero.</p> : <>
          <PlanIdentity subscription={plan.subscription} usage={plan.usage} />
          {plan.subscription.requestedPlan && <PendingRequest planCode={plan.subscription.requestedPlan.planCode} current={plan.subscription.planCode} />}
          {plan.charge && <ChargeNote status={chargeReading(plan.charge)} />}
          {plan.reference && <p className="text-xs leading-4 text-[#605e64]">Si volviste de Mercado Pago, comprobá el pago en esta pantalla. Cerrar la ventana no cancela el cobro.</p>}
          {(plan.banner || journey.notice) && <p role="status" className="rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3 text-sm leading-5">{journey.notice ?? plan.banner}</p>}
          <RecurrenceNote subscription={plan.subscription} />
          <h2 className="text-lg font-semibold leading-6">Uso del club</h2>
          <Meter title="Torneos activos" meter={plan.usage.club.activeTournaments} copy={{ one: 'torneo activo', many: 'torneos activos', excessNote: 'Los datos se conservan. No se pueden crear torneos activos nuevos hasta ampliar el plan.' }} />
          <Meter title="Usuarios staff" meter={plan.usage.club.staffUsers} copy={{ one: 'usuario staff', many: 'usuarios staff', excessNote: 'Los datos se conservan. Este conteo no confirma que se pueda invitar a alguien.' }} />
          <p className="text-xs leading-4 text-[#605e64]">El staff cuenta membresías activas. No confirma que se pueda enviar una invitación.</p>
          <h2 className="text-lg font-semibold leading-6">Uso por torneo</h2>
          <EventUsage plan={plan} />
          <h2 className="text-lg font-semibold leading-6">Incluido en {plan.usage.planCode}</h2>
          <div className="text-sm font-medium leading-5 text-[#605e64]">
            {includedFeatures(plan.usage.plan).map((line) => <p key={line}>{line}</p>)}
          </div>
          {actions.primary && actions.primary !== 'retry' && actions.primary !== 'check-payment' && <p className="text-xs leading-4 text-[#605e64]">El cambio se activa cuando se confirma el pago.</p>}
          {actions.secondary.length > 0 && <div className="flex flex-col gap-2">
            {actions.secondary.map((action) => <button key={action} type="button" className="min-h-11 text-left text-sm font-medium underline" onClick={() => run(action)}>{actionLabel(action)}</button>)}
          </div>}
        </>}
      </div>
    </main>
    {showFooter && <footer className="shrink-0 bg-[#f8f8f8] px-4 py-4">
      <div className="mx-auto w-full max-w-xl">
        {plan.phase === 'loading'
          ? <Button className="h-12 w-full rounded-lg bg-[#eef0c1] text-[#605e64] disabled:opacity-100" disabled>Cargando plan…</Button>
          : <Button className="h-12 w-full rounded-lg" disabled={journey.busy} loading={journey.busy} loadingLabel="Procesando…" loadingMobileOnly={false} onClick={() => actions.primary && run(actions.primary)}>{actionLabel(actions.primary ?? 'retry')}</Button>}
      </div>
    </footer>}
    <ClubBottomNav onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} busy={journey.busy} />
    <JourneyDialog
      dialog={journey.dialog}
      busy={journey.busy}
      close={journey.close}
      selectPlan={journey.selectPlan}
      startCheckout={journey.startCheckout}
      confirmQuote={journey.confirmQuote}
      acceptReviewedTerms={journey.acceptReviewedTerms}
      reopen={journey.reopen}
      confirmResume={journey.confirmResume}
      openAdjustment={journey.openAdjustment}
      checkPayment={journey.checkPayment}
    />
  </div>
}

function PlanIdentity({ subscription, usage }: { subscription: ClubSubscription; usage: ClubUsage }) {
  const stored = usage.subscriptionPlanCode
  const effective = usage.planCode
  const aligned = limitsUseStoredPlan(usage.status, stored, effective)
  const renewal = moneyLabel(subscription.agreedRenewalAmount, subscription.agreedRenewalCurrency)
  const period = periodCaption(subscription.commercialPeriod)
  return <section className="flex flex-col gap-2 rounded-xl bg-[#fefefe] p-4">
    <h2 className="text-2xl font-semibold leading-8">{stored ?? effective}</h2>
    <p className="text-sm font-semibold leading-5">{statusLabel(usage.status)}</p>
    <p className="text-xs leading-4 text-[#605e64]">{!stored ? 'No hay un plan guardado. Los límites vigentes son los de FREE.' : aligned ? 'Límites vigentes del club' : `Los límites vigentes son los de ${effective}.`}</p>
    {period && <p className="text-xs leading-4 text-[#605e64]">{period}</p>}
    {renewal && <p className="text-xs leading-4 text-[#605e64]">Renovación acordada: {renewal}</p>}
  </section>
}

function PendingRequest({ planCode, current }: { planCode: string; current: string }) {
  return <section className="rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3">
    <p className="text-sm font-semibold leading-5">Plan solicitado: {planCode}</p>
    <p className="text-sm font-semibold leading-5">Pago pendiente</p>
    <p className="mt-1 text-xs leading-4 text-[#605e64]">El plan vigente sigue siendo {current} hasta que se confirme el pago.</p>
  </section>
}

function ChargeNote({ status }: { status: ReturnType<typeof chargeReading> }) {
  const copy = status === 'confirmed'
    ? 'El pago figura confirmado.'
    : status === 'manual'
      ? 'Este cobro quedó para resolución manual. El plan no se activó.'
      : status === 'failed'
        ? 'El cobro figura fallido.'
        : status === 'canceled'
          ? 'El cobro figura cancelado.'
          : 'Todavía sin confirmación.'
  return <p role="status" className="text-sm leading-5">{copy}</p>
}

function RecurrenceNote({ subscription }: { subscription: ClubSubscription }) {
  const copy = subscription.recurrenceResumeAction === 'RESUME_RENEWAL'
    ? 'La renovación está pausada. Confirmá el importe y la fecha del próximo cobro para reanudarla. El período vigente no se vuelve a cobrar.'
    : subscription.recurrenceResumeAction === 'AUTHORIZE_RENEWAL'
      ? 'Falta abrir el enlace de autorización. Abrirlo no confirma la reanudación ni cobra el período vigente.'
      : subscription.recurrencePaused === true
        ? 'La lectura del club marca la renovación como pausada.'
        : null
  if (!copy) return null
  return <p className="text-xs leading-4 text-[#605e64]">{copy}</p>
}

function Meter({ title, meter, copy }: { title: string; meter: UsageMeter; copy: MeterCopy }) {
  const view = presentMeter(meter, copy)
  return <section className={`flex flex-col gap-1 rounded-xl p-3 ${METER_TONE[view.tone]}`}>
    <div className="flex items-start justify-between gap-3 text-sm font-semibold leading-5">
      <h3 className="min-w-0 flex-1">{title}</h3>
      <p className="w-[100px] text-right">{view.value}</p>
    </div>
    <p className={`text-xs leading-4 ${CAPTION_TONE[view.tone]}`}>{view.caption}</p>
    {view.note && <p className="text-xs leading-4 text-[#605e64]">{view.note}</p>}
  </section>
}

function EventUsage({ plan }: { plan: ReturnType<typeof useClubPlan> }) {
  const selected = plan.eventId
  const event = plan.usage?.event
  const visible = selected && event?.eventId === selected ? event : null
  return <>
    {plan.eventsFailed && <p role="alert" className="text-sm leading-5">No pudimos cargar los torneos. Eso no es un uso en cero. <button type="button" className="min-h-11 underline" onClick={() => void plan.reloadEvents()}>Reintentar</button></p>}
    {!plan.eventsFailed && plan.events && plan.events.length === 0 && <p className="rounded-lg border border-[#c2d8fc] bg-[#ebf3fe] p-3 text-sm leading-5">Este club todavía no tiene torneos. No es un uso en cero.</p>}
    {!plan.eventsFailed && plan.events && plan.events.length > 0 && <label className="relative block">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"><SearchFieldIcon size={24} color="#605E64" /></span>
      <select aria-label="Torneo consultado" className="h-11 w-full appearance-none rounded-2xl border border-[#b6b5b7] bg-[#fefefe] pl-12 pr-4 text-sm font-medium text-[#605e64]" value={selected ?? ''} onChange={(event) => void plan.selectEvent(event.target.value || null)}>
        <option value="">Elegí un torneo</option>
        {plan.events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>}
    {plan.eventNotice && <p role="status" className="text-sm leading-5">{plan.eventNotice}</p>}
    {!plan.eventsFailed && plan.events && plan.events.length > 0 && !visible && <p className="text-sm leading-5 text-[#605e64]">Elegí un torneo para ver sus parejas confirmadas y sus divisiones.</p>}
    {visible && <>
      <Meter title="Parejas confirmadas" meter={visible.confirmedEntries} copy={{ one: 'pareja confirmada', many: 'parejas confirmadas', detail: 'Todas las divisiones del torneo', excessNote: 'Los datos se conservan. No se pueden confirmar nuevas parejas ni promover suplentes hasta ampliar el plan.' }} />
      <Meter title="Divisiones" meter={visible.divisions} copy={{ one: 'división', many: 'divisiones', detail: 'Divisiones del torneo', excessNote: 'Los datos se conservan. No se pueden crear divisiones nuevas en este torneo hasta ampliar el plan.' }} />
      <p className="text-xs leading-4 text-[#605e64]">La lista de espera no consume el límite de parejas del plan. El cupo de cada división se consulta en sus inscripciones.</p>
    </>}
  </>
}

function LoadingState() {
  return <div role="status" aria-label="Cargando plan" className="flex flex-col gap-4">
    <div className="h-[104px] rounded-xl bg-[#dfdfdf]" />
    <div className="h-6 w-36 rounded bg-[#dfdfdf]" />
    <div className="h-[68px] rounded-xl bg-[#dfdfdf]" />
    <div className="h-[68px] rounded-xl bg-[#dfdfdf]" />
    <div className="h-6 w-40 rounded bg-[#dfdfdf]" />
    <div className="h-11 rounded-2xl bg-[#dfdfdf]" />
    <div className="h-[68px] rounded-xl bg-[#dfdfdf]" />
    <div className="h-[68px] rounded-xl bg-[#dfdfdf]" />
  </div>
}

function periodCaption(period: CommercialPeriod): string | null {
  if (period.kind !== 'PAID' && period.kind !== 'COURTESY') return null
  const end = businessDateLabel(period.periodEnd)
  const label = period.kind === 'COURTESY' ? 'Período de cortesía' : 'Período pago'
  if (!period.open) return end ? `${label} cerrado el ${end}` : `${label} cerrado`
  return end ? `${label} hasta el ${end}` : label
}

function actionLabel(action: PlanAction): string {
  switch (action) {
    case 'retry': return 'Reintentar'
    case 'complete-payment': return 'Completar pago'
    case 'resume': return 'Reanudar renovación'
    case 'authorize': return 'Abrir autorización'
    case 'adjust':
    case 'upgrade': return 'Mejorar plan'
    case 'check-payment': return 'Comprobar pago'
  }
}
