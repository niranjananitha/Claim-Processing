from tests.conftest import auth
from tests.test_claims import create_claim


def _advance_to_agent_verified(client, atoken, claim_id):
    client.put(f"/api/v1/claims/{claim_id}", json={"to_status": "Under Review", "reason": "r"},
               headers=auth(atoken))
    client.post(f"/api/v1/agent/claims/{claim_id}/verify", json={"notes": "ok"},
                headers=auth(atoken))


def test_manager_approve_requires_agent_verified(client, make_user):
    make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    claim_id = create_claim(client, ctoken).json()["id"]  # status Submitted
    resp = client.post(f"/api/v1/manager/claims/{claim_id}/approve",
                       json={"reason": "ok", "approved_amount": 1000}, headers=auth(mtoken))
    assert resp.status_code == 409


def test_manager_approve_ok_after_agent_verified(client, make_user):
    _, atoken = make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    claim_id = create_claim(client, ctoken).json()["id"]
    _advance_to_agent_verified(client, atoken, claim_id)
    resp = client.post(f"/api/v1/manager/claims/{claim_id}/approve",
                       json={"reason": "approved", "approved_amount": 4850}, headers=auth(mtoken))
    assert resp.status_code == 200
    assert resp.json()["status"] == "Approved"


def test_manager_reject_requires_reason(client, make_user):
    _, atoken = make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    claim_id = create_claim(client, ctoken).json()["id"]
    _advance_to_agent_verified(client, atoken, claim_id)
    resp = client.post(f"/api/v1/manager/claims/{claim_id}/reject",
                       json={"reason": ""}, headers=auth(mtoken))
    assert resp.status_code == 422


def test_pending_claims_only_agent_verified(client, make_user):
    _, atoken = make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    verified_id = create_claim(client, ctoken).json()["id"]
    _advance_to_agent_verified(client, atoken, verified_id)
    create_claim(client, ctoken)  # stays Submitted

    resp = client.get("/api/v1/manager/pending-claims", headers=auth(mtoken))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == "Agent-Verified"


def test_dashboard_summary_role_aware(client, make_user):
    make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    create_claim(client, ctoken)

    client_sum = client.get("/api/v1/dashboard/summary", headers=auth(ctoken)).json()
    manager_sum = client.get("/api/v1/dashboard/summary", headers=auth(mtoken)).json()
    assert client_sum["role"] == "client"
    assert manager_sum["role"] == "manager"
    assert client_sum["total"] == 1
    assert manager_sum["total"] == 1
