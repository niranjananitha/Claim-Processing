"use client";

import React, { useEffect, useState } from "react";
import { claimsApi } from "../services/api";
import type { ClaimRecord, StatusHistoryDTO } from "../services/types";
import { VEHICLE_CATEGORY_LABEL, formatDate, formatDateTimeIST, formatINR, formatTime, stateName } from "../lib/format";

/** What the client reported: when/where, what happened, damage, police. */
export function IncidentDetails({ claim }: { claim: ClaimRecord }) {
  const where = [claim.incidentLocation, claim.city, stateName(claim.state)].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Vehicle", `${claim.vehicle}${claim.vehicleCategory ? ` • ${VEHICLE_CATEGORY_LABEL[claim.vehicleCategory] || ""}` : ""}`],
    ["Incident", `${formatDate(claim.incidentDate)}${claim.incidentTime ? `, ${formatTime(claim.incidentTime)} IST` : ""}`],
    ["Location", where || "—"],
    ["Type", [claim.incidentType, claim.collisionType].filter(Boolean).join(" • ") || "—"],
    ["Severity", claim.severity || "—"],
    ["Estimated Cost", formatINR(claim.damageEstimate)],
    ["Damaged Areas", claim.damagedAreas || "—"],
    ["Police", claim.policeReport ? `FIR ${claim.policeReportNumber || "(number not given)"}` : "Not informed"],
  ];
  return (
    <div className="p-3.5 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl text-xs">
      <span className="font-bold text-[#0b1c30] flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-[18px] text-[#4059aa]">description</span>
        Incident Details
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="text-[#45464d] w-28 shrink-0">{k}</span>
            <span className="font-semibold text-[#0b1c30]">{v}</span>
          </div>
        ))}
      </div>
      {claim.incidentDescription && (
        <div className="mt-2 pt-2 border-t border-[#e5eeff]">
          <span className="text-[#45464d] block">What happened</span>
          <p className="text-[#0b1c30] mt-0.5 whitespace-pre-line">{claim.incidentDescription}</p>
        </div>
      )}
    </div>
  );
}

/** The real, recorded status history of a claim (timestamps shown in IST). */
export function ClaimTimeline({ claimId }: { claimId: string }) {
  const [items, setItems] = useState<StatusHistoryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void claimsApi.history(claimId).then((res) => {
      if (res.ok && res.data) setItems(res.data);
      else setError(res.error || "Could not load the claim history.");
    });
  }, [claimId]);

  return (
    <div>
      <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider block mb-2">Claim Timeline</span>
      {error && <p className="text-xs text-[#ba1a1a] font-semibold">{error}</p>}
      {!items && !error && <p className="text-xs text-[#76777d]">Loading…</p>}
      {items && (
        <div className="space-y-2.5 border-l-2 border-[#d3e4fe] pl-3 ml-1.5 text-xs">
          {items.map((h) => (
            <div key={h.id} className="relative">
              <span
                className={`w-2.5 h-2.5 rounded-full absolute -left-[18px] top-1 ${
                  h.to_status === "Rejected" ? "bg-[#ba1a1a]" : h.to_status === "Approved" ? "bg-[#069669]" : "bg-[#4059aa]"
                }`}
              />
              <span className="font-bold text-[#0b1c30] block">
                {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
              </span>
              <span className="text-[11px] text-[#76777d] block">{formatDateTimeIST(h.created_at)}</span>
              {h.reason && <span className="text-[11px] text-[#45464d] block">{h.reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
