"""Smoke tests for items.py against throwaway on-disk databases built from schema.sql."""
import contextlib
import io
import sqlite3
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import items  # noqa: E402

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


def build_db(path: Path, *, mislink_form: bool = False) -> None:
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    ids = {}
    for h in ("category", "form", "function"):
        root = db.execute("INSERT INTO nodes (hierarchy, name, definition) VALUES (?, ?, 'd')",
                          (h, h.title())).lastrowid
        ids[h] = db.execute("INSERT INTO nodes (hierarchy, parent_id, name, definition) "
                            "VALUES (?, ?, ?, 'd')", (h, root, h.title() + " Type")).lastrowid
    form_link = ids["category"] if mislink_form else ids["form"]
    for name in ("Metaphor", "Anaphora"):
        device = db.execute(
            "INSERT INTO devices (name, definition, category_node_id, form_node_id, "
            "function_node_id, popularity, topical_rank) VALUES (?, 'd', ?, ?, ?, 90, NULL)",
            (name, ids["category"], form_link, ids["function"])).lastrowid
    db.execute("INSERT INTO examples (device_id, body) VALUES (?, 'carpe *diem*')", (device,))
    db.commit()
    db.close()


def leaves(nodes: list) -> list:
    out = []
    for n in nodes:
        for c in n["children"]:
            out += [c] if c["kind"] == "device" else leaves([c])
    return out


class ItemsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "rhetoric.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_happy_path_references_each_device_once_per_tree(self):
        build_db(self.db_path)
        payload = items.load_items(self.db_path)
        self.assertEqual(set(payload["trees"]), {"category", "form", "function"})
        self.assertEqual(len(payload["devices"]), 2)
        for tree in payload["trees"].values():
            self.assertEqual(sorted(l["id"] for l in leaves(tree)), [1, 2])
            for leaf in leaves(tree):
                self.assertIn(str(leaf["id"]), payload["devices"])
        anaphora = payload["devices"]["2"]
        self.assertEqual(anaphora["examples"], ["carpe *diem*"])
        self.assertEqual(anaphora["popularity"], 90)
        self.assertIsNone(anaphora["topical_rank"])
        self.assertNotIn("medium", str(payload).lower())

    def test_misfiled_device_left_out_of_affected_tree_with_warning(self):
        build_db(self.db_path, mislink_form=True)
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            payload = items.load_items(self.db_path)
        self.assertEqual(leaves(payload["trees"]["form"]), [])
        self.assertEqual(len(leaves(payload["trees"]["category"])), 2)
        self.assertEqual(len(leaves(payload["trees"]["function"])), 2)
        self.assertIn("not in form", err.getvalue())

    def test_missing_database_raises_and_creates_nothing(self):
        with self.assertRaises(sqlite3.OperationalError):
            items.load_items(self.db_path)
        self.assertFalse(self.db_path.exists())

    def test_connection_is_read_only(self):
        build_db(self.db_path)
        conn = items.connect_readonly(self.db_path)
        with self.assertRaises(sqlite3.OperationalError):
            conn.execute("DELETE FROM devices")
        conn.close()


if __name__ == "__main__":
    unittest.main()
