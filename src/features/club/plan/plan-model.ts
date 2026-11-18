/** Pure decisions for the club plan panel. Server flags and reads win over local guesses. */

export type MeterState = 'LIMITED' | 'UNLIMITED' | 'ABSENT'
export type MeterTone = 'plain' | 'warning' | 'limit' | 'excess' | 'unlimited' | 'absent'
export type ChargeOutcome = 'confirmed' | 'manual' | 'unconfirmed' | 'failed' | 'canceled' | 'unknown'
export type PlanAction = 'retry' | 'complete-payment' | 'resume' | 'authorize' | 'adjust' | 'upgrade' | 'check-payment'
export type CheckoutPlanCode = 'PRO' | 'ELITE'
export type ConflictOutcome = 'confirmed' | 'manual' | 'unconfirmed' | 'failed' | 'canceled' | 'already-resumed' | 'authorization' | 'still-open'
export type PaymentRoute = 'adjustment' | 'checkout' | 'none'
export type ChargeOpenVerdict = 'open' | 'review' | 'confirmed' | 'manual' | 'failed' | 'canceled' | 'uncertain' | 'expired' | 'withhold'
export type CheckoutOpenDecision = 'open' | 'review' | 'reject'

export interface UsageMeter {
  key: string
  state: MeterState
  limit: number | null
  used: number
  warning: boolean | null
  reached: boolean | null
  exceeded: boolean | null
}

export interface MeterCopy {
  one: string
  many: string
  detail?: string
  excessNote?: string
}

export interface MeterView {
  tone: MeterTone
  value: string
  caption: string
  note: string | null
}

export interface PlanOffer {
  code: string
  name: string
  description: string | null
  free: boolean
  features: PlanFeature[]
  price: PlanPrice | null
}

export interface PlanFeature {
  key: string
  kind: string
  state: string
  limit: number | null
}

export interface PlanPrice {
  status: string
  amount: string | null
  currency: string | null
  period: string | null
}

export interface RequestedPlan {
  planCode: string
  status: string
  chargeOutcome: string | null
}

export interface CommercialPeriod {
  kind: string
  medium: string | null
  planCode: string | null
  periodStart: string | null
  periodEnd: string | null
  open: boolean
}

export interface BillingActions {
  fullCheckout: boolean
  requestAdjustmentQuote: boolean
}

export interface ClubSubscription {
  clubId: string
  planCode: string
  status: string
  agreedRenewalAmount: string | null
  agreedRenewalCurrency: string | null
  periodEnd: string | null
  recurrencePaused: boolean | null
  recurrenceResumeAction: string | null
  recurrenceAuthorizationUrl: string | null
  requestedPlan: RequestedPlan | null
  commercialPeriod: CommercialPeriod
  actions: BillingActions
}

export interface ClubEventUsage {
  eventId: string
  status: string
  confirmedEntries: UsageMeter
  divisions: UsageMeter
}

export interface ClubUsage {
  clubId: string
  planCode: string
  status: string
  subscriptionPlanCode: string | null
  plan: PlanOffer
  club: { activeTournaments: UsageMeter; staffUsers: UsageMeter }
  event: ClubEventUsage | null
}

export interface ChargeTerms {
  reference: string | null
  amount: string | null
  currency: string | null
  periodStart: string | null
  periodEnd: string | null
  payUntil: string | null
  eliteMonthlyAmount: string | null
  eliteMonthlyCurrency: string | null
  status: string | null
}

export interface BillingCharge {
  reference: string
  kind: string | null
  planCode: string | null
  status: string
  amount: string | null
  currency: string | null
  periodStart: string | null
  periodEnd: string | null
  confirmed: boolean
  manualResolution: boolean
  terms: ChargeTerms | null
}

export interface AdjustmentQuote {
  available: boolean
  amount: string | null
  currency: string | null
  periodEnd: string | null
  payUntil: string | null
}

export interface CheckoutLink {
  clubId: string | null
  planCode: string | null
  amount: string | null
  currency: string | null
  url: string | null
  reference: string
}

