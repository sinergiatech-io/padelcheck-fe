import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiClient } from '@/lib/api-client'
import { useRegistrationLocation } from '@/features/auth/use-registration-location'
import { currentSessionGeneration } from '@/features/auth/session-generation'
import { ProfileAvatar, ProfileError, ProfileHeader, ProfileSkeleton } from './ProfilePage'
import { hideProfileOn, profileKey, profileRequest, usePlayerProfile } from './profile-api'
import type { OwnProfile } from './profile-api'

const noGps = {
  permission: async () => 'unavailable' as const,
  position: async () => { throw new Error('Location is selected from the catalog') },
}
const fieldClass = 'h-14 rounded-lg border-[#929195] px-4 text-sm font-medium shadow-none'
const formClass = 'mx-auto flex w-full max-w-[560px] flex-col gap-3 pt-5'

type CatalogOption = { id: string; name: string }
function CatalogPicker({ label, selected, options, disabled, placeholder, onSelect }: {
  label: string; selected?: string; options: CatalogOption[]; disabled: boolean
  placeholder: string; onSelect: (option: CatalogOption) => void
}) {
  const title = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const filtered = options.filter(option => fold(option.name).includes(fold(search.trim())))
  return <div className="space-y-2">
    <p className="text-sm font-medium">{label} <span className="text-red-600">*</span></p>
    <button type="button" ref={trigger} onClick={() => { setSearch(''); dialog.current?.showModal() }} disabled={disabled}
      aria-label={label + ', ' + (selected ?? placeholder)} aria-haspopup="dialog"
      className={'flex w-full items-center justify-between border bg-white text-left disabled:bg-[#f7f7f7] ' + fieldClass}>
      <span>{selected ?? placeholder}</span><ChevronDown size={18} />
    </button>
    <dialog ref={dialog} aria-labelledby={title} onClose={() => trigger.current?.focus()}
      className="m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl bg-surface p-4 backdrop:bg-black/40">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id={title} className="text-lg font-semibold">Elegir {label.toLowerCase()}</h2>
        <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>Cerrar</Button>
      </div>
      <Input autoFocus aria-label={'Buscar ' + label.toLowerCase()} value={search} onChange={event => setSearch(event.currentTarget.value)}
        placeholder={'Buscar ' + label.toLowerCase()} />
      <div className="mt-2 max-h-[45dvh] overflow-auto">
        {filtered.map(option => <button key={option.id} type="button" className="block min-h-11 w-full border-b border-divider px-2 text-left text-sm"
          onClick={() => { onSelect(option); dialog.current?.close() }}>{option.name}</button>)}
        {!filtered.length && <p role="status" className="p-2 text-sm">Sin coincidencias.</p>}
      </div>
    </dialog>
  </div>
}

