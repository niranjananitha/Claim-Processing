"""Agent dashboard and review actions (assignment-enforced in the service layer)."""
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import require_role
from app.models.user import User
from app.schemas.claim import ClaimOut
from app.schemas.review import ReasonBody, VerifyBody
from app.services import claim_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/dashboard")
def dashboard(agent: User = Depends(require_role("agent")), db: Session = Depends(get_db)):
    claims = claim_service.list_claims(db, agent)
    by_status = Counter(c.status for c in claims)
    return {"assigned_total": len(claims), "by_status": dict(by_status)}


@router.get("/assigned-claims", response_model=list[ClaimOut])
def assigned_claims(agent: User = Depends(require_role("agent")), db: Session = Depends(get_db)):
    return claim_service.list_claims(db, agent)


@router.post("/claims/{claim_id}/verify", response_model=ClaimOut)
def verify(claim_id: int, body: VerifyBody, agent: User = Depends(require_role("agent")),
           db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, agent, claim_id)
    note = body.notes or "Damage verified by adjuster; forwarded for managerial review."
    if body.damage_approved is not None:
        note = f"{note} Approved estimate: ${body.damage_approved:,.0f}."
    return claim_service.change_status(db, agent, claim, "Agent-Verified", note)


@router.post("/claims/{claim_id}/request-information", response_model=ClaimOut)
def request_information(claim_id: int, body: ReasonBody,
                       agent: User = Depends(require_role("agent")),
                       db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, agent, claim_id)
    return claim_service.change_status(db, agent, claim, "Action Required", body.reason)
