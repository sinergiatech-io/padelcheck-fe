const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const billing = require(process.env.BILLING_SESSION_MODULE)
const generation = require(process.env.SESSION_GENERATION_MODULE)
const model = require(process.env.PLAN_MODEL_MODULE)

test('hiding the tab and revalidating /me keeps the same charge reference', () => {
  const store = memory()
  let serial = 0
  const opened = billing.ensureBillingAuth(store, 'admin', () => `session-${++serial}-aaaa`)
  const scope = { userId: 'admin', session: opened.id, clubId: 'club-a' }
  model.rememberCharge(store, scope, 'pc-open')
  generation.bumpSessionGeneration()
  generation.bumpSessionGeneration()
  const returned = billing.ensureBillingAuth(store, 'admin', () => `session-${++serial}-bbbb`)
  assert.equal(returned.id, opened.id)
  assert.equal(model.recallCharge(store, { userId: 'admin', session: returned.id, clubId: 'club-a' }), 'pc-open')
})

test('logout and a new login of the same user cannot reuse the previous reference', () => {
  const store = memory()
  let serial = 0
  const first = billing.ensureBillingAuth(store, 'admin', () => `session-${++serial}-aaaa`)
  model.rememberCharge(store, { userId: 'admin', session: first.id, clubId: 'club-a' }, 'pc-old')
  billing.endBillingAuth(store)
  const second = billing.ensureBillingAuth(store, 'admin', () => `session-${++serial}-bbbb`)
  assert.notEqual(second.id, first.id)
  assert.equal(model.recallCharge(store, { userId: 'admin', session: first.id, clubId: 'club-a' }), null)
  assert.equal(model.recallCharge(store, { userId: 'admin', session: second.id, clubId: 'club-a' }), null)
})

test('a different user or club does not receive the previous attempt', () => {
  const store = memory()
  let serial = 0
  const admin = billing.ensureBillingAuth(store, 'admin-a', () => `session-${++serial}-aaaa`)
  model.rememberCharge(store, { userId: 'admin-a', session: admin.id, clubId: 'club-a' }, 'pc-a')
  const other = billing.ensureBillingAuth(store, 'admin-b', () => `session-${++serial}-bbbb`)
  assert.equal(model.recallCharge(store, { userId: 'admin-b', session: other.id, clubId: 'club-a' }), null)
  assert.equal(model.recallCharge(store, { userId: 'admin-a', session: admin.id, clubId: 'club-b' }), null)
})

test('auth clears the billing attempt outside the plan panel and does not key it by revalidation', () => {
  const root = path.join(__dirname, '..')
  const auth = readFileSync(path.join(root, 'src/context/AuthContext.tsx'), 'utf8')
  const page = readFileSync(path.join(root, 'src/features/club/plan/ClubPlanPage.tsx'), 'utf8')
  assert.match(auth, /endBillingAuth\(billingBrowserStore\(\)\)/)
  assert.equal(auth.includes('endBillingAuth') && auth.includes('function clearPrivateSession'), true)
  assert.equal(page.includes('currentSessionGeneration'), false)
})

function memory() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    keys: () => [...values.keys()],
  }
}