export interface ResumePreview {
  amount: string | null
  currency: string | null
  nextDebitDay: string | null
  chargesCurrentPeriod: boolean
  sameRecurrence: boolean
  resumed: boolean
  payerAuthorizationUrl: string | null
}

export interface ShownTerms {
  amount: string | null
  currency: string | null
  periodStart: string | null
  periodEnd: string | null
  payUntil: string | null
  eliteMonthlyAmount: string | null
  eliteMonthlyCurrency: string | null
}

export interface ReadScope {
  clubId: string
  eventId: string | null
  sessionKey: string
  request: number
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys?: () => string[]
}

export interface BillingScope {
  userId: string
  session: string
  clubId: string
}

export interface PlanActionInput {
  loading: boolean
  failed: boolean
  canManage: boolean
  requestedPlanCode: string | null
  resumeAction: string | null
  authorizationUrl: string | null
  requestAdjustmentQuote: boolean
  fullCheckout: boolean
  hasReference: boolean
}

const GRANTING = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE'])
const PROVIDER_HOST = /^(?:[a-z0-9-]+\.)*mercadopago\.(?:com(?:\.[a-z]{2})?|[a-z]{2})$/

export function acceptRead(expected: ReadScope, current: ReadScope): boolean {
  return expected.clubId === current.clubId
    && expected.eventId === current.eventId
    && expected.sessionKey === current.sessionKey
    && expected.request === current.request
}

export function createSingleFlight() {
  const running = new Map<string, Promise<unknown>>()
  return function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = running.get(key)
    if (existing) return existing as Promise<T>
    const created = task().finally(() => {
      if (running.get(key) === created) running.delete(key)
    })
    running.set(key, created)
    return created
  }
}

export function looksLikeJwt(value: string): boolean {
  return /[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/.test(value)
}

export function opaqueReference(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const reference = value.trim()
  if (!reference || reference.length > 128 || !/^[A-Za-z0-9_-]+$/.test(reference)) return null
  if (looksLikeJwt(reference)) return null
  return reference
}

export function providerUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.length > 2000) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (host !== 'billing.test' && !PROVIDER_HOST.test(host)) return null
  if (looksLikeJwt(`${url.pathname}${url.search}${url.hash}`)) return null
  return url.toString()
}

export function chargeStorageKey(scope: BillingScope): string {
  return `padelcheck.plan.charge.${scopeToken(scope.userId)}.${scope.session}.${scope.clubId}`
}

export function rememberCharge(store: KeyValueStore, scope: BillingScope, reference: string): void {
  const safe = opaqueReference(reference)
  if (!safe || !scope.userId || !scope.clubId || !/^[A-Za-z0-9-]{8,80}$/.test(scope.session)) return
  store.setItem(chargeStorageKey(scope), safe)
}

export function recallCharge(store: KeyValueStore, scope: BillingScope): string | null {
  const key = chargeStorageKey(scope)
  const safe = opaqueReference(store.getItem(key))
  if (!safe) {
    store.removeItem(key)
    return null
  }
  return safe
}

export function forgetCharge(store: KeyValueStore, scope: BillingScope): void {
  store.removeItem(chargeStorageKey(scope))
}

export function forgetPlanCharges(store: KeyValueStore): void {
  for (const key of store.keys?.() ?? []) {
    if (key.startsWith('padelcheck.plan.charge.')) store.removeItem(key)
  }
}

export function continuationAllowed(started: number, current: number): boolean {
  return started === current
}

export async function settleAfterPost<T>(input: {
  started: number
  current: () => number
  post: () => Promise<T>
  apply: (value: T) => void
}): Promise<'applied' | 'stale'> {
  const value = await input.post()
  if (!continuationAllowed(input.started, input.current())) return 'stale'
  input.apply(value)
  return 'applied'
}

export async function loadIfCurrent<T>(input: {
  started: number
  current: () => number
  load: () => Promise<T>
}): Promise<T | 'stale'> {
  const value = await input.load()
  if (!continuationAllowed(input.started, input.current())) return 'stale'
  return value
}

export function checkoutPlanCode(value: unknown): CheckoutPlanCode | null {
  return value === 'PRO' || value === 'ELITE' ? value : null
}

