/* Optional browser QA: provide Playwright via NODE_PATH or a local --no-save install. */
/* global localStorage, document, window, MutationObserver, Storage, getComputedStyle */
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const base = process.env.STARTUP_BASE_URL || 'http://127.0.0.1:4174'
const output = path.resolve('docs/visual-validation/KAN-234')
fs.mkdirSync(output, { recursive:true })
const principal = {
  userId:'qa-user', email:'qa@example.invalid', firstName:'QA', lastName:'Player',
  platformRole:'USER', hasPlayerProfile:true, playerId:'qa-player', clubMemberships:[], activeClub:null,
  accessContexts:[{ activity:'PLAYER', playerId:'qa-player' }],
}
const results = []
let browser

async function context({ session = false, ...options } = {}) {
  const ctx = await browser.newContext({ viewport:{ width:402, height:789 }, reducedMotion:'reduce', ...options })
  if (process.env.STARTUP_FONT_DIR) {
    const fontDir = process.env.STARTUP_FONT_DIR
    const css = [400,500,600,700].map(weight => `@font-face { font-family:Inter; font-style:normal; font-weight:${weight}; font-display:swap; src:url(https://qa-fonts.invalid/Inter-${weight}.ttf) format('truetype'); }`).join('\n')
    await ctx.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType:'text/css', body:css }))
    await ctx.route('https://qa-fonts.invalid/**', route => route.fulfill({ contentType:'font/ttf', path:path.join(fontDir, new URL(route.request().url()).pathname.slice(1)) }))
  }
  if (session) await ctx.addInitScript(() => {
    localStorage.setItem('padelcheck_token', 'synthetic-qa-token')
    localStorage.setItem('padelcheck_user', '{}')
    localStorage.setItem('padelcheck_session_expires_at', String(Date.now() + 3600000))
  })
  return ctx
}
async function check(name, run) {
  const start = Date.now()
  await run()
  results.push({ name, passed:true, elapsedMs:Date.now() - start })
  console.log(`PASS ${name}`)
}
async function capture(page, name) {
  await page.screenshot({ path:path.join(output, `${name}.png`), fullPage:true })
}
async function removed(page) { await page.locator('#pc-startup').waitFor({ state:'detached' }) }
async function me(ctx, status, body = principal) {
  await ctx.route('**/auth/me', route => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(body) }))
}
async function blockedBundle(ctx) {
  await ctx.route('**/assets/*.js', route => route.abort())
}

