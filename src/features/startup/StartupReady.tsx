import { Component, useLayoutEffect, type ReactNode } from 'react'

declare global {
  interface Window {
    padelStartup?: {
      ready: () => void
      fail: () => void
      mounted: () => void
    }
  }
}

/** Mount only around a real destination, never around a guard or redirect. */
export function StartupReady({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  useLayoutEffect(() => { if (enabled) window.padelStartup?.ready() }, [enabled])
  return <>{children}</>
}

export function StartupRouteError() {
  useLayoutEffect(() => { window.padelStartup?.fail() }, [])
  return <p role="alert">No pudimos iniciar Padel Check. Recargá la página para volver a intentarlo.</p>
}

export class StartupErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { window.padelStartup?.fail() }
  render() { return this.state.failed ? <StartupRouteError /> : this.props.children }
}
