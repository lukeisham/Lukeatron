"""
Test suite for server.py — the thin stdlib HTTP dispatcher.

Covers server.spec.md's AC-1 through AC-9 that are testable without a real
browser or network egress: bind address, POST-only /do/* routes, no
/do/mode route, a traversal attempt refused, every GET route returning 200
or a deliberate 404 (never a stack trace), and a grep for direct
Memory/Long-Term/LukeatronWiki file opens in server.py itself.

The server under test is always started on an OS-assigned ephemeral port
(port=0), never 8787, so a running SessionStart-managed instance is never
disturbed.
"""

import http.client
import re
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote_plus

sys.path.insert(0, str(Path(__file__).parent.parent))

import paths
import seal
import server


APP_DIR = Path(__file__).parent.parent


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class ServerFixtureTestCase(unittest.TestCase):
    """
    Builds a small tempfile Memory/Long-Term/ tree, monkey-patches `paths`
    at it, and boots server.py's Handler on an ephemeral port for the
    duration of the test.
    """

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        root = Path(self.tmpdir.name).resolve()

        self.lt = root / "Memory" / "Long-Term"
        self.wiki = self.lt / "LukeatronWiki"
        self.nodes = self.wiki / "Nodes"
        self.media = self.wiki / "_media"
        self.sealed_yaml = self.wiki / "_sealed.yaml"
        self.index_yaml = self.wiki / "_index.yaml"
        self.queue_yaml = self.wiki / "_queue.yaml"

        _write(self.lt / "Theology" / "theology.md", "Theology content.\n")
        _write(
            self.nodes / "theology.md",
            '---\n'
            'slug: "theology"\n'
            'title: "Theology"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Theology :: Theology/theology.md"\n'
            '---\n\n'
            '# Theology\n',
        )
        _write(self.sealed_yaml, "stores: []\nfiles: []\n")
        _write(self.index_yaml, "wiki: LukeatronWiki\ntype: wiki-page-index\nthemes: []\n")
        self.media.mkdir(parents=True, exist_ok=True)
        (self.media / "thumb.png").write_bytes(b"\x89PNG\r\n\x1a\n fake")

        # A static asset under the app's own static/ dir (not under LT).
        self.static_dir = root / "static_fixture"
        self.static_dir.mkdir(parents=True, exist_ok=True)
        (self.static_dir / "app.js").write_text("console.log('hi');", encoding="utf-8")
        self.wiki_css = root / "wiki-page.css"
        self.wiki_css.write_text("body { color: black; }", encoding="utf-8")

        self.enrich_dir = root / "wiki-enrich"
        self.req_dir = self.enrich_dir / "_requests"

        self._patches = [
            patch.object(paths, "LT", self.lt),
            patch.object(paths, "WIKI", self.wiki),
            patch.object(paths, "NODES", self.nodes),
            patch.object(paths, "SEALED_YAML", self.sealed_yaml),
            patch.object(paths, "INDEX_YAML", self.index_yaml),
            patch.object(paths, "QUEUE_YAML", self.queue_yaml),
            patch.object(paths, "MEDIA", self.media),
            patch.object(paths, "STATIC", self.static_dir),
            patch.object(paths, "WIKI_CSS", self.wiki_css),
            patch.object(paths, "ENRICH_DIR", self.enrich_dir),
            patch.object(paths, "REQ_DIR", self.req_dir),
        ]
        for p in self._patches:
            p.start()
            self.addCleanup(p.stop)

        self.httpd = server.build_server(port=0)
        self.assertIsNotNone(self.httpd, "server failed to bind an ephemeral port")
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self._shutdown)

    def _shutdown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)

    def _request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            conn.request(method, path, body=body, headers=headers or {})
            resp = conn.getresponse()
            data = resp.read()
            return resp.status, dict(resp.getheaders()), data
        finally:
            conn.close()


class TestAC1BindAddress(ServerFixtureTestCase):
    def test_bound_to_loopback_only(self):
        sockname = self.httpd.socket.getsockname()
        self.assertEqual(sockname[0], "127.0.0.1")

    def test_never_binds_all_interfaces(self):
        # A direct assertion against the contract's own wording: FR-1 rules
        # out "0.0.0.0" categorically, not just "happens not to be it".
        self.assertNotEqual(self.httpd.server_address[0], "0.0.0.0")


class TestAC2StdlibOnly(unittest.TestCase):
    def test_no_third_party_imports_in_source(self):
        source = (APP_DIR / "server.py").read_text(encoding="utf-8")
        # Only stdlib modules should be named in top-level import statements.
        forbidden = ("requests", "flask", "django", "yaml", "aiohttp", "tornado")
        for name in forbidden:
            self.assertNotIn(f"import {name}", source)


