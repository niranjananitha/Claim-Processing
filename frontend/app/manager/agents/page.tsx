"use client";

import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useClaims } from "../../context/ClaimsContext";
import { managerApi, usersApi } from "../../services/api";
import type { UserDTO } from "../../services/types";

const CLOSED = ["Approved", "Rejected"];

export default function AgentManagementPage() {
  const { claims, loadClaims } = useClaims();
  const [agents, setAgents] = useState<UserDTO[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Create-agent form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAgents = useCallback(
    () =>
      usersApi.list("agent").then((res) => {
        if (res.ok && res.data) {
          setAgents(res.data);
          setLoadError(null);
        } else {
          setLoadError(res.error || "Could not load agents.");
        }
      }),
    []
  );

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      flash(false, "Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    const res = await usersApi.createStaff(name.trim(), email.trim(), password, "agent");
    setCreating(false);
    if (res.ok && res.data) {
      flash(true, `Agent account created for ${res.data.name}. They can now sign in with ${res.data.email}.`);
      setName("");
      setEmail("");
      setPassword("");
      void loadAgents();
    } else {
      flash(false, res.error || "Could not create the agent.");
    }
  };

  const toggleAccess = async (agent: UserDTO) => {
    const next = !(agent.is_active ?? true);
    const res = await usersApi.setAccess(agent.id, next);
    if (res.ok) {
      flash(true, `${agent.name}'s access ${next ? "granted" : "revoked"}.`);
      void loadAgents();
    } else {
      flash(false, res.error || "Could not update access.");
    }
  };

  const assign = async (claimId: string, agentId: number) => {
    const res = await managerApi.assign(claimId, agentId);
    if (res.ok) {
      flash(true, `Claim #${claimId} assigned.`);
      void loadClaims();
    } else {
      flash(false, res.error || "Could not assign the claim.");
    }
  };

  const openClaims = claims.filter((c) => !CLOSED.includes(c.status));
  const workload = (agentId: number) =>
    openClaims.filter((c) => c.assignedTo === String(agentId)).length;
  const activeAgents = agents.filter((a) => a.is_active ?? true);

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex">
      <Sidebar />
      <div className="flex-1 app-main flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">Agent Management</h1>
            <p className="text-xs text-[#45464d] mt-1">
              Create field adjuster accounts, grant or revoke their portal access, and assign claims to them.
            </p>
          </div>

          {toast && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                toast.ok
                  ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                  : "bg-[#ffdad6] border-[#fca5a5] text-[#93000a]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{toast.ok ? "check_circle" : "error"}</span>
              <span>{toast.msg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create agent */}
            <form
              onSubmit={handleCreate}
              className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs p-5 flex flex-col gap-3 h-fit"
            >
              <span className="text-sm font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#4059aa]">person_add</span>
                Create New Agent
              </span>
              <label className="text-xs font-semibold text-[#0b1c30]">
                Full name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs outline-none focus:border-[#4059aa]"
                />
              </label>
              <label className="text-xs font-semibold text-[#0b1c30]">
                Work email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs outline-none focus:border-[#4059aa]"
                />
              </label>
              <label className="text-xs font-semibold text-[#0b1c30]">
                Initial password (min 8 characters)
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs outline-none focus:border-[#4059aa]"
                />
              </label>
              <button
                type="submit"
                disabled={creating}
                className="mt-1 py-2 bg-[#000000] hover:bg-[#131b2e] text-white text-xs font-bold rounded-lg disabled:opacity-60 cursor-pointer"
              >
                {creating ? "Creating…" : "Create Agent Account"}
              </button>
            </form>

            {/* Agent roster */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-[#eff4ff] border-b border-[#d3e4fe] text-sm font-bold text-[#0b1c30]">
                Agents ({agents.length})
              </div>
              {loadError && <p className="p-4 text-xs text-[#ba1a1a] font-semibold">{loadError}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#f8f9ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                      <th className="py-2.5 px-4">Agent</th>
                      <th className="py-2.5 px-4">Open Claims</th>
                      <th className="py-2.5 px-4">Access</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-[#e5eeff]">
                    {agents.map((a) => {
                      const active = a.is_active ?? true;
                      return (
                        <tr key={a.id}>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#0b1c30] block">{a.name}</span>
                            <span className="text-[11px] text-[#45464d]">{a.email}</span>
                          </td>
                          <td className="py-3 px-4">{workload(a.id)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                active
                                  ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]"
                                  : "bg-[#ffdad6] text-[#93000a] border-[#fca5a5]"
                              }`}
                            >
                              {active ? "Active" : "Revoked"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => toggleAccess(a)}
                              className={`px-2.5 py-1 text-white text-xs font-bold rounded cursor-pointer ${
                                active ? "bg-[#ba1a1a] hover:bg-[#93000a]" : "bg-[#059669] hover:bg-[#047857]"
                              }`}
                            >
                              {active ? "Revoke Access" : "Grant Access"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {agents.length === 0 && !loadError && (
                      <tr>
                        <td colSpan={4} className="py-4 px-4 text-[#76777d]">
                          No agents yet. Create one using the form.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Claim assignment */}
          <div className="bg-white rounded-xl border border-[#d3e4fe] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-[#eff4ff] border-b border-[#d3e4fe] text-sm font-bold text-[#0b1c30]">
              Claim Assignment ({openClaims.length} open)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f8f9ff] text-[#45464d] text-[11px] font-bold uppercase tracking-wider border-b border-[#d3e4fe]">
                    <th className="py-2.5 px-4">Claim</th>
                    <th className="py-2.5 px-4">Policyholder & Vehicle</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Assigned Agent</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#e5eeff]">
                  {openClaims.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 font-bold">{c.claimRef || c.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold block">{c.policyHolder}</span>
                        <span className="text-[11px] text-[#45464d]">{c.vehicle}</span>
                      </td>
                      <td className="py-3 px-4">{c.status}</td>
                      <td className="py-3 px-4">
                        <select
                          value={c.assignedTo}
                          onChange={(e) => e.target.value && assign(c.id, Number(e.target.value))}
                          className="px-2 py-1.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs outline-none focus:border-[#4059aa]"
                        >
                          {!c.assignedTo && <option value="">Unassigned</option>}
                          {agents
                            .filter((a) => (a.is_active ?? true) || String(a.id) === c.assignedTo)
                            .map((a) => (
                              <option key={a.id} value={String(a.id)} disabled={!(a.is_active ?? true)}>
                                {a.name}
                                {(a.is_active ?? true) ? "" : " (revoked)"}
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activeAgents.length === 0 && (
              <p className="p-4 text-xs text-[#76777d]">Grant at least one agent access to assign claims.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
