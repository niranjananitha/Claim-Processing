"""Policy read endpoints with ownership scoping."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import get_current_user
from app.models.policy import Policy
from app.models.user import User
from app.schemas.policy import PolicyOut

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("", response_model=list[PolicyOut])
def list_policies(customer_id: int | None = Query(default=None),
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    stmt = select(Policy)
    if user.role == "client":
        stmt = stmt.where(Policy.holder_id == user.id)
    elif customer_id is not None:
        stmt = stmt.where(Policy.holder_id == customer_id)
    return db.scalars(stmt).all()


@router.get("/{policy_number}", response_model=PolicyOut)
def get_policy(policy_number: str, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    policy = db.scalar(select(Policy).where(Policy.policy_number == policy_number))
    # 404 (not 403) when a client asks for a policy that isn't theirs: don't leak existence.
    if not policy or (user.role == "client" and policy.holder_id != user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return policy
