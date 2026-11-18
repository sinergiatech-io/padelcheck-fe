import { useRef, useState, type Ref } from 'react'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import { RegistrationLocationFields } from '@/features/auth/RegistrationLocationFields'
import { clubLocationCopy } from '@/features/auth/location-copy'
import { useRegistrationLocation } from '@/features/auth/use-registration-location'
import { focusFirstInvalid, noDevicePosition, toSavedLocation } from './location-helpers'
import { NOTICE_COPY, type ClubOnboardingFlow, type FlowState } from './flow'
import { validateVenue, venueHasErrors, type CourtDraft } from './model'
import { PrimaryButton, StepFrame, StepHeading, TextField } from './ui'

export function VenueStep({ flow, state, titleRef }: { flow: ClubOnboardingFlow; state: FlowState; titleRef: Ref<HTMLHeadingElement> }) {
  const counter = useRef(1)
  const [name, setName] = useState('')
  const [courts, setCourts] = useState<CourtDraft[]>([{ key: 'court-1', name: '' }])
  const [errors, setErrors] = useState<ReturnType<typeof validateVenue>>({ courts: {} })
  // The venue location is preloaded from the saved club and stays editable; it is never taken from the device.
  const geography = useRegistrationLocation(noDevicePosition, true, state.club ?? undefined)
  const busy = state.busy === 'venue'
  const updateCourt = (key: string, value: string) => {
    setCourts(current => current.map(court => court.key === key ? { ...court, name: value } : court))
    setErrors(current => current.courts[key] ? { ...current, courts: { ...current.courts, [key]: '' } } : current)
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (state.busy) return
    const invalid = validateVenue({ name, courts })
    setErrors(invalid)
    const locationOk = geography.model.validate()
    const selection = geography.model.state.selection
    if (venueHasErrors(invalid) || !locationOk || !selection) { focusFirstInvalid(); return }
    const saved = toSavedLocation(selection)
    void flow.completeVenue({ name, location: { countryCode: 'AR', provinceId: saved.provinceId, localityId: saved.localityId } }, courts.map(court => court.name))
  }
  return <StepFrame as="form" onSubmit={submit} footer={<PrimaryButton type="submit" label={state.notice === 'venue' ? 'Reintentar' : 'Guardar sede y canchas'} loading={busy} />}>
    {state.notice === 'venue' && <RegistrationBanner tone="error" title={NOTICE_COPY.venue.title} detail={NOTICE_COPY.venue.detail} />}
    {errors.noCourts && <RegistrationBanner tone="error" title="Falta tu primera cancha" detail="Agregá al menos una cancha para completar la sede." />}
    <StepHeading step="Paso 5 de 5" title="Prepará tu primera sede" subtitle="La ubicación se precarga desde tu club y es editable. Agregá al menos una cancha." titleRef={titleRef} />
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold leading-5">Primera sede</p>
      <TextField id="venueName" label="Nombre de la sede" required value={name} onChange={value => { setName(value); setErrors(current => ({ ...current, name: undefined })) }} error={errors.name} disabled={busy} maxLength={150} />
      <RegistrationLocationFields model={geography.model} state={geography.state} disabled={busy} copy={clubLocationCopy} />
      {courts.map((court, index) => <div key={court.key} className="flex flex-col gap-3 rounded-[12px] bg-[#F7F7F7] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold leading-5">{courts.length > 1 ? `Cancha ${index + 1}` : 'Cancha'}</p>
          {courts.length > 1 && <button type="button" disabled={busy} onClick={() => setCourts(current => current.filter(item => item.key !== court.key))} aria-label={`Quitar cancha ${index + 1}`} className="flex min-h-11 items-center px-2 text-sm font-medium text-[#AA3030]">Quitar</button>}
        </div>
        <TextField id={`court-${court.key}`} label="Nombre de la cancha" required value={court.name} onChange={value => updateCourt(court.key, value)} error={errors.courts[court.key] || undefined} disabled={busy} maxLength={100} placeholder="Cancha 1" />
      </div>)}
      <button type="button" disabled={busy} onClick={() => { counter.current += 1; setErrors(current => ({ ...current, noCourts: false })); setCourts(current => [...current, { key: `court-${counter.current}`, name: '' }]) }}
        className="flex h-12 items-center justify-center gap-3 text-sm font-medium disabled:text-[#929195]"><span aria-hidden="true" className="text-xl leading-none">+</span>Agregar cancha</button>
    </div>
  </StepFrame>
}