export function monthlyPriceReady(price: PlanPrice | null): boolean {
  if (!price || price.status !== 'AVAILABLE' || price.period !== 'MONTH') return false
  if (!price.amount || !price.currency || !/^[A-Z]{3}$/.test(price.currency)) return false
  const amount = Number(price.amount)
  return Number.isFinite(amount) && amount > 0
}

export function eligibleCheckoutPlans(offers: PlanOffer[]): PlanOffer[] {
  return offers.filter((offer) => checkoutPlanCode(offer.code) != null && monthlyPriceReady(offer.price))
}

export function unavailableCheckoutPlans(offers: PlanOffer[]): PlanOffer[] {
  return offers.filter((offer) => checkoutPlanCode(offer.code) != null && !monthlyPriceReady(offer.price))
}

export function paymentRoute(input: {
  requestedPlanCode: string | null
  requestAdjustmentQuote: boolean
  fullCheckout: boolean
}): PaymentRoute {
  if (!checkoutPlanCode(input.requestedPlanCode)) return 'none'
  if (input.requestAdjustmentQuote) return 'adjustment'
  if (input.fullCheckout) return 'checkout'
  return 'none'
}

export async function dispatchCompletePayment(route: PaymentRoute, effects: {
  startAdjustment: () => Promise<void>
  startCheckout: () => Promise<void>
  explainBlocked: () => void
}): Promise<void> {
  if (route === 'adjustment') return effects.startAdjustment()
  if (route === 'checkout') return effects.startCheckout()
  effects.explainBlocked()
}

export function planActions(input: PlanActionInput): { primary: PlanAction | null; secondary: PlanAction[] } {
  if (input.loading) return { primary: null, secondary: [] }
  if (input.failed) return { primary: 'retry', secondary: [] }
  const available: PlanAction[] = []
  const requested = checkoutPlanCode(input.requestedPlanCode)
  if (input.canManage && paymentRoute({
    requestedPlanCode: input.requestedPlanCode,
    requestAdjustmentQuote: input.requestAdjustmentQuote,
    fullCheckout: input.fullCheckout,
  }) !== 'none') available.push('complete-payment')
  if (input.canManage && !requested && input.resumeAction === 'RESUME_RENEWAL') available.push('resume')
  if (input.canManage && input.resumeAction === 'AUTHORIZE_RENEWAL' && providerUrl(input.authorizationUrl)) {
    available.push('authorize')
  }
  if (input.canManage && !requested && input.requestAdjustmentQuote) available.push('adjust')
  if (input.canManage && !requested && !input.requestAdjustmentQuote && input.fullCheckout) available.push('upgrade')
  if (input.hasReference) available.push('check-payment')
  const [primary = null, ...secondary] = available
  return { primary, secondary }
}

export function focusRecheckAllowed(input: { hasReference: boolean; postInFlight: boolean; lastRecheckAt: number; now: number }): boolean {
  if (!input.hasReference || input.postInFlight) return false
  return input.now - input.lastRecheckAt >= 1500
}

export function chargeReading(charge: Pick<BillingCharge, 'status' | 'confirmed' | 'manualResolution'> | null): ChargeOutcome {
  if (!charge) return 'unknown'
  if (charge.confirmed) return 'confirmed'
  if (charge.manualResolution) return 'manual'
  switch (charge.status) {
    case 'APPLIED': return 'confirmed'
    case 'UNAPPLIED': return 'manual'
    case 'OPEN':
    case 'OPENING':
    case 'UNCERTAIN': return 'unconfirmed'
    case 'FAILED': return 'failed'
    case 'CANCELED': return 'canceled'
    default: return 'unknown'
  }
}

