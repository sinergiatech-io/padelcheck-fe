import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import editIcon from '@/assets/venues/edit.svg'
import checkIcon from '@/assets/category-policy/check.svg'
import errorIcon from '@/assets/category-policy/error.svg'
import { ClubLocationFields } from './ClubLocationFields'
import { framedMediaStyle, framing, type ImageFraming } from './club-profile-model'
import { useClubProfile, type UploadedMedia } from './use-club-profile'

const field = 'h-14 w-full rounded-lg border border-[#929195] bg-[#fefefe] px-4 text-sm font-medium shadow-none'

function Notice({ title, detail, error = false }: { title: string; detail?: string; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-lg border p-3 ${error ? 'border-[#fac5c5] bg-[#fdecec]' : 'border-[#baedcd] bg-[#e9f9ef]'}`}>
      <img src={error ? errorIcon : checkIcon} alt="" width={20} height={20} className="shrink-0" />
      <div>
        <p className="text-sm font-semibold leading-5">{title}</p>
        {detail ? <p className="mt-0.5 text-xs leading-4 text-[#605e64]">{detail}</p> : null}
      </div>
    </div>
  )
}

function ImageMenu({ open, onClose, onAdd, onChange, onAdjust, onRemove, hasImage }: {
  open: boolean
  onClose: () => void
  onAdd: () => void
  onChange: () => void
  onAdjust: () => void
  onRemove: () => void
  hasImage: boolean
}) {
  if (!open) return null
  return (
    <div className="absolute right-0 z-30 mt-2 w-48 rounded-lg border border-[#e7e7e8] bg-white p-1 shadow-lg" role="menu">
      {!hasImage ? (
        <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm" onClick={() => { onAdd(); onClose() }}>Agregar</button>
      ) : (
        <>
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm" onClick={() => { onChange(); onClose() }}>Cambiar</button>
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm" onClick={() => { onAdjust(); onClose() }}>Ajustar encuadre</button>
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#d93e3e]" onClick={() => { onRemove(); onClose() }}>Quitar</button>
        </>
      )}
      <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#605e64]" onClick={onClose}>Cancelar</button>
    </div>
  )
}

function FramingEditor({ title, src, initial, aspect, onCancel, onApply }: {
  title: string
  src: string
  initial: ImageFraming
  aspect: 'square' | 'cover'
  onCancel: () => void
  onApply: (value: ImageFraming) => void
}) {
  const [scale, setScale] = useState(initial.scale)
  const [offsetX, setOffsetX] = useState(initial.offsetX)
  const [offsetY, setOffsetY] = useState(initial.offsetY)
  const mode = aspect === 'square' ? 'contain' : 'cover'
  const frameClass = aspect === 'square' ? 'h-64 w-64' : 'aspect-[370/184] w-full max-w-md'
  const preview = framedMediaStyle({ scale, offsetX, offsetY }, mode)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#100e16] text-white">
      <header className="flex h-14 items-center gap-2 px-4">
        <button type="button" aria-label="Cancelar encuadre" onClick={onCancel} className="h-10 w-10">X</button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className={`overflow-hidden bg-[#2a2730] ${frameClass}`}>
          <img src={src} alt="" style={preview} />
        </div>
      </div>
      <div className="space-y-3 px-4 pb-8">
        <label className="block text-sm">Zoom
          <input type="range" min={1} max={3} step={0.05} value={scale} onChange={e => setScale(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <label className="block text-sm">Horizontal
          <input type="range" min={-50} max={50} value={offsetX} onChange={e => setOffsetX(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <label className="block text-sm">Vertical
          <input type="range" min={-50} max={50} value={offsetY} onChange={e => setOffsetY(Number(e.target.value))} className="mt-2 w-full" />
        </label>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="h-12 flex-1" onClick={() => { setScale(1); setOffsetX(0); setOffsetY(0) }}>Restablecer</Button>
          <Button className="h-12 flex-1" onClick={() => onApply({ scale, offsetX, offsetY })}>Aplicar encuadre</Button>
        </div>
      </div>
    </div>
  )
}

function EditFab({ label, className, onClick, disabled }: { label: string; className?: string; onClick: () => void; disabled?: boolean }) {
  // KAN-106 / Figma: 44×44 touch target, white 32 disk, dark pencil (no invert on black).
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center bg-transparent ${className ?? ''}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
        <img src={editIcon} alt="" width={20} height={20} />
      </span>
    </button>
  )
}

type FramingSession =
  | { mode: 'adjust'; kind: 'logo' | 'cover' }
  | { mode: 'pending'; media: UploadedMedia }

export function ClubInfoPage() {
  const { user, destination, phase } = useAuth()
  const navigate = useNavigate()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId)
    : null
  const authorized = phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS'))
  const clubId = authorized ? context?.clubId ?? null : null
  const profile = useClubProfile(clubId)
  const logoInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const discardDialog = useRef<HTMLDialogElement>(null)
  const statusDialog = useRef<HTMLDialogElement>(null)
  const [logoMenu, setLogoMenu] = useState(false)
  const [coverMenu, setCoverMenu] = useState(false)
  const [framingSession, setFramingSession] = useState<FramingSession | null>(null)
  const [statusMode, setStatusMode] = useState<'deactivate' | 'reactivate' | 'blocked' | null>(null)
  const blocker = useBlocker(({ nextLocation }) => {
    if (nextLocation.pathname.includes('/club/settings/info/preview')) return false
    return phase === 'ready' && (profile.dirty || profile.saving || !!profile.uploading)
  })

  useEffect(() => {
    if (blocker.state === 'blocked' && !profile.saving && !profile.uploading) {
      if (!profile.dirty) blocker.proceed()
      else discardDialog.current?.showModal()
    } else {
      discardDialog.current?.close()
    }
  }, [blocker, profile.dirty, profile.saving, profile.uploading])

  const back = () => navigate('/club/settings')
  const draft = profile.draft
  const busy = profile.saving || !!profile.uploading || profile.statusBusy

  const onPick = async (kind: 'logo' | 'cover', file: File) => {
    const uploaded = await profile.uploadMedia(kind, file)
    if (!uploaded) return
    setFramingSession({ mode: 'pending', media: uploaded })
  }

  const framingSrc = framingSession && draft
    ? framingSession.mode === 'pending'
      ? framingSession.media.url
      : framingSession.kind === 'logo' ? draft.logoUrl : draft.coverPhotoUrl
    : null
  const framingInitial = framingSession && draft
    ? framingSession.mode === 'pending'
      ? framing()
      : framingSession.kind === 'logo' ? draft.logoFraming : draft.coverFraming
    : framing()
  const framingAspect = framingSession
    ? (framingSession.mode === 'pending' ? framingSession.media.kind : framingSession.kind) === 'logo' ? 'square' : 'cover'
    : 'square'

  return (
    <div className="flex h-dvh flex-col bg-[#f7f7f7] text-[#120f18]">
      <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
        <button type="button" aria-label="Volver a Mi Club" className="flex h-10 w-10 items-center justify-center" onClick={back} disabled={busy}>
          <ArrowBackIcon />
        </button>
        <h1 className="text-xl font-bold leading-7">Información del club</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto" aria-busy={authorized && profile.loading}>
        <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-5 pb-8">
          {!authorized && <p role="alert">No tenés permiso para gestionar la configuración de este club.</p>}
          {authorized && profile.loading && <p role="status">Cargando información del club…</p>}
          {authorized && profile.loadError && (
            <Notice error title="No pudimos cargar la información" detail="Reintentá para consultar los datos guardados." />
          )}
          {authorized && !profile.loading && !profile.loadError && draft && (
            <>
              {profile.result && (
                <Notice
                  error={profile.result === 'error'}
                  title={profile.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar los cambios'}
                  detail={profile.result === 'error' ? 'Intentá nuevamente. Conservamos tu borrador.' : undefined}
                />
              )}

              <section className="overflow-visible rounded-xl bg-white shadow-sm">
                {/* Cover full-bleed inside card (no inner horizontal pad); 370×184 when present, h-96 when absent. */}
                <div
                  className={`relative w-full overflow-hidden rounded-t-xl bg-[#e7e7e8] ${
                    draft.coverPhotoUrl && !draft.clearCover ? 'aspect-[370/184]' : 'h-24'
                  }`}
                >
                  {draft.coverPhotoUrl && !draft.clearCover ? (
                    <img src={draft.coverPhotoUrl} alt="" className="h-full w-full" style={framedMediaStyle(draft.coverFraming, 'cover')} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => coverInput.current?.click()}
                        className="rounded-lg bg-[#f7f7f7] px-3 py-2 text-sm font-medium text-[#413f46]"
                      >
                        Agregar portada
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 z-20">
                    <EditFab
                      label="Editar portada"
                      disabled={busy}
                      onClick={() => { setCoverMenu(v => !v); setLogoMenu(false) }}
                    />
                    <ImageMenu
                      open={coverMenu}
                      onClose={() => setCoverMenu(false)}
                      hasImage={Boolean(draft.coverPhotoUrl && !draft.clearCover)}
                      onAdd={() => coverInput.current?.click()}
                      onChange={() => coverInput.current?.click()}
                      onAdjust={() => setFramingSession({ mode: 'adjust', kind: 'cover' })}
                      onRemove={() => profile.patch({
                        clearCover: true, coverPhotoUrl: null, coverKey: null,
                        coverFraming: framing(),
                      })}
                    />
                  </div>
                  {profile.uploading === 'cover' && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm text-white">Subiendo portada…</div>
                  )}
                </div>

                <div className="relative flex items-center gap-3 p-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#100e16]">
                      {draft.logoUrl && !draft.clearLogo ? (
                        <img src={draft.logoUrl} alt="" style={framedMediaStyle(draft.logoFraming, 'contain')} />
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          aria-label="Agregar logo"
                          onClick={() => logoInput.current?.click()}
                          className="flex h-full w-full items-center justify-center text-2xl text-[#fafaeb]"
                        >
                          +
                        </button>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 z-20">
                      <EditFab
                        label="Editar logo"
                        disabled={busy}
                        onClick={() => { setLogoMenu(v => !v); setCoverMenu(false) }}
                      />
                      <ImageMenu
                        open={logoMenu}
                        onClose={() => setLogoMenu(false)}
                        hasImage={Boolean(draft.logoUrl && !draft.clearLogo)}
                        onAdd={() => logoInput.current?.click()}
                        onChange={() => logoInput.current?.click()}
                        onAdjust={() => setFramingSession({ mode: 'adjust', kind: 'logo' })}
                        onRemove={() => profile.patch({
                          clearLogo: true, logoUrl: null, logoKey: null,
                          logoFraming: framing(),
                        })}
                      />
                    </div>
                    {profile.uploading === 'logo' && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/40 text-[10px] text-white">…</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold leading-6">{draft.name || 'Club'}</p>
                    <button type="button" className="text-sm font-medium text-[#413f46]" onClick={() => navigate('/club/settings/info/preview')}>
                      Ver perfil público
                    </button>
                  </div>
                </div>
                {(profile.fieldErrors.logo || profile.fieldErrors.cover) && (
                  <p className="px-4 pb-3 text-sm text-[#aa3030]">{profile.fieldErrors.logo || profile.fieldErrors.cover}</p>
                )}
              </section>

              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="club-name" className="text-sm font-medium">Nombre del club<span className="text-[#ef4444]"> *</span></label>
                  <Input id="club-name" value={draft.name} disabled={busy} onChange={e => profile.patch({ name: e.target.value })} className={`${field} ${profile.fieldErrors.name ? 'border-[#ef4444]' : ''}`} />
                  {profile.fieldErrors.name && <p className="text-sm text-[#aa3030]">{profile.fieldErrors.name}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="club-description" className="text-sm font-medium">Descripción</label>
                  <textarea
                    id="club-description"
                    value={draft.description}
                    disabled={busy}
                    maxLength={1001}
                    rows={5}
                    onChange={e => profile.patch({ description: e.target.value })}
                    className={`min-h-32 w-full rounded-lg border border-[#929195] bg-[#fefefe] px-4 py-3 text-sm ${profile.fieldErrors.description ? 'border-[#ef4444]' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-[#605e64]">
                    <span>Visible en el perfil público</span>
                    <span>{draft.description.length} / 1000</span>
                  </div>
                  {profile.fieldErrors.description && <p className="text-sm text-[#aa3030]">{profile.fieldErrors.description}</p>}
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">Contacto</h2>
                <div className="flex flex-col gap-2">
                  <label htmlFor="club-email" className="text-sm font-medium">Email de contacto<span className="text-[#ef4444]"> *</span></label>
                  <Input id="club-email" type="email" value={draft.contactEmail} disabled={busy} onChange={e => profile.patch({ contactEmail: e.target.value })} className={`${field} ${profile.fieldErrors.contactEmail ? 'border-[#ef4444]' : ''}`} />
                  {profile.fieldErrors.contactEmail && <p className="text-sm text-[#aa3030]">{profile.fieldErrors.contactEmail}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="club-phone" className="text-sm font-medium">Teléfono</label>
                  <Input id="club-phone" value={draft.contactPhone} disabled={busy} onChange={e => profile.patch({ contactPhone: e.target.value })} className={field} />
                </div>
              </section>

              <ClubLocationFields
                provinceId={draft.provinceId}
                provinceName={draft.provinceName}
                localityId={draft.localityId}
                localityName={draft.localityName}
                legacy={profile.saved?.legacyLocation}
                disabled={busy}
                errors={{ province: profile.fieldErrors.province, locality: profile.fieldErrors.locality }}
                onProvince={province => {
                  profile.patch({
                    provinceId: province?.id ?? null,
                    provinceName: province?.name ?? null,
                    localityId: null,
                    localityName: null,
                    locationDirty: true,
                  })
                }}
                onLocality={locality => {
                  if (!locality) return
                  profile.patch({ localityId: locality.id, localityName: locality.name, locationDirty: true })
                }}
              />

              <section className="flex flex-col gap-4">
                <h2 className="text-base font-semibold">Redes sociales</h2>
                <div className="flex flex-col gap-2">
                  <label htmlFor="club-ig" className="text-sm font-medium">Instagram</label>
                  <Input id="club-ig" value={draft.instagramUrl} disabled={busy} onChange={e => profile.patch({ instagramUrl: e.target.value })} className={`${field} ${profile.fieldErrors.instagramUrl ? 'border-[#ef4444]' : ''}`} placeholder="https://" />
                  {profile.fieldErrors.instagramUrl && <p className="text-sm text-[#aa3030]">{profile.fieldErrors.instagramUrl}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="club-fb" className="text-sm font-medium">Facebook</label>
                  <Input id="club-fb" value={draft.facebookUrl} disabled={busy} onChange={e => profile.patch({ facebookUrl: e.target.value })} className={`${field} ${profile.fieldErrors.facebookUrl ? 'border-[#ef4444]' : ''}`} placeholder="https://" />
                  {profile.fieldErrors.facebookUrl && <p className="text-sm text-[#aa3030]">{profile.fieldErrors.facebookUrl}</p>}
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t border-[#e7e7e8] pt-6">
                <h2 className="text-base font-semibold">Estado del club</h2>
                <p className="text-sm text-[#605e64]">
                  {profile.saved?.status === 'INACTIVE'
                    ? 'Club inactivo. Podés reactivarlo cuando quieras.'
                    : 'El club está activo.'}
                </p>
                {profile.saved?.status === 'ACTIVE' ? (
                  <Button variant="secondary" className="h-12" disabled={busy} onClick={() => { setStatusMode('deactivate'); statusDialog.current?.showModal() }}>
                    Desactivar club
                  </Button>
                ) : (
                  <Button className="h-12" disabled={busy} onClick={() => { setStatusMode('reactivate'); statusDialog.current?.showModal() }}>
                    Reactivar club
                  </Button>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {authorized && !profile.loading && (
        <footer className="shrink-0 border-t border-[#e7e7e8] bg-[#f7f7f7] px-4 pb-4 pt-3">
          {profile.loadError ? (
            <Button className="mx-auto flex h-12 w-full max-w-xl rounded-lg" onClick={() => void profile.reload()}>Reintentar</Button>
          ) : (
            <>
              <p className="mb-2 text-center text-sm text-[#605e64]">
                {profile.dirty ? 'Tenés cambios sin guardar' : 'Sin cambios pendientes'}
              </p>
              <Button
                className={`mx-auto flex h-12 w-full max-w-xl rounded-lg text-sm transition-none hover:bg-primary-500 disabled:opacity-100 ${!profile.dirty && !profile.saving ? 'disabled:bg-[#eef0c1] disabled:text-[#605e64]' : ''}`}
                loading={profile.saving}
                loadingLabel="Guardando…"
                disabled={!profile.dirty || !!profile.uploading}
                onClick={() => void profile.save()}
              >
                Guardar cambios
              </Button>
            </>
          )}
        </footer>
      )}

      <ClubBottomNav onDashboard={() => navigate('/app')} onClub={back} busy={busy} />

      <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) void onPick('logo', file)
      }} />
      <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) void onPick('cover', file)
      }} />

      {framingSession && framingSrc && (
        <FramingEditor
          title={(framingSession.mode === 'pending' ? framingSession.media.kind : framingSession.kind) === 'logo' ? 'Ajustar logo' : 'Ajustar portada'}
          src={framingSrc}
          initial={framingInitial}
          aspect={framingAspect}
          onCancel={() => setFramingSession(null)}
          onApply={value => {
            if (framingSession.mode === 'pending') {
              profile.applyUploaded(framingSession.media, value)
            } else if (framingSession.kind === 'logo') {
              profile.patch({ logoFraming: value })
            } else {
              profile.patch({ coverFraming: value })
            }
            setFramingSession(null)
          }}
        />
      )}

      <dialog
        ref={discardDialog}
        aria-labelledby="discard-title"
        onCancel={e => { e.preventDefault(); if (blocker.state === 'blocked') blocker.reset() }}
        className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-6 backdrop:bg-black/40"
      >
        <h2 id="discard-title" className="text-lg font-semibold">¿Descartar los cambios?</h2>
        <p className="mt-2 text-sm">Tenés cambios sin guardar.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" className="h-12" onClick={() => { if (blocker.state === 'blocked') blocker.reset() }}>Seguir editando</Button>
          <Button className="h-12" onClick={() => { profile.discard(); if (blocker.state === 'blocked') blocker.proceed() }}>Descartar cambios</Button>
        </div>
      </dialog>

      <dialog
        ref={statusDialog}
        aria-labelledby="status-title"
        onCancel={e => {
          e.preventDefault()
          if (!profile.statusBusy) {
            statusDialog.current?.close()
            setStatusMode(null)
            profile.setActionError(null)
          }
        }}
        className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-6 backdrop:bg-black/40"
      >
        {statusMode === 'deactivate' && (
          <>
            <h2 id="status-title" className="text-lg font-semibold">¿Desactivar el club?</h2>
            <p className="mt-2 text-sm">Se conserva el historial. No se cancelan eventos ni la suscripción.</p>
            {profile.actionError === 'CLUB_HAS_ACTIVE_EVENTS' && (
              <p className="mt-3 text-sm text-[#aa3030]">Hay eventos en curso o publicados. Finalizalos o cancelalos antes de desactivar.</p>
            )}
            {profile.actionError === 'error' && (
              <p className="mt-3 text-sm text-[#aa3030]">No pudimos desactivar el club. Reintentá.</p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <Button variant="secondary" className="h-12" disabled={profile.statusBusy} onClick={() => {
                statusDialog.current?.close()
                setStatusMode(null)
                profile.setActionError(null)
              }}>
                Cancelar
              </Button>
              <Button
                className="h-12 bg-[#fdecec] text-[#d93e3e] hover:bg-[#fdecec]"
                loading={profile.statusBusy}
                loadingLabel="Desactivando…"
                onClick={async () => {
                  const ok = await profile.deactivate()
                  if (ok) {
                    statusDialog.current?.close()
                    setStatusMode(null)
                  } else if (profile.actionError === 'CLUB_HAS_ACTIVE_EVENTS') {
                    setStatusMode('blocked')
                  }
                }}
              >
                Desactivar club
              </Button>
            </div>
          </>
        )}
        {statusMode === 'blocked' && (
          <>
            <h2 id="status-title" className="text-lg font-semibold">No se puede desactivar</h2>
            <p className="mt-2 text-sm">Hay eventos en borrador, publicados o en inscripción/juego. Resolvelos desde su flujo.</p>
            <Button className="mt-6 h-12 w-full" onClick={() => {
              statusDialog.current?.close()
              setStatusMode(null)
              profile.setActionError(null)
            }}>
              Entendido
            </Button>
          </>
        )}
        {statusMode === 'reactivate' && (
          <>
            <h2 id="status-title" className="text-lg font-semibold">¿Reactivar el club?</h2>
            <p className="mt-2 text-sm">Volverá a quedar disponible para nuevas operaciones.</p>
            {profile.actionError && <p className="mt-3 text-sm text-[#aa3030]">No pudimos reactivar el club. Reintentá.</p>}
            <div className="mt-6 flex flex-col gap-3">
              <Button variant="secondary" className="h-12" disabled={profile.statusBusy} onClick={() => {
                statusDialog.current?.close()
                setStatusMode(null)
                profile.setActionError(null)
              }}>
                Cancelar
              </Button>
              <Button
                className="h-12"
                loading={profile.statusBusy}
                loadingLabel="Reactivando…"
                onClick={async () => {
                  if (await profile.reactivate()) {
                    statusDialog.current?.close()
                    setStatusMode(null)
                  }
                }}
              >
                Reactivar club
              </Button>
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
