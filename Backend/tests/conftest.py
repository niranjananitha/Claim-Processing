"""Shared pytest fixtures.

Tests run against a dedicated, initially-empty ``claims_database_test`` schema so
they are fully isolated from the real database's seed data. Each test runs inside
a transaction that is rolled back afterwards (savepoint mode tolerates commits in
the code under test).
"""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

TEST_DB = "claims_database_test"


@pytest.fixture(scope="session")
def test_engine():
    import pymysql

    import app.models  # noqa: F401  (register tables on Base.metadata)
    from app.core.config import get_settings
    from app.database.base import Base

    s = get_settings()
    conn = pymysql.connect(host=s.db_host, port=s.db_port, user=s.db_user, password=s.db_password)
    conn.cursor().execute(
        f"CREATE DATABASE IF NOT EXISTS {TEST_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    conn.commit()
    conn.close()

    url = s.database_url.replace(f"/{s.db_name}?", f"/{TEST_DB}?")
    engine = create_engine(url, pool_pre_ping=True, future=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def db_session(test_engine):
    connection = test_engine.connect()
    trans = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    from app.database.connection import get_db
    from app.main import app

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def make_user(db_session):
    """Factory: create a user of any role and return (user, bearer_token)."""
    import uuid

    from app.core import security
    from app.models.user import User

    def _make(role="client", password="Passw0rd!", **kw):
        email = kw.get("email") or f"{role}_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            name=kw.get("name", f"Test {role}"),
            email=email,
            role=role,
            title=kw.get("title", role),
            password_hash=security.hash_password(password),
        )
        db_session.add(user)
        db_session.flush()
        token = security.create_access_token(sub=str(user.id), role=user.role)
        return user, token

    return _make


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    try:
        from app.main import app

        limiter = getattr(app.state, "limiter", None)
        if limiter is not None:
            limiter.reset()
    except Exception:
        pass
    yield
