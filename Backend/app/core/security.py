"""Password hashing (Argon2id), JWT access tokens, refresh-token + CSRF helpers."""
import datetime as dt
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from jose import jwt

from app.core.config import get_settings
from app.core.time import utcnow

_ph = PasswordHasher()  # argon2id defaults
_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def create_access_token(sub: str, role: str) -> str:
    settings = get_settings()
    now = utcnow()
    payload = {
        "sub": sub,
        "role": role,
        "iat": now,
        "exp": now + dt.timedelta(minutes=settings.access_token_ttl_min),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token. Raises jose.JWTError on invalid/expired."""
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])


def hash_refresh(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_refresh_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hash). Store only the hash."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_refresh(raw)


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)
