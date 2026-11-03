import json
from pathlib import Path

from sqlalchemy import func, select

from app.core import security
from app.core.permissions import STATUSES
from app.models.claim import Claim
from app.models.user import User
from app.seed import seed

SEED_JSON = Path(__file__).resolve().parents[1] / "app" / "data" / "seed_claims.json"


def test_seed_is_idempotent(db_session):
    seed(db_session)
    seed(db_session)  # second run must not duplicate

    agents = db_session.scalar(select(func.count()).select_from(User).where(User.role == "agent"))
    managers = db_session.scalar(select(func.count()).select_from(User).where(User.role == "manager"))
    assert agents == 1
    assert managers == 1

    expected_claims = len(json.loads(SEED_JSON.read_text(encoding="utf-8")))
    claim_count = db_session.scalar(select(func.count()).select_from(Claim))
    assert claim_count == expected_claims

    # Every seeded claim uses a canonical status.
    statuses = db_session.scalars(select(Claim.status).distinct()).all()
    assert set(statuses).issubset(set(STATUSES))

    # Staff passwords verify against the configured seed passwords.
    agent = db_session.scalar(select(User).where(User.role == "agent"))
    from app.core.config import get_settings
    assert security.verify_password(get_settings().seed_agent_password, agent.password_hash)
