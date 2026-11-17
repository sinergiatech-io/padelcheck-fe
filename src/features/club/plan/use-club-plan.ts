import { useCallback, useEffect, useRef, useState } from 'react'
import { failureKind, planApi, type BillingCharge, type ClubEventOption } from './plan-api'
import {
  acceptRead,
  chargeReading,
  focusRecheckAllowed,
  forgetCharge,
  nextEventSelection,
  recallCharge,
  rememberCharge,
  type ClubSubscription,
  type ClubUsage,
  type KeyValueStore,
} from './plan-model'

export type PlanPhase = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden'

const sessionStore: KeyValueStore = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key),
}

export function storedCharge(clubId: string): string | null {
  return recallCharge(sessionStore, clubId)
}

export function useClubPlan(clubId: string | null, sessionKey: string) {
  const generation = useRef(0)
  const usageTicket = useRef(0)
  const eventIdRef = useRef<string | null>(null)
  const lastFocus = useRef(0)
  const posting = useRef(false)
  const [phase, setPhase] = useState<PlanPhase>('idle')
  const [subscription, setSubscription] = useState<ClubSubscription | null>(null)
  const [usage, setUsage] = useState<ClubUsage | null>(null)
  const [events, setEvents] = useState<ClubEventOption[] | null>(null)
  const [eventsFailed, setEventsFailed] = useState(false)
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventNotice, setEventNotice] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [charge, setCharge] = useState<BillingCharge | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const replaceEvent = useCallback((value: string | null) => {
    eventIdRef.current = value
    setEventId(value)
  }, [])

  const loadCharge = useCallback(async (id: string, currentReference: string, scope: { generation: number; ticket: number }) => {
    try {
      const next = await planApi.charge(id, currentReference)
      if (generation.current !== scope.generation || usageTicket.current !== scope.ticket) return
      if (chargeReading(next) === 'confirmed') {
        forgetCharge(sessionStore, id)
        setReference(null)
        setCharge(null)
        setBanner('El pago figura confirmado. El plan se actualiza con esta lectura.')
        return
      }
      setCharge(next)
      setBanner(null)
    } catch (error) {
      if (generation.current !== scope.generation || usageTicket.current !== scope.ticket) return
      const kind = failureKind(error)
      if (kind === 'cancelled' || kind === 'unauthorized') return
      if (kind === 'not-found-charge') {
        forgetCharge(sessionStore, id)
        setReference(null)
        setCharge(null)
        setBanner('No encontramos ese intento de cobro para este club.')
        return
      }
      setBanner('Todavía sin confirmación.')
    }
  }, [])

  const refresh = useCallback(async (quiet: boolean) => {
    if (!clubId) return
    const scope = { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current }
    const ticket = ++usageTicket.current
    if (!quiet) {
      setPhase('loading')
      setSubscription(null)
      setUsage(null)
      setBanner(null)
    } else {
      setChecking(true)
    }
    try {
      const [nextSubscription, nextUsage, nextEvents] = await Promise.all([
        planApi.subscription(clubId),
        planApi.usage(clubId, eventIdRef.current),
        planApi.events(clubId).then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        ),
      ])
      const current = { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current }
      if (!acceptRead(scope, current) || usageTicket.current !== ticket) return
      if (eventIdRef.current && nextUsage.event?.eventId !== eventIdRef.current) {
        if (!quiet) setPhase('error')
        else setBanner('No pudimos actualizar el torneo elegido. Conservamos la última lectura.')
        return
      }
      if (!eventIdRef.current && nextUsage.event) {
        if (!quiet) setPhase('error')
        return
      }
      setSubscription(nextSubscription)
      setUsage(nextUsage)
      if (nextEvents.ok) {
        setEvents(nextEvents.value)
        setEventsFailed(false)
        const previousEvent = eventIdRef.current
        const kept = nextEventSelection(previousEvent, nextEvents.value)
        if (kept !== previousEvent) {
          replaceEvent(kept)
          if (previousEvent) setEventNotice('Ese torneo ya no está en el club.')
        }
      } else if (failureKind(nextEvents.error) !== 'cancelled' && failureKind(nextEvents.error) !== 'unauthorized') {
        setEventsFailed(true)
      }
      setPhase('ready')
      setBanner(null)
      const stored = recallCharge(sessionStore, clubId)
      setReference(stored)
      if (stored) await loadCharge(clubId, stored, { generation: generation.current, ticket })
    } catch (error) {
      if (!acceptRead(scope, { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current })) return
      if (usageTicket.current !== ticket) return
      const kind = failureKind(error)
      if (kind === 'cancelled' || kind === 'unauthorized') return
      if (kind === 'not-found-event' || kind === 'invalid-event') {
        replaceEvent(null)
        setEventNotice('Ese torneo ya no está disponible.')
        setPhase((value) => value === 'idle' ? 'error' : value)
        return
      }
      if (kind === 'forbidden') {
        setPhase('forbidden')
        return
      }
      if (quiet && subscription) setBanner('No pudimos actualizar. Conservamos la última lectura.')
      else setPhase('error')
    } finally {
      if (usageTicket.current === ticket) setChecking(false)
    }
  }, [clubId, loadCharge, replaceEvent, sessionKey, subscription])

  useEffect(() => {
    generation.current += 1
    usageTicket.current += 1
    replaceEvent(null)
    setSubscription(null)
    setUsage(null)
    setEvents(null)
    setEventsFailed(false)
    setEventNotice(null)
    setCharge(null)
    setBanner(null)
    setChecking(false)
    setReference(clubId ? recallCharge(sessionStore, clubId) : null)
    if (!clubId) {
      setPhase('idle')
      return
    }
    setPhase('loading')
    const scope = { clubId, eventId: null as string | null, sessionKey, request: generation.current }
    const ticket = usageTicket.current
    const controller = new AbortController()
    void (async () => {
      try {
        const [nextSubscription, nextUsage, nextEvents] = await Promise.all([
          planApi.subscription(clubId, controller.signal),
          planApi.usage(clubId, null, controller.signal),
          planApi.events(clubId, controller.signal).then(
            (value) => ({ ok: true as const, value }),
            (error: unknown) => ({ ok: false as const, error }),
          ),
        ])
        if (!acceptRead(scope, { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current })) return
        if (usageTicket.current !== ticket) return
        if (nextUsage.event) {
          setPhase('error')
          return
        }
        setSubscription(nextSubscription)
        setUsage(nextUsage)
        if (nextEvents.ok) {
          setEvents(nextEvents.value)
          setEventsFailed(false)
        } else if (failureKind(nextEvents.error) !== 'cancelled' && failureKind(nextEvents.error) !== 'unauthorized') {
          setEventsFailed(true)
          setEvents(null)
        }
        setPhase('ready')
        const stored = recallCharge(sessionStore, clubId)
        setReference(stored)
        if (stored) await loadCharge(clubId, stored, { generation: generation.current, ticket })
      } catch (error) {
        if (controller.signal.aborted || usageTicket.current !== ticket) return
        const kind = failureKind(error)
        if (kind === 'cancelled' || kind === 'unauthorized') return
        setPhase(kind === 'forbidden' ? 'forbidden' : 'error')
      }
    })()
    return () => controller.abort()
  }, [clubId, loadCharge, replaceEvent, sessionKey])

  const selectEvent = useCallback(async (next: string | null) => {
    if (!clubId || phase !== 'ready') return
    const previous = eventIdRef.current
    if (previous === next) return
    const scope = { clubId, eventId: next, sessionKey, request: generation.current }
    const ticket = ++usageTicket.current
    replaceEvent(next)
    try {
      const nextUsage = await planApi.usage(clubId, next)
      if (!acceptRead(scope, { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current })) return
      if (usageTicket.current !== ticket) return
      if (next && nextUsage.event?.eventId !== next) return
      if (!next && nextUsage.event) return
      setUsage(nextUsage)
      setEventNotice(null)
    } catch (error) {
      if (!acceptRead(scope, { clubId, eventId, sessionKey, request: generation.current }) && eventIdRef.current !== next) return
      if (usageTicket.current !== ticket) return
      const kind = failureKind(error)
      if (kind === 'cancelled' || kind === 'unauthorized') return
      replaceEvent(previous)
      if (kind === 'not-found-event' || kind === 'invalid-event') {
        setEvents((current) => current?.filter((item) => item.id !== next) ?? current)
        setEventNotice('Ese torneo ya no está disponible.')
        return
      }
      setEventNotice('No pudimos consultar ese torneo. Conservamos la consulta anterior.')
    }
  }, [clubId, eventId, phase, replaceEvent, sessionKey])

  const recheck = useCallback(async (reason: 'manual' | 'focus') => {
    if (!clubId) return
    const now = Date.now()
    if (reason === 'focus' && !focusRecheckAllowed({
      hasReference: Boolean(recallCharge(sessionStore, clubId)),
      postInFlight: posting.current,
      lastRecheckAt: lastFocus.current,
      now,
    })) return
    if (posting.current) return
    lastFocus.current = now
    await refresh(phase === 'ready')
  }, [clubId, phase, refresh])

  const rememberReference = useCallback((value: string) => {
    if (!clubId) return
    rememberCharge(sessionStore, clubId, value)
    setReference(recallCharge(sessionStore, clubId))
  }, [clubId])

  return {
    phase,
    subscription,
    usage,
    events,
    eventsFailed,
    eventId,
    eventNotice,
    reference,
    charge,
    banner,
    checking,
    posting,
    selectEvent,
    reload: () => refresh(false),
    recheck,
    rememberReference,
    reloadEvents: async () => {
      if (!clubId) return
      try {
        const next = await planApi.events(clubId)
        if (generation.current) {
          setEvents(next)
          setEventsFailed(false)
          const kept = nextEventSelection(eventIdRef.current, next)
          if (kept !== eventIdRef.current) replaceEvent(kept)
        }
      } catch (error) {
        if (failureKind(error) !== 'cancelled' && failureKind(error) !== 'unauthorized') setEventsFailed(true)
      }
    },
  }
}
