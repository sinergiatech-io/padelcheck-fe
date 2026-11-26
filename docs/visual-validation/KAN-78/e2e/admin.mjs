import assert from 'node:assert/strict'
import { open, login, steps1to3, shot, label, db, BASE } from './lib.mjs'
const NAME = 'Torneo Primavera ' + (Date.now() % 100000)
const { browser, page } = await open()
await login(page, 'admin@kan78.test')
await steps1to3(page, NAME)
// Step 4: Simple, 3 categories over FREE remaining quota (2) -> batch rejected
await label(page, '6ta').click(); await label(page, '7ma').click()
await shot(page, '01-step4-simple-multi')
await label(page, '8va').click()
await page.getByText('Límite de divisiones').waitFor()
assert.equal(await page.locator('input[name="division-category"]:checked').count(), 2, '3rd category must not be selected')
await page.getByText('FREE permite 2 divisiones por torneo. Podés agregar 2 categorías más.').waitFor()
assert.equal(await page.getByRole('link', { name: 'Ver plan' }).count(), 1)
await shot(page, '02-step4-batch-over-limit-admin', true)
// OPEN, Suma, Combinado visual states
await label(page, 'OPEN').click(); await page.getByText('Caballeros OPEN').waitFor(); await shot(page, '03-step4-open')
await label(page, 'Suma').click(); await page.getByLabel('Suma de categorías').fill('17'); await page.getByText('Ingresá un entero entre 2 y 16.').waitFor()
assert.ok(await page.getByRole('button', { name: 'Continuar' }).isDisabled()); await shot(page, '04-step4-suma-invalid', true)
await label(page, 'Combinado').click(); await page.getByLabel(/Categoría A/).selectOption({ label: '6ta' })
await page.getByText('Completá la combinación').waitFor(); await shot(page, '05-step4-combinado-incomplete', true)
await label(page, 'Simple').click(); await label(page, 'OPEN').click(); await label(page, '6ta').click(); await label(page, '7ma').click()
await page.getByRole('button', { name: 'Continuar' }).click()
// Step 5
await page.getByText('Paso 5 de 6 · Cupo y suplentes').waitFor(); await shot(page, '06-step5-choose', true)
const quota = page.getByLabel('Máximo de parejas'); const cont = page.getByRole('button', { name: 'Continuar' })
for (const bad of ['0', '-1', '2.5']) { await quota.fill(bad); await page.getByText('Ingresá un entero mayor o igual a 1.').waitFor(); assert.ok(await cont.isDisabled()) }
await shot(page, '07-step5-invalid', true)
await quota.fill('16'); assert.ok(await cont.isDisabled(), 'no default for substitutes')
await page.getByLabel('No, cerrar al completar cupo').check(); await shot(page, '08-step5-without', true)
// back/forward keeps data
await page.getByRole('button', { name: /Volver|Atrás/ }).first().click()
await page.getByText('Paso 4 de 6').waitFor(); assert.equal(await page.locator('input[name="division-category"]:checked').count(), 2)
await cont.click(); assert.equal(await quota.inputValue(), '16'); assert.ok(await page.getByLabel('No, cerrar al completar cupo').isChecked())
await cont.click()
// Step 6
await page.getByText('Paso 6 de 6 · Revisión').waitFor()
assert.equal(await page.getByText('Caballeros · 6ta').count(), 1); assert.equal(await page.getByText('Caballeros · 7ma').count(), 1)
await page.getByText('Límite de divisiones').waitFor(); assert.ok(await page.getByRole('button', { name: 'Agregar división' }).isDisabled())
await shot(page, '09-step6-multi-at-limit-admin', true)
// Back to step 5 and forward: no duplicates
await page.getByRole('button', { name: /Volver|Atrás/ }).first().click(); await page.getByText('Paso 5 de 6').waitFor(); await cont.click()
assert.equal(await page.getByText('Caballeros · 6ta').count(), 1, 'no duplicate after back/forward')
// Lost response: server commits, browser gets a network error
let intercepted = 0; let creating = false
await page.route('**/api/clubs/*/events/drafts', async route => {
  intercepted++
  const response = await route.fetch(); console.log('server status (lost)', response.status()); await route.abort('failed')
})
await page.getByRole('button', { name: 'Crear evento' }).click()
await page.getByText('No pudimos crear el evento').waitFor()
assert.equal(await page.getByText('Caballeros · 6ta').count(), 1, 'data kept on error')
await shot(page, '10-step6-error', true)
await page.unroute('**/api/clubs/*/events/drafts')
const afterLost = await db('select count(*)::int n from events where name=$1', [NAME]); console.log('events after lost response', afterLost[0].n)
// Retry with a visible loading state
let replayStatus
await page.route('**/api/clubs/*/events/drafts', async route => {
  const response = await route.fetch(); replayStatus = response.status(); await new Promise(r => setTimeout(r, 1500)); await route.fulfill({ response })
})
await page.getByRole('button', { name: 'Crear evento' }).click()
const busyButton = page.locator('button[aria-busy="true"]')
await busyButton.waitFor(); assert.equal(await busyButton.getAttribute('aria-label'), 'Creando evento')
await busyButton.click({ force: true }).catch(() => {}) // double submit attempt
await shot(page, '11-step6-creating', true)
await page.getByText('¡Creaste un evento!').waitFor(); console.log('replay status', replayStatus)
await shot(page, '12-success')
const count = await db('select count(*)::int n from events where name=$1', [NAME]); assert.equal(count[0].n, 1, 'exactly one event after retry')
const divisions = await db("select count(*)::int n from divisions d join events t on t.id=d.event_id where t.name=$1", [NAME]); assert.equal(divisions[0].n, 2)
await page.getByRole('button', { name: 'Ver evento' }).click()
await page.waitForURL(/\/club\/events\/[0-9a-f-]{36}$/)
await page.getByText('Caballeros · 7ma').waitFor()
await page.getByText('Límite de categorías').waitFor(); assert.equal(await page.getByRole('link', { name: 'Ver plan' }).count(), 1)
assert.ok(await page.getByRole('button', { name: 'Agregar categoría' }).isDisabled())
await shot(page, '13-hub-multi-at-limit-admin', true)
await page.goBack(); await page.waitForTimeout(500); console.log('after back from hub', new URL(page.url()).pathname)
assert.ok(!page.url().endsWith('/club/events/new'), 'success replaced history')
await page.goForward().catch(() => {})
await page.goto(page.url())
await page.getByRole('link', { name: 'Ver plan' }).click(); await page.waitForURL(/\/club\/plan$/)
console.log('ADMIN OK intercepted', intercepted, 'replay', replayStatus)
await browser.close()
