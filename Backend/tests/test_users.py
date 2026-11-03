from tests.conftest import auth


def test_get_me(client, make_user):
    user, token = make_user("client")
    resp = client.get("/api/v1/users/me", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == user.email


def test_update_me_changes_name(client, make_user):
    _, token = make_user("client")
    resp = client.put("/api/v1/users/me", json={"name": "Renamed"}, headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"


def test_list_users_forbidden_for_client(client, make_user):
    _, token = make_user("client")
    assert client.get("/api/v1/users", headers=auth(token)).status_code == 403


def test_list_users_ok_for_manager(client, make_user):
    make_user("client")
    _, mtoken = make_user("manager")
    resp = client.get("/api/v1/users", headers=auth(mtoken))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_staff_create_requires_manager(client, make_user):
    _, ctoken = make_user("client")
    _, atoken = make_user("agent")
    body = {"name": "New Agent", "email": "newagent@aegis.com",
            "password": "Passw0rd!", "role": "agent"}
    assert client.post("/api/v1/users/staff", json=body, headers=auth(ctoken)).status_code == 403
    assert client.post("/api/v1/users/staff", json=body, headers=auth(atoken)).status_code == 403


def test_staff_create_by_manager_ok(client, make_user):
    _, mtoken = make_user("manager")
    body = {"name": "New Agent", "email": "newagent2@aegis.com",
            "password": "Passw0rd!", "role": "agent"}
    resp = client.post("/api/v1/users/staff", json=body, headers=auth(mtoken))
    assert resp.status_code == 201
    assert resp.json()["role"] == "agent"


def test_staff_create_rejects_client_role(client, make_user):
    _, mtoken = make_user("manager")
    body = {"name": "X", "email": "x@aegis.com", "password": "Passw0rd!", "role": "client"}
    assert client.post("/api/v1/users/staff", json=body, headers=auth(mtoken)).status_code == 422