function Editor({ profile }: { profile: OwnProfile }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const cache = useQueryClient()
  const flight = useRef(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()
  const { model, state } = useRegistrationLocation(noGps, true, profile.location ?? undefined)
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const legacy = !profile.location && [profile.city, profile.country].filter(Boolean).join(', ')
  const locationChanged = state.province?.id !== (profile.location?.provinceId ?? undefined)
    || state.selection?.localityId !== (profile.location?.localityId ?? undefined)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (flight.current || (locationChanged && !model.validate())) return
    flight.current = true
    setSaving(true)
    setNotice('')
    const key = profileKey(user?.userId)
    const generation = currentSessionGeneration()
    try {
      const request = { phone: phone.trim(), location: locationChanged ? model.request() : undefined }
      await cache.cancelQueries({ queryKey: key, exact: true })
      const updated = file ? await (async () => {
        const form = new FormData()
        form.append('profile', JSON.stringify(request))
        form.append('avatar', file)
        return apiClient.patchForm<OwnProfile>('/players/me', form, profileRequest)
      })() : await apiClient.patch<OwnProfile>('/players/me', request, profileRequest)
      if (generation !== currentSessionGeneration()) return
      cache.setQueryData(key, { ...updated, recentTournaments: profile.recentTournaments, stats: profile.stats })
      navigate('/app/settings', { replace: true, state: { saved: true } })
    } catch (error) {
      if (file && error instanceof ApiError && (error.code === 'PLAYER_AVATAR_INVALID' || error.status === 413)) {
        setFile(undefined)
        setPreview(undefined)
        setNotice('No pudimos guardar la foto. Elegí un archivo JPG o PNG de hasta 5 MB y reintentá.')
      } else {
        setNotice('No pudimos guardar los cambios. Reintentá.')
      }
    } finally {
      flight.current = false
      setSaving(false)
    }
  }
  return <form className={formClass} onSubmit={submit}>
    <div className="mb-2 flex items-center gap-4">
      <ProfileAvatar profile={profile} preview={preview} className="h-[72px] w-[72px]" />
      <div className="text-sm">
        <p className="text-xs text-[#605e64]">Foto de perfil</p>
        <label className="my-1 block w-fit cursor-pointer font-semibold focus-within:underline">
          Cambiar foto
          <input className="sr-only" type="file" accept="image/jpeg,image/png" disabled={saving} onChange={event => {
            const next = event.currentTarget.files?.[0]
            if (next && (next.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(next.type))) {
              setNotice('Elegí un archivo JPG o PNG de hasta 5 MB.')
            } else if (next) { setFile(next); setNotice('') }
            event.currentTarget.value = ''
          }} />
        </label>
        <p className="text-xs text-[#605e64]">JPG o PNG · máx. 5 MB</p>
      </div>
    </div>
    <label className="space-y-2 text-sm font-medium">Teléfono<Input className={fieldClass} type="tel" autoComplete="tel" value={phone}
      maxLength={32} disabled={saving} onChange={event => setPhone(event.currentTarget.value)} /></label>
    <h2 className="text-xl font-semibold">Ubicación</h2>
    {legacy && !state.selection && <p role="status" className="rounded bg-[#f8f9e9] p-3 text-sm">Ubicación anterior: {legacy}</p>}
    <label className="space-y-2 text-sm font-medium">País<Input className={fieldClass + ' bg-[#f7f7f7]'} readOnly value="Argentina" /></label>
    <CatalogPicker label="Provincia" selected={state.province?.name} options={state.provinces}
      disabled={saving || state.provinceStatus !== 'ready'} placeholder={state.provinceStatus === 'loading' ? 'Cargando provincias…' : 'Seleccioná provincia'}
      onSelect={option => { void model.selectProvince(option) }} />
    <CatalogPicker label="Localidad" selected={state.selection?.localityName}
      options={state.localities} disabled={saving || state.localityStatus !== 'ready'}
      placeholder={state.localityStatus === 'loading' ? 'Cargando localidades…' : state.province ? 'Seleccioná localidad' : 'Elegí primero provincia'}
      onSelect={option => { const locality = state.localities.find(item => item.id === option.id); if (locality) model.selectLocality(locality) }} />
    {(state.provinceStatus === 'error' || state.localityStatus === 'error') && <ProfileError onRetry={() => {
      if (state.provinceStatus === 'error') void model.loadProvinces()
      if (state.localityStatus === 'error') void model.loadLocalities()
    }}>No pudimos cargar el catálogo de ubicaciones. Tus cambios se conservaron.</ProfileError>}
    {state.errors.locality && <p role="alert" className="text-sm text-red-700">{state.errors.locality}</p>}
    <label className="space-y-2 text-sm font-medium">Email (solo lectura)<Input className={fieldClass + ' bg-[#f7f7f7]'} readOnly value={profile.email} /></label>
    <p className="text-sm text-[#605e64]">El email, el género y la categoría global se muestran en el perfil en modo de solo lectura.</p>
    {notice && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{notice}</p>}
    <div className="sticky bottom-0 mt-3 bg-surface py-2">
      <Button type="submit" className="h-12 w-full rounded-lg" loading={saving} loadingLabel="Guardando cambios">Guardar cambios</Button>
    </div>
  </form>
}

export function EditProfilePage() {
  const profile = usePlayerProfile()
  const navigate = useNavigate()
  const data = !hideProfileOn(profile.error) && profile.data && 'email' in profile.data ? profile.data as OwnProfile : null
  return <>
    <ProfileHeader title="Editar perfil" back={() => navigate('/app/settings', { replace: true })} />
    {profile.isPending && <ProfileSkeleton />}
    {profile.isError && <ProfileError onRetry={() => { void profile.refetch() }} />}
    {data && <Editor key={data.playerId} profile={data} />}
  </>
}

