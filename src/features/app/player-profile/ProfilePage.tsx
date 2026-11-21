import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { Button } from '@/components/ui/button'
import { CalendarTodayIcon } from '@/components/icons/TournamentCardIcons'
import { TrophyOutlineIcon } from '@/components/icons/TrophyIcon'
import { API_BASE } from '@/lib/constants'
import { ChevronDown, Circle, Mail, MoreVertical, Pencil, Phone } from 'lucide-react'
import { hideProfileOn, resultLabel, tournamentResultsPath, usePlayerProfile, useSportingHistory, useTournamentResults } from './profile-api'
import type { OwnProfile, SportingProfile } from './profile-api'

const date = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' })
const month = new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const utcDate = (value: string) => new Date(value + 'T00:00:00Z')

export function ProfileHeader({ title, back, children }: {
  title: string; back?: () => void; children?: React.ReactNode
}) {
  return <header className="sticky top-0 z-30 -mx-4 -mt-4 flex min-h-14 items-center gap-3 bg-dark-900 px-4 text-white md:static md:m-0 md:rounded-lg">
    {back && <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-white" aria-label="Volver" onClick={back}>
      <ArrowBackIcon color="#FFFFFF" size={20} />
    </Button>}
    <h1 className="min-w-0 grow text-xl font-bold leading-7">{title}</h1>
    {children}
  </header>
}

export function ProfileError({ onRetry, children }: { onRetry: () => void; children?: string }) {
  return <div role="status" className="rounded-lg border border-[#e7e7e8] px-4 py-3 text-sm">
    <p>{children ?? 'No pudimos cargar el perfil.'}</p>
    <Button type="button" variant="link" className="mt-2" onClick={onRetry}>Reintentar</Button>
  </div>
}

export function ProfileSkeleton() {
  return <div role="status" aria-label="Cargando" className="flex flex-col gap-5 py-5">
    {[155, 40, 130].map(height => <div key={height} style={{ height }} className="rounded-2xl bg-divider motion-safe:animate-pulse" />)}
  </div>
}

export function ProfileAvatar({ profile, preview, className = 'h-16 w-16' }: {
  profile: SportingProfile; preview?: string; className?: string
}) {
  const { token } = useAuth()
  const [image, setImage] = useState<{ source: string; url: string }>()
  const [failedUrl, setFailedUrl] = useState<string>()
  const source = profile.profilePhotoUrl ?? ''
  useEffect(() => {
    if (!token || !/^\/players\/[0-9a-f-]{36}\/avatar\/[0-9a-f-]{36}$/i.test(source)) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    void fetch(API_BASE + source, {
      headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return
      const photo = await response.blob()
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(photo)
      setImage({ source, url: objectUrl })
    }).catch(() => {})
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [source, token])
  const url = preview ?? (image?.source === source ? image.url : source.startsWith('https://') ? source : undefined)
  const initials = [profile.firstName, profile.lastName].map(name => name.trim().slice(0, 1)).join('').toUpperCase()
  return <span className={className + ' relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-500 text-2xl font-bold text-white'} aria-hidden="true">
    {initials}
    {url && failedUrl !== url && <img src={url} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailedUrl(url)} />}
  </span>
}

function category(profile: SportingProfile) {
  if (!profile.baseCategoryName) return 'Sin categoría'
  const draw = profile.gender === 'MALE' ? 'Caballeros' : profile.gender === 'FEMALE' ? 'Damas' : ''
  return [profile.baseCategoryName, draw].filter(Boolean).join(' ')
}

