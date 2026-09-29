"""Passkey registration and sign-in checks (WebAuthn Level 2, ES256 only, attestation "none").

The browser does the talking to the authenticator; this module only builds the options it is
given and checks what comes back. Every check here is one the spec calls for — origin, challenge,
RP-id hash, user-present and user-verified flags, signature — and failing any one raises
WebAuthnError, which routes/auth.py turns into a refusal.
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import struct
import threading
import time
from dataclasses import asdict, dataclass
from typing import Any

from core import cbor, p256

CHALLENGE_LIFE_S = 120
ES256 = -7
FLAG_UP = 0x01
FLAG_UV = 0x04
FLAG_AT = 0x40
USER_NAME = "luke"
USER_DISPLAY = "Luke"
RP_NAME = "Lukeatron Home"


class WebAuthnError(Exception):
    pass


def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def b64url_decode(text: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))
    except (ValueError, TypeError) as exc:
        raise WebAuthnError("bad base64url") from exc


@dataclass
class Credential:
    id: str  # base64url credential id
    x: str  # hex public-key coordinates
    y: str
    sign_count: int
    created: str
    label: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class AuthData:
    rp_id_hash: bytes
    flags: int
    sign_count: int
    credential_id: bytes | None
    public_key: tuple[int, int] | None


class ChallengeStore:
    """One-use challenges with a two-minute life, shared by the server's request threads."""

    def __init__(self) -> None:
        self._issued: dict[str, tuple[str, float]] = {}
        self._lock = threading.Lock()

    def issue(self, purpose: str) -> str:
        challenge = b64url_encode(secrets.token_bytes(32))
        now = time.monotonic()
        with self._lock:
            self._issued = {c: v for c, v in self._issued.items() if now - v[1] < CHALLENGE_LIFE_S}
            self._issued[challenge] = (purpose, now)
        return challenge

    def consume(self, challenge: str, purpose: str) -> bool:
        with self._lock:
            entry = self._issued.pop(challenge, None)
        return entry is not None and entry[0] == purpose and time.monotonic() - entry[1] < CHALLENGE_LIFE_S


def registration_options(rp_id: str, challenge: str, existing: list[Credential]) -> dict[str, Any]:
    return {
        "challenge": challenge,
        "rp": {"id": rp_id, "name": RP_NAME},
        "user": {"id": b64url_encode(USER_NAME.encode()), "name": USER_NAME, "displayName": USER_DISPLAY},
        "pubKeyCredParams": [{"type": "public-key", "alg": ES256}],
        "authenticatorSelection": {"residentKey": "required", "userVerification": "required"},
        "attestation": "none",
        "excludeCredentials": [{"type": "public-key", "id": cred.id} for cred in existing],
        "timeout": CHALLENGE_LIFE_S * 1000,
    }


def login_options(rp_id: str, challenge: str) -> dict[str, Any]:
    return {"challenge": challenge, "rpId": rp_id, "userVerification": "required", "timeout": CHALLENGE_LIFE_S * 1000}


def _check_client_data(raw: bytes, *, expected_type: str, challenge: str, origins: tuple[str, ...]) -> None:
    try:
        client = json.loads(raw)
    except ValueError as exc:
        raise WebAuthnError("clientDataJSON is not JSON") from exc
    if client.get("type") != expected_type:
        raise WebAuthnError("wrong ceremony type")
    if client.get("challenge") != challenge:
        raise WebAuthnError("challenge mismatch")
    if client.get("origin") not in origins:
        raise WebAuthnError("origin not allowed")


