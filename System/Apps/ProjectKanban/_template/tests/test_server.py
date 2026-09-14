"""Acceptance tests for server.py (server.spec.md).

Runs the real `server.Handler` against an actual `http.server` instance
bound to an ephemeral `127.0.0.1` port — never the real `Memory/` tree for
anything that writes (TEST-4): edit tests copy `tests/fixtures/writes_root/`
fresh into a temp directory per test and point `LUKEATRON_ROOT` at that copy.
The one exception is AC-1, which reads (never writes) the real live tree, the
same way `stores.py`'s own AC-1 test does.

AC coverage:
  AC-1 (board returns every real project)      -> TestBoardEndpointRealTree
  AC-2 (stale write refused, file unchanged)   -> TestMtimeGuard
  AC-3 (non-localhost cannot connect)          -> TestBinding, TestStartupFailure
  AC-4 (no cache; a mid-flight change is seen) -> TestNoCaching
  AC-5 (server runnable directly)              -> TestImport, TestStartupFailure

TEST-7 gate tests (blocked / permitted), one pair per guard this module maps:
  fence      -> TestFenceGuard
  mtime      -> TestMtimeGuard
  linked row -> TestLinkedRowGuard
"""

from __future__ import annotations

import http.client
import json
import os
import shutil
import socket
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import paths  # noqa: E402  (path must be set up first)
import server  # noqa: E402
import stores  # noqa: E402
import writes  # noqa: E402

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "writes_root"


# ---------------------------------------------------------------------------
# Shared harness — a real server thread over a fresh fixture copy
# ---------------------------------------------------------------------------


