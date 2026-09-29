"""ECDSA signature VERIFICATION on NIST P-256 (secp256r1) with SHA-256 — nothing else.

Passkeys sign with ES256; Python's standard library has no elliptic-curve code, and PY-1 rules out
a third-party package, so the curve arithmetic is here. Verification only: no key generation and
no signing, so there is no secret-dependent timing to protect. Curve constants from SEC 2 §2.4.2.
"""

from __future__ import annotations

import hashlib

P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
A = P - 3
B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
G = (
    0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
    0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5,
)

Point = tuple[int, int] | None  # None is the point at infinity


def on_curve(x: int, y: int) -> bool:
    return 0 <= x < P and 0 <= y < P and (y * y - (x * x * x + A * x + B)) % P == 0


def _add(p1: Point, p2: Point) -> Point:
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2:
        if (y1 + y2) % P == 0:
            return None
        slope = (3 * x1 * x1 + A) * pow(2 * y1, -1, P) % P
    else:
        slope = (y2 - y1) * pow(x2 - x1, -1, P) % P
    x3 = (slope * slope - x1 - x2) % P
    return x3, (slope * (x1 - x3) - y1) % P


def _multiply(k: int, point: Point) -> Point:
    result: Point = None
    addend = point
    while k:
        if k & 1:
            result = _add(result, addend)
        addend = _add(addend, addend)
        k >>= 1
    return result


def parse_der_signature(der: bytes) -> tuple[int, int]:
    """WebAuthn ES256 signatures are ASN.1 DER: SEQUENCE { INTEGER r, INTEGER s }."""
    def read_int(pos: int) -> tuple[int, int]:
        if der[pos] != 0x02:
            raise ValueError("expected INTEGER")
        length = der[pos + 1]
        start = pos + 2
        if length == 0 or length > 33 or start + length > len(der):
            raise ValueError("bad INTEGER length")
        return int.from_bytes(der[start:start + length], "big"), start + length

    if len(der) < 8 or der[0] != 0x30 or der[1] != len(der) - 2:
        raise ValueError("not a DER SEQUENCE of the stated length")
    r, pos = read_int(2)
    s, pos = read_int(pos)
    if pos != len(der):
        raise ValueError("trailing bytes after signature")
    return r, s


def verify(public_x: int, public_y: int, message: bytes, r: int, s: int) -> bool:
    if not on_curve(public_x, public_y) or not (1 <= r < N and 1 <= s < N):
        return False
    digest = int.from_bytes(hashlib.sha256(message).digest(), "big")
    w = pow(s, -1, N)
    point = _add(_multiply(digest * w % N, G), _multiply(r * w % N, (public_x, public_y)))
    return point is not None and point[0] % N == r
