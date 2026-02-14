import { createRootRoute, createRoute, createRouter, Outlet, useLocation, Link, useNavigate } from '@tanstack/react-router'
import { useAuth, AuthCallback } from './lib/auth'
import Header from './components/Header'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Features from './components/Features'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import DownloadSection from './components/Downloads'
import DashboardPage from './pages/Dashboard'
import SettingsPage from './pages/Settings'
import BillingPage from './pages/Billing'
import AuthPage from './pages/Auth'

export const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-8">Page not found</p>
          <Link to="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
            Go Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function RootComponent() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/sign-in' || location.pathname === '/sign-up' || location.pathname === '/reset-password' || location.pathname === '/auth/callback'
  
  if (isAuthPage) {
    return <Outlet />
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <DownloadSection />
      <FAQ />
    </>
  )
}

// Auth routes
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: () => <AuthPage mode="sign-in" />,
})

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: () => <AuthPage mode="sign-up" />,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: () => <AuthPage mode="reset-password" />,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallback,
})

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    navigate({
      to: '/sign-in',
      search: { redirect: location.pathname },
    })
    return null
  }

  return <>{children}</>
}

// Protected routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  ),
})

const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing',
  component: () => (
    <ProtectedRoute>
      <BillingPage />
    </ProtectedRoute>
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  resetPasswordRoute,
  authCallbackRoute,
  dashboardRoute,
  settingsRoute,
  billingRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
