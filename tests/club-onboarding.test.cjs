const { test } = require('node:test'), assert = require('node:assert/strict')
const lib = require(process.env.CLUB_ONBOARDING_BUNDLE)
const { ClubOnboardingFlow, createOnboardingApi, loadSession, SESSION_KEY, planCards, validateAccount, validateVenue, venueHasErrors, screenFromResume, paymentScreen, parseResume } = lib

const SID = '6e27e277-900b-4c4f-835b-25d8bef5eb11'
const PASSWORD = 'Sup3r-secret-pass'
const rosario = { provinceId: '82', provinceName: 'Santa Fe', localityId: '82084270', localityName: 'Rosario', countryCode: 'AR' }
const http = status => Object.assign(new Error(`HTTP ${status}`), { status, kind: 'http' })
const offline = () => Object.assign(new Error('offline'), { status: 0, kind: 'network' })
function memoryStore(initial = {}) {
  const data = { ...initial }
  return { data, getItem: key => key in data ? data[key] : null, setItem: (key, value) => { data[key] = String(value) }, removeItem: key => { delete data[key] } }
}
const resumeBody = (patch = {}) => ({
  sessionId: SID, step: 'EMAIL_VERIFICATION', email: 'lucia@clubnorte.com', firstName: 'Lucía', lastName: 'Gómez', phone: null, emailVerified: false,
  club: null, selectedPlanCode: null, clubId: null, subscriptionPlanCode: null, subscriptionStatus: null, initialSetupStatus: null, paymentStatus: null, ...patch,
})
const savedClub = { name: 'Club Norte', location: { countryCode: 'AR', provinceId: '82', localityId: '82084270' }, city: 'Rosario', countryDivision: 'Santa Fe', country: 'Argentina' }

/** In-memory backend that mirrors the documented contract. `fail` lets a test make one endpoint fail once or always. */
function fakeServer() {
  const server = {
    calls: [], resume: resumeBody(), fail: {}, bearerResume: null, delay: null,
    async call(method, path, body) {
      const key = path.split('?')[0]
      server.calls.push({ method, key, body })
      if (server.delay) await server.delay
      const failure = server.fail[key]
      if (failure) { if (!failure.always) delete server.fail[key]; throw failure.error }
      switch (key) {
        case '/onboarding/clubs/start': server.resume = resumeBody({ email: body.email }); return { sessionId: SID }
        case '/onboarding/clubs/resend-email': return {}
        case '/onboarding/clubs/verify-email': server.resume = resumeBody({ emailVerified: true, step: 'CLUB' }); return {}
        case '/onboarding/clubs/tenant': server.resume = { ...server.resume, step: 'PLAN', club: savedClub, clubId: 'club-1' }; return {}
        case '/onboarding/clubs/plan': server.resume = { ...server.resume, selectedPlanCode: body.planCode, step: body.planCode === 'FREE' ? 'VENUE' : 'PLAN' }; return {}
        case '/onboarding/clubs/checkout': return { url: 'https://billing.test/pay/abc', reference: 'ref-1', planCode: server.resume.selectedPlanCode }
        case '/onboarding/clubs/complete': server.resume = { ...server.resume, step: 'DONE', subscriptionPlanCode: server.resume.subscriptionPlanCode ?? 'FREE', subscriptionStatus: 'ACTIVE' }; return {}
        case '/onboarding/clubs/resume': return path.includes('sessionId=') ? server.resume : (server.bearerResume ?? server.resume)
        case '/plans': return [{ code: 'PRO', features: [] }]
        default: throw http(404)
      }
    },
  }
  server.pub = { get: (path, options) => server.call('GET', path, undefined, options), post: (path, body) => server.call('POST', path, body) }
  server.authed = { get: (path, options) => server.call('GET', `${path}#bearer`.replace('#bearer', ''), undefined, options), post: (path, body) => server.call('POST', path, body) }
  return server
}
function setup({ store = memoryStore(), server = fakeServer() } = {}) {
  const opened = []
  const flow = new ClubOnboardingFlow({
    api: createOnboardingApi(server.pub, server.authed), store, platform: 'WEB',
    checkoutUrl: url => typeof url === 'string' && url.startsWith('https://billing.test/') ? url : null,
    openCheckout: url => opened.push(url), parseOffers: value => Array.isArray(value) ? value : null,
  })
  return { flow, server, store, opened, screen: () => flow.state.screen, calls: key => server.calls.filter(call => call.key === key) }
}
const account = { firstName: 'Lucía', lastName: 'Gómez', email: ' lucia@clubnorte.com ', password: PASSWORD, phone: '' }

