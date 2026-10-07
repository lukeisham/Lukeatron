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


def build_db(path: Path, *, mislink_form: bool = False, multi_category: bool = False) -> None:
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
        entry = db.execute(
            "INSERT INTO entries (name, definition, form_node_id, "
            "function_node_id, popularity) VALUES (?, 'd', ?, ?, 90)",
            (name, form_link, ids["function"])).lastrowid
        db.execute("INSERT INTO entry_categories (entry_id, node_id) VALUES (?, ?)",
                   (entry, ids["category"]))
        if multi_category:
            extra = db.execute("INSERT INTO nodes (hierarchy, name, definition) "
                               "VALUES ('category', 'Naming', 'd')").lastrowid
            db.execute("INSERT INTO entry_categories (entry_id, node_id) VALUES (?, ?)",
                       (entry, extra))
    db.execute("INSERT INTO examples (entry_id, body) VALUES (?, 'carpe *diem*')", (entry,))
    db.commit()
    db.close()


def leaves(nodes: list) -> list:
    out = []
    for n in nodes:
        for c in n["children"]:
            out += [c] if c["kind"] == "entry" else leaves([c])
    return out


class ItemsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "grammar.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_happy_path_references_each_entry_once_per_tree(self):
        build_db(self.db_path)
        payload = items.load_items(self.db_path)
        self.assertEqual(set(payload["trees"]), {"category", "form", "function", "labels"})
        self.assertEqual(len(payload["entries"]), 2)
        for hierarchy in ("category", "form", "function"):
            tree = payload["trees"][hierarchy]
            self.assertEqual(sorted(l["id"] for l in leaves(tree)), [1, 2])
            for leaf in leaves(tree):
                self.assertIn(str(leaf["id"]), payload["entries"])
        anaphora = payload["entries"]["2"]
        self.assertEqual(anaphora["examples"], ["carpe *diem*"])
        self.assertEqual(anaphora["popularity"], 90)
        self.assertEqual(anaphora["ai_confidence_rating"], "low")  # the schema default for an unrated entry
        self.assertNotIn("medium", str(payload).lower())

    def test_payload_lists_real_quotes_only_with_their_source_and_date(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        db.execute("INSERT INTO examples (entry_id, body, attribution, quote_date) "
                   "VALUES (2, '\"Ask not\" (Kennedy, 20 January 1961)', 'John F. Kennedy', '1961-01-20')")
        db.commit()
        db.close()
        quotes = items.load_items(self.db_path)["quotes"]
        self.assertEqual(quotes, [{"id": 2, "entry_id": 2, "text": '"Ask not"', "source": "Kennedy, 20 January 1961",
                                   "author": "John F. Kennedy", "date": "1961-01-20"}])  # the constructed 'carpe diem' is not a quote

    def test_an_entry_lists_its_ai_example_before_its_real_quote(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        db.execute("DELETE FROM examples")
        db.execute("INSERT INTO examples (entry_id, body, attribution) VALUES (2, '\"Ask not\" (Kennedy, 1961)', 'John F. Kennedy')")
        db.execute("INSERT INTO examples (entry_id, body) VALUES (2, 'carpe *diem*')")  # higher id, still listed first
        db.commit()
        db.close()
        self.assertEqual(items.load_items(self.db_path)["entries"]["2"]["examples"],
                         ["carpe *diem*", '"Ask not" (Kennedy, 1961)'])

    def test_labels_group_is_empty_until_a_label_is_added(self):
        build_db(self.db_path)
        payload = items.load_items(self.db_path)
        self.assertEqual(payload["trees"]["labels"], [])
        self.assertNotIn("explanation", payload["entries"]["1"])

    def test_labels_group_keeps_every_label_with_its_entries_in_the_saved_order(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        clause = db.execute("INSERT INTO labels (name, definition, position) VALUES ('Clause', 'a group of words', 0)").lastrowid
        db.execute("INSERT INTO labels (name, definition, position) VALUES ('Phrase', 'p', 1)")
        relative = db.execute("INSERT INTO labels (parent_id, name, definition) VALUES (?, 'Relative clause', 'd')",
                              (clause,)).lastrowid
        db.execute("INSERT INTO label_placements (label_id, entry_id, position) VALUES (?, 2, 0)", (relative,))
        db.execute("INSERT INTO label_placements (label_id, entry_id, position) VALUES (?, 2, 0)", (clause,))  # an entry at a second level too
        db.execute("INSERT INTO label_placements (label_id, entry_id, position) VALUES (?, 1, 1)", (clause,))
        db.commit()
        db.close()
        tree = items.load_items(self.db_path)["trees"]["labels"]

        self.assertEqual([n["name"] for n in tree], ["Clause", "Phrase"])  # empty labels stay, nothing is added
        self.assertEqual(tree[0]["definition"], "a group of words")
        self.assertEqual([c["kind"] for c in tree[0]["children"]], ["node", "entry", "entry"])  # sub-labels first
        self.assertEqual([c["id"] for c in tree[0]["children"][1:]], [2, 1])
        self.assertEqual(tree[0]["children"][0]["children"], [{"kind": "entry", "id": 2}])

    def test_counterpart_carries_its_base_id_and_sorts_under_the_base_name(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        metaphor = db.execute("SELECT id FROM entries WHERE name = 'Metaphor'").fetchone()[0]
        db.execute("INSERT INTO entries (name, definition, form_node_id, function_node_id, popularity, counterpart_of) "
                   "SELECT 'Aardvark Flip', 'd', form_node_id, function_node_id, 5, ? FROM entries WHERE id = ?",
                   (metaphor, metaphor))
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        flip = next(d for d in payload["entries"].values() if d["name"] == "Aardvark Flip")
        self.assertEqual(flip["counterpart_of"], metaphor)
        self.assertIsNone(payload["entries"][str(metaphor)]["counterpart_of"])
        form_names = [payload["entries"][str(leaf["id"])]["name"] for leaf in leaves(payload["trees"]["form"])]
        self.assertEqual(form_names, ["Anaphora", "Metaphor", "Aardvark Flip"])  # "Metaphor/Aardvark Flip" follows Metaphor

    def test_entry_with_several_category_tags_appears_under_each(self):
        build_db(self.db_path, multi_category=True)
        payload = items.load_items(self.db_path)
        category = leaves(payload["trees"]["category"])
        self.assertEqual(sorted(l["id"] for l in category), [1, 1, 2, 2])
        self.assertEqual(len(leaves(payload["trees"]["form"])), 2)

    def test_misfiled_entry_left_out_of_affected_tree_with_warning(self):
        build_db(self.db_path, mislink_form=True)
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            payload = items.load_items(self.db_path)
        self.assertEqual(leaves(payload["trees"]["form"]), [])
        self.assertEqual(len(leaves(payload["trees"]["category"])), 2)
        self.assertEqual(len(leaves(payload["trees"]["function"])), 2)
        self.assertIn("not in form", err.getvalue())

    def test_a_database_with_nothing_in_it_loads_as_empty_trees(self):
        sqlite3.connect(self.db_path).executescript(SCHEMA)
        payload = items.load_items(self.db_path)
        self.assertEqual(payload, {"trees": {"category": [], "form": [], "function": [], "labels": []}, "entries": {}, "quotes": []})

    def test_an_entry_not_yet_scored_or_classified_loads_and_sits_in_no_form_or_function_tree(self):
        db = sqlite3.connect(self.db_path)
        db.executescript(SCHEMA)
        db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        self.assertIsNone(payload["entries"]["1"]["popularity"])
        self.assertEqual(payload["entries"]["1"]["ai_confidence_rating"], "low")
        self.assertEqual(leaves(payload["trees"]["form"]) + leaves(payload["trees"]["function"]), [])

    def test_missing_database_raises_and_creates_nothing(self):
        with self.assertRaises(sqlite3.OperationalError):
            items.load_items(self.db_path)
        self.assertFalse(self.db_path.exists())

    def test_connection_is_read_only(self):
        build_db(self.db_path)
        conn = items.connect_readonly(self.db_path)
        with self.assertRaises(sqlite3.OperationalError):
            conn.execute("DELETE FROM entries")
        conn.close()


if __name__ == "__main__":
    unittest.main()
