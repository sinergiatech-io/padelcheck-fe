import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { failureKind, planApi } from './plan-api'
import {
  chargeOpenVerdict,
  checkoutOpenDecision,
  checkoutPlanCode,
  continuationAllowed,
  createSingleFlight,
  dispatchCompletePayment,
  eligibleCheckoutPlans,
  interpretConflict,
  moneyLabel,
  businessDateLabel,
  instantLabel,
  paymentRoute,
  presentableQuote,
  providerUrl,
  quoteSnapshot,
  resumePreviewCanConfirm,
  resumeResult,
  termsSnapshot,
  unavailableCheckoutPlans,
  type AdjustmentQuote,
  type BillingCharge,
  type ChargeOpenVerdict,
  type ChargeTerms,
  type CheckoutLink,
  type CheckoutPlanCode,
  type ClubSubscription,
  type ConflictOutcome,
  type PlanOffer,
  type ResumePreview,
  type ShownTerms,
} from './plan-model'

type DialogState =
  | { type: 'plans'; offers: PlanOffer[] | null; unavailable: PlanOffer[]; selected: CheckoutPlanCode | null; error: string | null }
  | { type: 'quote'; quote: AdjustmentQuote; error: string | null }
  | { type: 'review'; link: CheckoutLink; terms: ChargeTerms }
  | { type: 'confirm-checkout'; link: CheckoutLink }
  | { type: 'return'; link: CheckoutLink; blocked: boolean }
  | { type: 'resume'; preview: ResumePreview; error: string | null }
  | { type: 'requote'; message: string }

interface JourneyInput {
  clubId: string | null
  userId: string | null
  session: number
  canManage: boolean
  posting: { current: boolean }
  rememberReference: (reference: string) => void
  recallReference: () => string | null
  recheck: (reason: 'manual' | 'focus') => Promise<void>
}

