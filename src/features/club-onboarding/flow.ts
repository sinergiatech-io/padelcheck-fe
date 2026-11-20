import { failureOf, type LocationBody, type OnboardingApi, type Platform, type StartInput } from './api'
import {
  clearSession, DUPLICATE_CLUB, DUPLICATE_EMAIL, loadSession, paymentScreen, saveSession, screenFromResume,
  type KeyValueStore, type PlanCode, type PlanOfferInput, type ResumeClub, type ResumeSnapshot, type Screen, type StoredSession,
} from './model'

export type NoticeKey = 'account' | 'resend' | 'check-verified' | 'club' | 'plan' | 'checkout' | 'payment-check' | 'venue'
export const NOTICE_COPY: Record<NoticeKey, { title: string; detail: string }> = {
  account: { title: 'No pudimos crear tu cuenta', detail: 'Tus datos siguen acá. Intentá de nuevo.' },
  resend: { title: 'No pudimos reenviar el email', detail: 'Intentá de nuevo en unos segundos.' },
  'check-verified': { title: 'No pudimos comprobar tu email', detail: 'Revisá tu conexión e intentá de nuevo.' },
  club: { title: 'No pudimos crear el club', detail: 'Tus datos siguen acá. Intentá guardarlos de nuevo.' },
  plan: { title: 'No pudimos guardar el plan', detail: 'Intentá de nuevo.' },
  checkout: { title: 'No pudimos iniciar el pago', detail: 'FREE sigue activo. Intentá de nuevo o continuá con FREE.' },
  'payment-check': { title: 'No pudimos consultar el pago', detail: 'Revisá tu conexión e intentá de nuevo.' },
  venue: { title: 'No pudimos guardar la sede', detail: 'Tus datos siguen acá. Intentá guardarlos de nuevo.' },
}

export interface Proof { sessionId: string; email: string; token: string }
export interface SavedLocation extends LocationBody { provinceName: string; localityName: string }
export interface FlowState {
  screen: Screen
  session: StoredSession | null
  resume: ResumeSnapshot | null
  club: ResumeClub | null
  busy: string | null
  notice: NoticeKey | null
  fieldErrors: { email?: string; clubName?: string }
  resent: boolean
  notVerified: boolean
  offers: PlanOfferInput[] | null
  selectedPlan: PlanCode
}
export interface FlowDeps {
  api: OnboardingApi
  store: KeyValueStore | null
  platform: Platform
  /** Returns the URL only when it is an https checkout link of the payment provider. */
  checkoutUrl(url: unknown): string | null
  /** Web: same tab, the session id is already persisted so coming back resumes on the plan step. */
  openCheckout(url: string): void
  parseOffers(value: unknown): PlanOfferInput[] | null
}

