
# pyrefly: ignore [missing-import]
"""Idempotent seed: ensures the permanent manager account exists. No sample data.

Clients register themselves; agents are created by the manager from the
Agent Management page.

Run with:  python -m app.seed
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.database.connection import SessionLocal
from app.models.user import User


def _ensure_manager(db: Session) -> User:
    """Ensure the permanent manager account (identity from .env) exists and is active."""
    s = get_settings()
    email = s.manager_email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(name=s.manager_name, email=email, title=s.manager_title, role="manager",
                    password_hash=security.hash_password(s.seed_manager_password))
        db.add(user)
        db.flush()
    elif not user.is_active:
        user.is_active = True
    return user


def seed(db: Session) -> None:
    _ensure_manager(db)
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        seed(db)
        print(f"Seed complete. Manager login: {get_settings().manager_email} "
              "(password = SEED_MANAGER_PASSWORD in .env)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
