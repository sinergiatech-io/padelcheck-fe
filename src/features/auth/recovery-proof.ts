// Capture before the router is created. Never put link proof in router state/storage.
let proof: string | undefined
let proofPath: string | undefined
if (typeof window !== 'undefined' && ['/reset-password', '/activate-player'].includes(window.location.pathname)) {
  proofPath = window.location.pathname
  const values = new URLSearchParams(window.location.search).getAll('token')
  proof = values.length === 1 ? values[0] : ''
  window.history.replaceState(window.history.state, '', proofPath)
}
export function takeRecoveryProof(path = '/reset-password') {
  if (path !== proofPath) return ''
  const value = proof ?? ''
  queueMicrotask(() => { proof = undefined; proofPath = undefined })
  return value
}