export function interpretConflict(input: {
  intent: 'checkout' | 'adjustment' | 'resume'
  charge: Pick<BillingCharge, 'status' | 'confirmed' | 'manualResolution'> | null
  resumeAction: string | null
  recurrencePaused: boolean | null
  subscriptionRead?: boolean
}): { outcome: ConflictOutcome; allowAnotherPost: boolean } {
  if (input.intent === 'resume') {
    if (input.subscriptionRead !== true) return { outcome: 'still-open', allowAnotherPost: false }
    if (input.resumeAction === 'AUTHORIZE_RENEWAL') return { outcome: 'authorization', allowAnotherPost: false }
    if (input.resumeAction === 'RESUME_RENEWAL' || input.recurrencePaused === true) {
      return { outcome: 'still-open', allowAnotherPost: false }
    }
    if (input.recurrencePaused === false && input.resumeAction == null) {
      return { outcome: 'already-resumed', allowAnotherPost: false }
    }
    return { outcome: 'still-open', allowAnotherPost: false }
  }
  const reading = chargeReading(input.charge)
  if (reading === 'confirmed') return { outcome: 'confirmed', allowAnotherPost: false }
  if (reading === 'manual') return { outcome: 'manual', allowAnotherPost: false }
  if (reading === 'unconfirmed') return { outcome: 'unconfirmed', allowAnotherPost: false }
  if (reading === 'failed') return { outcome: 'failed', allowAnotherPost: true }
  if (reading === 'canceled') return { outcome: 'canceled', allowAnotherPost: true }
  return { outcome: 'still-open', allowAnotherPost: false }
}

export function limitsUseStoredPlan(status: string, storedPlanCode: string | null, effectivePlanCode: string): boolean {
  return storedPlanCode != null && storedPlanCode === effectivePlanCode && GRANTING.has(status)
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Suscripción activa'
    case 'TRIALING': return 'Período de prueba'
    case 'PAST_DUE': return 'Pago vencido'
    case 'CANCELED': return 'Suscripción cancelada'
    case 'INACTIVE': return 'Suscripción inactiva'
    default: return `Estado ${status}`
  }
}

export function presentMeter(meter: UsageMeter, copy: MeterCopy): MeterView {
  const count = countLabel(meter.used, copy.one, copy.many)
  if (meter.state === 'UNLIMITED') {
    return {
      tone: 'unlimited',
      value: 'Ilimitado',
      caption: copy.detail ? `${count} · ${copy.detail}` : count,
      note: null,
    }
  }
  if (meter.state !== 'LIMITED' || meter.limit == null) {
    return { tone: 'absent', value: 'Sin límite informado', caption: 'Este dato no está en el plan vigente', note: null }
  }
  const percent = limitedPercent(meter.used, meter.limit)
  const percentLabel = percent == null ? null : `${percent}%`
  const exceeded = meter.exceeded === true
  const reached = meter.reached === true
  const warning = meter.warning === true && !reached && !exceeded
  const tone: MeterTone = exceeded ? 'excess' : reached ? 'limit' : warning ? 'warning' : 'plain'
  const flag = exceeded ? 'Por encima del límite' : reached ? 'Límite alcanzado' : warning ? 'Cerca del límite' : null
  const caption = flag
    ? percentLabel ? `${flag} · ${percentLabel}` : flag
    : copy.detail
      ? percentLabel ? `${copy.detail} · ${percentLabel}` : copy.detail
      : percentLabel ? `${count} · ${percentLabel}` : count
  return {
    tone,
    value: `${meter.used} / ${meter.limit}`,
    caption,
    note: exceeded ? copy.excessNote ?? 'Los datos se conservan.' : null,
  }
}

export function limitedPercent(used: number, limit: number): number | null {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null
  return Math.round((used / limit) * 100)
}

export function countLabel(used: number, one: string, many: string): string {
  return `${used} ${used === 1 ? one : many}`
}

export function nextEventSelection(current: string | null, events: { id: string }[]): string | null {
  if (current && events.some((event) => event.id === current)) return current
  return null
}

