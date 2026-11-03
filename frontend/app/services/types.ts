/** Shared types for the API layer. */

export type UserRole = "client" | "agent" | "manager";

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  title?: string | null;
  policy_number?: string | null;
  avatar_text?: string | null;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  policyNumber?: string;
  title?: string;
  avatarText: string;
}

export interface ClaimRecord {
  id: string;
  claimRef?: string;
  policyNumber: string;
  policyHolder: string;
  incidentDate: string;
  filedDate: string;
  incidentType: string;
  collisionType: string;
  severity: string;
  vehicle: string;
  autoMake: string;
  autoModel: string;
  autoYear: string;
  damageEstimate: number;
  vehicleClaim: number;
  injuryClaim: number;
  propertyClaim: number;
  status: string;
  statusNote: string;
  assignedTo: string;
  policeReport: boolean;
  authoritiesContacted: string;
  witnesses: number;
  state: string;
  city: string;
}

export interface ClaimDTO {
  id: number;
  claim_ref: string;
  policy_id: number | null;
  client_id: number;
  assigned_agent_id: number | null;
  policy_holder: string;
  incident_date: string | null;
  filed_date: string;
  incident_type: string;
  collision_type: string;
  severity: string;
  vehicle: string;
  auto_make: string;
  auto_model: string;
  auto_year: string;
  damage_estimate: number;
  vehicle_claim: number;
  injury_claim: number;
  property_claim: number;
  status: string;
  status_note: string;
  police_report: boolean;
  authorities_contacted: string;
  witnesses: number;
  state: string;
  city: string;
}

export interface StatusHistoryDTO {
  id: number;
  from_status: string | null;
  to_status: string;
  actor_id: number | null;
  reason: string;
  created_at: string;
}

export interface MLContributingFactor {
  feature: string;
  description: string;
  impact: "INCREASES_RISK" | "DECREASES_RISK";
  shap_value: number;
}

export interface MLResultDTO {
  claim_id: number;
  risk_score: number;
  risk_tier: "LOW" | "MEDIUM" | "HIGH";
  model_version: string;
  model_status: "AVAILABLE" | "OFFLINE";
  contributing_factors: MLContributingFactor[];
  recommended_action: string;
  imputed_features: string[];
  review_flag: boolean;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}
