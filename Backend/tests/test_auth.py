import uuid


def _email():
    return f"user_{uuid.uuid4().hex[:10]}@example.com"


def register(client, role_in_body=None):
    email = _email()
    body = {"name": "Reg User", "email": email, "password": "Passw0rd!"}
    if role_in_body:
        body["role"] = role_in_body
    resp = client.post("/api/v1/auth/register", json=body)
    return email, resp


def test_register_creates_client(client):
    email, resp = register(client)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["access_token"]
    assert data["user"]["email"] == email
    assert data["user"]["role"] == "client"


def test_register_ignores_role_in_body(client):
    _, resp = register(client, role_in_body="manager")
    assert resp.status_code == 201
    assert resp.json()["user"]["role"] == "client"


def test_login_returns_access_token_and_sets_refresh_cookie(client):
    email, _ = register(client)
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Passw0rd!"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["access_token"]
    set_cookie = resp.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie


def test_login_wrong_password_401(client):
    email, _ = register(client)
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "nope"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    email, reg = register(client)
    token = reg.json()["access_token"]
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == email


def test_refresh_rotates_token(client):
    email, _ = register(client)
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Passw0rd!"})
    old_refresh = login.cookies.get("refresh_token")
    assert old_refresh

    first = client.post("/api/v1/auth/refresh")
    assert first.status_code == 200
    assert first.json()["access_token"]

    # Re-using the OLD refresh value must fail (it was rotated/revoked).
    client.cookies.set("refresh_token", old_refresh)
    reused = client.post("/api/v1/auth/refresh")
    assert reused.status_code == 401


def test_logout_revokes_refresh(client):
    email, _ = register(client)
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Passw0rd!"})
    refresh_val = login.cookies.get("refresh_token")
    assert client.post("/api/v1/auth/logout").status_code == 200
    client.cookies.set("refresh_token", refresh_val)
    reused = client.post("/api/v1/auth/refresh")
    assert reused.status_code == 401


def test_register_rejects_short_password(client):
    resp = client.post("/api/v1/auth/register",
                       json={"name": "Shorty", "email": _email(), "password": "abc"})
    assert resp.status_code == 422


def test_login_rate_limited(client):
    email, _ = register(client)
    codes = [
        client.post("/api/v1/auth/login", json={"email": email, "password": "x"}).status_code
        for _ in range(8)
    ]
    assert 429 in codes
