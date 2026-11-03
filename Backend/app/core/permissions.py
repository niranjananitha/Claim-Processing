"""Role-based claim status transition rules (server-enforced)."""

# Canonical statuses (exact strings shared with the frontend).
STATUSES = (
    "Submitted",
    "Under Review",
    "Action Required",
    "Agent-Verified",
    "Fraud Review",
    "Approved",
    "Rejected",
    "Disputed",
    "Revaluation",
)

# role -> { from_status -> {allowed to_statuses} }
TRANSITIONS: dict[str, dict[str, set[str]]] = {
    "client": {
        "Action Required": {"Under Review"},
        "Rejected": {"Disputed"},
    },
    "agent": {
        "Submitted": {"Under Review"},
        "Under Review": {"Agent-Verified", "Action Required", "Fraud Review"},
        "Agent-Verified": {"Fraud Review"},
    },
    "manager": {
        "Agent-Verified": {"Approved", "Rejected", "Under Review", "Revaluation", "Fraud Review"},
        "Fraud Review": {"Approved", "Rejected", "Under Review"},
        "Disputed": {"Revaluation", "Approved", "Rejected"},
        "Revaluation": {"Approved", "Rejected"},
    },
}


def role_can_transition(role: str, from_status: str, to_status: str) -> bool:
    return to_status in TRANSITIONS.get(role, {}).get(from_status, set())
