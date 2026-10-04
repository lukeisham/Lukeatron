"""Smoke tests for items.py against throwaway on-disk databases built from schema.sql."""
import contextlib
import io
import sqlite3
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import grammar  # noqa: E402
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
        device = db.execute(
            "INSERT INTO devices (name, definition, form_node_id, "
            "function_node_id, popularity, topical_rank) VALUES (?, 'd', ?, ?, 90, NULL)",
            (name, form_link, ids["function"])).lastrowid
        db.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, ?)",
                   (device, ids["category"]))
        if multi_category:
            extra = db.execute("INSERT INTO nodes (hierarchy, name, definition) "
                               "VALUES ('category', 'Naming', 'd')").lastrowid
            db.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, ?)",
                       (device, extra))
    db.execute("INSERT INTO examples (device_id, body) VALUES (?, 'carpe *diem*')", (device,))
    db.commit()
    db.close()


def leaves(nodes: list) -> list:
    out = []
    for n in nodes:
        for c in n["children"]:
            out += [c] if c["kind"] == "device" else leaves([c])
    return out


def grammar_no_term() -> str:
    return grammar.NO_GRAMMAR_NAME


class ItemsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "rhetoric.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_happy_path_references_each_device_once_per_tree(self):
        build_db(self.db_path)
        payload = items.load_items(self.db_path)
        self.assertEqual(set(payload["trees"]), {"category", "form", "function", "topical", "grammar"})
        self.assertEqual(len(payload["devices"]), 2)
        for hierarchy in ("category", "form", "function", "topical"):
            tree = payload["trees"][hierarchy]
            self.assertEqual(sorted(l["id"] for l in leaves(tree)), [1, 2])
            for leaf in leaves(tree):
                self.assertIn(str(leaf["id"]), payload["devices"])
        anaphora = payload["devices"]["2"]
        self.assertEqual(anaphora["examples"], ["carpe *diem*"])
        self.assertEqual(anaphora["popularity"], 90)
        self.assertIsNone(anaphora["topical_rank"])
        self.assertEqual(anaphora["ai_confidence_rating"], "low")  # the schema default for an unrated device
        self.assertNotIn("medium", str(payload).lower())

    def test_payload_lists_real_quotes_only_with_their_source_and_date(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        db.execute("INSERT INTO examples (device_id, body, attribution, quote_date) "
                   "VALUES (2, '\"Ask not\" (Kennedy, 20 January 1961)', 'John F. Kennedy', '1961-01-20')")
        db.commit()
        db.close()
        quotes = items.load_items(self.db_path)["quotes"]
        self.assertEqual(quotes, [{"id": 2, "device_id": 2, "text": '"Ask not"', "source": "Kennedy, 20 January 1961",
                                   "author": "John F. Kennedy", "date": "1961-01-20"}])  # the constructed 'carpe diem' is not a quote

    def test_grammar_group_is_empty_until_a_device_has_an_explanation(self):
        build_db(self.db_path)
        payload = items.load_items(self.db_path)
        self.assertEqual(payload["trees"]["grammar"], [])
        self.assertIsNone(payload["devices"]["1"]["explanation"])

    def test_grammar_group_holds_only_explained_devices_with_the_rest_under_no_grammatical_term(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        clause = db.execute("INSERT INTO grammar_labels (name, definition) VALUES ('Clause', 'd')").lastrowid
        relative = db.execute("INSERT INTO grammar_labels (parent_id, name, definition) VALUES (?, 'Relative clause', 'd')",
                              (clause,)).lastrowid
        db.execute("INSERT INTO grammar_explanations (device_id, summary, function_example) VALUES (2, 'Repeats.', '*Anaphora* [x]')")
        db.execute("INSERT INTO device_labels (device_id, slot, label_id) VALUES (2, 'function', ?)", (relative,))
        db.execute("INSERT INTO device_labels (device_id, slot, label_id) VALUES (2, 'form', ?)", (relative,))  # one leaf, though in both slots
        db.commit()
        db.close()
        trees = items.load_items(self.db_path)["trees"]

        by_label = trees["grammar"]
        self.assertEqual([n["name"] for n in by_label], ["Clause", grammar_no_term()])
        self.assertEqual(by_label[0]["children"][0]["name"], "Relative clause")
        self.assertEqual(by_label[0]["children"][0]["children"], [{"kind": "device", "id": 2}])
        self.assertEqual(by_label[1]["id"], 0)

    def test_explanation_travels_with_its_device(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        clause = db.execute("INSERT INTO grammar_labels (name, definition) VALUES ('Clause', 'd')").lastrowid
        conjunction = db.execute("INSERT INTO grammar_labels (name, definition) VALUES ('Conjunction', 'd')").lastrowid
        db.execute("INSERT INTO grammar_explanations (device_id, summary, function_example, form_example) "
                   "VALUES (2, 'Repeats.', '*A* [x]', '*B* [y]')")
        db.executemany("INSERT INTO device_labels (device_id, slot, label_id) VALUES (2, ?, ?)",
                       [("function", clause), ("form", clause), ("form", conjunction)])
        db.commit()
        db.close()
        device = items.load_items(self.db_path)["devices"]["2"]
        self.assertEqual(device["explanation"], {
            "summary": "Repeats.",
            "function": {"labels": ["Clause"], "example": "*A* [x]"},
            "form": {"labels": ["Clause", "Conjunction"], "example": "*B* [y]"},
        })

    def test_an_empty_grammar_slot_travels_as_null(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        clause = db.execute("INSERT INTO grammar_labels (name, definition) VALUES ('Clause', 'd')").lastrowid
        db.execute("INSERT INTO grammar_explanations (device_id, summary, form_example) VALUES (2, 'Repeats.', '*B* [y]')")
        db.execute("INSERT INTO device_labels (device_id, slot, label_id) VALUES (2, 'form', ?)", (clause,))
        db.commit()
        db.close()
        explanation = items.load_items(self.db_path)["devices"]["2"]["explanation"]
        self.assertIsNone(explanation["function"])
        self.assertEqual(explanation["form"], {"labels": ["Clause"], "example": "*B* [y]"})

    def test_flipside_carries_its_fallacy_id_and_sorts_under_the_fallacy_name(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        metaphor = db.execute("SELECT id FROM devices WHERE name = 'Metaphor'").fetchone()[0]
        db.execute("INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity, flipside_of) "
                   "SELECT 'Aardvark Flip', 'd', form_node_id, function_node_id, 5, ? FROM devices WHERE id = ?",
                   (metaphor, metaphor))
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        flip = next(d for d in payload["devices"].values() if d["name"] == "Aardvark Flip")
        self.assertEqual(flip["flipside_of"], metaphor)
        self.assertIsNone(payload["devices"][str(metaphor)]["flipside_of"])
        form_names = [payload["devices"][str(leaf["id"])]["name"] for leaf in leaves(payload["trees"]["form"])]
        self.assertEqual(form_names, ["Anaphora", "Metaphor", "Aardvark Flip"])  # "Metaphor/Aardvark Flip" follows Metaphor

    def test_device_with_several_category_tags_appears_under_each(self):
        build_db(self.db_path, multi_category=True)
        payload = items.load_items(self.db_path)
        category = leaves(payload["trees"]["category"])
        self.assertEqual(sorted(l["id"] for l in category), [1, 1, 2, 2])
        self.assertEqual(len(leaves(payload["trees"]["form"])), 2)

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
