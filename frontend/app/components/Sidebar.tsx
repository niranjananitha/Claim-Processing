"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClaims } from "../context/ClaimsContext";

// Survives page navigation (each page mounts its own Sidebar).
let rememberedCollapsed = false;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, currentUser, logout } = useClaims();
  const [collapsed, setCollapsed] = useState(() => rememberedCollapsed);

  // Keep the main content offset in sync with the sidebar width.
  useEffect(() => {
    rememberedCollapsed = collapsed;
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "5rem" : "18rem");
  }, [collapsed]);

  const navItems = {
    client: [
      { name: "Client Dashboard", href: "/", icon: "dashboard" },
      { name: "Claim Submission", href: "/client/submit", icon: "post_add" },
      { name: "Claim History Management", href: "/history", icon: "history" },
      { name: "Ongoing Claims", href: "/client/ongoing", icon: "layers" },
    ],
    agent: [
      { name: "Agent Dashboard", href: "/agent", icon: "dashboard" },
      { name: "Claim History Management", href: "/history", icon: "history" },
      { name: "Ongoing Claims", href: "/agent/ongoing", icon: "layers" },
      { name: "Customer Management", href: "/agent/customers", icon: "group" },
    ],
    manager: [
      { name: "Manager Dashboard", href: "/manager", icon: "dashboard" },
      { name: "Claim History Management", href: "/history", icon: "history" },
      { name: "Revaluation Management", href: "/manager/revaluation", icon: "balance" },
      { name: "Agent-Verified Claims", href: "/manager/verified", icon: "verified" },
      { name: "Agent Management", href: "/manager/agents", icon: "manage_accounts" },
    ],
  }[role] || [];

  const handleLogout = () => {
    void logout();
    router.push("/login");
  };

  const portalBadge = {
    client: { label: "Client Portal", color: "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]" },
    agent: { label: "Agent Portal", color: "bg-[#eff4ff] text-[#1d3989] border-[#d3e4fe]" },
    manager: { label: "Manager Portal", color: "bg-[#ffdad6] text-[#93000a] border-[#fca5a5]" },
  }[role];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#eff4ff] border-r border-[#d3e4fe] z-50 flex flex-col justify-between shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex flex-col">
        {/* Brand & Collapse Header */}
        <div
          className={`h-16 flex items-center bg-[#e5eeff] shrink-0 border-b border-[#d3e4fe] ${
            collapsed ? "px-2 justify-center gap-1" : "px-4 justify-between"
          }`}
        >
          <Link
            href={role === "agent" ? "/agent" : role === "manager" ? "/manager" : "/"}
            className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[#4059aa] text-[26px] shrink-0">shield</span>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-[17px] text-[#0b1c30] tracking-tight leading-none">
                  Aegis ClaimAssist
                </span>
                <span className="text-[11px] font-semibold text-[#45464d] uppercase tracking-wider mt-0.5">
                  Auto Insurance Portal
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-[#45464d] hover:text-[#0b1c30] hover:bg-[#dce9ff] transition-colors flex items-center justify-center cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? "menu" : "menu_open"}
            </span>
          </button>
        </div>

        {/* Active Portal Badge */}
        {!collapsed && (
          <div className="p-3 border-b border-[#d3e4fe] bg-white">
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${portalBadge.color}`}
            >
              {portalBadge.label}
            </span>
          </div>
        )}

        {/* Policy Pill (Client view) */}
        {!collapsed && role === "client" && currentUser?.policyNumber && (
          <div className="px-3 pt-2">
            <div className="px-3 py-2 rounded-lg bg-white border border-[#d3e4fe] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#45464d] block uppercase tracking-wider">
                  Insured Policy
                </span>
                <span className="text-xs font-bold text-[#0b1c30]">
                  {currentUser.policyNumber} • Comprehensive
                </span>
              </div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#069669]" title="Policy Active" />
            </div>
          </div>
        )}

        {/* Primary Navigation */}
        <nav className="p-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive ? "bg-[#131b2e] text-white shadow-xs" : "text-[#0b1c30] hover:bg-[#dce9ff]"
                }`}
                title={item.name}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Sign Out */}
      <div className="p-3 border-t border-[#d3e4fe] bg-[#e5eeff] flex flex-col gap-2">
        <div
          className={`flex items-center p-2 rounded-lg bg-white border border-[#d3e4fe] ${
            collapsed ? "flex-col gap-2" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden" title={currentUser?.name}>
            <div className="w-7 h-7 rounded-full bg-[#4059aa] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.avatarText || "US"}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#0b1c30] truncate">
                  {currentUser?.name || "Guest User"}
                </span>
                <span className="text-[10px] text-[#45464d] truncate">
                  {currentUser?.title || "User"}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-1 rounded text-[#76777d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
