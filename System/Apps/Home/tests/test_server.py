"""The gate (TEST-7), routing, escaping and the passkey routes end to end — through dispatch(), no
sockets. Also boots the real server on an ephemeral port once, to prove the wiring.

Mirrors: server.py, routes/*.py
"""

import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

from helpers import FIXTURES, make_home, temp_root
import server
from core import session
from core.web import Request

F = json.loads((FIXTURES / "webauthn.json").read_text(encoding="utf-8"))
ORIGIN = "http://localhost:8780"


def req(path, method="GET", *, cookie=None, key=None, body=None, origin=ORIGIN, host="localhost:8780", client="127.0.0.1"):
    headers = {"host": host}
    if cookie:
        headers["cookie"] = f"{session.COOKIE}={cookie}"
    if key:
        headers["x-home-key"] = key
    if origin:
        headers["origin"] = origin
    return Request(method, path, {}, headers, json.dumps(body).encode() if body is not None else b"", client)


class GateTest(unittest.TestCase):
    def setUp(self):
        self._tmp = temp_root()
        self.home = make_home(Path(self._tmp.name))
        self.cookie = session.make_value(self.home.secret, self.home.now())

    def tearDown(self):
        self._tmp.cleanup()

    def get(self, path, **kw):
        return server.dispatch(self.home, req(path, **kw))


class TestGate(GateTest):
    def test_signed_out_sees_only_the_sign_in_screen(self):
        self.assertIn(b'data-mode="create"', self.get("/").body)
        for path in ("/apps.json", "/llms.txt", "/api/verse", "/open/Wiki", "/apps/Riddle/Riddle.html"):
            with self.subTest(path=path):
                self.assertEqual(self.get(path).status, 401)

    def test_agent_key_opens_the_data_routes(self):
        response = self.get("/apps.json", key=self.home.agent_key)
        self.assertEqual(response.status, 200)
        self.assertIn("apps", json.loads(response.body))
        self.assertEqual(self.get("/apps.json", key="wrong").status, 401)

    def test_session_cookie_opens_the_page_and_expires(self):
        self.assertEqual(self.get("/", cookie=self.cookie).status, 200)
        self.home.now = lambda: 1_800_000_000.0 + session.LIFE_S + 1
        self.assertIn(b'data-mode="create"', self.get("/", cookie=self.cookie).body)

    def test_forged_cookie_is_refused(self):
        expiry = self.cookie.split(".")[0]
        self.assertEqual(self.get("/apps.json", cookie=f"{expiry}.{'0' * 64}").status, 401)

    def test_bare_ip_redirects_to_localhost(self):
        response = self.get("/", host="127.0.0.1:8780")
        self.assertEqual(response.status, 301)
        self.assertEqual(dict(response.headers)["Location"], "http://localhost:8780/")

    def test_static_files_are_public_and_confined(self):
        self.assertEqual(self.get("/static/home.css").status, 200)
        self.assertEqual(self.get("/static/../server.py").status, 404)


class TestPage(GateTest):
    def test_rows_are_rendered_escaped_with_their_data(self):
        body = self.get("/", cookie=self.cookie).body.decode()
        self.assertIn('data-app="Riddle"', body)
        self.assertIn('data-open-url="/open/Wiki"', body)
        self.assertIn("A riddle &lt;b&gt;with&lt;/b&gt; a clue", body)
        self.assertNotIn("<b>with</b>", body)
        self.assertIn('aria-disabled="true"', body)  # Draft, in build
        self.assertNotIn("{{APP_ROWS}}", body)

    def test_opening_apps(self):
        self.assertEqual(dict(self.get("/open/Riddle", cookie=self.cookie).headers)["Location"], "/apps/Riddle/Riddle.html")
        self.assertEqual(self.get("/apps/Riddle/Riddle.html", cookie=self.cookie).status, 200)
        self.assertEqual(self.get("/apps/Riddle/secret.txt", cookie=self.cookie).status, 404)
        self.assertEqual(self.get("/open/Draft", cookie=self.cookie).status, 404)
        self.assertEqual(self.get("/open/Nope", cookie=self.cookie).status, 404)

    def test_verse_falls_back_offline(self):
        verse = json.loads(self.get("/api/verse", cookie=self.cookie).body)
        self.assertEqual(verse["version"], "BSB")


class TestPasskeyRoutes(GateTest):
    def post(self, path, body=None, **kw):
        return server.dispatch(self.home, req(path, "POST", body=body or {}, **kw))

    def test_first_passkey_only_from_the_mac_itself(self):
        self.assertEqual(self.post("/auth/register/options", client="100.64.0.5").status, 403)
        self.assertEqual(self.post("/auth/register/options").status, 200)

    def test_other_origins_are_refused(self):
        self.assertEqual(self.post("/auth/login/options", origin="http://evil.example").status, 403)
        self.assertEqual(self.post("/auth/login/options", origin=None).status, 403)

    def test_register_then_sign_in_with_the_fixture_authenticator(self):
        self.home.challenges.consume = lambda challenge, purpose: challenge in (F["registration"]["challenge"], F["assertion"]["challenge"])
        registered = self.post("/auth/register/verify", F["registration"])
        self.assertEqual(registered.status, 200)
        self.assertIn(session.COOKIE, dict(registered.headers)["Set-Cookie"])
        self.assertEqual(len(self.home.creds.passkeys()), 1)
        # Once a passkey exists, a stranger on the loopback can no longer register another.
        self.assertEqual(self.post("/auth/register/options").status, 403)
        signed_in = self.post("/auth/login/verify", {"id": F["credential_id"], **F["assertion"]})
        self.assertEqual(signed_in.status, 200)
        tampered = dict(F["assertion"], signature=F["p256"]["signature"])
        self.assertEqual(self.post("/auth/login/verify", {"id": F["credential_id"], **tampered}).status, 403)

    def test_unknown_challenge_is_refused(self):
        self.assertEqual(self.post("/auth/login/verify", {"id": F["credential_id"], **F["assertion"]}).status, 403)


class TestRealSocket(GateTest):
    def test_boots_and_answers(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler(self.home))
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            port = httpd.server_address[1]
            request = urllib.request.Request(f"http://127.0.0.1:{port}/llms.txt", headers={"X-Home-Key": self.home.agent_key, "Host": "localhost"})
            with urllib.request.urlopen(request, timeout=5) as response:
                self.assertIn(b"Home", response.read())
        finally:
            httpd.shutdown()
            httpd.server_close()


if __name__ == "__main__":
    unittest.main()
