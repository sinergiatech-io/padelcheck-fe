/* Optional comparative browser QA; uses the same Playwright setup as verify-startup.cjs. */
/* global document, window, MutationObserver */
const { chromium } = require('playwright')
const fs = require('node:fs')
const output = 'docs/visual-validation/KAN-234/performance.json'
const urls = { before:process.env.STARTUP_BASELINE_URL || 'http://127.0.0.1:4175', after:process.env.STARTUP_BASE_URL || 'http://127.0.0.1:4174' }
;(async () => {
  const browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {}) })
  const samples = []
  try {
    for (let run = 0; run < 5; run++) {
      for (const [version, base] of Object.entries(urls)) {
        const ctx = await browser.newContext({ viewport:{ width:402, height:789 }, reducedMotion:'reduce' })
        // Same fresh browser context, offline font fallback and 500ms bundle latency on both revisions.
        await ctx.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType:'text/css', body:'' }))
        await ctx.route('**/assets/*.js', async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue() })
        const page = await ctx.newPage()
        await page.addInitScript(() => {
          new MutationObserver(() => {
            if (window.usableAt) return
            const input = document.querySelector('input[type=email]')
            const layer = document.getElementById('pc-startup')
            if (input && (!layer || layer.hidden)) window.usableAt = performance.now()
          }).observe(document, { childList:true, subtree:true, attributes:true })
        })
        await page.goto(`${base}/login`)
        await page.waitForFunction(() => window.usableAt > 0)
        samples.push({ version, run:run + 1, ...(await page.evaluate(() => ({ usableMs:window.usableAt, firstContentfulPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null }))) })
        await ctx.close()
      }
    }
    const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)]
    const summary = Object.fromEntries(Object.keys(urls).map(version => [version, {
      usableMedianMs:median(samples.filter(x => x.version === version).map(x => x.usableMs)),
      firstContentfulPaintMedianMs:median(samples.filter(x => x.version === version).map(x => x.firstContentfulPaintMs)),
    }]))
    fs.writeFileSync(output, JSON.stringify({ browser:await browser.version(), scenario:'Anonymous /login, fresh context, 402x789, bundle delayed 500ms, fonts stubbed equally, five alternating runs. Local lab measurement, not a production benchmark.', samples, summary }, null, 2) + '\n')
    console.log(JSON.stringify(summary))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
