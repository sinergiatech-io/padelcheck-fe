import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const plans = [
  {
    name: 'Free',
    description: 'Para empezar y probar la plataforma',
    price: '$0',
    period: '/mes',
    features: ['Hasta 2 torneos activos', 'Hasta 50 jugadores', 'Gestión básica'],
    cta: 'Empezar gratis',
    href: ROUTES.register,
    highlighted: false,
  },
  {
    name: 'Pro',
    description: 'Para clubes en crecimiento',
    price: 'Próximamente',
    period: '',
    features: ['Torneos ilimitados', 'Jugadores ilimitados', 'Soporte prioritario'],
    cta: 'Contactar',
    href: ROUTES.register,
    highlighted: true,
  },
]

export function PricingPage() {
  return (
    <div className="w-full px-4 py-10 md:px-10 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-display text-dark-900 md:text-[2.5rem] md:leading-[3rem]">
          Planes y precios
        </h1>
        <p className="mt-4 text-body text-dark-700">
          Empezá con el plan Free y mejorá cuando lo necesites.
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={
              plan.highlighted
                ? 'border-dark-900 bg-primary-100/40 shadow-card'
                : 'shadow-card'
            }
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-h2">{plan.name}</CardTitle>
                <CardDescription className="mt-1 text-body-sm text-dark-700">
                  {plan.description}
                </CardDescription>
              </div>
              {plan.highlighted ? <Badge variant="primary">Destacado</Badge> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold text-dark-900">
                {plan.price}
                <span className="text-base font-normal text-dark-700">{plan.period}</span>
              </p>
              <ul className="list-inside list-disc space-y-2 text-body-sm text-dark-800">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.highlighted ? 'primary' : 'secondary'} asChild>
                <Link to={plan.href}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