class FixtureServerTestCase(unittest.TestCase):
    """One fresh `writes_root` fixture copy and one real server thread per
    test (TEST-5: deterministic, no state shared between tests)."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name) / "root"
        shutil.copytree(FIXTURE_ROOT, self.root)

        self._prev_env = os.environ.get("LUKEATRON_ROOT")
        os.environ["LUKEATRON_ROOT"] = str(self.root)
        self.addCleanup(self._restore_env)

        self.httpd = server.create_httpd(port=0)
        self.addCleanup(self.httpd.server_close)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.httpd.shutdown)
        self.port = self.httpd.server_address[1]

    def _restore_env(self) -> None:
        if self._prev_env is None:
            os.environ.pop("LUKEATRON_ROOT", None)
        else:
            os.environ["LUKEATRON_ROOT"] = self._prev_env

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, dict[str, Any] | bytes]:
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            data = None
            headers = {}
            if body is not None:
                data = json.dumps(body).encode("utf-8")
                headers["Content-Type"] = "application/json"
            conn.request(method, path, body=data, headers=headers)
            resp = conn.getresponse()
            raw = resp.read()
            content_type = resp.getheader("Content-Type", "")
            if "application/json" in content_type:
                return resp.status, json.loads(raw)
            return resp.status, raw
        finally:
            conn.close()

    def registry_path(self, project_id: str) -> Path:
        rel = {
            "ZZ-10": "Memory/Medium-Term/Projects/ZZ-10-sample-writes-target/registry.md",
            "ZZ-11": "Memory/Medium-Term/Projects/ZZ-11-sample-writes-streams/registry.md",
        }[project_id]
        return self.root / rel

    def notes_path(self, project_id: str) -> Path:
        rel = {"ZZ-10": "Memory/Medium-Term/Projects/ZZ-10-sample-writes-target/notes.md"}[project_id]
        return self.root / rel

    def tracking_path(self) -> Path:
        return self.root / "Memory/Medium-Term/Projects/_tracking.yaml"


# ---------------------------------------------------------------------------
# Import / module shape (TEST-2, FR-9)
# ---------------------------------------------------------------------------


class TestImport(unittest.TestCase):
    def test_imports_cleanly_and_exposes_the_public_api(self) -> None:
        for name in ("create_httpd", "run", "Handler", "send_error", "ERROR_STATUS", "HOST", "PORT"):
            self.assertTrue(hasattr(server, name), name)

    def test_default_port_is_8789_distinct_from_the_wiki_viewer(self) -> None:
        # ProjectKanban took over :8789 from the retired ProjectDashboard on
        # 2026-09-12; :8787 remains the wiki viewer's.
        self.assertEqual(server.PORT, 8789)

    def test_imports_writes_and_no_other_module_does(self) -> None:
        # FR-9: server.py is the only importer of writes.py on the whole
        # Python side. Checked here rather than in writes.py's own tests,
        # since writes.py cannot know who imports it.
        source = Path(server.__file__).read_text(encoding="utf-8")
        self.assertIn("import writes", source)
        build_dir = Path(server.__file__).resolve().parent
        for py_file in build_dir.glob("*.py"):
            if py_file.name in ("server.py", "writes.py"):
                continue
            text = py_file.read_text(encoding="utf-8")
            self.assertNotIn("import writes", text, f"{py_file} must not import writes")


# ---------------------------------------------------------------------------
# AC-3 / FR-2 — localhost-only binding, demonstrated structurally
#
# A unit test cannot literally dial in from another machine. What it CAN
# prove: the bound socket's own address is 127.0.0.1 (not 0.0.0.0 or any
# other interface), the source never spells the wildcard address, and the
# one public entry point (`run`) has no parameter that could ever be used to
# bind anywhere else — port is the only thing a caller can vary.
# ---------------------------------------------------------------------------


class TestBinding(unittest.TestCase):
    def test_bound_socket_address_is_127_0_0_1(self) -> None:
        httpd = server.create_httpd(port=0)
        try:
            self.assertEqual(httpd.server_address[0], "127.0.0.1")
        finally:
            httpd.server_close()

    def test_host_constant_is_localhost(self) -> None:
        self.assertEqual(server.HOST, "127.0.0.1")

    def test_source_never_uses_the_wildcard_address_as_a_string_literal(self) -> None:
        # A comment may legitimately explain "never 0.0.0.0" (as this file's
        # own HOST constant does) — what must never appear is the wildcard
        # address actually spelled out as a bindable string literal.
        source = Path(server.__file__).read_text(encoding="utf-8")
        self.assertNotIn('"0.0.0.0"', source)
        self.assertNotIn("'0.0.0.0'", source)

    def test_run_exposes_no_host_parameter(self) -> None:
        # The only public entry point a launcher calls cannot be asked to
        # bind anywhere but HOST — there is no argument for it to pass.
        import inspect

        params = inspect.signature(server.run).parameters
        self.assertEqual(set(params), {"port"})

    def test_a_real_localhost_connection_succeeds(self) -> None:
        # The permitted half of the gate: a request that legitimately
        # originates from 127.0.0.1 connects and gets a real response.
        httpd = server.create_httpd(port=0)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            conn = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=5)
            conn.request("GET", "/")
            resp = conn.getresponse()
            resp.read()
            self.assertIn(resp.status, (200, 403, 404))  # reached the handler at all
            conn.close()
        finally:
            httpd.shutdown()
            httpd.server_close()


class TestStartupFailure(unittest.TestCase):
    def test_port_already_in_use_exits_nonzero(self) -> None:
        """FR-8: a launcher double-click on a held port fails loudly rather
        than silently binding elsewhere (server.spec.md §6's own risk)."""
        blocker = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        blocker.bind(("127.0.0.1", 0))
        blocker.listen(1)
        held_port = blocker.getsockname()[1]
        try:
            with self.assertRaises(SystemExit) as ctx:
                server.run(port=held_port)
            self.assertEqual(ctx.exception.code, 1)
        finally:
            blocker.close()


# ---------------------------------------------------------------------------
# FR-3 — static file serving
# ---------------------------------------------------------------------------


class TestStaticServing(FixtureServerTestCase):
    def test_get_root_serves_index_html(self) -> None:
        # Asserts on the real app/index.html now that board/controls have
        # built it out — not its earlier one-line placeholder (PY-3-adjacent
        # staleness: a fixture assertion tied to a sibling module's WIP state
        # rather than this module's own contract).
        status, body = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b"<title>Lukeatron Project Dashboard</title>", body)

    def test_missing_file_is_not_found(self) -> None:
        status, body = self.request("GET", "/does-not-exist.js")
        self.assertEqual(status, 404)
        self.assertEqual(body["error"], "not_found")

    def test_path_traversal_outside_app_dir_is_forbidden(self) -> None:
        status, body = self.request("GET", "/../server.py")
        self.assertEqual(status, 403)
        self.assertEqual(body["error"], "forbidden")

    def test_get_edit_path_is_method_not_allowed(self) -> None:
        status, body = self.request("GET", "/api/edit")
        self.assertEqual(status, 405)
        self.assertEqual(body["error"], "method_not_allowed")

    def test_post_to_board_path_is_method_not_allowed(self) -> None:
        status, body = self.request("POST", "/api/board.json")
        self.assertEqual(status, 405)
        self.assertEqual(body["error"], "method_not_allowed")

    def test_post_to_unknown_path_is_not_found(self) -> None:
        status, body = self.request("POST", "/nowhere")
        self.assertEqual(status, 404)
        self.assertEqual(body["error"], "not_found")


