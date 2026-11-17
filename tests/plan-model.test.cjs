const { test } = require('node:test')
const assert = require('node:assert/strict')
const model = require(process.env.PLAN_MODEL_MODULE)

const limited = (used, limit, flags) => ({
  key: 'MAX_ENTRIES_PER_EVENT', state: 'LIMITED', limit, used, ...flags,
})

test('meters follow server flags and hide a percentage outside a real ceiling', () => {
  const zero = model.presentMeter(limited(0, 1, { warning: false, reached: false, exceeded: false }), { one: 'torneo activo', many: 'torneos activos' })
  assert.equal(zero.value, '0 / 1')
  assert.equal(zero.caption, '0 torneos activos · 0%')
  assert.equal(zero.tone, 'plain')

  const warning = model.presentMeter(limited(100, 120, { warning: true, reached: false, exceeded: false }), { one: 'pareja confirmada', many: 'parejas confirmadas', detail: 'Todas las divisiones del torneo' })
  assert.equal(warning.tone, 'warning')
  assert.equal(warning.caption, 'Cerca del límite · 83%')

  const reached = model.presentMeter(limited(24, 24, { warning: false, reached: true, exceeded: false }), { one: 'pareja confirmada', many: 'parejas confirmadas' })
  assert.equal(reached.tone, 'limit')
  assert.equal(reached.caption, 'Límite alcanzado · 100%')

  const excess = model.presentMeter(limited(25, 24, { warning: false, reached: true, exceeded: true }), { one: 'pareja confirmada', many: 'parejas confirmadas', excessNote: 'Los datos se conservan.' })
  assert.equal(excess.tone, 'excess')
  assert.equal(excess.value, '25 / 24')
  assert.equal(excess.caption, 'Por encima del límite · 104%')
  assert.equal(excess.note, 'Los datos se conservan.')

  const unlimited = model.presentMeter({ key: 'MAX_ACTIVE_TOURNAMENTS', state: 'UNLIMITED', limit: null, used: 12, warning: null, reached: null, exceeded: null }, { one: 'torneo activo', many: 'torneos activos' })
  assert.equal(unlimited.value, 'Ilimitado')
  assert.equal(unlimited.caption, '12 torneos activos')
  assert.equal(unlimited.caption.includes('%'), false)

  const absent = model.presentMeter({ key: 'MAX_STAFF_USERS', state: 'ABSENT', limit: null, used: 4, warning: null, reached: null, exceeded: null }, { one: 'usuario staff', many: 'usuarios staff' })
  assert.equal(absent.tone, 'absent')
  assert.equal(absent.value.includes('4'), false)
})

test('a failed or missing read is not rendered as zero usage', () => {
  assert.equal(model.parseUsage({ clubId: 'c', planCode: 'FREE', status: 'ACTIVE', subscriptionPlanCode: null, plan: null, club: null, event: null }), null)
  assert.equal(model.parseUsage(null), null)
})

test('identity and effective plan stay distinct for a canceled paid plan and a missing row', () => {
  const canceled = model.parseUsage({
    clubId: 'c', planCode: 'FREE', status: 'CANCELED', subscriptionPlanCode: 'PRO',
    plan: offer('FREE'),
    club: { activeTournaments: meter('MAX_ACTIVE_TOURNAMENTS', 0, 1), staffUsers: meter('MAX_STAFF_USERS', 0, 1) },
    event: null,
  })
  assert.equal(canceled.planCode, 'FREE')
  assert.equal(canceled.subscriptionPlanCode, 'PRO')
  assert.equal(model.limitsUseStoredPlan(canceled.status, canceled.subscriptionPlanCode, canceled.planCode), false)
  assert.equal(model.statusLabel('CANCELED'), 'Suscripción cancelada')

  const missing = model.parseUsage({
    clubId: 'c', planCode: 'FREE', status: 'ACTIVE', subscriptionPlanCode: null,
    plan: offer('FREE'),
    club: { activeTournaments: meter('MAX_ACTIVE_TOURNAMENTS', 0, 1), staffUsers: meter('MAX_STAFF_USERS', 0, 1) },
    event: null,
  })
  assert.equal(missing.subscriptionPlanCode, null)
  assert.equal(model.limitsUseStoredPlan(missing.status, missing.subscriptionPlanCode, missing.planCode), false)
  assert.equal(model.limitsUseStoredPlan('ACTIVE', 'PRO', 'PRO'), true)
  assert.equal(model.limitsUseStoredPlan('PAST_DUE', 'PRO', 'PRO'), true)
})

