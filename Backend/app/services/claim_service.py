"""Claim business logic: creation, role-scoped access, audited status transitions."""
import random

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import STATUSES, role_can_transition
from app.models.audit_log import AuditLog
from app.models.claim import Claim
from app.models.claim_status_history import ClaimStatusHistory
from app.models.policy import Policy
from app.models.user import User
from app.schemas.claim import ClaimCreate


def _generate_ref(db: Session) -> str:
    for _ in range(20):
        ref = f"CLM-{random.randint(100000, 999999)}"
        if not db.scalar(select(Claim).where(Claim.claim_ref == ref)):
            return ref
    raise HTTPException(status_code=500, detail="Could not allocate claim reference")


def _pick_agent_id(db: Session) -> int | None:
    agent = db.scalar(select(User).where(User.role == "agent").order_by(User.id))
    return agent.id if agent else None


def _record_audit(db: Session, actor_id: int, action: str, claim: Claim, detail: str) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, entity_type="claim",
                    entity_id=str(claim.id), detail=detail))


def create_claim(db: Session, client: User, data: ClaimCreate) -> Claim:
    policy = None
    if data.policy_number:
        policy = db.scalar(select(Policy).where(Policy.policy_number == data.policy_number))
    if policy is None:
        policy = db.scalar(select(Policy).where(Policy.holder_id == client.id))

    claim = Claim(
        claim_ref=_generate_ref(db),
        policy_id=policy.id if policy else None,
        client_id=client.id,
        assigned_agent_id=_pick_agent_id(db),
        policy_holder=client.name,
        incident_date=data.incident_date,
        incident_type=data.incident_type,
        collision_type=data.collision_type,
        severity=data.severity,
        vehicle=data.vehicle,
        auto_make=data.auto_make,
        auto_model=data.auto_model,
        auto_year=str(data.auto_year),
        damage_estimate=data.damage_estimate,
        vehicle_claim=data.vehicle_claim,
        injury_claim=data.injury_claim,
        property_claim=data.property_claim,
        status="Submitted",
        status_note="Claim intake received; pending adjuster review.",
        police_report=data.police_report,
        authorities_contacted=data.authorities_contacted,
        witnesses=data.witnesses,
        state=data.state,
        city=data.city,
    )
    db.add(claim)
    db.flush()
    db.add(ClaimStatusHistory(claim_id=claim.id, from_status=None, to_status="Submitted",
                              actor_id=client.id, reason="Claim submitted"))
    _record_audit(db, client.id, "claim.create", claim, "Claim submitted")
    db.commit()
    db.refresh(claim)
    return claim


def _can_access(user: User, claim: Claim) -> bool:
    if user.role == "manager":
        return True
    if user.role == "client":
        return claim.client_id == user.id
    if user.role == "agent":
        return claim.assigned_agent_id == user.id
    return False


def list_claims(db: Session, user: User) -> list[Claim]:
    stmt = select(Claim).order_by(Claim.id.desc())
    if user.role == "client":
        stmt = stmt.where(Claim.client_id == user.id)
    elif user.role == "agent":
        stmt = stmt.where(Claim.assigned_agent_id == user.id)
    return list(db.scalars(stmt).all())


def get_claim(db: Session, user: User, claim_id: int) -> Claim:
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    if not _can_access(user, claim):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return claim


def change_status(db: Session, user: User, claim: Claim, to_status: str, reason: str) -> Claim:
    if not _can_access(user, claim):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if to_status not in STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Unknown status")
    if not role_can_transition(user.role, claim.status, to_status):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Illegal transition '{claim.status}' -> '{to_status}' for role '{user.role}'",
        )
    from_status = claim.status
    claim.status = to_status
    if reason:
        claim.status_note = reason
    db.add(ClaimStatusHistory(claim_id=claim.id, from_status=from_status, to_status=to_status,
                              actor_id=user.id, reason=reason))
    _record_audit(db, user.id, "claim.status_change", claim, f"{from_status} -> {to_status}: {reason}")
    db.commit()
    db.refresh(claim)
    return claim


def claim_history(db: Session, user: User, claim_id: int) -> list[ClaimStatusHistory]:
    claim = get_claim(db, user, claim_id)  # access-checked
    return list(claim.status_history)