# ---------------------------------------------------------------------------
# FR-4 — GET /api/board.json against the fixture tree (shape, not AC-1)
# ---------------------------------------------------------------------------


class TestBoardEndpointFixture(FixtureServerTestCase):
    def test_returns_both_fixture_projects_with_full_shape(self) -> None:
        status, body = self.request("GET", "/api/board.json")
        self.assertEqual(status, 200)
        ids = {p["id"] for p in body["projects"]}
        self.assertEqual(ids, {"ZZ-10", "ZZ-11"})
        for project in body["projects"]:
            for key in (
                "id", "title", "context", "lane", "due_column", "due_date",
                "due_text", "open_count", "tasks", "next_action",
            ):
                self.assertIn(key, project)
        self.assertIn("lane_counts", body)
        self.assertIn("column_counts", body)

    def test_guessable_fields_serialize_as_value_guessed_pairs(self) -> None:
        _, body = self.request("GET", "/api/board.json")
        zz10 = next(p for p in body["projects"] if p["id"] == "ZZ-10")
        self.assertEqual(set(zz10["lane"]), {"value", "guessed"})
        self.assertEqual(set(zz10["due_column"]), {"value", "guessed"})
        task = zz10["tasks"][0]
        self.assertEqual(set(task["lane"]), {"value", "guessed"})

    def test_undated_task_serializes_due_date_as_null(self) -> None:
        _, body = self.request("GET", "/api/board.json")
        zz10 = next(p for p in body["projects"] if p["id"] == "ZZ-10")
        row2 = next(t for t in zz10["tasks"] if t["index"] == "2")
        self.assertIsNone(row2["due_date"])

    def test_dated_task_serializes_due_date_as_iso_string(self) -> None:
        _, body = self.request("GET", "/api/board.json")
        zz10 = next(p for p in body["projects"] if p["id"] == "ZZ-10")
        row1 = next(t for t in zz10["tasks"] if t["index"] == "1")
        self.assertEqual(row1["due_date"], "2026-09-10")


# ---------------------------------------------------------------------------
# wishlist #5 — GET /api/board-changed.json against the fixture tree: a
# stat-only endpoint, deliberately never running the full stores/model parse
# /api/board.json above does.
# ---------------------------------------------------------------------------


class TestBoardChangedEndpoint(FixtureServerTestCase):
    def test_returns_200_and_the_expected_shape(self) -> None:
        status, body = self.request("GET", "/api/board-changed.json")
        self.assertEqual(status, 200)
        self.assertEqual(set(body), {"latest_mtime"})
        self.assertIsInstance(body["latest_mtime"], (int, float))
        self.assertGreater(body["latest_mtime"], 0)

    def test_reflects_a_touched_registry_file_on_the_very_next_call(self) -> None:
        _, first = self.request("GET", "/api/board-changed.json")
        registry_path = self.registry_path("ZZ-10")
        new_mtime = first["latest_mtime"] + 1000
        os.utime(registry_path, (new_mtime, new_mtime))
        _, second = self.request("GET", "/api/board-changed.json")
        self.assertEqual(second["latest_mtime"], new_mtime)
        self.assertGreater(second["latest_mtime"], first["latest_mtime"])

    def test_post_is_method_not_allowed(self) -> None:
        status, body = self.request("POST", "/api/board-changed.json")
        self.assertEqual(status, 405)
        self.assertEqual(body["error"], "method_not_allowed")


# ---------------------------------------------------------------------------
# AC-1 — the real board, read-only, against the live tree (never a fixture)
# ---------------------------------------------------------------------------


