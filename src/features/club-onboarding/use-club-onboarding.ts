import { useState, useSyncExternalStore } from 'react'
import { apiClient } from '@/lib/api-client'
import { createApiClient } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { parseOffers, providerUrl } from '@/features/club/plan/plan-model'
import { createOnboardingApi } from './api'
import { ClubOnboardingFlow } from './flow'

// Public onboarding endpoints never send a stored bearer; only the resume of an authenticated admin does.
const publicClient = createApiClient({ baseUrl: API_BASE, getToken: () => null })

function browserStore() {
  try { return window.localStorage } catch { return null }
}

export function useClubOnboarding() {
  const [flow] = useState(() => new ClubOnboardingFlow({
    api: createOnboardingApi(publicClient, apiClient),
    store: browserStore(),
    platform: 'WEB',
    checkoutUrl: url => {
      // The local checkout fixture is only available over HTTP in development.
      if (import.meta.env.DEV && typeof url === 'string'
        && /^http:\/\/127\.0\.0\.1:18098\/checkout\/[A-Za-z0-9_-]+$/.test(url)) return url
      return providerUrl(url)
    },
    openCheckout: url => window.location.assign(url),
    parseOffers: value => parseOffers(value),
  }))
  const state = useSyncExternalStore(flow.subscribe, flow.getSnapshot)
  return { flow, state }
}
