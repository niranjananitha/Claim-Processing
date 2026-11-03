"use client";

import RouteGuard from "../components/RouteGuard";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard allow={["manager"]}>{children}</RouteGuard>;
}
