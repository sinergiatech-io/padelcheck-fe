import { apiClient, ApiError } from '@/lib/api-client'
import {
  parseCharge,
  parseCheckout,
  parseEvents,
  parseOffers,
  parseQuote,
  parseResume,
  parseSubscription,
  parseUsage,
  type AdjustmentQuote,
  type BillingCharge,
  type CheckoutLink,
  type CheckoutPlanCode,
  type ClubSubscription,
  type ClubUsage,
  type PlanOffer,
  type ResumePreview,
} from './plan-model'

export interface ClubEventOption {
  id: string
  name: string
  status: string | null
}

export type BillingFailure =
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'invalid-event'
  | 'not-found-event'
  | 'not-found-charge'
  | 'not-found'
  | 'cancelled'
  | 'timeout'
  | 'unavailable'

const TIMEOUT = 20000

export function failureKind(error: unknown): BillingFailure {
  if (!(error instanceof ApiError)) return 'unavailable'
  if (error.kind === 'cancelled') return 'cancelled'
  if (error.kind === 'timeout') return 'timeout'
  if (error.kind !== 'http') return 'unavailable'
  if (error.status === 401) return 'unauthorized'
  if (error.status === 403) return 'forbidden'
  if (error.status === 409) return 'conflict'
  if (error.status === 400 && error.code === 'BILLING_EVENT_ID_INVALID') return 'invalid-event'
  if (error.status === 404 && error.code === 'BILLING_EVENT_NOT_FOUND') return 'not-found-event'
  if (error.status === 404 && error.code === 'BILLING_CHARGE_NOT_FOUND') return 'not-found-charge'
  if (error.status === 404) return 'not-found'
  return 'unavailable'
}

function clubPath(clubId: string, suffix: string): string {
  return `/clubs/${encodeURIComponent(clubId)}${suffix}`
}

async function parseResponse<T>(value: unknown, parse: (input: unknown) => T | null, status: number): Promise<T> {
  const parsed = parse(value)
  if (!parsed) throw new ApiError('Invalid JSON response', status, value, 'invalid-response')
  return parsed
}

async function get<T>(path: string, parse: (value: unknown) => T | null, signal?: AbortSignal): Promise<T> {
  return parseResponse(await apiClient.get<unknown>(path, { timeoutMs: TIMEOUT, signal }), parse, 200)
}

async function post<T>(path: string, body: unknown, parse: (value: unknown) => T | null): Promise<T> {
  return parseResponse(await apiClient.post<unknown>(path, body, { timeoutMs: TIMEOUT }), parse, 200)
}

export const planApi = {
  subscription: (clubId: string, signal?: AbortSignal) => get(clubPath(clubId, '/billing/subscription'), parseSubscription, signal),
  usage: (clubId: string, eventId: string | null, signal?: AbortSignal) => get(
    clubPath(clubId, `/billing/usage${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''}`),
    parseUsage,
    signal,
  ),
  events: (clubId: string, signal?: AbortSignal) => get<ClubEventOption[]>(clubPath(clubId, '/events'), parseEvents, signal),
  offers: (signal?: AbortSignal) => get<PlanOffer[]>('/plans', parseOffers, signal),
  charge: (clubId: string, reference: string, signal?: AbortSignal) => get(
    clubPath(clubId, `/billing/charges/${encodeURIComponent(reference)}`),
    parseCharge,
    signal,
  ),
  quote: (clubId: string) => get<AdjustmentQuote>(clubPath(clubId, '/billing/adjustment'), parseQuote),
  checkout: (clubId: string, planCode: CheckoutPlanCode) => post<CheckoutLink>(clubPath(clubId, '/billing/checkout'), { planCode }, parseCheckout),
  adjustmentCheckout: (clubId: string) => post<CheckoutLink>(clubPath(clubId, '/billing/adjustment/checkout'), undefined, parseCheckout),
  resumePreview: (clubId: string) => get<ResumePreview>(clubPath(clubId, '/billing/recurrence/resume'), parseResume),
  resumeConfirm: (clubId: string) => post<ResumePreview>(clubPath(clubId, '/billing/recurrence/resume'), undefined, parseResume),
}

export type { BillingCharge, CheckoutLink, ClubSubscription, ClubUsage, PlanOffer, AdjustmentQuote, ResumePreview }