class TestAC3NoDirectFileAccess(unittest.TestCase):
    def test_grep_for_direct_long_term_access(self):
        source = (APP_DIR / "server.py").read_text(encoding="utf-8")
        self.assertNotIn("Memory/Long-Term", source)
        self.assertNotRegex(source, r"paths\.LT\b")
        self.assertNotRegex(source, r"paths\.WIKI\b(?!_CSS)")
        self.assertNotRegex(source, r"paths\.NODES\b")


class TestAC6PostOnlyDoRoutes(ServerFixtureTestCase):
    def test_get_on_do_routes_returns_405(self):
        for route in ("/do/capture", "/do/enrich", "/do/accept", "/do/cancel"):
            with self.subTest(route=route):
                status, headers, _ = self._request("GET", route)
                self.assertEqual(status, 405)
                self.assertIn("POST", headers.get("Allow", ""))

    def test_post_on_do_capture_does_not_405(self):
        # capture.py may not exist yet (sibling module owned elsewhere) —
        # the important thing per FR-7/AC-6 is that POST is accepted as a
        # method (never 405), whatever the eventual body-level outcome is.
        status, _, _ = self._request(
            "POST", "/do/capture",
            body="title=x&kind=article&intent=read&source=y&page=z",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertNotEqual(status, 405)


class TestDoRoutesEndToEnd(ServerFixtureTestCase):
    """
    Regression coverage for a wiring bug where _do_enrich/_do_accept/_do_cancel
    didn't accept the `fields` dict _handle_post() passes them, and (even once
    the signature was fixed) must not re-read the request body themselves —
    _handle_post() already drained it, and a second read off a POST body with
    no remaining bytes silently returns an empty fields dict. A 405/"not a
    500" check alone (TestAC6) can't catch either failure mode; these tests
    drive the routes with real form data and assert the actual file-level
    effect, matching enrich.spec.md's own AC-1 (idempotent request) and
    capture.spec.md's AC (a real queue-row write).
    """

    def _post_form(self, path, **fields):
        body = "&".join(f"{k}={quote_plus(str(v))}" for k, v in fields.items())
        return self._request(
            "POST", path, body=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    def test_enrich_request_writes_one_file_and_is_idempotent(self):
        req_path = self.req_dir / "theology.see-also.yaml"
        self.assertFalse(req_path.exists())

        status, _, _ = self._post_form("/do/enrich", slug="theology", slot="See Also")
        self.assertEqual(status, 303)
        self.assertTrue(req_path.exists())

        status, _, _ = self._post_form("/do/enrich", slug="theology", slot="See Also")
        self.assertEqual(status, 303)
        self.assertEqual(len(list(self.req_dir.glob("*.yaml"))), 1)

    def test_cancel_removes_the_pending_request(self):
        req_path = self.req_dir / "theology.see-also.yaml"
        self._post_form("/do/enrich", slug="theology", slot="See Also")
        self.assertTrue(req_path.exists())

        status, _, _ = self._post_form("/do/cancel", slug="theology", slot="See Also")
        self.assertEqual(status, 303)
        self.assertFalse(req_path.exists())

    def test_accept_writes_the_store_file_and_clears_the_draft(self):
        import enrich as enrich_module

        write_result = enrich_module.write_draft(
            "theology", "See Also",
            [{"text": "[[some-other-page]]", "verified": "checked 2026-09-12"}],
        )
        self.assertTrue(write_result["ok"], write_result.get("error"))

        status, _, _ = self._post_form("/do/accept", slug="theology", slot="See Also")
        self.assertEqual(status, 303)

        store_text = (self.lt / "Theology" / "theology.md").read_text(encoding="utf-8")
        self.assertIn("some-other-page", store_text)
        self.assertIn("verified", store_text)
        self.assertFalse((self.enrich_dir / "theology.see-also.md").exists())

    def test_capture_writes_a_real_queue_row(self):
        status, _, _ = self._post_form(
            "/do/capture", title="A Test Book", kind="book",
            intent="read", source="Someone", page="theology",
        )
        self.assertEqual(status, 303)
        queue_text = self.queue_yaml.read_text(encoding="utf-8")
        self.assertIn("A Test Book", queue_text)
        self.assertNotIn("needs_absorb", queue_text)


class TestAC7NoModeRoute(ServerFixtureTestCase):
    def test_no_do_mode_route_exists(self):
        status, _, _ = self._request("POST", "/do/mode")
        self.assertNotEqual(status, 405)  # not recognised as a do-route at all
        self.assertIn(status, (404, 500, 503))

    def test_do_mode_not_in_route_table_source(self):
        source = (APP_DIR / "server.py").read_text(encoding="utf-8")
        self.assertNotIn("/do/mode", source)

    def test_route_table_is_exactly_the_four_do_routes(self):
        self.assertEqual(
            server._DO_ROUTES,
            {"/do/capture", "/do/enrich", "/do/accept", "/do/cancel"},
        )


class TestTraversalRefused(ServerFixtureTestCase):
    def test_media_traversal_refused(self):
        status, _, _ = self._request("GET", "/media/..%2f..%2f..%2fetc%2fpasswd")
        self.assertEqual(status, 404)

    def test_static_traversal_refused(self):
        status, _, _ = self._request("GET", "/static/..%2f..%2fserver.py")
        self.assertEqual(status, 404)

    def test_route_layer_helper_rejects_dotdot_segments(self):
        self.assertFalse(server._is_safe_relpath("../../etc/passwd"))
        self.assertFalse(server._is_safe_relpath("/etc/passwd"))
        self.assertFalse(server._is_safe_relpath("a/../../b"))
        self.assertTrue(server._is_safe_relpath("BalaclavaPC/ Marketing and Ministry Plan/notes:extra.md"))


class TestEveryGetRouteRespondsCleanly(ServerFixtureTestCase):
    """
    AC-9-adjacent sanity check: every GET route returns 200 or a deliberate
    404/503 — never an unhandled exception / raw stack trace to the client
    — regardless of whether render.py exists yet.
    """

    def test_every_route_responds_without_crashing(self):
        routes = [
            "/",
            "/page/does-not-exist",
            "/store/Theology",
            "/backlog",
            "/search?q=theology",
            "/media/thumb.png",
            "/static/app.js",
            "/static/wiki-page.css",
            "/nonexistent-route",
        ]
        for route in routes:
            with self.subTest(route=route):
                status, _, body = self._request("GET", route)
                self.assertIn(status, (200, 404, 503))
                self.assertNotIn(b"Traceback (most recent call last)", body)

    def test_static_asset_served_as_raw_bytes(self):
        status, headers, body = self._request("GET", "/static/app.js")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"console.log('hi');")

    def test_wiki_css_served_from_templates_not_static(self):
        status, headers, body = self._request("GET", "/static/wiki-page.css")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"body { color: black; }")
        self.assertIn("text/css", headers.get("Content-Type", ""))

    def test_media_served_as_raw_bytes(self):
        status, headers, body = self._request("GET", "/media/thumb.png")
        self.assertEqual(status, 200)
        self.assertTrue(body.startswith(b"\x89PNG"))


