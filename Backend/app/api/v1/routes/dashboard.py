"""Role-aware dashboard summary shared by all portals."""
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import claim_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    claims = claim_service.list_claims(db, user)  # already role-scoped
    return {
        "role": user.role,
        "total": len(claims),
        "by_status": dict(Counter(c.status for c in claims)),
    }
