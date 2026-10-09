"""Smoke tests for seed/category_roots.py: real source file read, in-memory database written."""
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_DIR))
from seed import category_roots  # noqa: E402


def memory_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript((APP_DIR / "schema.sql").read_text())
    return conn


NEEDS_SOURCE = unittest.skipUnless(category_roots.TEXTUAL_DATABASE.exists(), "textual_rhetoric_database.json is no longer on disk")


class CategoryRootsTest(unittest.TestCase):
    @NEEDS_SOURCE
    def test_reads_all_eight_roots_with_definitions_from_the_real_source(self):
        roots = category_roots.read_root_definitions()
        self.assertEqual([name for name, _ in roots], [r[2] for r in category_roots.ROOTS])
        self.assertEqual(len(roots), 8)
        self.assertTrue(all(definition.strip() for _, definition in roots))
        self.assertEqual(roots[0][0], "Resemblance")
        self.assertIn("comparing two distinct things", roots[0][1])

    @NEEDS_SOURCE
    def test_seeding_gives_eight_parentless_category_roots(self):
        conn = memory_db()
        added = category_roots.seed_roots(conn, category_roots.read_root_definitions())
        self.assertEqual(added, 8)
        self.assertEqual(category_roots.category_root_count(conn), 8)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM nodes WHERE hierarchy != 'category'").fetchone()[0], 0)

    @NEEDS_SOURCE
    def test_rerun_adds_nothing(self):
        conn = memory_db()
        roots = category_roots.read_root_definitions()
        category_roots.seed_roots(conn, roots)
        self.assertEqual(category_roots.seed_roots(conn, roots), 0)
        self.assertEqual(category_roots.category_root_count(conn), 8)

    def test_missing_section_raises_and_seeds_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "db.json"
            source.write_text(json.dumps({"tropes": {}, "fallacies": {}}))
            with self.assertRaises(KeyError):
                category_roots.read_root_definitions(source)


if __name__ == "__main__":
    unittest.main()