class TestAC10SealStartupLogging(unittest.TestCase):
    def test_startup_logs_on_valid_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            lt = root / "Memory" / "Long-Term"
            wiki = lt / "LukeatronWiki"
            sealed_yaml = wiki / "_sealed.yaml"
            _write(sealed_yaml, "stores: []\nfiles: []\n")
            with patch.object(paths, "LT", lt), \
                 patch.object(paths, "WIKI", wiki), \
                 patch.object(paths, "SEALED_YAML", sealed_yaml):
                import io
                buf = io.StringIO()
                with patch("sys.stdout", buf):
                    httpd = server.build_server(port=0)
                try:
                    self.assertIsNotNone(httpd)
                    self.assertIn("seal manifest OK", buf.getvalue())
                finally:
                    if httpd:
                        httpd.server_close()

    def test_startup_logs_failure_on_missing_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            lt = root / "Memory" / "Long-Term"
            wiki = lt / "LukeatronWiki"
            sealed_yaml = wiki / "_sealed.yaml"  # never written -> missing
            with patch.object(paths, "LT", lt), \
                 patch.object(paths, "WIKI", wiki), \
                 patch.object(paths, "SEALED_YAML", sealed_yaml):
                import io
                buf = io.StringIO()
                with patch("sys.stderr", buf):
                    httpd = server.build_server(port=0)
                try:
                    self.assertIsNotNone(httpd)
                    self.assertIn("CRITICAL", buf.getvalue())
                finally:
                    if httpd:
                        httpd.server_close()


class TestIdempotentStart(unittest.TestCase):
    def test_second_bind_on_same_port_returns_none_not_a_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            lt = root / "Memory" / "Long-Term"
            wiki = lt / "LukeatronWiki"
            sealed_yaml = wiki / "_sealed.yaml"
            _write(sealed_yaml, "stores: []\nfiles: []\n")
            with patch.object(paths, "LT", lt), \
                 patch.object(paths, "WIKI", wiki), \
                 patch.object(paths, "SEALED_YAML", sealed_yaml):
                first = server.build_server(port=0)
                self.assertIsNotNone(first)
                port = first.server_address[1]
                try:
                    second = server.build_server(port=port)
                    self.assertIsNone(second)
                finally:
                    first.server_close()


if __name__ == "__main__":
    unittest.main()
