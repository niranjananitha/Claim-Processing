from tests.conftest import auth
from tests.test_claims import add_vehicle, create_claim

VEHICLE = {"category": "cargo_truck", "make": "Tata Motors", "model": "Ace Gold",
           "year": 2021, "registration_number": "mh-12-ab-4321"}


def test_catalog_is_public_and_has_three_categories(client):
    resp = client.get("/api/v1/vehicles/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert [c["key"] for c in data["categories"]] == ["two_wheeler", "four_wheeler", "cargo_truck"]
    assert "Swift" in data["brands"]["four_wheeler"]["Maruti Suzuki"]


def test_register_requires_vehicle(client):
    body = {"name": "No Car", "email": "nocar@example.com", "password": "Passw0rd!"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 422


def test_register_with_vehicle_stores_it(client):
    body = {"name": "Ravi Kumar", "email": "ravi@example.com", "password": "Passw0rd!",
            "vehicle": VEHICLE}
    token = client.post("/api/v1/auth/register", json=body).json()["access_token"]
    vehicles = client.get("/api/v1/vehicles", headers=auth(token)).json()
    assert len(vehicles) == 1
    v = vehicles[0]
    assert v["registration_number"] == "MH12AB4321"  # normalised
    assert v["is_custom"] is False


def test_other_vehicle_is_marked_custom(client, make_user):
    _, token = make_user("client")
    v = add_vehicle(client, token, make="Force Motors", model="Traveller 3350",
                    registration_number="DL 3C AB 1234")
    assert v["is_custom"] is True


def test_invalid_registration_and_category_rejected(client, make_user):
    _, token = make_user("client")
    bad_reg = {**VEHICLE, "registration_number": "HELLO"}
    bad_cat = {**VEHICLE, "category": "boat"}
    assert client.post("/api/v1/vehicles", json=bad_reg, headers=auth(token)).status_code == 422
    assert client.post("/api/v1/vehicles", json=bad_cat, headers=auth(token)).status_code == 422


def test_duplicate_registration_rejected(client, make_user):
    _, token = make_user("client")
    assert client.post("/api/v1/vehicles", json=VEHICLE, headers=auth(token)).status_code == 201
    assert client.post("/api/v1/vehicles", json=VEHICLE, headers=auth(token)).status_code == 409


def test_claim_takes_vehicle_details_from_owned_vehicle(client, make_user):
    make_user("agent")
    _, token = make_user("client")
    v = add_vehicle(client, token, category="two_wheeler", make="Bajaj", model="Pulsar 150",
                    year=2020, registration_number="TN 22 CD 5678")
    data = create_claim(client, token, vehicle_id=v["id"], incident_time="14:30:00").json()
    assert data["vehicle_category"] == "two_wheeler"
    assert data["auto_make"] == "Bajaj" and data["auto_model"] == "Pulsar 150"
    assert "TN22CD5678" in data["vehicle"]
    assert data["incident_time"] == "14:30:00"


def test_cannot_claim_on_someone_elses_vehicle(client, make_user):
    _, t1 = make_user("client")
    _, t2 = make_user("client")
    v = add_vehicle(client, t1)
    assert create_claim(client, t2, vehicle_id=v["id"]).status_code == 404


def test_future_incident_date_rejected(client, make_user):
    _, token = make_user("client")
    assert create_claim(client, token, incident_date="2999-01-01").status_code == 422


def test_remove_vehicle_hides_it_but_keeps_claim_history(client, make_user):
    make_user("agent")
    _, token = make_user("client")
    v = add_vehicle(client, token)
    claim = create_claim(client, token, vehicle_id=v["id"]).json()

    assert client.delete(f"/api/v1/vehicles/{v['id']}", headers=auth(token)).status_code == 204
    assert client.get("/api/v1/vehicles", headers=auth(token)).json() == []
    # The existing claim still shows its vehicle.
    got = client.get(f"/api/v1/claims/{claim['id']}", headers=auth(token)).json()
    assert got["vehicle_id"] == v["id"] and "TN01AB1234" in got["vehicle"]
    # A removed vehicle can't be used for a new claim...
    assert create_claim(client, token, vehicle_id=v["id"]).status_code == 404
    # ...but re-adding the same registration restores it.
    again = client.post("/api/v1/vehicles", json={**VEHICLE, "registration_number": "TN 01 AB 1234",
                                                  "make": "Hyundai", "model": "Creta",
                                                  "category": "four_wheeler"},
                        headers=auth(token))
    assert again.status_code == 201 and again.json()["id"] == v["id"]
    assert again.json()["model"] == "Creta"


def test_cannot_remove_someone_elses_vehicle(client, make_user):
    _, t1 = make_user("client")
    _, t2 = make_user("client")
    v = add_vehicle(client, t1)
    assert client.delete(f"/api/v1/vehicles/{v['id']}", headers=auth(t2)).status_code == 404