test('requested plan only stays visible while payment is pending', () => {
  const pending = model.parseSubscription(subscription({ requestedPlan: { planCode: 'PRO', status: 'PENDING_PAYMENT', chargeOutcome: 'NONE' } }))
  assert.equal(pending.requestedPlan.planCode, 'PRO')
  const recorded = model.parseSubscription(subscription({ requestedPlan: { planCode: 'PRO', status: 'CONFIRMED', chargeOutcome: 'FAILED' } }))
  assert.equal(recorded.requestedPlan, null)
})

test('charge projection does not invent a failure and manual resolution is not activation', () => {
  assert.equal(model.chargeReading(null), 'unknown')
  assert.equal(model.chargeReading({ status: 'UNCERTAIN', confirmed: false, manualResolution: false }), 'unconfirmed')
  assert.equal(model.chargeReading({ status: 'OPEN', confirmed: false, manualResolution: false }), 'unconfirmed')
  assert.equal(model.chargeReading({ status: 'UNAPPLIED', confirmed: false, manualResolution: true }), 'manual')
  assert.equal(model.chargeReading({ status: 'APPLIED', confirmed: true, manualResolution: false }), 'confirmed')
  assert.equal(model.chargeReading({ status: 'FAILED', confirmed: false, manualResolution: false }), 'failed')
  assert.equal(model.chargeReading({ status: 'CANCELED', confirmed: false, manualResolution: false }), 'canceled')
})

test('a conflict uses the later read and ignores the english explanation', () => {
  const uncertain = model.interpretConflict({
    intent: 'checkout',
    charge: { status: 'UNCERTAIN', confirmed: false, manualResolution: false },
    resumeAction: null,
    recurrencePaused: null,
    message: 'Checkout could not be confirmed and was not opened again',
  })
  assert.equal(uncertain.outcome, 'unconfirmed')
  assert.equal(uncertain.allowAnotherPost, false)

  const resumed = model.interpretConflict({
    intent: 'resume',
    charge: null,
    resumeAction: null,
    recurrencePaused: false,
    message: 'The renewal is already active',
  })
  assert.equal(resumed.outcome, 'already-resumed')
  assert.equal(resumed.allowAnotherPost, false)

  const opaque = model.interpretConflict({
    intent: 'adjustment', charge: null, resumeAction: 'RESUME_RENEWAL', recurrencePaused: true,
  })
  assert.equal(opaque.outcome, 'still-open')
  assert.equal(opaque.allowAnotherPost, false)
})

test('checkout accepts only a paid plan code and keeps the catalog inside the panel', () => {
  assert.equal(model.checkoutPlanCode('PRO'), 'PRO')
  assert.equal(model.checkoutPlanCode('ELITE'), 'ELITE')
  assert.equal(model.checkoutPlanCode('FREE'), null)
  assert.equal(model.checkoutPlanCode('NOT_A_PLAN'), null)
  const offers = model.parseOffers([
    { ...offer('FREE'), free: true },
    { ...offer('PRO'), free: false, price: { status: 'AVAILABLE', amount: '100.00', currency: 'ARS', period: 'MONTHLY' } },
    { ...offer('ELITE'), free: false },
  ])
  assert.deepEqual(model.eligibleCheckoutPlans(offers).map((item) => item.code), ['PRO', 'ELITE'])
})

