import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import clubIcon from '@/assets/auth/club.svg?url'
import eyeIcon from '@/assets/auth/eye.svg?url'
import personIcon from '@/assets/auth/person.svg?url'
import { login as loginRequest } from '@/features/auth/api/login'
import { acceptedReturnPath, resolveAccessDestination } from '@/features/auth/access-destination'
import { AUTH_COPY, loginErrorMessage } from '@/features/auth/auth-copy'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { useAuth } from '@/context/AuthContext'
import { consumeLoginNotice } from '@/features/auth/login-notice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const fieldClass =
  'h-14 rounded-lg border-[#929195] px-4 text-sm font-medium text-[#120F18] placeholder:text-[#605E64] shadow-none'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(() =>
    consumeLoginNotice() === 'expired' || searchParams.get('notice') === 'expired'
      ? AUTH_COPY.expired
      : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setFormError(null)
    try {
      const data = await loginRequest(values)
      const accepted = login(data.accessToken, data.context, data.expiresIn)
      if (!accepted) return
      const destination = resolveAccessDestination(data.context.accessContexts)
      navigate(acceptedReturnPath('web', destination, searchParams.get('returnUrl')), { replace: true })
    } catch (error) {
      setFormError(loginErrorMessage(error))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AuthScreen>
      <h1 className="text-2xl font-semibold leading-8 text-[#120F18]">Iniciar sesión</h1>
      <Form {...form}>
        <form className="mt-4 flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-[#120F18]">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="nombre@correo.com"
                    className={fieldClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium text-[#120F18]">Contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Ingresá tu contraseña"
                      className={`${fieldClass} pr-12`}
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <img src={eyeIcon} alt="" className="h-6 w-6" />
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {formError ? (
            <p role="alert" className="text-sm font-medium text-error">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="h-12 w-full rounded-lg text-sm font-medium"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </form>
      </Form>
      <p className="mt-6 text-base leading-6 text-[#605E64]">¿No tenés cuenta? Registrate como</p>
      <div className="mt-3 grid grid-cols-2 gap-3" aria-describedby="register-unavailable">
        <button
          type="button"
          disabled
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#929195] text-sm font-medium text-[#120F18] opacity-60"
        >
          <img src={personIcon} alt="" className="h-5 w-5" />
          Jugador
        </button>
        <button
          type="button"
          disabled
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#929195] text-sm font-medium text-[#120F18] opacity-60"
        >
          <img src={clubIcon} alt="" className="h-5 w-5" />
          Club
        </button>
      </div>
      <p id="register-unavailable" className="mt-2 text-sm text-[#605E64]">
        {AUTH_COPY.registerLater}
      </p>
    </AuthScreen>
  )
}
