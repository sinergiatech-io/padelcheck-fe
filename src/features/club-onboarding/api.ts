import { parseResume, type PlanCode, type ResumeSnapshot } from './model'

export interface Transport {
  get<T>(path: string, options?: { timeoutMs?: number }): Promise<T>
  post<T>(path: string, body?: unknown, options?: { timeoutMs?: number }): Promise<T>
}
export type Platform = 'WEB' | 'ANDROID' | 'IOS'
export type Failure = 'network' | 'validation' | 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'gone' | 'server'

/** Maps an API/transport error to a coarse reason. Messages are never shown: the UI translates per endpoint. */
export function failureOf(error: unknown): Failure {
  const value = error as { status?: unknown; kind?: unknown } | null
  const status = typeof value?.status === 'number' ? value.status : 0
  if (!value || (value.kind && value.kind !== 'http') || status === 0) return 'network'
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 410) return 'gone'
  return 'server'
}

export interface LocationBody { countryCode: 'AR'; provinceId: string; localityId: string }
export interface StartInput { email: string; password: string; firstName: string; lastName: string; phone?: string; platform: Platform }
export interface Checkout { url: string; reference: string; planCode: string }
const options = { timeoutMs: 20000 }

export function createOnboardingApi(pub: Transport, authed: Transport) {
  const sessions = (sessionId: string) => `/onboarding/clubs/resume?sessionId=${encodeURIComponent(sessionId)}`
  async function resume(path: string, transport: Transport): Promise<ResumeSnapshot> {
    const snapshot = parseResume(await transport.get<unknown>(path, options))
    if (!snapshot) throw Object.assign(new Error('Invalid resume'), { status: 502, kind: 'http' })
    return snapshot
  }
  return {
    start: (input: StartInput) => pub.post<{ sessionId: string }>('/onboarding/clubs/start', input, options),
    resend: (sessionId: string, email: string, platform: Platform) => pub.post('/onboarding/clubs/resend-email', { sessionId, email, platform }, options),
    verify: (sessionId: string, email: string, token: string) => pub.post('/onboarding/clubs/verify-email', { sessionId, email, token }, options),
    resumeBySession: (sessionId: string) => resume(sessions(sessionId), pub),
    resumeByBearer: () => resume('/onboarding/clubs/resume', authed),
    tenant: (sessionId: string, name: string, location: LocationBody) => pub.post('/onboarding/clubs/tenant', { sessionId, club: { name: name.trim(), location } }, options),
    plan: (sessionId: string, planCode: PlanCode) => pub.post('/onboarding/clubs/plan', { sessionId, planCode }, options),
    checkout: (sessionId: string) => pub.post<Checkout>('/onboarding/clubs/checkout', { sessionId }, options),
    complete: (sessionId: string, venue: { name: string; location: LocationBody }, courts: string[]) =>
      pub.post('/onboarding/clubs/complete', {
        sessionId,
        venues: [{ name: venue.name.trim(), location: venue.location }],
        courts: courts.map(name => ({ name: name.trim(), venueIndex: 0 })),
      }, options),
    offers: () => pub.get<unknown>('/plans', options),
  }
}
export type OnboardingApi = ReturnType<typeof createOnboardingApi>
