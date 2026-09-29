"""/auth/* — passkey registration and sign-in, and signing out.

Every POST here must carry an Origin header from settings.origins, so no other web page can drive
these routes from Luke's browser. The first passkey may only be created from the Mac itself.
"""

from __future__ import annotations

import json
from datetime import date

from core import session, webauthn
from core.home import Home
from core.web import BadRequest, Request, Response, error, json_response

REGISTER = "register"
LOGIN = "login"


def _origin_ok(home: Home, request: Request) -> bool:
    return request.header("origin") in home.settings.origins


def _challenge_of(client_data_json: bytes) -> str:
    try:
        return str(json.loads(client_data_json)["challenge"])
    except (ValueError, KeyError, TypeError) as exc:
        raise BadRequest("clientDataJSON has no challenge") from exc


def _field(body: dict, name: str) -> bytes:
    value = body.get(name) if isinstance(body, dict) else None
    if not isinstance(value, str):
        raise BadRequest(f"missing {name}")
    return webauthn.b64url_decode(value)


def _may_register(home: Home, request: Request) -> bool:
    if home.signed_in(request):
        return True
    return not home.creds.passkeys() and home.is_loopback(request)


def _signed_in_response(home: Home) -> Response:
    value = session.make_value(home.secret, home.now())
    return json_response({"ok": True}, headers=[("Set-Cookie", session.set_cookie_header(value))])


def register_options(home: Home, request: Request) -> Response:
    if not _origin_ok(home, request) or not _may_register(home, request):
        return error("forbidden")
    challenge = home.challenges.issue(REGISTER)
    return json_response(webauthn.registration_options(home.settings.rp_id, challenge, home.creds.passkeys()))


def register_verify(home: Home, request: Request) -> Response:
    if not _origin_ok(home, request) or not _may_register(home, request):
        return error("forbidden")
    body = request.json()
    client_data = _field(body, "clientDataJSON")
    challenge = _challenge_of(client_data)
    if not home.challenges.consume(challenge, REGISTER):
        return error("forbidden")
    try:
        credential = webauthn.verify_registration(
            client_data,
            _field(body, "attestationObject"),
            challenge=challenge,
            rp_id=home.settings.rp_id,
            origins=home.settings.origins,
            created=date.today().isoformat(),
            label=f"passkey created {date.today().isoformat()}",
        )
    except webauthn.WebAuthnError:
        return error("forbidden")
    passkeys = [cred for cred in home.creds.passkeys() if cred.id != credential.id]
    home.creds.save_passkeys([*passkeys, credential])
    return _signed_in_response(home)


def login_options(home: Home, request: Request) -> Response:
    if not _origin_ok(home, request):
        return error("forbidden")
    return json_response(webauthn.login_options(home.settings.rp_id, home.challenges.issue(LOGIN)))


def login_verify(home: Home, request: Request) -> Response:
    if not _origin_ok(home, request):
        return error("forbidden")
    body = request.json()
    client_data = _field(body, "clientDataJSON")
    challenge = _challenge_of(client_data)
    if not home.challenges.consume(challenge, LOGIN):
        return error("forbidden")
    credential_id = body.get("id") if isinstance(body, dict) else None
    passkeys = home.creds.passkeys()
    match = next((cred for cred in passkeys if cred.id == credential_id), None)
    if match is None:
        return error("forbidden")
    try:
        match.sign_count = webauthn.verify_assertion(
            match,
            client_data,
            _field(body, "authenticatorData"),
            _field(body, "signature"),
            challenge=challenge,
            rp_id=home.settings.rp_id,
            origins=home.settings.origins,
        )
    except webauthn.WebAuthnError:
        return error("forbidden")
    home.creds.save_passkeys(passkeys)
    return _signed_in_response(home)


def signout(home: Home, request: Request) -> Response:
    if not _origin_ok(home, request):
        return error("forbidden")
    return json_response({"ok": True}, headers=[("Set-Cookie", session.clear_cookie_header())])
