import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 text-body text-dark-900 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-dark-900 placeholder:text-dark-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

/** Wrap input with optional left icon; add `pl-10` to Input when using left slot. */
function InputGroup({
  className,
  left,
  children,
}: {
  className?: string
  left?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={cn('relative', className)}>
      {left != null ? (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-dark-700">
          {left}
        </span>
      ) : null}
      {children}
    </div>
  )
}

export { Input, InputGroup }