export class ClubOnboardingFlow {
  state: FlowState = {
    screen: 'loading', session: null, resume: null, club: null, busy: null, notice: null, fieldErrors: {},
    resent: false, notVerified: false, offers: null, selectedPlan: 'FREE',
  }
  private listeners = new Set<() => void>()
  private locked = false
  private started = false
  private proof: Proof | null = null
  private mode: 'bearer' | 'session' = 'session'
  private googleSessionId?: string
  constructor(private deps: FlowDeps) {}

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.state
  private set(patch: Partial<FlowState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  private get sessionId() { return this.state.session?.sessionId ?? '' }
  private get email() { return this.state.session?.email ?? '' }
  private remember(session: StoredSession) { saveSession(this.deps.store, session); this.set({ session }) }
  private forget() { clearSession(this.deps.store); this.proof = null; this.set({ session: null, resume: null, club: null, screen: 'account', fieldErrors: {}, notVerified: false, resent: false, selectedPlan: 'FREE' }) }

  /** One locked action at a time: a second click while one is running is ignored (no double submit). */
  private async run(name: string, task: () => Promise<void>) {
    if (this.locked) return false
    this.locked = true
    this.set({ busy: name, notice: null, fieldErrors: {} })
    try { await task() } finally { this.locked = false; this.set({ busy: null }) }
    return true
  }
  private apply(resume: ResumeSnapshot, extra: Partial<FlowState> = {}) {
    const paying = this.state.session?.paying
    this.remember({ sessionId: resume.sessionId, email: resume.email || this.email, ...(paying ? { paying } : {}) })
    this.set({
      resume, club: resume.club, screen: screenFromResume(resume, !!paying), notVerified: false, resent: false,
      selectedPlan: resume.selectedPlanCode ?? this.state.selectedPlan, ...extra,
    })
  }

  /** Entry: verification link > admin bearer > stored session id > empty account form. Runs once (StrictMode-safe). */
  async init(input: { proof?: Proof; bearer: boolean; googleSessionId?: string }) {
    if (this.started) return
    this.started = true
    if (input.proof) { this.proof = input.proof; await this.verifyLink(); return }
    this.mode = input.bearer ? 'bearer' : 'session'
    await this.load()
  }
  async load() {
    if (this.locked) return
    this.locked = true
    this.set({ screen: 'loading', notice: null })
    try {
      if (this.mode === 'bearer') {
        try { this.apply(await this.deps.api.resumeByBearer()); return }
        catch (error) {
          const reason = failureOf(error)
          if (reason === 'unauthorized') { this.set({ screen: 'session-expired' }); return }
          if (reason !== 'not-found') { this.set({ screen: 'resume-error' }); return }
        }
      }
      const persisted = loadSession(this.deps.store)
      const stored = this.googleSessionId && persisted?.sessionId !== this.googleSessionId
        ? { sessionId: this.googleSessionId, email: "" } : persisted
      if (!stored) { this.set({ screen: 'account' }); return }
      this.set({ session: stored })
      try { this.apply(await this.deps.api.resumeBySession(stored.sessionId)) }
      catch (error) {
        if (failureOf(error) === 'not-found') this.forget()
        else this.set({ screen: 'resume-error' })
      }
    } finally { this.locked = false }
  }

  async verifyLink() {
    const proof = this.proof
    if (!proof) return
    await this.run('verify', async () => {
      this.set({ screen: 'verify-checking', session: { sessionId: proof.sessionId, email: proof.email } })
      try {
        await this.deps.api.verify(proof.sessionId, proof.email, proof.token)
        this.proof = null
        this.remember({ sessionId: proof.sessionId, email: proof.email })
        this.set({ screen: 'verified' })
      } catch (error) {
        const reason = failureOf(error)
        if (reason === 'gone' || reason === 'validation' || reason === 'not-found') {
          this.proof = null
          this.remember({ sessionId: proof.sessionId, email: proof.email })
          this.set({ screen: 'verify-invalid' })
        } else this.set({ screen: 'verify-error' })
      }
    })
  }

  async start(input: Omit<StartInput, 'platform'>) {
    await this.run('start', async () => {
      try {
        const result = await this.deps.api.start({ ...input, email: input.email.trim(), phone: input.phone?.trim() || undefined, platform: this.deps.platform })
        this.remember({ sessionId: result.sessionId, email: input.email.trim() })
        this.set({ screen: 'verify-pending', resume: null })
      } catch (error) {
        if (failureOf(error) === 'conflict') this.set({ fieldErrors: { email: DUPLICATE_EMAIL } })
        else this.set({ notice: 'account' })
      }
    })
  }

  async resend() {
    await this.run('resend', async () => {
      try {
        await this.deps.api.resend(this.sessionId, this.email, this.deps.platform)
        this.set({ screen: 'verify-pending', resent: true, notVerified: false })
      } catch (error) {
        const reason = failureOf(error)
        if (reason === 'conflict') { await this.refresh() }
        else if (reason === 'not-found') this.forget()
        else this.set({ notice: 'resend' })
      }
    })
  }
  /** Re-reads the saved state; used after an already-verified conflict. */
  private async refresh() {
    try { this.apply(await this.deps.api.resumeBySession(this.sessionId)) } catch { this.set({ notice: 'check-verified' }) }
  }

  /** «Ya verifiqué mi email»: only advances when the server says so. */
  async checkVerified() {
    await this.run('check', async () => {
      try {
        const resume = await this.deps.api.resumeBySession(this.sessionId)
        if (resume.emailVerified) {
          this.apply(resume)
          // Show «Email verificado» before the club form, whichever step the server reports for a freshly verified account.
          if (this.state.screen === 'club') this.set({ screen: 'verified' })
        } else this.set({ resume, notVerified: true, resent: false })
      } catch (error) {
        if (failureOf(error) === 'not-found') this.forget()
        else this.set({ notice: 'check-verified' })
      }
    })
  }

  async continueVerified() {
    await this.run('continue', async () => {
      try {
        const resume = await this.deps.api.resumeBySession(this.sessionId)
        this.apply(resume)
        // The server may still report EMAIL_VERIFICATION for a freshly verified session: «Continuar» always means the club step.
        if (resume.emailVerified && this.state.screen === 'verified') this.set({ screen: 'club' })
      } catch (error) {
        if (failureOf(error) === 'not-found') this.forget(); else this.set({ screen: 'club' })
      }
    })
  }

  async saveClub(name: string, location: SavedLocation) {
    await this.run('club', async () => {
      try {
        await this.deps.api.tenant(this.sessionId, name, { countryCode: 'AR', provinceId: location.provinceId, localityId: location.localityId })
        this.set({
          club: { name: name.trim(), provinceId: location.provinceId, provinceName: location.provinceName, localityId: location.localityId, localityName: location.localityName },
          screen: 'plan',
        })
      } catch (error) {
        const reason = failureOf(error)
        if (reason === 'conflict') this.set({ fieldErrors: { clubName: DUPLICATE_CLUB } })
        else if (reason === 'forbidden') { this.set({ screen: 'verify-pending', notVerified: true }) }
        else if (reason === 'not-found') this.forget()
        else this.set({ notice: 'club' })
      }
    })
  }

  async loadOffers() {
    if (this.state.offers) return
    try { this.set({ offers: this.deps.parseOffers(await this.deps.api.offers()) }) } catch { /* the documented fallback limits are used */ }
  }
  selectPlan(code: PlanCode) { if (!this.locked) this.set({ selectedPlan: code }) }

  /** FREE goes straight to the venue; PRO/ELITE record the choice, ask for the checkout link and hand off to the provider. */
  async continuePlan() {
    const code = this.state.selectedPlan
    await this.run('plan', async () => {
      try { await this.deps.api.plan(this.sessionId, code) } catch (error) {
        if (failureOf(error) === 'not-found') this.forget(); else this.set({ notice: 'plan' })
        return
      }
      if (code === 'FREE') {
        if (this.state.session?.paying) this.remember({ sessionId: this.sessionId, email: this.email })
        this.set({ screen: 'venue' }); return
      }
      try {
        const url = this.deps.checkoutUrl((await this.deps.api.checkout(this.sessionId)).url)
        if (!url) { this.set({ notice: 'checkout' }); return }
        this.remember({ sessionId: this.sessionId, email: this.email, paying: true })
        this.set({ screen: 'payment-pending' })
        this.deps.openCheckout(url)
      } catch { this.set({ notice: 'checkout' }) }
    })
  }
  /** «Consultar estado del pago»: the provider (or the backend simulator) confirms, never this client. */
  async checkPayment() {
    await this.run('payment-check', async () => {
      try {
        const resume = await this.deps.api.resumeBySession(this.sessionId)
        const screen = paymentScreen(resume) ?? 'payment-pending'
        this.remember({ sessionId: resume.sessionId, email: resume.email || this.email, paying: true })
        this.set({ resume, club: resume.club ?? this.state.club, selectedPlan: resume.selectedPlanCode ?? this.state.selectedPlan, screen })
      } catch (error) {
        if (failureOf(error) === 'not-found') this.forget(); else this.set({ notice: 'payment-check' })
      }
    })
  }
  goVenue() {
    if (this.locked) return
    const session = this.state.session
    if (session?.paying) this.remember({ sessionId: session.sessionId, email: session.email })
    this.set({ screen: 'venue', notice: null })
  }
  backToPlan() { if (!this.locked) this.set({ screen: 'plan', notice: null }) }

  async completeVenue(venue: { name: string; location: LocationBody }, courts: string[]) {
    await this.run('venue', async () => {
      try {
        await this.deps.api.complete(this.sessionId, venue, courts)
        let resume = this.state.resume
        try { resume = await this.deps.api.resumeBySession(this.sessionId) } catch { /* the banner falls back to the known plan */ }
        this.set({ resume, screen: 'done' })
      } catch (error) {
        if (failureOf(error) === 'not-found') this.forget(); else this.set({ notice: 'venue' })
      }
    })
  }
  /** After «Ir al dashboard»: the saved session id is no longer needed. */
  finish() { clearSession(this.deps.store) }
  restart() { this.forget() }
}
