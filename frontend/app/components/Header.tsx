"use client";

import React from "react";
import Link from "next/link";
import { useClaims } from "../context/ClaimsContext";

export default function Header() {
  const { role, currentUser } = useClaims();

  return (
    <header className="h-16 bg-white border-b border-[#d3e4fe] px-6 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
      {/* Search Input */}
      <div className="flex items-center gap-2 w-full max-w-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined text-[#76777d] text-[20px] absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Search claim ID, registration number, policy, or name..."
            className="w-full pl-10 pr-4 py-1.5 text-xs bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:outline-none focus:border-[#4059aa] text-[#0b1c30]"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Decorative bell icon only — no notification system behind it. */}
        <span
          className="p-2 rounded-lg text-[#45464d] flex items-center"
          title="Notifications"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </span>

        {/* Submit Claim quick button (clients only) */}
        {role === "client" ? (
          <Link
            href="/client/submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-[#85f8c4]">add_circle</span>
            <span className="hidden sm:inline">Submit Claim</span>
          </Link>
        ) : (
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold rounded-lg border border-[#d3e4fe] transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-[#4059aa]">search</span>
            <span className="hidden sm:inline">Search Claims</span>
          </Link>
        )}

        {/* User identity */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#e5eeff]">
          <Link
            href={currentUser ? "/history" : "/login"}
            className="text-xs font-semibold text-[#45464d] hover:text-[#4059aa] flex items-center gap-1 transition-colors"
            title="Account"
          >
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
            <span className="hidden md:inline">
              {currentUser ? currentUser.name.split(" ")[0] : "Sign In"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
