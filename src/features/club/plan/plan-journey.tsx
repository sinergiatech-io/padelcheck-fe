import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { failureKind, planApi } from './plan-api'
import {
  adjustmentOpenDecision,
  checkoutPlanCode,
  createSingleFlight,
  eligibleCheckoutPlans,
  interpretConflict,
  moneyLabel,
  businessDateLabel,
  instantLabel,
  presentableQuote,
  providerUrl,
  quoteSnapshot,
  resumePreviewCanConfirm,
  resumeResult,
  termsSnapshot,
  type AdjustmentQuote,
  type ChargeTerms,
  type CheckoutLink,
  type CheckoutPlanCode,
  type ConflictOutcome,
  type PlanOffer,
  type ResumePreview,
  type ShownTerms,
} from './plan-model'
import { storedCharge } from './use-club-plan'

type DialogState =
  | { type: 'plans'; offers: PlanOffer[] | null; selected: CheckoutPlanCode | null; error: string | null }
  | { type: 'quote'; quote: AdjustmentQuote; error: string | null }
  | { type: 'review'; link: CheckoutLink; terms: ChargeTerms }
  | { type: 'return'; link: CheckoutLink; blocked: boolean }
  | { type: 'resume'; preview: ResumePreview; error: string | null }
  | { type: 'requote'; message: string }

interface JourneyInput {
  clubId: string | null
  posting: { current: boolean }
  rememberReference: (reference: string) => void
  recheck: (reason: 'manual' | 'focus') => Promise<void>
}

