"use client";

import RouteGuard from "../components/RouteGuard";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard allow={["agent"]}>{children}</RouteGuard>;
}
