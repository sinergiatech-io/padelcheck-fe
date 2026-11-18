// Pure model for the club registration wizard (KAN-129). No React, no network: unit-tested by scripts/test-club-onboarding.cjs.

export type PlanCode = 'FREE' | 'PRO' | 'ELITE'
export type ResumeStep = 'EMAIL_VERIFICATION' | 'CLUB' | 'PLAN' | 'VENUE' | 'DONE'

export interface ResumeClub {
  name: string
  provinceId: string
  provinceName: string
  localityId: string
  localityName: string
}
export interface ResumeSnapshot {
  sessionId: string
  step: ResumeStep
  email: string
  firstName: string
  lastName: string
  emailVerified: boolean
  club: ResumeClub | null
  selectedPlanCode: PlanCode | null
  clubId: string | null
  subscriptionPlanCode: PlanCode | null
  subscriptionStatus: string | null
  initialSetupStatus: string | null
  paymentStatus: string | null
}

export type Screen =
  | 'loading' | 'account' | 'resume-error' | 'session-expired'
  | 'verify-pending' | 'verify-checking' | 'verified' | 'verify-invalid' | 'verify-error'
  | 'club' | 'plan'
  | 'payment-pending' | 'payment-canceled' | 'payment-unconfirmed' | 'payment-active'
  | 'venue' | 'done'

