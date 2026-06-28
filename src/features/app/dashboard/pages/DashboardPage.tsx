import { useLocation } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'
import { displayName } from '@/types/auth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sectionTitles: Record<string, string> = {
  [ROUTES.dashboard]: 'Dashboard',
  [ROUTES.tournaments]: 'Torneos',
  [ROUTES.categories]: 'Categorías',
  [ROUTES.players]: 'Jugadores',
  [ROUTES.pairs]: 'Parejas',
  [ROUTES.courts]: 'Canchas',
  [ROUTES.matches]: 'Partidos',
  [ROUTES.settings]: 'Configuración',
}

export function DashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const path = location.pathname
  const title = sectionTitles[path] ?? 'Dashboard'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h2 text-dark-900">{title}</h1>
        <Badge variant="neutral">En construcción</Badge>
      </div>
      <p className="mt-1 text-body-sm text-dark-700">
        Bienvenido, {displayName(user) || user?.email}. Esta sección está en construcción.
      </p>
      <Card className="mt-8 shadow-card">
        <CardHeader>
          <CardTitle className="text-h4">Placeholder</CardTitle>
          <CardDescription>
            Contenido de <strong className="text-dark-900">{title}</strong> — placeholder para
            desarrollo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-body-sm text-dark-700">
            Próximamente: listados y formularios con el UI Kit.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
