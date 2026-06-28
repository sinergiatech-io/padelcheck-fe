import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LandingPage() {
  return (
    <div className="w-full px-4 py-10 md:px-10 md:py-24">
      <section className="mx-auto flex max-w-6xl flex-col items-center text-center">
        <h1 className="max-w-4xl text-display text-dark-900 md:text-[2.5rem] md:leading-[3rem]">
          Gestioná tus torneos de pádel en un solo lugar
        </h1>
        <p className="mt-4 max-w-3xl text-body text-dark-700">
          Padel Check es la plataforma para clubes que quieren organizar torneos, jugadores,
          parejas y partidos de forma simple y profesional.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <Link to={ROUTES.register}>Crear cuenta gratis</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link to={ROUTES.login}>Iniciar sesión</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto mt-16 max-w-6xl md:mt-24">
        <h2 className="text-center text-h2 text-dark-900">Beneficios</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-h4">Torneos organizados</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-body-sm text-dark-700">
                Creá categorías, fixtures y cargá resultados desde una sola pantalla.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-h4">Jugadores y parejas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-body-sm text-dark-700">
                Mantené el padrón de jugadores y armá parejas para cada torneo.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-h4">Canchas y partidos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-body-sm text-dark-700">
                Asigná canchas, horarios y seguí el estado de cada partido.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