type FormValues = { currentPassword: string; password: string; confirmPassword: string }
type Session = { accessToken: string; expiresIn: number }
function ChangePassword() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const submitted = useRef(false)
  const [values, setValues] = useState<FormValues>({ currentPassword: '', password: '', confirmPassword: '' })
  const [visible, setVisible] = useState<Partial<Record<keyof FormValues, boolean>>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user || submitted.current) return
    if (values.password !== values.confirmPassword) { setNotice('Las contraseñas no coinciden.'); return }
    if (new TextEncoder().encode(values.password).length > 72) { setNotice('La contraseña nueva es demasiado larga.'); return }
    submitted.current = true
    const generation = currentSessionGeneration()
    setBusy(true)
    setNotice('')
    try {
      const session = await apiClient.post<Session>('/auth/me/password', values, profileRequest)
      if (generation !== currentSessionGeneration()) return
      let stored = false
      try { stored = login(session.accessToken, user, session.expiresIn) } catch { stored = false }
      if (stored) {
        navigate('/app/settings/security', { replace: true, state: { passwordSaved: true } })
      } else {
        logout()
        navigate('/login', { replace: true })
      }
    } catch (error) {
      setNotice(error instanceof ApiError && error.code === 'PASSWORD_CHANGE_INCORRECT_CURRENT'
        ? 'La contraseña actual es incorrecta.'
        : error instanceof ApiError && error.status === 429 ? 'Esperá un momento y reintentá.'
          : 'No pudimos cambiar la contraseña. Reintentá.')
    } finally {
      submitted.current = false
      setBusy(false)
    }
  }
  const labels: Record<keyof FormValues, string> = {
    currentPassword: 'Contraseña actual', password: 'Nueva contraseña', confirmPassword: 'Confirmar nueva contraseña',
  }
  return <form className={formClass + ' min-h-[calc(100dvh-104px)]'} onSubmit={submit}>
    {(Object.keys(labels) as (keyof FormValues)[]).map(key => <div key={key} className="space-y-2">
      <label htmlFor={key} className="text-sm font-medium">{labels[key]} <span className="text-red-600">*</span></label>
      <div className="relative">
        <Input id={key} required minLength={key === 'currentPassword' ? undefined : 8} maxLength={key === 'currentPassword' ? 1024 : 72}
          type={visible[key] ? 'text' : 'password'} value={values[key]} className={fieldClass + ' pr-12'}
          autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
          disabled={busy} onChange={event => setValues({ ...values, [key]: event.currentTarget.value })} />
        <Button type="button" variant="ghost" size="icon" onClick={() => setVisible({ ...visible, [key]: !visible[key] })}
          aria-label={(visible[key] ? 'Ocultar ' : 'Mostrar ') + labels[key].toLowerCase()} className="absolute right-2 top-2 h-10 w-10">
          {visible[key] ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      </div>
      {key === 'password' && <p className="text-right text-sm text-[#605e64]">Usá al menos 8 caracteres.</p>}
    </div>)}
    {notice && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{notice}</p>}
    <div className="sticky bottom-0 mt-auto bg-surface py-2">
      <Button type="submit" className="h-12 w-full rounded-lg" loading={busy} loadingLabel="Cambiando contraseña">Cambiar contraseña</Button>
    </div>
  </form>
}

export function SecurityPage({ changing = false }: { changing?: boolean }) {
  const profile = usePlayerProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const own = !hideProfileOn(profile.error) && profile.data && 'email' in profile.data ? profile.data as OwnProfile : null
  return <>
    <ProfileHeader title={changing ? 'Cambiar contraseña' : 'Seguridad'}
      back={() => navigate(changing ? '/app/settings/security' : '/app/settings', { replace: true })} />
    {profile.isPending && <ProfileSkeleton />}
    {profile.isError && <ProfileError onRetry={() => { void profile.refetch() }} />}
    {own && (changing && own.hasLocalPassword ? <ChangePassword /> : <div className={formClass}>
      {location.state?.passwordSaved && <p role="status" className="rounded-lg bg-[#f8f9e9] p-3 text-sm">Contraseña actualizada</p>}
      <h2 className="text-xl font-semibold">Contraseña de PadelCheck</h2>
      <p className="text-sm text-[#605e64]">{own.hasLocalPassword ? 'Podés cambiar tu contraseña desde esta cuenta.' : 'Usás Google para ingresar. Podés crear una contraseña con un enlace enviado a tu email.'}</p>
      <Button asChild className="h-10 w-full rounded-lg">
        <Link to={own.hasLocalPassword ? '/app/settings/security/password' : '/forgot-password'}>{own.hasLocalPassword ? 'Cambiar contraseña' : 'Crear contraseña'}</Link>
      </Button>
    </div>)}
  </>
}
