"""Smoke tests for server.py: a real server on an ephemeral port over a temp database."""
import json
import os
import sqlite3
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))
import server  # noqa: E402
from test_items import build_db  # noqa: E402


def fetch(url: str, method: str = "GET", body: dict | None = None, headers: dict | None = None) -> tuple[int, bytes]:
    """`body` is sent as JSON unless `headers` says otherwise."""
    data = None if body is None else json.dumps(body).encode()
    all_headers = ({"Content-Type": "application/json"} if body is not None else {}) | (headers or {})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method=method, data=data, headers=all_headers)) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        with e:
            return e.code, e.read()


class ServerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "writing.db"
        build_db(self.db_path)
        self.httpd = server.create_httpd(port=0, db_path=self.db_path)
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.tmp.cleanup()

    def test_root_serves_index_html(self):
        status, body = fetch(self.base + "/")
        self.assertEqual(status, 200)
        self.assertIn(b"<h1 ", body)

    def test_api_items_counts_and_leaf_resolution(self):
        status, body = fetch(self.base + "/api/items")
        payload = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(len(payload["entries"]), 2)
        total_leaves = 0
        stack = [n for tree in payload["trees"].values() for n in tree]
        while stack:
            node = stack.pop()
            for child in node["children"]:
                if child["kind"] == "entry":
                    total_leaves += 1
                    self.assertIn(str(child["id"]), payload["entries"])
                else:
                    stack.append(child)
        self.assertEqual(total_leaves, 3 * len(payload["entries"]))  # the three hierarchies; Labels is empty

    def test_missing_database_returns_clean_json_error(self):
        self.db_path.unlink()
        status, body = fetch(self.base + "/api/items")
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body), {"error": "db_unavailable"})
        self.assertNotIn(b"Traceback", body)

    def test_write_verbs_refused(self):
        for method in ("POST", "PUT", "DELETE"):
            self.assertEqual(fetch(self.base + "/api/items", method)[0], 405)

    # ---- The write gate (TEST-7): blocked paths are blocked, the permitted path passes. ----

    def labels_url(self, suffix: str = "") -> str:
        return self.base + "/api/labels" + suffix

    def seeded_rows(self) -> list:
        with sqlite3.connect(self.db_path) as conn:
            return [conn.execute(f"SELECT * FROM {t} ORDER BY 1, 2").fetchall()
                    for t in ("nodes", "entries", "entry_categories", "examples")]

    def label_names(self) -> list[str]:
        with sqlite3.connect(self.db_path) as conn:
            return [row[0] for row in conn.execute("SELECT name FROM labels ORDER BY id")]

    def test_a_label_can_be_created_under_a_parent_to_five_levels(self):
        fetch(self.labels_url(), "POST", {"name": "L1", "definition": "d"})
        for parent, name in ((1, "L2"), (2, "L3"), (3, "L4"), (4, "L5")):
            self.assertEqual(fetch(self.labels_url(), "POST", {"name": name, "definition": "d", "parent_id": parent})[0], 200)
        self.assertEqual(fetch(self.labels_url(), "POST", {"name": "L6", "definition": "d", "parent_id": 5})[0], 400)  # a sixth level
        self.assertEqual(fetch(self.labels_url(), "POST", {"name": "X", "definition": "d", "parent_id": 99})[0], 404)
        self.assertEqual(fetch(self.labels_url("/1"), "DELETE")[0], 409)  # it still has a sub-label

    def test_the_position_route_can_move_a_label_to_another_parent_or_the_top(self):
        for name in ("A", "B"):
            fetch(self.labels_url(), "POST", {"name": name, "definition": "d"})
        fetch(self.labels_url(), "POST", {"name": "Sub", "definition": "d", "parent_id": 1})
        status, body = fetch(self.labels_url("/3/position"), "PUT", {"index": 0, "parent_id": 2})
        self.assertEqual(status, 200)
        a, b = json.loads(body)["labels"]
        self.assertEqual(([c["name"] for c in a["children"]], [c["name"] for c in b["children"]]), ([], ["Sub"]))
        status, body = fetch(self.labels_url("/3/position"), "PUT", {"index": 0, "parent_id": 0})  # 0 is the top level
        self.assertEqual([n["name"] for n in json.loads(body)["labels"]], ["Sub", "A", "B"])
        self.assertEqual(fetch(self.labels_url("/3/position"), "PUT", {"index": 0, "parent_id": 3})[0], 400)  # into itself
        self.assertEqual(fetch(self.labels_url("/3/position"), "PUT", {"index": 0, "parent_id": -1})[0], 400)

    def test_permitted_writes_pass_and_return_the_fresh_tree(self):
        status, body = fetch(self.labels_url(), "POST", {"name": " Clause ", "definition": "a group of words"})
        self.assertEqual(status, 200)
        self.assertEqual([(n["name"], n["definition"]) for n in json.loads(body)["labels"]], [("Clause", "a group of words")])
        fetch(self.labels_url(), "POST", {"name": "Relative", "definition": "d", "parent_id": 1})
        self.assertEqual(fetch(self.labels_url("/1/entries/2"), "PUT")[0], 200)
        _, body = fetch(self.labels_url("/2/entries/2"), "PUT", {"index": 0})
        clause = json.loads(body)["labels"][0]
        self.assertEqual([c["kind"] for c in clause["children"]], ["node", "entry"])
        self.assertEqual(clause["children"][0]["children"], [{"kind": "entry", "id": 2}])
        status, body = fetch(self.labels_url("/1"), "PUT", {"name": "Clauses"})  # no explanation sent: the saved one stays
        self.assertEqual((status, json.loads(body)["labels"][0]["definition"]), (200, "a group of words"))
        status, body = fetch(self.labels_url("/1"), "PUT", {"name": "Clauses", "definition": "words with a verb"})
        self.assertEqual((status, json.loads(body)["labels"][0]["definition"]), (200, "words with a verb"))
        status, body = fetch(self.labels_url("/1"), "PUT", {"name": "Clauses", "definition": ""})  # blank clears it
        self.assertEqual((status, json.loads(body)["labels"][0]["definition"]), (200, ""))
        self.assertEqual(fetch(self.labels_url("/1"), "PUT", {"name": "Clauses", "definition": "x" * 301})[0], 400)
        self.assertEqual(fetch(self.labels_url("/2/entries/2"), "DELETE")[0], 200)
        self.assertEqual(fetch(self.labels_url("/2"), "DELETE")[0], 200)
        self.assertEqual(fetch(self.labels_url("/1/entries/2"), "DELETE")[0], 200)
        self.assertEqual(fetch(self.labels_url("/1"), "DELETE")[0], 200)
        self.assertEqual(self.label_names(), [])

    def test_reordering_routes_move_labels_and_entries(self):
        for name in ("A", "B"):
            fetch(self.labels_url(), "POST", {"name": name, "definition": "d"})
        _, body = fetch(self.labels_url("/2/position"), "PUT", {"index": 0})
        self.assertEqual([n["name"] for n in json.loads(body)["labels"]], ["B", "A"])
        fetch(self.labels_url("/1/entries/1"), "PUT")
        fetch(self.labels_url("/1/entries/2"), "PUT")
        _, body = fetch(self.labels_url("/1/entries/2"), "PUT", {"index": 0})
        a = next(n for n in json.loads(body)["labels"] if n["name"] == "A")
        self.assertEqual([c["id"] for c in a["children"]], [2, 1])

    def test_a_bad_index_is_a_400(self):
        fetch(self.labels_url(), "POST", {"name": "A", "definition": "d"})
        for url, body in ((self.labels_url("/1/position"), {"index": -1}), (self.labels_url("/1/position"), {"index": "0"}),
                          (self.labels_url("/1/position"), {"index": True}), (self.labels_url("/1/position"), {}),
                          (self.labels_url("/1/entries/1"), {"index": 1.5}), (self.labels_url("/1/entries/1"), {"index": 10**9})):
            self.assertEqual(fetch(url, "PUT", body)[0], 400, (url, body))
        self.assertEqual(fetch(self.labels_url("/99/position"), "PUT", {"index": 0})[0], 404)

    def test_write_verbs_outside_labels_stay_refused_and_change_nothing(self):
        before = self.seeded_rows()
        for method in ("POST", "PUT", "DELETE", "PATCH"):
            for path in ("/api/items", "/", "/api/labels-other", "/api/topical/types"):
                self.assertEqual(fetch(self.base + path, method)[0], 405, (method, path))
        self.assertEqual(fetch(self.labels_url(), "PATCH")[0], 405)
        self.assertEqual(self.seeded_rows(), before)

    def test_a_write_from_another_origin_or_host_is_forbidden(self):
        for headers in ({"Origin": "https://evil.example"}, {"Origin": "null"}, {"Host": "evil.example"}):
            status, _ = fetch(self.labels_url(), "POST", {"name": "X", "definition": "d"}, headers)
            self.assertEqual(status, 403, headers)
        self.assertEqual(self.label_names(), [])

    def test_a_bad_body_is_a_400_naming_nothing_internal(self):
        for body, headers in (({"name": ""}, None), ({"name": "x" * 81}, None), ({"name": 5}, None),
                              ({"nom": "X"}, None), ({"name": "X"}, {"Content-Type": "text/plain"})):
            status, raw = fetch(self.labels_url(), "POST", body, headers)
            self.assertEqual((status, json.loads(raw)), (400, {"error": "bad_request"}), (body, headers))
        self.assertEqual(self.label_names(), [])

    def test_refusals_map_to_registry_statuses(self):
        fetch(self.labels_url(), "POST", {"name": "Clause", "definition": "d"})
        self.assertEqual(fetch(self.labels_url(), "POST", {"name": "CLAUSE", "definition": "d"})[0], 200)  # names may repeat
        self.assertEqual(fetch(self.labels_url(), "POST", {"name": "X", "definition": "d", "parent_id": 99})[0], 404)
        self.assertEqual(fetch(self.labels_url("/99"), "DELETE")[0], 404)
        self.assertEqual(fetch(self.labels_url("/1/entries/99"), "PUT")[0], 404)
        self.assertEqual(fetch(self.labels_url("/abc"), "DELETE")[0], 404)
        for body in ({"name": "X", "definition": "x" * 301}, {"name": "X", "definition": 5},
                     {"name": "X", "definition": "d", "parent_id": "1"}, {"name": "X", "definition": "d", "parent_id": 0},
                     {"definition": "d"}):
            status, raw = fetch(self.labels_url(), "POST", body)
            self.assertEqual((status, json.loads(raw)), (400, {"error": "bad_request"}), body)
        self.assertEqual(fetch(self.labels_url("/1"), "PUT", {"definition": "d"})[0], 400)  # a name is still required

    def test_an_explanation_is_optional_when_adding_a_label(self):
        self.assertEqual(fetch(self.labels_url(), "POST", {"name": "Bare"})[0], 200)
        self.assertEqual(fetch(self.labels_url(), "POST", {"name": "Blank", "definition": "  "})[0], 200)
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual(conn.execute("SELECT name, definition FROM labels ORDER BY id").fetchall(), [("Bare", ""), ("Blank", "")])

    def test_a_labels_tables_are_saved_through_the_tables_route_and_returned_with_the_tree(self):
        fetch(self.labels_url(), "POST", {"name": "Clause", "definition": "d"})
        grid = {"caption": "", "colHeads": True, "rowHeads": False, "cells": [["A", "B"], ["1", "2"]]}
        status, body = fetch(self.labels_url("/1/tables"), "PUT", {"tables": [grid, grid]})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["labels"][0]["tables"], [grid, grid])
        _, body = fetch(self.base + "/api/items")
        self.assertEqual(json.loads(body)["trees"]["labels"][0]["tables"], [grid, grid])
        self.assertEqual(json.loads(fetch(self.labels_url("/1/tables"), "PUT", {"tables": []})[1])["labels"][0]["tables"], [])

    def test_a_bad_tables_body_unknown_label_or_foreign_origin_is_refused(self):
        fetch(self.labels_url(), "POST", {"name": "Clause", "definition": "d"})
        grid = {"caption": "", "colHeads": False, "rowHeads": False, "cells": [["A"]]}
        self.assertEqual(fetch(self.labels_url("/1/tables"), "PUT", {"tables": "no"})[0], 400)
        self.assertEqual(fetch(self.labels_url("/1/tables"), "PUT", {})[0], 400)
        self.assertEqual(fetch(self.labels_url("/1/tables"), "PUT", {"tables": [dict(grid, cells=[["A"], ["B", "C"]])]})[0], 400)
        self.assertEqual(fetch(self.labels_url("/99/tables"), "PUT", {"tables": [grid]})[0], 404)
        self.assertEqual(fetch(self.labels_url("/1/tables"), "PUT", {"tables": [grid]}, {"Origin": "http://evil.example"})[0], 403)
        self.assertEqual(fetch(self.labels_url("/1/tables"), "POST", {"tables": [grid]})[0], 404)  # only PUT is a route

    def test_a_large_tables_body_passes_where_a_name_body_would_not(self):
        fetch(self.labels_url(), "POST", {"name": "Clause", "definition": "d"})
        big = {"caption": "", "colHeads": True, "rowHeads": True, "cells": [["x" * 200] * 8] * 20}
        self.assertEqual(fetch(self.labels_url("/1/tables"), "PUT", {"tables": [big, big]})[0], 200)
        self.assertEqual(fetch(self.labels_url("/1"), "PUT", {"name": "n" * 5000, "definition": "d"})[0], 400)

    def test_other_labels_paths_404(self):
        self.assertEqual(fetch(self.base + "/api/labels/other", "POST", {"name": "X"})[0], 404)
        self.assertEqual(fetch(self.base + "/api/items")[0], 200)

    def test_path_outside_app_dir_forbidden_and_unknown_404(self):
        self.assertEqual(fetch(self.base + "/%2e%2e/schema.sql")[0], 403)
        self.assertEqual(fetch(self.base + "/nope.js")[0], 404)

    def test_static_root_independent_of_cwd(self):
        old = os.getcwd()
        os.chdir(tempfile.gettempdir())
        try:
            self.assertEqual(fetch(self.base + "/")[0], 200)
        finally:
            os.chdir(old)
        self.assertTrue(server.APP_DIR.is_absolute())


if __name__ == "__main__":
    unittest.main()
