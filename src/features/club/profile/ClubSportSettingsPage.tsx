import { useEffect, useRef } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import checkIcon from '@/assets/category-policy/check.svg'
import errorIcon from '@/assets/category-policy/error.svg'
import plusIcon from '@/assets/venues/plus.svg'
import { WEEKDAYS, daySummary } from './club-profile-model'
import { useSportSettings } from './use-sport-settings'

const field = 'h-14 w-full rounded-lg border border-[#929195] bg-[#fefefe] px-4 text-sm font-medium shadow-none'

function Notice({ title, detail, error = false }: { title: string; detail?: string; error?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-lg border p-3 ${error ? 'border-[#fac5c5] bg-[#fdecec]' : 'border-[#baedcd] bg-[#e9f9ef]'}`}>
    <img src={error ? errorIcon : checkIcon} alt="" width={20} height={20} className="shrink-0" />
    <div><p className="text-sm font-semibold leading-5">{title}</p>{detail && <p className="mt-0.5 text-xs leading-4 text-[#605e64]">{detail}</p>}</div>
  </div>
}

export function ClubSportSettingsPage() {
  const { user, destination, phase } = useAuth()
  const navigate = useNavigate()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const authorized = phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS'))
  const clubId = authorized ? context?.clubId ?? null : null
  const settings = useSportSettings(clubId)
  const discardDialog = useRef<HTMLDialogElement>(null)
  const dayDiscard = useRef<HTMLDialogElement>(null)
  const blocker = useBlocker(phase === 'ready' && (settings.dirty || settings.saving || !!settings.dayDraft))

  useEffect(() => {
    if (blocker.state === 'blocked' && !settings.saving) {
      if (settings.dayDraft) dayDiscard.current?.showModal()
      else if (!settings.dirty) blocker.proceed()
      else discardDialog.current?.showModal()
    } else {
      discardDialog.current?.close()
      dayDiscard.current?.close()
    }
  }, [blocker, settings.dirty, settings.saving, settings.dayDraft])

  const back = () => {
    if (settings.dayDraft) { dayDiscard.current?.showModal(); return }
    navigate('/club/settings')
  }

  if (settings.dayDraft) {
    const day = settings.dayDraft
    const label = WEEKDAYS.find(([key]) => key === day.day)?.[1] ?? day.day
    const open = day.value.status === 'OPEN'
    return (
      <div className="flex h-dvh flex-col bg-[#f7f7f7] text-[#120f18]">
        <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
          <button type="button" aria-label="Volver" className="flex h-10 w-10 items-center justify-center" onClick={() => dayDiscard.current?.showModal()}><ArrowBackIcon /></button>
          <h1 className="text-xl font-bold">Horario del {label.toLowerCase()}</h1>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto flex max-w-xl flex-col gap-6">
            <div className="flex items-center justify-between rounded-xl bg-white p-4">
              <div><p className="text-sm font-medium">Abierto</p><p className="text-xs text-[#605e64]">Apagá el switch para marcar cerrado</p></div>
              <Switch checked={open} onCheckedChange={checked => settings.setDayDraft({
                day: day.day,
                value: checked ? { status: 'OPEN', intervals: day.value.intervals.length ? day.value.intervals : [] } : { status: 'CLOSED', intervals: [] },
              })} />
            </div>
            {open && <>
              {day.value.intervals.map((interval, index) => (
                <div key={index} className="flex flex-col gap-3 rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between"><p className="text-sm font-medium">Franja {index + 1}</p>
                    <button type="button" className="text-sm text-[#d93e3e]" onClick={() => settings.setDayDraft({
                      day: day.day,
                      value: { ...day.value, intervals: day.value.intervals.filter((_, i) => i !== index) },
                    })}>Quitar</button></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs">Apertura (HH:mm)</label><Input inputMode="numeric" placeholder="09:00" value={interval.open} className={field} onChange={e => {
                      const intervals = day.value.intervals.map((item, i) => i === index ? { ...item, open: e.target.value } : item)
                      settings.setDayDraft({ day: day.day, value: { ...day.value, intervals } })
                    }} /></div>
                    <div><label className="text-xs">Cierre (HH:mm o 24:00)</label><Input inputMode="numeric" placeholder="24:00" value={interval.close} className={field} onChange={e => {
                      const intervals = day.value.intervals.map((item, i) => i === index ? { ...item, close: e.target.value } : item)
                      settings.setDayDraft({ day: day.day, value: { ...day.value, intervals } })
                    }} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef0c1]" aria-label="Agregar franja"
                onClick={() => settings.setDayDraft({ day: day.day, value: { ...day.value, intervals: [...day.value.intervals, { open: '', close: '' }] } })}>
                <img src={plusIcon} alt="" width={20} height={20} />
              </button>
            </>}
            {settings.errors.day && <p className="text-sm text-[#aa3030]">{settings.errors.day}</p>}
          </div>
        </main>
        <footer className="px-4 pb-6 pt-3">
          <Button className="mx-auto flex h-12 w-full max-w-xl" onClick={() => settings.applyDay()}>Aplicar horario</Button>
        </footer>
        <dialog ref={dayDiscard} className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-6 backdrop:bg-black/40">
          <h2 className="text-lg font-semibold">¿Descartar cambios del día?</h2>
          <div className="mt-6 flex flex-col gap-3">
            <Button variant="secondary" className="h-12" onClick={() => dayDiscard.current?.close()}>Seguir editando</Button>
            <Button className="h-12" onClick={() => { settings.setDayDraft(null); dayDiscard.current?.close(); if (blocker.state === 'blocked') blocker.proceed() }}>Descartar</Button>
          </div>
        </dialog>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-[#f7f7f7] text-[#120f18]">
      <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
        <button type="button" aria-label="Volver a Mi Club" className="flex h-10 w-10 items-center justify-center" onClick={back} disabled={settings.saving}><ArrowBackIcon /></button>
        <h1 className="text-xl font-bold">Configuración de torneos</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-busy={authorized && settings.loading}>
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          {!authorized ? <p role="alert">No tenés permiso para gestionar la configuración de este club.</p>
            : settings.loading ? <p role="status">Cargando configuración…</p>
              : settings.loadError ? <Notice error title="No pudimos cargar la configuración" detail="Reintentá para consultar los defaults del club." />
                : <>
                  {settings.result && <Notice error={settings.result === 'error'} title={settings.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar los cambios'} detail={settings.result === 'error' ? 'Conservamos tu borrador.' : undefined} />}
                  <section className="flex flex-col gap-4 rounded-xl bg-white p-4">
                    <h2 className="text-base font-semibold">Defaults de partidos</h2>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="duration" className="text-sm font-medium">Duración estimada (min)</label>
                      <Input id="duration" type="number" min={1} step={1} className={field} value={settings.draft.defaultMatchDurationMinutes}
                        disabled={settings.saving} onChange={e => settings.patch({ defaultMatchDurationMinutes: Number(e.target.value) })} />
                      {settings.errors.duration && <p className="text-sm text-[#aa3030]">{settings.errors.duration}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="rest" className="text-sm font-medium">Descanso mínimo (min)</label>
                      <Input id="rest" type="number" min={0} step={1} className={field} value={settings.draft.defaultRestMinutes}
                        disabled={settings.saving} onChange={e => settings.patch({ defaultRestMinutes: Number(e.target.value) })} />
                      {settings.errors.rest && <p className="text-sm text-[#aa3030]">{settings.errors.rest}</p>}
                      <p className="text-xs text-[#605e64]">0 es válido. Los cambios no reescriben calendarios existentes.</p>
                    </div>
                  </section>
                  <section className="flex flex-col gap-3">
                    <h2 className="text-base font-semibold">Horario semanal del club</h2>
                    {settings.draft.partialWeek && <p className="text-sm text-[#605e64]">Semana parcial: hay días sin configurar. Se puede guardar así.</p>}
                    {WEEKDAYS.map(([key, label]) => (
                      <button key={key} type="button" disabled={settings.saving} onClick={() => settings.openDay(key)}
                        className="flex min-h-14 items-center justify-between rounded-xl bg-white px-4 py-3 text-left">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm text-[#605e64]">{daySummary(settings.draft.weeklySchedule[key])}</span>
                      </button>
                    ))}
                  </section>
                </>}
        </div>
      </main>
      {authorized && !settings.loading && <footer className="shrink-0 px-4 pb-4 pt-3">
        {settings.loadError ? <Button className="mx-auto flex h-12 w-full max-w-xl" onClick={() => void settings.reload()}>Reintentar</Button>
          : <>
            <p className="mb-2 text-center text-sm text-[#605e64]">{settings.dirty ? 'Tenés cambios sin guardar' : 'Sin cambios pendientes'}</p>
            <Button className={`mx-auto flex h-12 w-full max-w-xl disabled:opacity-100 ${!settings.dirty && !settings.saving ? 'disabled:bg-[#eef0c1] disabled:text-[#605e64]' : ''}`}
              loading={settings.saving} loadingLabel="Guardando…" disabled={!settings.dirty} onClick={() => void settings.save()}>Guardar cambios</Button>
          </>}
      </footer>}
      <ClubBottomNav onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} busy={settings.saving} />
      <dialog ref={discardDialog} className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-6 backdrop:bg-black/40">
        <h2 className="text-lg font-semibold">¿Descartar cambios de la semana?</h2>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" className="h-12" onClick={() => blocker.state === 'blocked' && blocker.reset()}>Seguir editando</Button>
          <Button className="h-12" onClick={() => { settings.discard(); blocker.state === 'blocked' && blocker.proceed() }}>Descartar cambios</Button>
        </div>
      </dialog>
    </div>
  )
}
