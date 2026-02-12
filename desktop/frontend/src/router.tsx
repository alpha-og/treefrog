import { RootRoute, Router, Route, Navigate } from "@tanstack/react-router";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import RootLayout from "./pages/RootLayout";
import HomePageWrapper from "./pages/HomePageWrapper";
import EditorPage from "./pages/Editor";
import SettingsPage from "./pages/Settings";
import AuthPage from "./pages/Auth";
import AuthCallbackPage from "./pages/AuthCallback";
import DashboardPage from "./pages/Dashboard";
import BuildPage from "./pages/Build";
import BillingPage from "./pages/Billing";
import AccountPage from "./pages/Account";
import { useAuthStore } from "./stores/authStore";
import { createLogger } from "./utils/logger";

const log = createLogger("Router");

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useClerkAuth();
  const { isLoggedIn, isFirstLaunch } = useAuthStore();

  // If it's first launch and user is not signed in, redirect to auth
  if (isFirstLaunch && !isSignedIn && !isLoggedIn) {
    log.debug("First launch detected and user not authenticated, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  // If user is not authenticated at all, redirect to auth
  if (!isSignedIn && !isLoggedIn) {
    log.debug("User not authenticated, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}

const rootRoute = new RootRoute({
  component: RootLayout,
  notFoundComponent: () => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-gray-500">The requested page could not be found.</p>
        </div>
      </div>
    );
  },
});

// Auth Routes (public)
const authRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

const authCallbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallbackPage,
});

// Protected Routes
const homeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <ProtectedRoute>
      <HomePageWrapper />
    </ProtectedRoute>
  ),
});

const editorRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/editor",
  component: () => (
    <ProtectedRoute>
      <EditorPage />
    </ProtectedRoute>
  ),
});

const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  ),
});

const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

const buildRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/build/$buildId",
  component: () => (
    <ProtectedRoute>
      <BuildPage />
    </ProtectedRoute>
  ),
});

const billingRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: () => (
    <ProtectedRoute>
      <BillingPage />
    </ProtectedRoute>
  ),
});

const accountRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: () => (
    <ProtectedRoute>
      <AccountPage />
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  authRoute,
  authCallbackRoute,
  homeRoute,
  editorRoute,
  settingsRoute,
  dashboardRoute,
  buildRoute,
  billingRoute,
  accountRoute,
]);

export const router = new Router({ 
  routeTree,
  defaultPreloadDelay: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
