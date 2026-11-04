import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CatalogPlan, CatalogView, ownerApi, ownerError } from './api'
import { OwnerNotice, OwnerShell } from './OwnerShell'

const LIMITS = [
  ['MAX_ACTIVE_TOURNAMENTS', 'Torneos activos'],
  ['MAX_ENTRIES_PER_EVENT', 'Parejas por torneo'],
  ['MAX_DIVISIONS_PER_EVENT', 'Divisiones por torneo'],
  ['MAX_STAFF_USERS', 'Usuarios staff'],
] as const

const CAPABILITIES = [
  ['ADVANCED_STATS', 'Estadísticas avanzadas'],
  ['CUSTOM_BRANDING', 'Marca propia'],
  ['PRIORITY_SUPPORT', 'Soporte prioritario'],
] as const

interface Draft {
  name: string
  description: string
  reason: string
  limits: Record<string, string>
  unlimited: Record<string, boolean>
  capabilities: Record<string, boolean>
  amount: string
  currency: string
  period: 'MONTH' | 'YEAR'
}

function draftFrom(plan: CatalogPlan): Draft {
  const limits: Record<string, string> = {}
  const unlimited: Record<string, boolean> = {}
  const capabilities: Record<string, boolean> = {}
  for (const [key] of LIMITS) {
    const feature = plan.features.find((item) => item.key === key)
    unlimited[key] = feature?.state === 'UNLIMITED'
    limits[key] = feature?.state === 'LIMITED' && feature.limit != null ? String(feature.limit) : ''
  }
  for (const [key] of CAPABILITIES) {
    capabilities[key] = plan.features.find((item) => item.key === key)?.state === 'ENABLED'
  }
  return {
    name: plan.name,
    description: plan.description ?? '',
    reason: '',
    limits,
    unlimited,
    capabilities,
    amount: plan.price.amount ?? '',
    currency: plan.price.currency ?? 'ARS',
    period: plan.price.period === 'YEAR' ? 'YEAR' : 'MONTH',
  }
}

export function OwnerCatalogPage() {
  const [view, setView] = useState<CatalogView | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyCode, setBusyCode] = useState<string | null>(null)

  async function load() {
    const next = await ownerApi.catalog()
    setView(next)
    setDrafts(Object.fromEntries(next.plans.map((plan) => [plan.code, draftFrom(plan)])))
  }

  useEffect(() => {
    load().catch((caught) => setError(ownerError(caught)))
  }, [])

  function update(code: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [code]: { ...current[code], ...patch } }))
  }

  async function save(event: FormEvent, plan: CatalogPlan) {
    event.preventDefault()
    const draft = drafts[plan.code]
    if (!draft) return
    const limits: Record<string, number | null> = {}
    for (const [key] of LIMITS) {
      if (draft.unlimited[key]) {
        limits[key] = null
        continue
      }
      const parsed = Number(draft.limits[key])
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError(`El límite de ${key} tiene que ser un entero o quedar sin techo.`)
        return
      }
      limits[key] = parsed
    }
    setBusyCode(plan.code)
    setError(null)
    setNotice(null)
    try {
      await ownerApi.updatePlan(plan.code, {
        name: draft.name,
        description: draft.description,
        reason: draft.reason,
        limits,
        capabilities: draft.capabilities,
        price: plan.free ? null : {
          amount: draft.amount,
          currency: draft.currency,
          period: draft.period,
        },
      })
      await load()
      setNotice(`${plan.code} quedó actualizado.`)
    } catch (caught) {
      setError(ownerError(caught))
    } finally {
      setBusyCode(null)
    }
  }

  return (
    <OwnerShell title="Catálogo de planes">
      {error && <OwnerNotice error message={error} />}
      {notice && <OwnerNotice message={notice} />}
      {view === null && !error && <p className="text-sm text-dark-700">Cargando planes…</p>}
      <div className="space-y-6">
        {view?.plans.map((plan) => {
          const draft = drafts[plan.code]
          if (!draft) return null
          return (
            <Card key={plan.code}>
              <CardHeader><CardTitle>{plan.code}</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3" onSubmit={(event) => void save(event, plan)}>
                  <label className="space-y-1 text-sm"><Label>Nombre</Label>
                    <Input value={draft.name} onChange={(event) => update(plan.code, { name: event.target.value })} required />
                  </label>
                  <label className="space-y-1 text-sm"><Label>Descripción</Label>
                    <Textarea value={draft.description} onChange={(event) => update(plan.code, { description: event.target.value })} />
                  </label>
                  {LIMITS.map(([key, label]) => (
                    <div key={key} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                      <label className="space-y-1 text-sm"><Label>{label}</Label>
                        <Input
                          inputMode="numeric"
                          disabled={draft.unlimited[key]}
                          value={draft.unlimited[key] ? '' : draft.limits[key]}
                          onChange={(event) => update(plan.code, { limits: { ...draft.limits, [key]: event.target.value } })}
                        />
                      </label>
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draft.unlimited[key]}
                          onChange={(event) => update(plan.code, { unlimited: { ...draft.unlimited, [key]: event.target.checked } })}
                        />
                        Sin techo
                      </label>
                    </div>
                  ))}
                  {CAPABILITIES.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.capabilities[key]}
                        onChange={(event) => update(plan.code, { capabilities: { ...draft.capabilities, [key]: event.target.checked } })}
                      />
                      {label}
                    </label>
                  ))}
                  {!plan.free && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="space-y-1 text-sm"><Label>Precio</Label>
                        <Input value={draft.amount} onChange={(event) => update(plan.code, { amount: event.target.value })} required />
                      </label>
                      <label className="space-y-1 text-sm"><Label>Moneda</Label>
                        <Input value={draft.currency} maxLength={3} onChange={(event) => update(plan.code, { currency: event.target.value })} required />
                      </label>
                      <label className="space-y-1 text-sm"><Label>Período</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-divider bg-surface px-3 text-sm"
                          value={draft.period}
                          onChange={(event) => update(plan.code, { period: event.target.value as 'MONTH' | 'YEAR' })}
                        >
                          <option value="MONTH">Mensual</option>
                          <option value="YEAR">Anual</option>
                        </select>
                      </label>
                    </div>
                  )}
                  <label className="space-y-1 text-sm"><Label>Motivo</Label>
                    <Textarea value={draft.reason} onChange={(event) => update(plan.code, { reason: event.target.value })} required />
                  </label>
                  <Button type="submit" loading={busyCode === plan.code} loadingLabel="Guardando">Guardar {plan.code}</Button>
                </form>
              </CardContent>
            </Card>
          )
        })}
        {view && (
          <Card>
            <CardHeader><CardTitle>Historial del catálogo</CardTitle></CardHeader>
            <CardContent>
              {view.history.length === 0 && <p className="text-sm text-dark-700">Todavía no hay cambios.</p>}
              <ul className="space-y-3">
                {view.history.map((entry, index) => (
                  <li key={`${entry.createdAt}-${index}`} className="text-sm">
                    <p className="font-medium">{entry.planCode}</p>
                    <p>{entry.reason}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerShell>
  )
}
