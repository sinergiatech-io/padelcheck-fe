import type { Ref } from 'react'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import { NOTICE_COPY, type ClubOnboardingFlow, type FlowState } from './flow'
import { activatedPlan, statusCopy, type Screen } from './model'
import { PrimaryButton, StepFrame, StepHeading, TextButton } from './ui'

/** Verification, payment, resume-error, expired-session and completion screens: heading + banner + footer actions. */
export function StatusStep({ flow, state, screen, titleRef, onLogin, onFinish }: {
  flow: ClubOnboardingFlow; state: FlowState; screen: Screen; titleRef: Ref<HTMLHeadingElement>; onLogin: () => void; onFinish: () => void
}) {
  const plan = screen === 'done' ? activatedPlan(state.resume) : screen === 'payment-active' ? (state.resume?.subscriptionPlanCode && state.resume.subscriptionPlanCode !== 'FREE' ? state.resume.subscriptionPlanCode : state.selectedPlan) : state.selectedPlan
  const copy = statusCopy(screen, state.session?.email ?? '', plan)
  if (!copy) return null
  const busy = state.busy
  const paymentTry = screen === 'payment-canceled' || screen === 'payment-unconfirmed'
  let banner = { title: copy.banner, detail: copy.detail, tone: copy.tone }
  if (state.notice) banner = { ...NOTICE_COPY[state.notice], tone: 'error' }
  else if (screen === 'verify-pending' && state.resent) banner = { title: 'Email reenviado', detail: 'Revisá tu bandeja de entrada y la carpeta de spam.', tone: 'success' }
  else if (screen === 'verify-pending' && state.notVerified) banner = { title: 'Todavía no recibimos la verificación', detail: 'Abrí el enlace del correo y volvé a intentar.', tone: 'warning' }
  const primary = (() => {
    switch (screen) {
      case 'verify-pending': return { label: copy.cta, loading: busy === 'check', run: () => void flow.checkVerified() }
      case 'verify-checking': return { label: copy.cta, loading: true, run: () => {} }
      case 'verified': return { label: copy.cta, loading: busy === 'continue', run: () => void flow.continueVerified() }
      case 'verify-error': return { label: copy.cta, loading: busy === 'verify', run: () => void flow.verifyLink() }
      case 'verify-invalid': return { label: copy.cta, loading: busy === 'resend', run: () => void flow.resend() }
      case 'resume-error': return { label: copy.cta, loading: false, run: () => void flow.load() }
      case 'session-expired': return { label: copy.cta, loading: false, run: onLogin }
      case 'payment-active': return { label: copy.cta, loading: false, run: () => flow.goVenue() }
      case 'done': return { label: copy.cta, loading: false, run: onFinish }
      default: return { label: copy.cta, loading: false, run: () => flow.goVenue() }
    }
  })()
  const subtitle = copy.subtitle
  return <StepFrame footer={<>
    <PrimaryButton label={primary.label} loading={primary.loading} disabled={!!busy && !primary.loading} onClick={primary.run} />
    {screen === 'verify-pending' && <TextButton label="Reenviar email" disabled={!!busy} onClick={() => void flow.resend()} />}
    {screen === 'payment-pending' && <TextButton label="Consultar estado del pago" disabled={!!busy} onClick={() => void flow.checkPayment()} />}
    {paymentTry && <TextButton label="Reintentar pago" disabled={!!busy} onClick={() => void flow.continuePlan()} />}
  </>}>
    <StepHeading step={copy.step} title={copy.title} subtitle={subtitle} titleRef={titleRef} />
    <RegistrationBanner title={banner.title} detail={banner.detail} tone={banner.tone} />
  </StepFrame>
}
