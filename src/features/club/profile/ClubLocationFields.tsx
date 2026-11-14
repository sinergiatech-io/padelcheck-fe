import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import chevron from '@/assets/venues/chevron.svg'
import type { LegacyLocation } from './club-profile-model'

type Province = { id: string; name: string }
type Locality = { id: string; name: string; provinceId: string }

const field = 'h-14 w-full rounded-lg border border-[#929195] bg-[#fefefe] px-4 text-sm font-medium shadow-none'

export function ClubLocationFields({
  provinceId, provinceName, localityId, localityName, legacy, disabled, errors, onProvince, onLocality,
}: {
  provinceId: string | null
  provinceName: string | null
  localityId: string | null
  localityName: string | null
  legacy?: LegacyLocation | null
  disabled?: boolean
  errors?: { province?: string; locality?: string }
  onProvince: (province: Province | null) => void
  onLocality: (locality: Locality | null) => void
}) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [provinceStatus, setProvinceStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [localityStatus, setLocalityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [provinceQuery, setProvinceQuery] = useState('')
  const [localityQuery, setLocalityQuery] = useState('')

  const loadProvinces = async () => {
    setProvinceStatus('loading')
    try {
      const value = await apiClient.get<{ items: Province[] }>('/locations/provinces?countryCode=AR', { timeoutMs: 15000 })
      setProvinces(value.items ?? [])
      setProvinceStatus('ready')
    } catch {
      setProvinceStatus('error')
    }
  }

  const loadLocalities = async (id: string) => {
    setLocalityStatus('loading')
    try {
      const value = await apiClient.get<{ items: Locality[] }>(
        `/locations/localities?countryCode=AR&provinceId=${encodeURIComponent(id)}`, { timeoutMs: 20000 })
      setLocalities(value.items ?? [])
      setLocalityStatus('ready')
    } catch {
      setLocalityStatus('error')
    }
  }

  useEffect(() => { void loadProvinces() }, [])
  useEffect(() => {
    if (!provinceId) { setLocalities([]); setLocalityStatus('idle'); return }
    void loadLocalities(provinceId)
  }, [provinceId])

  const provinceOptions = useMemo(() => {
    const base = provinceId && provinceName && !provinces.some(p => p.id === provinceId)
      ? [{ id: provinceId, name: provinceName }, ...provinces] : provinces
    const q = provinceQuery.trim().toLowerCase()
    return q ? base.filter(p => p.name.toLowerCase().includes(q)) : base
  }, [provinces, provinceId, provinceName, provinceQuery])

  const localityOptions = useMemo(() => {
    const base = localityId && localityName && !localities.some(l => l.id === localityId)
      ? [{ id: localityId, name: localityName, provinceId: provinceId ?? '' }, ...localities] : localities
    const q = localityQuery.trim().toLowerCase()
    return q ? base.filter(l => l.name.toLowerCase().includes(q)) : base
  }, [localities, localityId, localityName, localityQuery, provinceId])

  const legacyLabel = legacy && (legacy.city || legacy.countryDivision)
    ? [legacy.city, legacy.countryDivision, legacy.country].filter(Boolean).join(', ')
    : null

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Ubicación del club</h2>
      {legacyLabel && !provinceId && (
        <div role="status" className="rounded-lg border border-[#f6de8d] bg-[#fff8e1] p-3 text-sm">
          Conservamos la ubicación anterior sin asociar: <strong>{legacyLabel}</strong>. Elegí provincia y localidad del catálogo para corregirla.
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">País</label>
        <Input value="Argentina" disabled readOnly className={`${field} border-[#b6b5b7] bg-[#f7f7f7] text-[#605e64]`} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="club-province" className="text-sm font-medium">Provincia / jurisdicción<span className="text-[#ef4444]"> *</span></label>
        {provinceStatus === 'ready' && (
          <Input value={provinceQuery} onChange={e => setProvinceQuery(e.target.value)} placeholder="Buscar provincia" disabled={disabled} className={field} aria-label="Buscar provincia" />
        )}
        <Select value={provinceId ?? ''} disabled={disabled || provinceStatus !== 'ready'} onValueChange={id => {
          const province = provinceOptions.find(p => p.id === id) ?? null
          onProvince(province)
          setLocalityQuery('')
        }}>
          <SelectTrigger id="club-province" className={`${field} ${errors?.province ? 'border-[#ef4444]' : ''}`} indicator={<img src={chevron} alt="" width={24} height={24} />}>
            <SelectValue placeholder={provinceStatus === 'loading' ? 'Cargando provincias…' : 'Seleccioná una provincia'} />
          </SelectTrigger>
          <SelectContent className="bg-[#fefefe]">
            {provinceOptions.length === 0 ? <div className="px-3 py-2 text-sm text-[#605e64]">Sin coincidencias. Probá otra búsqueda.</div>
              : provinceOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors?.province && <p className="text-sm text-[#aa3030]">{errors.province}</p>}
        {provinceStatus === 'error' && <div role="alert" className="text-sm text-[#aa3030]">No pudimos cargar las provincias. <button type="button" className="underline" onClick={() => void loadProvinces()}>Reintentar</button></div>}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="club-locality" className="text-sm font-medium">Localidad<span className="text-[#ef4444]"> *</span></label>
        {provinceId && localityStatus === 'ready' && (
          <Input value={localityQuery} onChange={e => setLocalityQuery(e.target.value)} placeholder="Buscar localidad" disabled={disabled || !provinceId} className={field} aria-label="Buscar localidad" />
        )}
        <Select value={localityId ?? ''} disabled={disabled || !provinceId || localityStatus === 'loading' || localityStatus === 'error'} onValueChange={id => {
          const locality = localityOptions.find(l => l.id === id) ?? null
          onLocality(locality)
        }}>
          <SelectTrigger id="club-locality" className={`${field} ${errors?.locality ? 'border-[#ef4444]' : ''}`} indicator={<img src={chevron} alt="" width={24} height={24} />}>
            <SelectValue placeholder={!provinceId ? 'Elegí primero una provincia' : localityStatus === 'loading' ? 'Cargando localidades…' : 'Seleccioná una localidad'} />
          </SelectTrigger>
          <SelectContent className="bg-[#fefefe]">
            {localityOptions.length === 0 ? <div className="px-3 py-2 text-sm text-[#605e64]">Sin coincidencias. Probá otra búsqueda.</div>
              : localityOptions.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors?.locality && <p className="text-sm text-[#aa3030]">{errors.locality}</p>}
        {provinceId && localityStatus === 'error' && <div role="alert" className="text-sm text-[#aa3030]">No pudimos cargar las localidades. <button type="button" className="underline" onClick={() => provinceId && void loadLocalities(provinceId)}>Reintentar</button></div>}
      </div>
    </section>
  )
}
