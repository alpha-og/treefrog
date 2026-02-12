import { RootRoute, Router, Route, Navigate } from "@tanstack/react-router";
import RootLayout from "./pages/RootLayout";
import HomePageWrapper from "./pages/HomePageWrapper";
import EditorPage from "./pages/Editor";
import SettingsPage from "./pages/Settings";
import AuthPage from "./pages/Auth";
import DashboardPage from "./pages/Dashboard";
import BuildPage from "./pages/Build";
import BillingPage from "./pages/Billing";
import AccountPage from "./pages/Account";
import { useAuthStore } from "./stores/authStore";
import { createLogger } from "./utils/logger";

const log = createLogger("Router");

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isFirstLaunch } = useAuthStore();

  if (isFirstLaunch) {
    log.debug("First launch, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
}

function SignedInRoute({ children }: { children: React.ReactNode }) {
  const { mode } = useAuthStore();

  if (mode !== 'clerk') {
    log.debug("Not signed in, redirecting to account");
    return <Navigate to="/account" />;
  }

  return <>{children}</>;
}

const rootRoute = new RootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-gray-500">The requested page could not be found.</p>
      </div>
    </div>
  ),
});

const authRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

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
    <SignedInRoute>
      <DashboardPage />
    </SignedInRoute>
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
    <SignedInRoute>
      <BillingPage />
    </SignedInRoute>
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