export function PlayerProfilePage() {
  const { playerId } = useParams()
  const own = !playerId
  const navigate = useNavigate()
  const location = useLocation()
  const fromSearch = location.state?.fromSearch
  const { logout } = useAuth()
  const profile = usePlayerProfile(playerId)
  const data = hideProfileOn(profile.error) ? undefined : profile.data
  const contact = data && 'email' in data ? data as OwnProfile : undefined
  const history = own ? '/app/my-tournaments?tab=historial' : '/app/players/' + playerId + '/history'

  return <>
    <ProfileHeader title={own ? 'Perfil' : 'Perfil de jugador'} back={own ? undefined : () => {
      if (fromSearch) navigate(-1)
      else navigate('/app/players', { replace: true })
    }}>
      {own && <details className="relative">
        <summary aria-label="Opciones del perfil" className="grid h-11 w-11 cursor-pointer list-none place-items-center">
          <MoreVertical size={20} />
        </summary>
        <div className="absolute right-0 top-full w-44 rounded-lg border border-divider bg-surface p-1 text-dark-900 shadow">
          <Link className="block px-3 py-3 text-sm" to="/app/settings/security">Seguridad</Link>
          <button type="button" className="w-full px-3 py-3 text-left text-sm" onClick={() => logout()}>Cerrar sesión</button>
        </div>
      </details>}
    </ProfileHeader>
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 pt-5">
      {location.state?.saved && <p role="status" className="rounded-lg bg-[#f8f9e9] p-3 text-sm">Perfil actualizado</p>}
      {profile.isPending && <ProfileSkeleton />}
      {profile.isError && <ProfileError onRetry={() => { void profile.refetch() }} />}
      {data && <>
        <section className="relative rounded-[20px] bg-[#f8f9e9] p-4">
          <div className={'flex items-center gap-3 ' + (own ? 'pr-11' : '')}>
            <ProfileAvatar profile={data} />
            <div className="min-w-0">
              <h2 className="break-words text-2xl font-semibold leading-8">{data.firstName} {data.lastName}</h2>
              {data.city && <p className="mt-1 break-words text-[13px] text-[#605e64]">{data.city}</p>}
            </div>
          </div>
          {own && <Button asChild variant="ghost" size="icon" className="absolute right-4 top-4 h-11 w-11 text-[#605e64]">
            <Link to="/app/settings/edit" aria-label="Editar perfil"><Pencil size={18} /></Link>
          </Button>}
          <p className="mt-3 text-xs leading-4 text-[#605e64]">Categoría global</p>
          <p className="mt-1 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold">{category(data)}</p>
          {contact && <div className="mt-3 space-y-1 border-t border-[#dedfd4] pt-3 text-sm leading-5 text-[#605e64]">
            <p className="flex min-w-0 items-start gap-2"><Mail size={16} className="mt-0.5 shrink-0" /><span className="break-all">{contact.email}</span></p>
            <p className="flex items-start gap-2"><Phone size={16} className="mt-0.5 shrink-0" />{contact.phone || 'Sin teléfono'}</p>
          </div>}
        </section>
        <details className="py-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
            <h2 className="grow text-sm font-semibold">Categorías por club</h2>
            <span className="text-xs">{data.clubCategories.length} {data.clubCategories.length === 1 ? 'club' : 'clubes'}</span>
            <ChevronDown size={16} className="text-[#605e64]" />
          </summary>
          {data.clubCategories.length === 0 && <p className="text-sm text-[#605e64]">Sin categorías por club.</p>}
          {data.clubCategories.map(item => <div key={item.clubId} className="flex flex-wrap justify-between gap-2 border-b border-divider py-2 text-sm">
            <span>{item.clubName}</span><span>{item.categoryName ?? 'Sin categoría'}{own && item.observed ? ' · Observado' : ''}</span>
          </div>)}
        </details>
        <section className="rounded-2xl bg-dark-900 p-5 text-white">
          <h2 className="mb-3 text-sm font-semibold">Rendimiento global · Histórico</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div className="flex flex-col-reverse gap-1"><dt className="text-xs">Partidos jugados</dt>
              <dd className="flex items-center gap-2 text-4xl font-semibold text-primary-500"><Circle size={19} />{data.stats.matchesPlayed}</dd></div>
            <div className="flex flex-col-reverse gap-1"><dt className="text-xs">Partidos ganados</dt>
              <dd className="flex items-center gap-2 text-4xl font-semibold text-primary-500"><TrophyOutlineIcon size={18} />{data.stats.matchesWon}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="recent-tournaments">
          <div className="flex items-center justify-between gap-2">
            <h2 id="recent-tournaments" className="text-sm font-semibold">Últimos torneos</h2>
            <Link to={history} state={own ? undefined : { fromProfile: true, fromSearch }} className="py-3 text-sm font-medium text-[#626700]">Ver historial</Link>
          </div>
          {data.recentTournaments.length === 0 && <p className="py-3 text-sm text-[#605e64]">Todavía no hay torneos finalizados.</p>}
          {data.recentTournaments.map(item => <div key={item.eventId + item.divisionId} className="flex min-h-[72px] items-center justify-between gap-3 text-sm">
            <div><p className="font-semibold">{item.tournamentName}</p><p className="text-xs text-[#605e64]">{item.categoryName} · {month.format(utcDate(item.endDate))}</p></div>
            <span className="rounded-full bg-[#f8f9e9] px-3 py-1 text-center text-xs text-[#626700]">{resultLabel[item.result]}</span>
          </div>)}
        </section>
      </>}
    </div>
  </>
}

