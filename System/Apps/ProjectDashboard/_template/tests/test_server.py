"""Smoke tests for server.py, against a fake handler, the real app/ static
tree, and (for TestHandleBoard below) the small real fixture tree
`tests/fixtures/writes_root/` — never anything under the live
Memory/Medium-Term/ (TEST-4: no writes anywhere under Memory/, and this
fixture tree is read-only from this file's side).
"""

from __future__ import annotations

import io
import json
import socket
import sys
import time
import unittest
import unittest.mock as mock
from email.message import Message
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server  # noqa: E402  (path must be set up first)

APP_DIR = Path(__file__).resolve().parents[1] / "app"
BOARD_FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "writes_root"


class FakeHandler:
    """Just enough of BaseHTTPRequestHandler's surface for send_error,
    _send_json and the static/route helpers to run against (TEST-8's
    "fake, not a library" rule, applied to an HTTP handler instead of a
    DOM)."""

    def __init__(self, path: str = "/", command: str = "GET", body: bytes = b"") -> None:
        self.path = path
        self.command = command
        self.headers = Message()
        if body:
            self.headers["Content-Length"] = str(len(body))
        self.rfile = io.BytesIO(body)
        self.wfile = io.BytesIO()
        self.status: int | None = None
        self.response_headers: dict[str, str] = {}

    def send_response(self, status: int) -> None:
        self.status = status

    def send_header(self, name: str, value: str) -> None:
        self.response_headers[name] = value

    def end_headers(self) -> None:
        pass

    def json_body(self) -> dict:
        return json.loads(self.wfile.getvalue().decode("utf-8"))


class TestImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        # PY-3: importing server.py must never touch a file, start a
        # server, or require model.py / writes.py to exist yet — both are
        # imported lazily, inside the handlers that actually need them.
        self.assertTrue(hasattr(server, "Handler"))
        self.assertTrue(hasattr(server, "create_httpd"))


class TestSendError(unittest.TestCase):
    def test_every_registry_entry_shapes_a_response(self) -> None:
        for code in server.ERRORS:
            handler = FakeHandler()
            server.send_error(handler, code)
            expected_status, _ = server.ERRORS[code]
            self.assertEqual(handler.status, expected_status)
            self.assertEqual(handler.json_body()["error"], code)

    def test_field_names_the_offending_input(self) -> None:
        handler = FakeHandler()
        server.send_error(handler, "bad_request", field="project_id")
        self.assertEqual(handler.json_body()["field"], "project_id")


class TestPreparePayload(unittest.TestCase):
    def test_string_leaves_pass_through_unescaped(self) -> None:
        # FR-10: this is a JSON transport, not HTML — every consumer under
        # app/ inserts text via textContent (HTML-6, JS-6), so escaping here
        # would only teach the front end a literal "&amp;" for a real "&".
        payload = {"title": "<script>alert(1)</script>", "rows": ["a & b"]}
        prepared = server._prepare_payload(payload)
        self.assertEqual(prepared["title"], "<script>alert(1)</script>")
        self.assertEqual(prepared["rows"][0], "a & b")

    def test_dataclasses_flatten_to_plain_data(self) -> None:
        # Mirrors stores.Field, the shape model's output is expected to
        # carry through unchanged (documentation spec's stores -> model
        # boundary).
        field = server.stores.Field("mine", True)
        prepared = server._prepare_payload({"kind": field})
        self.assertEqual(prepared["kind"], {"value": "mine", "stated": True})

    def test_dates_become_iso_strings(self) -> None:
        import datetime

        prepared = server._prepare_payload({"due": datetime.date(2026, 9, 6)})
        self.assertEqual(prepared["due"], "2026-09-06")


class TestReadJsonBody(unittest.TestCase):
    def test_happy_path(self) -> None:
        handler = FakeHandler(body=b'{"project_id": "PP-01"}')
        body, bad_field = server._read_json_body(handler)
        self.assertIsNone(bad_field)
        self.assertEqual(body["project_id"], "PP-01")

    def test_malformed_json_names_the_body(self) -> None:
        handler = FakeHandler(body=b"{not json")
        _body, bad_field = server._read_json_body(handler)
        self.assertEqual(bad_field, "body")

    def test_oversized_body_is_rejected_without_reading_it(self) -> None:
        handler = FakeHandler()  # no body yet: set Content-Length directly, once
        handler.headers["Content-Length"] = str(server.MAX_BODY_BYTES + 1)
        _body, bad_field = server._read_json_body(handler)
        self.assertEqual(bad_field, "content-length")


