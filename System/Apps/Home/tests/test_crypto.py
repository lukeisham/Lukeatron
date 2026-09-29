"""cbor.py and p256.py — the stdlib pieces the passkey checks stand on.

Mirrors: core/cbor.py, core/p256.py
"""

import json
import unittest

from helpers import FIXTURES  # noqa: F401 — also puts Home on sys.path
from core import cbor, p256
from core.webauthn import b64url_decode

FIXTURE = json.loads((FIXTURES / "webauthn.json").read_text(encoding="utf-8"))


class TestCBOR(unittest.TestCase):
    def test_decodes_the_types_webauthn_uses(self):
        # {1: 2, 3: -7, "a": [true, null, h'0102'], "t": "hi"}
        raw = bytes.fromhex("a4 01 02 03 26 61 61 83 f5 f6 42 01 02 61 74 62 68 69".replace(" ", ""))
        self.assertEqual(cbor.decode(raw), {1: 2, 3: -7, "a": [True, None, b"\x01\x02"], "t": "hi"})

    def test_long_lengths(self):
        self.assertEqual(cbor.decode(bytes.fromhex("1903e8")), 1000)
        self.assertEqual(cbor.decode(bytes([0x58, 30]) + b"x" * 30), b"x" * 30)

    def test_decode_prefix_reports_where_the_item_ends(self):
        item, end = cbor.decode_prefix(bytes.fromhex("0102"))
        self.assertEqual((item, end), (1, 1))

    def test_refuses_what_passkeys_never_send(self):
        for raw in ("5f", "fb3ff0000000000000", "c1", "01ff", "62"):  # indefinite, float, tag, trailing, truncated
            with self.subTest(raw=raw), self.assertRaises(cbor.CBORError):
                cbor.decode(bytes.fromhex(raw))

    def test_refuses_absurd_nesting(self):
        with self.assertRaises(cbor.CBORError):
            cbor.decode(bytes([0x81]) * 40 + b"\x00")


class TestP256(unittest.TestCase):
    x = int(FIXTURE["public_x"], 16)
    y = int(FIXTURE["public_y"], 16)
    message = FIXTURE["p256"]["message"].encode()
    r, s = p256.parse_der_signature(b64url_decode(FIXTURE["p256"]["signature"]))

    def test_generator_is_on_the_curve(self):
        self.assertTrue(p256.on_curve(*p256.G))

    def test_accepts_a_real_openssl_signature(self):
        self.assertTrue(p256.verify(self.x, self.y, self.message, self.r, self.s))

    def test_rejects_a_changed_message(self):
        self.assertFalse(p256.verify(self.x, self.y, self.message + b"!", self.r, self.s))

    def test_rejects_a_changed_signature(self):
        self.assertFalse(p256.verify(self.x, self.y, self.message, self.r, self.s ^ 1))
        self.assertFalse(p256.verify(self.x, self.y, self.message, self.r ^ 1, self.s))

    def test_rejects_out_of_range_values_and_off_curve_keys(self):
        self.assertFalse(p256.verify(self.x, self.y, self.message, 0, self.s))
        self.assertFalse(p256.verify(self.x, self.y, self.message, self.r, p256.N))
        self.assertFalse(p256.verify(self.x, self.y + 1, self.message, self.r, self.s))

    def test_accepts_the_equivalent_high_s_signature(self):
        # (r, n - s) is also a valid ECDSA signature; WebAuthn does not require low-s.
        self.assertTrue(p256.verify(self.x, self.y, self.message, self.r, p256.N - self.s))

    def test_der_parser_refuses_malformed_input(self):
        for der in (b"", b"\x30\x02\x02\x00", b"\x31\x06\x02\x01\x01\x02\x01\x01", b"\x30\x06\x02\x01\x01\x02\x01\x01\x00"):
            with self.subTest(der=der), self.assertRaises((ValueError, IndexError)):
                p256.parse_der_signature(der)


if __name__ == "__main__":
    unittest.main()
