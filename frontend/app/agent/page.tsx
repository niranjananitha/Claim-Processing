"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useClaims } from "../context/ClaimsContext";
import MLRiskAssessment from "../components/MLRiskAssessment";
import { formatINR } from "../lib/format";
import { agentCanVerify, blockedReason } from "../lib/workflow";

export default function AgentDashboardPage() {
  const { claims, changeStatus, currentUser } = useClaims();
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exact metrics per specification
  const totalClaimsCount = claims.length;
  const approvedClaimsCount = claims.filter((c) => c.status === "Approved" || c.status === "Completed").length;
  const rejectedClaimsCount = claims.filter((c) => c.status === "Rejected").length;
  const underReviewClaimsCount = claims.filter(
    (c) => c.status === "Under Review" || c.status === "In Appraisal" || c.status === "Action Required"
  ).length;
  const revaluationRequestsCount = claims.filter((c) => c.status === "Disputed" || c.status === "Revaluation").length;
  const awaitingAppealCount = claims.filter((c) => c.status === "Rejected").length;

  // Operational Queues
  const unverified = claims.filter(
    (c) => c.status === "Submitted" || c.status === "Action Required" || c.status === "Under Review"
  );
  const appealsQueue = claims.filter((c) => c.status === "Disputed" || c.status === "Revaluation");

  const filtered = unverified.filter(
    (c) => filterSeverity === "ALL" || c.severity.toLowerCase().includes(filterSeverity.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleVerify = async (id: string) => {
    const claim = claims.find((c) => c.id === id);
    if (!claim || !agentCanVerify(claim.status)) {
      showToast(`Claim #${id}: ${blockedReason(claim?.status || "")}`);
      return;
    }
    if (claim.status === "Submitted") {
      await changeStatus(id, "Under Review", "Adjuster commenced review.");
    }
    const res = await changeStatus(
      id,
      "Agent-Verified",
      "Damage verified by adjuster inspection. Estimate authorized for manager review."
    );
    showToast(
      res
        ? `Claim #${id} verified and forwarded to Regional Manager review queue.`
        : `Could not verify claim #${id} (invalid workflow state).`
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 app-main flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#45464d] font-semibold mb-1">
                <span>Field Operations Command</span>
                <span>•</span>
                <span className="text-[#4059aa]">Triage & Verification Desk</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Agent Triage Dashboard
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Damage assessment, document checks and first review of your assigned claims.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#059669]" />
                <span>Adjuster Online: {currentUser?.name || ""}</span>
              </span>
            </div>
          </div>

          {toastMessage && (
            <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs font-bold text-[#065f46] flex items-center gap-2 animate-fadeIn shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Operational Metrics (Required by Phase 3.B) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Total Claims
              </span>
              <span className="text-2xl font-extrabold text-[#0b1c30] mt-1 block">
                {totalClaimsCount}
              </span>
              <span className="text-[10px] text-[#45464d]">in ledger</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Under Review
              </span>
              <span className="text-2xl font-extrabold text-[#4059aa] mt-1 block">
                {underReviewClaimsCount}
              </span>
              <span className="text-[10px] text-[#4059aa] font-semibold">Triage queue</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Approved
              </span>
              <span className="text-2xl font-extrabold text-[#069669] mt-1 block">
                {approvedClaimsCount}
              </span>
              <span className="text-[10px] text-[#069669] font-semibold">Settled</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Rejected
              </span>
              <span className="text-2xl font-extrabold text-[#ba1a1a] mt-1 block">
                {rejectedClaimsCount}
              </span>
              <span className="text-[10px] text-[#ba1a1a] font-semibold">Determinations</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Revaluations
              </span>
              <span className="text-2xl font-extrabold text-[#d97706] mt-1 block">
                {revaluationRequestsCount}
              </span>
              <span className="text-[10px] text-[#d97706] font-semibold">Active appeals</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wider block">
                Eligible Appeals
              </span>
              <span className="text-2xl font-extrabold text-[#0b1c30] mt-1 block">
                {awaitingAppealCount}
              </span>
              <span className="text-[10px] text-[#76777d]">Rejected, not yet appealed</span>
            </div>
          </div>

          {/* Operational Queue 1: Claims Requiring Attention */}
          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#eff4ff] border-b border-[#d3e4fe]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0b1c30]">
                  Immediate Triage & Inspection Worklist
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#1d3989] font-bold">
                  {filtered.length} pending
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#45464d]">Filter Severity:</span>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="text-xs font-semibold bg-white border border-[#c6c6cd] rounded-lg px-2.5 py-1 text-[#0b1c30] outline-none"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Minor">Minor Damage</option>
                  <option value="Major">Major Damage</option>
                  <option value="Total">Total Loss</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f8f9ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Claim ID</th>
                    <th className="py-2.5 px-4">Policyholder</th>
                    <th className="py-2.5 px-4">Vehicle</th>
                    <th className="py-2.5 px-4">Severity</th>
                    <th className="py-2.5 px-4">Est. Loss</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Triage Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                  {filtered.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0b1c30]">
                        {claim.claimRef || claim.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0b1c30] block">{claim.policyHolder}</span>
                        <span className="text-[11px] text-[#45464d]">{claim.policyNumber ? `Policy ${claim.policyNumber}` : "No policy linked"}</span>
                      </td>
                      <td className="py-3 px-4">{claim.vehicle}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium">{claim.severity}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {formatINR(claim.damageEstimate)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            claim.status === "Action Required"
                              ? "bg-[#ffdad6] text-[#93000a]"
                              : "bg-[#fef3c7] text-[#92400e]"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {agentCanVerify(claim.status) ? (
                        <button
                          onClick={() => handleVerify(claim.id)}
                          className="px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          Verify & Authorize
                        </button>
                        ) : (
                          <span className="text-[11px] text-[#76777d]">Waiting on customer</span>
                        )}
                        <Link
                          href="/agent/ongoing"
                          className="px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold rounded border border-[#d3e4fe] transition-colors"
                        >
                          Open in Ongoing
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Queue 2: Appeals & Revaluations Requiring Attention */}
          {appealsQueue.length > 0 && (
            <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between bg-[#eff4ff] border-b border-[#d3e4fe]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#d97706]">balance</span>
                  <span className="text-sm font-bold text-[#0b1c30]">
                    Appeals &amp; Revaluations Requiring Agent Review
                  </span>
                </div>
                <span className="text-xs text-[#d97706] font-bold bg-[#fef3c7] px-2.5 py-0.5 rounded border border-[#fde68a]">
                  {appealsQueue.length} Active Contestation
                </span>
              </div>
              <div className="p-4 space-y-2">
                {appealsQueue.map((appeal) => (
                  <div
                    key={appeal.id}
                    className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#0b1c30]">{appeal.id}</span>
                      <span className="text-[#45464d] ml-2">— {appeal.vehicle} ({appeal.policyHolder})</span>
                      <p className="text-[11px] text-[#45464d] mt-0.5">{appeal.statusNote}</p>
                    </div>
                    <Link
                      href="/agent/ongoing"
                      className="px-3 py-1 bg-[#000000] text-white rounded text-xs font-semibold hover:bg-[#131b2e]"
                    >
                      Review Appeal
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