class TestBoardEndpointRealTree(unittest.TestCase):
    def setUp(self) -> None:
        self._prev_env = os.environ.pop("LUKEATRON_ROOT", None)
        self.addCleanup(self._restore_env)
        self.httpd = server.create_httpd(port=0)
        self.addCleanup(self.httpd.server_close)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.httpd.shutdown)

    def _restore_env(self) -> None:
        if self._prev_env is not None:
            os.environ["LUKEATRON_ROOT"] = self._prev_env

    def test_board_endpoint_returns_every_real_live_project(self) -> None:
        import model

        root = paths.find_lukeatron_root()
        sources = stores.load_board_sources(root)
        from datetime import date

        expected = model.build_board(sources.projects, today=date.today())
        expected_count = len(expected.projects)
        self.assertGreater(expected_count, 0, "the real tree unexpectedly has no projects")

        conn = http.client.HTTPConnection("127.0.0.1", self.httpd.server_address[1], timeout=10)
        conn.request("GET", "/api/board.json")
        resp = conn.getresponse()
        self.assertEqual(resp.status, 200)
        body = json.loads(resp.read())
        conn.close()

        self.assertEqual(len(body["projects"]), expected_count)
        self.assertEqual(sum(body["lane_counts"].values()), expected_count)
        # A client could render every one from the JSON alone: every project
        # carries an id and a tasks list, however short.
        for project in body["projects"]:
            self.assertIsInstance(project["id"], str)
            self.assertIsInstance(project["tasks"], list)


# ---------------------------------------------------------------------------
# AC-4 — no cache anywhere in this module
# ---------------------------------------------------------------------------


class TestNoCaching(FixtureServerTestCase):
    def test_two_sequential_gets_reflect_a_file_changed_in_between(self) -> None:
        _, first = self.request("GET", "/api/board.json")
        zz10_first = next(p for p in first["projects"] if p["id"] == "ZZ-10")
        self.assertEqual(zz10_first["title"], "Sample Writes Target")

        tracking = self.tracking_path()
        text = tracking.read_text(encoding="utf-8")
        tracking.write_text(text.replace('"Sample Writes Target"', '"Retitled Mid-Flight"'), encoding="utf-8")

        _, second = self.request("GET", "/api/board.json")
        zz10_second = next(p for p in second["projects"] if p["id"] == "ZZ-10")
        self.assertEqual(zz10_second["title"], "Retitled Mid-Flight")


# ---------------------------------------------------------------------------
# POST /api/edit — request validation (API-4), independent of writes.py
# ---------------------------------------------------------------------------


class TestEditValidation(unittest.TestCase):
    def test_missing_project_id(self) -> None:
        parsed, field = server._validate_edit_body({"field": "status", "row": "1", "value": "x", "mtime": 1.0})
        self.assertIsNone(parsed)
        self.assertEqual(field, "project_id")

    def test_bad_mtime_type(self) -> None:
        parsed, field = server._validate_edit_body(
            {"project_id": "ZZ-10", "field": "status", "row": "1", "value": "x", "mtime": "soon"}
        )
        self.assertIsNone(parsed)
        self.assertEqual(field, "mtime")

    def test_unknown_field_name(self) -> None:
        parsed, field = server._validate_edit_body(
            {"project_id": "ZZ-10", "field": "state", "row": "1", "value": "x", "mtime": 1.0}
        )
        self.assertIsNone(parsed)
        self.assertEqual(field, "field")

    def test_cell_edit_without_row(self) -> None:
        parsed, field = server._validate_edit_body(
            {"project_id": "ZZ-10", "field": "due", "value": "2026-10-01", "mtime": 1.0}
        )
        self.assertIsNone(parsed)
        self.assertEqual(field, "row")

    def test_note_edit_defaults_section_to_scraps(self) -> None:
        parsed, field = server._validate_edit_body(
            {"project_id": "ZZ-10", "field": "note", "value": "a scrap", "mtime": 1.0}
        )
        self.assertIsNone(field)
        self.assertEqual(parsed["section"], "scraps")


class TestEditEndpointBadRequest(FixtureServerTestCase):
    def test_missing_project_id_over_http_is_400(self) -> None:
        status, body = self.request("POST", "/api/edit", {"field": "status", "row": "1", "value": "x", "mtime": 1.0})
        self.assertEqual(status, 400)
        self.assertEqual(body["error"], "bad_request")
        self.assertEqual(body["field"], "project_id")


# ---------------------------------------------------------------------------
# Guard 1 — the fence (FR-6)
# ---------------------------------------------------------------------------


class TestFenceGuard(FixtureServerTestCase):
    def test_blocked_escaping_project_path_is_403_fence_violation(self) -> None:
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-12", "field": "status", "row": "1", "value": "☑ Done", "mtime": 0.0},
        )
        self.assertEqual(status, 403)
        self.assertEqual(body["error"], "fence_violation")

    def test_permitted_in_tree_edit_succeeds(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = path.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "status", "row": "1", "value": "☑ Done", "mtime": mtime},
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])


