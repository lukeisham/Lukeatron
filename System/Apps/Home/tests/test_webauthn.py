"""Passkey registration and sign-in checks, against a throwaway authenticator's real output.

Mirrors: core/webauthn.py
"""

import json
import unittest

from helpers import FIXTURES
from core import webauthn
from core.webauthn import b64url_decode, b64url_encode

F = json.loads((FIXTURES / "webauthn.json").read_text(encoding="utf-8"))
ORIGINS = (F["origin"],)
REG = F["registration"]
ASSERT = F["assertion"]


def register(**overrides):
    args = dict(
        client_data_json=b64url_decode(REG["clientDataJSON"]),
        attestation_object=b64url_decode(REG["attestationObject"]),
        challenge=REG["challenge"],
        rp_id=F["rp_id"],
        origins=ORIGINS,
        created="2026-09-29",
        label="test",
    )
    args.update(overrides)
    return webauthn.verify_registration(
        args.pop("client_data_json"), args.pop("attestation_object"), **args
    )


def client_json(**changes) -> bytes:
    data = json.loads(b64url_decode(ASSERT["clientDataJSON"]))
    data.update(changes)
    return json.dumps(data).encode()


class TestRegistration(unittest.TestCase):
    def test_extracts_the_credential(self):
        cred = register()
        self.assertEqual(cred.id, F["credential_id"])
        self.assertEqual((cred.x, cred.y), (F["public_x"], F["public_y"]))

    def test_refuses_wrong_challenge_origin_and_rp(self):
        with self.assertRaises(webauthn.WebAuthnError):
            register(challenge="something-else")
        with self.assertRaises(webauthn.WebAuthnError):
            register(origins=("http://evil.example",))
        with self.assertRaises(webauthn.WebAuthnError):
            register(rp_id="example.org")

    def test_refuses_a_get_ceremony_posing_as_create(self):
        with self.assertRaises(webauthn.WebAuthnError):
            register(client_data_json=b64url_decode(ASSERT["clientDataJSON"]), challenge=ASSERT["challenge"])


class TestAssertion(unittest.TestCase):
    def setUp(self):
        self.cred = register()

    def verify(self, *, client=None, auth=None, sig=None, challenge=None, count=None):
        if count is not None:
            self.cred.sign_count = count
        return webauthn.verify_assertion(
            self.cred,
            client or b64url_decode(ASSERT["clientDataJSON"]),
            auth or b64url_decode(ASSERT["authenticatorData"]),
            sig or b64url_decode(ASSERT["signature"]),
            challenge=challenge or ASSERT["challenge"],
            rp_id=F["rp_id"],
            origins=ORIGINS,
        )

    def test_accepts_the_real_assertion(self):
        self.assertEqual(self.verify(), 0)

    def test_refuses_forged_or_replayed_assertions(self):
        auth = bytearray(b64url_decode(ASSERT["authenticatorData"]))
        sig = bytearray(b64url_decode(ASSERT["signature"]))
        sig[-1] ^= 1
        no_uv = bytes(auth[:32]) + bytes([auth[32] & ~webauthn.FLAG_UV]) + bytes(auth[33:])
        cases = {
            "wrong challenge": dict(challenge="replayed"),
            "wrong origin": dict(client=client_json(origin="http://evil.example")),
            "altered signature": dict(sig=bytes(sig)),
            "user not verified": dict(auth=no_uv),
            "altered client data": dict(client=client_json(crossOrigin=True)),
        }
        for name, kwargs in cases.items():
            with self.subTest(name), self.assertRaises(webauthn.WebAuthnError):
                self.verify(**kwargs)

    def test_a_zero_count_is_accepted_whatever_was_stored(self):
        self.assertEqual(self.verify(count=5), 0)  # iCloud passkeys report 0 always


class TestChallenges(unittest.TestCase):
    def test_single_use_and_purpose_bound(self):
        store = webauthn.ChallengeStore()
        challenge = store.issue("login")
        self.assertFalse(store.consume(challenge, "register"))
        second = store.issue("login")
        self.assertTrue(store.consume(second, "login"))
        self.assertFalse(store.consume(second, "login"))

    def test_base64url_round_trip(self):
        self.assertEqual(b64url_decode(b64url_encode(b"\xff\x00abc")), b"\xff\x00abc")


if __name__ == "__main__":
    unittest.main()
