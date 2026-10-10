"""Smoke tests for schema.sql: happy path, FK guards, and the AC-3/AC-4 invariant queries."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

HIERARCHIES = ("templates", "brainstorming", "research", "topical")


class SchemaTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)

    def tearDown(self):
        self.db.close()

    def add_entry(self, name="Metaphor", kind="entry"):
        return self.db.execute("INSERT INTO entries (kind, name, definition) VALUES (?, ?, 'd')", (kind, name)).lastrowid

    def add_type(self, name="Figures"):
        return self.add_entry(name, "type")

    def place(self, hierarchy, parent, member):
        return self.db.execute("INSERT INTO placements (hierarchy, parent_id, member_id) VALUES (?, ?, ?)",
                               (hierarchy, parent, member)).lastrowid

    def seed_valid(self):
        figures, entry = self.add_type(), self.add_entry()
        for h in HIERARCHIES:
            self.place(h, figures, entry)
        return figures, entry

    def test_foreign_keys_pragma_is_on(self):
        self.assertEqual(self.db.execute("PRAGMA foreign_keys").fetchone()[0], 1)

    def test_schema_has_no_medium_column(self):
        columns = [row[1] for table in ("entries", "placements", "examples")
                   for row in self.db.execute(f"PRAGMA table_info({table})")]
        self.assertFalse([c for c in columns if "medium" in c.lower()])

    def test_example_attribution_defaults_to_unattributed_and_is_never_null(self):
        _, entry = self.seed_valid()
        self.db.execute("INSERT INTO examples (entry_id, body) VALUES (?, 'carpe *diem*')", (entry,))
        self.assertEqual(self.db.execute("SELECT attribution FROM examples").fetchone(), ("Unattributed",))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO examples (entry_id, body, attribution) VALUES (?, 'x', NULL)", (entry,))

    def test_quote_date_is_optional_and_must_be_a_year_a_full_date_or_a_year_bc(self):
        _, entry = self.seed_valid()
        for date in (None, "1863", "1863-11-19", "0060", "-0935"):
            self.db.execute("INSERT INTO examples (entry_id, body, quote_date) VALUES (?, 'x', ?)", (entry, date))
        for bad in ("c. 1600", "1863-11", "19 November 1863", "60", "-935", "-0935-01-01"):
            with self.assertRaises(sqlite3.IntegrityError, msg=bad):
                self.db.execute("INSERT INTO examples (entry_id, body, quote_date) VALUES (?, 'x', ?)", (entry, bad))

    def test_happy_path_reads_chain_back(self):
        figures, entry = self.seed_valid()
        self.db.execute("INSERT INTO examples (entry_id, body) VALUES (?, 'carpe *diem*')", (entry,))
        row = self.db.execute(
            "SELECT p.name, t.name, group_concat(pl.hierarchy), e.body FROM placements pl "
            "JOIN entries p ON p.id = pl.member_id JOIN entries t ON t.id = pl.parent_id "
            "JOIN examples e ON e.entry_id = p.id GROUP BY p.id"
        ).fetchone()
        self.assertEqual(row, ("Metaphor", "Figures", ",".join(HIERARCHIES), "carpe *diem*"))

    def test_an_entry_is_a_plain_entry_unless_it_is_made_a_type(self):
        self.assertEqual(self.db.execute("SELECT kind FROM entries WHERE id = ?", (self.add_entry(),)).fetchone(), ("entry",))
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_entry("Odd", "category")

    def test_a_placement_needs_a_known_hierarchy_and_real_entries(self):
        figures, entry = self.add_type(), self.add_entry()
        with self.assertRaises(sqlite3.IntegrityError):
            self.place("medium", figures, entry)
        with self.assertRaises(sqlite3.IntegrityError):
            self.place("topical", 999, entry)
        with self.assertRaises(sqlite3.IntegrityError):
            self.place("topical", figures, 999)

    def test_a_parent_must_be_a_type(self):
        topic, other = self.add_entry("A"), self.add_entry("B")
        with self.assertRaises(sqlite3.DatabaseError) as raised:
            self.place("topical", topic, other)
        self.assertIn("must be a type", str(raised.exception))

    def test_a_type_or_pattern_can_sit_at_the_top_level_but_only_once(self):
        figures = self.add_type()
        self.place("templates", None, figures)
        with self.assertRaises(sqlite3.IntegrityError):
            self.place("templates", None, figures)
        self.place("research", None, figures)  # another hierarchy is a different place

    def test_a_member_can_sit_under_several_types_but_not_the_same_one_twice(self):
        first, second, entry = self.add_type("First"), self.add_type("Second"), self.add_entry()
        self.place("topical", first, entry)
        self.place("topical", second, entry)
        with self.assertRaises(sqlite3.IntegrityError):
            self.place("topical", first, entry)

    def test_a_type_cannot_hold_itself_directly_or_through_others(self):
        a, b, c = self.add_type("A"), self.add_type("B"), self.add_type("C")
        with self.assertRaises(sqlite3.IntegrityError):
            self.place("topical", a, a)
        self.place("topical", a, b)
        self.place("topical", b, c)
        with self.assertRaises(sqlite3.DatabaseError) as raised:
            self.place("topical", c, a)
        self.assertIn("hold itself", str(raised.exception))
        self.place("research", c, a)  # the same pair is fine in another hierarchy

    def test_deleting_an_entry_removes_its_placements_but_not_what_it_held(self):
        figures, entry = self.add_type(), self.add_entry()
        self.place("topical", None, figures)
        self.place("topical", figures, entry)
        self.db.execute("DELETE FROM entry_review WHERE entry_id = ?", (figures,))  # the review ledger row goes first
        self.db.execute("DELETE FROM entries WHERE id = ?", (figures,))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM placements").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM entries WHERE id = ?", (entry,)).fetchone()[0], 1)

    def test_a_type_that_holds_something_cannot_become_a_plain_entry(self):
        figures, entry = self.seed_valid()
        with self.assertRaises(sqlite3.DatabaseError):
            self.db.execute("UPDATE entries SET kind = 'entry' WHERE id = ?", (figures,))
        self.db.execute("UPDATE entries SET kind = 'type' WHERE id = ?", (entry,))  # an entry may become a type

    def test_dangling_example_entry_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO examples (entry_id, body) VALUES (999, 'x')")




    def test_counterpart_links_to_its_base_and_is_optional(self):
        _, base = self.seed_valid()
        flip = self.add_entry("Flip")
        self.db.execute("UPDATE entries SET counterpart_of = ? WHERE id = ?", (base, flip))
        self.assertIsNone(self.db.execute(
            "SELECT counterpart_of FROM entries WHERE id = ?", (base,)).fetchone()[0])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE entries SET counterpart_of = 9999 WHERE id = ?", (flip,))



    def test_an_entry_needs_only_a_name_and_a_definition(self):
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        self.assertEqual(self.db.execute(
            "SELECT ai_confidence_rating FROM entries").fetchone(), ("low",))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO entries (name) VALUES ('No definition')")

    def test_a_new_entry_gets_a_review_row_and_a_credited_quote_is_counted(self):
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        self.assertEqual(self.db.execute("SELECT * FROM entry_review").fetchall(), [(1, 0, 0, 0)])
        self.db.execute("INSERT INTO examples (entry_id, body) VALUES (1, 'constructed')")
        self.db.execute("INSERT INTO examples (entry_id, body, attribution) VALUES (1, '\"q\" (Someone)', 'Someone')")
        self.assertEqual(self.db.execute("SELECT quote_changes FROM entry_review").fetchone(), (1,))
        self.db.execute("UPDATE examples SET body = '\"q2\" (Someone)' WHERE id = 2")
        self.assertEqual(self.db.execute("SELECT quote_changes FROM entry_review").fetchone(), (2,))

    def test_labels_nest_and_a_placement_goes_with_its_label_or_entry(self):
        self.db.execute("INSERT INTO entries (name, definition) VALUES ('Bare', 'd')")
        self.db.execute("INSERT INTO labels (name) VALUES ('Clause')")
        self.db.execute("INSERT INTO labels (parent_id, name) VALUES (1, 'Relative')")
        self.db.execute("INSERT INTO label_placements (label_id, entry_id) VALUES (2, 1)")
        self.db.execute("INSERT INTO label_placements (label_id, entry_id) VALUES (1, 1)")
        self.db.execute("DELETE FROM labels WHERE id = 2")
        self.assertEqual(self.db.execute("SELECT label_id FROM label_placements").fetchall(), [(1,)])
        self.db.execute("DELETE FROM label_placements")
        self.db.execute("INSERT INTO labels (name) VALUES ('Clause')")  # a label's name may repeat
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO label_placements (label_id, entry_id) VALUES (99, 1)")



if __name__ == "__main__":
    unittest.main()
