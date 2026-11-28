import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import modalClose from '@/assets/club-events/modal-close.svg'
import inviteChevron from '@/assets/club-events/invite-chevron.svg'
import inviteInfo from '@/assets/club-events/invite-info.svg'
import pairPlayer from '@/assets/club-events/pair-selected-player.svg'
import { Banner } from './division-ui'
import type { EntryScope, PairPlayer } from './club-pair-registration'
import { ineligibilityDetail, invitationGenders, invitationLabels, useClubPlayerInvitation } from './club-player-invitation'

const fields = ['firstName', 'lastName', 'email'] as const
const placeholders = { firstName: 'Ingresá su nombre', lastName: 'Ingresá su apellido', email: 'nombre@ejemplo.com' }
const inputClass = 'h-14 w-full rounded-[8px] border bg-[#fefefe] px-4 text-sm text-[#120f18] outline-offset-2 placeholder:text-[#605e64]'
const selects = ['gender', 'categoryId'] as const

export function CreatePlayerForm({ scope, divisionTitle, slot, teammateId, pending, close, done }: {
  scope: EntryScope; divisionTitle: string; slot: 0 | 1; teammateId?: string; pending: { current: boolean }
  close: () => void; done: (player: PairPlayer, created: boolean) => void
}) {
  const invite = useClubPlayerInvitation(scope, teammateId, pending, done)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const { busy, catalog, draft, errors, result } = invite
  const existing = result?.outcome === 'EXISTING_PLAYER' ? result.player : null
  const blocked = result && !existing
  const info = <img src={inviteInfo} alt="" width={20} height={20} className="shrink-0" />
  const candidates = {
    gender: invitationGenders,
    categoryId: catalog.data?.map(category => ({ value: category.id, label: category.name })) ?? [],
  }

  return <form noValidate className="flex max-h-[inherit] flex-col" onSubmit={event => {
    event.preventDefault()
    if (existing) invite.selectExisting()
    else if (!blocked) void invite.submit()
  }}>
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e5e5] pl-4 pr-2">
      <h2 id="club-pair-title" ref={heading} tabIndex={-1} className="text-sm font-semibold outline-none">Crear jugador</h2>
      <button type="button" className="grid size-9 place-items-center" aria-label="Cerrar" disabled={busy} onClick={close}>
        <img src={modalClose} alt="" />
      </button>
    </header>
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-4">
      <p className="text-xs text-[#605e64]">{divisionTitle} · Jugador {slot + 1}</p>
      {existing ? <>
        <Banner tone="info" icon={info} title="Ya existe un jugador con este email">
          Podés seleccionarlo para continuar. Sus datos y categoría global se conservan.
        </Banner>
        <div className="flex h-14 items-center gap-2 rounded-lg border border-[#b7bc33] bg-[#fafaeb] px-2">
          <span className="grid size-10 place-items-center rounded-full bg-[#eef0c1]"><img src={pairPlayer} alt="" /></span>
          <strong className="min-w-0 flex-1 truncate text-sm font-semibold">{existing.firstName} {existing.lastName}</strong>
          <button type="button" className="grid size-9 place-items-center" aria-label="Editar email" onClick={invite.edit}>
            <img src={modalClose} alt="" />
          </button>
        </div>
        <p className="text-xs">{draft.email}<br />{invitationGenders.find(option => option.value === existing.gender)?.label}
          {existing.baseCategoryName && ' · ' + existing.baseCategoryName}</p>
      </> : blocked ? <>
        {result.outcome === 'ACCOUNT_WITHOUT_PLAYER' && <Banner tone="blocked" title="Este email ya tiene una cuenta">
          Su titular debe completar el registro como jugador.
        </Banner>}
        {result.outcome === 'BLOCKED' && <Banner tone="blocked" title="Jugador bloqueado">
          Esta cuenta o perfil no está habilitado para inscribirse.
        </Banner>}
        {result.outcome === 'INELIGIBLE' && <Banner tone="error" title="Jugador no elegible">{ineligibilityDetail(result.reason)}</Banner>}
        <Button type="button" variant="secondary" onClick={invite.edit}>Editar email</Button>
      </> : <>
        {invite.error && <Banner tone="error" title="No pudimos guardar">{invite.error}</Banner>}
        {fields.map(key => <div key={key} className="flex flex-col gap-2">
          <label htmlFor={'club-invite-' + key} className="text-sm font-medium">{invitationLabels[key]} <span className="text-red-600">*</span></label>
          <input id={'club-invite-' + key} value={draft[key]} type={key === 'email' ? 'email' : 'text'} autoComplete="off"
            maxLength={key === 'email' ? 254 : 100} disabled={busy} required aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? 'club-invite-error-' + key : undefined}
            className={inputClass + (errors[key] ? ' border-red-500' : ' border-[#929195]')}
            placeholder={placeholders[key]} onChange={event => invite.setField(key, event.target.value)} />
          {errors[key] && <p role="alert" id={'club-invite-error-' + key} className="text-xs text-red-700">{errors[key]}</p>}
        </div>)}
        {selects.map(key => <div key={key} className="flex flex-col gap-2">
          <label htmlFor={'club-invite-' + key} className="text-sm font-medium">{invitationLabels[key]} <span className="text-red-600">*</span></label>
          <div className="relative">
            <select id={'club-invite-' + key} value={draft[key]} disabled={busy || key === 'categoryId' && !catalog.data}
              required aria-invalid={!!errors[key]} aria-describedby={errors[key] ? 'club-invite-error-' + key : undefined}
              className={inputClass + ' appearance-none pr-12 ' + (draft[key] ? '' : 'text-[#605e64] ') + (errors[key] ? 'border-red-500' : 'border-[#929195]')}
              onChange={event => invite.setField(key, event.target.value)}>
              <option value="" disabled>{key === 'categoryId' && catalog.isPending ? 'Cargando categorías…' : 'Seleccionar'}</option>
              {candidates[key].map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <img src={inviteChevron} alt="" width={24} height={24} className="pointer-events-none absolute right-4 top-4" />
          </div>
          {errors[key] && <p role="alert" id={'club-invite-error-' + key} className="text-xs text-red-700">{errors[key]}</p>}
        </div>)}
        {catalog.isError && <Banner tone="error" title="No pudimos cargar las categorías">
          <button type="button" className="underline" onClick={() => void catalog.refetch()}>Reintentar</button>
        </Banner>}
        <Banner tone="info" icon={info} title="Podés inscribirlo ahora">
          Le enviaremos una invitación para verificar su email y crear una contraseña. Su acceso queda pendiente.
        </Banner>
      </>}
    </div>
    <footer className="flex shrink-0 flex-col gap-2 px-4 pb-6">
      {!blocked && <Button type="submit" className="h-12 font-medium" disabled={busy || (!existing && !catalog.data)}
        loading={busy} loadingLabel="Creando jugador…">{existing ? 'Seleccionar jugador' : 'Crear jugador'}</Button>}
      <Button type="button" variant="secondary" className="h-12 border-transparent bg-[#e7e7e8] font-medium" disabled={busy} onClick={close}>Cancelar</Button>
    </footer>
  </form>
}
