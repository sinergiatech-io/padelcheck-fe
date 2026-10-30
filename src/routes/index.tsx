import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { CategoryPolicyPage } from '@/features/club/category-policy/CategoryPolicyPage'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/lib/constants'
import PublicLayout from '@/features/public/shared/layouts/PublicLayout'
import AppLayout from '@/features/app/layout/AppLayout'
import { LandingPage } from '@/features/public/landing/pages/LandingPage'
import { PricingPage } from '@/features/public/pricing/pages/PricingPage'
import { FaqPage } from '@/features/public/faq/pages/FaqPage'
import { acceptedReturnPath } from '@/features/auth/access-destination'
import { ContinuePage } from '@/features/auth/pages/ContinuePage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
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
import { ProtectedRoute } from './ProtectedRoute'

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
  return <ContinuePage />
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, destination, phase } = useAuth()
  if (phase === 'unverified') return <SessionUnverifiedPage />
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }
  if (isAuthenticated && destination) {
    return <Navigate to={acceptedReturnPath('web', destination, null)} replace />
  }
  return <>{children}</>
}

const router = createBrowserRouter(createRoutesFromElements(
      <>
        <Route path="/club/settings/categories" element={<ProtectedRoute><CategoryPolicyPage /></ProtectedRoute>} />
        <Route
          path={ROUTES.login}
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route path={ROUTES.authContinue} element={<ContinueRoute />} />
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<LandingPage />} />
          <Route path={ROUTES.designSystem} element={<DesignSystemPage />} />
          <Route path={ROUTES.pricing} element={<PricingPage />} />
          <Route path={ROUTES.faq} element={<FaqPage />} />
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
          <Route index element={<DashboardPage />} />
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/location" element={<EventsLocationPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="events/:eventId/categories/:categoryId/enroll" element={<EventCategoryEnrollPage />} />
          <Route path="events/:eventId/categories/:categoryId" element={<EventCategoryLayout />}>
            <Route index element={<EventCategoryDefaultRedirect />} />
            <Route path=":tab" element={<EventCategoryTabPage />} />
          </Route>
          <Route path="events/:eventId/registrations" element={<LegacyEventTabRedirect tab="inscripciones" />} />
          <Route path="events/:eventId/qualifier" element={<LegacyEventTabRedirect tab="clasificatoria" />} />
          <Route path="events/:eventId/brackets" element={<LegacyEventTabRedirect tab="cuadros" />} />
          <Route path="events/:eventId/enroll" element={<LegacyEventEnrollRedirect />} />
          <Route path="tournaments" element={<DashboardPage />} />
          <Route path="categories" element={<DashboardPage />} />
          <Route path="players" element={<DashboardPage />} />
          <Route path="pairs" element={<DashboardPage />} />
          <Route path="courts" element={<DashboardPage />} />
          <Route path="matches" element={<DashboardPage />} />
          <Route path="settings" element={<DashboardPage />} />
          <Route path="my-tournaments" element={<MyTournamentsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </>
))

export function AppRouter() {
  return <RouterProvider router={router} />
}
