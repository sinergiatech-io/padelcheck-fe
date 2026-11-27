import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import trophyIcon from '@/assets/club-events/division-trophy.svg'
import clockIcon from '@/assets/club-events/banner-clock.svg'
import infoIcon from '@/assets/club-events/banner-check.svg'
import errorIcon from '@/assets/category-policy/error.svg'
import successIcon from '@/assets/category-policy/check.svg'
import blockedIcon from '@/assets/auth/alert-blocked.svg'
import { field, secondary } from './EventShell'
import {
  OPEN, genderLabels, gridOrder, sumRange, toggleCategory, typeLabels, validMaxPairs, sumProblem,
  type CatalogCategory, type DivisionType, type GenderType, type Selection,
} from './division-model'

type Tone = 'info' | 'loading' | 'error' | 'success' | 'blocked'
const tones: Record<Tone, { box: string; icon: string }> = {
  info: { box: 'border-[#c2d8fc] bg-[#ebf3fe]', icon: infoIcon },
  loading: { box: 'border-[#c2d8fc] bg-[#ebf3fe]', icon: clockIcon },
  error: { box: 'border-[#fac5c5] bg-[#fdecec]', icon: errorIcon },
  success: { box: 'border-[#baedcd] bg-[#e9f9ef]', icon: successIcon },
  blocked: { box: 'border-[#e7e7e8] bg-[#f6f6f6]', icon: blockedIcon },
}

