"""Tests for share/build_bundle.py, the complete-share-bundle builder.

Builds the real bundle into a temp folder and checks what is (and is not) in it. Needs node, as the app's own
test suite does. No network.

Run: python3 -m unittest tests.test_build_bundle -v
"""

from __future__ import annotations

import json
import sys
import unittest
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "share"))

import build_bundle  # noqa: E402  (path set above)


class BundleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = TemporaryDirectory()
        cls.target = build_bundle.build_bundle(ROOT, Path(cls._tmp.name))
        cls.archive = zipfile.ZipFile(cls.target)
        cls.names = cls.archive.namelist()
        cls.top = cls.names[0].split("/")[0]

    @classmethod
    def tearDownClass(cls):
        cls.archive.close()
        cls._tmp.cleanup()

    def has(self, rel):
        return f"{self.top}/{rel}" in self.names

    def test_carries_the_app_data_and_favicons(self):
        for rel in ("READ ME FIRST.txt", "Storytelling.html", "Start Storytelling.command", "server.py", "app/index.html",
                    "app/data/elements.js", "data/elements.json", "data/library.json", "data/added-sources.json",
                    "favicons/favicon.svg", "favicons/favicon-32.png", "favicons/apple-touch-icon.png"):
            self.assertTrue(self.has(rel), rel)

    def test_leaves_out_working_files(self):
        for name in self.names:
            for banned in ("/tests/", "/verify/", "/reference/", "/share/", "__pycache__", ".DS_Store", "app-decisions.md", "wishlist.md"):
                self.assertNotIn(banned, name)

    def test_launcher_stays_executable(self):
        mode = self.archive.getinfo(f"{self.top}/Start Storytelling.command").external_attr >> 16
        self.assertTrue(mode & 0o100)

    def test_json_data_matches_the_app(self):
        data = json.loads(self.archive.read(f"{self.top}/data/elements.json"))
        self.assertEqual(len(data["elements"]), 217)
        self.assertEqual(len(json.loads(self.archive.read(f"{self.top}/data/library.json"))), 12)

    def test_single_file_is_self_contained(self):
        html = self.archive.read(f"{self.top}/Storytelling.html").decode("utf-8")
        self.assertIn('rel="apple-touch-icon" href="data:image/png', html)
        self.assertNotIn('href="favicon', html)

    def test_same_content_gives_same_bytes(self):
        with TemporaryDirectory() as again:
            second = build_bundle.build_bundle(ROOT, Path(again))
            self.assertEqual(second.read_bytes(), self.target.read_bytes())


if __name__ == "__main__":
    unittest.main()
