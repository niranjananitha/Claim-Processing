from sqlalchemy import func, select

from app.core import security
from app.core.config import get_settings
from app.models.claim import Claim
from app.models.user import User
from app.seed import seed


def test_seed_only_ensures_the_manager(db_session):
    seed(db_session)
    seed(db_session)  # second run must not duplicate

    managers = db_session.scalars(select(User).where(User.role == "manager")).all()
    assert len(managers) == 1
    assert managers[0].email == get_settings().manager_email.lower()
    assert security.verify_password(get_settings().seed_manager_password,
                                    managers[0].password_hash)

    # No sample clients, agents or claims.
    others = db_session.scalar(select(func.count()).select_from(User).where(User.role != "manager"))
    assert others == 0
    assert db_session.scalar(select(func.count()).select_from(Claim)) == 0
