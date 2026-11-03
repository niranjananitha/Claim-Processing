"use client";

import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useClaims } from "../context/ClaimsContext";
import type { ClaimRecord } from "../services/types";
import MLRiskAssessment from "../components/MLRiskAssessment";
import RouteGuard from "../components/RouteGuard";

export default function ClaimHistoryPage() {
  return (
    <RouteGuard>
      <ClaimHistoryInner />
    </RouteGuard>
  );
}

function ClaimHistoryInner() {
  const { claims, selectedClaim, setSelectedClaim, updateClaimStatus, currentUser, role, loading } = useClaims();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Appeal Initiation Modal State
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealExplanation, setAppealExplanation] = useState("");
  const [appealEvidenceFile, setAppealEvidenceFile] = useState("independent_mechanic_inspection.pdf");
  const [appealToast, setAppealToast] = useState<string | null>(null);
  const [appealError, setAppealError] = useState<string | null>(null);

  // Filtering
  const filteredClaims = claims.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      c.policyHolder.toLowerCase().includes(search.toLowerCase()) ||
      c.policyNumber.includes(search);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "Action Required" && c.status === "Action Required") ||
      (statusFilter === "Under Review" && (c.status === "Under Review" || c.status === "In Appraisal" || c.status === "Agent-Verified")) ||
      (statusFilter === "Approved" && (c.status === "Approved" || c.status === "Completed")) ||
      (statusFilter === "Rejected" && c.status === "Rejected") ||
      (statusFilter === "Disputed" && (c.status === "Disputed" || c.status === "Revaluation"));

    const matchesSeverity =
      severityFilter === "ALL" || c.severity.toLowerCase().includes(severityFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleExportCsv = () => {
    const headers = [
      "Claim ID",
      "Policy Number",
      "Policyholder",
      "Incident Date",
      "Vehicle",
      "Collision Type",
      "Severity",
      "Damage Estimate",
      "Status",
      "Adjuster",
    ];
    const rows = filteredClaims.map((c) => [
      c.id,
      c.policyNumber,
      `"${c.policyHolder}"`,
      c.incidentDate,
      `"${c.vehicle}"`,
      `"${c.collisionType || c.incidentType}"`,
      `"${c.severity}"`,
      c.damageEstimate,
      `"${c.status}"`,
      c.assignedTo,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aegis_claims_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInitiateAppeal = () => {
    if (!selectedClaim || !appealExplanation.trim()) {
      setAppealError("Please enter a factual explanation for the statutory appeal.");
      return;
    }
    setAppealError(null);

    updateClaimStatus(
      selectedClaim.id,
      "Disputed",
      `Statutory appeal filed on ${new Date().toLocaleDateString()}. Policyholder justification: "${appealExplanation}". Attached Evidence: ${appealEvidenceFile}. Forwarded to Revaluation Management queue.`
    );

    setShowAppealModal(false);
    setSelectedClaim(null);
    setAppealExplanation("");
    setAppealToast(`Statutory appeal submitted for Claim #${selectedClaim.id}. Forwarded to Revaluation Management.`);
    setTimeout(() => setAppealToast(null), 5000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Context Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#45464d] font-semibold mb-1">
                <span>Enterprise Claims Repository</span>
                <span>•</span>
                <span className="text-[#4059aa]">Comprehensive Regulatory Ledger</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Claim History Management
              </h1>
              <p className="text-xs text-[#45464d] mt-1 max-w-2xl">
                Search, filter, and inspect managerial audit trails, binding coverage determinations, and historic statutory appeals across the active enterprise ledger.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold rounded-lg border border-[#d3e4fe] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#4059aa]">
                  file_download
                </span>
                <span>Export Audit Log (.CSV)</span>
              </button>
            </div>
          </div>

          {appealToast && (
            <div className="p-3.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl text-xs font-bold text-[#065f46] flex items-center gap-2 animate-fadeIn shadow-2xs">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{appealToast}</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider block">
                Total Claims
              </span>
              <span className="text-2xl font-extrabold text-[#0b1c30] mt-1 block">
                {claims.length}
              </span>
              <span className="text-[11px] text-[#45464d]">in database</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider block">
                Matching Filter
              </span>
              <span className="text-2xl font-extrabold text-[#4059aa] mt-1 block">
                {filteredClaims.length}
              </span>
              <span className="text-[11px] text-[#45464d]">records displayed</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider block">
                Total Settlement Vol.
              </span>
              <span className="text-2xl font-extrabold text-[#069669] mt-1 block">
                ${(filteredClaims.reduce((acc, c) => acc + c.damageEstimate, 0) / 1000).toFixed(0)}k
              </span>
              <span className="text-[11px] text-[#45464d]">aggregate payout</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <span className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider block">
                Audit Status
              </span>
              <span className="text-2xl font-extrabold text-[#0b1c30] mt-1 block">
                100%
              </span>
              <span className="text-[11px] text-[#069669] font-semibold">Compliant</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <span className="material-symbols-outlined text-[#76777d] text-[18px] absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                placeholder="Search claim ID, driver, vehicle, or policy number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-[#0b1c30] outline-none focus:border-[#4059aa]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#45464d]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-2.5 py-1.5 text-[#0b1c30] outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Action Required">Action Required</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved / Settled</option>
                <option value="Rejected">Rejected</option>
                <option value="Disputed">Disputed / Appeal</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#45464d]">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs font-semibold bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-2.5 py-1.5 text-[#0b1c30] outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="Minor">Minor Damage</option>
                <option value="Major">Major Damage</option>
                <option value="Total">Total Loss</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Claim ID</th>
                    <th className="py-2.5 px-4">Policyholder</th>
                    <th className="py-2.5 px-4">Insured Vehicle</th>
                    <th className="py-2.5 px-4">Incident Date</th>
                    <th className="py-2.5 px-4">Collision Type</th>
                    <th className="py-2.5 px-4">Damage Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Adjuster</th>
                    <th className="py-2.5 px-4 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-[#45464d]">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-[#4059aa] border-t-transparent rounded-full animate-spin" />
                          <span>Loading claims ledger…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-[#45464d]">
                        <span className="material-symbols-outlined text-[32px] text-[#76777d] block mb-1">
                          folder_off
                        </span>
                        <span className="font-bold text-sm text-[#0b1c30] block">No Claims Found</span>
                        <span className="text-[11px] text-[#76777d]">
                          {claims.length === 0
                            ? "No claims have been recorded in the database yet."
                            : "No claims match the active search and filter criteria."}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-[#eff4ff]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedClaim(claim)}
                    >
                      <td className="py-3 px-4 font-bold text-[#0b1c30]">
                        {claim.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#0b1c30]">{claim.policyHolder}</span>
                          <span className="text-[11px] text-[#45464d]">Pol #{claim.policyNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {claim.vehicle}
                      </td>
                      <td className="py-3 px-4 text-[#45464d]">
                        {claim.incidentDate}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs">{claim.collisionType || claim.incidentType}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        ${claim.damageEstimate.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            claim.status === "Action Required"
                              ? "bg-[#ffdad6] text-[#93000a]"
                              : claim.status === "Rejected"
                              ? "bg-[#fee2e2] text-[#991b1b]"
                              : claim.status === "Disputed"
                              ? "bg-[#fef3c7] text-[#92400e]"
                              : claim.status === "Approved" || claim.status === "Completed"
                              ? "bg-[#ecfdf5] text-[#065f46]"
                              : "bg-[#eff4ff] text-[#1d3989]"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#4059aa]">
                        {claim.assignedTo}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClaim(claim);
                          }}
                          className="px-2.5 py-1 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4059aa] font-semibold text-xs border border-[#d3e4fe] transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full Audit Detail Modal with Appeals Integration */}
          {selectedClaim && (
            <div className="fixed inset-0 z-50 bg-[#0f172a]/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#cbd5e1] max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col gap-4">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="absolute top-4 right-4 p-1 text-[#76777d] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>

                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-[#4059aa]">
                    Audit Record: {selectedClaim.id}
                  </span>
                  <span>•</span>
                  <span className="text-xs text-[#45464d]">
                    Policy #{selectedClaim.policyNumber} ({selectedClaim.policyHolder})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#0b1c30]">
                    {selectedClaim.vehicle} — {selectedClaim.collisionType || selectedClaim.incidentType}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedClaim.status === "Rejected"
                        ? "bg-[#fee2e2] text-[#991b1b]"
                        : selectedClaim.status === "Approved"
                        ? "bg-[#ecfdf5] text-[#065f46]"
                        : "bg-[#eff4ff] text-[#1d3989]"
                    }`}
                  >
                    Status: {selectedClaim.status}
                  </span>
                </div>

                {/* ML Risk Support (for Agents and Managers) */}
                {role !== "client" && (
                  <MLRiskAssessment
                    claimId={selectedClaim.id}
                    claimAmount={selectedClaim.damageEstimate}
                    severity={selectedClaim.severity}
                  />
                )}

                {/* Audit Decision Note */}
                <div className="p-3.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1d3989]">
                      Official Determination / Adjudication Note:
                    </span>
                    <span className="text-[11px] text-[#45464d]">Filed: {selectedClaim.filedDate}</span>
                  </div>
                  <p className="text-[#45464d]">{selectedClaim.statusNote}</p>
                </div>

                {/* Complete Timeline Audit */}
                <div>
                  <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider block mb-2">
                    Official Adjudication Timeline
                  </span>
                  <div className="space-y-2 border-l-2 border-[#d3e4fe] pl-3 ml-1.5 text-xs">
                    <div className="relative">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#069669] absolute -left-[18px] top-1" />
                      <span className="font-bold text-[#0b1c30] block">Incident Reported & First Notice of Loss</span>
                      <span className="text-[11px] text-[#76777d]">{selectedClaim.incidentDate} — Form 104-A processed</span>
                    </div>
                    <div className="relative">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4059aa] absolute -left-[18px] top-1" />
                      <span className="font-bold text-[#0b1c30]">Adjuster Assignment & Damage Appraisal</span>
                      <span className="text-[11px] text-[#76777d]">Assigned to Lead Adjuster {selectedClaim.assignedTo}</span>
                    </div>
                    {selectedClaim.status === "Approved" && (
                      <div className="relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#069669] absolute -left-[18px] top-1" />
                        <span className="font-bold text-[#069669] block">Managerial Settlement Authorized</span>
                        <span className="text-[11px] text-[#76777d]">Approved amount: ${selectedClaim.damageEstimate.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedClaim.status === "Rejected" && (
                      <div className="relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] absolute -left-[18px] top-1" />
                        <span className="font-bold text-[#ba1a1a] block">Claim Rejected by Underwriting Desk</span>
                        <span className="text-[11px] text-[#76777d]">Statutory 7-day appeal window active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Supporting Documents & Verification Status */}
                <div className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl text-xs">
                  <span className="font-bold text-[#0b1c30] block mb-2">
                    Supporting Documents & Evidence Status:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-[#e5eeff]">
                      <span>Police Incident Report</span>
                      <span className="font-bold text-[#069669]">✓ Verified (CPD-99120)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-[#e5eeff]">
                      <span>Damage Photographs</span>
                      <span className="font-bold text-[#069669]">✓ 4 Files Attached</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-[#e5eeff]">
                      <span>Certified Body Shop Estimate</span>
                      <span className="font-bold text-[#4059aa]">OEM Standard Match</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-[#e5eeff]">
                      <span>Coverage Policy Check</span>
                      <span className="font-bold text-[#069669]">✓ Loss Within Limits</span>
                    </div>
                  </div>
                </div>

                {/* Appeal Initiation trigger for rejected claims */}
                <div className="border-t border-[#e5eeff] pt-3 flex items-center justify-between">
                  {selectedClaim.status === "Rejected" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAppealModal(true)}
                        className="px-4 py-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">balance</span>
                        <span>Initiate Statutory Appeal (7-Day Window)</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#76777d]">Aegis Claim Audit Integrity Verified</span>
                  )}

                  <button
                    onClick={() => setSelectedClaim(null)}
                    className="px-4 py-2 bg-[#000000] text-white text-xs font-semibold rounded-lg hover:bg-[#131b2e]"
                  >
                    Close Audit View
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appeal Filing Modal */}
          {showAppealModal && selectedClaim && (
            <div className="fixed inset-0 z-60 bg-[#0f172a]/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-[#cbd5e1] max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-[#ba1a1a]">balance</span>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    File Statutory Appeal: Claim #{selectedClaim.id}
                  </h3>
                </div>

                <p className="text-xs text-[#45464d]">
                  You have the statutory right under Ohio DOI policy regulations to contest this claim determination within 7 calendar days of notice. Please provide new mechanical evidence or factual clarifications.
                </p>

                {appealError && (
                  <div className="p-2.5 bg-[#ffdad6] border border-[#fca5a5] rounded-lg text-xs font-semibold text-[#93000a] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>{appealError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Factual Basis for Appeal & Contestation *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe specific grounds for reconsideration, attached mechanic alignment reports, or counter-evidence..."
                    value={appealExplanation}
                    onChange={(e) => setAppealExplanation(e.target.value)}
                    className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs text-[#0b1c30] outline-none focus:border-[#4059aa]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Attach Supplementary Evidence (e.g. Certified Shop Inspection)
                  </label>
                  <input
                    type="file"
                    className="w-full text-xs text-[#45464d]"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAppealEvidenceFile(e.target.files[0].name);
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#e5eeff]">
                  <button
                    onClick={() => setShowAppealModal(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#45464d] hover:bg-[#eff4ff] rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInitiateAppeal}
                    className="px-4 py-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    Submit Formal Appeal
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
