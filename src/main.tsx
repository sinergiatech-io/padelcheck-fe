import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { queryClient } from '@/lib/query-client'
import { AppRouter } from '@/routes'
import { StartupErrorBoundary } from '@/features/startup/StartupReady'
import '@/styles/globals.css'

window.padelStartup?.mounted()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </QueryClientProvider>
    </StartupErrorBoundary>
  </StrictMode>
)
