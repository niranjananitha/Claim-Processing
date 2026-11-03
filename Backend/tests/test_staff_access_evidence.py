"""Agent access management, claim assignment, and evidence listing."""
from tests.conftest import auth
from tests.test_claims import create_claim
from tests.test_documents import _upload


def test_manager_can_revoke_and_restore_agent_access(client, make_user):
    agent, atoken = make_user("agent")
    _, mtoken = make_user("manager")

    resp = client.patch(f"/api/v1/users/{agent.id}/access", json={"is_active": False},
                        headers=auth(mtoken))
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    # Revoked agent's token no longer works.
    assert client.get("/api/v1/users/me", headers=auth(atoken)).status_code == 401

    resp = client.patch(f"/api/v1/users/{agent.id}/access", json={"is_active": True},
                        headers=auth(mtoken))
    assert resp.json()["is_active"] is True
    assert client.get("/api/v1/users/me", headers=auth(atoken)).status_code == 200


def test_access_toggle_is_manager_only_and_agent_only(client, make_user):
    agent, atoken = make_user("agent")
    manager, mtoken = make_user("manager")
    assert client.patch(f"/api/v1/users/{agent.id}/access", json={"is_active": False},
                        headers=auth(atoken)).status_code == 403
    assert client.patch(f"/api/v1/users/{manager.id}/access", json={"is_active": False},
                        headers=auth(mtoken)).status_code == 400


def test_manager_assigns_claim_to_new_agent(client, make_user):
    make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    claim_id = create_claim(client, ctoken).json()["id"]

    body = {"name": "Fresh Agent", "email": "fresh.agent@aegis.com",
            "password": "Passw0rd!", "role": "agent"}
    new_agent = client.post("/api/v1/users/staff", json=body, headers=auth(mtoken)).json()

    resp = client.put(f"/api/v1/manager/claims/{claim_id}/assign",
                      json={"agent_id": new_agent["id"]}, headers=auth(mtoken))
    assert resp.status_code == 200
    assert resp.json()["assigned_agent_id"] == new_agent["id"]

    login = client.post("/api/v1/auth/login",
                        json={"email": body["email"], "password": body["password"]})
    ntoken = login.json()["access_token"]
    ids = [c["id"] for c in client.get("/api/v1/claims", headers=auth(ntoken)).json()]
    assert claim_id in ids


def test_new_claims_go_to_least_loaded_active_agent(client, make_user):
    a1, _ = make_user("agent")
    a2, _ = make_user("agent")
    _, ctoken = make_user("client")
    first = create_claim(client, ctoken).json()["assigned_agent_id"]
    second = create_claim(client, ctoken).json()["assigned_agent_id"]
    assert {first, second} == {a1.id, a2.id}


def test_agent_and_manager_can_list_claim_evidence(client, make_user):
    _, atoken = make_user("agent")
    _, ctoken = make_user("client")
    _, mtoken = make_user("manager")
    claim_id = create_claim(client, ctoken).json()["id"]
    assert _upload(client, ctoken, claim_id).status_code == 201

    for token in (atoken, mtoken, ctoken):
        resp = client.get(f"/api/v1/claims/{claim_id}/documents", headers=auth(token))
        assert resp.status_code == 200
        docs = resp.json()
        assert len(docs) == 1 and docs[0]["kind"] == "image"

    _, other = make_user("client")
    assert client.get(f"/api/v1/claims/{claim_id}/documents",
                      headers=auth(other)).status_code == 403
