"""Manager decision routes: pending queue, approve, reject, revaluation."""
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import require_role
from app.models.claim import Claim
from app.models.user import User
from app.schemas.claim import ClaimOut
from app.schemas.review import DecisionBody, ReasonBody
from app.services import claim_service

router = APIRouter(prefix="/manager", tags=["manager"])


@router.get("/dashboard")
def dashboard(manager: User = Depends(require_role("manager")), db: Session = Depends(get_db)):
    claims = claim_service.list_claims(db, manager)
    return {"total": len(claims), "by_status": dict(Counter(c.status for c in claims))}


@router.get("/pending-claims", response_model=list[ClaimOut])
def pending_claims(manager: User = Depends(require_role("manager")), db: Session = Depends(get_db)):
    return list(db.scalars(
        select(Claim).where(Claim.status == "Agent-Verified").order_by(Claim.id.desc())
    ).all())


@router.post("/claims/{claim_id}/approve", response_model=ClaimOut)
def approve(claim_id: int, body: DecisionBody, manager: User = Depends(require_role("manager")),
            db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, manager, claim_id)
    note = body.reason
    if body.approved_amount is not None:
        note = f"{note} Authorized settlement: ${body.approved_amount:,.0f}."
    return claim_service.change_status(db, manager, claim, "Approved", note)


@router.post("/claims/{claim_id}/reject", response_model=ClaimOut)
def reject(claim_id: int, body: ReasonBody, manager: User = Depends(require_role("manager")),
           db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, manager, claim_id)
    return claim_service.change_status(db, manager, claim, "Rejected", body.reason)


@router.post("/claims/{claim_id}/revaluation", response_model=ClaimOut)
def revaluation(claim_id: int, body: ReasonBody, manager: User = Depends(require_role("manager")),
                db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, manager, claim_id)
    return claim_service.change_status(db, manager, claim, "Revaluation", body.reason)