# ---------------------------------------------------------------------------
# Guard 2 — mtime (AC-2)
# ---------------------------------------------------------------------------


class TestMtimeGuard(FixtureServerTestCase):
    def test_blocked_stale_mtime_is_409_and_file_byte_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        stale = path.stat().st_mtime - 999

        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "due", "row": "1", "value": "2026-11-01", "mtime": stale},
        )

        self.assertEqual(status, 409)
        self.assertEqual(body["error"], "stale_mtime")
        self.assertEqual(path.read_bytes(), original, "a refused write must never touch the file")

    def test_permitted_fresh_mtime_succeeds_and_returns_the_new_mtime(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = path.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "owner", "row": "4", "value": "Luke", "mtime": mtime},
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        self.assertNotEqual(body["mtime"], mtime)


# ---------------------------------------------------------------------------
# Guard 3 — linked rows (FR-6's own distinct 409 code)
# ---------------------------------------------------------------------------


class TestLinkedRowGuard(FixtureServerTestCase):
    def test_blocked_linked_row_is_409_with_its_own_distinct_code(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = path.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "status", "row": "3", "value": "☑ Done", "mtime": mtime},
        )
        self.assertEqual(status, 409)
        self.assertEqual(body["error"], "linked_row")
        self.assertNotEqual(body["error"], "stale_mtime", "linked_row must be distinguishable from stale_mtime")

    def test_permitted_unlinked_row_succeeds(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = path.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "status", "row": "1", "value": "☑ Done", "mtime": mtime},
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])


# ---------------------------------------------------------------------------
# Row / project not found (FR-6)
# ---------------------------------------------------------------------------


class TestNotFoundMapping(FixtureServerTestCase):
    def test_unknown_row_is_404_row_not_found(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = path.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "status", "row": "99", "value": "☑ Done", "mtime": mtime},
        )
        self.assertEqual(status, 404)
        self.assertEqual(body["error"], "row_not_found")

    def test_unknown_project_is_404_project_not_found(self) -> None:
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-99", "field": "status", "row": "1", "value": "☑ Done", "mtime": 0.0},
        )
        self.assertEqual(status, 404)
        self.assertEqual(body["error"], "project_not_found")


# ---------------------------------------------------------------------------
# Notes edits (field 5)
# ---------------------------------------------------------------------------


class TestNoteEdits(FixtureServerTestCase):
    def test_note_edit_appends_under_default_scraps_section(self) -> None:
        notes = self.notes_path("ZZ-10")
        mtime = notes.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "note", "value": "a note from the board", "mtime": mtime},
        )
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        self.assertEqual(body["section"], "scraps")
        text = notes.read_text(encoding="utf-8")
        scraps_idx = text.index("Scraps & ideas")
        constraints_idx = text.index("Constraints & gotchas")
        self.assertIn("a note from the board", text[scraps_idx:constraints_idx])

    def test_note_edit_honours_an_explicit_section(self) -> None:
        notes = self.notes_path("ZZ-10")
        mtime = notes.stat().st_mtime
        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "note", "value": "watch this constraint", "section": "constraints", "mtime": mtime},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["section"], "constraints")
        text = notes.read_text(encoding="utf-8")
        constraints_idx = text.index("Constraints & gotchas")
        reference_idx = text.index("Reference")
        self.assertIn("watch this constraint", text[constraints_idx:reference_idx])


# ---------------------------------------------------------------------------
# Table-corruption mapping (FR-6) — exercised by monkeypatching writes.py's
# own function, since none of the fixture rows can genuinely trigger a
# re-parse failure (the guard exists for a bug class the fixture cannot
# author on purpose).
# ---------------------------------------------------------------------------


class TestTableCorruptionMapping(FixtureServerTestCase):
    def test_table_corruption_is_422_with_its_own_code(self) -> None:
        original = writes.set_cell

        def _boom(*args: Any, **kwargs: Any) -> None:
            raise writes.TableCorruptionError("simulated re-parse failure")

        writes.set_cell = _boom
        self.addCleanup(lambda: setattr(writes, "set_cell", original))

        status, body = self.request(
            "POST", "/api/edit",
            {"project_id": "ZZ-10", "field": "status", "row": "1", "value": "☑ Done", "mtime": 0.0},
        )
        self.assertEqual(status, 422)
        self.assertEqual(body["error"], "table_corruption")


if __name__ == "__main__":
    unittest.main()
