/** Stable billing-session identity. It is not the auth revalidation counter and it is not a token. */

const AUTH_KEY = 'padelcheck.plan.auth'
const CHARGE_PREFIX = 'padelcheck.plan.charge.'

export interface BillingStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export interface BillingAuth {
  userId: string
  id: string
}

export function billingBrowserStore(): BillingStore {
  return {
    getItem: (key) => sessionStorage.getItem(key),
    setItem: (key, value) => sessionStorage.setItem(key, value),
    removeItem: (key) => sessionStorage.removeItem(key),
    keys: () => Object.keys(sessionStorage),
  }
}

export function readBillingAuth(store: BillingStore): BillingAuth | null {
  const raw = store.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { userId?: unknown; id?: unknown }
    if (!isId(parsed.userId) || !isSessionId(parsed.id)) return null
    return { userId: parsed.userId, id: parsed.id }
  } catch {
    return null
  }
}

/** Keep the id while the same user stays authenticated, including revalidation and reload. */
export function ensureBillingAuth(store: BillingStore, userId: string, createId: () => string): BillingAuth {
  const current = readBillingAuth(store)
  if (current?.userId === userId) return current
  endBillingAuth(store)
  const created = { userId, id: createId() }
  if (!isSessionId(created.id)) throw new Error('Billing session id is not opaque')
  store.setItem(AUTH_KEY, JSON.stringify(created))
  return created
}

/** Logout and a new login drop every charge reference, even if the plan panel is gone. */
export function endBillingAuth(store: BillingStore): void {
  store.removeItem(AUTH_KEY)
  for (const key of store.keys()) {
    if (key.startsWith(CHARGE_PREFIX)) store.removeItem(key)
  }
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80 && !value.includes('.')
}

function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(value) && !value.includes('.')
}
