from app.models.policy import Policy
from tests.conftest import auth


def _add_policy(db, holder_id, number):
    p = Policy(policy_number=number, holder_id=holder_id, coverage="Comprehensive",
               deductible=500, annual_premium=1200, state="OH", status="active")
    db.add(p)
    db.flush()
    return p


def test_client_sees_only_own_policies(client, make_user, db_session):
    u1, t1 = make_user("client")
    u2, _ = make_user("client")
    _add_policy(db_session, u1.id, "PA-1001")
    _add_policy(db_session, u2.id, "PA-2002")

    resp = client.get("/api/v1/policies", headers=auth(t1))
    assert resp.status_code == 200
    numbers = [p["policy_number"] for p in resp.json()]
    assert numbers == ["PA-1001"]


def test_policy_detail_forbidden_cross_user(client, make_user, db_session):
    u1, t1 = make_user("client")
    u2, _ = make_user("client")
    _add_policy(db_session, u2.id, "PA-3003")

    resp = client.get("/api/v1/policies/PA-3003", headers=auth(t1))
    assert resp.status_code == 404
