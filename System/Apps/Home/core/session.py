"""The signed-in cookie: `<expiry>.<HMAC-SHA256(secret, expiry)>`, nothing stored server-side.

Changing the secret (deleting session-secret) signs every browser out at once.
"""

from __future__ import annotations

import hashlib
import hmac

COOKIE = "home_session"
LIFE_S = 30 * 24 * 3600


def _mac(secret: bytes, expiry: str) -> str:
    return hmac.new(secret, expiry.encode("ascii"), hashlib.sha256).hexdigest()


def make_value(secret: bytes, now: float) -> str:
    expiry = str(int(now) + LIFE_S)
    return f"{expiry}.{_mac(secret, expiry)}"


def is_valid(secret: bytes, value: str | None, now: float) -> bool:
    if not value or "." not in value:
        return False
    expiry, _, mac = value.partition(".")
    if not expiry.isdigit() or int(expiry) < now:
        return False
    return hmac.compare_digest(mac, _mac(secret, expiry))


def set_cookie_header(value: str) -> str:
    # Secure is added when remote HTTPS arrives; on http://localhost it would be dropped by Safari.
    return f"{COOKIE}={value}; HttpOnly; SameSite=Strict; Path=/; Max-Age={LIFE_S}"


def clear_cookie_header() -> str:
    return f"{COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"


def key_matches(expected: str, given: str | None) -> bool:
    return bool(given) and hmac.compare_digest(expected.encode(), given.encode())
