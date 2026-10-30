import type { ReactNode } from 'react'
import spinner from '@/assets/ui/button-spinner.svg?url'
import { cn } from '@/lib/utils'

/** Preserve the label's geometry while replacing it visually on mobile. */
export function ButtonLoadingContent({
  loading,
  mobileOnly = true,
  children,
}: {
  loading: boolean
  mobileOnly?: boolean
  children: ReactNode
}) {
  return (
    <span className="inline-grid items-center justify-items-center" aria-hidden={loading || undefined}>
      <span className={cn('[grid-area:1/1] inline-flex items-center justify-center gap-2',
        loading && (mobileOnly ? 'invisible md:visible' : 'invisible'))}>
        {children}
      </span>
      {loading && (
        <img
          src={spinner}
          alt=""
          width={20}
          height={20}
          className={cn('[grid-area:1/1] h-5 w-5 animate-spin [animation-duration:800ms] motion-reduce:animate-none',
            mobileOnly && 'md:hidden')}
        />
      )}
    </span>
  )
}
