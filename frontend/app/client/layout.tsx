"use client";

import RouteGuard from "../components/RouteGuard";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard allow={["client"]}>{children}</RouteGuard>;
}