export function businessDateLabel(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

export function instantLabel(value: string | null): string | null {
  if (!value) return null
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return null
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(time)
}

export function moneyLabel(amount: string | null, currency: string | null): string | null {
  if (!amount || !currency) return null
  return `${amount} ${currency}`
}

export function includedFeatures(plan: PlanOffer): string[] {
  const enabled = new Set(plan.features.filter((feature) => feature.state === 'ENABLED').map((feature) => feature.key))
  const lines: string[] = []
  if (enabled.has('CUSTOM_BRANDING')) lines.push('Marca personalizada')
  if (enabled.has('ADVANCED_STATS')) lines.push('Estadísticas avanzadas · Post-MVP')
  lines.push(enabled.has('PRIORITY_SUPPORT') ? 'Soporte prioritario' : 'Soporte estándar')
  return lines
}

export function quoteStillValid(payUntil: string | null, now: number): boolean {
  if (!payUntil) return false
  const time = Date.parse(payUntil)
  return Number.isFinite(time) && time > now
}

export function presentableQuote(quote: AdjustmentQuote, now: number): 'show' | 'unavailable' | 'expired' {
  if (!quote.available || !quote.amount || !quote.currency || !quote.periodEnd || !quote.payUntil) return 'unavailable'
  return quoteStillValid(quote.payUntil, now) ? 'show' : 'expired'
}

export function quoteSnapshot(quote: AdjustmentQuote): ShownTerms {
  return {
    amount: quote.amount,
    currency: quote.currency,
    periodStart: null,
    periodEnd: quote.periodEnd,
    payUntil: quote.payUntil,
    eliteMonthlyAmount: null,
    eliteMonthlyCurrency: null,
  }
}

export function termsSnapshot(terms: ChargeTerms): ShownTerms {
  return {
    amount: terms.amount,
    currency: terms.currency,
    periodStart: terms.periodStart,
    periodEnd: terms.periodEnd,
    payUntil: terms.payUntil,
    eliteMonthlyAmount: terms.eliteMonthlyAmount,
    eliteMonthlyCurrency: terms.eliteMonthlyCurrency,
  }
}

export function sameSnapshot(left: ShownTerms, right: ShownTerms): boolean {
  return moneyEqual(left.amount, right.amount)
    && sameText(left.currency, right.currency)
    && left.periodStart === right.periodStart
    && left.periodEnd === right.periodEnd
    && sameInstant(left.payUntil, right.payUntil)
    && moneyEqual(left.eliteMonthlyAmount, right.eliteMonthlyAmount)
    && sameText(left.eliteMonthlyCurrency, right.eliteMonthlyCurrency)
}

export function adjustmentOpenDecision(shown: ShownTerms, terms: ChargeTerms | null, url: string | null, now = Number.NaN): 'open' | 'review' | 'withhold' {
  if (!terms) return 'withhold'
  if (terms.payUntil && !quoteStillValid(terms.payUntil, now)) return 'withhold'
  if (!sameSnapshot(shown, termsSnapshot(terms))) return 'review'
  return providerUrl(url) ? 'open' : 'withhold'
}

export function checkoutOpenDecision(consent: {
  clubId: string
  planCode: string
  amount: string | null
  currency: string | null
}, link: CheckoutLink): CheckoutOpenDecision {
  if (link.clubId !== consent.clubId || link.planCode !== consent.planCode) return 'reject'
  if (!link.amount || !link.currency || !providerUrl(link.url)) return 'reject'
  if (!moneyEqual(consent.amount, link.amount) || !sameText(consent.currency, link.currency)) return 'review'
  return 'open'
}

export function chargeOpenVerdict(input: {
  expectedReference: string
  expectedPlanCode: string | null
  shown: ShownTerms | null
  charge: BillingCharge | null
  url: string | null
  now: number
}): ChargeOpenVerdict {
  if (!input.charge || input.charge.reference !== input.expectedReference) return 'withhold'
  if (input.expectedPlanCode && input.charge.planCode !== input.expectedPlanCode) return 'withhold'
  const reading = chargeReading(input.charge)
  if (reading === 'confirmed') return 'confirmed'
  if (reading === 'manual') return 'manual'
  if (reading === 'failed') return 'failed'
  if (reading === 'canceled') return 'canceled'
  if (input.charge.status === 'UNCERTAIN' || reading === 'unknown') return reading === 'unknown' ? 'withhold' : 'uncertain'
  const payUntil = input.charge.terms?.payUntil ?? null
  if (payUntil && !quoteStillValid(payUntil, input.now)) return 'expired'
  if (input.charge.terms) {
    if (!input.shown || !sameSnapshot(input.shown, termsSnapshot(input.charge.terms))) return 'review'
  } else if (!input.shown
    || !moneyEqual(input.shown.amount, input.charge.amount)
    || !sameText(input.shown.currency, input.charge.currency)) {
    return 'review'
  }
  return providerUrl(input.url) ? 'open' : 'withhold'
}

export type CheckoutFollowUp =
  | { kind: 'unavailable' }
  | { kind: 'reject'; link: CheckoutLink }
  | { kind: 'review'; link: CheckoutLink }
  | { kind: 'open'; link: CheckoutLink }
  | { kind: Exclude<ChargeOpenVerdict, 'open' | 'review'>; link: CheckoutLink }

/** One checkout post, then the same charge read used before any provider window. */
export async function runFullCheckout(input: {
  clubId: string
  planCode: CheckoutPlanCode
  loadOffers: () => Promise<PlanOffer[]>
  postCheckout: (planCode: CheckoutPlanCode) => Promise<CheckoutLink>
  loadCharge: (reference: string) => Promise<BillingCharge>
  now: number
}): Promise<CheckoutFollowUp> {
  const offers = await input.loadOffers()
  const offer = eligibleCheckoutPlans(offers).find((item) => item.code === input.planCode)
  if (!offer?.price?.amount || !offer.price.currency) return { kind: 'unavailable' }
  const link = await input.postCheckout(input.planCode)
  const decision = checkoutOpenDecision({
    clubId: input.clubId,
    planCode: input.planCode,
    amount: offer.price.amount,
    currency: offer.price.currency,
  }, link)
  if (decision === 'reject') return { kind: 'reject', link }
  if (decision === 'review') return { kind: 'review', link }
  let charge: BillingCharge | null = null
  try {
    charge = await input.loadCharge(link.reference)
  } catch {
    return { kind: 'withhold', link }
  }
  const verdict = chargeOpenVerdict({
    expectedReference: link.reference,
    expectedPlanCode: link.planCode,
    shown: {
      amount: offer.price.amount,
      currency: offer.price.currency,
      periodStart: null,
      periodEnd: null,
      payUntil: null,
      eliteMonthlyAmount: null,
      eliteMonthlyCurrency: null,
    },
    charge,
    url: link.url,
    now: input.now,
  })
  if (verdict === 'open') return { kind: 'open', link }
  if (verdict === 'review') return { kind: 'review', link }
  return { kind: verdict, link }
}

export function resumePreviewCanConfirm(preview: ResumePreview): boolean {
  return preview.chargesCurrentPeriod === false
    && preview.sameRecurrence === true
    && Boolean(preview.amount && preview.currency && preview.nextDebitDay)
}

export function resumeResult(preview: ResumePreview): 'resumed' | 'authorization' | 'unconfirmed' | 'blocked-url' {
  if (preview.resumed) {
    return preview.sameRecurrence === true && preview.chargesCurrentPeriod === false ? 'resumed' : 'unconfirmed'
  }
  if (preview.payerAuthorizationUrl) return providerUrl(preview.payerAuthorizationUrl) ? 'authorization' : 'blocked-url'
  return 'unconfirmed'
}

function scopeToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '')
}

