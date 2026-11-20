import { useState, useSyncExternalStore } from 'react'
import { apiClient } from '@/lib/api-client'
import { createApiClient } from '@/lib/http-client'
import { API_BASE } from '@/lib/constants'
import { parseOffers, providerUrl } from '@/features/club/plan/plan-model'
import { createOnboardingApi } from './api'
import { ClubOnboardingFlow } from './flow'
import type { GoogleClubDraft } from './google-club-draft'
import type { Transport } from './api'

// Public onboarding endpoints never send a stored bearer; only the resume of an authenticated admin does.
const publicClient = createApiClient({ baseUrl: API_BASE, getToken: () => null })

function browserStore() {
  try { return window.localStorage } catch { return null }
}

export function useClubOnboarding(googleDraft?: GoogleClubDraft) {
  const transport: Transport = googleDraft ? {
    get: (path, options) => publicClient.get(path, path.startsWith('/onboarding/clubs/') ? { ...options, headers: { 'X-Onboarding-Continuation': googleDraft.token } } : options),
    post: (path, body, options) => publicClient.post(path, body, { ...options, headers: { "X-Onboarding-Continuation": googleDraft.token } }),
  } : publicClient

  const [flow] = useState(() => new ClubOnboardingFlow({
    api: createOnboardingApi(transport, apiClient),
    store: googleDraft ? sessionStorage : browserStore(),
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
