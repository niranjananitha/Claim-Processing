"use client";

import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";
import type { ClaimRecord } from "../../services/types";
import MLRiskAssessment from "../../components/MLRiskAssessment";
import EvidenceGallery from "../../components/EvidenceGallery";
import { ClaimTimeline, IncidentDetails } from "../../components/ClaimFacts";
import { formatDate, formatINR } from "../../lib/format";
import { agentCanRequestInfo, agentCanVerify, blockedReason } from "../../lib/workflow";

type OngoingTab = "NEW" | "UNDER_REVIEW" | "DOCS_REQUIRED" | "REVALUATION" | "READY_FOR_MANAGER";

export default function AgentOngoingClaimsPage() {
  const { claims, changeStatus } = useClaims();
  const [activeTab, setActiveTab] = useState<OngoingTab>("UNDER_REVIEW");
  const [inspectingClaim, setInspectingClaim] = useState<ClaimRecord | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [requestInfoReason, setRequestInfoReason] = useState("");
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Group claims by ongoing stage
  const newClaims = claims.filter((c) => c.status === "Submitted" || c.status === "New");
  const underReviewClaims = claims.filter((c) => c.status === "Under Review" || c.status === "In Appraisal");
  const docsRequiredClaims = claims.filter((c) => c.status === "Action Required");
  const revaluationClaims = claims.filter((c) => c.status === "Disputed" || c.status === "Revaluation");
  const readyForManagerClaims = claims.filter((c) => c.status === "Agent-Verified");

  const tabList = [
    { id: "NEW" as OngoingTab, label: "New Claims", count: newClaims.length },
    { id: "UNDER_REVIEW" as OngoingTab, label: "Under Review", count: underReviewClaims.length },
    { id: "DOCS_REQUIRED" as OngoingTab, label: "Documents Required", count: docsRequiredClaims.length },
    { id: "REVALUATION" as OngoingTab, label: "Revaluation Requests", count: revaluationClaims.length },
    { id: "READY_FOR_MANAGER" as OngoingTab, label: "Ready for Manager", count: readyForManagerClaims.length },
  ];

  const currentList =
    activeTab === "NEW"
      ? newClaims
      : activeTab === "UNDER_REVIEW"
      ? underReviewClaims
      : activeTab === "DOCS_REQUIRED"
      ? docsRequiredClaims
      : activeTab === "REVALUATION"
      ? revaluationClaims
      : readyForManagerClaims;

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Agent can only verify from "Under Review"; move a Submitted/Action Required claim there first.
  const ensureUnderReview = async (claim: ClaimRecord) => {
    if (claim.status === "Submitted" || claim.status === "Action Required") {
      await changeStatus(claim.id, "Under Review", "Adjuster commenced review.");
    }
  };

  const handleVerify = async (claim: ClaimRecord) => {
    await ensureUnderReview(claim);
    const res = await changeStatus(
      claim.id,
      "Agent-Verified",
      reviewNote || "Damage validated by adjuster inspection. Forwarded to manager for final settlement."
    );
    setInspectingClaim(null);
    setReviewNote("");
    showNotification(
      res
        ? `Claim #${claim.claimRef || claim.id} verified and queued for Manager Review.`
        : `Could not verify claim #${claim.claimRef || claim.id}: ${blockedReason(claim.status)}`
    );
  };

  const handleForwardManager = (claim: ClaimRecord) => handleVerify(claim);

  const handleRequestMoreInfo = async () => {
    if (!inspectingClaim || !requestInfoReason) return;
    await ensureUnderReview(inspectingClaim);
    const res = await changeStatus(inspectingClaim.id, "Action Required", requestInfoReason);
    setShowRequestInfoModal(false);
    const ref = inspectingClaim.claimRef || inspectingClaim.id;
    setInspectingClaim(null);
    setRequestInfoReason("");
    showNotification(res ? `Information request dispatched for Claim #${ref}.` : `Could not update claim #${ref}.`);
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
                <span>Field Operations Ledger</span>
                <span>•</span>
                <span className="text-[#4059aa]">Ongoing Adjudication Workflow</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Ongoing Claims Triage
              </h1>
              <p className="text-xs text-[#45464d] mt-0.5">
                Inspect physical damage vectors, verify documentation, and forward appraisal recommendations.
              </p>
            </div>
          </div>

          {actionSuccessMessage && (
            <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs font-bold text-[#065f46] flex items-center gap-2 animate-fadeIn shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-[#d3e4fe] rounded-xl shadow-2xs">
            {tabList.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === t.id
                    ? "bg-[#131b2e] text-white shadow-xs"
                    : "text-[#45464d] hover:bg-[#eff4ff] hover:text-[#0b1c30]"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === t.id
                      ? "bg-white/20 text-white"
                      : "bg-[#eff4ff] text-[#4059aa]"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Ongoing Claims Table */}
          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            {currentList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-xs text-[#45464d]">
                <span className="material-symbols-outlined text-[36px] text-[#76777d]">
                  task_alt
                </span>
                <span className="font-bold text-[#0b1c30]">No Claims in this Queue</span>
                <p>All claims for this adjudication filter have been advanced to the next workflow stage.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                      <th className="py-2.5 px-4">Claim ID</th>
                      <th className="py-2.5 px-4">Policyholder</th>
                      <th className="py-2.5 px-4">Vehicle</th>
                      <th className="py-2.5 px-4">Severity</th>
                      <th className="py-2.5 px-4">Damage Estimate</th>
                      <th className="py-2.5 px-4">Current Stage</th>
                      <th className="py-2.5 px-4 text-right">Adjudication Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                    {currentList.map((claim) => (
                      <tr
                        key={claim.id}
                        className="hover:bg-[#eff4ff]/60 transition-colors cursor-pointer"
                        onClick={() => setInspectingClaim(claim)}
                      >
                        <td className="py-3 px-4 font-bold text-[#0b1c30]">
                          {claim.claimRef || claim.id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#0b1c30] block">{claim.policyHolder}</span>
                          <span className="text-[11px] text-[#45464d]">{claim.policyNumber ? `Policy ${claim.policyNumber}` : "No policy linked"}</span>
                        </td>
                        <td className="py-3 px-4">{claim.vehicle}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs">{claim.severity}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {formatINR(claim.damageEstimate)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              claim.status === "Action Required"
                                ? "bg-[#ffdad6] text-[#93000a]"
                                : claim.status === "Agent-Verified"
                                ? "bg-[#ecfdf5] text-[#065f46]"
                                : "bg-[#fef3c7] text-[#92400e]"
                            }`}
                          >
                            {claim.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingClaim(claim);
                            }}
                            className="px-3 py-1 bg-[#131b2e] hover:bg-[#000000] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
                          >
                            Review & Adjudicate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Full Adjudication Drawer / Modal */}
          {inspectingClaim && (
            <div className="fixed inset-0 z-50 bg-[#0f172a]/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#cbd5e1] max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col gap-5">
                <button
                  onClick={() => setInspectingClaim(null)}
                  className="absolute top-4 right-4 p-1 text-[#76777d] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>

                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#45464d] font-semibold">
                    <span>Claim Reference: {inspectingClaim.claimRef || inspectingClaim.id}</span>
                    <span>•</span>
                    <span>{inspectingClaim.policyNumber ? `Policy ${inspectingClaim.policyNumber}` : "No policy linked"}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0b1c30] mt-0.5">
                    {inspectingClaim.vehicle} — {inspectingClaim.collisionType || inspectingClaim.incidentType}
                  </h2>
                </div>

                {/* ML Risk & SHAP Component */}
                <MLRiskAssessment
                  claimId={inspectingClaim.id}
                  claimAmount={inspectingClaim.damageEstimate}
                  severity={inspectingClaim.severity}
                />

                {/* Client-uploaded photos & documents */}
                <IncidentDetails claim={inspectingClaim} />

                <EvidenceGallery claimId={inspectingClaim.id} />

                <ClaimTimeline claimId={inspectingClaim.id} />

                {/* Claim Physical Details */}
                <div className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#45464d] uppercase font-bold block">Incident Date</span>
                    <span className="font-semibold text-[#0b1c30]">{formatDate(inspectingClaim.incidentDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#45464d] uppercase font-bold block">Appraisal Amount</span>
                    <span className="font-semibold font-mono text-[#0b1c30]">{formatINR(inspectingClaim.damageEstimate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#45464d] uppercase font-bold block">Police Report</span>
                    <span className="font-semibold text-[#0b1c30]">{inspectingClaim.policeReport ? "Verified" : "Self-Reported"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#45464d] uppercase font-bold block">Jurisdiction</span>
                    <span className="font-semibold text-[#0b1c30]">{inspectingClaim.city}, {inspectingClaim.state}</span>
                  </div>
                </div>

                {/* Adjuster Review Notes Input */}
                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Adjuster Verification Notes & Recommendation *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Record notes on vehicle panel damage, paint blends, structural clip alignment, and authorized body shop estimate..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs text-[#0b1c30] outline-none focus:border-[#4059aa]"
                  />
                </div>

                {/* Action Controls — only what the workflow allows from this status */}
                {!agentCanVerify(inspectingClaim.status) && !agentCanRequestInfo(inspectingClaim.status) ? (
                  <div className="pt-3 border-t border-[#e5eeff] text-xs text-[#45464d] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#4059aa]">info</span>
                    {blockedReason(inspectingClaim.status)}
                  </div>
                ) : (
                <div className="pt-3 border-t border-[#e5eeff] flex flex-wrap items-center justify-between gap-2">
                  {agentCanRequestInfo(inspectingClaim.status) ? (
                  <button
                    onClick={() => setShowRequestInfoModal(true)}
                    className="px-3.5 py-2 bg-white hover:bg-[#ffdad6] text-[#ba1a1a] border border-[#fca5a5] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">help</span>
                    <span>Request Missing Info</span>
                  </button>
                  ) : (
                    <span />
                  )}

                  {agentCanVerify(inspectingClaim.status) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleForwardManager(inspectingClaim)}
                      className="px-4 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4059aa] border border-[#d3e4fe] text-xs font-bold rounded-lg transition-colors"
                    >
                      Forward to Manager
                    </button>
                    <button
                      onClick={() => handleVerify(inspectingClaim)}
                      className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Verify & Authorize</span>
                    </button>
                  </div>
                  )}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Request Info Modal */}
          {showRequestInfoModal && inspectingClaim && (
            <div className="fixed inset-0 z-60 bg-[#0f172a]/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl border border-[#cbd5e1] max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
                <h3 className="text-base font-bold text-[#0b1c30]">
                  Request Missing Information from Policyholder
                </h3>
                <p className="text-xs text-[#45464d]">
                  Specify the documentation or photographs required. Claim {inspectingClaim.claimRef || inspectingClaim.id} will transition to "Action Required" status.
                </p>
                <textarea
                  rows={3}
                  placeholder="e.g. Please provide a clear photograph of the rear passenger side quarter panel..."
                  value={requestInfoReason}
                  onChange={(e) => setRequestInfoReason(e.target.value)}
                  className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs text-[#0b1c30] outline-none focus:border-[#4059aa]"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowRequestInfoModal(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#45464d] hover:bg-[#eff4ff] rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestMoreInfo}
                    className="px-4 py-1.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold rounded-lg"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