test('FREE flow: account, email, club, plan, venue and done, without checkout and without storing the password', async () => {
  const t = setup()
  await t.flow.init({ bearer: false })
  assert.equal(t.screen(), 'account')
  await t.flow.start(account)
  assert.equal(t.screen(), 'verify-pending')
  assert.deepEqual(t.calls('/onboarding/clubs/start')[0].body, { firstName: 'Lucía', lastName: 'Gómez', email: 'lucia@clubnorte.com', password: PASSWORD, phone: undefined, platform: 'WEB' })
  // Only the opaque session id and the email are persisted.
  assert.deepEqual(JSON.parse(t.store.data[SESSION_KEY]), { sessionId: SID, email: 'lucia@clubnorte.com' })
  await t.flow.checkVerified()
  assert.equal(t.screen(), 'verify-pending')
  assert.equal(t.flow.state.notVerified, true, '«Todavía no recibimos la verificación» and no advance')
  await t.server.call('POST', '/onboarding/clubs/verify-email', {})
  await t.flow.checkVerified()
  assert.equal(t.screen(), 'verified')
  await t.flow.continueVerified()
  assert.equal(t.screen(), 'club')
  await t.flow.saveClub('Club Norte', rosario)
  assert.equal(t.screen(), 'plan')
  assert.deepEqual(t.calls('/onboarding/clubs/tenant')[0].body, { sessionId: SID, club: { name: 'Club Norte', location: { countryCode: 'AR', provinceId: '82', localityId: '82084270' } } })
  assert.equal(t.flow.state.club.localityName, 'Rosario')
  await t.flow.continuePlan()
  assert.equal(t.screen(), 'venue')
  assert.equal(t.calls('/onboarding/clubs/checkout').length, 0, 'FREE never opens a checkout')
  assert.deepEqual(t.opened, [])
  await t.flow.completeVenue({ name: ' Sede Norte ', location: { countryCode: 'AR', provinceId: '82', localityId: '82084270' } }, [' Cancha 1 ', 'Cancha 2'])
  assert.equal(t.screen(), 'done')
  assert.deepEqual(t.calls('/onboarding/clubs/complete')[0].body, {
    sessionId: SID, venues: [{ name: 'Sede Norte', location: { countryCode: 'AR', provinceId: '82', localityId: '82084270' } }],
    courts: [{ name: 'Cancha 1', venueIndex: 0 }, { name: 'Cancha 2', venueIndex: 0 }],
  })
  t.flow.finish()
  assert.equal(t.store.data[SESSION_KEY], undefined)
  const everything = JSON.stringify([t.store.data, t.flow.state])
  assert.equal(everything.includes(PASSWORD), false, 'the password is never kept in storage or flow state')
})

test('resume decides the screen for every step and never needs a password', async () => {
  const cases = [
    [resumeBody(), 'verify-pending'],
    [resumeBody({ emailVerified: true }), 'verified'],
    [resumeBody({ step: 'CLUB', emailVerified: true }), 'club'],
    [resumeBody({ step: 'PLAN', emailVerified: true, club: savedClub }), 'plan'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'PRO', paymentStatus: 'OPEN' }), 'payment-pending'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'PRO', paymentStatus: 'UNCERTAIN' }), 'payment-pending'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'PRO', paymentStatus: 'CANCELED' }), 'payment-canceled'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'PRO', paymentStatus: 'FAILED' }), 'payment-unconfirmed'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'PRO', paymentStatus: 'UNAPPLIED' }), 'payment-unconfirmed'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'PRO', paymentStatus: 'APPLIED', subscriptionPlanCode: 'PRO', subscriptionStatus: 'ACTIVE' }), 'payment-active'],
    [resumeBody({ step: 'PLAN', selectedPlanCode: 'ELITE', subscriptionPlanCode: 'ELITE', subscriptionStatus: 'ACTIVE' }), 'payment-active'],
    [resumeBody({ step: 'VENUE', club: savedClub, selectedPlanCode: 'FREE', subscriptionPlanCode: 'FREE', subscriptionStatus: 'ACTIVE' }), 'venue'],
    [resumeBody({ step: 'DONE' }), 'done'],
  ]
  for (const [body, expected] of cases) {
    const server = fakeServer(); server.resume = body
    const t = setup({ server, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'x@y.com' }) }) })
    await t.flow.init({ bearer: false })
    assert.equal(t.screen(), expected, `${body.step}/${body.paymentStatus}`)
    assert.equal(JSON.stringify(t.flow.state).includes('password'), false)
  }
  // FREE selected with an ACTIVE FREE subscription is not a paid-plan activation.
  assert.equal(paymentScreen(parseResume(resumeBody({ step: 'PLAN', selectedPlanCode: 'FREE', subscriptionPlanCode: 'FREE', subscriptionStatus: 'ACTIVE' }))), null)
  assert.equal(screenFromResume(parseResume(resumeBody({ step: 'CLUB', club: savedClub, emailVerified: true }))), 'club')
})

