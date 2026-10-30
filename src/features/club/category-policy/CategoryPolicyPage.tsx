import { useEffect, useRef } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowBackIcon } from '@/components/icons/NavigationIcons'
import { useAuth } from '@/context/AuthContext'
import { EFFECTIVE_HELP, TYPE_HELP, example, optionLabel } from './category-policy'
import { useCategoryPolicy } from './use-category-policy'
import chevron from '@/assets/category-policy/chevron.svg'
import checkIcon from '@/assets/category-policy/check.svg'
import errorIcon from '@/assets/category-policy/error.svg'

function PolicyNotice({ title, detail, error = false }: { title: string; detail?: string; error?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-lg border p-3 ${error ? 'border-[#fac5c5] bg-[#fdecec]' : 'border-[#baedcd] bg-[#e9f9ef]'}`}>
    <img src={error ? errorIcon : checkIcon} alt="" width={20} height={20} className="shrink-0" />
    <div><p className="text-sm font-semibold leading-5">{title}</p>{detail && <p className="mt-0.5 text-xs leading-4 text-[#605e64]">{detail}</p>}</div>
  </div>
}

export function CategoryPolicyPage() {
  const { user, destination, phase } = useAuth()
  const navigate = useNavigate()
  const context = destination?.kind === 'club'
    ? user?.accessContexts?.find(c => c.activity === 'CLUB' && c.clubId === destination.clubId) : null
  const authorized = phase === 'ready' && Boolean(context?.permissions?.includes('MANAGE_CLUB_SETTINGS'))
  const policy = useCategoryPolicy(authorized ? context?.clubId ?? null : null)
  const blocker = useBlocker(phase === 'ready' && (policy.dirty || policy.saving))
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (blocker.state === 'blocked' && !policy.saving) {
      if (!policy.dirty) blocker.proceed()
      else dialog.current?.showModal()
    } else dialog.current?.close()
  }, [blocker, policy.dirty, policy.saving])
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (policy.dirty || policy.saving) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [policy.dirty, policy.saving])
  const back = () => navigate('/app')
  return (
    <div className="flex h-dvh flex-col bg-background text-dark-900">
      <header className="flex h-14 shrink-0 items-center bg-[#100e16] px-4 text-white">
        <button type="button" aria-label="Volver a Mi Club" className="flex h-10 w-10 items-center justify-center rounded-md focus-visible:ring-2" onClick={back} disabled={policy.saving}>
          <ArrowBackIcon />
        </button>
        <h1 className="text-xl font-bold leading-7">Reglas de categorías</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-busy={authorized && policy.loading}>
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          {!authorized ? <p role="alert">No tenés permiso para gestionar la configuración de este club.</p> : policy.loading ? (
            <p role="status">Cargando reglas de categorías…</p>
          ) : policy.loadError ? (
            <PolicyNotice error title="No pudimos cargar la política" detail="Reintentá para consultar la configuración actual de tu club." />
          ) : <>
            {policy.result && <PolicyNotice error={policy.result === 'error'} title={policy.result === 'success' ? 'Cambios guardados' : 'No pudimos guardar los cambios'} detail={policy.result === 'error' ? 'Intentá nuevamente. Conservamos tu selección.' : undefined} />}
            <section className="flex flex-col gap-3 rounded-xl bg-[#fefefe] p-4">
              <div className="flex flex-col gap-2">
              <label htmlFor="higher-categories" className="text-sm font-medium leading-5">Categorías superiores permitidas</label>
              <Select value={String(policy.draft)} onValueChange={v => policy.select(Number(v))} disabled={policy.saving}>
                <SelectTrigger id="higher-categories" indicator={<img src={chevron} alt="" width={24} height={24} />} aria-describedby="category-example effective-category" className="h-14 rounded-lg border-[#929195] bg-[#fefefe] px-4 text-sm font-medium shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent align="end" alignOffset={-16} style={{ width: 'calc(var(--radix-select-trigger-width) + 32px)' }} className="bg-[#fefefe]">{Array.from({ length: 8 }, (_, count) => <SelectItem key={count} value={String(count)} className="min-h-11 border-b border-divider font-medium last:border-0 data-[state=checked]:bg-primary-100">{optionLabel(count)}</SelectItem>)}</SelectContent>
              </Select>
              </div>
              <p id="category-example" aria-live="polite" className="text-sm font-medium leading-5">{example(policy.categories, policy.draft)}</p>
              <p id="effective-category" className="text-xs leading-4">{EFFECTIVE_HELP}</p>
            </section>
            <section className="text-sm leading-5">
              <h2 className="font-semibold">Catálogo global · Solo lectura</h2>
              <p className="mt-2 font-medium">{policy.categories.map(c => c.name).join(' · ')}</p>
            </section>
            <p className="text-sm font-medium leading-5">{TYPE_HELP}</p>
          </>}
        </div>
      </main>
      {authorized && !policy.loading && <footer className="shrink-0 px-4 pb-6 pt-4">
        {policy.loadError ? <Button className="mx-auto flex h-12 w-full max-w-xl rounded-lg" onClick={() => void policy.reload()}>Reintentar</Button> :
        <Button className={`mx-auto flex h-12 w-full max-w-xl rounded-lg text-sm transition-none hover:bg-primary-500 active:bg-primary-500 disabled:opacity-100 ${!policy.dirty && !policy.saving ? 'disabled:bg-[#eef0c1] disabled:text-[#605e64]' : ''}`} loading={policy.saving} loadingLabel="Guardando…" disabled={!policy.dirty} onClick={() => void policy.save()}>Guardar cambios</Button>}
      </footer>}
      {/* KAN-134 owns the global club menu; this screen supplies its return contract. */}
      <nav aria-label="Regreso al club" className="flex h-16 shrink-0 items-center justify-center bg-dark-900 text-primary-500">
        <button type="button" onClick={back} disabled={policy.saving} className="h-full min-w-24 px-4 text-xs">Mi Club</button>
      </nav>
      <dialog ref={dialog} aria-labelledby="discard-title" onCancel={event => { event.preventDefault(); if (blocker.state === 'blocked') blocker.reset() }} className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-surface p-6 text-dark-900 backdrop:bg-black/40">
        <h2 id="discard-title" className="text-lg font-semibold">¿Descartar los cambios?</h2>
        <p className="mt-2 text-sm">Tenés cambios sin guardar.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="secondary" className="h-12" onClick={() => { if (blocker.state === 'blocked') blocker.reset() }}>Seguir editando</Button>
          <Button className="h-12" onClick={() => { policy.discard(); if (blocker.state === 'blocked') blocker.proceed() }}>Descartar cambios</Button>
        </div>
      </dialog>
    </div>
  )
}
