import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { CategoryPolicyPage } from '@/features/club/category-policy/CategoryPolicyPage'
import { ClubVenuesPage, MyClubPage } from '@/features/club/venues/ClubVenuesPage'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'
import PublicLayout from '@/features/public/shared/layouts/PublicLayout'
import AppLayout from '@/features/app/layout/AppLayout'
import { LandingPage } from '@/features/public/landing/pages/LandingPage'
import { PricingPage } from '@/features/public/pricing/pages/PricingPage'
import { FaqPage } from '@/features/public/faq/pages/FaqPage'
import { acceptedReturnPath } from '@/features/auth/access-destination'
import { ContinuePage } from '@/features/auth/pages/ContinuePage'
import { RecoveryPage } from '@/features/auth/pages/RecoveryPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { PlayerRegisterPage } from '@/features/auth/pages/PlayerRegisterPage'
import { SessionUnverifiedPage } from '@/features/auth/pages/SessionUnverifiedPage'
import { MyTournamentsPage } from '@/features/app/my-tournaments/pages/MyTournamentsPage'
import { DashboardPage } from '@/features/app/dashboard/pages/DashboardPage'
import { DesignSystemPage } from '@/features/design-system/pages/DesignSystemPage'
import { EventsListPage } from '@/features/app/events/pages/EventsListPage'
import { EventsLocationPage } from '@/features/app/events/pages/EventsLocationPage'
import { EventDetailPage } from '@/features/app/events/pages/EventDetailPage'
import { EventCategoryLayout } from '@/features/app/events/pages/EventCategoryLayout'
import {
  EventCategoryDefaultRedirect,
  EventCategoryTabPage,
  LegacyEventEnrollRedirect,
  LegacyEventTabRedirect,
} from '@/features/app/events/pages/EventCategoryTabPage'
import { EventCategoryEnrollPage } from '@/features/app/events/pages/EventCategoryEnrollPage'
import { OwnerBillingPage } from '@/features/owner/OwnerBillingPage'
import { OwnerCatalogPage } from '@/features/owner/OwnerCatalogPage'
import { OwnerGate } from '@/features/owner/OwnerGate'
import { ProtectedRoute } from './ProtectedRoute'
import { StartupReady, StartupRouteError } from '@/features/startup/StartupReady'

function ContinueRoute() {
  const { phase, destination } = useAuth()
  if (phase === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#120F18]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9CF38] border-t-transparent" />
      </div>
    )
  }
  if (phase === 'unverified') return <SessionUnverifiedPage />
  if (phase !== 'ready' || !destination) return <Navigate to={ROUTES.login} replace />
  if (destination.kind !== 'continue') {
    return <Navigate to={acceptedReturnPath('web', destination, null)} replace />
  }
  return <StartupReady><ContinuePage /></StartupReady>
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, destination, phase, user } = useAuth()
  if (phase === 'unverified') return <SessionUnverifiedPage />
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }
  if (isAuthenticated && user?.platformRole === 'SUPER_ADMIN') {
    return <Navigate to="/owner" replace />
  }
  if (isAuthenticated && destination) {
    return <Navigate to={acceptedReturnPath('web', destination, null)} replace />
  }
  return <StartupReady>{children}</StartupReady>
}

const router = createBrowserRouter(createRoutesFromElements(
      <Route errorElement={<StartupRouteError />}>
        <Route path="/club/settings" element={<ProtectedRoute><StartupReady><MyClubPage /></StartupReady></ProtectedRoute>} />
        <Route path="/club/settings/venues/*" element={<ProtectedRoute><StartupReady><ClubVenuesPage /></StartupReady></ProtectedRoute>} />
        <Route path="/club/settings/categories" element={<ProtectedRoute><StartupReady><CategoryPolicyPage /></StartupReady></ProtectedRoute>} />
        <Route
          path={ROUTES.login}
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route path="/forgot-password" element={<StartupReady><RecoveryPage /></StartupReady>} />
        <Route path="/reset-password" element={<StartupReady><RecoveryPage reset /></StartupReady>} />
        <Route path={ROUTES.authContinue} element={<ContinueRoute />} />
        <Route path="/register/player" element={<RedirectIfAuthenticated><PlayerRegisterPage /></RedirectIfAuthenticated>} />
        <Route path="/register/player/verify" element={<StartupReady><PlayerRegisterPage /></StartupReady>} />
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<StartupReady><LandingPage /></StartupReady>} />
          <Route path={ROUTES.designSystem} element={<StartupReady><DesignSystemPage /></StartupReady>} />
          <Route path={ROUTES.pricing} element={<StartupReady><PricingPage /></StartupReady>} />
          <Route path={ROUTES.faq} element={<StartupReady><FaqPage /></StartupReady>} />
          <Route
            path={ROUTES.register}
            element={
              <RedirectIfAuthenticated>
                <RegisterPage />
              </RedirectIfAuthenticated>
            }
          />
        </Route>

        <Route
          path={ROUTES.app}
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="events" element={<StartupReady><EventsListPage /></StartupReady>} />
          <Route path="events/location" element={<StartupReady><EventsLocationPage /></StartupReady>} />
          <Route path="events/:eventId" element={<StartupReady><EventDetailPage /></StartupReady>} />
          <Route path="events/:eventId/categories/:categoryId/enroll" element={<StartupReady><EventCategoryEnrollPage /></StartupReady>} />
          <Route path="events/:eventId/categories/:categoryId" element={<EventCategoryLayout />}>
            <Route index element={<EventCategoryDefaultRedirect />} />
            <Route path=":tab" element={<EventCategoryTabPage />} />
          </Route>
          <Route path="events/:eventId/registrations" element={<LegacyEventTabRedirect tab="inscripciones" />} />
          <Route path="events/:eventId/qualifier" element={<LegacyEventTabRedirect tab="clasificatoria" />} />
          <Route path="events/:eventId/brackets" element={<LegacyEventTabRedirect tab="cuadros" />} />
          <Route path="events/:eventId/enroll" element={<LegacyEventEnrollRedirect />} />
          <Route path="tournaments" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="categories" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="players" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="pairs" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="courts" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="matches" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="settings" element={<StartupReady><DashboardPage /></StartupReady>} />
          <Route path="my-tournaments" element={<StartupReady><MyTournamentsPage /></StartupReady>} />
        </Route>

        <Route path="/owner" element={<OwnerGate><OwnerBillingPage /></OwnerGate>} />
        <Route path="/owner/catalog" element={<OwnerGate><OwnerCatalogPage /></OwnerGate>} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Route>
))

export function AppRouter() {
  return <RouterProvider router={router} />
}
