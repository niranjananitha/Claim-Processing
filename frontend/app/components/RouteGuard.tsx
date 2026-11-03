"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClaims, UserRole } from "../context/ClaimsContext";

function homeFor(role: UserRole): string {
  return role === "agent" ? "/agent" : role === "manager" ? "/manager" : "/";
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
      <span className="w-6 h-6 border-2 border-[#4059aa] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Client-side route guard. UX only — real authorization is enforced by the backend.
 * While the session is resolving it shows a spinner; unauthenticated users are sent to
 * /login; authenticated users whose role is not allowed are sent to their home portal.
 */
export default function RouteGuard({
  allow,
  children,
}: {
  allow?: UserRole[];
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useClaims();
  const router = useRouter();

  const denied = !loading && currentUser && allow && !allow.includes(currentUser.role);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace("/login");
    } else if (allow && !allow.includes(currentUser.role)) {
      router.replace(homeFor(currentUser.role));
    }
  }, [loading, currentUser, allow, router]);

  if (loading) return <FullScreenSpinner />;
  if (!currentUser || denied) return null;
  return <>{children}</>;
}
