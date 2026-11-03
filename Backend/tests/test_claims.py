from sqlalchemy import func, select

from app.models.audit_log import AuditLog
from app.models.claim import Claim
from app.models.claim_status_history import ClaimStatusHistory
from tests.conftest import auth

CLAIM_BODY = {
    "incident_date": "2024-10-28",
    "incident_type": "Multi-Vehicle Collision",
    "collision_type": "Rear-end Impact",
    "severity": "Minor Damage",
    "vehicle": "2022 Honda Accord",
    "auto_make": "Honda",
    "auto_model": "Accord",
    "auto_year": "2022",
    "damage_estimate": 4850,
    "vehicle_claim": 4850,
    "injury_claim": 0,
    "property_claim": 500,
    "police_report": True,
    "authorities_contacted": "Police",
    "witnesses": 1,
    "state": "TN",
    "city": "Chennai",
}


VEHICLE_BODY = {"category": "four_wheeler", "make": "Maruti Suzuki", "model": "Swift",
                "year": 2022, "registration_number": "TN 01 AB 1234"}


def add_vehicle(client, token, **overrides):
    resp = client.post("/api/v1/vehicles", json={**VEHICLE_BODY, **overrides}, headers=auth(token))
    if resp.status_code == 409:  # already registered for this client
        return next(v for v in client.get("/api/v1/vehicles", headers=auth(token)).json()
                    if v["registration_number"] == "TN01AB1234")
    assert resp.status_code == 201, resp.text
    return resp.json()


def create_claim(client, token, **overrides):
    body = {**CLAIM_BODY, **overrides}
    if "vehicle_id" not in body:
        body["vehicle_id"] = add_vehicle(client, token)["id"]
    return client.post("/api/v1/claims", json=body, headers=auth(token))


def test_client_creates_claim_status_submitted(client, make_user):
    _, token = make_user("client")
    resp = create_claim(client, token)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "Submitted"
    assert data["claim_ref"].startswith("CLM-")


def test_client_lists_only_own_claims(client, make_user):
    _, t1 = make_user("client")
    _, t2 = make_user("client")
    create_claim(client, t1)
    create_claim(client, t2)
    resp = client.get("/api/v1/claims", headers=auth(t1))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_agent_lists_only_assigned(client, make_user):
    # An agent must exist so new claims get assigned to one.
    agent, atoken = make_user("agent")
    _, ctoken = make_user("client")
    create_claim(client, ctoken)
    resp = client.get("/api/v1/claims", headers=auth(atoken))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_manager_lists_all(client, make_user):
    make_user("agent")
    _, c1 = make_user("client")
    _, c2 = make_user("client")
    _, mtoken = make_user("manager")
    create_claim(client, c1)
    create_claim(client, c2)
    resp = client.get("/api/v1/claims", headers=auth(mtoken))
    assert len(resp.json()) == 2


def test_get_claim_cross_user_403(client, make_user):
    _, t1 = make_user("client")
    _, t2 = make_user("client")
    ref = create_claim(client, t1).json()["id"]
    resp = client.get(f"/api/v1/claims/{ref}", headers=auth(t2))
    assert resp.status_code in (403, 404)


def test_illegal_transition_client_to_approved_409(client, make_user, db_session):
    _, token = make_user("client")
    claim_id = create_claim(client, token).json()["id"]
    resp = client.put(f"/api/v1/claims/{claim_id}",
                       json={"to_status": "Approved", "reason": "x"}, headers=auth(token))
    assert resp.status_code == 409
    # status unchanged
    assert db_session.get(Claim, claim_id).status == "Submitted"


def test_legal_transition_records_history_and_audit(client, make_user, db_session):
    agent, atoken = make_user("agent")
    _, ctoken = make_user("client")
    claim_id = create_claim(client, ctoken).json()["id"]

    resp = client.put(f"/api/v1/claims/{claim_id}",
                      json={"to_status": "Under Review", "reason": "Picking up review"},
                      headers=auth(atoken))
    assert resp.status_code == 200
    assert resp.json()["status"] == "Under Review"

    hist = db_session.scalar(
        select(func.count()).select_from(ClaimStatusHistory)
        .where(ClaimStatusHistory.claim_id == claim_id,
               ClaimStatusHistory.to_status == "Under Review")
    )
    assert hist == 1
    audits = db_session.scalar(
        select(func.count()).select_from(AuditLog).where(AuditLog.entity_id == str(claim_id))
    )
    assert audits >= 1


def test_client_cannot_attach_someone_elses_policy(client, make_user, db_session):
    from app.models.policy import Policy
    other, _ = make_user("client")
    db_session.add(Policy(policy_number="OTHER-001", holder_id=other.id))
    db_session.flush()
    _, token = make_user("client")
    data = create_claim(client, token, policy_number="OTHER-001").json()
    assert data["policy_id"] is None
