from app.services import file_service
from tests.conftest import auth
from tests.test_claims import create_claim

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64  # valid PNG magic for filetype sniffing


def _upload(client, token, claim_id, filename="photo.png", content=PNG,
            content_type="image/png", kind="image"):
    return client.post(
        "/api/v1/documents/upload",
        files={"file": (filename, content, content_type)},
        data={"claim_id": str(claim_id), "kind": kind},
        headers=auth(token),
    )


def _make_claim(client, make_user):
    make_user("agent")  # ensure assignment
    _, ctoken = make_user("client")
    claim_id = create_claim(client, ctoken).json()["id"]
    return claim_id, ctoken


def test_upload_valid_image_stored_with_random_name(client, make_user):
    claim_id, ctoken = _make_claim(client, make_user)
    resp = _upload(client, ctoken, claim_id)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["original_name"] == "photo.png"
    assert data["stored_filename"] != "photo.png"
    assert data["stored_filename"].endswith(".png")


def test_upload_rejects_executable_extension(client, make_user):
    claim_id, ctoken = _make_claim(client, make_user)
    resp = _upload(client, ctoken, claim_id, filename="evil.exe",
                   content=b"MZ\x00\x00", content_type="application/octet-stream")
    assert resp.status_code == 400


def test_upload_rejects_mime_mismatch(client, make_user):
    claim_id, ctoken = _make_claim(client, make_user)
    # .png extension but the bytes are not an image
    resp = _upload(client, ctoken, claim_id, filename="fake.png", content=b"not an image at all")
    assert resp.status_code == 400


def test_upload_rejects_path_traversal_name(client, make_user):
    claim_id, ctoken = _make_claim(client, make_user)
    resp = _upload(client, ctoken, claim_id, filename="../../etc/passwd.png")
    assert resp.status_code == 400


def test_upload_rejects_oversized(client, make_user, monkeypatch):
    monkeypatch.setattr(file_service, "MAX_UPLOAD_BYTES", 16)
    claim_id, ctoken = _make_claim(client, make_user)
    resp = _upload(client, ctoken, claim_id, content=PNG + b"x" * 100)
    assert resp.status_code in (400, 413)


def test_download_forbidden_for_unrelated_user(client, make_user):
    claim_id, ctoken = _make_claim(client, make_user)
    doc_id = _upload(client, ctoken, claim_id).json()["id"]
    _, other = make_user("client")
    resp = client.get(f"/api/v1/documents/{doc_id}", headers=auth(other))
    assert resp.status_code in (403, 404)


def test_download_ok_for_owner_and_assigned_agent(client, make_user):
    agent, atoken = make_user("agent")
    _, ctoken = make_user("client")
    claim_id = create_claim(client, ctoken).json()["id"]
    doc_id = _upload(client, ctoken, claim_id).json()["id"]

    assert client.get(f"/api/v1/documents/{doc_id}", headers=auth(ctoken)).status_code == 200
    assert client.get(f"/api/v1/documents/{doc_id}", headers=auth(atoken)).status_code == 200
