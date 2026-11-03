import time

import pytest

from app.core import security
from app.core.permissions import role_can_transition


def test_argon2id_roundtrip():
    h = security.hash_password("s3cret!")
    assert h.startswith("$argon2id$")
    assert security.verify_password("s3cret!", h) is True
    assert security.verify_password("wrong", h) is False


def test_access_token_roundtrip_and_tamper():
    token = security.create_access_token(sub="42", role="agent")
    claims = security.decode_access_token(token)
    assert claims["sub"] == "42"
    assert claims["role"] == "agent"
    with pytest.raises(Exception):
        security.decode_access_token(token + "tampered")


def test_refresh_token_is_hashed():
    raw1, hash1 = security.create_refresh_token()
    assert raw1 != hash1
    assert security.hash_refresh(raw1) == hash1


def test_transition_map_rejects_client_to_approved():
    assert role_can_transition("client", "Under Review", "Approved") is False
    assert role_can_transition("manager", "Agent-Verified", "Approved") is True
    assert role_can_transition("agent", "Under Review", "Agent-Verified") is True
    assert role_can_transition("agent", "Agent-Verified", "Approved") is False
