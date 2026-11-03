"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";

export default function CustomerManagementPage() {
  const { claims } = useClaims();
  const [searchTerm, setSearchTerm] = useState("");

  // Derive the policyholder directory from the agent's assigned claims.
  const byHolder = new Map<
    string,
    { id: string; name: string; policy: string; vehicles: string; claimsCount: number }
  >();
  claims.forEach((c, i) => {
    const key = c.policyHolder || "Unknown";
    const existing = byHolder.get(key);
    if (existing) {
      existing.claimsCount += 1;
      if (!existing.vehicles.includes(c.vehicle) && c.vehicle) {
        existing.vehicles = existing.vehicles ? `${existing.vehicles}, ${c.vehicle}` : c.vehicle;
      }
    } else {
      byHolder.set(key, {
        id: `CUST-${String(i + 1).padStart(4, "0")}`,
        name: key,
        policy: c.policyNumber || "—",
        vehicles: c.vehicle || "—",
        claimsCount: 1,
      });
    }
  });
  const customers = Array.from(byHolder.values());

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.policy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehicles.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#45464d] font-semibold mb-1">
                <span>Account Administration</span>
                <span>•</span>
                <span className="text-[#4059aa]">Policyholder Directory</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Customer Management
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Policyholder profiles, linked auto policies, insured vehicle assets, and claim frequencies.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#eff4ff] border border-[#d3e4fe] text-[#0b1c30] text-xs font-bold">
                {customers.length} Enrolled Policyholders
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs flex items-center gap-3">
            <span className="material-symbols-outlined text-[#76777d] text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search customer by name, policy #, or vehicle make/model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent outline-none text-[#0b1c30]"
            />
          </div>

          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Client ID</th>
                    <th className="py-2.5 px-4">Policyholder Name</th>
                    <th className="py-2.5 px-4">Active Policy</th>
                    <th className="py-2.5 px-4">Registered Vehicle</th>
                    <th className="py-2.5 px-4">Claims History</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                  {filtered.map((cust) => (
                    <tr key={cust.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#4059aa]">
                        {cust.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0b1c30] block">{cust.name}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0b1c30]">
                        {cust.policy}
                      </td>
                      <td className="py-3 px-4 text-[#45464d]">{cust.vehicles}</td>
                      <td className="py-3 px-4 font-bold text-[#0b1c30]">
                        {cust.claimsCount} claims
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <Link
                          href="/history"
                          className="px-2.5 py-1 bg-[#000000] text-white text-xs font-semibold rounded hover:bg-[#131b2e] transition-colors"
                        >
                          View Claims
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