test('saved club comes from the resume with names for the preloaded selectors', () => {
  const resume = parseResume(resumeBody({ step: 'VENUE', club: savedClub }))
  assert.deepEqual(resume.club, { name: 'Club Norte', provinceId: '82', provinceName: 'Santa Fe', localityId: '82084270', localityName: 'Rosario' })
})

test('bearer resume: 401 is an expired session, 404 falls back to the stored id and 404 on the stored id starts over', async () => {
  const expired = fakeServer(); expired.fail['/onboarding/clubs/resume'] = { error: http(401) }
  const a = setup({ server: expired })
  await a.flow.init({ bearer: true })
  assert.equal(a.screen(), 'session-expired')

  const ok = fakeServer(); ok.bearerResume = resumeBody({ step: 'VENUE', club: savedClub })
  const b = setup({ server: ok })
  await b.flow.init({ bearer: true })
  assert.equal(b.screen(), 'venue')
  assert.equal(JSON.parse(b.store.data[SESSION_KEY]).sessionId, SID)

  const gone = fakeServer(); gone.fail['/onboarding/clubs/resume'] = { error: http(404), always: true }
  const c = setup({ server: gone, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await c.flow.init({ bearer: false })
  assert.equal(c.screen(), 'account')
  assert.equal(c.store.data[SESSION_KEY], undefined, 'a stale id is cleared')

  const down = fakeServer(); down.fail['/onboarding/clubs/resume'] = { error: offline() }
  const d = setup({ server: down, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await d.flow.init({ bearer: false })
  assert.equal(d.screen(), 'resume-error')
  assert.ok(loadSession(d.store), 'a network error keeps the saved session')
  await d.flow.load()
  assert.equal(d.screen(), 'verify-pending')
})

test('a corrupt or foreign stored value is ignored', async () => {
  for (const raw of ['not json', JSON.stringify({ sessionId: 'x' }), JSON.stringify({ password: PASSWORD })]) {
    const t = setup({ store: memoryStore({ [SESSION_KEY]: raw }) })
    await t.flow.init({ bearer: false })
    assert.equal(t.screen(), 'account')
  }
})

test('verification link verifies once even when mounted twice, then continues to the club', async () => {
  const t = setup()
  const proof = { sessionId: SID, email: 'lucia@clubnorte.com', token: 'qa-proof' }
  await Promise.all([t.flow.init({ proof, bearer: false }), t.flow.init({ proof, bearer: false })])
  assert.equal(t.calls('/onboarding/clubs/verify-email').length, 1)
  assert.equal(t.screen(), 'verified')
  await t.flow.continueVerified()
  assert.equal(t.screen(), 'club')
})

test('expired or invalid link offers a new one; resending returns to pending and does not verify', async () => {
  for (const status of [410, 400, 404]) {
    const server = fakeServer(); server.fail['/onboarding/clubs/verify-email'] = { error: http(status) }
    const t = setup({ server })
    await t.flow.init({ proof: { sessionId: SID, email: 'lucia@clubnorte.com', token: 'old' }, bearer: false })
    assert.equal(t.screen(), 'verify-invalid', `status ${status}`)
    await t.flow.resend()
    assert.equal(t.screen(), 'verify-pending')
    assert.equal(t.flow.state.resent, true)
    assert.equal(t.server.resume.emailVerified, false, 'resend never verifies')
    assert.deepEqual(t.calls('/onboarding/clubs/resend-email')[0].body, { sessionId: SID, email: 'lucia@clubnorte.com', platform: 'WEB' })
  }
})

test('link verification network error is retryable', async () => {
  const server = fakeServer(); server.fail['/onboarding/clubs/verify-email'] = { error: offline() }
  const t = setup({ server })
  await t.flow.init({ proof: { sessionId: SID, email: 'lucia@clubnorte.com', token: 'qa-proof' }, bearer: false })
  assert.equal(t.screen(), 'verify-error')
  await t.flow.verifyLink()
  assert.equal(t.screen(), 'verified')
})

test('resend failures keep the pending screen; 409 (already verified) re-reads the server; 404 starts over', async () => {
  const server = fakeServer()
  const t = setup({ server })
  await t.flow.init({ bearer: false }); await t.flow.start(account)
  server.fail['/onboarding/clubs/resend-email'] = { error: offline() }
  await t.flow.resend()
  assert.equal(t.screen(), 'verify-pending'); assert.equal(t.flow.state.notice, 'resend')
  server.resume = resumeBody({ emailVerified: true, step: 'CLUB' })
  server.fail['/onboarding/clubs/resend-email'] = { error: http(409) }
  await t.flow.resend()
  assert.equal(t.screen(), 'club')
  server.fail['/onboarding/clubs/resend-email'] = { error: http(404) }
  await t.flow.resend()
  assert.equal(t.screen(), 'account')
})

test('409 on email is a field error and nothing is saved; other failures keep the form and can be retried', async () => {
  const server = fakeServer(); server.fail['/onboarding/clubs/start'] = { error: http(409) }
  const t = setup({ server })
  await t.flow.init({ bearer: false })
  await t.flow.start(account)
  assert.equal(t.screen(), 'account')
  assert.match(t.flow.state.fieldErrors.email, /ya está registrado/)
  assert.equal(t.store.data[SESSION_KEY], undefined)
  server.fail['/onboarding/clubs/start'] = { error: http(500) }
  await t.flow.start(account)
  assert.equal(t.flow.state.notice, 'account'); assert.equal(t.screen(), 'account')
  await t.flow.start(account)
  assert.equal(t.screen(), 'verify-pending')
})

test('409 on the club is a name field error; 403 returns to the verification; retry after a failure succeeds', async () => {
  const server = fakeServer(); server.resume = resumeBody({ emailVerified: true, step: 'CLUB' })
  const t = setup({ server, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await t.flow.init({ bearer: false })
  server.fail['/onboarding/clubs/tenant'] = { error: http(409) }
  await t.flow.saveClub('Club Norte', rosario)
  assert.equal(t.screen(), 'club'); assert.match(t.flow.state.fieldErrors.clubName, /Ya existe un club/)
  server.fail['/onboarding/clubs/tenant'] = { error: http(500) }
  await t.flow.saveClub('Club Norte', rosario)
  assert.equal(t.flow.state.notice, 'club')
  server.fail['/onboarding/clubs/tenant'] = { error: http(403) }
  await t.flow.saveClub('Club Norte', rosario)
  assert.equal(t.screen(), 'verify-pending')
  await t.flow.checkVerified(); await t.flow.continueVerified()
  await t.flow.saveClub('Club Norte', rosario)
  assert.equal(t.screen(), 'plan')
})

test('double submit is blocked while an action is in flight', async () => {
  const server = fakeServer()
  const t = setup({ server })
  await t.flow.init({ bearer: false })
  let release; server.delay = new Promise(resolve => { release = resolve })
  const first = t.flow.start(account), second = t.flow.start(account)
  assert.equal(t.flow.state.busy, 'start')
  release(); await Promise.all([first, second])
  assert.equal(t.calls('/onboarding/clubs/start').length, 1)
  assert.equal(t.flow.state.busy, null)
})

test('PRO: records the plan, asks for the checkout and opens only a provider link; confirmation is never client-side', async () => {
  const server = fakeServer(); server.resume = resumeBody({ emailVerified: true, step: 'PLAN', club: savedClub })
  const t = setup({ server, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await t.flow.init({ bearer: false })
  t.flow.selectPlan('PRO'); await t.flow.continuePlan()
  assert.deepEqual(t.calls('/onboarding/clubs/plan')[0].body, { sessionId: SID, planCode: 'PRO' })
  assert.deepEqual(t.opened, ['https://billing.test/pay/abc'])
  assert.equal(t.screen(), 'payment-pending')
  assert.equal(t.calls('/onboarding/clubs/charge-outcome').length, 0)
  // still pending on the server
  server.resume = { ...server.resume, paymentStatus: 'OPEN' }
  await t.flow.checkPayment(); assert.equal(t.screen(), 'payment-pending')
  // the backend simulator confirms
  server.resume = { ...server.resume, paymentStatus: 'APPLIED', subscriptionPlanCode: 'PRO', subscriptionStatus: 'ACTIVE' }
  await t.flow.checkPayment(); assert.equal(t.screen(), 'payment-active')
  t.flow.goVenue(); assert.equal(t.screen(), 'venue')
})

test('payment failures never block the venue: FREE continues, retry opens a new checkout', async () => {
  const server = fakeServer(); server.resume = resumeBody({ emailVerified: true, step: 'PLAN', club: savedClub, selectedPlanCode: 'PRO', paymentStatus: 'CANCELED' })
  const t = setup({ server, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await t.flow.init({ bearer: false })
  assert.equal(t.screen(), 'payment-canceled'); assert.equal(t.flow.state.selectedPlan, 'PRO')
  await t.flow.continuePlan()
  assert.equal(t.opened.length, 1, 'retry asks for a new checkout')
  t.flow.goVenue(); assert.equal(t.screen(), 'venue')
})

test('an untrusted checkout link is not opened', async () => {
  const server = fakeServer(); server.resume = resumeBody({ emailVerified: true, step: 'PLAN', club: savedClub })
  server.call = (orig => async (method, path, body) => path.startsWith('/onboarding/clubs/checkout') ? { url: 'http://evil.example/pay' } : orig(method, path, body))(server.call)
  const t = setup({ server, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await t.flow.init({ bearer: false })
  t.flow.selectPlan('ELITE'); await t.flow.continuePlan()
  assert.deepEqual(t.opened, []); assert.equal(t.flow.state.notice, 'checkout'); assert.equal(t.screen(), 'plan')
})

test('venue save failure keeps the data, retry is idempotent and reaches done', async () => {
  const server = fakeServer(); server.resume = resumeBody({ step: 'VENUE', club: savedClub, emailVerified: true })
  const t = setup({ server, store: memoryStore({ [SESSION_KEY]: JSON.stringify({ sessionId: SID, email: 'a@b.com' }) }) })
  await t.flow.init({ bearer: false })
  const venue = { name: 'Sede Norte', location: { countryCode: 'AR', provinceId: '82', localityId: '82084270' } }
  server.fail['/onboarding/clubs/complete'] = { error: http(500) }
  await t.flow.completeVenue(venue, ['Cancha 1'])
  assert.equal(t.screen(), 'venue'); assert.equal(t.flow.state.notice, 'venue')
  await t.flow.completeVenue(venue, ['Cancha 1'])
  assert.equal(t.screen(), 'done')
  const [first, second] = t.calls('/onboarding/clubs/complete')
  assert.deepEqual(first.body, second.body)
})

test('validation: account, club venue and courts', () => {
  assert.deepEqual(Object.keys(validateAccount({ firstName: ' ', lastName: '', email: 'x', password: '1234567', phone: '' })).sort(), ['email', 'firstName', 'lastName', 'password'])
  assert.deepEqual(validateAccount({ firstName: 'A', lastName: 'B', email: 'a@b.co', password: '12345678', phone: '' }), {})
  assert.equal(venueHasErrors(validateVenue({ name: 'Sede', courts: [{ key: 'a', name: 'C1' }] })), false)
  assert.equal(venueHasErrors(validateVenue({ name: ' ', courts: [{ key: 'a', name: 'C1' }] })), true)
  assert.equal(venueHasErrors(validateVenue({ name: 'Sede', courts: [{ key: 'a', name: ' ' }] })), true)
  assert.equal(validateVenue({ name: 'Sede', courts: [] }).noCourts, true)
})

test('plan cards use the catalog limits and fall back to the documented values', () => {
  const text = card => card.bullets.map(b => `${b.before ?? ''}${b.bold ?? ''}${b.after}`)
  const fallback = planCards(null)
  assert.deepEqual(fallback.map(card => card.code), ['FREE', 'PRO', 'ELITE'])
  assert.deepEqual(text(fallback[0]), ['Hasta 1 torneo activo', '24 parejas por torneo', '2 categorías', '1 usuario'])
  assert.deepEqual(text(fallback[1]), ['Hasta 4 torneos activos', '120 parejas por torneo', '5 categorías', '5 usuarios staff', 'Estadísticas avanzadas', 'Marca personalizada'])
  assert.deepEqual(text(fallback[2]), ['Sin límites operativos', 'Soporte prioritario', 'Estadísticas avanzadas', 'Marca personalizada'])
  const catalog = [{ code: 'PRO', features: [
    { key: 'MAX_ACTIVE_TOURNAMENTS', kind: 'LIMIT', state: 'LIMITED', limit: 9 }, { key: 'MAX_ENTRIES_PER_EVENT', kind: 'LIMIT', state: 'LIMITED', limit: 200 },
    { key: 'MAX_DIVISIONS_PER_EVENT', kind: 'LIMIT', state: 'LIMITED', limit: 1 }, { key: 'MAX_STAFF_USERS', kind: 'LIMIT', state: 'LIMITED', limit: 8 },
  ] }]
  assert.deepEqual(text(planCards(catalog)[1]), ['Hasta 9 torneos activos', '200 parejas por torneo', '1 categoría', '8 usuarios staff'])
  assert.deepEqual(text(planCards(catalog)[0]), text(fallback[0]), 'plans missing from the catalog keep the documented values')
})
