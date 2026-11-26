import assert from 'node:assert/strict'
import { open, login, shot, db, BASE } from './lib.mjs'
const [ev] = await db("select id from events where name like 'Copa Staff%' order by created_at desc limit 1")
const hub = BASE + '/club/events/' + ev.id
const { browser, page } = await open()
await login(page, 'staff@kan78.test')
await page.goto(hub); await page.getByText('Damas · Suma 14').waitFor()
await page.getByRole('button', { name: /Cancelar categoría Damas/ }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Cancelar categoría' }).click()
await page.getByText('Canceladas').waitFor(); await page.waitForTimeout(500)
assert.ok(await page.getByRole('button', { name: 'Agregar categoría' }).isEnabled())
await shot(page, '42-hub-empty-with-history', true)
let fail = true
await page.route('**/api/categories*', async route => { await new Promise(r => setTimeout(r, 1200)); return fail ? route.fulfill({ status: 500, body: '{}' }) : route.fallback() })
await page.goto(hub + '/divisions/new')
await shot(page, '43-catalog-loading', true)
await page.getByRole('button', { name: 'Reintentar' }).waitFor({ timeout: 20000 }); await shot(page, '44-catalog-error', true)
fail = false; await page.getByRole('button', { name: 'Reintentar' }).click(); await page.getByText('8va').waitFor()
console.log('EXTRA OK')
await browser.close()
