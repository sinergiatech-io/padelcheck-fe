import { useEffect, useState, useSyncExternalStore } from 'react'
import { createApiClient } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { RegistrationLocation, type PositionProvider } from './registration-location'

const api = createApiClient({ baseUrl: API_BASE, getToken: () => null })
type Initial = Parameters<RegistrationLocation['preset']>[0]
/** `initial` seeds a saved location once (club resume / venue preload); GPS detection is skipped when it is present. */
export function useRegistrationLocation(provider: PositionProvider, enabled: boolean, initial?: Initial) {
  const [model] = useState(() => {
    const created = new RegistrationLocation(api, provider)
    if (initial) created.preset(initial)
    return created
  })
  const state = useSyncExternalStore(model.subscribe, () => model.state)
  useEffect(() => {
    if (enabled) void model.initialize()
    return () => model.cancel()
  }, [model, enabled])
  return { model, state }
}