export function PlayerHistoryPage() {
  const { playerId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const profile = usePlayerProfile(playerId)
  const history = useSportingHistory(playerId)
  const rows = hideProfileOn(history.error) ? [] : history.data?.pages.flatMap(page => page.items) ?? []
  const name = profile.data && !hideProfileOn(profile.error) ? profile.data.firstName + ' ' + profile.data.lastName : null
  return <>
    <ProfileHeader title={name ? 'Historial de ' + name : 'Historial de torneos'} back={() => {
      if (location.state?.fromProfile) navigate(-1)
      else navigate('/app/players/' + playerId, { replace: true })
    }} />
    <div className="mx-auto flex max-w-[560px] flex-col gap-3 pt-5">
      {history.isPending && <ProfileSkeleton />}
      {history.isError && <ProfileError onRetry={() => { void history.refetch() }}>No pudimos cargar el historial.</ProfileError>}
      {history.isSuccess && rows.length === 0 && <p className="text-sm text-[#605e64]">Todavía no hay torneos finalizados.</p>}
      {rows.map(item => <Link key={item.eventId + item.divisionId} to={tournamentResultsPath(playerId, item)}
        state={{ fromHistory: true }} className="rounded-2xl border border-divider bg-surface text-sm">
        <div className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold">{item.tournamentName}</h2>
            <span className="rounded-lg bg-primary-500 px-2 py-1 text-xs">Finalizado</span>
          </div>
          <p className="text-[#605e64]">{item.clubName}</p>
          <p className="flex items-center gap-2 text-xs text-[#605e64]"><CalendarTodayIcon color="#605E64" size={20} />{date.format(utcDate(item.endDate))}</p>
        </div>
        <dl className="space-y-1 border-t border-[#b6b5b7] px-4 py-2 text-[#605e64]">
          <div className="flex justify-between gap-2"><dt>Categoría</dt><dd className="font-semibold">{item.categoryName}</dd></div>
          <div className="flex justify-between gap-2"><dt>Instancia</dt><dd>{resultLabel[item.result]}</dd></div>
        </dl>
      </Link>)}
      {history.hasNextPage && <Button type="button" variant="secondary" loading={history.isFetchingNextPage} onClick={() => { void history.fetchNextPage() }}>Ver más</Button>}
    </div>
  </>
}

export function TournamentResultsPage() {
  const { playerId = '', eventId = '', divisionId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const active = new URLSearchParams(location.search).get('active') === '1'
  const query = useTournamentResults(playerId, eventId, divisionId, active)
  const data = hideProfileOn(query.error) ? undefined : query.data
  return <>
    <ProfileHeader title={active ? 'Detalle del torneo' : 'Resultados oficiales'} back={() => {
      if (location.state?.fromHistory) navigate(-1)
      else if (active) navigate('/app/my-tournaments', { replace: true })
      else navigate('/app/players/' + playerId + '/history', { replace: true })
    }} />
    <div className="mx-auto flex max-w-[560px] flex-col gap-3 pt-5">
      {query.isPending && <ProfileSkeleton />}
      {query.isError && <ProfileError onRetry={() => { void query.refetch() }}>{active ? 'No pudimos cargar el torneo.' : 'No pudimos cargar los resultados.'}</ProfileError>}
      {data && <>
        <h2 className="text-lg font-semibold">{data.tournament}</h2>
        <p className="text-sm text-[#605e64]">{data.category}</p>
        {active && <section className="space-y-2 rounded-2xl border border-divider p-4 text-sm">
          <p>{data.registration === 'WAITLIST' ? 'En lista de espera' : 'Inscripción confirmada'}</p>
          <h3 className="font-semibold">Próximo partido</h3>
          {data.nextMatch ? <>
            <p>{new Date(data.nextMatch.startsAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })}</p>
            <p>{data.nextMatch.venue} · {data.nextMatch.court}</p>
          </> : <p>Todavía no hay un partido programado.</p>}
        </section>}
        {!active && !data.matches.length && <p className="text-sm">Resultado no disponible</p>}
        {data.matches.map(match => <article key={match.id} className="space-y-2 rounded-2xl border border-divider p-4 text-sm">
          <h3 className="font-semibold">{match.home} vs. {match.away}</h3>
          <p>{match.walkover ? 'Walkover' : match.sets.length ? match.sets.map(set => set.home + '–' + set.away).join(' · ') : 'Marcador no disponible'}</p>
          <p className="text-[#605e64]">Ganadores: {match.winner}</p>
        </article>)}
      </>}
    </div>
  </>
}
