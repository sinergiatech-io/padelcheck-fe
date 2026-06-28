import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EventStatus } from '../types'

const statusMeta: Record<EventStatus, { label: string; variant: 'neutral' | 'primary' | 'success' | 'destructive' }> =
  {
    DRAFT: { label: 'Borrador', variant: 'neutral' },
    INSCRIPTION_OPEN: { label: 'Inscripciones abiertas', variant: 'primary' },
    INSCRIPTION_CLOSED: { label: 'Cerrado', variant: 'neutral' },
    IN_PROGRESS: { label: 'Torneo en curso', variant: 'success' },
    FINISHED: { label: 'Finalizado', variant: 'success' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  }

export function EventStatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const meta = statusMeta[status]
  return (
    <Badge variant={meta.variant} className={cn(className)}>
      {meta.label}
    </Badge>
  )
}