function moneyEqual(left: string | null, right: string | null): boolean {
  if (left == null || right == null) return left == null && right == null
  const a = Number(left)
  const b = Number(right)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return left === right
  return a === b
}

function sameText(left: string | null, right: string | null): boolean {
  if (left == null || right == null) return left == null && right == null
  return left.toUpperCase() === right.toUpperCase()
}

function sameInstant(left: string | null, right: string | null): boolean {
  if (left == null || right == null) return left == null && right == null
  const a = Date.parse(left)
  const b = Date.parse(right)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return left === right
  return a === b
}

export function parseSubscription(value: unknown): ClubSubscription | null {
  const record = object(value)
  if (!record || !text(record.clubId) || !text(record.planCode) || !text(record.status)) return null
  const requested = object(record.requestedPlan)
  const period = object(record.commercialPeriod)
  const actions = object(record.actions)
  return {
    clubId: text(record.clubId) as string,
    planCode: text(record.planCode) as string,
    status: text(record.status) as string,
    agreedRenewalAmount: text(record.agreedRenewalAmount),
    agreedRenewalCurrency: text(record.agreedRenewalCurrency),
    periodEnd: text(record.periodEnd),
    recurrencePaused: bool(record.recurrencePaused),
    recurrenceResumeAction: text(record.recurrenceResumeAction),
    recurrenceAuthorizationUrl: text(record.recurrenceAuthorizationUrl),
    requestedPlan: requested && text(requested.planCode) && requested.status === 'PENDING_PAYMENT'
      ? { planCode: text(requested.planCode) as string, status: 'PENDING_PAYMENT', chargeOutcome: text(requested.chargeOutcome) }
      : null,
    commercialPeriod: period && text(period.kind)
      ? {
          kind: text(period.kind) as string,
          medium: text(period.medium),
          planCode: text(period.planCode),
          periodStart: text(period.periodStart),
          periodEnd: text(period.periodEnd),
          open: period.open === true,
        }
      : { kind: 'ABSENT', medium: null, planCode: null, periodStart: null, periodEnd: null, open: false },
    actions: {
      fullCheckout: actions?.fullCheckout === true,
      requestAdjustmentQuote: actions?.requestAdjustmentQuote === true,
    },
  }
}