test('provider links stay on the payment host and never carry a token', () => {
  assert.equal(model.providerUrl('https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1'), 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1')
  assert.equal(model.providerUrl('https://billing.test/checkout/pc123'), 'https://billing.test/checkout/pc123')
  assert.equal(model.providerUrl('http://www.mercadopago.com/checkout'), null)
  assert.equal(model.providerUrl('https://evil.test/checkout'), null)
  assert.equal(model.providerUrl('https://billing.test/checkout?token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signaturevalue'), null)
  assert.equal(model.opaqueReference('pc123'), 'pc123')
  assert.equal(model.opaqueReference('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signaturevalue'), null)
})

test('an adjustment opens only after the linked snapshot matches what was accepted', () => {
  const quote = { available: true, amount: '5000.00', currency: 'ARS', periodEnd: '2026-12-01', payUntil: '2026-11-20T18:00:00Z' }
  assert.equal(model.presentableQuote(quote, Date.parse('2026-11-17T12:00:00Z')), 'show')
  assert.equal(model.presentableQuote(quote, Date.parse('2026-11-21T00:00:00Z')), 'expired')
  assert.equal(model.presentableQuote({ ...quote, available: false }, Date.parse('2026-11-17T12:00:00Z')), 'unavailable')
  const shown = model.quoteSnapshot(quote)
  const changed = {
    reference: 'quote-1', amount: '5000.00', currency: 'ARS', periodStart: '2026-11-01', periodEnd: '2026-12-01',
    payUntil: '2026-11-20T18:00:00Z', eliteMonthlyAmount: '20000.00', eliteMonthlyCurrency: 'ARS', status: 'CHECKOUT',
  }
  assert.equal(model.adjustmentOpenDecision(shown, changed, 'https://billing.test/checkout/pc1'), 'review')
  const accepted = model.termsSnapshot(changed)
  assert.equal(model.adjustmentOpenDecision(accepted, changed, 'https://billing.test/checkout/pc1'), 'open')
  assert.equal(model.adjustmentOpenDecision(accepted, changed, 'https://evil.test/pay'), 'withhold')
  assert.equal(model.adjustmentOpenDecision(accepted, null, 'https://billing.test/checkout/pc1'), 'withhold')
  assert.equal(model.sameSnapshot(shown, { ...shown, amount: '5000.0' }), true)
})

test('resume confirms the same recurrence and separates an authorization link from success', () => {
  const preview = { amount: '100.00', currency: 'ARS', nextDebitDay: '2026-12-01', chargesCurrentPeriod: false, sameRecurrence: true, resumed: false, payerAuthorizationUrl: null }
  assert.equal(model.resumePreviewCanConfirm(preview), true)
  assert.equal(model.resumePreviewCanConfirm({ ...preview, chargesCurrentPeriod: true }), false)
  assert.equal(model.resumeResult({ ...preview, resumed: true }), 'resumed')
  assert.equal(model.resumeResult({ ...preview, payerAuthorizationUrl: 'https://www.mercadopago.com/authorize' }), 'authorization')
  assert.equal(model.resumeResult(preview), 'unconfirmed')
  assert.equal(model.resumeResult({ ...preview, payerAuthorizationUrl: 'http://billing.test/authorize' }), 'blocked-url')
})

test('purchase actions stay behind management permission and do not replace a pending plan', () => {
  const base = { loading: false, failed: false, canManage: true, requestedPlanCode: null, resumeAction: null, authorizationUrl: null, requestAdjustmentQuote: false, fullCheckout: true, hasReference: false }
  assert.equal(model.planActions(base).primary, 'upgrade')
  assert.equal(model.planActions({ ...base, canManage: false }).primary, null)
  assert.equal(model.planActions({ ...base, failed: true }).primary, 'retry')
  assert.equal(model.planActions({ ...base, loading: true }).primary, null)
  assert.equal(model.planActions({ ...base, requestedPlanCode: 'PRO', fullCheckout: true }).primary, 'complete-payment')
  assert.deepEqual(model.planActions({ ...base, requestedPlanCode: 'PRO', hasReference: true }).secondary, ['check-payment'])
  assert.equal(model.planActions({ ...base, requestAdjustmentQuote: true, fullCheckout: false }).primary, 'adjust')
  assert.equal(model.planActions({ ...base, fullCheckout: false, resumeAction: 'RESUME_RENEWAL' }).primary, 'resume')
  assert.equal(model.planActions({ ...base, fullCheckout: false, resumeAction: 'AUTHORIZE_RENEWAL', authorizationUrl: 'https://www.mercadopago.com/authorize' }).primary, 'authorize')
  assert.equal(model.planActions({ ...base, fullCheckout: false, hasReference: true }).primary, 'check-payment')
})

test('a valid event selection survives refresh and a foreign one is dropped', () => {
  assert.equal(model.nextEventSelection('event-1', [{ id: 'event-1' }, { id: 'event-2' }]), 'event-1')
  assert.equal(model.nextEventSelection('event-9', [{ id: 'event-1' }]), null)
  assert.equal(model.nextEventSelection(null, []), null)
})

test('late reads and repeated posts stay inside one club, event and session', async () => {
  const current = { clubId: 'club-a', eventId: 'event-1', sessionKey: 's1', request: 2 }
  assert.equal(model.acceptRead(current, current), true)
  assert.equal(model.acceptRead({ ...current, eventId: 'event-2' }, current), false)
  assert.equal(model.acceptRead({ ...current, clubId: 'club-b' }, current), false)
  assert.equal(model.acceptRead({ ...current, sessionKey: 's2' }, current), false)
  assert.equal(model.acceptRead({ ...current, request: 1 }, current), false)

  let calls = 0
  const run = model.createSingleFlight()
  const task = () => new Promise((resolve) => {
    calls += 1
    setTimeout(() => resolve('once'), 20)
  })
  const [first, second] = await Promise.all([run('checkout', task), run('checkout', task)])
  assert.equal(calls, 1)
  assert.equal(first, 'once')
  assert.equal(second, 'once')
  await run('checkout', task)
  assert.equal(calls, 2)
})

test('returning to the panel can recheck a stored reference without polling or posting', () => {
  const store = memory()
  model.rememberCharge(store, 'club-a', 'pc123')
  assert.equal(model.recallCharge(store, 'club-a'), 'pc123')
  assert.equal(model.recallCharge(store, 'club-b'), null)
  model.rememberCharge(store, 'club-a', 'aaa.bbb.ccc')
  assert.equal(model.recallCharge(store, 'club-a'), 'pc123')
  assert.equal(model.focusRecheckAllowed({ hasReference: true, postInFlight: false, lastRecheckAt: 0, now: 2000 }), true)
  assert.equal(model.focusRecheckAllowed({ hasReference: true, postInFlight: false, lastRecheckAt: 1000, now: 2000 }), false)
  assert.equal(model.focusRecheckAllowed({ hasReference: true, postInFlight: true, lastRecheckAt: 0, now: 5000 }), false)
  assert.equal(model.focusRecheckAllowed({ hasReference: false, postInFlight: false, lastRecheckAt: 0, now: 5000 }), false)
})

test('included capabilities come from the effective plan and stats stay post-mvp', () => {
  assert.deepEqual(model.includedFeatures(offer('PRO')), ['Marca personalizada', 'Estadísticas avanzadas · Post-MVP', 'Soporte estándar'])
  assert.deepEqual(model.includedFeatures(offer('ELITE')), ['Marca personalizada', 'Estadísticas avanzadas · Post-MVP', 'Soporte prioritario'])
  assert.deepEqual(model.includedFeatures(offer('FREE')), ['Soporte estándar'])
})

function meter(key, used, limit) {
  return { key, state: 'LIMITED', limit, used, warning: false, reached: false, exceeded: false }
}

function offer(code) {
  const features = [
    { key: 'MAX_ACTIVE_TOURNAMENTS', kind: 'LIMIT', state: 'LIMITED', limit: 1 },
    { key: 'CUSTOM_BRANDING', kind: 'BOOLEAN', state: code === 'FREE' ? 'DISABLED' : 'ENABLED' },
    { key: 'ADVANCED_STATS', kind: 'BOOLEAN', state: code === 'FREE' ? 'DISABLED' : 'ENABLED' },
    { key: 'PRIORITY_SUPPORT', kind: 'BOOLEAN', state: code === 'ELITE' ? 'ENABLED' : 'DISABLED' },
  ]
  return { code, name: code, description: null, free: code === 'FREE', features, price: { status: code === 'FREE' ? 'FREE' : 'AVAILABLE', amount: null, currency: null, period: null } }
}

function subscription(extra) {
  return {
    clubId: 'c', planCode: 'FREE', status: 'ACTIVE', agreedRenewalAmount: null, agreedRenewalCurrency: null, periodEnd: null,
    recurrencePaused: null, recurrenceResumeAction: null, recurrenceAuthorizationUrl: null,
    commercialPeriod: { kind: 'ABSENT', medium: null, planCode: null, periodStart: null, periodEnd: null, open: false },
    actions: { fullCheckout: true, requestAdjustmentQuote: false },
    ...extra,
  }
}

function memory() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}
