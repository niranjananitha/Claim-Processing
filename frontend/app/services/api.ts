/**
 * Centralized API client for the FastAPI backend.
 *
 * - Access token is kept in memory only (never localStorage).
 * - Refresh token is the backend's httpOnly cookie; we send credentials on every
 *   request and transparently refresh once on a 401.
 * - Base URL must use `localhost` (same-site with the dev frontend) so the
 *   SameSite=Strict refresh cookie is sent.
 */
import type {
  ApiResult,
  ClaimDTO,
  ClaimRecord,
  DocumentDTO,
  MLResultDTO,
  StatusHistoryDTO,
  UserDTO,
  UserSession,
  VehicleCatalog,
  VehicleDTO,
  VehicleInput,
  PolicyDTO,
} from "./types";

export type { ClaimRecord } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ------------------------------------------------------------------ token store
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}

// ------------------------------------------------------------------- core fetch
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const data = await res.json();
    setAccessToken(data.access_token);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    return { ok: false, status: 0, error: "Cannot reach the server. Is the backend running?" };
  }

  // Transparent single refresh-and-retry on auth expiry.
  if (res.status === 401 && !_retried && !path.startsWith("/auth/")) {
    if (await tryRefresh()) return request<T>(path, options, true);
  }

  if (res.status === 204) return { ok: true, status: 204 };

  let body: unknown = undefined;
  try {
    body = await res.json();
  } catch {
    /* empty / non-json body */
  }

  if (!res.ok) {
    const raw = body && typeof body === "object" && "detail" in body
      ? (body as { detail: unknown }).detail
      : undefined;
    // FastAPI validation errors are a list of {loc, msg}; surface the first readable message.
    const detail = Array.isArray(raw)
      ? String((raw[0] as { msg?: string })?.msg || "Invalid input").replace(/^Value error, /, "")
      : raw !== undefined
      ? String(raw)
      : `Request failed (${res.status})`;
    return { ok: false, status: res.status, error: detail };
  }
  return { ok: true, status: res.status, data: body as T };
}

// --------------------------------------------------------------------- mappers
export function toUserSession(u: UserDTO): UserSession {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    policyNumber: u.policy_number ?? undefined,
    title: u.title ?? undefined,
    avatarText: u.avatar_text ?? u.name.slice(0, 2).toUpperCase(),
  };
}

export function toClaimRecord(c: ClaimDTO): ClaimRecord {
  return {
    id: String(c.id),
    claimRef: c.claim_ref,
    policyNumber: c.policy_number || "",
    policyHolder: c.policy_holder,
    incidentDate: c.incident_date ?? "",
    filedDate: c.filed_date,
    incidentType: c.incident_type,
    collisionType: c.collision_type,
    severity: c.severity,
    vehicle: c.vehicle,
    autoMake: c.auto_make,
    autoModel: c.auto_model,
    autoYear: c.auto_year,
    damageEstimate: Number(c.damage_estimate),
    vehicleClaim: Number(c.vehicle_claim),
    injuryClaim: Number(c.injury_claim),
    propertyClaim: Number(c.property_claim),
    status: c.status,
    statusNote: c.status_note,
    assignedTo: c.assigned_agent_id ? String(c.assigned_agent_id) : "",
    assignedAgentName: c.assigned_agent_name || "",
    incidentTime: c.incident_time ?? "",
    vehicleCategory: c.vehicle_category || "",
    incidentLocation: c.incident_location || "",
    incidentDescription: c.incident_description || "",
    damagedAreas: c.damaged_areas || "",
    policeReportNumber: c.police_report_number || "",
    policeReport: c.police_report,
    authoritiesContacted: c.authorities_contacted,
    witnesses: c.witnesses,
    state: c.state,
    city: c.city,
  };
}

export interface ClaimCreateInput {
  policy_number?: string;
  vehicle_id: number;
  incident_date?: string;
  incident_time?: string;
  incident_type?: string;
  collision_type?: string;
  severity?: string;
  vehicle?: string;
  auto_make?: string;
  auto_model?: string;
  auto_year?: string;
  damage_estimate?: number;
  vehicle_claim?: number;
  injury_claim?: number;
  property_claim?: number;
  incident_location?: string;
  incident_description?: string;
  damaged_areas?: string;
  police_report_number?: string;
  police_report?: boolean;
  authorities_contacted?: string;
  witnesses?: number;
  state?: string;
  city?: string;
}

// ------------------------------------------------------------------- domain API
export const authApi = {
  register: (
    name: string,
    email: string,
    password: string,
    vehicle: VehicleInput,
    policy_number?: string
  ) =>
    request<{ access_token: string; user: UserDTO }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, policy_number, vehicle }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: UserDTO }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  refresh: () =>
    request<{ access_token: string; user: UserDTO }>("/auth/refresh", { method: "POST" }),
  logout: () => request<{ detail: string }>("/auth/logout", { method: "POST" }),
  me: () => request<UserDTO>("/auth/me"),
};