export function parseUsage(value: unknown): ClubUsage | null {
  const record = object(value)
  const plan = record ? parseOffer(record.plan) : null
  const club = object(record?.club)
  const tournaments = club ? parseMeter(club.activeTournaments) : null
  const staff = club ? parseMeter(club.staffUsers) : null
  if (!record || !text(record.clubId) || !text(record.planCode) || !text(record.status) || !plan || !tournaments || !staff) return null
  if (record.subscriptionPlanCode != null && !text(record.subscriptionPlanCode)) return null
  const event = record.event == null ? null : parseEventUsage(record.event)
  if (record.event != null && !event) return null
  return {
    clubId: text(record.clubId) as string,
    planCode: text(record.planCode) as string,
    status: text(record.status) as string,
    subscriptionPlanCode: text(record.subscriptionPlanCode),
    plan,
    club: { activeTournaments: tournaments, staffUsers: staff },
    event,
  }
}

export function parseOffers(value: unknown): PlanOffer[] | null {
  if (!Array.isArray(value)) return null
  const offers: PlanOffer[] = []
  for (const item of value) {
    const offer = parseOffer(item)
    if (offer) offers.push(offer)
  }
  return offers
}

export function parseEvents(value: unknown): { id: string; name: string; status: string | null }[] | null {
  if (!Array.isArray(value)) return null
  const events: { id: string; name: string; status: string | null }[] = []
  for (const item of value) {
    const record = object(item)
    if (!record || !text(record.id) || !text(record.name)) continue
    events.push({ id: text(record.id) as string, name: text(record.name) as string, status: text(record.status) })
  }
  return events
}

export function parseCharge(value: unknown): BillingCharge | null {
  const record = object(value)
  const reference = opaqueReference(record?.reference)
  if (!record || !reference || !text(record.status) || typeof record.confirmed !== 'boolean' || typeof record.manualResolution !== 'boolean') {
    return null
  }
  const terms = record.terms == null ? null : parseTerms(record.terms)
  if (record.terms != null && !terms) return null
  return {
    reference,
    kind: text(record.kind),
    planCode: text(record.planCode),
    status: text(record.status) as string,
    amount: text(record.amount),
    currency: text(record.currency),
    periodStart: text(record.periodStart),
    periodEnd: text(record.periodEnd),
    confirmed: record.confirmed,
    manualResolution: record.manualResolution,
    terms,
  }
}

export function parseQuote(value: unknown): AdjustmentQuote | null {
  const record = object(value)
  if (!record || typeof record.available !== 'boolean') return null
  return {
    available: record.available,
    amount: text(record.amount),
    currency: text(record.currency),
    periodEnd: text(record.periodEnd),
    payUntil: text(record.payUntil),
  }
}

