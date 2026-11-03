"use client";

import React, { useEffect, useState } from "react";
import { mlApi } from "../services/api";
import type { MLResultDTO } from "../services/types";

interface MLRiskAssessmentProps {
  claimId: string;
  /** Remaining props are accepted for backward compatibility but no longer used. */
  claimAmount?: number;
  severity?: string;
  stateMismatch?: boolean;
  claimToPremiumRatio?: number;
  isAvailable?: boolean;
}

function OfflinePanel({ claimId, detail }: { claimId: string; detail: string }) {
  return (
    <div className="p-4 bg-[#eff4ff] border border-[#d3e4fe] rounded-xl text-xs text-[#45464d] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[20px] text-[#76777d]">analytics</span>
        <div>
          <span className="font-bold text-[#0b1c30] block">ML Risk Scoring Unavailable</span>
          <span className="text-[11px] text-[#76777d]">{detail} (Claim #{claimId})</span>
        </div>
      </div>
      <span className="px-2 py-0.5 rounded bg-[#e2e8f0] text-[#475569] font-bold text-[10px] uppercase">
        Model Offline
      </span>
    </div>
  );
}

export default function MLRiskAssessment({ claimId }: MLRiskAssessmentProps) {
  const [result, setResult] = useState<MLResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    mlApi.predict(claimId).then((res) => {
      if (!active) return;
      if (res.ok && res.data) setResult(res.data);
      else setError(res.error || "Risk assessment unavailable.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [claimId]);

  if (loading) {
    return (
      <div className="p-4 bg-white border border-[#d3e4fe] rounded-xl text-xs text-[#45464d] flex items-center gap-2.5">
        <span className="w-4 h-4 border-2 border-[#4059aa] border-t-transparent rounded-full animate-spin" />
        <span>Scoring claim #{claimId} with the fraud-risk model…</span>
      </div>
    );
  }

  if (error) return <OfflinePanel claimId={claimId} detail={error} />;
  if (!result || result.model_status === "OFFLINE") {
    return <OfflinePanel claimId={claimId} detail="Inference service offline." />;
  }

  const {
    risk_score,
    risk_tier,
    contributing_factors,
    imputed_features,
    recommended_action,
    model_version,
  } = result;

  return (
    <div className="bg-white border border-[#d3e4fe] rounded-xl p-4 shadow-2xs flex flex-col gap-3.5">
      {/* Header & Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e5eeff] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#4059aa] flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0b1c30]">AI Decision-Support Risk Assessment</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#4059aa] border border-[#d3e4fe]">
                {model_version}
              </span>
            </div>
            <span className="text-[10px] text-[#45464d] block">
              Fraud-risk model inference for Claim #{claimId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-[#45464d] uppercase font-bold block">Risk Score</span>
            <span className="text-base font-extrabold font-mono text-[#0b1c30]">{risk_score} / 100</span>
          </div>
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold uppercase border ${
              risk_tier === "HIGH"
                ? "bg-[#ffdad6] text-[#93000a] border-[#fca5a5]"
                : risk_tier === "MEDIUM"
                ? "bg-[#fef3c7] text-[#92400e] border-[#fde68a]"
                : "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
            }`}
          >
            {risk_tier} Risk
          </span>
        </div>
      </div>

      {/* SHAP contributions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#0b1c30] uppercase tracking-wider">
            Top Feature Contributions
          </span>
          <span className="text-[10px] text-[#76777d]">Green = lowers risk • Red = elevates risk</span>
        </div>

        <div className="space-y-2">
          {contributing_factors.length === 0 && (
            <p className="text-[11px] text-[#76777d]">No contribution data returned.</p>
          )}
          {contributing_factors.length > 0 && (
            <div className="flex justify-between text-[10px] font-semibold text-[#76777d] px-2">
              <span>← lowers risk</span>
              <span>0</span>
              <span>raises risk →</span>
            </div>
          )}
          {contributing_factors.map((factor, index) => {
            const isNegative = factor.shap_value < 0;
            // Diverging scale: zero is the centre line; the largest |SHAP| fills its half.
            const maxAbs = Math.max(...contributing_factors.map((f) => Math.abs(f.shap_value)), 1e-9);
            const halfPct = (Math.abs(factor.shap_value) / maxAbs) * 50;
            return (
              <div key={index} className="p-2 bg-[#f8f9ff] border border-[#e5eeff] rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#0b1c30] capitalize">{factor.feature}</span>
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isNegative ? "text-[#059669]" : "text-[#ba1a1a]"
                    }`}
                  >
                    {factor.shap_value > 0 ? "+" : ""}
                    {factor.shap_value.toFixed(2)} SHAP
                  </span>
                </div>
                <div className="relative w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                  <span className="absolute left-1/2 top-0 h-full w-px bg-[#94a3b8] z-10" />
                  <div
                    className={`shap-bar absolute top-0 h-full ${
                      isNegative ? "bg-[#059669] rounded-l-full" : "bg-[#ba1a1a] rounded-r-full"
                    }`}
                    style={{
                      width: `${halfPct}%`,
                      left: isNegative ? `${50 - halfPct}%` : "50%",
                      transformOrigin: isNegative ? "right center" : "left center",
                      animationDelay: `${index * 80}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Imputed features */}
      {imputed_features.length > 0 && (
        <div className="p-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-lg text-[11px] text-[#92400e]">
          <span className="font-bold block mb-0.5">
            {imputed_features.length} feature(s) were imputed (not supplied by the claim):
          </span>
          <span className="text-[10px] font-mono">
            {imputed_features.slice(0, 12).join(", ")}
            {imputed_features.length > 12 ? " …" : ""}
          </span>
        </div>
      )}

      {/* Recommended action */}
      <div className="p-2.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg text-[11px] text-[#45464d]">
        <strong className="text-[#0b1c30]">Recommended action:</strong> {recommended_action}
      </div>

      {/* Disclaimer */}
      <div className="p-2.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg flex items-start gap-2 text-[11px] text-[#45464d]">
        <span className="material-symbols-outlined text-[16px] text-[#4059aa] shrink-0 mt-0.5">info</span>
        <p>
          <strong className="text-[#0b1c30]">Decision-Support Notice:</strong> ML risk scores are advisory
          only. A high score does not constitute grounds for denial; an authorized adjuster must verify all
          physical damage and documentation before any decision.
        </p>
      </div>
    </div>
  );
}
