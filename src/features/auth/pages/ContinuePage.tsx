import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { AUTH_COPY, continueMessage } from '@/features/auth/auth-copy'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { useAuth } from '@/context/AuthContext'
import { accessChoices, destinationPath } from '@/features/auth/access-destination'
import { AddPlayerActivity, useAddClubActivity } from '@/features/auth/components/GoogleJourney'
import { Button } from '@/components/ui/button'

export function ContinuePage() {
  const { user, destination, chooseContext, retryValidation, logout } = useAuth()
  const [params] = useSearchParams()
  const reason = destination?.kind === 'continue' ? destination.reason : 'unavailable'
  const message = continueMessage(reason)
  const navigate = useNavigate()
  const location = useLocation()
  const choices = accessChoices(user?.accessContexts)
  const [addPlayer, setAddPlayer] = useState(false)
  const club = useAddClubActivity()
  const hasPlayer = choices.some(choice => choice.activity === "PLAYER")
  const hasClub = choices.some(choice => choice.activity === "CLUB")
  if (addPlayer && hasClub && !hasPlayer) return <AddPlayerActivity onClose={() => setAddPlayer(false)} />
  const account = params.get("account") === "1"
  if (reason === "multiple-activities" || account) return <AuthScreen>
    <h1 className="text-2xl font-semibold leading-8">{choices.length > 1 ? "Elegí cómo continuar" : "Tu cuenta"}</h1>
    <div className="mt-8 flex flex-col gap-4">
      {choices.map(choice => <Button key={choice.key} type="button" variant="secondary" className="min-h-[80px]" onClick={() => {
        if (!chooseContext(choice.key)) return
        navigate(choice.destination.kind === "continue" ? ROUTES.registerClub : destinationPath("web", choice.destination), { replace: true })
      }}>{choice.activity === "PLAYER" ? "Como jugador" : "Administrar mi club"}</Button>)}
    </div>
    {account && <div className="mt-5 flex flex-col gap-3">
      {hasClub && !hasPlayer && <Button type="button" variant="secondary" onClick={() => setAddPlayer(true)}>Crear perfil de jugador</Button>}
      {hasPlayer && !hasClub && <Button type="button" variant="secondary" disabled={club.busy} onClick={club.addClub}>Registrar mi club</Button>}
      {user?.hasLocalPassword === false && <Button type="button" variant="secondary" onClick={() => navigate("/forgot-password")}>Crear contraseña</Button>}
      {club.error && <p role="alert" className="text-[#AA3030]">{club.error}</p>}
    </div>}
    <div className="mt-auto flex flex-col gap-2 pt-8">
      {account && destination && <Button type="button" variant="secondary" className="h-12" onClick={() => {
        if (location.state?.fromAccountMenu === true) navigate(-1)
        else navigate(destinationPath("web", destination), { replace: true })
      }}>Cancelar</Button>}
      {!account && <Button type="button" variant="secondary" className="h-12" onClick={() => logout()}>Volver al acceso</Button>}
    </div>
  </AuthScreen>

  return (
    <AuthScreen>
      <h1 className="text-2xl font-semibold leading-8 text-[#120F18]">{message.title}</h1>
      {message.detail ? <p className="mt-3 text-base leading-6 text-[#605E64]">{message.detail}</p> : null}
      <div className="mt-8 flex flex-col gap-3">
        {reason === 'pending-setup' ? (
          <Button type="button" className="h-12 w-full rounded-lg" onClick={() => navigate(ROUTES.registerClub)}>
            {AUTH_COPY.continueRegistration}
          </Button>
        ) : null}
        <Button type="button" variant={reason === 'pending-setup' ? 'secondary' : 'primary'} className="h-12 w-full rounded-lg" onClick={retryValidation}>
          {AUTH_COPY.retry}
        </Button>
        <Button type="button" variant="secondary" className="h-12 w-full rounded-lg" onClick={() => logout()}>
          {AUTH_COPY.backToAccess}
        </Button>
      </div>
    </AuthScreen>
  )
}
