import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api-client'
import { API_BASE } from '@/lib/constants'
import { AppBottomNav } from '@/features/app/layout/components/AppBottomNav'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { absoluteMedia, framedMediaStyle, parsePublic, type ClubPublicProfile } from './club-profile-model'

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

export function ClubPublicProfilePage({ preview = false }: { preview?: boolean }) {
  const { clubId: routeClubId } = useParams()
  const { user, destination } = useAuth()
  const navigate = useNavigate()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const clubId = preview ? context?.clubId ?? null : routeClubId ?? null
  /** Admin preview → Mi Club nav; authenticated player → player shell; anonymous visitor → no bottom nav. */
  const playerShell = !preview && (destination?.kind === 'player' || Boolean(user?.hasPlayerProfile))
  const [profile, setProfile] = useState<ClubPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)
    setError(false)
    try {
      const value = await apiClient.get<unknown>(`/clubs/${encodeURIComponent(clubId)}/public`, { timeoutMs: 15000 })
      setProfile(parsePublic(value))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => { void load() }, [load])

  const back = () => preview ? navigate('/club/settings/info') : navigate(-1)
  const cover = absoluteMedia(profile?.coverPhotoUrl, API_BASE)
  const logo = absoluteMedia(profile?.logoUrl, API_BASE)
  const hasContact = Boolean(profile?.contactPhone || profile?.contactEmail)
  const hasSocial = Boolean(profile?.instagramUrl || profile?.facebookUrl)
  const wa = profile?.contactPhone ? whatsappHref(profile.contactPhone) : null

  return (
    <div className="flex h-dvh flex-col bg-[#f7f7f7] text-[#120f18]">
      <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
        <button type="button" aria-label="Volver" className="flex h-10 w-10 items-center justify-center" onClick={back}><ArrowBackIcon /></button>
        <h1 className="text-xl font-bold">{preview ? 'Vista previa pública' : 'Perfil del club'}</h1>
      </header>
      <main className={`min-h-0 flex-1 overflow-y-auto ${(preview || playerShell) ? 'pb-20' : ''}`}>
        <div className="mx-auto max-w-xl px-4 py-5">
          {loading ? <p role="status">Cargando perfil…</p>
            : error ? <div className="space-y-3"><p role="alert">No pudimos cargar el perfil.</p><Button onClick={() => void load()}>Reintentar</Button></div>
              : profile && (
                <div className="flex flex-col gap-6">
                  <section className="overflow-hidden rounded-xl bg-white shadow-sm">
                    {cover ? (
                      <div className="aspect-[370/184] w-full overflow-hidden bg-[#e7e7e8]">
                        <img src={cover} alt="" className="h-full w-full" style={framedMediaStyle(profile.coverFraming, 'cover')} />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3 p-4">
                      {logo ? (
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#100e16]">
                          <img src={logo} alt="" style={framedMediaStyle(profile.logoFraming, 'contain')} />
                        </div>
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded-xl bg-[#e7e7e8]" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold leading-7">{profile.name}</h2>
                        {(profile.city || profile.countryDivision) && (
                          <p className="text-sm text-[#605e64]">{[profile.city, profile.countryDivision].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </section>

                  {profile.status === 'INACTIVE' && (
                    <div role="status" className="rounded-lg border border-[#f6de8d] bg-[#fff8e1] p-3 text-sm">
                      Este club está inactivo. No admite nuevas inscripciones.
                    </div>
                  )}

                  {profile.description ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="text-base font-semibold">Sobre el club</h3>
                      <p className="text-sm leading-6 text-[#413f46]">{profile.description}</p>
                    </section>
                  ) : null}

                  {hasContact ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="text-base font-semibold">Contacto</h3>
                      <div className="flex flex-col gap-2">
                        {profile.contactPhone ? (
                          wa ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-h-12 items-center rounded-lg bg-[#e7e7e8] px-4 text-sm font-medium text-[#120f18]"
                            >
                              WhatsApp · {profile.contactPhone}
                            </a>
                          ) : (
                            <div className="flex min-h-12 items-center rounded-lg bg-[#e7e7e8] px-4 text-sm font-medium">
                              {profile.contactPhone}
                            </div>
                          )
                        ) : null}
                        {profile.contactEmail ? (
                          <a
                            href={`mailto:${profile.contactEmail}`}
                            className="flex min-h-12 items-center rounded-lg bg-[#e7e7e8] px-4 text-sm font-medium text-[#120f18]"
                          >
                            {profile.contactEmail}
                          </a>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  {hasSocial ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="text-base font-semibold">Redes sociales</h3>
                      <div className="flex flex-wrap gap-4">
                        {profile.instagramUrl ? (
                          <a className="text-sm font-medium text-[#120f18]" href={profile.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
                        ) : null}
                        {profile.facebookUrl ? (
                          <a className="text-sm font-medium text-[#120f18]" href={profile.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
        </div>
      </main>
      {preview ? (
        <ClubBottomNav onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} />
      ) : playerShell ? (
        <AppBottomNav />
      ) : null}
    </div>
  )
}
