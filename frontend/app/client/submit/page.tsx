"use client";

import React, { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";
import { documentsApi } from "../../services/api";

export default function ClaimSubmissionPage() {
  const { createClaim } = useClaims();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Wizard state: 1 to 4
  const [step, setStep] = useState(1);
  const [submissionState, setSubmissionState] = useState<"active" | "submitting" | "confirmed">("active");
  const [newClaimId, setNewClaimId] = useState<string>("");

  // Form Fields
  const [vehicle, setVehicle] = useState("2022 Honda Accord Sedan (VIN: 1HGCR2F8...71)");
  const [policyNumber, setPolicyNumber] = useState("PA-89214");
  const [incidentDate, setIncidentDate] = useState("2024-10-28");
  const [incidentTime, setIncidentTime] = useState("14:30");
  const [incidentLocation, setIncidentLocation] = useState("Intersection of 5th Ave & Main St, Columbus, OH");
  const [incidentType, setIncidentType] = useState("Multi-Vehicle Collision");
  const [collisionType, setCollisionType] = useState("Rear-end Impact");
  const [severity, setSeverity] = useState("Minor Damage");
  const [policeContacted, setPoliceContacted] = useState("Police");
  const [policeReportAvailable, setPoliceReportAvailable] = useState("YES");
  const [policeReportNumber, setPoliceReportNumber] = useState("CPD-2024-99120");
  const [selectedDamagePoints, setSelectedDamagePoints] = useState<string[]>(["Rear Bumper", "Trunk Lid"]);
  const [damageDescription, setDamageDescription] = useState(
    "Stopped at traffic light when struck from behind by another vehicle. Rear bumper cracked and trunk latch misaligned."
  );
  const [estimatedCost, setEstimatedCost] = useState("4850");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const damageOptions = [
    "Front Bumper",
    "Hood / Grille",
    "Windshield",
    "Driver Front Door",
    "Driver Rear Door",
    "Passenger Front Door",
    "Passenger Rear Door",
    "Rear Bumper",
    "Trunk Lid",
    "Undercarriage",
  ];

  const toggleDamagePoint = (point: string) => {
    if (selectedDamagePoints.includes(point)) {
      setSelectedDamagePoints(selectedDamagePoints.filter((p) => p !== point));
    } else {
      setSelectedDamagePoints([...selectedDamagePoints, point]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmissionState("submitting");

    // Parse "2022 Honda Accord Sedan (VIN...)" into year/make/model (best-effort).
    const label = vehicle.split(" (")[0];
    const parts = label.split(" ");
    const autoYear = parts[0] || "";
    const autoMake = parts[1] || "";
    const autoModel = parts.slice(2).join(" ") || "";
    const cityState = incidentLocation.split(",").map((s) => s.trim());
    const city = cityState.length >= 2 ? cityState[cityState.length - 2] : "";
    const state = cityState.length >= 1 ? cityState[cityState.length - 1] : "";

    const created = await createClaim({
      policy_number: policyNumber,
      incident_date: incidentDate,
      incident_type: incidentType,
      collision_type: collisionType,
      severity,
      vehicle: label,
      auto_make: autoMake,
      auto_model: autoModel,
      auto_year: autoYear,
      damage_estimate: Number(estimatedCost) || 0,
      vehicle_claim: Number(estimatedCost) || 0,
      injury_claim: 0,
      property_claim: 0,
      police_report: policeReportAvailable === "YES",
      authorities_contacted: policeContacted,
      witnesses: 0,
      state: state.length <= 4 ? state : "",
      city,
    });

    if (!created) {
      setSubmissionState("active");
      setSubmitError("Could not submit the claim. Please check your details and try again.");
      return;
    }

    // Upload any attached evidence against the new claim.
    for (const file of uploadedFiles) {
      const kind = file.type === "application/pdf" ? "document" : "image";
      await documentsApi.upload(created.id, file, kind);
    }

    setNewClaimId(created.claimRef || created.id);
    setSubmissionState("confirmed");
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto flex flex-col gap-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-xl border border-[#d3e4fe] shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-bold text-[#45464d] uppercase tracking-wider mb-1">
                <span>Claim Filing Workspace</span>
                <span>•</span>
                <span className="text-[#4059aa]">Form 104-A</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                Submit an Auto Claim
              </h1>
              <p className="text-sm text-[#45464d] mt-0.5">
                Complete these 4 structured steps to report an incident, attach photo evidence, and initialize appraisal.
              </p>
            </div>

          </div>

          {/* Stepper Header (Only shown when not confirmed) */}
          {submissionState !== "confirmed" && (
            <div className="bg-white p-4 rounded-xl border border-[#d3e4fe] shadow-xs">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { num: 1, title: "Policy & Vehicle" },
                  { num: 2, title: "Incident Details" },
                  { num: 3, title: "Damage & Evidence" },
                  { num: 4, title: "Review & Submit" },
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => setStep(s.num)}
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

          {/* Submission State: Confirmed */}
          {submissionState === "confirmed" ? (
            <div className="bg-white rounded-xl border border-[#a7f3d0] p-8 text-center flex flex-col items-center justify-center gap-4 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                <span className="material-symbols-outlined text-[40px]">
                  check_circle
                </span>
              </div>
              <div className="max-w-md">
                <span className="text-xs font-bold text-[#059669] uppercase tracking-wider block">
                  Incident Report Filed Successfully
                </span>
                <h2 className="text-2xl font-bold text-[#0b1c30] mt-1">
                  Claim Reference: {newClaimId}
                </h2>
                <p className="text-sm text-[#45464d] mt-2">
                  Your claim has been assigned to Lead Adjuster <strong>Samantha Vance (ADJ-04)</strong>. An email confirmation and next-step appraisal instructions have been sent to your registered address.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-md my-2 p-3 bg-[#f8f9ff] rounded-lg border border-[#e5eeff] text-left text-xs">
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Vehicle</span>
                  <span className="font-bold text-[#0b1c30]">{vehicle.split(" (")[0]}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Incident Date</span>
                  <span className="font-bold text-[#0b1c30]">{incidentDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Status</span>
                  <span className="font-bold text-[#059669]">Under Review</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#45464d] uppercase block">Estimated Impact</span>
                  <span className="font-bold text-[#0b1c30]">${Number(estimatedCost).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  Return to Dashboard
                </Link>
                <Link
                  href="/history"
                  className="px-5 py-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-xs font-bold rounded-lg border border-[#d3e4fe] transition-all"
                >
                  View Claim in History
                </Link>
              </div>
            </div>
          ) : (
            /* Multi-step Form */
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#d3e4fe] p-6 shadow-xs flex flex-col gap-6">
              {/* STEP 1: Policy & Vehicle */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 1: Policyholder & Vehicle Identification
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Select Insured Vehicle *
                      </label>
                      <select
                        value={vehicle}
                        onChange={(e) => setVehicle(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] focus:border-[#4059aa] outline-none"
                      >
                        <option value="2022 Honda Accord Sedan (VIN: 1HGCR2F8...71)">
                          2022 Honda Accord Sedan (VIN: 1HGCR2F8...71)
                        </option>
                        <option value="2020 Subaru Outback AWD (VIN: 4S4BSANC...19)">
                          2020 Subaru Outback AWD (VIN: 4S4BSANC...19)
                        </option>
                        <option value="2024 Mercedes C300 (VIN: W1KWF8DB...88)">
                          2024 Mercedes C300 (VIN: W1KWF8DB...88)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Active Policy Reference
                      </label>
                      <input
                        type="text"
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#1d3989] block">Coverage Details: Comprehensive & Collision</span>
                      <span className="text-[#45464d] text-[11px]">Deductible: $500 • Policy Limit: $250,000 / $500,000</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#069669] bg-[#ecfdf5] px-2.5 py-1 rounded border border-[#a7f3d0]">
                      Active & In Good Standing
                    </span>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 bg-[#000000] text-white text-xs font-bold rounded-lg hover:bg-[#131b2e] flex items-center gap-1.5"
                    >
                      <span>Proceed to Incident Details</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Incident Details */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 2: Incident Circumstances
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Date of Incident *
                      </label>
                      <input
                        type="date"
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Approximate Time *
                      </label>
                      <input
                        type="time"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                      Incident Location (Street, City, State) *
                    </label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Incident Type *
                      </label>
                      <select
                        value={incidentType}
                        onChange={(e) => setIncidentType(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      >
                        <option value="Single Vehicle Collision">Single Vehicle Collision</option>
                        <option value="Multi-Vehicle Collision">Multi-Vehicle Collision</option>
                        <option value="Parked Vehicle Hit">Parked Vehicle Hit</option>
                        <option value="Theft or Vandalism">Theft or Vandalism</option>
                        <option value="Weather / Animal Strike">Weather / Animal Strike</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Collision Type *
                      </label>
                      <select
                        value={collisionType}
                        onChange={(e) => setCollisionType(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      >
                        <option value="Rear-end Impact">Rear-end Impact</option>
                        <option value="Frontal Impact">Frontal Impact</option>
                        <option value="Side Collision (T-Bone)">Side Collision (T-Bone)</option>
                        <option value="Side Swipe">Side Swipe</option>
                        <option value="Rollover">Rollover</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Severity Appraisal *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      >
                        <option value="Minor Damage">Minor Damage (Drivable)</option>
                        <option value="Moderate Damage">Moderate Damage</option>
                        <option value="Major Damage">Major Damage (Towed)</option>
                        <option value="Total Loss Suspected">Total Loss Suspected</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-[#c6c6cd] text-xs font-semibold rounded-lg hover:bg-[#eff4ff]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 bg-[#000000] text-white text-xs font-bold rounded-lg hover:bg-[#131b2e] flex items-center gap-1.5"
                    >
                      <span>Proceed to Damage & Evidence</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Damage & Evidence */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 3: Vehicle Damage & Evidence Upload
                  </h3>

                  <div>
                    <label className="text-xs font-semibold text-[#0b1c30] block mb-2">
                      Select Vehicle Impact / Damage Zones (Click to toggle):
                    </label>
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

                  <div>
                    <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                      Detailed Narrative of Incident *
                    </label>
                    <textarea
                      rows={3}
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] focus:border-[#4059aa] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Police Report Available?
                      </label>
                      <select
                        value={policeReportAvailable}
                        onChange={(e) => setPoliceReportAvailable(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      >
                        <option value="YES">Yes - Police responded at scene</option>
                        <option value="NO">No - Self-reported or private property</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                        Police Report / Incident Number
                      </label>
                      <input
                        type="text"
                        value={policeReportNumber}
                        onChange={(e) => setPoliceReportNumber(e.target.value)}
                        className="w-full p-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30]"
                      />
                    </div>
                  </div>

                  {/* Photo Dropzone */}
                  <div>
                    <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                      Upload Photos / Repair Estimates / Police Slips
                    </label>
                    <label className="border-2 border-dashed border-[#76777d]/40 rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-[#eff4ff] transition-colors">
                      <span className="material-symbols-outlined text-[32px] text-[#4059aa]">
                        cloud_upload
                      </span>
                      <span className="text-xs font-bold text-[#0b1c30] mt-1">
                        Click to upload photos or drag and drop
                      </span>
                      <span className="text-[11px] text-[#45464d]">
                        PNG, JPG, PDF up to 25MB each
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {uploadedFiles.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eff4ff] border border-[#d3e4fe] text-xs font-medium text-[#0b1c30]"
                          >
                            <span className="material-symbols-outlined text-[16px] text-[#069669]">
                              image
                            </span>
                            <span>{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-[#c6c6cd] text-xs font-semibold rounded-lg hover:bg-[#eff4ff]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="px-5 py-2.5 bg-[#000000] text-white text-xs font-bold rounded-lg hover:bg-[#131b2e] flex items-center gap-1.5"
                    >
                      <span>Proceed to Review</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Submit */}
              {step === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-base font-bold text-[#0b1c30] border-b border-[#e5eeff] pb-2">
                    Step 4: Formal Verification & Electronic Submission
                  </h3>

                  <div className="p-4 bg-[#f8f9ff] border border-[#d3e4fe] rounded-xl space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#45464d] block">Vehicle</span>
                        <span className="font-bold text-[#0b1c30]">{vehicle.split(" (")[0]}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#45464d] block">Incident Date</span>
                        <span className="font-bold text-[#0b1c30]">{incidentDate} at {incidentTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#45464d] block">Collision Type</span>
                        <span className="font-bold text-[#0b1c30]">{collisionType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#45464d] block">Police Report</span>
                        <span className="font-bold text-[#0b1c30]">{policeReportNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#45464d] block">Impact Zones</span>
                        <span className="font-bold text-[#0b1c30]">{selectedDamagePoints.join(", ")}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#45464d] block">Attached Files</span>
                        <span className="font-bold text-[#4059aa]">{uploadedFiles.length} documents</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#e5eeff]">
                      <span className="text-[10px] uppercase font-bold text-[#45464d] block">Narrative</span>
                      <p className="text-[#0b1c30] text-xs mt-0.5">{damageDescription}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#fef3c7] border border-[#fde68a] rounded-lg text-xs text-[#92400e]">
                    <span className="font-bold block">Statutory Policyholder Affirmation:</span>
                    <p className="mt-0.5 text-[11px]">
                      By submitting this claim, I certify that the statements herein are true and accurate to the best of my knowledge. Filing false insurance statements is subject to state legal penalties.
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
                      className="px-6 py-2.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
                    >
                      {submissionState === "submitting" ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Transmitting to Aegis Adjuster Network...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">
                            verified
                          </span>
                          <span>Submit Official Claim</span>
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

