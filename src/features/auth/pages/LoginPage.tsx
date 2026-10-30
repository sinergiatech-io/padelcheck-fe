import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import clubIcon from '@/assets/auth/club.svg?url'
import eyeOffIcon from '@/assets/auth/eye.svg?url'
import eyeOnIcon from '@/assets/auth/eye-on.svg?url'
import googleLabel from '@/assets/auth/google-label.svg?url'
import googleMark from '@/assets/auth/google-g.png'
import personIcon from '@/assets/auth/person.svg?url'
import { login as loginRequest } from '@/features/auth/api/login'
import { acceptedReturnPath, resolveAccessDestination } from '@/features/auth/access-destination'
import { AUTH_COPY, loginErrorMessage, type LoginNotice } from '@/features/auth/auth-copy'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { LoginBanner } from '@/features/auth/components/LoginBanner'
import { useAuth } from '@/context/AuthContext'
import { consumeLoginNotice } from '@/features/auth/login-notice'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const fieldClass =
  'h-14 rounded-md border-[#929195] bg-[#FEFEFE] px-4 text-sm font-medium leading-5 text-[#120F18] placeholder:text-[#605E64] shadow-none focus-visible:ring-0'
const fieldErrorClass = 'border-[#EF4444]'
const messageClass = 'text-right text-sm font-medium leading-5 text-[#AA3030]'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<LoginNotice | null>(() =>
    consumeLoginNotice() === 'expired' || searchParams.get('notice') === 'expired'
      ? { tone: 'warning', title: AUTH_COPY.expired }
      : null,
  )
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const releaseBlocked = () => {
    setFormError((current) => (current?.code === 'AUTH_ACCOUNT_BLOCKED' ? null : current))
  }

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

  const paleSubmit = submitting || formError?.code === 'AUTH_ACCOUNT_BLOCKED'

  return (
    <AuthScreen>
      <h1 className="text-2xl font-semibold leading-8 text-[#120F18]">Iniciar sesión</h1>
      {formError ? (
        <div className="mt-4">
          <LoginBanner {...formError} />
        </div>
      ) : null}
      <Form {...form}>
        <form className="mt-4 flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-2 space-y-0">
                <FormLabel className="text-sm font-medium leading-5 text-[#120F18]">Email</FormLabel>
                <div className="w-full">
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="nombre@correo.com"
                      className={`${fieldClass} ${fieldState.error ? fieldErrorClass : ''}`}
                      {...field}
                      onChange={(event) => {
                        releaseBlocked()
                        field.onChange(event)
                      }}
                    />
                  </FormControl>
                  <FormMessage className={messageClass} />
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-2 space-y-0">
                <FormLabel className="text-sm font-medium leading-5 text-[#120F18]">Contraseña</FormLabel>
                <div className="w-full">
                <FormControl>
                  <div className="relative w-full">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Ingresá tu contraseña"
                      className={`${fieldClass} pr-12 ${fieldState.error ? fieldErrorClass : ''}`}
                      {...field}
                      onChange={(event) => {
                        releaseBlocked()
                        field.onChange(event)
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <img src={showPassword ? eyeOnIcon : eyeOffIcon} alt="" className="h-6 w-6" />
                    </button>
                  </div>
                </FormControl>
                <FormMessage className={messageClass} />
                </div>
              </FormItem>
            )}
          />
          <button
            type="button"
            disabled
            className="flex h-11 w-full items-center justify-center text-sm font-medium leading-5 text-[#120F18] disabled:opacity-100"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <button
            type="submit"
            className={`flex h-12 w-full items-center justify-center rounded-md text-sm font-medium leading-normal ${
              paleSubmit ? 'bg-[#EEF0C1] text-[#605E64]' : 'bg-[#C9CF38] text-[#120F18]'
            }`}
            disabled={paleSubmit}
            aria-busy={submitting}
          >
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </Form>
      <div className="mt-4 flex h-6 items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#E7E7E8]" />
        <span className="text-base font-normal leading-6 text-[#605E64]">o</span>
        <span className="h-px flex-1 bg-[#E7E7E8]" />
      </div>
      <button
        type="button"
        aria-label="Continuar con Google"
        className="mt-4 flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-white px-3"
      >
        <img src={googleMark} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
        <img src={googleLabel} alt="" width={142.674} height={13.496} />
      </button>
      <p className="mt-4 text-base leading-6 text-[#605E64]">¿No tenés cuenta? Registrate como</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          className="flex h-12 items-center justify-center gap-2 rounded-md border border-[#929195] pl-2 pr-4 text-sm font-medium leading-normal text-[#120F18] disabled:opacity-100"
        >
          <img src={personIcon} alt="" width={20} height={20} className="h-5 w-5" />
          Jugador
        </button>
        <button
          type="button"
          disabled
          className="flex h-12 items-center justify-center gap-2 rounded-md border border-[#929195] pl-2 pr-4 text-sm font-medium leading-normal text-[#120F18] disabled:opacity-100"
        >
          <img src={clubIcon} alt="" width={20} height={20.5} className="h-[20.5px] w-5" />
          Club
        </button>
      </div>
    </AuthScreen>
  )
}
