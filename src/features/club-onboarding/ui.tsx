import type { ReactNode, Ref } from 'react'
import { Input } from '@/components/ui/input'
import { ButtonLoadingContent } from '@/components/ui/button-loading-content'
import { registrationFieldClass } from '@/features/auth/components/RegistrationShell'

export function StepHeading({ step, title, subtitle, titleRef }: { step: string; title: string; subtitle?: string; titleRef: Ref<HTMLHeadingElement> }) {
  return <div className="flex flex-col gap-2 pb-2">
    <p className="text-sm font-semibold leading-5 text-[#605E64]">{step}</p>
    <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-semibold leading-8 outline-none">{title}</h1>
    {subtitle && <p className="text-base leading-6 text-[#605E64]">{subtitle}</p>}
  </div>
}

/** Scrollable content + footer that stays outside the scroll, so the CTA never moves under the keyboard or the error banners. */
export function StepFrame({ children, footer, as: Tag = 'div', onSubmit, divider }: { children: ReactNode; footer: ReactNode; as?: 'div' | 'form'; onSubmit?: (event: React.FormEvent) => void; divider?: boolean }) {
  const props = Tag === 'form' ? { noValidate: true, onSubmit } : {}
  return <Tag {...props} className="flex min-h-0 flex-1 flex-col">
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-6">{children}</div>
    <div className={`flex shrink-0 flex-col gap-2 px-4 pb-6 pt-4 ${divider ? 'border-t border-[#E7E7E8]' : ''}`}>{footer}</div>
  </Tag>
}

export function PrimaryButton({ label, loading, disabled, onClick, type = 'button' }: { label: string; loading?: boolean; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit' }) {
  return <button type={type} onClick={onClick} disabled={loading || disabled} aria-busy={loading || undefined} aria-label={loading ? `${label}…` : undefined}
    className={`flex h-12 w-full shrink-0 items-center justify-center rounded-[8px] text-sm font-medium ${loading || disabled ? 'bg-[#EEF0C1]' : 'bg-[#C9CF38]'} ${disabled && !loading ? 'text-[#605E64]' : ''}`}>
    <ButtonLoadingContent loading={!!loading}>{label}</ButtonLoadingContent>
  </button>
}
export function TextButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="mt-1 flex h-12 w-full items-center justify-center text-sm font-medium disabled:text-[#929195]">{label}</button>
}

export function TextField({ id, label, value, onChange, error, required, optional, type = 'text', autoComplete, placeholder, disabled, maxLength, trailing, inputMode }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; optional?: boolean
  type?: string; autoComplete?: string; placeholder?: string; disabled?: boolean; maxLength?: number; trailing?: ReactNode; inputMode?: 'tel' | 'email' | 'text'
}) {
  return <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium leading-5">{label}
      {required && <span className="ml-0.5 text-[#EF4444]" aria-hidden="true">*</span>}
      {optional && <span className="ml-2 text-xs font-normal text-[#605E64]">(opcional)</span>}
    </label>
    <div className="relative">
      <Input id={id} value={value} disabled={disabled} required={required} maxLength={maxLength} type={type} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(event.target.value)}
        className={`${registrationFieldClass} ${error ? 'border-[#EF4444]' : ''} ${trailing ? 'pr-14' : ''}`} />
      {trailing}
    </div>
    {error && <p id={`${id}-error`} className="text-right text-sm font-medium leading-5 text-[#AA3030]">{error}</p>}
  </div>
}
