"""Smoke tests for server.py: a real server on an ephemeral port over a temp database."""
import json
import os
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


def fetch(url: str, method: str = "GET") -> tuple[int, bytes]:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method=method)) as r:
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
        self.assertEqual(total_leaves, 3 * len(payload["devices"]))

    def test_missing_database_returns_clean_json_error(self):
        self.db_path.unlink()
        status, body = fetch(self.base + "/api/items")
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body), {"error": "db_unavailable"})
        self.assertNotIn(b"Traceback", body)

    def test_write_verbs_refused(self):
        for method in ("POST", "PUT", "DELETE"):
            self.assertEqual(fetch(self.base + "/api/items", method)[0], 405)

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