export function parseCheckout(value: unknown): CheckoutLink | null {
  const record = object(value)
  const reference = opaqueReference(record?.reference)
  if (!record || !reference) return null
  return {
    clubId: text(record.clubId),
    planCode: text(record.planCode),
    amount: text(record.amount),
    currency: text(record.currency),
    url: text(record.url),
    reference,
  }
}

export function parseResume(value: unknown): ResumePreview | null {
  const record = object(value)
  if (!record
    || typeof record.chargesCurrentPeriod !== 'boolean'
    || typeof record.sameRecurrence !== 'boolean'
    || typeof record.resumed !== 'boolean') return null
  return {
    amount: text(record.amount),
    currency: text(record.currency),
    nextDebitDay: text(record.nextDebitDay),
    chargesCurrentPeriod: record.chargesCurrentPeriod,
    sameRecurrence: record.sameRecurrence,
    resumed: record.resumed,
    payerAuthorizationUrl: text(record.payerAuthorizationUrl),
  }
}

function parseEventUsage(value: unknown): ClubEventUsage | null {
  const record = object(value)
  const entries = record ? parseMeter(record.confirmedEntries) : null
  const divisions = record ? parseMeter(record.divisions) : null
  if (!record || !text(record.eventId) || !text(record.status) || !entries || !divisions) return null
  return {
    eventId: text(record.eventId) as string,
    status: text(record.status) as string,
    confirmedEntries: entries,
    divisions,
  }
}

function parseOffer(value: unknown): PlanOffer | null {
  const record = object(value)
  if (!record || !text(record.code) || !text(record.name) || typeof record.free !== 'boolean' || !Array.isArray(record.features)) return null
  const features: PlanFeature[] = []
  for (const item of record.features) {
    const feature = object(item)
    if (!feature || !text(feature.key) || !text(feature.state)) return null
    features.push({
      key: text(feature.key) as string,
      kind: text(feature.kind) ?? '',
      state: text(feature.state) as string,
      limit: integer(feature.limit),
    })
  }
  const price = record.price == null ? null : parsePrice(record.price)
  if (record.price != null && !price) return null
  return {
    code: text(record.code) as string,
    name: text(record.name) as string,
    description: text(record.description),
    free: record.free,
    features,
    price,
  }
}

function parsePrice(value: unknown): PlanPrice | null {
  const record = object(value)
  if (!record || !text(record.status)) return null
  return {
    status: text(record.status) as string,
    amount: text(record.amount),
    currency: text(record.currency),
    period: text(record.period),
  }
}

function parseMeter(value: unknown): UsageMeter | null {
  const record = object(value)
  if (!record || !text(record.key) || !text(record.state) || typeof record.used !== 'number' || !Number.isFinite(record.used)) return null
  const state = record.state
  if (state !== 'LIMITED' && state !== 'UNLIMITED' && state !== 'ABSENT') return null
  const limit = record.limit == null ? null : integer(record.limit)
  if (record.limit != null && limit == null) return null
  if (state === 'LIMITED' && limit == null) return null
  if (state !== 'LIMITED' && limit != null) return null
  const warning = bool(record.warning)
  const reached = bool(record.reached)
  const exceeded = bool(record.exceeded)
  if (state === 'LIMITED' && (warning == null || reached == null || exceeded == null)) return null
  if (state !== 'LIMITED' && (warning != null || reached != null || exceeded != null)) return null
  return { key: text(record.key) as string, state, limit, used: record.used, warning, reached, exceeded }
}

function parseTerms(value: unknown): ChargeTerms | null {
  const record = object(value)
  if (!record) return null
  return {
    reference: text(record.reference),
    amount: text(record.amount),
    currency: text(record.currency),
    periodStart: text(record.periodStart),
    periodEnd: text(record.periodEnd),
    payUntil: text(record.payUntil),
    eliteMonthlyAmount: text(record.eliteMonthlyAmount),
    eliteMonthlyCurrency: text(record.eliteMonthlyCurrency),
    status: text(record.status),
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}
