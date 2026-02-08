import { RootRoute, Router, Route } from "@tanstack/react-router";
import RootLayout from "./pages/RootLayout";
import HomePageWrapper from "./pages/HomePageWrapper";
import EditorPage from "./pages/Editor";
import SettingsPage from "./pages/Settings";

const rootRoute = new RootRoute({
  component: RootLayout,
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

export const router = new Router({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