/* ---------- validation ---------- */
export interface AccountDraft { firstName: string; lastName: string; email: string; password: string; phone: string }
export const emptyAccount: AccountDraft = { firstName: '', lastName: '', email: '', password: '', phone: '' }
export function validateAccount(draft: AccountDraft) {
  const errors: Partial<Record<keyof AccountDraft, string>> = {}
  if (!draft.firstName.trim()) errors.firstName = 'Ingresá tu nombre.'
  if (!draft.lastName.trim()) errors.lastName = 'Ingresá tu apellido.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Ingresá un email válido.'
  if (draft.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  return errors
}
export function validateClubName(name: string): string | undefined {
  return name.trim() ? undefined : 'Ingresá el nombre del club.'
}
export interface CourtDraft { key: string; name: string }
export interface VenueDraft { name: string; courts: CourtDraft[] }
export function validateVenue(draft: VenueDraft) {
  const errors: { name?: string; courts: Record<string, string>; noCourts?: boolean } = { courts: {} }
  if (!draft.name.trim()) errors.name = 'Ingresá el nombre de la sede.'
  if (!draft.courts.length) errors.noCourts = true
  for (const court of draft.courts) if (!court.name.trim()) errors.courts[court.key] = 'Ingresá el nombre de la cancha.'
  return errors
}
export function venueHasErrors(errors: ReturnType<typeof validateVenue>) {
  return !!errors.name || !!errors.noCourts || Object.keys(errors.courts).length > 0
}

/* ---------- local persistence: only the opaque session id and the email, never a password or an unsaved draft ---------- */
export interface StoredSession { sessionId: string; email: string }
export interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const SESSION_KEY = 'padelcheck.club-onboarding'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function loadSession(store: KeyValueStore | null): StoredSession | null {
  try {
    const raw = store?.getItem(SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Record<string, unknown>
    if (typeof value.sessionId !== 'string' || !UUID.test(value.sessionId)) return null
    return { sessionId: value.sessionId, email: typeof value.email === 'string' ? value.email : '' }
  } catch { return null }
}
export function saveSession(store: KeyValueStore | null, session: StoredSession) {
  try { store?.setItem(SESSION_KEY, JSON.stringify({ sessionId: session.sessionId, email: session.email })) } catch { /* storage unavailable: resume simply won't be offered */ }
}
export function clearSession(store: KeyValueStore | null) {
  try { store?.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

/* ---------- resume parsing and routing ---------- */
const STEPS: ResumeStep[] = ['EMAIL_VERIFICATION', 'CLUB', 'PLAN', 'VENUE', 'DONE']
const PLANS: PlanCode[] = ['FREE', 'PRO', 'ELITE']
const text = (value: unknown) => typeof value === 'string' ? value : ''
const nullableText = (value: unknown) => typeof value === 'string' && value ? value : null
const plan = (value: unknown): PlanCode | null => PLANS.includes(value as PlanCode) ? value as PlanCode : null
export function parseResume(value: unknown): ResumeSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.sessionId !== 'string' || !STEPS.includes(raw.step as ResumeStep)) return null
  let club: ResumeClub | null = null
  if (raw.club && typeof raw.club === 'object') {
    const c = raw.club as Record<string, unknown>
    const location = (c.location && typeof c.location === 'object' ? c.location : {}) as Record<string, unknown>
    if (typeof c.name === 'string' && typeof location.provinceId === 'string' && typeof location.localityId === 'string') {
      club = {
        name: c.name, provinceId: location.provinceId, localityId: location.localityId,
        provinceName: text(c.countryDivision) || text(location.provinceName) || location.provinceId,
        localityName: text(c.city) || text(location.localityName) || location.localityId,
      }
    }
  }
  return {
    sessionId: raw.sessionId, step: raw.step as ResumeStep, email: text(raw.email), firstName: text(raw.firstName), lastName: text(raw.lastName),
    emailVerified: raw.emailVerified === true, club, selectedPlanCode: plan(raw.selectedPlanCode), clubId: nullableText(raw.clubId),
    subscriptionPlanCode: plan(raw.subscriptionPlanCode), subscriptionStatus: nullableText(raw.subscriptionStatus),
    initialSetupStatus: nullableText(raw.initialSetupStatus), paymentStatus: nullableText(raw.paymentStatus),
  }
}

/** Payment screen implied by a resume snapshot, or null when no paid plan was started. A payment never blocks the venue step. */
export function paymentScreen(resume: ResumeSnapshot): Extract<Screen, `payment-${string}`> | null {
  const paid = resume.selectedPlanCode === 'PRO' || resume.selectedPlanCode === 'ELITE'
  if (resume.paymentStatus === 'APPLIED' && resume.subscriptionPlanCode && resume.subscriptionPlanCode !== 'FREE') return 'payment-active'
  if (paid && resume.subscriptionPlanCode === resume.selectedPlanCode && resume.subscriptionStatus === 'ACTIVE') return 'payment-active'
  if (!resume.paymentStatus) return null
  if (resume.paymentStatus === 'CANCELED') return 'payment-canceled'
  if (resume.paymentStatus === 'FAILED' || resume.paymentStatus === 'UNAPPLIED') return 'payment-unconfirmed'
  return 'payment-pending'
}
export function screenFromResume(resume: ResumeSnapshot): Screen {
  switch (resume.step) {
    case 'EMAIL_VERIFICATION': return resume.emailVerified ? 'verified' : 'verify-pending'
    case 'CLUB': return 'club'
    case 'PLAN': return paymentScreen(resume) ?? 'plan'
    case 'VENUE': return 'venue'
    case 'DONE': return 'done'
  }
}
export function activatedPlan(resume: ResumeSnapshot | null): PlanCode {
  return resume?.subscriptionPlanCode && resume.subscriptionPlanCode !== 'FREE' ? resume.subscriptionPlanCode : resume?.selectedPlanCode && resume.paymentStatus === 'APPLIED' ? resume.selectedPlanCode : 'FREE'
}

/* ---------- plan cards (limits come from the public GET /plans catalog; frame values are the documented fallback) ---------- */
export interface PlanFeatureInput { key: string; kind: string; state: string; limit: number | null }
export interface PlanOfferInput { code: string; features: PlanFeatureInput[] }
export interface Bullet { before?: string; bold?: string; after: string }
export interface PlanCard { code: PlanCode; bullets: Bullet[] }

const L = (key: string, limit: number): PlanFeatureInput => ({ key, kind: 'LIMIT', state: 'LIMITED', limit })
const U = (key: string): PlanFeatureInput => ({ key, kind: 'LIMIT', state: 'UNLIMITED', limit: null })
const B = (key: string, on: boolean): PlanFeatureInput => ({ key, kind: 'BOOLEAN', state: on ? 'ENABLED' : 'DISABLED', limit: null })
const LIMIT_KEYS = ['MAX_ACTIVE_TOURNAMENTS', 'MAX_ENTRIES_PER_EVENT', 'MAX_DIVISIONS_PER_EVENT', 'MAX_STAFF_USERS']
export const FALLBACK_OFFERS: PlanOfferInput[] = [
  { code: 'FREE', features: [L('MAX_ACTIVE_TOURNAMENTS', 1), L('MAX_ENTRIES_PER_EVENT', 24), L('MAX_DIVISIONS_PER_EVENT', 2), L('MAX_STAFF_USERS', 1), B('PRIORITY_SUPPORT', false), B('ADVANCED_STATS', false), B('CUSTOM_BRANDING', false)] },
  { code: 'PRO', features: [L('MAX_ACTIVE_TOURNAMENTS', 4), L('MAX_ENTRIES_PER_EVENT', 120), L('MAX_DIVISIONS_PER_EVENT', 5), L('MAX_STAFF_USERS', 5), B('PRIORITY_SUPPORT', false), B('ADVANCED_STATS', true), B('CUSTOM_BRANDING', true)] },
  { code: 'ELITE', features: [U('MAX_ACTIVE_TOURNAMENTS'), U('MAX_ENTRIES_PER_EVENT'), U('MAX_DIVISIONS_PER_EVENT'), U('MAX_STAFF_USERS'), B('PRIORITY_SUPPORT', true), B('ADVANCED_STATS', true), B('CUSTOM_BRANDING', true)] },
]
const plural = (n: number, one: string, many: string) => n === 1 ? one : many
function bulletsFor(features: PlanFeatureInput[]): Bullet[] {
  const by = new Map(features.map(feature => [feature.key, feature]))
  const limited = (key: string) => { const f = by.get(key); return f && f.state === 'LIMITED' && typeof f.limit === 'number' ? f.limit : null }
  const bullets: Bullet[] = []
  if (LIMIT_KEYS.every(key => by.get(key)?.state === 'UNLIMITED')) bullets.push({ after: 'Sin límites operativos' })
  else {
    const t = limited('MAX_ACTIVE_TOURNAMENTS'), e = limited('MAX_ENTRIES_PER_EVENT'), d = limited('MAX_DIVISIONS_PER_EVENT'), s = limited('MAX_STAFF_USERS')
    if (t !== null) bullets.push({ before: 'Hasta ', bold: String(t), after: plural(t, ' torneo activo', ' torneos activos') })
    if (e !== null) bullets.push({ bold: String(e), after: ' parejas por torneo' })
    if (d !== null) bullets.push({ bold: String(d), after: plural(d, ' categoría', ' categorías') })
    if (s !== null) bullets.push({ bold: String(s), after: s === 1 ? ' usuario' : ' usuarios staff' })
  }
  if (by.get('PRIORITY_SUPPORT')?.state === 'ENABLED') bullets.push({ after: 'Soporte prioritario' })
  if (by.get('ADVANCED_STATS')?.state === 'ENABLED') bullets.push({ after: 'Estadísticas avanzadas' })
  if (by.get('CUSTOM_BRANDING')?.state === 'ENABLED') bullets.push({ after: 'Marca personalizada' })
  return bullets
}
/** Always FREE, PRO, ELITE in that order; a plan missing from the catalog falls back to the documented frame values. */
export function planCards(offers: PlanOfferInput[] | null): PlanCard[] {
  return PLANS.map(code => {
    const offer = offers?.find(item => item.code === code && item.features.length) ?? FALLBACK_OFFERS.find(item => item.code === code)!
    return { code, bullets: bulletsFor(offer.features) }
  })
}

/* ---------- copy ---------- */
export type Tone = 'info' | 'success' | 'error' | 'warning' | 'neutral'
export interface StatusCopy { step: string; title: string; subtitle: string; banner: string; detail: string; cta: string; tone: Tone }
export function statusCopy(screen: Screen, email: string, planCode: PlanCode = 'PRO'): StatusCopy | null {
  const paid = planCode === 'ELITE' ? 'ELITE' : planCode === 'PRO' ? 'PRO' : 'FREE'
  switch (screen) {
    case 'verify-pending': return { step: 'Paso 2 de 5', title: 'Verificá tu email', subtitle: 'Te enviamos un enlace para confirmar tu dirección. Verificá tu email antes de continuar.', banner: 'Verificación pendiente', detail: `Esperamos la confirmación de ${email}.`, cta: 'Ya verifiqué mi email', tone: 'info' }
    case 'verify-checking': return { step: 'Paso 2 de 5', title: 'Verificando tu email', subtitle: 'Estamos comprobando el enlace de verificación.', banner: 'Verificación en curso', detail: 'Esperá unos segundos.', cta: 'Verificando…', tone: 'info' }
    case 'verified': return { step: 'Paso 2 de 5', title: 'Email verificado', subtitle: 'Tu cuenta está verificada y lista para avanzar.', banner: 'Verificación completada', detail: 'Ya podés registrar los datos de tu club.', cta: 'Continuar', tone: 'success' }
    case 'verify-error': return { step: 'Paso 2 de 5', title: 'No pudimos verificar tu email', subtitle: 'Tu cuenta conserva el estado pendiente.', banner: 'Error de verificación', detail: 'No pudimos verificar tu email. Intentá de nuevo.', cta: 'Reintentar', tone: 'error' }
    case 'verify-invalid': return { step: 'Paso 2 de 5', title: 'Necesitás un nuevo enlace', subtitle: 'Este enlace venció o ya no es válido.', banner: 'El enlace ya no está disponible', detail: 'Pedí uno nuevo para verificar tu email y continuar.', cta: 'Enviar un nuevo enlace', tone: 'warning' }
    case 'resume-error': return { step: 'Retomá tu registro', title: 'No pudimos retomar tu registro', subtitle: 'Tus datos guardados siguen a salvo.', banner: 'Sin conexión', detail: 'Revisá tu conexión e intentá de nuevo.', cta: 'Reintentar', tone: 'error' }
    case 'session-expired': return { step: 'Retomá tu registro', title: 'Volvé a iniciar sesión', subtitle: 'Podés continuar con los pasos que ya guardaste.', banner: 'Tu sesión venció', detail: 'Iniciá sesión y retomá desde el primer paso incompleto.', cta: 'Iniciar sesión', tone: 'warning' }
    case 'payment-pending': return { step: 'Paso 4 de 5 · Pago', title: 'Pago pendiente', subtitle: 'Todavía no recibimos la confirmación del pago.', banner: 'Esperando confirmación', detail: 'FREE sigue activo. El plan elegido se activará al confirmar el pago.', cta: 'Continuar con FREE', tone: 'warning' }
    case 'payment-canceled': return { step: 'Paso 4 de 5 · Pago', title: 'Pago cancelado', subtitle: 'Podés continuar la configuración con FREE', banner: 'El plan pago no se activó', detail: 'FREE sigue activo. Podés continuar ahora o reintentar el pago.', cta: 'Continuar con FREE', tone: 'neutral' }
    case 'payment-unconfirmed': return { step: 'Paso 4 de 5 · Pago', title: 'Pago no confirmado', subtitle: 'No pudimos confirmar el cobro del plan.', banner: 'El pago falló', detail: 'FREE sigue activo. Podés continuar ahora o reintentar el pago.', cta: 'Continuar con FREE', tone: 'error' }
    case 'payment-active': return { step: 'Paso 4 de 5 · Pago', title: `Plan ${paid} activado`, subtitle: 'El pago se confirmó. Sigamos con tu sede y canchas.', banner: `${paid} ya está activo`, detail: `Tu club ya cuenta con el plan ${paid}.`, cta: 'Configurar sede y canchas', tone: 'success' }
    case 'done': return { step: 'Configuración completa', title: 'Tu club ya está listo', subtitle: 'Guardaste tu primera sede y cancha. ¡A organizar tus torneos!', banner: `Plan ${paid} activo`, detail: `Tu club está operativo con ${paid}.`, cta: 'Ir al dashboard', tone: 'success' }
    default: return null
  }
}
export const STEP_LABEL: Partial<Record<Screen, string>> = {
  account: 'Paso 1 de 5', club: 'Paso 3 de 5', plan: 'Paso 4 de 5', venue: 'Paso 5 de 5',
}
export const DUPLICATE_EMAIL = 'Este email ya está registrado. Iniciá sesión con tu cuenta.'
export const DUPLICATE_CLUB = 'Ya existe un club con ese nombre en esa localidad.'
