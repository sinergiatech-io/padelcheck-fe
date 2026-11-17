import { useCallback, useEffect, useRef, useState } from 'react'
import { failureKind, planApi, type BillingCharge, type ClubEventOption } from './plan-api'
import {
  acceptRead,
  chargeReading,
  chargeStorageKey,
  focusRecheckAllowed,
  forgetCharge,
  forgetPlanCharges,
  loadIfCurrent,
  nextEventSelection,
  recallCharge,
  rememberCharge,
  type BillingScope,
  type ClubSubscription,
  type ClubUsage,
  type KeyValueStore,
} from './plan-model'

export type PlanPhase = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden'

const sessionStore: KeyValueStore = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key),
  keys: () => Object.keys(sessionStorage),
}

export function storedCharge(scope: BillingScope): string | null {
  return recallCharge(sessionStore, scope)
}

export function useClubPlan(clubId: string | null, userId: string | null, session: number) {
  const sessionKey = `${userId ?? ''}:${session}`
  const generation = useRef(0)
  const usageTicket = useRef(0)
  const eventIdRef = useRef<string | null>(null)
  const lastFocus = useRef(0)
  const posting = useRef(false)
  const hasData = useRef(false)
  const scopeRef = useRef<BillingScope | null>(null)
  scopeRef.current = clubId && userId ? { userId, session, clubId } : null
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

  const currentScope = useCallback((): BillingScope | null => scopeRef.current, [])

  const loadCharge = useCallback(async (scope: BillingScope, currentReference: string, ticket: { generation: number; request: number }) => {
    try {
      const next = await planApi.charge(scope.clubId, currentReference)
      if (generation.current !== ticket.generation || usageTicket.current !== ticket.request) return
      const active = scopeRef.current
      if (!active || chargeStorageKey(scope) !== chargeStorageKey(active)) return
      if (chargeReading(next) === 'confirmed') {
        forgetCharge(sessionStore, scope)
        setReference(null)
        setCharge(null)
        setBanner('El pago figura confirmado. El plan se actualiza con esta lectura.')
        return
      }
      setCharge(next)
      setBanner(null)
    } catch (error) {
      if (generation.current !== ticket.generation || usageTicket.current !== ticket.request) return
      const kind = failureKind(error)
      if (kind === 'cancelled' || kind === 'unauthorized') return
      if (kind === 'not-found-charge') {
        forgetCharge(sessionStore, scope)
        setReference(null)
        setCharge(null)
        setBanner('No encontramos ese intento de cobro para este club.')
        return
      }
      setBanner('Todavía sin confirmación.')
    }
  }, [])

  const recoverWithoutEvent = useCallback(async (id: string, started: number) => {
    replaceEvent(null)
    setEventNotice('Ese torneo ya no está disponible.')
    setUsage((current) => current ? { ...current, event: null } : current)
    try {
      const recovered = await loadIfCurrent({
        started,
        current: () => generation.current,
        load: () => Promise.all([planApi.subscription(id), planApi.usage(id, null)]),
      })
      if (recovered === 'stale') return
      const [nextSubscription, nextUsage] = recovered
      if (nextUsage.event) {
        setPhase('error')
        return
      }
      setSubscription(nextSubscription)
      setUsage(nextUsage)
      hasData.current = true
      setPhase('ready')
    } catch (error) {
      if (generation.current !== started) return
      const kind = failureKind(error)
      if (kind === 'cancelled' || kind === 'unauthorized') return
      if (kind === 'forbidden') {
        setPhase('forbidden')
        return
      }
      if (hasData.current) {
        setBanner('No pudimos actualizar. Conservamos la última lectura del club.')
        setPhase('ready')
        return
      }
      setPhase('error')
    }
  }, [replaceEvent])

  const refresh = useCallback(async (quiet: boolean) => {
    if (!clubId) return
    const scope = { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current }
    const ticket = ++usageTicket.current
    if (!quiet) {
      setPhase('loading')
      setSubscription(null)
      setUsage(null)
      setBanner(null)
      hasData.current = false
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
        setBanner('No pudimos actualizar el torneo elegido. Conservamos la última lectura.')
        setPhase('ready')
        return
      }
      if (!eventIdRef.current && nextUsage.event) {
        setPhase('error')
        return
      }
      setSubscription(nextSubscription)
      setUsage(nextUsage)
      hasData.current = true
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
      const active = currentScope()
      const stored = active ? recallCharge(sessionStore, active) : null
      setReference(stored)
      if (stored && active) await loadCharge(active, stored, { generation: generation.current, request: ticket })
    } catch (error) {
      if (!acceptRead(scope, { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current })) return
      if (usageTicket.current !== ticket) return
      const kind = failureKind(error)
      if (kind === 'cancelled' || kind === 'unauthorized') return
      if (kind === 'not-found-event' || kind === 'invalid-event') {
        await recoverWithoutEvent(clubId, generation.current)
        return
      }
      if (kind === 'forbidden') {
        setPhase('forbidden')
        return
      }
      if (quiet && hasData.current) setBanner('No pudimos actualizar. Conservamos la última lectura.')
      else setPhase('error')
    } finally {
      if (usageTicket.current === ticket) setChecking(false)
    }
  }, [clubId, currentScope, loadCharge, recoverWithoutEvent, replaceEvent, sessionKey])

  useEffect(() => {
    if (!userId) forgetPlanCharges(sessionStore)
  }, [userId])

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
    hasData.current = false
    const active = currentScope()
    setReference(active ? recallCharge(sessionStore, active) : null)
    if (!clubId || !userId) {
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
        hasData.current = true
        if (nextEvents.ok) {
          setEvents(nextEvents.value)
          setEventsFailed(false)
        } else if (failureKind(nextEvents.error) !== 'cancelled' && failureKind(nextEvents.error) !== 'unauthorized') {
          setEventsFailed(true)
          setEvents(null)
        }
        setPhase('ready')
        const storedScope = currentScope()
        const stored = storedScope ? recallCharge(sessionStore, storedScope) : null
        setReference(stored)
        if (stored && storedScope) await loadCharge(storedScope, stored, { generation: generation.current, request: ticket })
      } catch (error) {
        if (controller.signal.aborted || usageTicket.current !== ticket) return
        const kind = failureKind(error)
        if (kind === 'cancelled' || kind === 'unauthorized') return
        setPhase(kind === 'forbidden' ? 'forbidden' : 'error')
      }
    })()
    return () => controller.abort()
  }, [clubId, currentScope, loadCharge, replaceEvent, sessionKey, userId])

  const selectEvent = useCallback(async (next: string | null) => {
    if (!clubId || phase !== 'ready') return
    const previous = eventIdRef.current
    if (previous === next) return
    const scope = { clubId, eventId: next, sessionKey, request: generation.current }
    const ticket = ++usageTicket.current
    replaceEvent(next)
    setUsage((current) => current ? { ...current, event: null } : current)
    try {
      const nextUsage = await planApi.usage(clubId, next)
      if (!acceptRead(scope, { clubId, eventId: eventIdRef.current, sessionKey, request: generation.current })) return
      if (usageTicket.current !== ticket) return
      if (next && nextUsage.event?.eventId !== next) return
      if (!next && nextUsage.event) return
      setUsage(nextUsage)
      setEventNotice(null)
    } catch (error) {
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
  }, [clubId, phase, replaceEvent, sessionKey])

  const recheck = useCallback(async (reason: 'manual' | 'focus') => {
    if (!clubId) return
    const now = Date.now()
    const active = currentScope()
    if (reason === 'focus' && !focusRecheckAllowed({
      hasReference: Boolean(active && recallCharge(sessionStore, active)),
      postInFlight: posting.current,
      lastRecheckAt: lastFocus.current,
      now,
    })) return
    if (posting.current) return
    lastFocus.current = now
    await refresh(phase === 'ready')
  }, [clubId, currentScope, phase, refresh])

  const rememberReference = useCallback((value: string) => {
    const active = currentScope()
    if (!active) return
    rememberCharge(sessionStore, active, value)
    setReference(recallCharge(sessionStore, active))
  }, [currentScope])

  const recallReference = useCallback(() => {
    const active = currentScope()
    return active ? recallCharge(sessionStore, active) : null
  }, [currentScope])

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
    recallReference,
    reloadEvents: async () => {
      if (!clubId) return
      const started = generation.current
      const id = clubId
      try {
        const next = await loadIfCurrent({
          started,
          current: () => generation.current,
          load: () => planApi.events(id),
        })
        if (next === 'stale' || generation.current !== started) return
        setEvents(next)
        setEventsFailed(false)
        const kept = nextEventSelection(eventIdRef.current, next)
        if (kept !== eventIdRef.current) replaceEvent(kept)
      } catch (error) {
        if (generation.current !== started) return
        if (failureKind(error) !== 'cancelled' && failureKind(error) !== 'unauthorized') setEventsFailed(true)
      }
    },
  }
}
