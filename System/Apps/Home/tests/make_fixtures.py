"""Regenerate tests/fixtures/webauthn.json — a throwaway authenticator's registration and assertion.

Dev-only; the tests never run it. It needs the `openssl` command (present on every Mac) to make a
fresh P-256 key and sign with it, because Home itself can only verify. The private key lives in a
temporary directory and is deleted; only public values and signatures reach the fixture.

Run: python3 tests/make_fixtures.py
"""

from __future__ import annotations

import base64
import hashlib
import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures"
RP_ID = "localhost"
ORIGIN = "http://localhost:8780"
REG_CHALLENGE = "cmVnaXN0ZXItY2hhbGxlbmdlLWZpeHR1cmUtMDAwMQ"
LOGIN_CHALLENGE = "bG9naW4tY2hhbGxlbmdlLWZpeHR1cmUtMDAwMDAwMQ"
CREDENTIAL_ID = bytes(range(1, 33))


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def cbor(value: object) -> bytes:
    def head(major: int, length: int) -> bytes:
        if length < 24:
            return bytes([major << 5 | length])
        for info, size in ((24, 1), (25, 2), (26, 4), (27, 8)):
            if length < 1 << (8 * size):
                return bytes([major << 5 | info]) + length.to_bytes(size, "big")
        raise ValueError("too long")

    if isinstance(value, bool):
        return bytes([0xF5 if value else 0xF4])
    if isinstance(value, int):
        return head(0, value) if value >= 0 else head(1, -1 - value)
    if isinstance(value, bytes):
        return head(2, len(value)) + value
    if isinstance(value, str):
        encoded = value.encode()
        return head(3, len(encoded)) + encoded
    if isinstance(value, dict):
        return head(5, len(value)) + b"".join(cbor(k) + cbor(v) for k, v in value.items())
    raise TypeError(type(value))


def main() -> int:
    with tempfile.TemporaryDirectory() as scratch:
        key = Path(scratch) / "key.pem"
        subprocess.run(["openssl", "ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", str(key)], check=True)
        der = subprocess.run(["openssl", "ec", "-in", str(key), "-pubout", "-outform", "DER"],
                             check=True, capture_output=True).stdout
        x, y = der[-64:-32], der[-32:]

        def sign(message: bytes) -> bytes:
            return subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(key)],
                                  input=message, check=True, capture_output=True).stdout

        rp_hash = hashlib.sha256(RP_ID.encode()).digest()
        cose = cbor({1: 2, 3: -7, -1: 1, -2: x, -3: y})
        reg_auth = rp_hash + bytes([0x45]) + struct.pack(">I", 0) + bytes(16) + struct.pack(">H", len(CREDENTIAL_ID)) + CREDENTIAL_ID + cose
        attestation = cbor({"fmt": "none", "attStmt": {}, "authData": reg_auth})
        reg_client = json.dumps({"type": "webauthn.create", "challenge": REG_CHALLENGE, "origin": ORIGIN}).encode()

        login_auth = rp_hash + bytes([0x05]) + struct.pack(">I", 0)
        login_client = json.dumps({"type": "webauthn.get", "challenge": LOGIN_CHALLENGE, "origin": ORIGIN}).encode()
        signature = sign(login_auth + hashlib.sha256(login_client).digest())

        message = b"Home p256 fixture message"
        loose = sign(message)

    fixture = {
        "rp_id": RP_ID,
        "origin": ORIGIN,
        "credential_id": b64url(CREDENTIAL_ID),
        "public_x": x.hex(),
        "public_y": y.hex(),
        "registration": {
            "challenge": REG_CHALLENGE,
            "clientDataJSON": b64url(reg_client),
            "attestationObject": b64url(attestation),
        },
        "assertion": {
            "challenge": LOGIN_CHALLENGE,
            "clientDataJSON": b64url(login_client),
            "authenticatorData": b64url(login_auth),
            "signature": b64url(signature),
        },
        "p256": {"message": message.decode(), "signature": b64url(loose)},
    }
    FIXTURES.mkdir(exist_ok=True)
    (FIXTURES / "webauthn.json").write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {FIXTURES / 'webauthn.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
