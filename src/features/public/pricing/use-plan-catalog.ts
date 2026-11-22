import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { INITIAL_CATALOG_STATE, createCatalogLoader, settleCatalog, type CatalogState } from './pricing-model'

const TIMEOUT_MS = 20000

/** Public GET /plans read (KAN-136). Retry reuses an in-flight read and returns to the loading state. */
export function usePlanCatalog() {
  const [state, setState] = useState<CatalogState>(INITIAL_CATALOG_STATE)
  const loader = useRef<ReturnType<typeof createCatalogLoader> | null>(null)
  if (!loader.current) loader.current = createCatalogLoader(() => apiClient.get<unknown>('/plans', { timeoutMs: TIMEOUT_MS }))

  const load = useCallback(() => {
    const current = loader.current
    if (!current) return
    void current.load((result) => setState((previous) => settleCatalog(previous, result, false)))
  }, [])

  useEffect(() => {
    const current = loader.current
    load()
    return () => current?.dispose()
  }, [load])

  const retry = useCallback(() => {
    if (loader.current?.busy) return
    setState(INITIAL_CATALOG_STATE)
    load()
  }, [load])

  return { ...state, retry }
}
