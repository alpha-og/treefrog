import { Outlet } from "@tanstack/react-router";

export default function RootLayout() {
  return (
    <div className="w-full h-full flex flex-col">
      <Outlet />
    </div>
  );
}
