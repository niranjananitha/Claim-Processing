from sqlalchemy import func, select

from app.models.claim_status_history import ClaimStatusHistory
from tests.conftest import auth
from tests.test_claims import CLAIM_BODY, VEHICLE_BODY


def _login(client, email, password="Passw0rd!"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_full_claim_lifecycle(client, make_user, db_session):
    # Staff exist (agent gets auto-assigned); client registers through the public route.
    agent, _ = make_user("agent")
    manager, _ = make_user("manager")

    reg = client.post("/api/v1/auth/register",
                      json={"name": "Lifecycle Client", "email": "life@ex.com",
                            "password": "Passw0rd!", "vehicle": VEHICLE_BODY})
    assert reg.status_code == 201
    ctoken = reg.json()["access_token"]
    vehicle_id = client.get("/api/v1/vehicles", headers=auth(ctoken)).json()[0]["id"]

    claim_id = client.post("/api/v1/claims", json={**CLAIM_BODY, "vehicle_id": vehicle_id},
                           headers=auth(ctoken)).json()["id"]

    atoken = _login(client, agent.email).json()["access_token"]
    client.put(f"/api/v1/claims/{claim_id}",
               json={"to_status": "Under Review", "reason": "review"}, headers=auth(atoken))
    client.post(f"/api/v1/agent/claims/{claim_id}/verify",
                json={"notes": "verified"}, headers=auth(atoken))

    mtoken = _login(client, manager.email).json()["access_token"]
    approve = client.post(f"/api/v1/manager/claims/{claim_id}/approve",
                          json={"reason": "approved", "approved_amount": 4850},
                          headers=auth(mtoken))
    assert approve.status_code == 200
    assert approve.json()["status"] == "Approved"

    # Three real transitions were recorded (plus the initial Submitted row).
    transitions = db_session.scalar(
        select(func.count()).select_from(ClaimStatusHistory)
        .where(ClaimStatusHistory.claim_id == claim_id,
               ClaimStatusHistory.from_status.isnot(None))
    )
    assert transitions == 3


def test_no_notification_routes():
    from app.main import app

    paths = [getattr(r, "path", "") for r in app.routes]
    assert not any("notification" in p.lower() for p in paths)
