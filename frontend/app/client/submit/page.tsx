"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import VehiclePicker, { EMPTY_VEHICLE, toVehicleInput } from "../../components/VehiclePicker";
import { useClaims } from "../../context/ClaimsContext";
import { documentsApi, policiesApi, vehiclesApi } from "../../services/api";
import type { PolicyDTO, VehicleDTO } from "../../services/types";
import {
  INDIAN_STATES,
  VEHICLE_CATEGORY_LABEL,
  formatDate,
  formatINR,
  formatTime,
  nowTimeIST,
  stateName,
  todayIST,
} from "../../lib/format";

const DAMAGE_ZONES: Record<string, string[]> = {
  two_wheeler: [
    "Front Wheel / Fork",
    "Headlight",
    "Handlebar / Mirrors",
    "Fuel Tank",
    "Engine / Silencer",
    "Side Panels",
    "Seat",
    "Chain / Sprocket",
    "Rear Wheel",
    "Tail Light",
  ],
  four_wheeler: [
    "Front Bumper",
    "Bonnet / Grille",
    "Windshield",
    "Driver Side Front Door",
    "Driver Side Rear Door",
    "Passenger Side Front Door",
    "Passenger Side Rear Door",
    "Rear Bumper",
    "Boot / Dickey",
    "Undercarriage",
  ],
  cargo_truck: [
    "Cabin Front",
    "Windshield",
    "Cabin Doors",
    "Headlights",
    "Cargo Body / Bed",
    "Tail Gate",
    "Chassis",
    "Front Axle / Wheels",
    "Rear Axle / Wheels",
    "Fuel Tank",
  ],
};

const fieldCls =
  "w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] focus:border-[#4059aa] outline-none";

