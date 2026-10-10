"""Smoke tests for items.py against throwaway on-disk databases built from schema.sql."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import items  # noqa: E402

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()


HIERARCHIES = ("templates", "brainstorming", "research", "topical")


def add_type(db, name, *, hierarchy=None, parent=None) -> int:
    type_id = db.execute("INSERT INTO entries (kind, name, definition) VALUES ('type', ?, 'd')", (name,)).lastrowid
    if hierarchy:
        db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES (?, ?, ?)", (hierarchy, parent, type_id))
    return type_id


def build_db(path: Path, *, multi_tag: bool = False) -> None:
    """Entries 1 (Metaphor) and 2 (Anaphora) are forms; each hierarchy has a root type holding a sub type that holds both."""
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    forms = [db.execute("INSERT INTO entries (name, definition) VALUES (?, 'd')", (name,)).lastrowid
                for name in ("Metaphor", "Anaphora")]
    for h in HIERARCHIES:
        root = add_type(db, h.title(), hierarchy=h)
        sub = add_type(db, h.title() + " Type", hierarchy=h, parent=root)
        for form in forms:
            db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES (?, ?, ?)", (h, sub, form))
    if multi_tag:
        naming = add_type(db, "Naming", hierarchy="templates")
        for form in forms:
            db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES ('templates', ?, ?)", (naming, form))
    db.execute("INSERT INTO examples (entry_id, body) VALUES (?, 'carpe *diem*')", (forms[-1],))
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
        self.db_path = Path(self.tmp.name) / "logic.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_happy_path_references_each_entry_once_per_tree(self):
        build_db(self.db_path)
        payload = items.load_items(self.db_path)
        self.assertEqual(set(payload["trees"]), {*HIERARCHIES, "labels"})
        self.assertEqual(sum(e["kind"] == "entry" for e in payload["entries"].values()), 2)
        for hierarchy in HIERARCHIES:
            tree = payload["trees"][hierarchy]
            self.assertEqual(sorted(l["id"] for l in leaves(tree)), [1, 2])
            for leaf in leaves(tree):
                self.assertIn(str(leaf["id"]), payload["entries"])
        anaphora = payload["entries"]["2"]
        self.assertEqual(anaphora["examples"], ["carpe *diem*"])
        self.assertNotIn("popularity", anaphora)
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
        db.execute("INSERT INTO entries (name, definition, counterpart_of) VALUES ('Aardvark Flip', 'd', ?)", (metaphor,))
        flip_id = db.execute("SELECT id FROM entries WHERE name = 'Aardvark Flip'").fetchone()[0]
        db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) "
                   "SELECT hierarchy, parent_id, ? FROM placements WHERE member_id = ?", (flip_id, metaphor))
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        flip = next(d for d in payload["entries"].values() if d["name"] == "Aardvark Flip")
        self.assertEqual(flip["counterpart_of"], metaphor)
        self.assertIsNone(payload["entries"][str(metaphor)]["counterpart_of"])
        form_names = [payload["entries"][str(leaf["id"])]["name"] for leaf in leaves(payload["trees"]["templates"])]
        self.assertEqual(form_names, ["Anaphora", "Metaphor", "Aardvark Flip"])  # "Metaphor/Aardvark Flip" follows Metaphor

    def test_a_pattern_placed_under_several_types_appears_under_each(self):
        build_db(self.db_path, multi_tag=True)
        payload = items.load_items(self.db_path)
        templates = leaves(payload["trees"]["templates"])
        self.assertEqual(sorted(l["id"] for l in templates), [1, 1, 2, 2])
        self.assertEqual(len(leaves(payload["trees"]["topical"])), 2)

    def test_a_placement_in_one_hierarchy_does_not_leak_into_another(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        db.execute("DELETE FROM placements WHERE hierarchy = 'research'")
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        self.assertEqual(payload["trees"]["research"], [])
        self.assertEqual(len(leaves(payload["trees"]["templates"])), 2)

    def test_a_type_is_a_heading_with_its_entry_id_and_holds_types_then_patterns(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        sub = db.execute("SELECT id FROM entries WHERE name = 'Templates Type'").fetchone()[0]
        inner = add_type(db, "Zeta Inner", hierarchy="templates", parent=sub)
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        root = payload["trees"]["templates"][0]
        self.assertEqual((root["kind"], root["type"], root["name"]), ("node", True, "Templates"))
        self.assertEqual(payload["entries"][str(root["id"])]["kind"], "type")
        held = root["children"][0]["children"]
        self.assertEqual([(c["kind"], c["id"]) for c in held], [("node", inner), ("entry", 2), ("entry", 1)])

    def test_a_type_can_sit_in_two_hierarchies_and_under_two_parents(self):
        build_db(self.db_path)
        db = sqlite3.connect(self.db_path)
        shared = add_type(db, "Shared", hierarchy="templates")
        db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES ('research', NULL, ?)", (shared,))
        other = db.execute("SELECT id FROM entries WHERE name = 'Templates'").fetchone()[0]
        db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES ('templates', ?, ?)", (other, shared))
        db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES ('templates', ?, 1)", (shared,))
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        ids = lambda tree: sorted(n["id"] for n in tree if n["kind"] == "node")
        self.assertIn(shared, ids(payload["trees"]["templates"]))
        self.assertIn(shared, ids(payload["trees"]["research"]))
        top = next(n for n in payload["trees"]["templates"] if n["id"] == other)
        inside = next(n for n in top["children"] if n["id"] == shared)
        self.assertEqual(inside["children"], [{"kind": "entry", "id": 1}])

    def test_a_database_with_nothing_in_it_loads_as_empty_trees(self):
        sqlite3.connect(self.db_path).executescript(SCHEMA)
        payload = items.load_items(self.db_path)
        self.assertEqual(payload, {"trees": {**{h: [] for h in HIERARCHIES}, "labels": []}, "entries": {}, "quotes": []})

    def test_an_entry_with_no_placement_loads_and_sits_in_no_tree(self):
        db = sqlite3.connect(self.db_path)
        db.executescript(SCHEMA)
        db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        db.commit()
        db.close()
        payload = items.load_items(self.db_path)
        self.assertEqual(payload["entries"]["1"]["ai_confidence_rating"], "low")
        self.assertEqual(payload["entries"]["1"]["kind"], "entry")
        self.assertEqual([payload["trees"][h] for h in HIERARCHIES], [[]] * 4)

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
