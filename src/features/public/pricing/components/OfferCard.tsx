import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { TrophyOutlineIcon } from '@/components/icons/TrophyIcon'
import { ROUTES } from '@/lib/constants'
import {
  FLAGS,
  LIMITS,
  MISSING,
  OFFER_CTA,
  OFFER_PURPOSE,
  flagLabel,
  limitLabel,
  priceLabel,
  priceSpoken,
  type OfferCode,
  type PricingOffer,
} from '../pricing-model'
import { CheckIcon, CrossIcon, LimitIcon, MissingIcon } from './PricingIcons'
import { focusRing } from './styles'

export const cardWidth = 'w-[304px] min-[402px]:w-[330px]'
const cardBox = `${cardWidth} shrink-0 snap-start rounded-lg border border-[#2E2B33] bg-[#1B1820] p-4 min-[402px]:p-5`

type CardProps = {
  offer: PricingOffer
  enabled: boolean
  onFocusWithin: () => void
}

/** One catalog offer. Absent data reads "Sin datos"; the CTA only opens the account entry of the club onboarding. */
export const OfferCard = forwardRef<HTMLElement, CardProps>(function OfferCard({ offer, enabled, onFocusWithin }, ref) {
  const titleId = `offer-${offer.code}`
  return (
    <section ref={ref} id={`offer-card-${offer.code}`} aria-labelledby={titleId} className={`${cardBox} flex flex-col`} onFocus={onFocusWithin}>
      <h2 id={titleId} className="text-4xl font-bold leading-10 text-[#FAFAEB]">{offer.code}</h2>
      <p className="mt-2 text-base leading-6 text-[#E7E7E8]">{OFFER_PURPOSE[offer.code]}</p>
      <p className="mt-1 break-words text-sm leading-5 text-[#B6B5B7]" aria-label={`Precio: ${priceSpoken(offer.price)}`}>{priceLabel(offer.price)}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
        {LIMITS.map(({ key, label }) => {
          const value = limitLabel(key, offer.limits[key])
          const missing = value === MISSING
          return (
            <div key={key} className="flex min-w-0 flex-col">
              <dt className="order-2 mt-1 text-sm leading-5 text-[#E7E7E8]">{label}</dt>
              <dd className="order-1 flex items-center gap-1.5">
                {key === 'MAX_ACTIVE_TOURNAMENTS' ? <TrophyOutlineIcon size={20} color="#E7E7E8" /> : <LimitIcon limit={key} size={22} color="#E7E7E8" />}
                <span className={missing ? 'text-base font-medium leading-9 text-[#B6B5B7]' : value.length > 3 ? 'text-xl font-semibold leading-9 text-[#FAFAEB]' : 'text-[28px] font-semibold leading-9 text-[#FAFAEB]'}>{value}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="my-5 h-px bg-[#2E2B33]" />

      <dl className="flex flex-col gap-5">
        {FLAGS.map(({ key, label }) => {
          const value = offer.flags[key]
          return (
            <div key={key} className="flex min-h-5 items-center justify-between gap-3">
              <dt className="text-sm leading-5 text-[#E7E7E8]">{label}</dt>
              <dd className="flex shrink-0 items-center gap-2 text-sm font-semibold leading-5 text-[#FAFAEB]">
                {value === 'yes' ? <CheckIcon /> : value === 'no' ? <CrossIcon /> : <MissingIcon />}
                <span className={value === 'absent' ? 'text-[#B6B5B7]' : undefined}>{flagLabel(value)}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="mt-auto pt-6">
        {enabled ? (
          <Link
            to={ROUTES.register}
            className={`flex h-12 w-full items-center justify-center rounded-lg bg-[#C9CF38] px-6 text-sm font-medium leading-[21px] text-[#120F18] hover:bg-[#B5BA32] ${focusRing}`}
          >
            {OFFER_CTA[offer.code]}
          </Link>
        ) : (
          <button type="button" disabled className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-lg bg-[#3A3740] px-6 text-sm font-medium leading-[21px] text-[#929195]">
            {OFFER_CTA[offer.code]}
          </button>
        )}
      </div>
    </section>
  )
})

export function SkeletonCard({ code }: { code: OfferCode }) {
  const bar = 'animate-pulse rounded bg-[#2E2B33] motion-reduce:animate-none'
  return (
    <section aria-label={`${code}, cargando`} className={`${cardBox} flex flex-col`}>
      <p className="text-4xl font-bold leading-10 text-[#FAFAEB]">{code}</p>
      <div className={`mt-3 h-4 w-40 ${bar}`} />
      <div className={`mt-2 h-3 w-24 ${bar}`} />
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
        {LIMITS.map(({ key }) => (
          <div key={key}>
            <div className={`h-6 w-14 ${bar}`} />
            <div className={`mt-2 h-3 w-24 ${bar}`} />
          </div>
        ))}
      </div>
      <div className="my-4 h-px bg-[#2E2B33]" />
      <div className="flex flex-col gap-3">
        {FLAGS.map(({ key }) => <div key={key} className={`h-4 w-full ${bar}`} />)}
      </div>
      <div className="mt-auto pt-6">
        <button type="button" disabled className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-lg bg-[#3A3740] px-6 text-sm font-medium leading-[21px] text-[#929195]">
          {OFFER_CTA[code]}
        </button>
      </div>
    </section>
  )
}
