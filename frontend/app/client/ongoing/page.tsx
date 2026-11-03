"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";
import RouteGuard from "../../components/RouteGuard";
import { formatDate, formatINR } from "../../lib/format";

export default function OngoingClaimsPage() {
  return (
    <RouteGuard allow={["client"]}>
      <OngoingClaimsInner />
    </RouteGuard>
  );
}

function OngoingClaimsInner() {
  const { claims, loading } = useClaims();
  const [filter, setFilter] = useState<"all" | "action" | "review">("all");
  const [contactedClaimId, setContactedClaimId] = useState<string | null>(null);

  const ongoingAll = claims.filter(
    (c) => !["Approved", "Rejected", "Completed", "Settled"].includes(c.status)
  );

  const ongoing = ongoingAll.filter((c) => {
    if (filter === "action") return c.status === "Action Required";
    if (filter === "review") return c.status === "Under Review" || c.status === "Agent-Verified";
    return true;
  });

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
                <span>Active Incident Tracking</span>
                <span>•</span>
                <span className="text-[#4059aa]">Live Adjudication Queue</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Ongoing Claims
              </h1>
              <p className="text-xs text-[#45464d] mt-1">
                Track real-time adjuster reviews, vehicle damage assessments, and repair shop authorizations.
              </p>
            </div>

            <Link
              href="/client/submit"
              className="px-4 py-2 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 self-start"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Report New Incident</span>
            </Link>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === "all"
                  ? "bg-[#131b2e] text-white"
                  : "bg-white text-[#45464d] border border-[#d3e4fe] hover:bg-[#eff4ff]"
              }`}
            >
              All Ongoing ({ongoingAll.length})
            </button>
            <button
              onClick={() => setFilter("action")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === "action"
                  ? "bg-[#ba1a1a] text-white"
                  : "bg-white text-[#45464d] border border-[#d3e4fe] hover:bg-[#eff4ff]"
              }`}
            >
              Action Required ({ongoingAll.filter((c) => c.status === "Action Required").length})
            </button>
            <button
              onClick={() => setFilter("review")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === "review"
                  ? "bg-[#4059aa] text-white"
                  : "bg-white text-[#45464d] border border-[#d3e4fe] hover:bg-[#eff4ff]"
              }`}
            >
              In Review ({ongoingAll.filter((c) => c.status === "Under Review" || c.status === "Agent-Verified").length})
            </button>
          </div>

          {contactedClaimId && (
            <div className="p-3 bg-[#e5eeff] border border-[#4059aa] rounded-lg text-xs font-medium text-[#1d3989] flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#069669]">mark_email_read</span>
                <span>Connecting with assigned adjuster desk for Claim #{contactedClaimId}. Our office will respond within 2 business hours.</span>
              </div>
              <button
                onClick={() => setContactedClaimId(null)}
                className="text-[#76777d] hover:text-[#0b1c30]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-white rounded-xl border border-[#d3e4fe] p-6" />
              ))}
            </div>
          ) : ongoing.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#d3e4fe] p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#4059aa]">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-[#0b1c30]">No Ongoing Claims</h3>
                <p className="text-sm text-[#45464d] mt-1">
                  {filter === "all"
                    ? "All your filed incidents have completed adjudication or you have not submitted an active claim yet."
                    : "No ongoing claims match this specific filter."}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Link
                  href="/client/submit"
                  className="px-4 py-2 bg-[#000000] text-white text-xs font-bold rounded-lg hover:bg-[#131b2e] transition-colors"
                >
                  File Incident Report
                </Link>
                <Link
                  href="/history"
                  className="px-4 py-2 bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold rounded-lg border border-[#d3e4fe] hover:bg-[#dce9ff] transition-colors"
                >
                  View Past History
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {ongoing.map((claim) => {
                const currentStep =
                  claim.status === "Submitted"
                    ? 1
                    : claim.status === "Under Review" || claim.status === "Action Required"
                    ? 2
                    : claim.status === "Agent-Verified" || claim.status === "Fraud Review" || claim.status === "Revaluation"
                    ? 3
                    : 4;

                return (
                  <div
                    key={claim.id}
                    className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs p-6 flex flex-col gap-5 hover:border-[#cbd5e1] transition-all"
                  >
                    {/* Top Bar of Card */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#e5eeff] gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#4059aa] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[22px]">directions_car</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-[#0b1c30]">{claim.id}</span>
                            <span className="text-xs text-[#45464d]">({claim.vehicle})</span>
                          </div>
                          <span className="text-[11px] text-[#45464d]">
                            Incident on {formatDate(claim.incidentDate || claim.filedDate)} • {claim.policyNumber ? `Policy ${claim.policyNumber}` : "No policy linked"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded text-xs font-bold ${
                            claim.status === "Action Required"
                              ? "bg-[#ffdad6] text-[#93000a] border border-[#fca5a5]"
                              : claim.status === "Under Review"
                              ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                              : "bg-[#eff4ff] text-[#1d3989] border border-[#d3e4fe]"
                          }`}
                        >
                          {claim.status}
                        </span>
                        <span className="text-sm font-mono font-bold text-[#0b1c30]">
                          {formatINR(claim.damageEstimate)} est.
                        </span>
                      </div>
                    </div>

                    {/* 4-Step Incident Progress Tracker */}
                    <div className="py-2">
                      <span className="text-[11px] font-bold text-[#45464d] uppercase tracking-wider block mb-3">
                        Adjudication Stage:
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center relative">
                        {[
                          { stepNum: 1, title: "1. Reported", desc: "First Notice Filed" },
                          { stepNum: 2, title: "2. Under Review", desc: "Adjuster Assigned" },
                          { stepNum: 3, title: "3. Verification", desc: "Damage Appraisal" },
                          { stepNum: 4, title: "4. Settlement", desc: "Manager Decision" },
                        ].map((s) => {
                          const isDone = s.stepNum < currentStep;
                          const isCurrent = s.stepNum === currentStep;

                          return (
                            <div
                              key={s.stepNum}
                              className={`p-3 rounded-lg border transition-all ${
                                isDone
                                  ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                                  : isCurrent
                                  ? "bg-[#131b2e] border-[#131b2e] text-white shadow-xs"
                                  : "bg-[#f8f9ff] border-[#e5eeff] text-[#76777d]"
                              }`}
                            >
                              <span className="text-xs font-bold block">{s.title}</span>
                              <span className="text-[10px] block opacity-85 mt-0.5">{s.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Note & Action Row */}
                    <div className="p-3.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-[#1d3989] block">
                          Assigned Adjuster ({claim.assignedAgentName || "Not yet assigned"}):
                        </span>
                        <p className="text-[#45464d] mt-0.5">
                          {claim.statusNote || "Claim is progressing through technical and photo appraisal review."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href="/history"
                          className="px-3.5 py-1.5 bg-white hover:bg-[#dce9ff] text-[#0b1c30] font-semibold rounded-lg border border-[#d3e4fe] transition-colors"
                        >
                          Full Audit Log
                        </Link>
                        <button
                          onClick={() => setContactedClaimId(claim.id)}
                          className="px-3.5 py-1.5 bg-[#000000] hover:bg-[#131b2e] text-white font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Message Adjuster
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
