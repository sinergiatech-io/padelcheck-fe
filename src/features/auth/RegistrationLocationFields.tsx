import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import chevron from '@/assets/auth/register-chevron.svg?url'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import type { RegistrationLocation, LocationState, Province } from './registration-location'
import { playerLocationCopy, type LocationFieldCopy } from './location-copy'

const fieldClass = 'h-14 w-full rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-4 text-sm font-medium leading-5 text-[#120F18] shadow-none focus-visible:ring-2 focus-visible:ring-[#C9CF38]'

function Retry({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <div role="status"><p className="text-sm text-[#AA3030]">{label}</p><button type="button" onClick={onRetry} className="min-h-11 text-sm underline">Reintentar</button></div>
}
function RetryBanner({ title, detail, onRetry }: { title: string; detail: string; onRetry: () => void }) {
  return <div className="flex flex-col gap-1"><RegistrationBanner title={title} detail={detail} tone="error" /><button type="button" onClick={onRetry} className="min-h-11 self-start px-1 text-sm font-medium underline">Reintentar carga</button></div>
}

export function RegistrationLocationFields({ model, state, disabled, copy = playerLocationCopy }: { model: RegistrationLocation; state: LocationState; disabled: boolean; copy?: LocationFieldCopy }) {
  const [changedTo, setChangedTo] = useState<string | null>(null)
  const provinceOptions = state.province && !state.provinces.some(item => item.id === state.province?.id) ? [state.province, ...state.provinces] : state.provinces
  const localityOptions = state.selection && state.selection.provinceId === state.province?.id && !state.localities.some(item => item.id === state.selection?.localityId)
    ? [{ id: state.selection.localityId, name: state.selection.localityName, provinceId: state.selection.provinceId }, ...state.localities]
    : state.localities
  const provinceDisabled = disabled || !state.province && state.provinceStatus !== 'ready'
  const localityDisabled = disabled || !state.province || ((state.localityStatus === 'loading' || state.localityStatus === 'error') && !state.selection)
  const chooseProvince = (province: Province) => {
    if (copy.banners && state.selection && state.province?.id !== province.id) setChangedTo(province.name)
    void model.selectProvince(province)
  }
  const localityPlaceholder = !state.province ? copy.localityWaiting : state.localityStatus === 'loading' && !state.selection ? copy.localityLoading : copy.localityPlaceholder
  return <>
    <div className="flex flex-col gap-2">
      <label htmlFor="country" className="text-sm font-medium leading-5">País</label>
      <Input id="country" value="Argentina" disabled readOnly aria-label="País, Argentina" className={`${fieldClass} border-[#B6B5B7] bg-[#F7F7F7] text-[#605E64] disabled:opacity-100`} />
    </div>
    <div className="flex flex-col gap-2">
      <label htmlFor="province" className="text-sm font-medium leading-5">Provincia<span className="ml-0.5 text-[#EF4444]" aria-hidden="true">*</span></label>
      <Select value={state.province?.id ?? ''} onValueChange={id => { const province = provinceOptions.find(item => item.id === id); if (province) chooseProvince(province) }} disabled={provinceDisabled} required>
        <SelectTrigger id="province" aria-label="Provincia" aria-required="true" aria-invalid={!!state.errors.province} aria-describedby={state.errors.province ? 'province-error' : undefined} className={`${fieldClass} disabled:opacity-100 data-[placeholder]:text-[#605E64] ${state.errors.province ? 'border-[#EF4444]' : ''}`} indicator={<img src={chevron} alt="" />}>
          <SelectValue placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : copy.provincePlaceholder} />
        </SelectTrigger>
        <SelectContent>{provinceOptions.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
      </Select>
      {state.errors.province && <p id="province-error" className="text-right text-sm font-medium leading-5 text-[#AA3030]">{state.errors.province}</p>}
      {state.provinceStatus === 'error' && (copy.banners
        ? <RetryBanner title="No pudimos cargar provincias" detail="Tus datos siguen acá. Reintentá la carga." onRetry={() => { void model.loadProvinces() }} />
        : <Retry label="No pudimos cargar las provincias." onRetry={() => { void model.loadProvinces() }} />)}
    </div>
    {copy.banners && changedTo && !state.selection && state.province && <RegistrationBanner tone="warning" title="Cambiaste la provincia" detail={`Elegí una localidad de ${changedTo}.`} />}
    {copy.banners && state.province && state.localityStatus === 'loading' && !state.selection && <RegistrationBanner tone="info" title="Cargando localidades" detail="Esperá un momento para elegir una localidad." />}
    <div className="flex flex-col gap-2">
      <label htmlFor="locality" className="text-sm font-medium leading-5">Localidad<span className="ml-0.5 text-[#EF4444]" aria-hidden="true">*</span></label>
      <Select value={state.selection?.localityId ?? ''} onValueChange={id => { const locality = localityOptions.find(item => item.id === id); if (locality) { setChangedTo(null); model.selectLocality(locality) } }} disabled={localityDisabled} required>
        <SelectTrigger id="locality" aria-label="Localidad" aria-required="true" aria-invalid={!!state.errors.locality} aria-describedby={state.errors.locality ? 'locality-error' : undefined} className={`${fieldClass} ${!state.province && !disabled ? 'disabled:opacity-100' : ''} ${copy.banners && !state.province ? 'border-[#B6B5B7] bg-[#F7F7F7]' : ''} data-[placeholder]:text-[#605E64] ${state.errors.locality ? 'border-[#EF4444]' : ''}`} indicator={<img src={chevron} alt="" />}>
          <SelectValue placeholder={localityPlaceholder} />
        </SelectTrigger>
        <SelectContent>{localityOptions.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
      </Select>
      {state.errors.locality && <p id="locality-error" className="text-right text-sm font-medium leading-5 text-[#AA3030]">{state.errors.locality}</p>}
      {state.province && state.localityStatus === 'error' && (copy.banners
        ? <RetryBanner title="No pudimos cargar localidades" detail="Tus datos siguen acá. Reintentá la carga." onRetry={() => { void model.loadLocalities() }} />
        : <Retry label="No pudimos cargar las localidades." onRetry={() => { void model.loadLocalities() }} />)}
    </div>
  </>
}
