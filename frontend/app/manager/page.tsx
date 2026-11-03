"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useClaims } from "../context/ClaimsContext";
import { formatDate, formatINR } from "../lib/format";
import { CLOSED_STATUSES, blockedReason, canTransition } from "../lib/workflow";

export default function ManagerDashboardPage() {
  const { claims, changeStatus, setSelectedClaim } = useClaims();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Categorized Executive Metrics
  const agentVerifiedClaims = claims.filter((c) => c.status === "Agent-Verified");
  const appealsAwaitingDecision = claims.filter((c) => c.status === "Disputed" || c.status === "Revaluation");
  const claimsUnderInvestigation = claims.filter(
    (c) =>
      !CLOSED_STATUSES.includes(c.status) &&
      (c.status === "Action Required" || c.status === "Fraud Review" || c.severity.includes("Major"))
  );
  const recentlyCompleted = claims.filter((c) => c.status === "Approved" || c.status === "Completed");

  // Prioritized review queue
  const prioritizedQueue = [
    ...agentVerifiedClaims.map((c) => ({
      ...c,
      attentionReason: "Agent Appraisal Completed — Awaiting Final Settlement Sign-Off",
      stage: "Manager Decision",
      actionUrl: "/manager/verified",
    })),
    ...appealsAwaitingDecision.map((c) => ({
      ...c,
      attentionReason: "Policyholder Appeal Filed — Awaiting Review",
      stage: "Dispute Arbitration",
      actionUrl: "/manager/revaluation",
    })),
    ...claimsUnderInvestigation
      // Skip claims already listed above (a disputed Major claim used to appear twice).
      .filter((c) => c.status !== "Agent-Verified" && c.status !== "Disputed" && c.status !== "Revaluation")
      .slice(0, 3)
      .map((c) => ({
      ...c,
      attentionReason: "High-Exposure Loss / SIU Flagged Investigation",
      stage: "Inquiry Review",
      actionUrl: "/history",
    })),
  ];

  const displayedQueue = prioritizedQueue;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleQuickApprove = async (id: string, amount: number) => {
    const claim = claims.find((c) => c.id === id);
    if (claim && !canTransition("manager", claim.status, "Approved")) {
      showToast(`Claim ${claim.claimRef || id}: ${blockedReason(claim.status)}`);
      return;
    }
    const res = await changeStatus(
      id,
      "Approved",
      `Manager settlement authorized for ${formatINR(amount)}. Payment disbursement pending.`
    );
    showToast(
      res
        ? `Claim #${id} authorized for settlement (${formatINR(amount)}).`
        : `Claim #${id} could not be approved: ${blockedReason(claim?.status || "")}`
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 app-main flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {toastMessage && (
            <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs font-bold text-[#065f46] flex items-center gap-2 animate-fadeIn shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#45464d] font-semibold mb-1">
                <span>Executive Operations Center</span>
                <span>•</span>
                <span className="text-[#4059aa]">Underwriting & Claims Oversight</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Manager Dashboard
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Claims awaiting your decision, agent-verified approvals and policyholder appeals.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/manager/revaluation"
                className="px-4 py-2 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">balance</span>
                <span>Revaluation Management</span>
              </Link>
            </div>
          </div>

          {/* Executive Portfolio Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Agent-Verified
              </span>
              <span className="text-2xl font-extrabold text-[#0b1c30] mt-1 block">
                {agentVerifiedClaims.length}
              </span>
              <span className="text-[10px] text-[#4059aa] font-semibold">Awaiting final decision</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Appeals Awaiting
              </span>
              <span className="text-2xl font-extrabold text-[#d97706] mt-1 block">
                {appealsAwaitingDecision.length}
              </span>
              <span className="text-[10px] text-[#d97706] font-semibold">Disputed decisions</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Under Investigation
              </span>
              <span className="text-2xl font-extrabold text-[#ba1a1a] mt-1 block">
                {claimsUnderInvestigation.length}
              </span>
              <span className="text-[10px] text-[#ba1a1a] font-semibold">Docs/SIU required</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Completed Decisions
              </span>
              <span className="text-2xl font-extrabold text-[#069669] mt-1 block">
                {recentlyCompleted.length}
              </span>
              <span className="text-[10px] text-[#069669] font-semibold">Settled this period</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Total Claims
              </span>
              <span className="text-2xl font-extrabold text-[#0b1c30] mt-1 block">
                {claims.length}
              </span>
              <span className="text-[10px] text-[#45464d] font-semibold">All claims on record</span>
            </div>
          </div>

          {/* Prioritized Review Queue Table (Required by Phase 3.C) */}
          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between bg-[#eff4ff] border-b border-[#d3e4fe]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#4059aa]">assignment_turned_in</span>
                <span className="text-sm font-bold text-[#0b1c30]">
                  Prioritized Executive Review Queue
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#1d3989] font-bold">
                  {displayedQueue.length} {displayedQueue.length === 1 ? "file" : "files"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f8f9ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Claim Ref</th>
                    <th className="py-2.5 px-4">Policyholder & Vehicle</th>
                    <th className="py-2.5 px-4">Submission Date</th>
                    <th className="py-2.5 px-4">Agent Status</th>
                    <th className="py-2.5 px-4">Reason for Manager Attention</th>
                    <th className="py-2.5 px-4">Current Stage</th>
                    <th className="py-2.5 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                  {displayedQueue.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 px-4 text-center">
                        <span className="material-symbols-outlined text-[32px] text-[#069669] block">task_alt</span>
                        <span className="text-sm font-bold text-[#0b1c30] block mt-1">You&apos;re all caught up</span>
                        <span className="text-xs text-[#45464d]">No claims are waiting for a manager decision right now.</span>
                      </td>
                    </tr>
                  )}
                  {displayedQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0b1c30] whitespace-nowrap">
                        {item.claimRef || item.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0b1c30] block">{item.policyHolder}</span>
                        <span className="text-[11px] text-[#45464d]">{item.vehicle}</span>
                      </td>
                      <td className="py-3 px-4 text-[#45464d]">
                        {formatDate(item.filedDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold text-[#4059aa] block whitespace-nowrap">
                          {item.assignedAgentName || "Unassigned"}
                        </span>
                        <span className="mt-0.5 inline-block whitespace-nowrap px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569] text-[10px] font-bold">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 min-w-[180px] max-w-xs">
                        <span className="text-[11px] font-medium text-[#ba1a1a] block leading-tight">
                          {item.attentionReason}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded bg-[#eff4ff] text-[#1d3989] font-bold text-[10px] border border-[#d3e4fe]">
                          {item.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {canTransition("manager", item.status, "Approved") && (
                        <button
                          onClick={() => handleQuickApprove(item.id, item.damageEstimate)}
                          className="px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        )}
                        <Link
                          href={item.actionUrl}
                          onClick={() => setSelectedClaim(item)}
                          className="px-2.5 py-1 bg-[#131b2e] hover:bg-[#000000] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
                        >
                          Inspect File
                        </Link>
                        </div>
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
