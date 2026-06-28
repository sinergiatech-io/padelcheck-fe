import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type DrawerSide = 'left' | 'right'

type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: DrawerSide
  children: ReactNode
  /** Extra classes for the sliding panel (not the overlay). */
  panelClassName?: string
}

/**
 * Drawer mínimo para mobile (< md): overlay + panel lateral.
 * Se monta en `document.body` para evitar clipping por overflow del layout.
 */
export function Drawer({
  open,
  onOpenChange,
  side = 'left',
  children,
  panelClassName,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const node = (
    <div
      className="fixed inset-0 z-50 md:hidden"
      aria-modal="true"
      role="dialog"
    >
      <button
        type="button"
        className="absolute inset-0 bg-dark-900/40"
        aria-label="Cerrar menú"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'absolute inset-y-0 flex w-[min(18rem,100vw-2rem)] flex-col bg-surface shadow-lg',
          side === 'left' ? 'left-0 border-r border-divider' : 'right-0 border-l border-divider',
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
