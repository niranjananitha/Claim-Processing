"use client";

import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";
import { formatDate } from "../../lib/format";

interface AppealRecord {
  id: string;
  claimId: string;
  vehicle: string;
  policyHolder: string;
  originalRejectionReason: string;
  rejectionDate: string;
  appealSubmissionDate: string;
  appealDeadline: string; // 7 calendar days default
  submittedExplanation: string;
  newSupportingEvidence: string;
  agentNotes: string;
  appealStatus: "PENDING_REVIEW" | "UPHELD" | "APPROVED" | "MORE_INFO_REQUESTED";
  decisionHistory: string[];
}

export default function RevaluationManagementPage() {
  const { claims, changeStatus, currentUser } = useClaims();

  // Derive appeals from real claims the client has disputed or that are in revaluation.
  const appeals: AppealRecord[] = claims
    .filter((c) => c.status === "Disputed" || c.status === "Revaluation")
    .map((c) => ({
      id: `REV-${c.claimRef || c.id}`,
      claimId: c.id,
      vehicle: c.vehicle,
      policyHolder: c.policyHolder,
      originalRejectionReason: c.statusNote || "Original determination on file.",
      rejectionDate: c.filedDate,
      appealSubmissionDate: c.filedDate,
      appealDeadline: "",
      submittedExplanation: c.statusNote || "",
      newSupportingEvidence: "",
      agentNotes: "",
      appealStatus: "PENDING_REVIEW",
      decisionHistory: [c.statusNote].filter(Boolean) as string[],
    }));

  const [selectedAppeal, setSelectedAppeal] = useState<AppealRecord | null>(null);
  const [decisionAction, setDecisionAction] = useState<"UPHELD" | "APPROVED" | "REQUEST_INFO" | "RETURN_REVIEW" | null>(null);
  const [writtenDecisionReason, setWrittenDecisionReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handleExecuteDecision = async () => {
    if (!selectedAppeal || !decisionAction) return;

    if (!writtenDecisionReason.trim()) {
      showToast("A written reason is required for any appeal determination.");
      return;
    }

    const reviewer = currentUser?.name || "Claims Director";
    const ref = selectedAppeal.id;
    let result = null;

    if (decisionAction === "APPROVED") {
      result = await changeStatus(
        selectedAppeal.claimId,
        "Approved",
        `Appeal granted by ${reviewer}. Supplementary settlement authorized: "${writtenDecisionReason}".`
      );
      if (result) showToast(`Appeal ${ref} approved. Settlement authorized.`);
    } else if (decisionAction === "UPHELD") {
      result = await changeStatus(
        selectedAppeal.claimId,
        "Rejected",
        `Appeal denied by ${reviewer}. Original rejection confirmed: "${writtenDecisionReason}".`
      );
      if (result) showToast(`Original rejection upheld for appeal ${ref}.`);
    } else {
      // Request info / return: move back into Revaluation with the note.
      result = await changeStatus(
        selectedAppeal.claimId,
        "Revaluation",
        `Further review requested by ${reviewer}: "${writtenDecisionReason}".`
      );
      if (result) showToast(`Action recorded for appeal ${ref}.`);
    }

    if (!result) {
      showToast(`Action not permitted on ${ref} in its current state.`);
      return;
    }

    setSelectedAppeal(null);
    setDecisionAction(null);
    setWrittenDecisionReason("");
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 app-main flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#45464d] font-semibold mb-1">
                <span>Managerial Dispute Arbitration</span>
                <span>•</span>
                <span className="text-[#4059aa]">Appeals Workspace</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Revaluation & Appeals Management
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Review appeals that policyholders have filed against rejected claims.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#eff4ff] border border-[#d3e4fe] text-[#0b1c30] text-xs font-bold">
                {appeals.filter((a) => a.appealStatus === "PENDING_REVIEW").length} Appeals Requiring Final Adjudication
              </span>
            </div>
          </div>

          {toast && (
            <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs font-bold text-[#065f46] flex items-center gap-2 animate-fadeIn shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{toast}</span>
            </div>
          )}

          {/* Appeals List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="bg-white rounded-2xl border border-[#d3e4fe] shadow-xs p-6 flex flex-col justify-between gap-4 hover:border-[#cbd5e1] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#4059aa]">balance</span>
                      <span className="font-mono text-xs font-bold text-[#4059aa]">{appeal.id}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        appeal.appealStatus === "APPROVED"
                          ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                          : appeal.appealStatus === "UPHELD"
                          ? "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]"
                          : "bg-[#fef3c7] text-[#92400e] border-[#fde68a]"
                      }`}
                    >
                      {appeal.appealStatus}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#0b1c30] text-sm mt-3">
                    {appeal.vehicle} — Claim #{appeal.claimId}
                  </h3>
                  <span className="text-xs text-[#45464d] block mb-2">
                    Policyholder: <strong>{appeal.policyHolder}</strong>
                  </span>

                  {/* Statutory Preservation of Original Rejection */}
                  <div className="p-3 bg-[#fee2e2]/40 border border-[#fca5a5] rounded-xl text-xs space-y-1 my-3">
                    <span className="font-bold text-[#991b1b] block">
                      Original Claim Rejection (Preserved):
                    </span>
                    <p className="text-[#0b1c30] text-[11px]">{appeal.originalRejectionReason}</p>
                    <span className="text-[10px] text-[#76777d] block">
                      Claim filed: {formatDate(appeal.rejectionDate)}
                    </span>
                  </div>

                  {/* New Evidence Submitted */}
                  <div className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl text-xs space-y-1 mb-3">
                    <span className="font-bold text-[#0b1c30] block">New Grounds for Appeal:</span>
                    <p className="text-[#45464d] text-[11px]">{appeal.submittedExplanation}</p>
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-[#4059aa]">
                      <span className="material-symbols-outlined text-[14px]">attach_file</span>
                      <span>{appeal.newSupportingEvidence}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#45464d]">
                    <strong className="text-[#0b1c30]">Adjuster Finding:</strong> {appeal.agentNotes}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#e5eeff] flex items-center justify-between">
                  <span className="text-[10px] text-[#76777d]">
                    Claim filed: {formatDate(appeal.appealSubmissionDate)}
                  </span>
                  <button
                    onClick={() => setSelectedAppeal(appeal)}
                    className="px-4 py-1.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Adjudicate Appeal
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Adjudication Modal with Statutory Rejection Preservation */}
          {selectedAppeal && (
            <div className="fixed inset-0 z-50 bg-[#0f172a]/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#cbd5e1] max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col gap-4">
                <button
                  onClick={() => setSelectedAppeal(null)}
                  className="absolute top-4 right-4 p-1 text-[#76777d] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>

                <div>
                  <div className="flex items-center gap-2 text-xs text-[#45464d] font-semibold">
                    <span>Appeal File: {selectedAppeal.id}</span>
                    <span>•</span>
                    <span>Claim #{selectedAppeal.claimId}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0b1c30] mt-0.5">
                    Appeal: {selectedAppeal.vehicle} ({selectedAppeal.policyHolder})
                  </h2>
                </div>

                {/* Statutory History Display */}
                <div className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl text-xs space-y-1">
                  <span className="font-bold text-[#0b1c30] block">Decision History & Audit Trail:</span>
                  <ul className="list-disc list-inside text-[11px] text-[#45464d] space-y-0.5">
                    {selectedAppeal.decisionHistory.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Select Adjudication Action:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionAction("APPROVED")}
                      className={`p-2.5 rounded-lg border text-left font-bold text-xs transition-all cursor-pointer ${
                        decisionAction === "APPROVED"
                          ? "bg-[#059669] text-white border-[#059669] shadow-xs"
                          : "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] hover:bg-[#a7f3d0]/30"
                      }`}
                    >
                      ✓ Approve Appeal & Authorize Payout
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionAction("UPHELD")}
                      className={`p-2.5 rounded-lg border text-left font-bold text-xs transition-all cursor-pointer ${
                        decisionAction === "UPHELD"
                          ? "bg-[#ba1a1a] text-white border-[#ba1a1a] shadow-xs"
                          : "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5] hover:bg-[#fca5a5]/30"
                      }`}
                    >
                      ✕ Uphold Original Rejection
                    </button>
                  </div>
                </div>

                {decisionAction && (
                  <div className="animate-fadeIn">
                    <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                      Written reason for decision *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify the factual and policy reasons for this final appeal determination..."
                      value={writtenDecisionReason}
                      onChange={(e) => setWrittenDecisionReason(e.target.value)}
                      className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs text-[#0b1c30] outline-none focus:border-[#4059aa]"
                    />
                  </div>
                )}

                <div className="border-t border-[#e5eeff] pt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedAppeal(null)}
                    className="px-4 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-xs font-semibold rounded-lg text-[#0b1c30]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDecision}
                    disabled={!decisionAction}
                    className="px-5 py-2 bg-[#000000] hover:bg-[#131b2e] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    Confirm Binding Appeal Decision
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
