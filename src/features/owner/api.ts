import { apiClient, ApiError } from '@/lib/api-client'

export type PlanCode = 'FREE' | 'PRO' | 'ELITE'
export type PaymentMedium = 'TRANSFER' | 'MERCADO_PAGO' | 'COURTESY'
export type MarkKind = 'TO_FREE' | 'TO_PRO'

export interface ClubSummary {
  clubId: string
  name: string
  planCode: string
  status: string
  periodEnd: string | null
  markKind: MarkKind | null
}

export interface OwnerPayment {
  id: string
  medium: PaymentMedium
  planCode: Exclude<PlanCode, 'FREE'>
  amount: string | null
  currency: string | null
  periodStart: string
  periodEnd: string | null
  status: string
  reason: string
}

export interface OwnerMark {
  kind: MarkKind
  effectiveOn: string
  proExitOn: string | null
  reason: string
}

export interface OwnerAudit {
  action: string
  reason: string
  detail: string | null
  planCode: string | null
  createdAt: string
}

export interface ClubBilling {
  clubId: string
  name: string
  planCode: string
  status: string
  periodStart: string | null
  periodEnd: string | null
  payment: OwnerPayment | null
  mark: OwnerMark | null
  history: OwnerAudit[]
}

export interface CatalogFeature {
  key: string
  kind: 'LIMIT' | 'BOOLEAN'
  state: 'LIMITED' | 'UNLIMITED' | 'ENABLED' | 'DISABLED' | 'ABSENT'
  limit?: number | null
}

export interface CatalogPlan {
  code: PlanCode
  name: string
  description: string | null
  free: boolean
  features: CatalogFeature[]
  price: {
    status: string
    amount?: string | null
    currency?: string | null
    period?: 'MONTH' | 'YEAR' | null
  }
}

export interface CatalogView {
  plans: CatalogPlan[]
  history: OwnerAudit[]
}

const OWNER_ERRORS: Record<string, string> = {
  'Owner access required': 'No tenés acceso a esta área.',
  'A payment cannot lower the current plan': 'Un pago no puede bajar el plan actual.',
  'Reason is required': 'El motivo es obligatorio.',
  'Amount is required': 'El monto es obligatorio.',
  'Amount must be greater than zero': 'El monto tiene que ser mayor a cero.',
  'Amount cannot be negative': 'El monto no puede ser negativo.',
  'Currency must be a 3-letter code': 'La moneda tiene que ser un código de tres letras.',
  'FREE has no price': 'FREE no tiene precio.',
  'Price is required': 'El precio es obligatorio.',
  'Unknown plan': 'Ese plan no existe.',
  'Only the current payment can be corrected': 'Solo se puede corregir el pago vigente.',
  'Only the current payment can be annulled': 'Solo se puede anular el pago vigente.',
  'The payment period has already ended': 'El período de ese pago ya terminó.',
  'The courtesy already ends on its end date': 'La cortesía ya vuelve a FREE en su fecha de fin.',
  'Only ELITE can move to PRO': 'Solo un ELITE puede pasar a PRO.',
  'There is no scheduled change to cancel': 'No hay una marca para anular.',
  'A paid period is required before scheduling a change': 'Primero tiene que haber un pago vigente.',
  'Transfer and Mercado Pago payments need an end date': 'La transferencia y Mercado Pago necesitan fecha de fin.',
  'Paid plan must be PRO or ELITE': 'El plan pago tiene que ser PRO o ELITE.',
}

export function ownerError(error: unknown): string {
  if (error instanceof ApiError && error.message) return OWNER_ERRORS[error.message] ?? error.message
  return 'No se pudo completar la operación.'
}

export const ownerApi = {
  clubs: () => apiClient.get<ClubSummary[]>('/platform/billing/clubs', { timeoutMs: 20000 }),
  club: (clubId: string) => apiClient.get<ClubBilling>(`/platform/billing/clubs/${clubId}`, { timeoutMs: 20000 }),
  pay: (clubId: string, body: unknown) =>
    apiClient.post<ClubBilling>(`/platform/billing/clubs/${clubId}/payments`, body, { timeoutMs: 20000 }),
  correct: (clubId: string, paymentId: string, body: unknown) =>
    apiClient.post<ClubBilling>(`/platform/billing/clubs/${clubId}/payments/${paymentId}/corrections`, body, { timeoutMs: 20000 }),
  annul: (clubId: string, paymentId: string, reason: string) =>
    apiClient.post<ClubBilling>(`/platform/billing/clubs/${clubId}/payments/${paymentId}/annulments`, { reason }, { timeoutMs: 20000 }),
  mark: (clubId: string, body: unknown) =>
    apiClient.post<ClubBilling>(`/platform/billing/clubs/${clubId}/marks`, body, { timeoutMs: 20000 }),
  annulMark: (clubId: string, reason: string) =>
    apiClient.post<ClubBilling>(`/platform/billing/clubs/${clubId}/marks/annulments`, { reason }, { timeoutMs: 20000 }),
  catalog: () => apiClient.get<CatalogView>('/platform/billing/plans', { timeoutMs: 20000 }),
  updatePlan: (code: string, body: unknown) =>
    apiClient.put<CatalogPlan>(`/platform/billing/plans/${code}`, body, { timeoutMs: 20000 }),
}