export default function ClaimSubmissionPage() {
  const { createClaim } = useClaims();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [submissionState, setSubmissionState] = useState<"active" | "submitting" | "confirmed">("active");
  const [confirmation, setConfirmation] = useState<{ ref: string; agent: string } | null>(null);

  // Step 1: the client's own vehicles & policies
  const [vehicles, setVehicles] = useState<VehicleDTO[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);
  const [policyNumber, setPolicyNumber] = useState("");
  const [loadingStep1, setLoadingStep1] = useState(true);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState(EMPTY_VEHICLE);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [removingVehicle, setRemovingVehicle] = useState(false);

  // Step 2: incident
  const [incidentDate, setIncidentDate] = useState(todayIST());
  const [incidentTime, setIncidentTime] = useState(nowTimeIST());
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [collisionType, setCollisionType] = useState("");
  const [severity, setSeverity] = useState("");

  // Step 3: damage & evidence
  const [selectedDamagePoints, setSelectedDamagePoints] = useState<string[]>([]);
  const [damageDescription, setDamageDescription] = useState("");
  const [policeContacted, setPoliceContacted] = useState("Police");
  const [policeReportAvailable, setPoliceReportAvailable] = useState("NO");
  const [policeReportNumber, setPoliceReportNumber] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    void Promise.all([vehiclesApi.mine(), policiesApi.list()]).then(([v, p]) => {
      if (v.ok && v.data) {
        setVehicles(v.data);
        if (v.data.length > 0) setVehicleId(v.data[0].id);
        else setAddingVehicle(true);
      }
      if (p.ok && p.data) {
        setPolicies(p.data);
        if (p.data.length > 0) setPolicyNumber(p.data[0].policy_number);
      }
      setLoadingStep1(false);
    });
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || null;
  const selectedPolicy = policies.find((p) => p.policy_number === policyNumber) || null;
  const damageOptions = DAMAGE_ZONES[selectedVehicle?.category || "four_wheeler"];

  const saveNewVehicle = async () => {
    const input = toVehicleInput(newVehicle);
    if (typeof input === "string") {
      setStepError(input);
      return;
    }
    setSavingVehicle(true);
    const res = await vehiclesApi.add(input);
    setSavingVehicle(false);
    if (res.ok && res.data) {
      setVehicles((prev) => [...prev, res.data!]);
      setVehicleId(res.data.id);
      setAddingVehicle(false);
      setNewVehicle(EMPTY_VEHICLE);
      setStepError(null);
      setSelectedDamagePoints([]);
    } else {
      setStepError(res.error || "Could not add the vehicle.");
    }
  };

  const removeVehicle = async (id: number) => {
    setRemovingVehicle(true);
    const res = await vehiclesApi.remove(id);
    setRemovingVehicle(false);
    setConfirmRemoveId(null);
    if (!res.ok) {
      setStepError(res.error || "Could not remove the vehicle.");
      return;
    }
    const remaining = vehicles.filter((v) => v.id !== id);
    setVehicles(remaining);
    if (vehicleId === id) {
      setVehicleId(remaining[0]?.id ?? null);
      setSelectedDamagePoints([]);
    }
    if (remaining.length === 0) setAddingVehicle(true);
    setStepError(null);
  };

  const toggleDamagePoint = (point: string) =>
    setSelectedDamagePoints((prev) =>
      prev.includes(point) ? prev.filter((p) => p !== point) : [...prev, point]
    );

  const validateStep = (s: number): string | null => {
    if (s === 1 && !selectedVehicle) return "Select the vehicle involved (or add it first).";
    if (s === 2) {
      if (!incidentDate) return "Enter the date of the incident.";
      if (incidentDate > todayIST()) return "The incident date cannot be in the future.";
      if (!incidentTime) return "Enter the approximate time of the incident.";
      if (!city.trim() || !stateCode) return "Enter the city and state where the incident happened.";
      if (!incidentType || !collisionType || !severity) return "Select the incident type, impact and severity.";
    }
    if (s === 3) {
      if (selectedDamagePoints.length === 0 && collisionType !== "Not Applicable (Theft / Fire)")
        return "Select at least one damaged area.";
      if (!damageDescription.trim()) return "Describe what happened.";
      const cost = Number(estimatedCost);
      if (!cost || cost <= 0) return "Enter the estimated repair cost in rupees.";
      if (policeReportAvailable === "YES" && !policeReportNumber.trim())
        return "Enter the FIR / police report number.";
    }
    return null;
  };

  const goTo = (target: number) => {
    // Moving forward requires every earlier step to be valid.
    for (let s = 1; s < target; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }
    setStepError(null);
    setStep(target);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let s = 1; s <= 3; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }
    if (!selectedVehicle) return;
    setSubmitError(null);
    setSubmissionState("submitting");

    const cost = Number(estimatedCost);
    const created = await createClaim({
      vehicle_id: selectedVehicle.id,
      policy_number: policyNumber || undefined,
      incident_date: incidentDate,
      incident_time: incidentTime,
      incident_type: incidentType,
      collision_type: collisionType,
      severity,
      damage_estimate: cost,
      vehicle_claim: cost,
      injury_claim: 0,
      property_claim: 0,
      incident_location: address.trim(),
      incident_description: damageDescription.trim(),
      damaged_areas: selectedDamagePoints.join(", "),
      police_report_number: policeReportAvailable === "YES" ? policeReportNumber.trim() : "",
      police_report: policeReportAvailable === "YES",
      authorities_contacted: policeContacted,
      witnesses: 0,
      state: stateCode,
      city: city.trim(),
    });

    if (!created) {
      setSubmissionState("active");
      setSubmitError("Could not submit the claim. Please check your details and try again.");
      return;
    }

    for (const file of uploadedFiles) {
      const kind = file.type === "application/pdf" ? "document" : "image";
      await documentsApi.upload(created.id, file, kind);
    }

    setConfirmation({ ref: created.claimRef || created.id, agent: created.assignedAgentName });
    setSubmissionState("confirmed");
  };

  const stepNav = (prev: number | null, next: number | null, nextLabel = "Continue") => (
    <div className="flex justify-between pt-4">
      {prev ? (
        <button
          type="button"
          onClick={() => {
            setStepError(null);
            setStep(prev);
          }}
          className="px-4 py-2 border border-[#c6c6cd] text-xs font-semibold rounded-lg hover:bg-[#eff4ff]"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button
          type="button"
          onClick={() => goTo(next)}
          className="px-5 py-2.5 bg-[#000000] text-white text-xs font-bold rounded-lg hover:bg-[#131b2e] flex items-center gap-1.5"
        >
          <span>{nextLabel}</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 app-main flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#d3e4fe] shadow-xs">
            <div className="text-xs font-bold text-[#45464d] uppercase tracking-wider mb-1">Claim Filing</div>
            <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">Submit a Motor Claim</h1>
            <p className="text-sm text-[#45464d] mt-0.5">
              Four short steps: choose your vehicle, describe the incident, add damage details and photos, then submit.
            </p>
          </div>

          {submissionState !== "confirmed" && (
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { num: 1, title: "Vehicle & Policy" },
                  { num: 2, title: "Incident Details" },
                  { num: 3, title: "Damage & Evidence" },
                  { num: 4, title: "Review & Submit" },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => (s.num < step ? (setStepError(null), setStep(s.num)) : goTo(s.num))}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all ${
                      step === s.num
                        ? "bg-[#131b2e] text-white shadow-xs font-semibold"
                        : step > s.num
                        ? "bg-[#eff4ff] text-[#069669] font-medium"
                        : "text-[#45464d] hover:bg-[#f8f9ff]"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-current">
                      {step > s.num ? "✓" : s.num}
                    </span>
                    <span className="text-xs truncate max-w-full">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {submissionState === "confirmed" && confirmation ? (
            <div className="bg-white rounded-xl border border-[#a7f3d0] p-8 text-center flex flex-col items-center justify-center gap-4 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                <span className="material-symbols-outlined text-[40px]">check_circle</span>
              </div>
              <div className="max-w-md">
                <span className="text-xs font-bold text-[#059669] uppercase tracking-wider block">
                  Claim Filed Successfully
                </span>
                <h2 className="text-2xl font-bold text-[#0b1c30] mt-1">Claim Reference: {confirmation.ref}</h2>
                <p className="text-sm text-[#45464d] mt-2">
                  {confirmation.agent
                    ? <>Your claim has been assigned to adjuster <strong>{confirmation.agent}</strong>.</>
                    : "Your claim has been received and will be assigned to an adjuster shortly."}{" "}
                  You can track its progress from your dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-md my-2 p-3 bg-[#f8f9ff] rounded-lg border border-[#e5eeff] text-left text-xs">
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Vehicle</span>
                  <span className="font-bold text-[#0b1c30]">{selectedVehicle?.label}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Incident</span>
                  <span className="font-bold text-[#0b1c30]">
                    {formatDate(incidentDate)}, {formatTime(incidentTime)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Status</span>
                  <span className="font-bold text-[#059669]">Submitted</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Estimated Cost</span>
                  <span className="font-bold text-[#0b1c30]">{formatINR(Number(estimatedCost))}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href="/" className="px-5 py-2.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm">
                  Return to Dashboard
                </Link>
                <Link href="/history" className="px-5 py-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold rounded-lg border border-[#d3e4fe]">
                  View Claim History
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#d3e4fe] p-6 shadow-xs flex flex-col gap-6">
              {stepError && (
                <div className="p-2.5 rounded-lg bg-[#ffdad6] border border-[#fca5a5] text-[#93000a] text-xs font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{stepError}</span>
                </div>
              )}

              {/* STEP 1: Vehicle & Policy */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 1: Vehicle & Policy
                  </h3>

                  {loadingStep1 ? (
                    <p className="text-xs text-[#76777d]">Loading your vehicles…</p>
                  ) : (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-[#0b1c30] block mb-2">Vehicle involved *</span>
                        {vehicles.length === 0 && (
                          <p className="text-xs text-[#45464d] mb-2">
                            You have no vehicles on your account yet. Add the vehicle involved below.
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {vehicles.map((v) => {
                            const active = v.id === vehicleId;
                            const confirming = confirmRemoveId === v.id;
                            return (
                              <div key={v.id} className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (v.category !== selectedVehicle?.category) setSelectedDamagePoints([]);
                                  setVehicleId(v.id);
                                }}
                                className={`w-full p-3 pr-10 rounded-lg border text-left transition-colors ${
                                  active
                                    ? "border-[#131b2e] bg-[#131b2e] text-white"
                                    : "border-[#d3e4fe] bg-white hover:bg-[#eff4ff] text-[#0b1c30]"
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                                  {VEHICLE_CATEGORY_LABEL[v.category]}
                                  {v.is_custom ? " • Other" : ""}
                                </span>
                                <span className="text-xs font-bold block">
                                  {v.year} {v.make} {v.model}
                                </span>
                                <span className="text-[11px] font-mono opacity-80">{v.registration_number}</span>
                              </button>
                              {!confirming ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveId(v.id)}
                                  title="Remove this vehicle"
                                  aria-label={`Remove ${v.make} ${v.model}`}
                                  className={`absolute top-2 right-2 p-1 rounded-md transition-colors ${
                                    active
                                      ? "text-white/70 hover:text-white hover:bg-white/15"
                                      : "text-[#76777d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              ) : (
                                <div className="absolute inset-0 rounded-lg bg-white border border-[#fca5a5] p-2.5 flex flex-col justify-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-[#0b1c30]">
                                    Remove {v.make} {v.model} ({v.registration_number})?
                                  </span>
                                  <span className="text-[10px] text-[#45464d]">Claims already filed on it are kept.</span>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      disabled={removingVehicle}
                                      onClick={() => removeVehicle(v.id)}
                                      className="px-2.5 py-1 rounded bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[11px] font-bold disabled:opacity-60"
                                    >
                                      {removingVehicle ? "Removing…" : "Remove"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmRemoveId(null)}
                                      className="px-2.5 py-1 rounded border border-[#c6c6cd] text-[11px] font-semibold hover:bg-[#f8f9ff]"
                                    >
                                      Keep
                                    </button>
                                  </div>
                                </div>
                              )}
                              </div>
                            );
                          })}
                        </div>

                        {!addingVehicle ? (
                          <button
                            type="button"
                            onClick={() => setAddingVehicle(true)}
                            className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#d3e4fe] hover:bg-[#eff4ff] text-[#4059aa] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Add another vehicle
                          </button>
                        ) : (
                          <div className="mt-3 p-4 rounded-xl border border-[#d3e4fe] bg-[#f8f9ff] flex flex-col gap-3">
                            <span className="text-xs font-bold text-[#0b1c30]">Add a vehicle</span>
                            <VehiclePicker value={newVehicle} onChange={setNewVehicle} />
                            <div className="flex gap-2 justify-end">
                              {vehicles.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingVehicle(false);
                                    setNewVehicle(EMPTY_VEHICLE);
                                    setStepError(null);
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#c6c6cd] hover:bg-white"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={savingVehicle}
                                onClick={saveNewVehicle}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#000000] text-white hover:bg-[#131b2e] disabled:opacity-60"
                              >
                                {savingVehicle ? "Saving…" : "Save Vehicle"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Policy</label>
                        {policies.length === 0 ? (
                          <p className="text-xs text-[#45464d] p-2.5 bg-[#f8f9ff] border border-[#e5eeff] rounded-lg">
                            No policy is linked to your account. You can still file the claim; our team will verify your cover.
                          </p>
                        ) : (
                          <>
                            <select value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className={fieldCls}>
                              {policies.map((p) => (
                                <option key={p.id} value={p.policy_number}>
                                  {p.policy_number}
                                </option>
                              ))}
                            </select>
                            {selectedPolicy && (
                              <div className="mt-2 p-3 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-[#1d3989]">
                                  {selectedPolicy.coverage || "Motor"} cover
                                  {Number(selectedPolicy.deductible) > 0 &&
                                    ` • Deductible ${formatINR(Number(selectedPolicy.deductible))}`}
                                </span>
                                <span className="text-[11px] font-bold text-[#069669] bg-[#ecfdf5] px-2.5 py-1 rounded border border-[#a7f3d0] capitalize">
                                  {selectedPolicy.status}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {stepNav(null, 2, "Proceed to Incident Details")}
                </div>
              )}

              {/* STEP 2: Incident Details */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 2: Incident Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Date of Incident *
                      <input
                        type="date"
                        value={incidentDate}
                        max={todayIST()}
                        onChange={(e) => setIncidentDate(e.target.value)}
                        className={`${fieldCls} mt-1`}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Approximate Time (IST) *
                      <input
                        type="time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className={`${fieldCls} mt-1`}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="text-xs font-semibold text-[#0b1c30] md:col-span-3">
                      Location (road / landmark)
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Near Guindy flyover, GST Road"
                        className={`${fieldCls} mt-1`}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      City *
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Chennai"
                        maxLength={80}
                        className={`${fieldCls} mt-1`}
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#0b1c30] md:col-span-2">
                      State / UT *
                      <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} className={`${fieldCls} mt-1`}>
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Incident Type *
                      <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className={`${fieldCls} mt-1`}>
                        <option value="">Select</option>
                        <option>Single Vehicle Collision</option>
                        <option>Multi-Vehicle Collision</option>
                        <option>Parked Vehicle Hit</option>
                        <option>Hit and Run</option>
                        <option>Theft or Vandalism</option>
                        <option>Flood / Natural Calamity</option>
                        <option>Fire</option>
                        <option>Animal Strike</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Point of Impact *
                      <select value={collisionType} onChange={(e) => setCollisionType(e.target.value)} className={`${fieldCls} mt-1`}>
                        <option value="">Select</option>
                        <option>Rear-end Impact</option>
                        <option>Frontal Impact</option>
                        <option>Side Impact</option>
                        <option>Side Swipe</option>
                        <option>Skid / Rollover</option>
                        <option>Not Applicable (Theft / Fire)</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Severity *
                      <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={`${fieldCls} mt-1`}>
                        <option value="">Select</option>
                        <option value="Minor Damage">Minor Damage (drivable)</option>
                        <option value="Moderate Damage">Moderate Damage</option>
                        <option value="Major Damage">Major Damage (towed)</option>
                        <option value="Total Loss Suspected">Total Loss Suspected</option>
                      </select>
                    </label>
                  </div>

                  {stepNav(1, 3, "Proceed to Damage & Evidence")}
                </div>
              )}

              {/* STEP 3: Damage & Evidence */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 3: Damage & Evidence
                  </h3>

                  <div>
                    <span className="text-xs font-semibold text-[#0b1c30] block mb-2">
                      Damaged areas ({VEHICLE_CATEGORY_LABEL[selectedVehicle?.category || "four_wheeler"]}) — click to select
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {damageOptions.map((opt) => {
                        const isSelected = selectedDamagePoints.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleDamagePoint(opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-[#4059aa] text-white shadow-xs"
                                : "bg-[#eff4ff] text-[#0b1c30] border border-[#d3e4fe] hover:bg-[#dce9ff]"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="text-xs font-semibold text-[#0b1c30] block">
                    What happened? *
                    <textarea
                      rows={3}
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      placeholder="Describe how the incident happened and the damage to your vehicle."
                      className={`${fieldCls} mt-1`}
                    />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Estimated Repair Cost (₹) *
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        placeholder="e.g. 25000"
                        className={`${fieldCls} mt-1`}
                      />
                      {Number(estimatedCost) > 0 && (
                        <span className="text-[11px] text-[#45464d] font-medium">{formatINR(Number(estimatedCost))}</span>
                      )}
                    </label>
                    <label className="text-xs font-semibold text-[#0b1c30]">
                      Police informed?
                      <select
                        value={policeReportAvailable}
                        onChange={(e) => {
                          setPoliceReportAvailable(e.target.value);
                          setPoliceContacted(e.target.value === "YES" ? "Police" : "None");
                        }}
                        className={`${fieldCls} mt-1`}
                      >
                        <option value="NO">No</option>
                        <option value="YES">Yes — FIR / report filed</option>
                      </select>
                    </label>
                    {policeReportAvailable === "YES" && (
                      <label className="text-xs font-semibold text-[#0b1c30]">
                        FIR / Report Number *
                        <input
                          value={policeReportNumber}
                          onChange={(e) => setPoliceReportNumber(e.target.value)}
                          className={`${fieldCls} mt-1`}
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[#0b1c30] block mb-1">
                      Photos, repair estimate or FIR copy
                    </span>
                    <label className="border-2 border-dashed border-[#76777d]/40 rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-[#eff4ff] transition-colors">
                      <span className="material-symbols-outlined text-[32px] text-[#4059aa]">cloud_upload</span>
                      <span className="text-xs font-bold text-[#0b1c30] mt-1">Click to upload</span>
                      <span className="text-[11px] text-[#45464d]">JPG, PNG, WEBP or PDF, up to 25 MB each</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {uploadedFiles.map((f, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eff4ff] border border-[#d3e4fe] text-xs font-medium text-[#0b1c30]"
                          >
                            <span className="material-symbols-outlined text-[16px] text-[#069669]">
                              {f.type === "application/pdf" ? "picture_as_pdf" : "image"}
                            </span>
                            {f.name}
                            <button
                              type="button"
                              onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                              className="text-[#76777d] hover:text-[#ba1a1a]"
                              title="Remove"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {stepNav(2, 4, "Proceed to Review")}
                </div>
              )}

              {/* STEP 4: Review & Submit */}
              {step === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 4: Review & Submit
                  </h3>

                  <div className="p-4 bg-[#f8f9ff] border border-[#d3e4fe] rounded-xl space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        ["Vehicle", selectedVehicle?.label || "—"],
                        ["Policy", policyNumber || "Not linked"],
                        ["Incident", `${formatDate(incidentDate)}, ${formatTime(incidentTime)} IST`],
                        ["Location", [address, city, stateName(stateCode)].filter(Boolean).join(", ")],
                        ["Incident Type", `${incidentType} • ${collisionType}`],
                        ["Severity", severity],
                        ["Damaged Areas", selectedDamagePoints.join(", ") || "—"],
                        ["Estimated Cost", formatINR(Number(estimatedCost))],
                        ["Police", policeReportAvailable === "YES" ? `FIR ${policeReportNumber}` : "Not informed"],
                        ["Attachments", `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"}`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[10px] uppercase font-bold text-[#45464d] block">{k}</span>
                          <span className="font-bold text-[#0b1c30]">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-[#e5eeff]">
                      <span className="text-[10px] uppercase font-bold text-[#45464d] block">What happened</span>
                      <p className="text-[#0b1c30] text-xs mt-0.5">{damageDescription}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#fef3c7] border border-[#fde68a] rounded-lg text-xs text-[#92400e]">
                    <span className="font-bold block">Declaration</span>
                    <p className="mt-0.5 text-[11px]">
                      I declare that the information given above is true and correct to the best of my knowledge.
                      Submitting false information on an insurance claim is an offence.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-2.5 rounded-lg bg-[#ffdad6] border border-[#fca5a5] text-[#93000a] text-xs font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2 border border-[#c6c6cd] text-xs font-semibold rounded-lg hover:bg-[#eff4ff]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submissionState === "submitting"}
                      className="px-6 py-2.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-70"
                    >
                      {submissionState === "submitting" ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting…</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">verified</span>
                          <span>Submit Claim</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
