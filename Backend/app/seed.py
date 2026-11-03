"""Idempotent seed: demo staff, a client + policy, and demo claims.

Run with:  python -m app.seed
"""
import datetime as dt
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.database.connection import SessionLocal
from app.models.claim import Claim
from app.models.claim_status_history import ClaimStatusHistory
from app.models.policy import Policy
from app.models.user import User

SEED_JSON = Path(__file__).resolve().parent / "data" / "seed_claims.json"

# Map legacy mock statuses to the canonical set.
STATUS_MAP = {
    "Completed": "Approved",
    "In Appraisal": "Under Review",
    "Info Needed": "Action Required",
}

DEMO = {
    "client": dict(email="marcus.vance@aegisclient.com", name="Marcus Vance",
                   title="Primary Policyholder"),
    "agent": dict(email="agent@aegis.com", name="Samantha Vance",
                  title="Senior Claims Adjuster (ADJ-04)"),
    "manager": dict(email="manager@aegis.com", name="Catherine Ross",
                    title="Regional Claims Operations Director"),
}


def _get_or_create_user(db: Session, role: str, password: str) -> User:
    info = DEMO[role]
    user = db.scalar(select(User).where(User.email == info["email"]))
    if user:
        return user
    user = User(
        name=info["name"], email=info["email"], title=info["title"],
        role=role, password_hash=security.hash_password(password),
    )
    db.add(user)
    db.flush()
    return user


def _parse_date(value: str):
    try:
        return dt.date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def seed(db: Session) -> None:
    settings = get_settings()
    client = _get_or_create_user(db, "client", settings.seed_client_password)
    agent = _get_or_create_user(db, "agent", settings.seed_agent_password)
    _get_or_create_user(db, "manager", settings.seed_manager_password)

    # One policy for the demo client.
    policy = db.scalar(select(Policy).where(Policy.holder_id == client.id))
    if not policy:
        policy = Policy(policy_number="PA-89214", holder_id=client.id,
                        coverage="Comprehensive", deductible=500,
                        annual_premium=1800, state="OH", status="active")
        db.add(policy)
        db.flush()

    rows = json.loads(SEED_JSON.read_text(encoding="utf-8"))
    for r in rows:
        ref = r["id"]
        if db.scalar(select(Claim).where(Claim.claim_ref == ref)):
            continue
        status = STATUS_MAP.get(r["status"], r["status"])
        claim = Claim(
            claim_ref=ref, policy_id=policy.id, client_id=client.id,
            assigned_agent_id=agent.id, policy_holder=r["policyHolder"],
            incident_date=_parse_date(r.get("incidentDate")),
            filed_date=_parse_date(r.get("filedDate")) or dt.date.today(),
            incident_type=r.get("incidentType", ""), collision_type=r.get("collisionType", ""),
            severity=r.get("severity", ""), vehicle=r.get("vehicle", ""),
            auto_make=r.get("autoMake", ""), auto_model=r.get("autoModel", ""),
            auto_year=str(r.get("autoYear", "")),
            damage_estimate=r.get("damageEstimate", 0), vehicle_claim=r.get("vehicleClaim", 0),
            injury_claim=r.get("injuryClaim", 0), property_claim=r.get("propertyClaim", 0),
            status=status, status_note=r.get("statusNote", ""),
            police_report=bool(r.get("policeReport", False)),
            authorities_contacted=r.get("authoritiesContacted", "None"),
            witnesses=int(r.get("witnesses", 0)), state=r.get("state", ""), city=r.get("city", ""),
        )
        db.add(claim)
        db.flush()
        db.add(ClaimStatusHistory(claim_id=claim.id, from_status=None,
                                  to_status=status, actor_id=client.id,
                                  reason="Seeded demo claim"))
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        seed(db)
        s = get_settings()
        print("Seed complete. Demo logins:")
        print(f"  client  : {DEMO['client']['email']} / {s.seed_client_password}")
        print(f"  agent   : {DEMO['agent']['email']} / {s.seed_agent_password}")
        print(f"  manager : {DEMO['manager']['email']} / {s.seed_manager_password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
