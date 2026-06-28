import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { login as loginRequest } from '@/features/auth/api/login'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      login(data.accessToken, data.context)
      const returnUrl = searchParams.get('returnUrl')
      navigate(returnUrl || ROUTES.app, { replace: true })
    },
  })

  const onSubmit = (values: LoginFormValues) => {
    mutation.mutate(values)
  }

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresá con tu email y contraseña para acceder al sistema.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="tu@club.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mutation.isError ? (
                <p className="text-caption font-medium text-error">
                  {(mutation.error as Error)?.message ?? 'Error al iniciar sesión'}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Ingresando...' : 'Entrar'}
              </Button>
              <Button variant="secondary" className="w-full" type="button" asChild>
                <Link to={ROUTES.designSystem}>Ver Design System</Link>
              </Button>
            </CardContent>
          </form>
        </Form>
        <CardFooter className="flex flex-col gap-4 border-t border-divider pt-6">
          <p className="text-center text-body-sm text-dark-700">
            ¿No tenés cuenta?{' '}
            <Link
              to={ROUTES.register}
              className="font-semibold text-dark-900 underline underline-offset-2"
            >
              Registrarse
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