;(async () => {
  browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {}) })
  try {
    await check('HTML visible before bundle; degraded logo/font; no minimum delay', async () => {
      const ctx = await context()
      let release
      const gate = new Promise(resolve => { release = resolve })
      await ctx.route('**/assets/*.js', async route => { await gate; await route.continue() })
      const page = await ctx.newPage()
      await page.goto(`${base}/login?returnUrl=%2Fapp%2Fevents#entry`, { waitUntil:'commit' })
      await page.locator('#pc-brand').waitFor({ state:'visible' })
      await capture(page, 'brand-402')
      assert.equal(await page.locator('.pc-logo img').evaluate(el => el.getBoundingClientRect().width), 141)
      const started = await page.evaluate(() => performance.now())
      release()
      await removed(page)
      await page.locator('input[type=email]').waitFor()
      assert.ok((await page.evaluate(() => performance.now())) - started < 3000)
      await capture(page, 'login-402')
      await ctx.close()

      const degraded = await context()
      await degraded.route('**/startup/logo.png', route => route.abort())
      await degraded.route('**/assets/*.png', route => route.abort())
      await degraded.route('https://fonts.**/*', route => route.abort())
      await blockedBundle(degraded)
      const p = await degraded.newPage()
      await p.goto(`${base}/login`)
      await p.locator('#pc-recovery').waitFor({ state:'visible' })
      await p.locator('#pc-recovery .pc-logo-text').waitFor({ state:'visible' })
      await capture(p, 'degraded-402')
      await degraded.close()
    })

    await check('bundle failure, keyboard focus, repeated failure, retry and explicit exit', async () => {
      const ctx = await context()
      await blockedBundle(ctx)
      const p = await ctx.newPage()
      const url = `${base}/login?returnUrl=%2Fapp%2Fevents#entry`
      await p.goto(url)
      await p.locator('#pc-recovery').waitFor({ state:'visible' })
      assert.equal(await p.evaluate(() => document.activeElement.id), 'pc-title')
      await capture(p, 'technical-402')
      await p.keyboard.press('Tab')
      assert.equal(await p.evaluate(() => document.activeElement.id), 'pc-retry')
      await capture(p, 'technical-keyboard-402')
      fs.writeFileSync(path.join(output, 'recovery-accessibility.txt'), await p.locator('#pc-recovery').ariaSnapshot())
      await p.locator('#pc-retry').click()
      await p.locator('#pc-message').filter({ hasText:'El problema continúa' }).waitFor()
      assert.equal(p.url(), url)
      await p.locator('#pc-exit').waitFor({ state:'visible' })
      await capture(p, 'repeated-402')
      await p.setViewportSize({ width:360, height:635 })
      await capture(p, 'repeated-360')
      await p.addStyleTag({ content:'.pc-surface { font-size:200%; } .pc-surface h1 { font-size:48px; line-height:64px; } .pc-banner strong { font-size:28px; line-height:40px; } .pc-banner p { font-size:24px; line-height:32px; } .pc-actions button { font-size:28px; line-height:42px; }' })
      await p.locator('#pc-exit').scrollIntoViewIfNeeded()
      await capture(p, 'repeated-text-200')
      assert.equal(await p.locator('#pc-recovery .pc-content').evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop > 0 }), true)
      await capture(p, 'repeated-text-200-scrolled')
      await p.locator('#pc-exit').click()
      await p.waitForURL(`${base}/login`)
      await ctx.unroute('**/assets/*.js')
      await p.reload()
      await removed(p)
      await p.locator('input[type=email]').waitFor()
      await ctx.close()
    })

    await check('retry returns to original deep link once bundle recovers', async () => {
      const ctx = await context()
      await blockedBundle(ctx)
      const p = await ctx.newPage()
      await p.goto(`${base}/pricing?from=entry#plans`)
      await p.locator('#pc-recovery').waitFor({ state:'visible' })
      await ctx.unroute('**/assets/*.js')
      await p.locator('#pc-retry').click()
      await removed(p)
      assert.equal(p.url(), `${base}/pricing?from=entry#plans`)
      await ctx.close()
    })

    await check('retry is accessible, busy and preserves button geometry during document reload', async () => {
      const ctx = await context()
      await blockedBundle(ctx)
      const p = await ctx.newPage()
      await p.goto(base + '/login')
      await p.locator('#pc-recovery').waitFor({ state:'visible' })
      const before = await p.locator('#pc-retry').boundingBox()
      // Cancel the browser's reload confirmation only for a comparable capture of the transient state.
      await p.evaluate(() => { window.onbeforeunload = () => true })
      let confirmed = false
      p.on('dialog', async dialog => { confirmed = true; await dialog.dismiss() })
      await p.locator('#pc-retry').click()
      await p.getByRole('button', { name:'Reintentando', exact:true }).waitFor()
      assert.equal(confirmed, true)
      assert.equal(await p.locator('#pc-retry').getAttribute('aria-busy'), 'true')
      assert.equal(await p.locator('#pc-retry').isDisabled(), true)
      assert.deepEqual(await p.locator('#pc-retry').boundingBox(), before)
      await capture(p, 'retrying-402')
      await p.evaluate(() => { window.onbeforeunload = null })
      await p.reload()
      await p.locator('#pc-message').filter({ hasText:'El problema continúa' }).waitFor()
      await ctx.close()
    })

    await check('brand sheen runs once inside the image alpha and reduced motion is static', async () => {
      const ctx = await context({ reducedMotion:'no-preference' })
      let release
      const gate = new Promise(resolve => { release = resolve })
      await ctx.route('**/assets/*.js', async route => { await gate; await route.continue() })
      const p = await ctx.newPage()
      await p.goto(`${base}/login`, { waitUntil:'commit' })
      await p.locator('#pc-brand').waitFor({ state:'visible' })
      const effect = await p.locator('.pc-logo').evaluate(el => {
        const style = getComputedStyle(el, '::after')
        return { animation:style.animationName, iterations:style.animationIterationCount, duration:style.animationDuration, mask:style.maskImage }
      })
      assert.equal(effect.animation, 'pc-shine')
      assert.equal(effect.iterations, '1')
      assert.equal(effect.duration, '0.7s')
      assert.match(effect.mask, /startup\/logo.png/)
      await p.emulateMedia({ reducedMotion:'reduce' })
      assert.equal(await p.locator('.pc-logo').evaluate(el => getComputedStyle(el, '::after').display), 'none')
      release()
      await removed(p)
      await ctx.close()
    })

    await check('watchdog; late ready ignored; second failure remains actionable', async () => {
      const ctx = await context()
      await ctx.route('**/assets/*.js', () => {})
      const p = await ctx.newPage()
      await p.goto(`${base}/login`, { waitUntil:'commit' })
      await p.locator('#pc-recovery').waitFor({ state:'visible', timeout:18000 })
      await p.evaluate(() => window.padelStartup.ready())
      assert.equal(await p.locator('#pc-recovery').isVisible(), true)
      await ctx.close()
    })

    await check('public entry does not wait for unrelated session validation', async () => {
      const ctx = await context({ session:true })
      await ctx.route('**/auth/me', () => {})
      const p = await ctx.newPage()
      await p.goto(`${base}/`)
      await removed(p)
      await p.locator('header').waitFor()
      await capture(p, 'public-402')
      await ctx.close()
    })

    await check('slow bundle still allows the full existing session timeout', async () => {
      const ctx = await context({ session:true })
      await ctx.route('**/assets/*.js', async route => { await new Promise(resolve => setTimeout(resolve, 6000)); await route.continue() })
      await ctx.route('**/auth/me', () => {})
      const p = await ctx.newPage()
      await p.goto(`${base}/app/events`, { waitUntil:'commit' })
      await p.getByRole('heading', { name:'No pudimos verificar tu sesión.' }).waitFor({ timeout:20000 })
      assert.equal(await p.locator('#pc-startup').count(), 0)
      await ctx.close()
    })

    await check('valid player/club/continuation sessions do not flash login', async () => {
      for (const [label, contexts, destination] of [
        ['player', principal.accessContexts, '/app/events'],
        ['club', [{ activity:'CLUB', clubId:'qa-club', membershipId:'qa-membership', role:'CLUB_ADMIN', initialSetupStatus:'UNKNOWN', clubStatus:'ACTIVE', permissions:[] }], '/app'],
        ['continuation', [], '/auth/continue'],
      ]) {
        const ctx = await context({ session:true })
        await me(ctx, 200, { ...principal, accessContexts:contexts })
        const p = await ctx.newPage()
        await p.addInitScript(() => {
          window.loginFlashed = false
          new MutationObserver(() => { if (document.querySelector('input[type=password]')) window.loginFlashed = true }).observe(document, { childList:true, subtree:true })
        })
        await p.goto(`${base}/login`)
        await p.waitForURL(`${base}${destination}`)
        await removed(p)
        assert.equal(await p.evaluate(() => window.loginFlashed), false)
        await capture(p, `${label}-402`)
        await ctx.close()
      }
    })

    await check('expired/401 sessions retire access; 503/offline/timeout keep recovery and credentials', async () => {
      for (const state of ['expired', '401', '503', 'offline', 'timeout']) {
        const ctx = await context({ session:true })
        if (state === 'expired') await ctx.addInitScript(() => localStorage.setItem('padelcheck_session_expires_at', '1'))
        if (state === 'offline') await ctx.route('**/auth/me', route => route.abort())
        else if (state === 'timeout') await ctx.route('**/auth/me', () => {})
        else await me(ctx, Number(state) || 200, { code:'AUTH_SESSION_INVALID' })
        const p = await ctx.newPage()
        await p.goto(`${base}/app/events`)
        await removed(p)
        if (state === 'expired' || state === '401') {
          await p.locator('input[type=email]').waitFor()
          assert.equal(await p.evaluate(() => localStorage.getItem('padelcheck_token')), null)
        } else {
          await p.getByRole('heading', { name:'No pudimos verificar tu sesión.' }).waitFor()
          assert.notEqual(await p.evaluate(() => localStorage.getItem('padelcheck_token')), null)
          if (state === '503') {
            await capture(p, 'session-unverified-402')
            await ctx.unroute('**/auth/me')
            await me(ctx, 200)
            await p.getByRole('button', { name:'Reintentar', exact:true }).click()
            await p.waitForURL(`${base}/app/events`)
            assert.equal(await p.locator('#pc-startup').count(), 0)
          }
        }
        await ctx.close()
      }
    })

    await check('storage read/exit failures stay recoverable; corrupt cached principal uses /me', async () => {
      const ctx = await context({ session:true })
      await me(ctx, 200)
      await ctx.addInitScript(() => {
        localStorage.setItem('padelcheck_user', '{broken')
        const read = Storage.prototype.getItem
        Storage.prototype.getItem = function(key) { if (window.storageDenied && key === 'padelcheck_token') throw new Error('Synthetic storage failure'); return read.call(this, key) }
        window.storageDenied = true
      })
      const p = await ctx.newPage()
      await p.goto(`${base}/login`)
      await p.getByRole('heading', { name:'No pudimos verificar tu sesión.' }).waitFor()
      await p.evaluate(() => { window.storageDenied = false })
      await p.getByRole('button', { name:'Reintentar', exact:true }).click()
      await p.waitForURL(`${base}/app/events`)
      await ctx.close()

      const exitCtx = await context({ session:true })
      await me(exitCtx, 503)
      await exitCtx.addInitScript(() => {
        const remove = Storage.prototype.removeItem
        Storage.prototype.removeItem = function(key) { if (key === 'padelcheck_token') throw new Error('Synthetic storage failure'); return remove.call(this, key) }
      })
      const exitPage = await exitCtx.newPage()
      await exitPage.goto(`${base}/login`)
      await exitPage.getByRole('heading', { name:'No pudimos verificar tu sesión.' }).waitFor()
      await exitPage.getByRole('button', { name:'Volver al acceso' }).click()
      await exitPage.getByRole('alert').filter({ hasText:'No pudimos cerrar' }).waitFor()
      assert.notEqual(await exitPage.evaluate(() => localStorage.getItem('padelcheck_token')), null)
      await exitCtx.close()
    })

    await check('JavaScript disabled has local identity, instructions and no JS action', async () => {
      const ctx = await context({ javaScriptEnabled:false })
      const p = await ctx.newPage()
      await p.goto(`${base}/login`)
      await p.getByRole('heading', { name:'Habilitá JavaScript para continuar' }).waitFor()
      assert.equal(await p.locator('.pc-nojs button').count(), 0)
      await capture(p, 'no-javascript-402')
      await ctx.close()
    })

    await check('navigation, foreground and breakpoint changes never recreate launch; desktop keeps feedback', async () => {
      for (const width of [360, 402, 767, 768, 1024]) {
        const ctx = await context({ viewport:{ width, height:789 } })
        let release
        const gate = new Promise(resolve => { release = resolve })
        await ctx.route('**/assets/*.js', async route => { await gate; await route.continue() })
        const p = await ctx.newPage()
        await p.goto(`${base}/login`, { waitUntil:'commit' })
        assert.equal(await p.locator('#pc-startup').isVisible(), width < 768)
        release()
        await removed(p)
        await p.setViewportSize({ width:width < 768 ? 1024 : 360, height:789 })
        await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
        assert.equal(await p.locator('#pc-startup').count(), 0)
        await capture(p, `breakpoint-${width}`)
        await p.evaluate(() => { window.history.pushState({}, '', '/pricing'); window.dispatchEvent(new window.PopStateEvent('popstate')) })
        await p.waitForURL(`${base}/pricing`)
        assert.equal(await p.locator('#pc-startup').count(), 0)
        await ctx.close()
      }
      const ctx = await context({ session:true })
      await me(ctx, 200)
      const p = await ctx.newPage()
      await p.goto(`${base}/app/events`)
      await removed(p)
      const response = p.waitForResponse('**/auth/me')
      await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
      await response
      assert.equal(await p.locator('#pc-startup').count(), 0)
      await ctx.close()
    })
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ browser:await browser.version(), results }, null, 2) + '\n')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
