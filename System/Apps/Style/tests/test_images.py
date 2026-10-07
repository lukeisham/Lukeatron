"""Thumbnails end to end: the `entry_images` table, the payload that carries them, and the read-only route that serves them."""
import json
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
import items  # noqa: E402
import server  # noqa: E402
from test_add_image import png  # noqa: E402
from test_items import build_db  # noqa: E402

SCHEMA = (ROOT / "schema.sql").read_text()


def add_row(db_path: Path, entry_id: int, file: str, role: str = "issue", caption: str = "", position: int = 0) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute("INSERT INTO entry_images (entry_id, file, role, caption, width, height, position) VALUES (?, ?, ?, ?, 40, 30, ?)",
                     (entry_id, file, role, caption, position))


class ImageTableTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Leading', 'd')")

    def insert(self, **fields):
        row = {"entry_id": 1, "file": "1-a.png", "role": "issue", "caption": "", "width": 40, "height": 30} | fields
        self.db.execute("INSERT INTO entry_images (entry_id, file, role, caption, width, height) VALUES (:entry_id, :file, :role, :caption, :width, :height)", row)

    def test_a_row_needs_a_known_entry_a_role_a_png_name_and_a_light_size(self):
        self.insert()
        bad = [dict(entry_id=9), dict(file="2-b.jpg"), dict(file="../x.png"), dict(file="a/b.png"), dict(file=".hidden.png"), dict(file="a..b.png"),
               dict(file="has space.png"), dict(file="3-c.png", role="before"), dict(file="4-d.png", width=481), dict(file="5-e.png", height=0)]
        for fields in bad:
            with self.assertRaises(sqlite3.IntegrityError, msg=fields):
                self.insert(**fields)

    def test_a_file_name_is_used_once_and_goes_with_its_entry(self):
        self.insert()
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert()
        self.db.execute("DELETE FROM entry_review")  # the review ledger has no cascade of its own
        self.db.execute("DELETE FROM entries")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM entry_images").fetchone()[0], 0)


class ImagePayloadTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "style.db"
        build_db(self.db_path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_each_entry_carries_its_images_in_the_order_filed_and_one_without_has_none(self):
        add_row(self.db_path, 2, "2-b.png", "fix", "Solved", position=1)
        add_row(self.db_path, 2, "2-a.png", "issue", "Problem", position=0)
        entries = items.load_items(self.db_path)["entries"]
        self.assertEqual([(i["file"], i["role"], i["caption"], i["width"], i["height"]) for i in entries["2"]["images"]],
                         [("2-a.png", "issue", "Problem", 40, 30), ("2-b.png", "fix", "Solved", 40, 30)])
        self.assertEqual(entries["1"]["images"], [])


class ImageRouteTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.db_path = self.dir / "style.db"
        build_db(self.db_path)
        (self.dir / "images").mkdir()
        (self.dir / "images" / "1-a.png").write_bytes(png(40, 30))
        (self.dir / "secret.txt").write_text("not for the web")
        self.httpd = server.create_httpd(port=0, db_path=self.db_path, images_dir=self.dir / "images")
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.tmp.cleanup()

    def get(self, path: str):
        try:
            with urllib.request.urlopen(self.base + path) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            with error:
                return error.code, error.headers, error.read()

    def test_a_filed_thumbnail_is_served_as_a_cacheable_png(self):
        status, headers, body = self.get("/images/1-a.png")
        self.assertEqual((status, headers["Content-Type"], body), (200, "image/png", png(40, 30)))
        self.assertIn("max-age", headers["Cache-Control"])

    def test_only_a_flat_png_name_is_a_route_and_a_missing_one_is_404(self):
        for path in ("/images/nope.png", "/images/1-a.jpg", "/images/%2e%2e/secret.txt", "/images/../secret.txt", "/images/", "/images/a/b.png"):
            status = self.get(path)[0]
            self.assertIn(status, (403, 404), path)
        self.assertEqual(self.get("/images/1-a.png")[0], 200)

    def test_images_cannot_be_written_through_the_server(self):
        for method in ("POST", "PUT", "DELETE"):
            request = urllib.request.Request(self.base + "/images/1-a.png", method=method, data=b"x")
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(request)
            self.assertEqual(caught.exception.code, 405)
            caught.exception.close()
        self.assertEqual(self.get("/images/1-a.png")[2], png(40, 30))


if __name__ == "__main__":
    unittest.main()