def _cose_to_point(key: Any) -> tuple[int, int]:
    # COSE_Key labels: 1 kty (2 = EC2), 3 alg, -1 crv (1 = P-256), -2 x, -3 y.
    if not isinstance(key, dict) or key.get(1) != 2 or key.get(3) != ES256 or key.get(-1) != 1:
        raise WebAuthnError("public key is not ES256 / P-256")
    x, y = key.get(-2), key.get(-3)
    if not (isinstance(x, bytes) and isinstance(y, bytes) and len(x) == 32 and len(y) == 32):
        raise WebAuthnError("malformed public key coordinates")
    point = int.from_bytes(x, "big"), int.from_bytes(y, "big")
    if not p256.on_curve(*point):
        raise WebAuthnError("public key is not on the curve")
    return point


def parse_auth_data(data: bytes) -> AuthData:
    if len(data) < 37:
        raise WebAuthnError("authenticator data too short")
    rp_id_hash, flags = data[:32], data[32]
    (sign_count,) = struct.unpack(">I", data[33:37])
    credential_id = public_key = None
    if flags & FLAG_AT:
        if len(data) < 55:
            raise WebAuthnError("attested credential data truncated")
        (id_len,) = struct.unpack(">H", data[53:55])
        credential_id = data[55:55 + id_len]
        if len(credential_id) != id_len:
            raise WebAuthnError("credential id truncated")
        try:
            key, _ = cbor.decode_prefix(data, 55 + id_len)
        except cbor.CBORError as exc:
            raise WebAuthnError(f"bad public key: {exc}") from exc
        public_key = _cose_to_point(key)
    return AuthData(rp_id_hash, flags, sign_count, credential_id, public_key)


def _check_auth_data(auth: AuthData, rp_id: str) -> None:
    if auth.rp_id_hash != hashlib.sha256(rp_id.encode()).digest():
        raise WebAuthnError("RP id hash mismatch")
    if not auth.flags & FLAG_UP:
        raise WebAuthnError("user not present")
    if not auth.flags & FLAG_UV:
        raise WebAuthnError("user not verified")


def verify_registration(
    client_data_json: bytes,
    attestation_object: bytes,
    *,
    challenge: str,
    rp_id: str,
    origins: tuple[str, ...],
    created: str,
    label: str,
) -> Credential:
    _check_client_data(client_data_json, expected_type="webauthn.create", challenge=challenge, origins=origins)
    try:
        attestation = cbor.decode(attestation_object)
    except cbor.CBORError as exc:
        raise WebAuthnError(f"bad attestation object: {exc}") from exc
    if not isinstance(attestation, dict) or not isinstance(attestation.get("authData"), bytes):
        raise WebAuthnError("attestation object has no authData")
    auth = parse_auth_data(attestation["authData"])
    _check_auth_data(auth, rp_id)
    if auth.credential_id is None or auth.public_key is None:
        raise WebAuthnError("no credential in registration")
    x, y = auth.public_key
    return Credential(
        id=b64url_encode(auth.credential_id),
        x=f"{x:064x}",
        y=f"{y:064x}",
        sign_count=auth.sign_count,
        created=created,
        label=label,
    )


def verify_assertion(
    credential: Credential,
    client_data_json: bytes,
    authenticator_data: bytes,
    signature: bytes,
    *,
    challenge: str,
    rp_id: str,
    origins: tuple[str, ...],
) -> int:
    """Returns the new sign count for the caller to store."""
    _check_client_data(client_data_json, expected_type="webauthn.get", challenge=challenge, origins=origins)
    auth = parse_auth_data(authenticator_data)
    _check_auth_data(auth, rp_id)
    try:
        r, s = p256.parse_der_signature(signature)
    except (ValueError, IndexError) as exc:
        raise WebAuthnError("malformed signature") from exc
    signed = authenticator_data + hashlib.sha256(client_data_json).digest()
    if not p256.verify(int(credential.x, 16), int(credential.y, 16), signed, r, s):
        raise WebAuthnError("signature does not verify")
    # iCloud Keychain passkeys always report 0; any authenticator that counts must count upward.
    if auth.sign_count and auth.sign_count <= credential.sign_count:
        raise WebAuthnError("sign count did not increase — possible cloned authenticator")
    return auth.sign_count