class TestEditValidation(unittest.TestCase):
    """FR-4/API-4: required fields, types and enums are checked in the
    handler, before any call toward writes.py — none of these payloads
    reach a data function (AC-3)."""

    def _post_edit(self, payload: dict) -> FakeHandler:
        handler = FakeHandler(path="/api/edit", command="POST", body=json.dumps(payload).encode())
        server._handle_edit(handler)
        return handler

    def test_missing_project_id(self) -> None:
        handler = self._post_edit({"action": "set_cell", "row": 1, "column": "status",
                                    "value": "x", "mtime": 1.0})
        self.assertEqual(handler.status, 400)
        self.assertEqual(handler.json_body()["field"], "project_id")

    def test_unknown_column_is_rejected(self) -> None:
        handler = self._post_edit({"project_id": "PP-01", "action": "set_cell", "row": 1,
                                    "column": "priority", "value": "x", "mtime": 1.0})
        self.assertEqual(handler.status, 400)
        self.assertEqual(handler.json_body()["field"], "column")

    def test_hand_over_requires_recipient(self) -> None:
        handler = self._post_edit({"project_id": "PP-01", "action": "hand_over", "row": 1,
                                    "mtime": 1.0})
        self.assertEqual(handler.status, 400)
        self.assertEqual(handler.json_body()["field"], "recipient")


class TestStaticFencing(unittest.TestCase):
    """TEST-7 gate pair for the static-file fence: an escaping path is
    refused, and a legitimate in-fence file is served."""

    def test_path_escaping_app_dir_is_forbidden(self) -> None:
        handler = FakeHandler(path="/../server.py")
        server._serve_static(handler, "../server.py")
        self.assertEqual(handler.status, 403)

    def test_real_file_in_fence_is_served(self) -> None:
        self.assertTrue((APP_DIR / "shared" / "tokens.css").exists(),
                         "fixture assumption: shared/tokens.css exists in app/")
        handler = FakeHandler(path="/shared/tokens.css")
        server._serve_static(handler, "shared/tokens.css")
        self.assertEqual(handler.status, 200)
        self.assertIn("text/css", handler.response_headers["Content-Type"])


class TestHandleBoard(unittest.TestCase):
    """AC-1/AC-4: `_handle_board` against the small real fixture tree
    (`stores`/`model` run for real, nothing mocked below this)."""

    def test_legitimate_get_returns_200_with_the_expected_shape_and_is_fast(self) -> None:
        handler = FakeHandler(path="/api/board.json", command="GET")
        with mock.patch.object(server, "lukeatron_root", lambda: BOARD_FIXTURE_ROOT):
            start = time.monotonic()
            server._handle_board(handler)
            elapsed = time.monotonic() - start
        self.assertEqual(handler.status, 200)
        body = handler.json_body()
        for key in ("projects", "skipped", "depot", "horizon", "this_week", "nothing_needs_you", "orderings", "week"):
            self.assertIn(key, body)
        # Well under a second over ~40 real projects (server.spec.md's own
        # bound) — two real projects here, so this is a floor check against
        # a regression, not a measurement of the full store.
        self.assertLess(elapsed, 1.0)

    def test_a_raised_exception_returns_the_clean_internal_error_never_a_traceback(self) -> None:
        handler = FakeHandler(path="/api/board.json", command="GET")
        with mock.patch.object(server.stores, "load_board_sources", side_effect=RuntimeError("boom, secret detail")):
            server._handle_board(handler)
        self.assertEqual(handler.status, 500)
        body = handler.json_body()
        self.assertEqual(body["error"], "internal")
        self.assertNotIn("boom", json.dumps(body))
        self.assertNotIn("Traceback", json.dumps(body))


class TestRouteMethodGating(unittest.TestCase):
    """AC-2 (TEST-7 gate test 1): a GET to any write path returns 405 and
    calls no data function."""

    def test_get_on_edit_path_is_blocked(self) -> None:
        handler = FakeHandler(path="/api/edit", command="GET")
        server.Handler.do_GET(handler)  # unbound call against the fake, house idiom for BaseHTTPRequestHandler subclasses
        self.assertEqual(handler.status, 405)

    def test_get_on_request_path_is_blocked(self) -> None:
        handler = FakeHandler(path="/api/request", command="GET")
        server.Handler.do_GET(handler)
        self.assertEqual(handler.status, 405)

    def test_post_to_board_json_is_blocked(self) -> None:
        handler = FakeHandler(path="/api/board.json", command="POST", body=b"{}")
        server.Handler.do_POST(handler)
        self.assertEqual(handler.status, 405)

    def test_post_to_unknown_path_is_not_found(self) -> None:
        handler = FakeHandler(path="/nothing-here", command="POST", body=b"{}")
        server.Handler.do_POST(handler)
        self.assertEqual(handler.status, 404)


class TestCreateHttpd(unittest.TestCase):
    def test_binds_localhost_only(self) -> None:
        httpd = server.create_httpd(0)
        try:
            self.assertEqual(httpd.server_address[0], "127.0.0.1")
        finally:
            httpd.server_close()

    def test_bumps_past_a_busy_port(self) -> None:
        blocker = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        blocker.bind(("127.0.0.1", 0))
        blocker.listen(1)
        busy_port = blocker.getsockname()[1]
        try:
            httpd = server.create_httpd(busy_port)
            try:
                self.assertNotEqual(httpd.server_address[1], busy_port)
            finally:
                httpd.server_close()
        finally:
            blocker.close()


if __name__ == "__main__":
    unittest.main()
