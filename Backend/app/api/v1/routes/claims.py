"""Claim CRUD and status-transition routes."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.claim import ClaimCreate, ClaimOut, StatusChange, StatusHistoryOut
from app.schemas.document import DocumentOut
from app.services import claim_service

router = APIRouter(prefix="/claims", tags=["claims"])


@router.post("", response_model=ClaimOut, status_code=status.HTTP_201_CREATED)
def create_claim(payload: ClaimCreate, user: User = Depends(require_role("client")),
                 db: Session = Depends(get_db)):
    return claim_service.create_claim(db, user, payload)


@router.get("", response_model=list[ClaimOut])
def list_claims(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return claim_service.list_claims(db, user)


@router.get("/{claim_id}", response_model=ClaimOut)
def get_claim(claim_id: int, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    return claim_service.get_claim(db, user, claim_id)


@router.put("/{claim_id}", response_model=ClaimOut)
def update_claim_status(claim_id: int, payload: StatusChange,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    claim = claim_service.get_claim(db, user, claim_id)
    return claim_service.change_status(db, user, claim, payload.to_status, payload.reason)


@router.get("/{claim_id}/history", response_model=list[StatusHistoryOut])
def get_history(claim_id: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    return claim_service.claim_history(db, user, claim_id)


@router.get("/{claim_id}/documents", response_model=list[DocumentOut])
def list_documents(claim_id: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Evidence files attached to a claim (same access rules as the claim itself)."""
    claim = claim_service.get_claim(db, user, claim_id)
    return sorted(claim.documents, key=lambda d: d.id)
