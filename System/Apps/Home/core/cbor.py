"""The subset of CBOR (RFC 8949) that WebAuthn uses: attestation objects and COSE public keys.

Definite lengths only; no tags, floats or indefinite-length items — a passkey never sends them,
so anything outside the subset is refused rather than guessed at. `decode_prefix` exists because
a COSE key sits in the middle of authenticator data and the caller needs to know where it ends.
"""

from __future__ import annotations

from typing import Any

MAX_DEPTH = 16


class CBORError(ValueError):
    pass


def _read_length(data: bytes, pos: int, info: int) -> tuple[int, int]:
    if info < 24:
        return info, pos
    sizes = {24: 1, 25: 2, 26: 4, 27: 8}
    if info not in sizes:
        raise CBORError(f"unsupported length encoding {info} at byte {pos}")
    size = sizes[info]
    if pos + size > len(data):
        raise CBORError("truncated length")
    return int.from_bytes(data[pos:pos + size], "big"), pos + size


def _decode(data: bytes, pos: int, depth: int) -> tuple[Any, int]:
    if depth > MAX_DEPTH:
        raise CBORError("nested too deeply")
    if pos >= len(data):
        raise CBORError("truncated item")
    initial = data[pos]
    major, info = initial >> 5, initial & 0x1F
    pos += 1

    if major == 7:
        simple = {20: False, 21: True, 22: None}
        if info not in simple:
            raise CBORError(f"unsupported simple value {info}")
        return simple[info], pos

    length, pos = _read_length(data, pos, info)
    if major == 0:
        return length, pos
    if major == 1:
        return -1 - length, pos
    if major in (2, 3):
        end = pos + length
        if end > len(data):
            raise CBORError("truncated string")
        chunk = data[pos:end]
        return (bytes(chunk) if major == 2 else chunk.decode("utf-8")), end
    if major == 4:
        items = []
        for _ in range(length):
            item, pos = _decode(data, pos, depth + 1)
            items.append(item)
        return items, pos
    if major == 5:
        mapping: dict[Any, Any] = {}
        for _ in range(length):
            key, pos = _decode(data, pos, depth + 1)
            if isinstance(key, (list, dict)):
                raise CBORError("unhashable map key")
            mapping[key], pos = _decode(data, pos, depth + 1)
        return mapping, pos
    raise CBORError(f"unsupported major type {major}")


def decode_prefix(data: bytes, pos: int = 0) -> tuple[Any, int]:
    """Decode one item starting at `pos`; returns the item and the offset just after it."""
    return _decode(data, pos, 0)


def decode(data: bytes) -> Any:
    item, end = _decode(data, 0, 0)
    if end != len(data):
        raise CBORError(f"{len(data) - end} trailing bytes")
    return item
