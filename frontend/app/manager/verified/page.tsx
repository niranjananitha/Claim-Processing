"use client";

import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";
import type { ClaimRecord } from "../../services/types";
import MLRiskAssessment from "../../components/MLRiskAssessment";

export default function ManagerVerifiedClaimsPage() {
  const { claims, changeStatus, currentUser } = useClaims();
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);
  const [decisionModal, setDecisionModal] = useState<"APPROVE" | "REJECT" | "REQUEST_INFO" | "RETURN_REVIEW" | null>(null);
  const [writtenReason, setWrittenReason] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Claims ready for manager decision
  const awaitingManager = claims.filter(
    (c) => c.status === "Agent-Verified" || c.status === "Approved" || c.status === "Under Review"
  );

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleExecuteDecision = async () => {
    if (!selectedClaim || !decisionModal) return;

    const timestamp = new Date().toLocaleString();
    const reviewerName = currentUser?.name || "Claims Director";
    const ref = selectedClaim.claimRef || selectedClaim.id;

    // REJECT and the return/info actions require a written reason.
    if (decisionModal !== "APPROVE" && !writtenReason.trim()) {
      showToast("A written reason is required for this action.");
      return;
    }

    let result: ClaimRecord | null = null;
    if (decisionModal === "APPROVE") {
      result = await changeStatus(
        selectedClaim.id,
        "Approved",
        `Approved by ${reviewerName} at ${timestamp}. Authorized settlement: $${selectedClaim.damageEstimate.toLocaleString()}.`
      );
      if (result) showToast(`Claim #${ref} approved for $${selectedClaim.damageEstimate.toLocaleString()}.`);
    } else if (decisionModal === "REJECT") {
      result = await changeStatus(
        selectedClaim.id,
        "Rejected",
        `Rejected by ${reviewerName} at ${timestamp}. Reason: "${writtenReason}". Policyholder may file an appeal.`
      );
      if (result) showToast(`Claim #${ref} rejected. Appeal window opened.`);
    } else {
      // Both "request info" and "return for review" send the claim back to Under Review.
      result = await changeStatus(
        selectedClaim.id,
        "Under Review",
        `Returned to field adjuster by ${reviewerName}: "${writtenReason}".`
      );
      if (result) showToast(`Claim #${ref} returned to the adjuster queue.`);
    }

    if (!result) {
      showToast(`Action not permitted on claim #${ref} in its current state.`);
      return;
    }

    setDecisionModal(null);
    setSelectedClaim(null);
    setWrittenReason("");
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#45464d] font-semibold mb-1">
                <span>Executive Adjudication Desk</span>
                <span>•</span>
                <span className="text-[#069669]">Agent-Verified Assessment</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Agent-Verified Claims Review
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Perform executive review on adjuster-certified claim files, inspect ML fraud indicators, and authorize final dispositions.
              </p>
            </div>

            <div className="p-2.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#4059aa]">gavel</span>
              <span className="font-bold text-[#0b1c30]">{awaitingManager.length} Claims in Review Ledger</span>
            </div>
          </div>

          {feedbackToast && (
            <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs font-bold text-[#065f46] flex items-center gap-2 animate-fadeIn shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{feedbackToast}</span>
            </div>
          )}

          {/* Table of Claims Awaiting Manager Review */}
          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Claim ID</th>
                    <th className="py-2.5 px-4">Policyholder</th>
                    <th className="py-2.5 px-4">Vehicle</th>
                    <th className="py-2.5 px-4">Certified Loss</th>
                    <th className="py-2.5 px-4">Adjuster</th>
                    <th className="py-2.5 px-4">Current Status</th>
                    <th className="py-2.5 px-4 text-right">Executive Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                  {awaitingManager.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-[#eff4ff]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedClaim(claim)}
                    >
                      <td className="py-3 px-4 font-bold text-[#0b1c30]">{claim.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0b1c30] block">{claim.policyHolder}</span>
                        <span className="text-[11px] text-[#45464d]">Policy #{claim.policyNumber}</span>
                      </td>
                      <td className="py-3 px-4">{claim.vehicle}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0b1c30]">
                        ${claim.damageEstimate.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#4059aa]">
                        {claim.assignedTo}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            claim.status === "Approved"
                              ? "bg-[#ecfdf5] text-[#065f46]"
                              : claim.status === "Agent-Verified"
                              ? "bg-[#eff4ff] text-[#1d3989]"
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
                            setSelectedClaim(claim);
                          }}
                          className="px-3 py-1 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
                        >
                          Assess & Authorize
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full Manager Inspection Drawer */}
          {selectedClaim && (
            <div className="fixed inset-0 z-50 bg-[#0f172a]/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#cbd5e1] max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col gap-5">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="absolute top-4 right-4 p-1 text-[#76777d] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>

                <div>
                  <div className="flex items-center gap-2 text-xs text-[#45464d] font-semibold">
                    <span>Executive File: {selectedClaim.id}</span>
                    <span>•</span>
                    <span>Policy #{selectedClaim.policyNumber} ({selectedClaim.policyHolder})</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0b1c30] mt-0.5">
                    {selectedClaim.vehicle} — Certified Loss: ${selectedClaim.damageEstimate.toLocaleString()}
                  </h2>
                </div>

                {/* ML Risk & SHAP Analysis */}
                <MLRiskAssessment
                  claimId={selectedClaim.id}
                  claimAmount={selectedClaim.damageEstimate}
                  severity={selectedClaim.severity}
                />

                {/* Adjuster Findings & Audit Trail */}
                <div className="p-3.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1d3989]">
                      Field Adjuster Recommendation ({selectedClaim.assignedTo}):
                    </span>
                    <span className="text-[11px] text-[#45464d]">Incident Date: {selectedClaim.incidentDate}</span>
                  </div>
                  <p className="text-[#45464d]">{selectedClaim.statusNote}</p>
                </div>

                {/* Manager Action Palette */}
                <div className="pt-3 border-t border-[#e5eeff] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDecisionModal("REJECT")}
                      className="px-3.5 py-2 bg-white hover:bg-[#ffdad6] text-[#ba1a1a] border border-[#fca5a5] text-xs font-bold rounded-lg transition-colors"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => setDecisionModal("RETURN_REVIEW")}
                      className="px-3.5 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4059aa] border border-[#d3e4fe] text-xs font-bold rounded-lg transition-colors"
                    >
                      Return for Review
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDecisionModal("REQUEST_INFO")}
                      className="px-3.5 py-2 bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-[#c6c6cd] text-xs font-bold rounded-lg transition-colors"
                    >
                      Request Info
                    </button>
                    <button
                      onClick={() => setDecisionModal("APPROVE")}
                      className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Approve Claim</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Decision Confirmation & Written Reason Dialog */}
          {decisionModal && selectedClaim && (
            <div className="fixed inset-0 z-60 bg-[#0f172a]/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#cbd5e1] max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[24px] ${
                      decisionModal === "APPROVE"
                        ? "text-[#059669]"
                        : decisionModal === "REJECT"
                        ? "text-[#ba1a1a]"
                        : "text-[#4059aa]"
                    }`}
                  >
                    {decisionModal === "APPROVE" ? "task_alt" : decisionModal === "REJECT" ? "gavel" : "help"}
                  </span>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    {decisionModal === "APPROVE"
                      ? `Confirm Settlement Approval: Claim #${selectedClaim.id}`
                      : decisionModal === "REJECT"
                      ? `Statutory Rejection: Claim #${selectedClaim.id}`
                      : `Request Additional Information`}
                  </h3>
                </div>

                <div className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#45464d]">Policyholder:</span>
                    <span className="font-bold text-[#0b1c30]">{selectedClaim.policyHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#45464d]">Certified Amount:</span>
                    <span className="font-mono font-bold text-[#0b1c30]">
                      ${selectedClaim.damageEstimate.toLocaleString()}
                    </span>
                  </div>
                </div>

                {decisionModal === "APPROVE" ? (
                  <div className="p-3 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg text-xs text-[#1d3989]">
                    <strong className="block">Notice on Payout Disbursement:</strong>
                    Approval authorizes policy settlement terms but does not execute immediate bank wire. Accounting executes payment within standard 48hr window.
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                      Mandatory Written Justification / Reason *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter legal/statutory rationale for this decision..."
                      value={writtenReason}
                      onChange={(e) => setWrittenReason(e.target.value)}
                      className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs text-[#0b1c30] outline-none focus:border-[#4059aa]"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#e5eeff]">
                  <button
                    onClick={() => setDecisionModal(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#45464d] hover:bg-[#eff4ff] rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDecision}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors ${
                      decisionModal === "APPROVE"
                        ? "bg-[#059669] hover:bg-[#047857]"
                        : "bg-[#ba1a1a] hover:bg-[#93000a]"
                    }`}
                  >
                    Confirm & Record Decision
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

