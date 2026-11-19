import { useEffect, type Ref } from 'react'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import { NOTICE_COPY, type ClubOnboardingFlow, type FlowState } from './flow'
import { planCards, type PlanCard } from './model'
import { PrimaryButton, StepFrame, StepHeading } from './ui'

function Radio({ selected }: { selected: boolean }) {
  return <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-[#C9CF38]' : 'border-[#605E64]'}`}>
    {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#C9CF38]" />}
  </span>
}
function Card({ card, selected, disabled, onSelect }: { card: PlanCard; selected: boolean; disabled: boolean; onSelect: () => void }) {
  return <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect}
    className={`flex min-h-[44px] w-full shrink-0 flex-col rounded-[12px] border px-4 pb-3.5 pt-6 text-left ${selected ? 'border-[#C9CF38] bg-[#120F18] text-[#FEFEFE]' : 'border-[#E7E7E8] bg-[#FEFEFE] text-[#120F18]'}`}>
    <span className="flex w-full items-center justify-between pr-3"><span className="text-lg font-semibold leading-7">{card.code}</span><Radio selected={selected} /></span>
    <ul className="mt-5 flex flex-col text-sm leading-6">
      {card.bullets.map(bullet => <li key={`${bullet.before ?? ''}${bullet.bold ?? ''}${bullet.after}`} className="flex items-center gap-2">
        <span aria-hidden="true" className={`h-1 w-1 shrink-0 rounded-full ${selected ? 'bg-[#C9CF38]' : 'bg-[#605E64]'}`} />
        <span>{bullet.before}{bullet.bold && <strong className="font-semibold">{bullet.bold}</strong>}{bullet.after}</span>
      </li>)}
    </ul>
  </button>
}

export function PlanStep({ flow, state, titleRef }: { flow: ClubOnboardingFlow; state: FlowState; titleRef: Ref<HTMLHeadingElement> }) {
  useEffect(() => { void flow.loadOffers() }, [flow])
  const cards = planCards(state.offers)
  const busy = !!state.busy
  const paid = state.selectedPlan !== 'FREE'
  return <StepFrame divider footer={<>
    {paid && <p className="text-sm font-semibold leading-5 text-[#605E64]">El plan se activa cuando se confirme el pago</p>}
    <PrimaryButton label={state.notice === 'plan' || state.notice === 'checkout' ? 'Reintentar' : 'Continuar'} loading={state.busy === 'plan'} onClick={() => void flow.continuePlan()} />
  </>}>
    <StepHeading step="Paso 4 de 5" title="Elegí un plan" subtitle="Elegí el plan para tus torneos" titleRef={titleRef} />
    {state.notice && (state.notice === 'plan' || state.notice === 'checkout') && <RegistrationBanner tone="error" title={NOTICE_COPY[state.notice].title} detail={NOTICE_COPY[state.notice].detail} />}
    <div role="radiogroup" aria-label="Plan" className="flex flex-col gap-4">
      {cards.map(card => <Card key={card.code} card={card} selected={state.selectedPlan === card.code} disabled={busy} onSelect={() => flow.selectPlan(card.code)} />)}
    </div>
  </StepFrame>
}
