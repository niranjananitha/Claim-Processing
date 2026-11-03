"""User profile and manager staff-management routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.database.connection import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.user import StaffCreate, UserOut, UserUpdate, build_user_out

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return build_user_out(user)


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if payload.name is not None:
        user.name = payload.name
    if payload.title is not None:
        user.title = payload.title
    db.commit()
    db.refresh(user)
    return build_user_out(user)


@router.get("", response_model=list[UserOut])
def list_users(role: str | None = Query(default=None),
               _: User = Depends(require_role("manager")),
               db: Session = Depends(get_db)):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    return [build_user_out(u) for u in db.scalars(stmt).all()]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, current: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    if current.role != "manager" and current.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return build_user_out(target)


@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreate, _: User = Depends(require_role("manager")),
                 db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    staff = User(
        name=payload.name, email=payload.email.lower(), role=payload.role,
        title="Field Adjuster" if payload.role == "agent" else "Claims Manager",
        password_hash=security.hash_password(payload.password),
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return build_user_out(staff)
