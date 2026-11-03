"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClaims, UserRole } from "../context/ClaimsContext";

function destinationFor(role: UserRole): string {
  return role === "agent" ? "/agent" : role === "manager" ? "/manager" : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useClaims();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const doLogin = async (e: string, p: string) => {
    setIsLoading(true);
    setError(null);
    const user = await login(e, p);
    setIsLoading(false);
    if (user) router.push(destinationFor(user.role));
    else setError("Invalid email or password.");
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }
    void doLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#d3e4fe] shadow-lg p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#eff4ff] border border-[#d3e4fe] flex items-center justify-center text-[#4059aa] shadow-xs mb-3">
            <span className="material-symbols-outlined text-[30px]">shield</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Aegis ClaimAssist</h1>
          <p className="text-xs text-[#45464d] mt-1">Auto Insurance Claims &amp; Enterprise Adjudication Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-[#ffdad6] border border-[#fca5a5] text-[#93000a] text-xs font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Email Address</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In to Portal</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-[#e5eeff] text-center text-xs text-[#45464d] flex items-center justify-center gap-1.5">
          <span>New policyholder?</span>
          <Link href="/signup" className="font-bold text-[#4059aa] hover:text-[#1d3989] underline">
            Create an Account
          </Link>
        </div>
      </div>

      <div className="mt-6 text-center text-[11px] text-[#76777d] flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-[#069669]">lock</span>
          256-Bit TLS Encryption
        </span>
        <span>•</span>
        <span>Aegis Casualty Co.</span>
      </div>
    </div>
  );
}
