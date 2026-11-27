import assert from 'node:assert/strict'
import { open, login, steps1to3, shot, label, db, BASE } from './lib.mjs'
const [admin] = await db("select id from events where name like 'Torneo Primavera%' and status='DRAFT' order by created_at desc limit 1")
const hub = BASE + '/club/events/' + admin.id
const { browser, context, page } = await open()
await login(page, 'admin@kan78.test')
// Stale limit (client thinks unlimited) -> server 403 PLAN_DIVISION_LIMIT_EXCEEDED keeps data and shows the reason
await page.route('**/division-limit*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ key: 'MAX_DIVISIONS_PER_EVENT', planCode: 'FREE', eventId: admin.id, state: 'UNLIMITED', limit: null, used: 2, remaining: null, reached: false }) }))
await page.goto(hub + '/divisions/new')
await label(page, '5ta').click(); await page.getByRole('button', { name: 'Continuar' }).click()
await page.getByLabel('Máximo de parejas').fill('10'); await page.getByLabel('Sí, admitir lista de espera').check()
await page.getByRole('button', { name: 'Guardar división' }).click()
await page.getByText('Límite de categorías').waitFor(); assert.equal(await page.getByLabel('Máximo de parejas').inputValue(), '10')
assert.equal(await page.getByRole('link', { name: 'Ver plan' }).count(), 1)
await shot(page, '40-hub-server-403-plan-limit-admin', true)
// Other 403 is a generic error, never the plan banner
await page.unroute('**/division-limit*')
await page.route('**/divisions/batch', route => route.request().method() === 'POST'
  ? route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: 403, code: 'AUTH_FORBIDDEN_OTHER', message: 'x' }) }) : route.fallback())
await page.getByRole('button', { name: 'Guardar división' }).click()
await page.getByText('No pudimos guardar').waitFor()
assert.equal(await page.getByText('Límite de categorías').count(), 0, 'other 403 is not the plan banner')
await shot(page, '41-hub-other-403', true)
await page.unroute('**/divisions/batch')
const [{ n }] = await db("select count(*)::int n from divisions where event_id=$1 and status<>'CANCELLED'", [admin.id]); assert.equal(n, 2, 'server kept 2 active divisions')
// Reduced motion: spinner does not animate
await page.emulateMedia({ reducedMotion: 'reduce' })
await page.route('**/divisions/batch', async route => { if (route.request().method() !== 'POST') return route.fallback(); await new Promise(r => setTimeout(r, 1500)); await route.fulfill({ status: 500, body: '{}' }) })
await page.getByRole('button', { name: 'Guardar división' }).click()
const busy = page.locator('button[aria-busy="true"]'); await busy.waitFor()
const anim = await busy.evaluate(button => [...button.querySelectorAll('*')].map(el => getComputedStyle(el).animationName).filter(a => a !== 'none'))
console.log('animations under reduced motion', JSON.stringify(anim)); assert.equal(anim.length, 0)
const box = await busy.boundingBox(); console.log('busy button box', JSON.stringify(box))
await page.getByText('No pudimos guardar').waitFor()
const after = await page.getByRole('button', { name: 'Guardar división' }).boundingBox(); assert.equal(Math.round(after.height), Math.round(box.height), 'no layout change'); 
await page.unroute('**/divisions/batch')
await page.emulateMedia({ reducedMotion: 'no-preference' })
// Regression screenshots
for (const width of [767, 768, 1024]) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(hub); await page.getByText('Caballeros · 7ma').waitFor(); await shot(page, `50-hub-${width}`, true)
  await page.goto(hub + '/divisions/' + (await db("select id from divisions where event_id=$1 order by created_at limit 1", [admin.id]))[0].id + '/edit')
  await page.getByText('Editar división').first().waitFor(); await shot(page, `51-edit-${width}`, true)
}
await page.setViewportSize({ width: 768, height: 900 })
await steps1to3(page, 'Regresión 768'); await label(page, '6ta').click(); await shot(page, '52-step4-768', true)
await page.setViewportSize({ width: 1024, height: 900 }); await shot(page, '52-step4-1024', true)
await page.setViewportSize({ width: 767, height: 900 }); await shot(page, '52-step4-767', true)
console.log('LIMITS OK')
await browser.close()
