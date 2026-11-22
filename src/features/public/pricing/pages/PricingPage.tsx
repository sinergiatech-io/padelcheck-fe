import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { RegistrationBanner } from '@/features/auth/components/RegistrationShell'
import { ROUTES } from '@/lib/constants'
import { OfferCard, SkeletonCard } from '../components/OfferCard'
import { PricingShell } from '../components/PricingShell'
import { focusRing } from '../components/styles'
import {
  OFFER_CODES,
  PLAN_NOTES,
  offerAtOffset,
  offerCtaEnabled,
  offsetForOffer,
  segmentKeyTarget,
  type OfferCode,
} from '../pricing-model'
import { usePlanCatalog } from '../use-plan-catalog'

/** Authenticated club plan panel (KAN-143). Anonymous visitors sign in first and come back to it. */
const CLUB_PLAN = '/club/plan'
const CHANGE_PLAN_LOGIN = `${ROUTES.login}?returnUrl=${encodeURIComponent(CLUB_PLAN)}`

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export function PricingPage() {
  const catalog = usePlanCatalog()
  const { isAuthenticated } = useAuth()
  const [focused, setFocused] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const strip = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLElement | null)[]>([])
  const segments = useRef<(HTMLButtonElement | null)[]>([])
  const programmatic = useRef<number | null>(null)
  const settleTimer = useRef<number>()

  const showOffers = catalog.phase === 'ready' && catalog.catalog?.status !== 'empty'
  const offers = useMemo(
    () => (catalog.phase === 'ready' && catalog.catalog && catalog.catalog.status !== 'empty' ? catalog.catalog.offers : []),
    [catalog.phase, catalog.catalog],
  )
  const segmentsEnabled = showOffers

  const geometry = useCallback(() => {
    const element = strip.current
    if (!element) return null
    const padding = parseFloat(getComputedStyle(element).paddingLeft) || 0
    const origin = element.getBoundingClientRect().left
    const starts = cards.current.map((card) => (card ? card.getBoundingClientRect().left - origin + element.scrollLeft - padding : 0))
    return { element, starts, max: element.scrollWidth - element.clientWidth }
  }, [])

  const announce = useCallback((index: number) => {
    setAnnouncement(`Oferta en foco: ${OFFER_CODES[index]}`)
  }, [])

  const activate = useCallback((index: number) => {
    setFocused(index)
    announce(index)
    const g = geometry()
    if (!g) return
    const left = offsetForOffer(index, g.starts, g.max)
    programmatic.current = index
    g.element.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => { programmatic.current = null }, 700)
  }, [announce, geometry])

  const onScroll = useCallback(() => {
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      const g = geometry()
      if (!g) return
      // Explicit activation keeps the chosen segment even when two offers share the final offset (768 px).
      const chosen = programmatic.current
      programmatic.current = null
      if (chosen !== null && Math.abs(g.element.scrollLeft - offsetForOffer(chosen, g.starts, g.max)) <= 2) return
      const index = offerAtOffset(g.element.scrollLeft, g.max, g.starts)
      setFocused((current) => {
        if (current !== index) announce(index)
        return index
      })
    }, 120)
  }, [announce, geometry])

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  // A fresh catalog starts again on FREE at the beginning of the strip.
  useEffect(() => {
    if (!showOffers) return
    setFocused(0)
    strip.current?.scrollTo({ left: 0 })
  }, [showOffers, catalog.catalog])

  const onSegmentKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = segmentKeyTarget(event.key, index, OFFER_CODES.length)
    if (target === null) return
    event.preventDefault()
    segments.current[target]?.focus()
    activate(target)
  }

  const onCardFocus = (index: number) => {
    if (index !== focused) activate(index)
  }

  const changePlan = isAuthenticated ? CLUB_PLAN : CHANGE_PLAN_LOGIN

  return (
    <PricingShell>
      <div className="mx-auto w-full max-w-[768px]">
        <div className="px-4 md:px-8">
          <div aria-hidden="true" className="relative h-px bg-[#2E2B33]"><span className="absolute left-0 top-[-1px] h-[3px] w-8 rounded-full bg-[#C9CF38]" /></div>
          <h1 className="mt-6 text-[32px] font-semibold leading-10 text-[#FAFAEB]">Compará los planes para tu club</h1>
          <p className="mt-2 text-base leading-6 text-[#B6B5B7]">Empezá gratis y elegí el plan que acompañe la actividad de tu club.</p>

          <div className="mt-5 text-[#120F18] empty:hidden">
            {catalog.phase === 'loading' && <RegistrationBanner tone="info" title="Cargando planes" detail="Estamos consultando los planes disponibles." />}
            {catalog.phase === 'error' && <RegistrationBanner tone="error" role="alert" title="No pudimos cargar los planes" detail="Revisá tu conexión e intentá nuevamente." />}
            {catalog.phase === 'ready' && catalog.catalog?.status === 'empty' && <RegistrationBanner tone="warning" title="No hay planes disponibles" detail="Por el momento no hay planes para mostrar. Intentá nuevamente más tarde." />}
            {catalog.phase === 'ready' && catalog.catalog?.status === 'incomplete' && <RegistrationBanner tone="warning" title="Información incompleta" detail="Algunos datos no están disponibles. Las ofertas sin datos no se pueden elegir por ahora." />}
            {(catalog.phase === 'error' || (catalog.phase === 'ready' && catalog.catalog?.status === 'empty')) && (
              <button type="button" onClick={catalog.retry} className={`mt-3 flex h-12 w-full items-center justify-center rounded-lg bg-[#C9CF38] px-6 text-sm font-medium leading-[21px] text-[#120F18] ${focusRing}`}>
                Reintentar
              </button>
            )}
          </div>

          {(catalog.phase === 'loading' || showOffers) && (
            <div role="group" aria-label="Ofertas de planes" className="mt-5 flex rounded-lg border border-[#3A3740] p-0.5">
              {OFFER_CODES.map((code, index) => (
                <button
                  key={code}
                  ref={(node) => { segments.current[index] = node }}
                  type="button"
                  disabled={!segmentsEnabled}
                  aria-current={segmentsEnabled && focused === index ? 'true' : undefined}
                  aria-controls={segmentsEnabled ? `offer-card-${code}` : undefined}
                  onClick={() => activate(index)}
                  onKeyDown={(event) => onSegmentKey(event, index)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-md text-sm font-medium leading-5 transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:text-[#605E64] ${
                    segmentsEnabled && focused === index ? 'bg-[#3A3740] text-[#FAFAEB]' : 'text-[#B6B5B7] hover:text-[#FAFAEB]'
                  } ${focusRing} focus-visible:outline-offset-0`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
          <p aria-live="polite" className="sr-only">{announcement}</p>
        </div>

        {(catalog.phase === 'loading' || showOffers) && (
          <div
            ref={strip}
            onScroll={showOffers ? onScroll : undefined}
            aria-busy={catalog.phase === 'loading'}
            className="mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden"
          >
            {catalog.phase === 'loading'
              ? OFFER_CODES.map((code) => <SkeletonCard key={code} code={code} />)
              : offers.map((offer, index) => (
                <OfferCard
                  key={offer.code}
                  ref={(node) => { cards.current[index] = node }}
                  offer={offer}
                  enabled={offerCtaEnabled(catalog.catalog, offer.code as OfferCode)}
                  onFocusWithin={() => onCardFocus(index)}
                />
              ))}
          </div>
        )}

        <div className="px-4 md:px-8">
          <div className="mt-10 h-px bg-[#2E2B33]" />
          <section aria-labelledby="plan-notes" className="mt-6">
            <h2 id="plan-notes" className="text-lg font-semibold leading-7 text-[#FAFAEB]">Sobre los planes</h2>
            <div className="mt-3 flex flex-col gap-4">
              {PLAN_NOTES.map((note) => <p key={note} className="text-[15px] leading-6 text-[#B6B5B7]">{note}</p>)}
            </div>
          </section>
          <div className="mt-6 h-px bg-[#2E2B33]" />
          <p className="mt-4 text-center text-sm leading-5 text-[#FAFAEB]">
            ¿Ya tenés un club?{' '}
            <Link to={changePlan} className={`inline-flex min-h-11 items-center font-medium underline-offset-2 hover:underline ${focusRing}`}>Cambiar plan</Link>
          </p>
        </div>
      </div>
    </PricingShell>
  )
}
