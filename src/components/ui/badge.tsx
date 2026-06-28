import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-dark-900 text-surface',
        primary: 'border-transparent bg-primary-500 text-dark-900',
        success: 'border-transparent bg-success text-white',
        warning: 'border-transparent bg-warning text-dark-900',
        destructive: 'border-transparent bg-error text-white',
        info: 'border-transparent bg-info text-white',
        neutral: 'border-divider bg-background text-dark-900',
        outline: 'border-divider bg-surface text-dark-900',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[0.65rem] leading-tight',
        default: 'text-caption',
        lg: 'px-3 py-1 text-body-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
