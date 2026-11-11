import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LocationOnIcon } from '@/components/icons/TournamentCardIcons'
import { SearchFieldIcon } from '@/components/icons/SearchFieldIcon'
import chevron from '@/assets/auth/register-chevron.svg?url'
import success from '@/assets/auth/register-success.svg?url'
import error from '@/assets/auth/register-error.svg?url'
import clock from '@/assets/auth/register-info.svg?url'
import { filterProvinces, type RegistrationLocation, type LocationState } from './registration-location'

const fieldClass = 'h-14 w-full rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-4 text-sm font-medium leading-5 text-[#120F18] shadow-none placeholder:text-[#605E64] focus-visible:ring-2 focus-visible:ring-[#C9CF38]'
type Option = { id: string; name: string }
function Combo({ label, value, placeholder, options, disabled, loading, error: invalid, query, onQuery, onSelect, nextPage, previousPage }: {
  label: string; value?: string; placeholder: string; options: Option[]; disabled: boolean; loading: boolean; error?: string
  query: string; onQuery: (query: string) => void; onSelect: (option: Option) => void; nextPage?: () => void; previousPage?: () => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => { setActive(0) }, [options])
  useEffect(() => { if (open) search.current?.focus() }, [open])
  const close = () => { setOpen(false); trigger.current?.focus() }
  const choose = (option: Option) => { onSelect(option); close() }
  return <div className="flex flex-col gap-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label id={`${id}-label`} className="text-sm font-medium leading-5">{label}<span className="ml-0.5 text-[#EF4444]" aria-hidden="true">*</span></label>
    <button ref={trigger} type="button" role="combobox" aria-labelledby={`${id}-label`} aria-controls={`${id}-list`} aria-expanded={open} aria-haspopup="listbox"
      aria-required="true" aria-invalid={!!invalid} aria-describedby={invalid ? `${id}-error` : undefined} disabled={disabled}
      className={`${fieldClass} flex items-center justify-between text-left disabled:border-[#B6B5B7] disabled:bg-[#F7F7F7] ${invalid ? 'border-[#EF4444]' : ''}`}
      onClick={() => setOpen(v => !v)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) } }}>
      <span className={`truncate ${value ? 'text-[#120F18]' : disabled ? 'text-[#929195]' : 'text-[#605E64]'}`}>{value ?? placeholder}</span><img className="h-6 w-6 shrink-0" src={chevron} alt="" />
    </button>
    {invalid && <p id={`${id}-error`} role="alert" className="text-right text-sm font-medium leading-5 text-[#AA3030]">{invalid}</p>}
    {open && !disabled && <div className="flex flex-col gap-1 rounded-lg border border-[#E7E7E8] bg-[#FEFEFE] p-1">
      <Input ref={search} maxLength={100} aria-label={`Buscar ${label.toLowerCase()}`} aria-controls={`${id}-list`} aria-activedescendant={options[active] ? `${id}-${options[active].id}` : undefined}
        value={query} placeholder="Buscar…" className="h-12 rounded-lg text-sm" onChange={event => onQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); close() }
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(options.length - 1, i + 1)) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(0, i - 1)) }
          if (event.key === 'Enter') { event.preventDefault(); if (!loading && options[active]) choose(options[active]) }
        }} />
      <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} aria-busy={loading} className="max-h-48 overflow-auto">
        {loading ? <p role="status" className="p-3 text-sm text-[#605E64]">Cargando…</p> : options.map((option, index) => <button key={option.id} id={`${id}-${option.id}`} type="button" role="option" aria-selected={value === option.name}
          className={`min-h-12 w-full rounded px-3 text-left text-sm font-medium ${active === index ? 'bg-[#FAFAEB]' : ''}`} onClick={() => choose(option)}>{option.name}</button>)}
        {!loading && !options.length && <p role="status" className="p-3 text-sm text-[#605E64]">No encontramos opciones. Probá con otro nombre.</p>}
      </div>
      {(previousPage || nextPage) && <div className="flex justify-between"><Button type="button" variant="ghost" disabled={!previousPage || loading} onClick={previousPage}>Anterior</Button><Button type="button" variant="ghost" disabled={!nextPage || loading} onClick={nextPage}>Más localidades</Button></div>}
    </div>}
  </div>
}
export function RegistrationLocationFields({ model, state, disabled }: { model: RegistrationLocation; state: LocationState; disabled: boolean }) {
  const [provinceQuery, setProvinceQuery] = useState('')
  const [localQuery, setLocalQuery] = useState('')
  useEffect(() => { setLocalQuery('') }, [state.province?.id])
  const provinces = useMemo(() => filterProvinces(state.provinces, provinceQuery), [state.provinces, provinceQuery])
  const action = (label: string, run: () => void) => <Button type="button" variant="ghost" disabled={disabled} className="h-11 w-full text-sm font-medium" onClick={run}>{label}</Button>
  const banner = (tone: 'info' | 'success' | 'warning' | 'error', title: string, detail: string, icon: 'pin' | 'clock' | 'success' | 'error' | 'search') => <div role="status" className={`flex items-center gap-3 rounded-lg border p-3 ${{ info: 'border-[#C2D8FC] bg-[#EBF3FE]', success: 'border-[#BAEDCD] bg-[#E9F9EF]', warning: 'border-[#FCE1B3] bg-[#FEF5E7]', error: 'border-[#FAC5C5] bg-[#FDECEC]' }[tone]}`}>
    <div className="flex h-6 w-6 shrink-0 items-center justify-center">{icon === 'pin' ? <LocationOnIcon size={20} color="#605E64" /> : icon === 'search' ? <SearchFieldIcon size={20} color="#605E64" /> : <img src={{ clock, success, error }[icon]} alt="" />}</div>
    <div className="min-w-0"><p className="text-sm font-semibold leading-5">{title}</p><p className="mt-0.5 text-xs leading-4 text-[#605E64]">{detail}</p></div>
  </div>
  return <section aria-label="Tu ubicación" className="flex flex-col gap-3">
    <h2 className="text-base font-bold leading-6">Tu ubicación</h2><p className="text-sm leading-5 text-[#605E64]">Para mostrarte eventos cercanos.</p>
    {state.mode === 'choice' && <>{banner('info', 'Encontrá eventos cerca', 'Usá tu ubicación o elegí una localidad de Argentina.', 'pin')}{action('Usar mi ubicación', () => { void model.detect() })}{action('Elegir localidad', () => { void model.manual() })}</>}
    {state.mode === 'detecting' && <>{banner('info', 'Buscando tu localidad…', 'Esperá un momento o elegila manualmente.', 'clock')}{action('Elegir localidad', () => { void model.manual() })}</>}
    {state.mode === 'resolved' && state.selection && <>{banner('success', 'Ubicación detectada', `${state.selection.localityName}, ${state.selection.provinceName}, Argentina`, 'success')}{action('Cambiar localidad', () => { void model.manual() })}</>}
    {state.mode === 'manual' && <>
      {state.problem && banner('warning', state.problem === 'denied' ? 'Elegí tu localidad' : state.problem === 'outside' ? 'Por ahora, solo Argentina' : 'No pudimos ubicarte', state.problem === 'denied' ? 'Podés registrarte sin compartir tu ubicación.' : state.problem === 'outside' ? 'Elegí una localidad argentina para continuar.' : 'Elegí tu localidad para continuar.', state.problem === 'outside' ? 'pin' : 'error')}
      <div className="flex flex-col gap-2"><label htmlFor="registration-country" className="text-sm font-medium leading-5">País</label><Input id="registration-country" value="Argentina" disabled className={`${fieldClass} border-[#B6B5B7] bg-[#F7F7F7] text-[#929195] disabled:opacity-100`} /></div>
      <Combo label="Provincia / Jurisdicción" value={state.province?.name} placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : 'Seleccioná una provincia'}
        options={provinces} disabled={disabled || state.provinceStatus !== 'ready'} loading={false} error={state.errors.province}
        query={provinceQuery} onQuery={setProvinceQuery} onSelect={option => { void model.selectProvince(option); setProvinceQuery('') }} />
      <Combo label="Ciudad / Localidad" value={state.selection?.localityName} placeholder={!state.province ? 'Primero elegí una provincia' : state.localityStatus === 'loading' ? 'Cargando localidades…' : 'Seleccioná una localidad'}
        options={state.localities} disabled={disabled || !state.province || state.localityStatus === 'error'} loading={state.localityStatus === 'loading'} error={state.errors.locality}
        query={localQuery} onQuery={query => { setLocalQuery(query); void model.searchLocalities(query) }}
        onSelect={option => { const locality = state.localities.find(l => l.id === option.id); if (locality) model.selectLocality(locality) }}
        previousPage={state.page > 0 ? () => { void model.searchLocalities(state.query, state.page - 1) } : undefined}
        nextPage={(state.page + 1) * 25 < state.total ? () => { void model.searchLocalities(state.query, state.page + 1) } : undefined} />
      {(state.provinceStatus === 'error' || state.localityStatus === 'error') && <>{banner('error', 'No pudimos cargar el catálogo', 'Conservamos tus datos. Intentá de nuevo.', 'error')}{action('Reintentar catálogo', () => { void (state.provinceStatus === 'error' ? model.loadProvinces() : model.searchLocalities(state.query)) })}</>}
      {!state.problem && action('Usar mi ubicación', () => { void model.detect() })}
    </>}
  </section>
}
