"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  authApi,
  claimsApi,
  setAccessToken,
  toClaimRecord,
  toUserSession,
  type ClaimCreateInput,
} from "../services/api";
import type { ClaimRecord, UserRole, UserSession, VehicleInput } from "../services/types";

export type { ClaimRecord, UserRole, UserSession } from "../services/types";

interface ClaimsContextType {
  currentUser: UserSession | null;
  role: UserRole;
  loading: boolean;
  authError: string | null;

  login: (email: string, password: string) => Promise<UserSession | null>;
  register: (
    name: string,
    email: string,
    password: string,
    vehicle: VehicleInput,
    policyNumber?: string
  ) => Promise<UserSession | null>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;

  claims: ClaimRecord[];
  loadClaims: () => Promise<void>;
  createClaim: (data: ClaimCreateInput) => Promise<ClaimRecord | null>;
  changeStatus: (id: string, toStatus: string, reason: string) => Promise<ClaimRecord | null>;
  /** Temporary compatibility shim for claim pages not yet migrated. */
  updateClaimStatus: (id: string, status: string, note?: string) => void;

  selectedClaim: ClaimRecord | null;
  setSelectedClaim: (claim: ClaimRecord | null) => void;
}

const ClaimsContext = createContext<ClaimsContextType | undefined>(undefined);

export function ClaimsProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    const res = await claimsApi.list();
    if (res.ok && res.data) setClaims(res.data.map(toClaimRecord));
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    const res = await authApi.refresh();
    if (res.ok && res.data) {
      setAccessToken(res.data.access_token);
      setCurrentUser(toUserSession(res.data.user));
      await loadClaims();
    } else {
      setAccessToken(null);
      setCurrentUser(null);
    }
    setLoading(false);
  }, [loadClaims]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Keep every role's view current: another user (agent/manager/client) may have changed a
  // claim. Re-fetch when the tab regains focus and every 15s while it is visible.
  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void loadClaims();
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [currentUser, loadClaims]);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      const res = await authApi.login(email, password);
      if (res.ok && res.data) {
        setAccessToken(res.data.access_token);
        const user = toUserSession(res.data.user);
        setCurrentUser(user);
        await loadClaims();
        return user;
      }
      setAuthError(res.error || "Login failed");
      return null;
    },
    [loadClaims]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      vehicle: VehicleInput,
      policyNumber?: string
    ) => {
      setAuthError(null);
      const res = await authApi.register(name, email, password, vehicle, policyNumber);
      if (res.ok && res.data) {
        setAccessToken(res.data.access_token);
        const user = toUserSession(res.data.user);
        setCurrentUser(user);
        await loadClaims();
        return user;
      }
      setAuthError(res.error || "Registration failed");
      return null;
    },
    [loadClaims]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setAccessToken(null);
    setCurrentUser(null);
    setClaims([]);
    setSelectedClaim(null);
  }, []);

  const createClaim = useCallback(async (data: ClaimCreateInput) => {
    const res = await claimsApi.create(data);
    if (res.ok && res.data) {
      const record = toClaimRecord(res.data);
      setClaims((prev) => [record, ...prev]);
      return record;
    }
    return null;
  }, []);

  const changeStatus = useCallback(async (id: string, toStatus: string, reason: string) => {
    const res = await claimsApi.changeStatus(id, toStatus, reason);
    if (res.ok && res.data) {
      const record = toClaimRecord(res.data);
      setClaims((prev) => prev.map((c) => (c.id === record.id ? record : c)));
      setSelectedClaim((prev) => (prev && prev.id === record.id ? record : prev));
      return record;
    }
    return null;
  }, []);

  const updateClaimStatus = useCallback(
    (id: string, status: string, note?: string) => {
      void changeStatus(id, status, note || "");
    },
    [changeStatus]
  );

  return (
    <ClaimsContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || "client",
        loading,
        authError,
        login,
        register,
        logout,
        refreshSession,
        claims,
        loadClaims,
        createClaim,
        changeStatus,
        updateClaimStatus,
        selectedClaim,
        setSelectedClaim,
      }}
    >
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error("useClaims must be used within ClaimsProvider");
  return ctx;
}