export const claimsApi = {
  list: () => request<ClaimDTO[]>("/claims"),
  get: (id: string | number) => request<ClaimDTO>(`/claims/${id}`),
  create: (data: ClaimCreateInput) =>
    request<ClaimDTO>("/claims", { method: "POST", body: JSON.stringify(data) }),
  changeStatus: (id: string | number, to_status: string, reason: string) =>
    request<ClaimDTO>(`/claims/${id}`, {
      method: "PUT",
      body: JSON.stringify({ to_status, reason }),
    }),
  history: (id: string | number) => request<StatusHistoryDTO[]>(`/claims/${id}/history`),
};

export const policiesApi = {
  list: (customerId?: number) =>
    request<PolicyDTO[]>(`/policies${customerId ? `?customer_id=${customerId}` : ""}`),
  get: (policyNumber: string) => request<PolicyDTO>(`/policies/${policyNumber}`),
};

export const vehiclesApi = {
  catalog: () => request<VehicleCatalog>("/vehicles/catalog"),
  mine: () => request<VehicleDTO[]>("/vehicles"),
  add: (v: VehicleInput) =>
    request<VehicleDTO>("/vehicles", { method: "POST", body: JSON.stringify(v) }),
  /** Removes it from your list; claims already filed on it keep their record. */
  remove: (id: number) => request<void>(`/vehicles/${id}`, { method: "DELETE" }),
};

export const agentApi = {
  dashboard: () =>
    request<{ assigned_total: number; by_status: Record<string, number> }>("/agent/dashboard"),
  assignedClaims: () => request<ClaimDTO[]>("/agent/assigned-claims"),
  verify: (id: string | number, notes: string, damageApproved?: number) =>
    request<ClaimDTO>(`/agent/claims/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ notes, damage_approved: damageApproved }),
    }),
  requestInformation: (id: string | number, reason: string) =>
    request<ClaimDTO>(`/agent/claims/${id}/request-information`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export const managerApi = {
  dashboard: () =>
    request<{ total: number; by_status: Record<string, number> }>("/manager/dashboard"),
  pendingClaims: () => request<ClaimDTO[]>("/manager/pending-claims"),
  approve: (id: string | number, reason: string, approvedAmount?: number) =>
    request<ClaimDTO>(`/manager/claims/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, approved_amount: approvedAmount }),
    }),
  reject: (id: string | number, reason: string) =>
    request<ClaimDTO>(`/manager/claims/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  revaluation: (id: string | number, reason: string) =>
    request<ClaimDTO>(`/manager/claims/${id}/revaluation`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  assign: (id: string | number, agentId: number) =>
    request<ClaimDTO>(`/manager/claims/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ agent_id: agentId }),
    }),
};

export const usersApi = {
  list: (role?: "client" | "agent" | "manager") =>
    request<UserDTO[]>(`/users${role ? `?role=${role}` : ""}`),
  createStaff: (name: string, email: string, password: string, role: "agent" | "manager") =>
    request<UserDTO>("/users/staff", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    }),
  setAccess: (userId: number, isActive: boolean) =>
    request<UserDTO>(`/users/${userId}/access`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    }),
};

export const dashboardApi = {
  summary: () =>
    request<{ role: string; total: number; by_status: Record<string, number> }>(
      "/dashboard/summary"
    ),
};

export const documentsApi = {
  upload: (claimId: string | number, file: File, kind: "image" | "document") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("claim_id", String(claimId));
    fd.append("kind", kind);
    return request<{ id: number; original_name: string }>("/documents/upload", {
      method: "POST",
      body: fd,
    });
  },
  list: (claimId: string | number) => request<DocumentDTO[]>(`/claims/${claimId}/documents`),
  downloadUrl: (docId: number) => `${API_BASE_URL}/documents/${docId}`,
  /** Fetch a document's bytes with the bearer token (an <img src> can't send it). */
  fetchBlob: async (docId: number, _retried = false): Promise<Blob | null> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        headers,
        credentials: "include",
      });
      if (res.status === 401 && !_retried && (await tryRefresh())) {
        return documentsApi.fetchBlob(docId, true);
      }
      return res.ok ? await res.blob() : null;
    } catch {
      return null;
    }
  },
  delete: (docId: number) => request<void>(`/documents/${docId}`, { method: "DELETE" }),
};

export const mlApi = {
  predict: (claimId: string | number) =>
    request<MLResultDTO>("/ml/predict", {
      method: "POST",
      body: JSON.stringify({ claim_id: Number(claimId) }),
    }),
  getPrediction: (predictionId: number) => request<unknown>(`/ml/predictions/${predictionId}`),
};