export function usePlanJourney({ clubId, userId, session, canManage, posting, rememberReference, recallReference, recheck }: JourneyInput) {
  const flight = useRef(createSingleFlight())
  const epoch = useRef(0)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const contextKey = `${userId ?? ''}:${session}:${clubId ?? ''}:${canManage}`
  useEffect(() => {
    epoch.current += 1
    setDialog(null)
    setNotice(null)
    return () => { epoch.current += 1 }
  }, [contextKey])
  function live(started: number) {
    return continuationAllowed(started, epoch.current)
  }

  async function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    setBusy(true)
    posting.current = true
    try {
      return await flight.current(key, task)
    } finally {
      posting.current = false
      setBusy(false)
    }
  }

  async function reconcile(intent: 'checkout' | 'adjustment' | 'resume', started: number): Promise<ConflictOutcome> {
    if (!clubId || !live(started)) return 'still-open'
    const reference = recallReference()
    const [charge, subscription] = await Promise.all([
      reference ? planApi.charge(clubId, reference).then((value) => value, () => null) : Promise.resolve(null),
      planApi.subscription(clubId).then((value) => value, () => null),
    ])
    if (!live(started)) return 'still-open'
    const decision = interpretConflict({
      intent,
      charge,
      resumeAction: subscription?.recurrenceResumeAction ?? null,
      recurrencePaused: subscription?.recurrencePaused ?? null,
      subscriptionRead: subscription != null,
    })
    setNotice(conflictCopy(decision.outcome))
    await recheck('manual')
    return decision.outcome
  }

  async function startCheckout(planCode: CheckoutPlanCode) {
    if (!clubId) return
    const started = epoch.current
    setNotice(null)
    try {
      const offers = await run(`offers:${clubId}`, () => planApi.offers())
      if (!live(started)) return
      const offer = eligibleCheckoutPlans(offers).find((item) => item.code === planCode)
      if (!offer?.price?.amount || !offer.price.currency) {
        setDialog((current) => current?.type === 'plans'
          ? { ...current, error: 'Ese plan no tiene un precio mensual disponible. No iniciamos el cobro.' }
          : current)
        setNotice('Ese plan no tiene un precio mensual disponible. No iniciamos el cobro.')
        return
      }
      const consent = { clubId, planCode, amount: offer.price.amount, currency: offer.price.currency }
      const link = await run(`checkout:${clubId}:${planCode}`, () => planApi.checkout(clubId, planCode))
      if (!live(started)) return
      rememberReference(link.reference)
      const decision = checkoutOpenDecision(consent, link)
      if (decision === 'reject') {
        setDialog(null)
        setNotice('La respuesta no corresponde a este club o a este plan. No abrimos el enlace.')
        return
      }
      if (decision === 'review') {
        setDialog({ type: 'confirm-checkout', link })
        return
      }
      showReturn(link)
    } catch (error) {
      if (!live(started)) return
      if (failureKind(error) === 'conflict') {
        setDialog(null)
        await reconcile('checkout', started)
        return
      }
      if (failureKind(error) === 'unauthorized') return
      setDialog((current) => current?.type === 'plans'
        ? { ...current, error: 'No pudimos iniciar el cobro. No se abrió otro intento automático.' }
        : current)
      setNotice('No pudimos iniciar el cobro. No se abrió otro intento automático.')
    }
  }

  function showReturn(link: CheckoutLink) {
    const safe = providerUrl(link.url)
    const blocked = !safe || openProviderWindow(safe) === 'blocked'
    setDialog({ type: 'return', link, blocked })
  }

  async function openUpgrade() {
    if (!clubId || !canManage) return
    const started = epoch.current
    setDialog({ type: 'plans', offers: null, unavailable: [], selected: null, error: null })
    try {
      const offers = await run(`offers:${clubId}`, () => planApi.offers())
      if (!live(started)) return
      const ready = eligibleCheckoutPlans(offers)
      setDialog({
        type: 'plans',
        offers: ready,
        unavailable: unavailableCheckoutPlans(offers),
        selected: null,
        error: ready.length ? null : 'No hay un plan con precio mensual disponible.',
      })
    } catch (error) {
      if (!live(started) || failureKind(error) === 'unauthorized') return
      setDialog({ type: 'plans', offers: [], unavailable: [], selected: null, error: 'No pudimos leer el catálogo. Reintentá desde acá.' })
    }
  }

  async function completeRequestedPayment(subscription: ClubSubscription) {
    const started = epoch.current
    await dispatchCompletePayment(paymentRoute({
      requestedPlanCode: subscription.requestedPlan?.planCode ?? null,
      requestAdjustmentQuote: subscription.actions.requestAdjustmentQuote,
      fullCheckout: subscription.actions.fullCheckout,
    }), {
      startAdjustment: async () => { if (live(started)) await openAdjustment() },
      startCheckout: async () => {
        const code = checkoutPlanCode(subscription.requestedPlan?.planCode)
        if (live(started) && code) await startCheckout(code)
      },
      explainBlocked: () => {
        if (live(started)) setNotice('No podemos completar ese pago con las acciones actuales. No iniciamos otro cobro.')
      },
    })
  }

  async function openAdjustment() {
    if (!clubId) return
    const started = epoch.current
    setNotice(null)
    try {
      const quote = await run(`quote:${clubId}`, () => planApi.quote(clubId))
      if (!live(started)) return
      const state = presentableQuote(quote, Date.now())
      if (state === 'expired') {
        setDialog({ type: 'requote', message: 'La cotización venció. Pedí una nueva para ver las condiciones actuales.' })
        return
      }
      if (state === 'unavailable') {
        setNotice('No hay una cotización disponible para este período.')
        setDialog(null)
        return
      }
      setDialog({ type: 'quote', quote, error: null })
    } catch (error) {
      if (!live(started)) return
      if (failureKind(error) === 'conflict') {
        await reconcile('adjustment', started)
        return
      }
      if (failureKind(error) !== 'unauthorized') setNotice('No pudimos consultar la cotización.')
    }
  }

  function applyChargeVerdict(verdict: ChargeOpenVerdict, link: CheckoutLink, charge: BillingCharge | null) {
    if (verdict === 'open') {
      showReturn(link)
      return
    }
    if (verdict === 'review' && charge?.terms) {
      setDialog({ type: 'review', link, terms: charge.terms })
      return
    }
    if (verdict === 'expired') {
      setDialog({ type: 'requote', message: 'La cotización venció. Pedí una nueva antes de abrir el pago.' })
      return
    }
    setDialog(null)
    setNotice(verdictCopy(verdict))
  }

  async function readAndOpen(link: CheckoutLink, shown: ShownTerms | null) {
    if (!clubId) return
    const started = epoch.current
    let charge: BillingCharge | null = null
    try {
      charge = await planApi.charge(clubId, link.reference)
    } catch {
      if (!live(started)) return
      setNotice('No pudimos releer el cobro. No abrimos el enlace.')
      return
    }
    if (!live(started)) return
    applyChargeVerdict(chargeOpenVerdict({
      expectedReference: link.reference,
      expectedPlanCode: link.planCode,
      shown,
      charge,
      url: link.url,
      now: Date.now(),
    }), link, charge)
  }

  async function confirmQuote(quote: AdjustmentQuote) {
    if (!clubId) return
    const started = epoch.current
    if (presentableQuote(quote, Date.now()) !== 'show') {
      setDialog({ type: 'requote', message: 'La cotización venció antes de confirmar. Pedí una nueva.' })
      return
    }
    try {
      const link = await run(`adjustment:${clubId}`, () => planApi.adjustmentCheckout(clubId))
      if (!live(started)) return
      rememberReference(link.reference)
      await readAndOpen(link, quoteSnapshot(quote))
    } catch (error) {
      if (!live(started)) return
      if (failureKind(error) === 'conflict') {
        setDialog(null)
        await reconcile('adjustment', started)
        return
      }
      if (failureKind(error) !== 'unauthorized') {
        setDialog((current) => current?.type === 'quote'
          ? { ...current, error: 'No pudimos iniciar el ajuste. No repetimos el pedido automáticamente.' }
          : current)
      }
    }
  }

  async function acceptReviewedTerms(link: CheckoutLink, terms: ChargeTerms) {
    await readAndOpen(link, termsSnapshot(terms))
  }

  async function reopen(link: CheckoutLink) {
    await readAndOpen(link, link.amount && link.currency ? {
      amount: link.amount,
      currency: link.currency,
      periodStart: null,
      periodEnd: null,
      payUntil: null,
      eliteMonthlyAmount: null,
      eliteMonthlyCurrency: null,
    } : null)
  }

  async function openResume() {
    if (!clubId) return
    const started = epoch.current
    setNotice(null)
    try {
      const preview = await run(`resume-preview:${clubId}`, () => planApi.resumePreview(clubId))
      if (!live(started)) return
      if (!resumePreviewCanConfirm(preview)) {
        setNotice('Esta lectura no alcanza para reanudar. No confirmamos el pedido.')
        return
      }
      setDialog({ type: 'resume', preview, error: null })
    } catch (error) {
      if (!live(started)) return
      if (failureKind(error) === 'conflict') {
        await reconcile('resume', started)
        return
      }
      if (failureKind(error) !== 'unauthorized') setNotice('No pudimos leer la reanudación.')
    }
  }

  async function confirmResume() {
    if (!clubId) return
    const started = epoch.current
    try {
      const preview = await run(`resume-confirm:${clubId}`, () => planApi.resumeConfirm(clubId))
      if (!live(started)) return
      setDialog(null)
      const result = resumeResult(preview)
      if (result === 'resumed') {
        setNotice('La renovación quedó reanudada. El período vigente no se cobra de nuevo.')
      } else if (result === 'authorization' && preview.payerAuthorizationUrl) {
        const safe = providerUrl(preview.payerAuthorizationUrl)
        const blocked = !safe || openProviderWindow(safe) === 'blocked'
        setNotice(blocked
          ? 'Falta la autorización del pagador y el navegador bloqueó la ventana. Abrir el enlace no confirma la reanudación.'
          : 'Falta la autorización del pagador. Abrir el enlace no confirma la reanudación ni cobra el período vigente.')
      } else if (result === 'blocked-url') {
        setNotice('El enlace de autorización no es válido. No lo abrimos.')
      } else {
        setNotice('Todavía sin confirmación.')
      }
      await recheck('manual')
    } catch (error) {
      if (!live(started)) return
      if (failureKind(error) === 'conflict') {
        setDialog(null)
        await reconcile('resume', started)
        return
      }
      if (failureKind(error) !== 'unauthorized') {
        setDialog((current) => current?.type === 'resume'
          ? { ...current, error: 'No pudimos reanudar. No enviamos otro pedido automático.' }
          : current)
      }
    }
  }

  function openAuthorization(url: string | null) {
    const safe = providerUrl(url)
    if (!safe) {
      setNotice('El enlace de autorización no es válido. No lo abrimos.')
      return
    }
    const blocked = openProviderWindow(safe) === 'blocked'
    setNotice(blocked
      ? 'El navegador bloqueó la autorización. Podés abrirla de nuevo; eso no confirma la reanudación.'
      : 'Abrimos la autorización. Volvé a esta pantalla y comprobá el estado. Abrir el enlace no alcanza.')
  }

  return {
    busy,
    notice,
    dialog,
    close: () => { if (!busy) setDialog(null) },
    openUpgrade,
    openAdjustment,
    openResume,
    openAuthorization,
    startCheckout,
    completeRequestedPayment,
    confirmQuote,
    acceptReviewedTerms,
    reopen,
    confirmResume,
    selectPlan: (planCode: CheckoutPlanCode) => setDialog((current) => current?.type === 'plans' ? { ...current, selected: planCode, error: null } : current),
    retryOffers: () => void openUpgrade(),
    checkPayment: () => recheck('manual'),
  }
}

