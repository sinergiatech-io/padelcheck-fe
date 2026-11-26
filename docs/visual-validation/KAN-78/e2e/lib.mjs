import { chromium } from 'playwright'
import pg from 'pg'
export const BASE = 'http://127.0.0.1:5178'
export const SHOTS = '/workspace/kan78/e2e/shots'
export async function db(sql, params = []) {
  const client = new pg.Client({ host: '127.0.0.1', port: 55488, user: 'postgres', database: 'kan78_e2e' })
  await client.connect(); try { return (await client.query(sql, params)).rows } finally { await client.end() }
}
export async function open(width = 402, height = 874) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' })
  const page = await context.newPage()
  page.on('pageerror', error => console.log('PAGEERROR', error.message))
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE', msg.text()) })
  return { browser, context, page }
}
export async function login(page, email) {
  await page.goto(BASE + '/login')
  await page.getByPlaceholder('nombre@correo.com').fill(email)
  await page.getByPlaceholder('Ingresá tu contraseña').fill('Kan78-local-only')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 })
}
export async function shot(page, name, full = false) {
  if (!full) return page.screenshot({ path: `${SHOTS}/${name}.png` })
  const size = page.viewportSize()
  const extra = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('*')].map(el => el.scrollHeight - el.clientHeight).filter(n => n > 0)))
  await page.setViewportSize({ width: size.width, height: size.height + extra })
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${SHOTS}/${name}.png` })
  await page.setViewportSize(size)
}
export async function steps1to3(page, name) {
  await page.goto(BASE + '/club/events/new')
  await page.getByLabel('Nombre del evento').fill(name)
  await page.getByLabel('Fecha de inicio').fill('2026-12-10')
  await page.getByLabel('Fecha de finalización').fill('2026-12-12')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.locator('input[name="play-calendar"]').first().check()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: 'Agregar sede' }).click()
  await page.getByRole('checkbox', { name: 'Legon' }).check()
  await page.getByRole('checkbox', { name: 'Cancha 1' }).check()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByText('Paso 4 de 6 · Divisiones').waitFor()
}
export const label = (page, text) => page.locator('label', { hasText: new RegExp('^' + text + '$') })
