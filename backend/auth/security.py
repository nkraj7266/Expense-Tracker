import hashlib
import secrets
import datetime as dt
from typing import Literal, Optional

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHash
from fastapi import Response

from config import get_settings

settings = get_settings()
_hasher = PasswordHasher()

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def _require_secret() -> str:
    if not settings.jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured")
    return settings.jwt_secret_key


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHash):
        return False


def _encode_token(user_id: str, token_type: Literal["access", "refresh"], expires_delta: dt.timedelta) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": user_id,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if token_type == "refresh":
        payload["jti"] = secrets.token_urlsafe(32)
    return jwt.encode(payload, _require_secret(), algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str) -> str:
    return _encode_token(user_id, "access", dt.timedelta(minutes=settings.jwt_access_token_expires_minutes))


def create_refresh_token(user_id: str) -> str:
    return _encode_token(user_id, "refresh", dt.timedelta(days=settings.jwt_refresh_token_expires_days))


def decode_token(token: str, expected_type: Literal["access", "refresh"]) -> dict:
    payload = jwt.decode(token, _require_secret(), algorithms=[settings.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"expected a {expected_type} token")
    return payload


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _cookie_domain() -> Optional[str]:
    # "localhost" isn't a registrable domain: Domain=localhost is rejected or
    # mismatched by several cookie-jar implementations (Python's http.cookiejar
    # among them). Omitting Domain makes it a host-only cookie, which is exactly
    # what local dev wants anyway; only set it for a real deployed domain.
    if not settings.cookie_domain or settings.cookie_domain == "localhost":
        return None
    return settings.cookie_domain


def _cookie_samesite() -> Literal["lax", "none"]:
    # SameSite=None is required when frontend and backend are on different
    # sites (e.g. a Netlify frontend + a Render backend) so the browser will
    # attach the cookie to cross-site fetches at all. It requires Secure, so
    # only use it once we're actually on HTTPS (COOKIE_SECURE=true); local
    # dev (same site: localhost:5173 + localhost:8000) stays on Lax.
    return "none" if settings.cookie_secure else "lax"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    domain = _cookie_domain()
    samesite = _cookie_samesite()
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.jwt_access_token_expires_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=samesite,
        domain=domain,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.jwt_refresh_token_expires_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=samesite,
        domain=domain,
        path="/auth",
    )


def clear_auth_cookies(response: Response) -> None:
    domain = _cookie_domain()
    samesite = _cookie_samesite()
    response.delete_cookie(ACCESS_COOKIE_NAME, domain=domain, path="/", secure=settings.cookie_secure, samesite=samesite)
    response.delete_cookie(
        REFRESH_COOKIE_NAME, domain=domain, path="/auth", secure=settings.cookie_secure, samesite=samesite
    )
