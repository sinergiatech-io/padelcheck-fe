import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function FaqPage() {
  const faqs = [
    {
      q: '¿Qué es Padel Check?',
      a: 'Es una plataforma SaaS para que los clubes de pádel gestionen torneos, jugadores, parejas, canchas y partidos en un solo lugar.',
    },
    {
      q: '¿Puedo probar gratis?',
      a: 'Sí. El plan Free permite empezar sin costo. Podés crear torneos y gestionar jugadores con límites pensados para probar la herramienta.',
    },
    {
      q: '¿Cómo me registro?',
      a: 'Hacé clic en Registrarse, completá los datos de tu club y del administrador, y en minutos podés empezar a usar el sistema.',
    },
  ]

  return (
    <div className="w-full px-4 py-10 md:px-10 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-display text-dark-900 md:text-[2.5rem] md:leading-[3rem]">
          Preguntas frecuentes
        </h1>
        <div className="mt-10 space-y-4">
          {faqs.map(({ q, a }) => (
            <Card key={q} className="shadow-card">
              <CardHeader>
                <CardTitle className="text-h4">{q}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-body-sm text-dark-700">{a}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
