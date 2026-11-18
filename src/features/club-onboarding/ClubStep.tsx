import { useState, type Ref } from 'react'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import { RegistrationLocationFields } from '@/features/auth/RegistrationLocationFields'
import { clubLocationCopy } from '@/features/auth/location-copy'
import { useRegistrationLocation } from '@/features/auth/use-registration-location'
import { focusFirstInvalid, noDevicePosition, toSavedLocation } from './location-helpers'
import { NOTICE_COPY, type ClubOnboardingFlow, type FlowState } from './flow'
import { validateClubName } from './model'
import { PrimaryButton, StepFrame, StepHeading, TextField } from './ui'

export function ClubStep({ flow, state, titleRef }: { flow: ClubOnboardingFlow; state: FlowState; titleRef: Ref<HTMLHeadingElement> }) {
  const [name, setName] = useState(state.club?.name ?? '')
  const [nameError, setNameError] = useState<string | undefined>()
  const geography = useRegistrationLocation(noDevicePosition, true, state.club ?? undefined)
  const busy = state.busy === 'club'
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (state.busy) return
    const invalidName = validateClubName(name)
    setNameError(invalidName)
    const locationOk = geography.model.validate()
    const selection = geography.model.state.selection
    if (invalidName || !locationOk || !selection) { focusFirstInvalid(); return }
    void flow.saveClub(name, toSavedLocation(selection)).then(focusFirstInvalid)
  }
  const error = nameError ?? state.fieldErrors.clubName
  return <StepFrame as="form" onSubmit={submit} footer={<PrimaryButton type="submit" label={state.notice === 'club' ? 'Reintentar' : 'Crear club'} loading={busy} />}>
    <StepHeading step="Paso 3 de 5" title="Presentanos tu club" subtitle="Contanos cómo se llama y dónde está" titleRef={titleRef} />
    {state.notice === 'club' && <RegistrationBanner tone="error" title={NOTICE_COPY.club.title} detail={NOTICE_COPY.club.detail} />}
    <div className="flex flex-col gap-4">
      <TextField id="clubName" label="Nombre del club" required value={name} onChange={value => { setName(value); setNameError(undefined) }} error={error} disabled={busy} maxLength={150} autoComplete="organization" />
      <RegistrationLocationFields model={geography.model} state={geography.state} disabled={busy} copy={clubLocationCopy} />
    </div>
  </StepFrame>
}
