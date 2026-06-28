import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function RegisterPage() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Registrá tu club y empezá a gestionar torneos en minutos.
          </CardDescription>
        </CardHeader>
        <form>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clubName">Nombre del club</Label>
              <Input id="clubName" type="text" name="clubName" placeholder="Club Ejemplo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Nombre del administrador</Label>
              <Input id="adminName" type="text" name="adminName" placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@club.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" name="password" autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="font-normal text-dark-700/70">(opcional)</span>
              </Label>
              <Input id="phone" type="tel" name="phone" placeholder="+54 11 1234-5678" />
            </div>
            <Button type="submit" className="w-full">
              Crear cuenta
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col gap-4 border-t border-divider pt-6">
          <p className="text-center text-body-sm text-dark-700">
            ¿Ya tenés cuenta?{' '}
            <Link
              to={ROUTES.login}
              className="font-semibold text-dark-900 underline underline-offset-2"
            >
              Iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