export function JourneyDialog({
  dialog,
  busy,
  close,
  selectPlan,
  startCheckout,
  confirmQuote,
  acceptReviewedTerms,
  reopen,
  confirmResume,
  openAdjustment,
  checkPayment,
}: {
  dialog: DialogState | null
  busy: boolean
  close: () => void
  selectPlan: (planCode: CheckoutPlanCode) => void
  startCheckout: (planCode: CheckoutPlanCode) => Promise<void>
  confirmQuote: (quote: AdjustmentQuote) => Promise<void>
  acceptReviewedTerms: (link: CheckoutLink, terms: ChargeTerms) => Promise<void>
  reopen: (link: CheckoutLink) => Promise<void>
  confirmResume: () => Promise<void>
  openAdjustment: () => Promise<void>
  checkPayment: () => Promise<void>
}) {
  const element = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = element.current
    if (!node || node.open) return
    node.showModal()
  }, [dialog])
  if (!dialog) return null
  return <dialog ref={element} aria-modal="true" onCancel={(event) => { event.preventDefault(); if (!busy) close() }} className="w-[calc(100%-28px)] max-w-[374px] rounded-2xl bg-[#fefefe] p-0 text-[#120f18] backdrop:bg-black/40">
    {dialog.type === 'plans' && <Panel title="Elegí un plan" close={close} busy={busy}>
      {dialog.offers == null && <p role="status">Cargando planes…</p>}
      {dialog.error && <p role="alert" className="text-sm text-[#aa3030]">{dialog.error}</p>}
      <div className="flex flex-col gap-3">
        {dialog.unavailable.map((offer) => <p key={offer.code} className="text-sm text-[#605e64]">{offer.name}: sin precio mensual disponible</p>)}
        {dialog.offers?.map((offer) => {
          const code = checkoutPlanCode(offer.code)
          if (!code) return null
          const selected = dialog.selected === code
          return <button key={code} type="button" disabled={busy} onClick={() => selectPlan(code)} className={`rounded-xl border p-3 text-left ${selected ? 'border-[#c9cf38] bg-[#fafaeb]' : 'border-[#e7e7e8]'}`}>
            <span className="block text-sm font-semibold">{offer.name}</span>
            {offer.description && <span className="mt-1 block text-xs leading-4 text-[#605e64]">{offer.description}</span>}
            <span className="mt-2 block text-sm">{priceLabel(offer)}</span>
          </button>
        })}
      </div>
      <p className="text-xs leading-4 text-[#605e64]">Elegir un plan no lo activa. El importe del cobro lo confirma el servidor al continuar.</p>
      <Actions>
        <Button variant="secondary" className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" disabled={busy} onClick={close}>Cancelar</Button>
        <Button className="h-11 flex-1 rounded-lg" disabled={!dialog.selected || busy} loading={busy && Boolean(dialog.selected)} loadingLabel="Iniciando cobro…" loadingMobileOnly={false} onClick={() => dialog.selected && void startCheckout(dialog.selected)}>Continuar al pago</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'quote' && <Panel title="Confirmar ajuste a ELITE" close={close} busy={busy}>
      <TermsList shown={quoteSnapshot(dialog.quote)} intro="Estas condiciones salen de la cotización pedida ahora. No usamos el precio actual del catálogo." />
      {dialog.error && <p role="alert" className="text-sm text-[#aa3030]">{dialog.error}</p>}
      <Actions>
        <Button variant="secondary" className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" disabled={busy} onClick={close}>Cancelar</Button>
        <Button className="h-11 flex-1 rounded-lg" disabled={busy} loading={busy} loadingLabel="Iniciando ajuste…" loadingMobileOnly={false} onClick={() => void confirmQuote(dialog.quote)}>Confirmar ajuste</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'review' && <Panel title="Condiciones nuevas" close={close} busy={busy}>
      <TermsList shown={termsSnapshot(dialog.terms)} intro="La cotización vinculada a este cobro no coincide con lo que habías visto. Confirmá estas condiciones para abrir el pago. No vamos a pedir otro cobro." />
      <Actions>
        <Button variant="secondary" className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" disabled={busy} onClick={close}>Volver</Button>
        <Button className="h-11 flex-1 rounded-lg" disabled={busy} loading={busy} loadingLabel="Releyendo el cobro…" loadingMobileOnly={false} onClick={() => void acceptReviewedTerms(dialog.link, dialog.terms)}>Abrir el pago</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'confirm-checkout' && <Panel title="Condiciones del cobro" close={close} busy={busy}>
      <p className="text-sm leading-5 text-[#605e64]">El servidor confirmó estas condiciones. Revisalas antes de abrir el pago. No vamos a crear otro cargo.</p>
      <p className="text-sm font-semibold">Plan: {dialog.link.planCode}</p>
      <p className="text-sm font-semibold">Importe: {moneyLabel(dialog.link.amount, dialog.link.currency)}</p>
      <Actions>
        <Button variant="secondary" className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" disabled={busy} onClick={close}>Volver</Button>
        <Button className="h-11 flex-1 rounded-lg" disabled={busy} onClick={() => void reopen(dialog.link)}>Abrir el pago</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'return' && <Panel title="Volvé a comprobar el pago" close={close} busy={false}>
      <p className="text-sm leading-5 text-[#605e64]">Volvé a esta pantalla y tocá Comprobar pago. Cerrar la ventana de Mercado Pago no cancela el cobro.</p>
      {moneyLabel(dialog.link.amount, dialog.link.currency) && <p className="text-sm font-semibold">Importe del intento: {moneyLabel(dialog.link.amount, dialog.link.currency)}</p>}
      {dialog.blocked && <button type="button" className="min-h-11 text-left text-sm font-medium underline" onClick={() => void reopen(dialog.link)}>Abrir el pago</button>}
      <Actions>
        <Button className="h-11 flex-1 rounded-lg" onClick={() => { close(); void checkPayment() }}>Comprobar pago</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'resume' && <Panel title="Reanudar renovación" close={close} busy={busy}>
      <p className="text-sm leading-5">Importe: {moneyLabel(dialog.preview.amount, dialog.preview.currency)}</p>
      <p className="text-sm leading-5">Próximo cobro: {businessDateLabel(dialog.preview.nextDebitDay)}</p>
      <p className="text-sm leading-5 text-[#605e64]">Usa la misma renovación y no cobra el período vigente.</p>
      {dialog.error && <p role="alert" className="text-sm text-[#aa3030]">{dialog.error}</p>}
      <Actions>
        <Button variant="secondary" className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" disabled={busy} onClick={close}>Cancelar</Button>
        <Button className="h-11 flex-1 rounded-lg" disabled={busy} loading={busy} loadingLabel="Reanudando…" loadingMobileOnly={false} onClick={() => void confirmResume()}>Confirmar reanudación</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'requote' && <Panel title="Cotización vencida" close={close} busy={busy}>
      <p className="text-sm leading-5 text-[#605e64]">{dialog.message}</p>
      <Actions>
        <Button variant="secondary" className="h-11 flex-1 rounded-lg border-0 bg-[#e7e7e8]" disabled={busy} onClick={close}>Cerrar</Button>
        <Button className="h-11 flex-1 rounded-lg" disabled={busy} onClick={() => void openAdjustment()}>Pedir cotización</Button>
      </Actions>
    </Panel>}
  </dialog>
}

