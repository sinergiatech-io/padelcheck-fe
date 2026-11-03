// Capture before the router is created. Never put link proof in router state/storage.
let proof: string | undefined
if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
  const values = new URLSearchParams(window.location.search).getAll('token')
  proof = values.length === 1 ? values[0] : ''
  window.history.replaceState(window.history.state, '', '/reset-password')
}
export function takeRecoveryProof() {
  const value = proof ?? ''
  queueMicrotask(() => { proof = undefined })
  return value
}
