"""Authentication business logic: registration, login, refresh rotation, logout."""
import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.core.time import utcnow
from app.models.policy import Policy
from app.models.refresh_token import RefreshToken
from app.models.user import User


class AuthError(Exception):
    """Raised for authentication failures (mapped to 401 at the route layer)."""


def register_client(db: Session, name: str, email: str, password: str,
                    policy_number: str | None = None) -> User:
    existing = db.scalar(select(User).where(User.email == email.lower()))
    if existing:
        raise AuthError("Email already registered")
    user = User(
        name=name,
        email=email.lower(),
        password_hash=security.hash_password(password),
        role="client",  # forced; never taken from the request
        title="Insured Policyholder",
    )
    db.add(user)
    db.flush()
    # Give the client a policy so the portal + ML ratio have something to work with.
    if policy_number:
        db.add(Policy(policy_number=policy_number, holder_id=user.id, state=""))
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user or not user.is_active:
        return None
    if not security.verify_password(password, user.password_hash):
        return None
    return user


def issue_tokens(db: Session, user: User) -> tuple[str, str]:
    """Return (access_token, raw_refresh_token). Persists the refresh hash."""
    access = security.create_access_token(sub=str(user.id), role=user.role)
    raw, token_hash = security.create_refresh_token()
    settings = get_settings()
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=utcnow() + dt.timedelta(days=settings.refresh_token_ttl_days),
    ))
    db.commit()
    return access, raw


def _active_refresh(db: Session, raw: str) -> RefreshToken | None:
    token_hash = security.hash_refresh(raw)
    rt = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if not rt or rt.revoked or rt.expires_at < utcnow():
        return None
    return rt


def rotate_refresh(db: Session, raw: str) -> tuple[str, str, User]:
    rt = _active_refresh(db, raw)
    if not rt:
        raise AuthError("Invalid refresh token")
    rt.revoked = True  # rotate: old token can never be used again
    user = db.get(User, rt.user_id)
    db.flush()
    access, new_raw = issue_tokens(db, user)
    return access, new_raw, user


def revoke_refresh(db: Session, raw: str | None) -> None:
    if not raw:
        return
    rt = _active_refresh(db, raw)
    if rt:
        rt.revoked = True
        db.commit()
