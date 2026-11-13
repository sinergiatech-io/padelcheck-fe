import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api-client'
import { API_BASE } from '@/lib/constants'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { absoluteMedia, parsePublic, type ClubPublicProfile } from './club-profile-model'

export function ClubPublicProfilePage({ preview = false }: { preview?: boolean }) {
  const { clubId: routeClubId } = useParams()
  const { user, destination } = useAuth()
  const navigate = useNavigate()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const clubId = preview ? context?.clubId ?? null : routeClubId ?? null
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

  return (
    <div className="flex h-dvh flex-col bg-[#f7f7f7] text-[#120f18]">
      <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
        <button type="button" aria-label="Volver" className="flex h-10 w-10 items-center justify-center" onClick={back}><ArrowBackIcon /></button>
        <h1 className="text-xl font-bold">{preview ? 'Vista previa pública' : 'Perfil del club'}</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl">
          {loading ? <p className="p-4" role="status">Cargando perfil…</p>
            : error ? <div className="space-y-3 p-4"><p role="alert">No pudimos cargar el perfil.</p><Button onClick={() => void load()}>Reintentar</Button></div>
              : profile && <>
                {cover && <div className="overflow-hidden bg-[#e7e7e8]" style={{ aspectRatio: '370/184' }}>
                  <img src={cover} alt="" className="h-full w-full object-cover"
                    style={profile.coverFraming ? { transform: `translate(${profile.coverFraming.offsetX}px, ${profile.coverFraming.offsetY}px) scale(${profile.coverFraming.scale})` } : undefined} />
                </div>}
                <div className="space-y-4 px-4 py-5">
                  <div className="flex items-end gap-3">
                    {logo && <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#100e16]">
                      <img src={logo} alt="" className="h-full w-full object-cover"
                        style={profile.logoFraming ? { transform: `translate(${profile.logoFraming.offsetX}px, ${profile.logoFraming.offsetY}px) scale(${profile.logoFraming.scale})` } : undefined} />
                    </div>}
                    <div>
                      <h2 className="text-xl font-bold">{profile.name}</h2>
                      {(profile.city || profile.countryDivision) && <p className="text-sm text-[#605e64]">{[profile.city, profile.countryDivision].filter(Boolean).join(', ')}</p>}
                    </div>
                  </div>
                  {profile.status === 'INACTIVE' && <div role="status" className="rounded-lg border border-[#f6de8d] bg-[#fff8e1] p-3 text-sm">Este club está inactivo. No admite nuevas inscripciones.</div>}
                  {profile.description && <p className="text-sm leading-6">{profile.description}</p>}
                  <div className="space-y-1 text-sm">
                    {profile.contactEmail && <p>Email: {profile.contactEmail}</p>}
                    {profile.contactPhone && <p>Teléfono: {profile.contactPhone}</p>}
                    {profile.instagramUrl && <p><a className="underline" href={profile.instagramUrl} target="_blank" rel="noreferrer">Instagram</a></p>}
                    {profile.facebookUrl && <p><a className="underline" href={profile.facebookUrl} target="_blank" rel="noreferrer">Facebook</a></p>}
                  </div>
                  <section>
                    <h3 className="text-base font-semibold">Torneos</h3>
                    <p className="mt-2 text-sm text-[#605e64]">Los torneos públicos de este club se listarán aquí cuando esté disponible esa capacidad.</p>
                  </section>
                </div>
              </>}
        </div>
      </main>
      {preview && <ClubBottomNav onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} />}
    </div>
  )
}
