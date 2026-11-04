import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ClubBilling,
  ClubSummary,
  MarkKind,
  PaymentMedium,
  PlanCode,
  ownerApi,
  ownerError,
} from './api'
import { OwnerNotice, OwnerShell } from './OwnerShell'

const fieldClass = 'flex h-9 w-full rounded-md border border-divider bg-surface px-3 text-sm'

const MEDIUMS: { value: PaymentMedium; label: string }[] = [
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'COURTESY', label: 'Cortesía' },
]

const MARKS: { value: MarkKind; label: string }[] = [
  { value: 'TO_FREE', label: 'Volver a FREE' },
  { value: 'TO_PRO', label: 'Pasar de ELITE a PRO' },
]

const ACTIONS: Record<string, string> = {
  REGISTER_PAYMENT: 'Pago registrado',
  CORRECT_PAYMENT: 'Pago corregido',
  ANNUL_PAYMENT: 'Pago anulado',
  MARK_CHANGE: 'Cambio marcado',
  ANNUL_MARK: 'Marca anulada',
  APPLY_SCHEDULE: 'Cambio aplicado',
  UPDATE_CATALOG: 'Catálogo actualizado',
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function OwnerBillingPage() {
  const [clubs, setClubs] = useState<ClubSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [club, setClub] = useState<ClubBilling | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [medium, setMedium] = useState<PaymentMedium>('TRANSFER')
  const [plan, setPlan] = useState<Exclude<PlanCode, 'FREE'>>('PRO')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('ARS')
  const [periodEnd, setPeriodEnd] = useState('')
  const [reason, setReason] = useState('')
  const [markKind, setMarkKind] = useState<MarkKind>('TO_FREE')
  const [markDate, setMarkDate] = useState('')
  const [proExit, setProExit] = useState('')
  const [markReason, setMarkReason] = useState('')
  const [correctPlan, setCorrectPlan] = useState<Exclude<PlanCode, 'FREE'>>('PRO')
  const [correctAmount, setCorrectAmount] = useState('')
  const [correctCurrency, setCorrectCurrency] = useState('ARS')
  const [correctStart, setCorrectStart] = useState('')
  const [correctEnd, setCorrectEnd] = useState('')
  const [correctReason, setCorrectReason] = useState('')
  const [annulReason, setAnnulReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  async function loadClubs() {
    setLoadError(null)
    try {
      setClubs(await ownerApi.clubs())
    } catch (caught) {
      setLoadError(ownerError(caught))
      setClubs([])
    }
  }

  useEffect(() => {
    void loadClubs()
  }, [])

  useEffect(() => {
    if (!club?.payment) return
    setCorrectPlan(club.payment.planCode)
    setCorrectAmount(club.payment.amount ?? '')
    setCorrectCurrency(club.payment.currency ?? 'ARS')
    setCorrectStart(club.payment.periodStart)
    setCorrectEnd(club.payment.periodEnd ?? '')
  }, [club?.payment])

  async function openClub(clubId: string) {
    setSelectedId(clubId)
    setNotice(null)
    setError(null)
    setBusy(true)
    try {
      setClub(await ownerApi.club(clubId))
    } catch (caught) {
      setClub(null)
      setError(ownerError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function run(action: () => Promise<ClubBilling>, done: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const next = await action()
      setClub(next)
      setNotice(done)
      await loadClubs()
    } catch (caught) {
      setError(ownerError(caught))
    } finally {
      setBusy(false)
    }
  }

  function submitPayment(event: FormEvent) {
    event.preventDefault()
    if (!selectedId) return
    const courtesy = medium === 'COURTESY'
    void run(() => ownerApi.pay(selectedId, {
      medium,
      planCode: plan,
      amount: blankToNull(amount) ?? (courtesy ? '0' : null),
      currency: courtesy && !blankToNull(amount) ? null : blankToNull(currency),
      periodEnd: blankToNull(periodEnd),
      reason,
    }), 'El pago quedó registrado.')
  }

  function submitMark(event: FormEvent) {
    event.preventDefault()
    if (!selectedId) return
    void run(() => ownerApi.mark(selectedId, {
      kind: markKind,
      effectiveOn: blankToNull(markDate),
      proExitOn: markKind === 'TO_PRO' ? blankToNull(proExit) : null,
      reason: markReason,
    }), 'La marca quedó registrada.')
  }

  function submitCorrection(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !club?.payment) return
    void run(() => ownerApi.correct(selectedId, club.payment!.id, {
      planCode: correctPlan,
      amount: blankToNull(correctAmount),
      currency: blankToNull(correctCurrency),
      periodStart: correctStart,
      periodEnd: blankToNull(correctEnd),
      reason: correctReason,
    }), 'El pago vigente quedó corregido.')
  }

  return (
    <OwnerShell title="Suscripciones">
      {loadError && <OwnerNotice error message={loadError} />}
      {clubs === null && <p className="text-sm text-dark-700">Cargando clubes…</p>}
      {clubs?.length === 0 && !loadError && <p className="text-sm text-dark-700">No hay clubes.</p>}
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <ul className="space-y-2">
          {clubs?.map((item) => (
            <li key={item.clubId}>
              <button
                type="button"
                onClick={() => void openClub(item.clubId)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedId === item.clubId ? 'border-primary-500 bg-surface' : 'border-divider bg-surface'}`}
              >
                <span className="block font-medium">{item.name}</span>
                <span className="text-dark-700">{item.planCode}{item.periodEnd ? ` · hasta ${item.periodEnd}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
        <section className="space-y-4">
          {!club && <p className="text-sm text-dark-700">Elegí un club para ver su suscripción.</p>}
          {error && <OwnerNotice error message={error} />}
          {notice && <OwnerNotice message={notice} />}
          {club && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{club.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Plan vigente: <strong>{club.planCode}</strong> · {club.status}</p>
                  <p>
                    {club.payment
                      ? `${labelMedium(club.payment.medium)} ${club.payment.planCode}, ${club.payment.amount ?? '0'} ${club.payment.currency ?? ''} · ${club.payment.periodStart} a ${club.payment.periodEnd ?? 'sin fecha de fin'}`
                      : 'Sin pago vigente.'}
                  </p>
                  <p>{club.mark ? `Marca ${club.mark.kind} el ${club.mark.effectiveOn}${club.mark.proExitOn ? `, salida de PRO el ${club.mark.proExitOn}` : ''}.` : 'Sin marca pendiente.'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Registrar pago</CardTitle></CardHeader>
                <CardContent>
                  <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitPayment}>
                    <label className="space-y-1 text-sm"><Label>Medio</Label>
                      <select className={fieldClass} value={medium} onChange={(event) => setMedium(event.target.value as PaymentMedium)}>
                        {MEDIUMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm"><Label>Plan</Label>
                      <select className={fieldClass} value={plan} onChange={(event) => setPlan(event.target.value as 'PRO' | 'ELITE')}>
                        <option value="PRO">PRO</option>
                        <option value="ELITE">ELITE</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm"><Label>Monto</Label>
                      <Input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={medium === 'COURTESY' ? '0' : ''} />
                    </label>
                    <label className="space-y-1 text-sm"><Label>Moneda</Label>
                      <Input value={currency} onChange={(event) => setCurrency(event.target.value)} maxLength={3} />
                    </label>
                    <label className="space-y-1 text-sm sm:col-span-2"><Label>Fin del período</Label>
                      <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                    </label>
                    <label className="space-y-1 text-sm sm:col-span-2"><Label>Motivo</Label>
                      <Textarea value={reason} onChange={(event) => setReason(event.target.value)} required />
                    </label>
                    <Button type="submit" loading={busy} loadingLabel="Guardando" className="sm:col-span-2">Registrar</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Marcar un cambio</CardTitle></CardHeader>
                <CardContent>
                  <form className="grid gap-3" onSubmit={submitMark}>
                    <label className="space-y-1 text-sm"><Label>Cambio</Label>
                      <select className={fieldClass} value={markKind} onChange={(event) => setMarkKind(event.target.value as MarkKind)}>
                        {MARKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm"><Label>Fecha</Label>
                      <Input type="date" value={markDate} onChange={(event) => setMarkDate(event.target.value)} />
                    </label>
                    {markKind === 'TO_PRO' && (
                      <label className="space-y-1 text-sm"><Label>Salida posterior a FREE</Label>
                        <Input type="date" value={proExit} onChange={(event) => setProExit(event.target.value)} />
                      </label>
                    )}
                    <label className="space-y-1 text-sm"><Label>Motivo</Label>
                      <Textarea value={markReason} onChange={(event) => setMarkReason(event.target.value)} required />
                    </label>
                    <Button type="submit" loading={busy} loadingLabel="Guardando">Marcar</Button>
                  </form>
                  {club.mark && (
                    <form className="mt-4 grid gap-3" onSubmit={(event) => {
                      event.preventDefault()
                      if (!selectedId) return
                      void run(() => ownerApi.annulMark(selectedId, cancelReason), 'La marca quedó anulada.')
                    }}>
                      <label className="space-y-1 text-sm"><Label>Motivo para anular la marca</Label>
                        <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required />
                      </label>
                      <Button type="submit" variant="secondary" loading={busy} loadingLabel="Guardando">Anular marca</Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {club.payment && (
                <Card>
                  <CardHeader><CardTitle>Corregir o anular el pago vigente</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitCorrection}>
                      <label className="space-y-1 text-sm"><Label>Plan</Label>
                        <select className={fieldClass} value={correctPlan} onChange={(event) => setCorrectPlan(event.target.value as 'PRO' | 'ELITE')}>
                          <option value="PRO">PRO</option>
                          <option value="ELITE">ELITE</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-sm"><Label>Monto</Label>
                        <Input value={correctAmount} onChange={(event) => setCorrectAmount(event.target.value)} inputMode="decimal" />
                      </label>
                      <label className="space-y-1 text-sm"><Label>Moneda</Label>
                        <Input value={correctCurrency} onChange={(event) => setCorrectCurrency(event.target.value)} maxLength={3} />
                      </label>
                      <label className="space-y-1 text-sm"><Label>Inicio</Label>
                        <Input type="date" value={correctStart} onChange={(event) => setCorrectStart(event.target.value)} required />
                      </label>
                      <label className="space-y-1 text-sm sm:col-span-2"><Label>Fin</Label>
                        <Input type="date" value={correctEnd} onChange={(event) => setCorrectEnd(event.target.value)} />
                      </label>
                      <label className="space-y-1 text-sm sm:col-span-2"><Label>Motivo</Label>
                        <Textarea value={correctReason} onChange={(event) => setCorrectReason(event.target.value)} required />
                      </label>
                      <Button type="submit" loading={busy} loadingLabel="Guardando">Corregir</Button>
                    </form>
                    <form className="grid gap-3" onSubmit={(event) => {
                      event.preventDefault()
                      if (!selectedId || !club.payment) return
                      void run(() => ownerApi.annul(selectedId, club.payment!.id, annulReason), 'El pago quedó anulado.')
                    }}>
                      <label className="space-y-1 text-sm"><Label>Motivo para anular</Label>
                        <Textarea value={annulReason} onChange={(event) => setAnnulReason(event.target.value)} required />
                      </label>
                      <Button type="submit" variant="destructive" loading={busy} loadingLabel="Guardando">Anular pago</Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
                <CardContent>
                  {club.history.length === 0 && <p className="text-sm text-dark-700">Todavía no hay operaciones.</p>}
                  <ul className="space-y-3">
                    {club.history.map((entry, index) => (
                      <li key={`${entry.createdAt}-${index}`} className="text-sm">
                        <p className="font-medium">{ACTIONS[entry.action] ?? entry.action}</p>
                        <p>{entry.reason}</p>
                        {entry.detail && <p className="text-dark-700">{entry.detail}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>
    </OwnerShell>
  )
}

function labelMedium(medium: PaymentMedium): string {
  return MEDIUMS.find((item) => item.value === medium)?.label ?? medium
}
