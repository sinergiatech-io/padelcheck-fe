const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')

const html = readFileSync(new URL('../index.html', `file://${__filename.replaceAll('\\', '/')}`), 'utf8')
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]

function launch({ mobile = true, storage = new Map(), denyExit = false } = {}) {
  const elements = new Map()
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: !['pc-brand'].includes(id), inert: false, disabled: false, listeners: {}, attributes: {},
      addEventListener(type, fn) { this.listeners[type] = fn },
      setAttribute(key, value) { this.attributes[key] = value },
      querySelectorAll() { return [] },
      focus() { this.focused = true },
      remove() { this.removed = true }, replaceChildren() {}, append() {},
    })
    return elements.get(id)
  }
  let timeout, reloads = 0, replaced = null, removedKeys = []
  const window = {
    matchMedia: () => ({ matches: mobile }),
    addEventListener() {}, removeEventListener() {},
    setTimeout(fn, ms) { timeout = { fn, ms }; return 1 },
  }
  vm.runInNewContext(script, {
    window, document: { getElementById: element, createElement: () => ({}) },
    location: { href:'https://test.invalid/app/events?source=link#section', reload() { reloads++ }, replace(path) { replaced = path } },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    localStorage: { removeItem(key) { if (denyExit) throw Error('Denied'); removedKeys.push(key) } },
    clearTimeout() { timeout = null }, HTMLScriptElement: class {},
  })
  return { window, element, storage, timeout: () => timeout, reloads: () => reloads, replaced: () => replaced, removedKeys: () => removedKeys }
}

test('HTML owns mobile launch before React and has a finite upper bound above the session deadline', () => {
  const app = launch()
  assert.equal(app.element('pc-startup').hidden, false)
  assert.equal(app.element('root').inert, true)
  assert.equal(app.timeout().ms, 15000)
  assert.deepEqual(app.removedKeys(), [])
})

test('ready removes the layer immediately, clears the watchdog and never allows a later failure to repeat it', () => {
  const app = launch()
  app.window.padelStartup.ready()
  assert.equal(app.element('pc-startup').removed, true)
  assert.equal(app.element('root').inert, false)
  assert.equal(app.timeout(), null)
  app.window.padelStartup.fail()
  assert.equal(app.element('pc-recovery').hidden, true)
})

test('desktop starts without a branded layer', () => {
  const app = launch({ mobile:false })
  assert.equal(app.element('pc-startup').hidden, true)
  assert.equal(app.element('root').inert, false)
})

test('React receives a fresh upper bound after download, only once, without extending a finished launch', () => {
  const app = launch()
  const downloadTimer = app.timeout()
  app.window.padelStartup.mounted()
  const mountTimer = app.timeout()
  assert.notEqual(mountTimer, downloadTimer)
  assert.equal(mountTimer.ms, 15000)
  app.window.padelStartup.mounted()
  assert.equal(app.timeout(), mountTimer)
  app.window.padelStartup.ready()
  app.window.padelStartup.mounted()
  assert.equal(app.timeout(), null)
})

test('a timeout shows operable recovery and a late mount cannot dismiss it', () => {
  const app = launch()
  app.timeout().fn()
  assert.equal(app.element('pc-recovery').hidden, false)
  assert.equal(app.element('pc-title').focused, true)
  assert.equal(app.element('pc-exit').hidden, true)
  app.window.padelStartup.ready()
  assert.notEqual(app.element('pc-startup').removed, true)
  assert.equal(app.element('root').inert, true)
  assert.deepEqual(app.removedKeys(), [])
})

test('repeated failure after reload keeps retry and explicit exit, without automatic reload cycles', () => {
  const first = launch()
  first.window.padelStartup.fail()
  const next = launch({ storage:first.storage })
  next.window.padelStartup.fail()
  assert.equal(next.element('pc-exit').hidden, false)
  assert.equal(next.element('pc-message').textContent, 'El problema continúa')
  assert.equal(next.reloads(), 0)
})

test('retry is single flight, busy, named and reloads the current document', () => {
  const app = launch()
  app.window.padelStartup.fail()
  const retry = app.element('pc-retry')
  retry.listeners.click()
  retry.listeners.click()
  assert.equal(app.reloads(), 1)
  assert.equal(retry.disabled, true)
  assert.equal(retry.attributes['aria-label'], 'Reintentando')
  assert.equal(retry.attributes['aria-busy'], 'true')
})

test('explicit exit clears only private session keys before returning to login', () => {
  const app = launch()
  app.window.padelStartup.fail()
  app.element('pc-exit').listeners.click()
  assert.deepEqual(app.removedKeys(), ['padelcheck_token','padelcheck_user','padelcheck_session_expires_at'])
  assert.equal(app.replaced(), '/login')
})

test('storage failure cannot masquerade as a successful exit', () => {
  const app = launch({ denyExit:true })
  app.window.padelStartup.fail()
  app.element('pc-exit').listeners.click()
  assert.equal(app.replaced(), null)
  assert.match(app.element('pc-detail').textContent, /No pudimos cerrar/)
  assert.equal(app.element('root').inert, true)
})
