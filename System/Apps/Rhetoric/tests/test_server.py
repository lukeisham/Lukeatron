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
        self.db_path = Path(self.tmp.name) / "rhetoric.db"
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
        self.assertEqual(len(payload["devices"]), 2)
        total_leaves = 0
        stack = [n for tree in payload["trees"].values() for n in tree]
        while stack:
            node = stack.pop()
            for child in node["children"]:
                if child["kind"] == "device":
                    total_leaves += 1
                    self.assertIn(str(child["id"]), payload["devices"])
                else:
                    stack.append(child)
        self.assertEqual(total_leaves, 4 * len(payload["devices"]))  # three hierarchies + Topical's Unsorted

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

    def topical_url(self, suffix: str = "") -> str:
        return self.base + "/api/topical/types" + suffix

    def seeded_rows(self) -> list:
        with sqlite3.connect(self.db_path) as conn:
            return [conn.execute(f"SELECT * FROM {t} ORDER BY 1, 2").fetchall()
                    for t in ("nodes", "devices", "device_categories", "examples")]

    def topical_type_names(self) -> list[str]:
        with sqlite3.connect(self.db_path) as conn:
            return [row[0] for row in conn.execute("SELECT name FROM topical_types ORDER BY id")]

    def test_permitted_topical_writes_pass_and_return_the_fresh_tree(self):
        status, body = fetch(self.topical_url(), "POST", {"name": "  Irony "})
        self.assertEqual(status, 200)
        self.assertEqual([n["name"] for n in json.loads(body)["topical"]], ["Irony", "Unsorted"])
        status, body = fetch(self.topical_url("/1/devices/1"), "PUT")
        self.assertEqual([len(n["children"]) for n in json.loads(body)["topical"]], [1, 1])
        self.assertEqual(fetch(self.topical_url("/1"), "PUT", {"name": "Wit"})[0], 200)
        self.assertEqual(fetch(self.topical_url("/1/devices/1"), "DELETE")[0], 200)
        self.assertEqual(fetch(self.topical_url("/1"), "DELETE")[0], 200)
        self.assertEqual(self.topical_type_names(), [])

    def test_reordering_routes_move_types_and_devices(self):
        for name in ("A", "B"):
            fetch(self.topical_url(), "POST", {"name": name})
        _, body = fetch(self.topical_url("/2/position"), "PUT", {"index": 0})
        self.assertEqual([n["name"] for n in json.loads(body)["topical"]], ["B", "A", "Unsorted"])
        fetch(self.topical_url("/1/devices/1"), "PUT")
        fetch(self.topical_url("/1/devices/2"), "PUT")
        _, body = fetch(self.topical_url("/1/devices/2"), "PUT", {"index": 0})
        a = next(n for n in json.loads(body)["topical"] if n["name"] == "A")
        self.assertEqual([c["id"] for c in a["children"]], [2, 1])

    def test_a_bad_index_is_a_400(self):
        fetch(self.topical_url(), "POST", {"name": "A"})
        for url, body in ((self.topical_url("/1/position"), {"index": -1}), (self.topical_url("/1/position"), {"index": "0"}),
                          (self.topical_url("/1/position"), {"index": True}), (self.topical_url("/1/position"), {}),
                          (self.topical_url("/1/devices/1"), {"index": 1.5}), (self.topical_url("/1/devices/1"), {"index": 10**9})):
            self.assertEqual(fetch(url, "PUT", body)[0], 400, (url, body))
        self.assertEqual(fetch(self.topical_url("/99/position"), "PUT", {"index": 0})[0], 404)

    def test_write_verbs_outside_topical_stay_refused_and_change_nothing(self):
        before = self.seeded_rows()
        for method in ("POST", "PUT", "DELETE", "PATCH"):
            for path in ("/api/items", "/", "/api/topical-other"):
                self.assertEqual(fetch(self.base + path, method)[0], 405, (method, path))
        self.assertEqual(fetch(self.topical_url(), "PATCH")[0], 405)
        self.assertEqual(self.seeded_rows(), before)

    def test_a_write_from_another_origin_or_host_is_forbidden(self):
        for headers in ({"Origin": "https://evil.example"}, {"Origin": "null"}, {"Host": "evil.example"}):
            status, _ = fetch(self.topical_url(), "POST", {"name": "X"}, headers)
            self.assertEqual(status, 403, headers)
        self.assertEqual(self.topical_type_names(), [])

    def test_a_bad_body_is_a_400_naming_nothing_internal(self):
        for body, headers in (({"name": ""}, None), ({"name": "x" * 81}, None), ({"name": 5}, None),
                              ({"nom": "X"}, None), ({"name": "X"}, {"Content-Type": "text/plain"})):
            status, raw = fetch(self.topical_url(), "POST", body, headers)
            self.assertEqual((status, json.loads(raw)), (400, {"error": "bad_request"}), (body, headers))
        self.assertEqual(self.topical_type_names(), [])

    def test_refusals_map_to_registry_statuses(self):
        fetch(self.topical_url(), "POST", {"name": "Irony"})
        self.assertEqual(fetch(self.topical_url(), "POST", {"name": "IRONY"})[0], 409)
        self.assertEqual(fetch(self.topical_url("/99"), "DELETE")[0], 404)
        self.assertEqual(fetch(self.topical_url("/1/devices/99"), "PUT")[0], 404)
        self.assertEqual(fetch(self.topical_url("/abc"), "DELETE")[0], 404)

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
