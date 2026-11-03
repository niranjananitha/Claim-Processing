"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClaims } from "../context/ClaimsContext";
import VehiclePicker, { EMPTY_VEHICLE, toVehicleInput } from "../components/VehiclePicker";

export default function SignupPage() {
  const router = useRouter();
  const { register, authError } = useClaims();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please complete all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const vehicleInput = toVehicleInput(vehicle);
    if (typeof vehicleInput === "string") {
      setError(vehicleInput);
      return;
    }
    if (!agreed) {
      setError("Please accept the Aegis Policyholder terms to proceed.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const user = await register(name, email, password, vehicleInput, policyNumber || undefined);
    setIsLoading(false);
    if (user) router.push("/");
    else setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#d3e4fe] shadow-lg p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#eff4ff] border border-[#d3e4fe] flex items-center justify-center text-[#4059aa] shadow-xs mb-3">
            <span className="material-symbols-outlined text-[30px]">shield</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Create Policyholder Account</h1>
          <p className="text-xs text-[#45464d] mt-1">
            Register for client access to file and track auto insurance claims
          </p>
        </div>

        <div className="p-3 bg-[#eff4ff] border border-[#d3e4fe] rounded-lg text-[11px] text-[#45464d] flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#4059aa] shrink-0 mt-0.5">info</span>
          <span>
            Public registration creates a <strong>Client</strong> (policyholder) account. Agent and
            Manager accounts are provisioned by Aegis administrators.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {(error || authError) && (
            <div className="p-2.5 rounded-lg bg-[#ffdad6] border border-[#fca5a5] text-[#93000a] text-xs font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error || authError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Full Legal Name *</label>
            <input
              type="text"
              placeholder="Your full name as on your RC / licence"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Email Address *</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Password * (min 8 chars)</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
              Existing Motor Policy Number (Optional)
            </label>
            <input
              type="text"
              placeholder="Leave empty if you don't have one yet"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white transition-all"
            />
          </div>

          <div className="pt-1 border-t border-[#e5eeff]">
            <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5 mt-3 mb-2">
              <span className="material-symbols-outlined text-[18px] text-[#4059aa]">garage</span>
              Your Vehicle
            </span>
            <VehiclePicker value={vehicle} onChange={setVehicle} />
            <p className="text-[11px] text-[#76777d] mt-2">
              You can add more vehicles later when you file a claim.
            </p>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-[#c6c6cd] text-[#4059aa] focus:ring-0"
            />
            <label htmlFor="terms" className="text-[11px] text-[#45464d] leading-snug cursor-pointer">
              I agree to the Aegis Insurance Terms of Service and privacy policy.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating account…</span>
              </>
            ) : (
              <span>Create Account &amp; Enter Portal</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#e5eeff] text-center text-xs text-[#45464d] flex items-center justify-center gap-1.5">
          <span>Already registered?</span>
          <Link href="/login" className="font-bold text-[#4059aa] hover:text-[#1d3989] underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