function Panel({ title, close, busy, children }: { title: string; close: () => void; busy: boolean; children: ReactNode }) {
  return <>
    <header className="flex h-14 items-center justify-between border-b border-[#e7e7e8] pl-4 pr-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <button type="button" aria-label="Cerrar" className="h-9 px-2 text-sm" disabled={busy} onClick={close}>Cerrar</button>
    </header>
    <div className="flex flex-col gap-4 p-6 text-sm">{children}</div>
  </>
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 border-t border-[#e7e7e8] pt-4">{children}</div>
}

function TermsList({ shown, intro }: { shown: ShownTerms; intro: string }) {
  return <div className="flex flex-col gap-2 text-sm leading-5">
    <p className="text-[#605e64]">{intro}</p>
    <p>Importe: {moneyLabel(shown.amount, shown.currency) ?? 'Sin importe'}</p>
    <p>Período que se conserva: {businessDateLabel(shown.periodEnd) ?? 'Sin fecha'}</p>
    {shown.periodStart && <p>Inicio del período: {businessDateLabel(shown.periodStart)}</p>}
    <p>Vigencia de la cotización: {instantLabel(shown.payUntil) ?? 'Sin vencimiento'}</p>
    <p>Renovación mensual fijada: {moneyLabel(shown.eliteMonthlyAmount, shown.eliteMonthlyCurrency) ?? 'Se confirma con el cargo'}</p>
  </div>
}

function priceLabel(offer: PlanOffer): string {
  if (offer.price?.status === 'AVAILABLE' && offer.price.amount && offer.price.currency) {
    return `${offer.price.amount} ${offer.price.currency}`
  }
  return 'El importe se confirma al iniciar el cobro'
}

function verdictCopy(verdict: ChargeOpenVerdict): string {
  switch (verdict) {
    case 'confirmed': return 'El pago figura confirmado. No volvemos a abrirlo.'
    case 'manual': return 'Este cobro quedó para resolución manual. El plan no se activó.'
    case 'failed': return 'El cobro figura fallido. No abrimos el enlace.'
    case 'canceled': return 'El cobro figura cancelado. No abrimos el enlace.'
    case 'uncertain': return 'Todavía sin confirmación. No abrimos el enlace.'
    case 'expired': return 'La cotización venció. Pedí una nueva.'
    default: return 'No pudimos confirmar el cobro. No abrimos el enlace.'
  }
}

function conflictCopy(outcome: ConflictOutcome): string {
  switch (outcome) {
    case 'confirmed': return 'El pago figura confirmado. El plan se actualiza con la lectura del servidor.'
    case 'manual': return 'Este cobro quedó para resolución manual. El plan no se activó.'
    case 'unconfirmed': return 'Todavía sin confirmación.'
    case 'failed': return 'El cobro figura fallido. Podés intentar el mismo plan otra vez.'
    case 'canceled': return 'El cobro figura cancelado. Podés intentar el mismo plan otra vez.'
    case 'already-resumed': return 'La renovación ya figura activa. No enviamos otro pedido.'
    case 'authorization': return 'Falta la autorización del pagador. No dimos la reanudación por hecha.'
    case 'still-open': return 'No pudimos confirmar la operación. Comprobá el estado antes de intentar de nuevo.'
  }
}

function openProviderWindow(url: string): 'opened' | 'blocked' {
  const popup = window.open(url, '_blank')
  if (!popup) return 'blocked'
  popup.opener = null
  return 'opened'
}