export function usePlanJourney({ clubId, posting, rememberReference, recheck }: JourneyInput) {
  const flight = useRef(createSingleFlight())
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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

  async function reconcile(intent: 'checkout' | 'adjustment' | 'resume'): Promise<ConflictOutcome> {
    if (!clubId) return 'still-open'
    const reference = storedCharge(clubId)
    const [charge, subscription] = await Promise.all([
      reference ? planApi.charge(clubId, reference).catch(() => null) : Promise.resolve(null),
      planApi.subscription(clubId).catch(() => null),
    ])
    const decision = interpretConflict({
      intent,
      charge,
      resumeAction: subscription?.recurrenceResumeAction ?? null,
      recurrencePaused: subscription?.recurrencePaused ?? null,
    })
    setNotice(conflictCopy(decision.outcome))
    await recheck('manual')
    return decision.outcome
  }

  async function startCheckout(planCode: CheckoutPlanCode) {
    if (!clubId) return
    setNotice(null)
    try {
      const link = await run(`checkout:${clubId}:${planCode}`, () => planApi.checkout(clubId, planCode))
      rememberReference(link.reference)
      showReturn(link)
    } catch (error) {
      if (failureKind(error) === 'conflict') {
        setDialog(null)
        await reconcile('checkout')
        return
      }
      if (failureKind(error) === 'unauthorized') return
      setDialog((current) => current?.type === 'plans'
        ? { ...current, error: 'No pudimos iniciar el cobro. No se abrió otro intento automático.' }
        : current)
      if (dialog?.type !== 'plans') setNotice('No pudimos iniciar el cobro. No se abrió otro intento automático.')
    }
  }

  function showReturn(link: CheckoutLink) {
    const safe = providerUrl(link.url)
    const blocked = !safe || openProviderWindow(safe) === 'blocked'
    setDialog({ type: 'return', link, blocked })
  }

  async function openUpgrade() {
    if (!clubId) return
    setDialog({ type: 'plans', offers: null, selected: null, error: null })
    try {
      const offers = eligibleCheckoutPlans(await run(`offers:${clubId}`, () => planApi.offers()))
      setDialog({ type: 'plans', offers, selected: null, error: offers.length ? null : 'No hay planes de pago disponibles en el catálogo.' })
    } catch (error) {
      if (failureKind(error) === 'unauthorized') return
      setDialog({ type: 'plans', offers: [], selected: null, error: 'No pudimos leer el catálogo. Reintentá desde acá.' })
    }
  }

  async function openAdjustment() {
    if (!clubId) return
    setNotice(null)
    try {
      const quote = await run(`quote:${clubId}`, () => planApi.quote(clubId))
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
      if (failureKind(error) === 'conflict') {
        await reconcile('adjustment')
        return
      }
      if (failureKind(error) !== 'unauthorized') setNotice('No pudimos consultar la cotización.')
    }
  }

  async function confirmQuote(quote: AdjustmentQuote) {
    if (!clubId) return
    if (presentableQuote(quote, Date.now()) !== 'show') {
      setDialog({ type: 'requote', message: 'La cotización venció antes de confirmar. Pedí una nueva.' })
      return
    }
    try {
      const link = await run(`adjustment:${clubId}`, () => planApi.adjustmentCheckout(clubId))
      rememberReference(link.reference)
      const charge = await planApi.charge(clubId, link.reference)
      const decision = adjustmentOpenDecision(quoteSnapshot(quote), charge.terms, link.url)
      if (decision === 'review' && charge.terms) {
        setDialog({ type: 'review', link, terms: charge.terms })
        return
      }
      if (decision === 'open') {
        showReturn(link)
        return
      }
      setDialog(null)
      setNotice('Todavía sin confirmación. No abrimos el enlace.')
    } catch (error) {
      if (failureKind(error) === 'conflict') {
        setDialog(null)
        await reconcile('adjustment')
        return
      }
      if (failureKind(error) !== 'unauthorized') {
        setDialog((current) => current?.type === 'quote'
          ? { ...current, error: 'No pudimos iniciar el ajuste. No repetimos el pedido automáticamente.' }
          : current)
      }
    }
  }

  function acceptReviewedTerms(link: CheckoutLink, terms: ChargeTerms) {
    const decision = adjustmentOpenDecision(termsSnapshot(terms), terms, link.url)
    if (decision !== 'open') {
      setNotice('Todavía sin confirmación. No abrimos el enlace.')
      setDialog(null)
      return
    }
    showReturn(link)
  }

  async function openResume() {
    if (!clubId) return
    setNotice(null)
    try {
      const preview = await run(`resume-preview:${clubId}`, () => planApi.resumePreview(clubId))
      if (!resumePreviewCanConfirm(preview)) {
        setNotice('Esta lectura no alcanza para reanudar. No confirmamos el pedido.')
        return
      }
      setDialog({ type: 'resume', preview, error: null })
    } catch (error) {
      if (failureKind(error) === 'conflict') {
        await reconcile('resume')
        return
      }
      if (failureKind(error) !== 'unauthorized') setNotice('No pudimos leer la reanudación.')
    }
  }

  async function confirmResume() {
    if (!clubId) return
    try {
      const preview = await run(`resume-confirm:${clubId}`, () => planApi.resumeConfirm(clubId))
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
      if (failureKind(error) === 'conflict') {
        setDialog(null)
        await reconcile('resume')
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
    confirmQuote,
    acceptReviewedTerms,
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
  acceptReviewedTerms: (link: CheckoutLink, terms: ChargeTerms) => void
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
        <Button className="h-11 flex-1 rounded-lg" disabled={busy} onClick={() => acceptReviewedTerms(dialog.link, dialog.terms)}>Abrir el pago</Button>
      </Actions>
    </Panel>}
    {dialog.type === 'return' && <Panel title="Volvé a comprobar el pago" close={close} busy={false}>
      <p className="text-sm leading-5 text-[#605e64]">Volvé a esta pantalla y tocá Comprobar pago. Cerrar la ventana de Mercado Pago no cancela el cobro.</p>
      {moneyLabel(dialog.link.amount, dialog.link.currency) && <p className="text-sm font-semibold">Importe del intento: {moneyLabel(dialog.link.amount, dialog.link.currency)}</p>}
      {dialog.blocked && providerUrl(dialog.link.url) && <a className="text-sm font-medium underline" href={providerUrl(dialog.link.url) ?? undefined} target="_blank" rel="noopener noreferrer">Abrir el pago</a>}
      {dialog.blocked && !providerUrl(dialog.link.url) && <p role="alert" className="text-sm text-[#aa3030]">El enlace de pago no es válido. No lo abrimos.</p>}
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

function conflictCopy(outcome: ConflictOutcome): string {
  switch (outcome) {
    case 'confirmed': return 'El pago figura confirmado. El plan se actualiza con la lectura del servidor.'
    case 'manual': return 'Este cobro quedó para resolución manual. El plan no se activó.'
    case 'unconfirmed': return 'Todavía sin confirmación.'
    case 'failed': return 'El cobro figura fallido. Podés intentar el mismo plan otra vez.'
    case 'canceled': return 'El cobro figura cancelado. Podés intentar el mismo plan otra vez.'
    case 'already-resumed': return 'La renovación ya figura activa. No enviamos otro pedido.'
    case 'still-open': return 'No pudimos confirmar la operación. Comprobá el estado antes de intentar de nuevo.'
  }
}

function openProviderWindow(url: string): 'opened' | 'blocked' {
  const popup = window.open(url, '_blank')
  if (!popup) return 'blocked'
  popup.opener = null
  return 'opened'
}
