import { RootRoute, Router, Route } from "@tanstack/react-router";
import RootLayout from "./pages/RootLayout";
import HomePageWrapper from "./pages/HomePageWrapper";
import EditorPage from "./pages/Editor";
import SettingsPage from "./pages/Settings";

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

const homeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePageWrapper,
});

const editorRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/editor",
  component: EditorPage,
});

const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([homeRoute, editorRoute, settingsRoute]);

export const router = new Router({ 
  routeTree,
  defaultPreloadDelay: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
