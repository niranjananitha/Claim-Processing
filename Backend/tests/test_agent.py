from sqlalchemy import func, select

from app.models.claim_status_history import ClaimStatusHistory
from tests.conftest import auth
from tests.test_claims import create_claim


def _to_under_review(client, agent_token, claim_id):
    return client.put(f"/api/v1/claims/{claim_id}",
                      json={"to_status": "Under Review", "reason": "picked up"},
                      headers=auth(agent_token))


def test_agent_verify_sets_status_and_history(client, make_user, db_session):
    agent, atoken = make_user("agent")
    _, ctoken = make_user("client")
    claim_id = create_claim(client, ctoken).json()["id"]
    _to_under_review(client, atoken, claim_id)

    resp = client.post(f"/api/v1/agent/claims/{claim_id}/verify",
                       json={"notes": "Damage validated", "damage_approved": 4850},
                       headers=auth(atoken))
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "Agent-Verified"
    n = db_session.scalar(
        select(func.count()).select_from(ClaimStatusHistory)
        .where(ClaimStatusHistory.claim_id == claim_id,
               ClaimStatusHistory.to_status == "Agent-Verified")
    )
    assert n == 1


def test_agent_cannot_verify_unassigned_claim(client, make_user):
    make_user("agent")  # first agent → claims assigned here
    _, other_atoken = make_user("agent")  # a different agent
    _, ctoken = make_user("client")
    claim_id = create_claim(client, ctoken).json()["id"]
    resp = client.post(f"/api/v1/agent/claims/{claim_id}/verify",
                       json={"notes": "x"}, headers=auth(other_atoken))
    assert resp.status_code == 403


def test_request_information_requires_reason(client, make_user):
    agent, atoken = make_user("agent")
    _, ctoken = make_user("client")
    claim_id = create_claim(client, ctoken).json()["id"]
    _to_under_review(client, atoken, claim_id)
    resp = client.post(f"/api/v1/agent/claims/{claim_id}/request-information",
                       json={"reason": ""}, headers=auth(atoken))
    assert resp.status_code == 422


def test_agent_dashboard_counts_only_assigned(client, make_user):
    agent, atoken = make_user("agent")
    _, ctoken = make_user("client")
    create_claim(client, ctoken)
    create_claim(client, ctoken)
    resp = client.get("/api/v1/agent/dashboard", headers=auth(atoken))
    assert resp.status_code == 200
    assert resp.json()["assigned_total"] == 2