/** «Banner estado» of the UI kit: semantic tone, icon, title and supporting text. */
export function Banner({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  const style = tones[tone]
  return <div role={tone === 'error' ? 'alert' : 'status'} className={'flex items-center gap-3 rounded-lg border p-3 ' + style.box}>
    <img src={style.icon} alt="" width={20} height={20} className="shrink-0" />
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <strong className="text-sm font-semibold leading-5 text-[#120f18]">{title}</strong>
      {children && <span className="text-xs leading-4 text-[#605e64]">{children}</span>}
    </div>
  </div>
}

/** KAN-149 Banner Blocked plus the role action: CLUB_ADMIN «Ver plan», CLUB_STAFF explanation only. */
export function LimitBanner({ reason, admin }: { reason: { title: string; detail: string }; admin: boolean }) {
  return <div className="flex flex-col gap-2">
    <Banner tone="blocked" title={reason.title}>{reason.detail}{!admin && ' El administrador del club gestiona el cambio de plan.'}</Banner>
    {admin && <Link to="/club/plan" className="flex h-12 items-center justify-center text-sm font-semibold text-[#120f18]">Ver plan</Link>}
  </div>
}

function Segmented<T extends string>({ legend, name, value, options, onChange, disabled }: {
  legend: string; name: string; value: T; options: [T, string][]; onChange: (value: T) => void; disabled?: boolean
}) {
  return <fieldset disabled={disabled} className="flex flex-col gap-4">
    <legend className="mb-4 text-sm font-semibold">{legend}</legend>
    <div className="flex gap-2 rounded-lg bg-[#f5f5f5] p-2">
      {options.map(([option, label]) => <label key={option} className={'flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#646707] ' +
        (value === option ? 'bg-[#c9cf38] font-medium' : 'font-semibold')}>
        <input type="radio" className="sr-only" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
        {label}
      </label>)}
    </div>
  </fieldset>
}

function Field({ label, error, children }: { label: string; error?: string | false; children: ReactNode }) {
  return <label className="flex flex-col text-sm font-semibold">
    <span>{label} <span aria-hidden className="text-[#ef4444]">*</span></span>
    {children}
    {error && <span role="alert" className="mt-2 text-sm font-normal text-[#b51e15]">{error}</span>}
  </label>
}

const invalidField = ' border-[#d93e3e] focus-visible:ring-[#d93e3e]/40'

/**
 * Step 4 body (and the configuration step of the hub editor): composition, type and its parameters.
 * `single` keeps one Simple category (editing a saved or a single division).
 */
export function CriterionFields({ selection, set, catalog, single = false, onOverflow, canAdd }: {
  selection: Selection
  set: (selection: Selection) => void
  catalog: CatalogCategory[]
  single?: boolean
  /** Simple batch: whether one more category fits the remaining plan quota. */
  canAdd: (next: number) => boolean
  onOverflow: () => void
}) {
  const range = sumRange(catalog)
  const sumIssue = sumProblem(selection.sumText, catalog)
  const sumInvalid = sumIssue !== null
  const pick = (id: string) => {
    const next = toggleCategory(selection.categoryIds, id, single)
    if (next.length > selection.categoryIds.length && !canAdd(next.length)) {
      onOverflow()
      return
    }
    set({ ...selection, categoryIds: next })
  }
  const rows = [...gridOrder(catalog).map(category => ({ id: category.id, label: category.name })), { id: OPEN, label: 'OPEN' }]
  const genders: [GenderType, string][] = (['MALE', 'FEMALE', 'MIXED'] as const).map(value => [value, genderLabels[value]])
  const types: [DivisionType, string][] = (['SIMPLE', 'SUMA', 'COMBINADO'] as const).map(value => [value, typeLabels[value]])
  const options = gridOrder(catalog)
  return <>
    <Segmented legend="Composición" name="division-gender" value={selection.genderType} options={genders}
      onChange={genderType => set({ ...selection, genderType })} />
    <Segmented legend="Tipo de división" name="division-type" value={selection.type} options={types}
      onChange={type => set({ ...selection, type })} />
    {selection.type === 'SIMPLE' && <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 text-sm font-semibold">Categorías</legend>
      {[0, 3, 6].map(start => <div key={start} className="flex gap-2 rounded-lg bg-[#f5f5f5] p-2">
        {rows.slice(start, start + 3).map(row => {
          const checked = selection.categoryIds.includes(row.id)
          return <label key={row.id} className={'flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#646707] ' +
            (checked ? 'bg-[#c9cf38] font-medium' : 'font-semibold')}>
            <input type={single ? 'radio' : 'checkbox'} name="division-category" className="sr-only" checked={checked} onChange={() => pick(row.id)} />
            {row.label}
          </label>
        })}
      </div>)}
      {selection.categoryIds.includes(OPEN) && <Banner tone="info" title={genderLabels[selection.genderType] + ' OPEN'}>
        Cualquier categoría. Se mantiene la composición {genderLabels[selection.genderType]}.
      </Banner>}
      <p className="text-xs leading-4 text-[#605e64]">{single
        ? 'Elegí una categoría para esta división. Rige la política de categorías del club.'
        : selection.categoryIds.length === 0
          ? 'Seleccioná al menos una categoría para continuar.'
          : 'Cada categoría elegida crea una división independiente. Rige la política de categorías del club.'}</p>
    </fieldset>}
    {selection.type === 'SUMA' && <>
      <Field label="Suma de categorías" error={sumIssue === 'unformable' ? 'Esta suma no se puede formar con dos categorías del catálogo.' : sumIssue && range ? 'Ingresá un entero entre ' + range.min + ' y ' + range.max + '.' : false}>
        <Input className={field + (sumInvalid ? invalidField : '')} inputMode="numeric" aria-invalid={sumInvalid}
          value={selection.sumText} onChange={event => set({ ...selection, sumText: event.target.value })} />
      </Field>
      <Banner tone="info" title="Categoría efectiva del club">Se admite la suma exacta o una mayor dentro de la política del club. Nunca una suma menor.</Banner>
      <p className="text-xs leading-4 text-[#605e64]">Ejemplo · Suma 13, política +1 por jugador<br />6ta + 7ma: válido<br />6ta + 6ta: no válido<br />7ma + 7ma y 7ma + 8va: válidos<br />8va + 8va: no válido</p>
    </>}
    {selection.type === 'COMBINADO' && <>
      <div className="flex gap-4">
        {(['first', 'second'] as const).map((slot, index) => <label key={slot} className="flex min-w-0 flex-1 flex-col text-sm font-semibold">
          <span>Categoría {index === 0 ? 'A' : 'B'} <span aria-hidden className="text-[#ef4444]">*</span></span>
          <select className="mt-2 h-14 rounded-lg border border-[#929195] bg-[#fefefe] px-4 text-sm font-normal"
            value={selection[slot]} onChange={event => set({ ...selection, [slot]: event.target.value })}>
            <option value="">Seleccionar</option>
            {options.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>)}
      </div>
      {Boolean(selection.first) !== Boolean(selection.second) && <Banner tone="error" title="Completá la combinación">Seleccioná las dos categorías para continuar.</Banner>}
      <p className="text-xs leading-4 text-[#605e64]">Se exige esta combinación concreta, usando la categoría efectiva de cada jugador en el club. El orden de la pareja no cambia la combinación.</p>
    </>}
  </>
}

/** Step 5 body: quota and the explicit substitutes choice. `fixed` = read-only after opening (3094:33750). */
export function QuotaFields({ selection, set, touched, fixed = false, busy = false }: {
  selection: Selection; set: (selection: Selection) => void; touched: boolean; fixed?: boolean; busy?: boolean
}) {
  const invalid = touched && !validMaxPairs(selection.maxPairsText)
  const choice = selection.substitutesAllowed
  return <>
    <Field label="Máximo de parejas" error={invalid && 'Ingresá un entero mayor o igual a 1.'}>
      <Input className={field + (invalid ? invalidField : '') + ' disabled:bg-[#f5f5f5] disabled:opacity-100'} inputMode="numeric" aria-invalid={invalid}
        disabled={fixed || busy} value={selection.maxPairsText} onChange={event => set({ ...selection, maxPairsText: event.target.value })} />
    </Field>
    <fieldset disabled={fixed || busy} className="flex flex-col gap-2">
      <legend className="mb-4 text-sm font-semibold">¿Esta división admite suplentes?</legend>
      {([[true, 'Sí, admitir lista de espera'], [false, 'No, cerrar al completar cupo']] as const).map(([value, label]) =>
        <label key={label} className={'flex h-12 cursor-pointer items-center gap-4 rounded-lg px-4 text-sm font-medium ' + (choice === value ? 'bg-[#f8f8e9]' : 'bg-[#f5f5f5]')}>
          <input type="radio" name="division-substitutes" className="h-5 w-5 accent-[#a9b12b] disabled:opacity-60" checked={choice === value}
            onChange={() => set({ ...selection, substitutesAllowed: value })} />
          {label}
        </label>)}
    </fieldset>
    <p className="text-sm text-[#605e64]">{choice === null ? 'Elegí Sí o No para continuar.' : choice
      ? 'Con cupo lleno, las nuevas parejas podrán anotarse en lista de espera.'
      : 'Con cupo lleno, no se admitirán nuevas inscripciones.'}</p>
    <Banner tone="info" title="Se define antes de abrir">La admisión de suplentes no puede cambiarse una vez abiertas las inscripciones.</Banner>
    <p className="text-xs leading-4 text-[#605e64]">Precio y cierre de inscripción se configuran una sola vez para todo el evento.</p>
  </>
}

/** Catalog loading / error states of step 4 (3089:34298, 3089:34383). */
export function CatalogState({ pending, error, retry, genderType }: { pending: boolean; error: boolean; retry: () => void; genderType: GenderType }) {
  return <>
    <p className="text-sm font-medium text-[#605e64]">Composición · {genderLabels[genderType]}</p>
    {pending && <Banner tone="loading" title="Cargando categorías">Estamos consultando el catálogo del club.</Banner>}
    {error && <>
      <Banner tone="error" title="No pudimos cargar las categorías">Volvé a intentar. No se seleccionará una categoría por vos.</Banner>
      <Button variant="secondary" className={secondary} onClick={retry}>Reintentar</Button>
    </>}
  </>
}

/** «Division Card» of the KAN-77 handoff: title, quota, type and substitutes. */
export function DivisionCard({ title, maxPairs, type, substitutes, muted = false, footer }: {
  title: string; maxPairs: number; type: string; substitutes: boolean; muted?: boolean; footer?: ReactNode
}) {
  return <article className={'flex flex-col rounded-lg bg-[#fefefe] shadow-[0_1px_3px_rgba(18,15,24,0.16)] ' + (muted ? 'opacity-70' : '')}>
    <div className="flex flex-col gap-3 p-4">
      <h3 className="flex items-center gap-1 text-base font-semibold text-[#4a4850]"><img src={trophyIcon} alt="" width={24} height={24} />{title}</h3>
      <dl className="flex flex-col text-sm text-[#4a4850]">
        <div className="flex justify-between border-b border-[#e7e7e8] pb-2"><dt>Cupo máximo</dt><dd className="font-semibold text-[#120f18]">{maxPairs}</dd></div>
        <div className="flex justify-between pt-3"><dt>Tipo</dt><dd>{type}</dd></div>
        <div className="flex justify-between pt-2"><dt>Suplentes</dt><dd className="font-semibold text-[#120f18]">{substitutes ? 'Sí' : 'No'}</dd></div>
      </dl>
    </div>
    {footer}
  </article>
}

export function CardActions({ children }: { children: ReactNode }) {
  return <div className="flex">{children}</div>
}

export function CardAction({ label, onClick, disabled, aria }: { label: string; onClick: () => void; disabled?: boolean; aria?: string }) {
  return <button type="button" aria-label={aria} disabled={disabled} onClick={onClick}
    className="flex h-12 flex-1 items-center justify-center text-sm font-semibold text-[#120f18] disabled:text-[#929195]">{label}</button>
}
