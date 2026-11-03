"use client";

import React from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";

export default function AgentVerifiedClaimsPage() {
  const { claims } = useClaims();
  const verified = claims.filter(
    (c) => c.status === "Approved" || c.status === "Completed"
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
                <span>Adjuster Operations</span>
                <span>•</span>
                <span className="text-[#069669]">Authorized Repair Ledger</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Agent-Verified Claims
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Completed adjuster appraisals, body shop authorizations, and verified coverage allocations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-bold">
                {verified.length} Claims Authorized for Payment
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Claim ID</th>
                    <th className="py-2.5 px-4">Policyholder</th>
                    <th className="py-2.5 px-4">Vehicle</th>
                    <th className="py-2.5 px-4">Authorized Payout</th>
                    <th className="py-2.5 px-4">Adjuster Sign-Off</th>
                    <th className="py-2.5 px-4">Verification Note</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                  {verified.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0b1c30]">{claim.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0b1c30] block">{claim.policyHolder}</span>
                        <span className="text-[11px] text-[#45464d]">Policy #{claim.policyNumber}</span>
                      </td>
                      <td className="py-3 px-4">{claim.vehicle}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#069669]">
                        ${claim.damageEstimate.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#4059aa]">
                        {claim.assignedTo} (Certified)
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-[#45464d]">
                        {claim.statusNote}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2.5 py-1 rounded bg-[#ecfdf5] text-[#065f46] text-[11px] font-bold border border-[#a7f3d0]">
                          ✓ Verified
                        </span>
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

