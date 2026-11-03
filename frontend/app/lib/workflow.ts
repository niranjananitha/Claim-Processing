/**
 * Claim status workflow — a mirror of Backend/app/core/permissions.py (TRANSITIONS).
 * The backend is the authority (an illegal move returns 409 Conflict); the UI uses
 * this copy so it never offers a button the server would refuse.
 * Keep the two in sync.
 */
import type { UserRole } from "../services/types";

const TRANSITIONS: Record<UserRole, Record<string, string[]>> = {
  client: {
    "Action Required": ["Under Review"],
    Rejected: ["Disputed"],
  },
  agent: {
    Submitted: ["Under Review"],
    "Under Review": ["Agent-Verified", "Action Required", "Fraud Review"],
    "Agent-Verified": ["Fraud Review"],
  },
  manager: {
    "Agent-Verified": ["Approved", "Rejected", "Under Review", "Revaluation", "Fraud Review"],
    "Fraud Review": ["Approved", "Rejected", "Under Review"],
    Disputed: ["Revaluation", "Approved", "Rejected"],
    Revaluation: ["Approved", "Rejected"],
  },
};

/** Final statuses: nothing can change them (Approved; Rejected only via the client's appeal). */
export const CLOSED_STATUSES = ["Approved", "Rejected"];

export function canTransition(role: UserRole, from: string, to: string): boolean {
  return (TRANSITIONS[role]?.[from] ?? []).includes(to);
}

/** Can this role move the claim anywhere from its current status? */
export function hasActions(role: UserRole, status: string): boolean {
  return (TRANSITIONS[role]?.[status] ?? []).length > 0;
}

/**
 * Agent "verify" is two steps server-side: Submitted -> Under Review -> Agent-Verified.
 * So an agent may verify from Submitted or Under Review (not from Action Required:
 * that waits on the customer).
 */
export function agentCanVerify(status: string): boolean {
  return status === "Submitted" || status === "Under Review";
}

/** Same two-step rule for asking the customer for more information. */
export function agentCanRequestInfo(status: string): boolean {
  return status === "Submitted" || status === "Under Review";
}

/** A plain-English reason shown when an action isn't available. */
export function blockedReason(status: string): string {
  if (status === "Approved") return "This claim is already approved; no further action is possible.";
  if (status === "Rejected") return "This claim is rejected; only the policyholder can appeal it.";
  if (status === "Action Required") return "Waiting for the policyholder to provide the requested information.";
  if (status === "Agent-Verified") return "Already verified; waiting for the manager's decision.";
  if (status === "Disputed" || status === "Revaluation") return "Under appeal; the manager decides this claim.";
  return `No action is available while the claim is "${status}".`;
}
