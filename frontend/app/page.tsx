"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { useClaims } from "./context/ClaimsContext";
import RouteGuard from "./components/RouteGuard";
import { documentsApi } from "./services/api";
import { IncidentDetails } from "./components/ClaimFacts";
import { formatDate, formatINR } from "./lib/format";

export default function ClientDashboardPage() {
  return (
    <RouteGuard allow={["client"]}>
      <ClientDashboardInner />
    </RouteGuard>
  );
}

function ClientDashboardInner() {
  const { claims, selectedClaim, setSelectedClaim, currentUser, loading } = useClaims();
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Filter client's recent claims (first 5 for current policyholder)
  const clientClaims = claims.slice(0, 5);

  const totalCount = clientClaims.length;
  const underReviewCount = clientClaims.filter(
    (c) => c.status === "Under Review" || c.status === "In Appraisal" || c.status === "Agent-Verified"
  ).length;
  const actionRequiredCount = clientClaims.filter(
    (c) => c.status === "Action Required"
  ).length;
  const actionRequiredClaim = clientClaims.find(
    (c) => c.status === "Action Required"
  );
  const completedCount = clientClaims.filter(
    (c) => c.status === "Completed" || c.status === "Approved"
  ).length;

  // Really uploads the photo against the claim that needs it.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !actionRequiredClaim) return;
    const res = await documentsApi.upload(actionRequiredClaim.id, file, "image");
    setUploadMessage(
      res.ok
        ? `Uploaded "${file.name}" to claim ${actionRequiredClaim.claimRef || actionRequiredClaim.id}. Your adjuster can now see it.`
        : `Upload failed: ${res.error || "please try again."}`
    );
    setTimeout(() => setUploadMessage(null), 6000);
  };

  const displayName = currentUser?.name || "Policyholder";
  const policyNum = currentUser?.policyNumber || "";

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 app-main flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Welcome Header & Action Launch Row */}
          <div className="bg-white p-6 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#069669]" />
                <span className="text-xs font-bold text-[#45464d] uppercase tracking-wider">
                  Aegis Motor Insurance{policyNum ? ` • Policy ${policyNum}` : ""}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Welcome back, {displayName.split(" ")[0]}
              </h1>
              <p className="text-sm text-[#45464d]">
                Real-time status of your policies, active incident claims, and adjuster assessments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/client/submit"
                className="px-4 py-2 bg-[#000000] hover:bg-[#131b2e] text-white rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px] text-[#85f8c4]">
                  add_circle
                </span>
                <span className="text-xs font-bold">Submit a Claim</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-medium ml-1">
                  ~5 mins
                </span>
              </Link>
            </div>
          </div>

          {/* Upload Success Alert */}
          {uploadMessage && (
            <div className="p-3 bg-[#e5eeff] border border-[#4059aa] rounded-lg text-xs font-medium text-[#1d3989] flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-[20px] text-[#069669]">
                check_circle
              </span>
              <span>{uploadMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-xl border border-[#d3e4fe] p-4" />
                ))}
              </div>
              <div className="h-64 bg-white rounded-xl border border-[#d3e4fe]" />
            </div>
          ) : totalCount === 0 ? (
            /* Empty State Container */
            <div className="bg-white rounded-xl border border-[#d3e4fe] p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#4059aa]">
                <span className="material-symbols-outlined text-[36px]">
                  verified_user
                </span>
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-[#0b1c30]">No Active Claims</h3>
                <p className="text-sm text-[#45464d] mt-1">
                  You have no claims yet. If you have been involved in an incident, you can file a claim anytime.
                </p>
              </div>
              <Link
                href="/client/submit"
                className="px-4 py-2 bg-[#000000] text-white text-xs font-bold rounded-lg mt-2"
              >
                File an Incident Report
              </Link>
            </div>
          ) : (
            <>
              {/* Metrics Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#45464d]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Total Claims
                    </span>
                    <span className="material-symbols-outlined text-[20px]">
                      folder_open
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#0b1c30]">
                      {totalCount}
                    </span>
                    <span className="text-xs text-[#45464d]">lifetime files</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#4059aa]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#45464d]">
                      Under Review
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
                      pending_actions
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#4059aa]">
                      {underReviewCount}
                    </span>
                    <span className="text-xs text-[#45464d]">in adjudication</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#ba1a1a]">
                      Action Required
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">
                      notification_important
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-[#ba1a1a]">
                      {actionRequiredCount}
                    </span>
                    {actionRequiredCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffdad6] text-[#93000a] font-bold">
                        Photo needed
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#45464d]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Completed
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-[#069669]">
                      task_alt
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#0b1c30]">
                      {completedCount}
                    </span>
                    <span className="text-xs text-[#069669] font-medium">settled</span>
                  </div>
                </div>
              </div>

              {/* Action Required Alert Banner */}
              {actionRequiredClaim && (
                <section className="bg-white p-4 rounded-xl border border-[#ffdad6] shadow-xs bg-gradient-to-r from-[#ffdad6]/20 to-transparent">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[24px]">
                          priority_high
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#0b1c30]">
                            Attention Needed: Claim {actionRequiredClaim.claimRef || actionRequiredClaim.id}
                          </span>
                          <span className="text-[11px] bg-[#eff4ff] px-2 py-0.5 rounded text-[#45464d] font-semibold border border-[#d3e4fe]">
                            {actionRequiredClaim.vehicle}
                          </span>
                        </div>
                        <p className="text-xs text-[#45464d] max-w-2xl">
                          {actionRequiredClaim.statusNote || "Additional details or damage photos requested by adjuster."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <label className="cursor-pointer px-3.5 py-2 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
                        <span className="material-symbols-outlined text-[18px]">
                          add_a_photo
                        </span>
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <button
                        onClick={() => setSelectedClaim(actionRequiredClaim)}
                        className="px-3.5 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-semibold rounded-lg border border-[#d3e4fe] transition-colors"
                      >
                        Claim Details
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Recent Claims Table */}
              <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between bg-[#eff4ff] border-b border-[#d3e4fe]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0b1c30]">
                      Recent Claims
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#1d3989] font-bold">
                      {totalCount} active records
                    </span>
                  </div>
                  <Link
                    href="/history"
                    className="text-xs text-[#4059aa] hover:text-[#1d3989] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>View Full Claim History</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8f9ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4">Vehicle</th>
                        <th className="py-2.5 px-4">Incident / Filed</th>
                        <th className="py-2.5 px-4">Current Status</th>
                        <th className="py-2.5 px-4">Estimated Damage</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-[#0b1c30] divide-y divide-[#e5eeff]">
                      {clientClaims.map((claim) => (
                        <tr
                          key={claim.id}
                          className="hover:bg-[#eff4ff]/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedClaim(claim)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#0b1c30]">
                                {claim.claimRef || claim.id}
                              </span>
                              <span className="text-[11px] text-[#45464d]">
                                {claim.collisionType || claim.incidentType}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#0b1c30]">
                                {claim.vehicle}
                              </span>
                              <span className="text-[11px] text-[#45464d]">
                                {claim.policyNumber ? `Policy: ${claim.policyNumber}` : "No policy linked"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span>{formatDate(claim.incidentDate)}</span>
                              <span className="text-[11px] text-[#45464d]">
                                Filed {formatDate(claim.filedDate)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${
                                claim.status === "Action Required"
                                  ? "bg-[#ffdad6] text-[#93000a] border border-[#fca5a5]"
                                  : claim.status === "Under Review" || claim.status === "In Appraisal"
                                  ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                                  : "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  claim.status === "Action Required"
                                    ? "bg-[#dc2626]"
                                    : claim.status === "Under Review" || claim.status === "In Appraisal"
                                    ? "bg-[#d97706]"
                                    : "bg-[#059669]"
                                }`}
                              />
                              {claim.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {formatINR(claim.damageEstimate)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClaim(claim);
                              }}
                              className="px-2.5 py-1 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4059aa] font-semibold text-xs border border-[#d3e4fe] transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

          {/* Claim Detail Modal */}
          {selectedClaim && (
            <div className="fixed inset-0 z-50 bg-[#0f172a]/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl border border-[#cbd5e1] max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="absolute top-4 right-4 p-1 text-[#76777d] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#4059aa]">
                    {selectedClaim.claimRef || selectedClaim.id}
                  </span>
                  <span>•</span>
                  <span className="text-xs text-[#45464d]">
                    {selectedClaim.policyNumber ? `Policy ${selectedClaim.policyNumber}` : "No policy linked"}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-[#0b1c30]">
                  {selectedClaim.vehicle} - {selectedClaim.collisionType || selectedClaim.incidentType}
                </h2>

                <div className="mt-4 p-3 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0b1c30]">
                      Current Status: {selectedClaim.status}
                    </span>
                    <span className="text-[11px] text-[#45464d]">
                      Incident Date: {formatDate(selectedClaim.incidentDate)}
                    </span>
                  </div>
                  <p className="text-xs text-[#45464d]">{selectedClaim.statusNote}</p>
                </div>

                <div className="mt-4">
                  <IncidentDetails claim={selectedClaim} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                  <div className="p-2.5 rounded bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[10px] font-bold text-[#45464d] uppercase block">
                      Total Estimate
                    </span>
                    <span className="text-sm font-bold text-[#0b1c30]">
                      {formatINR(selectedClaim.damageEstimate)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[10px] font-bold text-[#45464d] uppercase block">
                      Vehicle Damage
                    </span>
                    <span className="text-sm font-bold text-[#0b1c30]">
                      {formatINR(selectedClaim.vehicleClaim)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[10px] font-bold text-[#45464d] uppercase block">
                      Property Claim
                    </span>
                    <span className="text-sm font-bold text-[#0b1c30]">
                      {formatINR(selectedClaim.propertyClaim)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className="text-[10px] font-bold text-[#45464d] uppercase block">
                      Assigned Adjuster
                    </span>
                    <span className="text-sm font-bold text-[#4059aa]">
                      {selectedClaim.assignedAgentName || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#e5eeff] pt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedClaim(null)}
                    className="px-4 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-xs font-semibold rounded-lg text-[#0b1c30]"
                  >
                    Close
                  </button>
                  <Link
                    href={`/history`}
                    className="px-4 py-2 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-semibold rounded-lg"
                  >
                    View in Audit Log
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
