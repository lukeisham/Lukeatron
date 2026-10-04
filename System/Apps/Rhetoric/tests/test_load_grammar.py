"""load_grammar: checks both seed files before writing, then replaces the three grammar tables whole."""
import sqlite3
import unittest
from pathlib import Path

from seed import load_grammar
from seed.type_outline import parse_outline

SCHEMA = (Path(__file__).resolve().parent.parent / "schema.sql").read_text()

OUTLINE = """
- Clause — a group of words with a subject and a verb
  - Independent clause — a clause that can stand alone
  - Subordinate clause — a clause that cannot stand alone
    - Relative clause — a subordinate clause introduced by who, which or that
- Conjunction — a word that joins words or clauses
"""

LABELS = {"Clause", "Clause > Independent clause", "Clause > Subordinate clause",
          "Clause > Subordinate clause > Relative clause", "Conjunction"}


def make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    node = conn.execute("INSERT INTO nodes (hierarchy, name, definition) VALUES ('form', 'F', 'd')").lastrowid
    for name in ("Asyndeton", "Ad Hominem"):
        conn.execute("INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity) "
                     "VALUES (?, 'd', ?, ?, 50)", (name, node, node))
    return conn


def slot(labels=("Clause > Independent clause",), example="*He came* [independent clause], *he saw* [independent clause]"):
    return {"labels": list(labels), "example": example}


def record(**over):
    base = {"device": "Asyndeton", "summary": "Drops the conjunctions.", "function": slot(), "form": slot(("Conjunction",))}
    return {**base, **over}


class LoadGrammarTest(unittest.TestCase):
    def setUp(self):
        self.entries = parse_outline(OUTLINE)
        self.conn = make_db()

    def problems(self, records):
        names = {row[0] for row in self.conn.execute("SELECT name FROM devices")}
        return load_grammar.validate_labels(self.entries) + load_grammar.validate_devices(records, LABELS, names)

    def test_valid_input_has_no_problems(self):
        self.assertEqual(self.problems([record()]), [])

    def test_a_fourth_level_is_refused(self):
        deeper = parse_outline("- A — d\n  - B — d\n    - C — d\n      - D — too deep\n")
        self.assertTrue(any("4 levels deep" in p for p in load_grammar.validate_labels(deeper)))

    def test_a_label_needs_a_definition(self):
        self.assertTrue(any("needs a definition" in p for p in load_grammar.validate_labels(parse_outline("- Clause\n"))))

    def test_a_device_may_fill_just_one_slot(self):
        self.assertEqual(self.problems([record(form=None)]), [])
        self.assertEqual(self.problems([record(function={"labels": [], "example": ""})]), [])

    def test_device_problems_are_all_reported(self):
        found = self.problems([
            record(device="Nobody"),
            record(function=slot(["Clause > Missing"])),
            record(device="Ad Hominem", function=slot([]), form=slot(["Conjunction", "Conjunction"])),
            record(form=slot(example="no markup here")),
            record(summary="  "),
            record(function=None, form=None, device="Ad Hominem"),
        ])
        for fragment in ("no such device", "not in grammar-labels.md", "has an example but no labels", "lists a label twice",
                         "italic", "needs a summary", "listed twice", "fill at least one grammar slot"):
            self.assertTrue(any(fragment in p for p in found), fragment)

    def test_a_slot_with_labels_needs_an_example(self):
        found = self.problems([record(form=slot(example=""))])
        self.assertTrue(any("has labels but no example" in p for p in found))

    def test_write_replaces_the_tables_and_links_nested_labels(self):
        records = [record(function=slot(["Clause > Subordinate clause > Relative clause", "Conjunction"]), form=None)]
        with self.conn:
            load_grammar.write_grammar(self.conn, self.entries, records)
        parent_names = dict(self.conn.execute(
            "SELECT c.name, p.name FROM grammar_labels c LEFT JOIN grammar_labels p ON p.id = c.parent_id").fetchall())
        self.assertEqual(parent_names["Relative clause"], "Subordinate clause")
        self.assertIsNone(parent_names["Clause"])
        linked = [row[0] for row in self.conn.execute(
            "SELECT l.name FROM device_labels d JOIN grammar_labels l ON l.id = d.label_id ORDER BY l.name")]
        self.assertEqual(linked, ["Conjunction", "Relative clause"])

    def test_each_slot_keeps_its_own_labels_and_example(self):
        with self.conn:
            load_grammar.write_grammar(self.conn, self.entries, [record()])
        by_slot = self.conn.execute(
            "SELECT d.slot, l.name FROM device_labels d JOIN grammar_labels l ON l.id = d.label_id ORDER BY d.slot").fetchall()
        self.assertEqual(by_slot, [("form", "Conjunction"), ("function", "Independent clause")])
        examples = self.conn.execute("SELECT function_example, form_example FROM grammar_explanations").fetchone()
        self.assertEqual(examples[0], slot()["example"])
        with self.conn:
            load_grammar.write_grammar(self.conn, self.entries, [record(form=None)])
        self.assertIsNone(self.conn.execute("SELECT form_example FROM grammar_explanations").fetchone()[0])

    def test_a_label_cannot_use_an_unknown_slot(self):
        label = self.conn.execute("INSERT INTO grammar_labels (name, definition) VALUES ('Clause', 'd')").lastrowid
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO device_labels (device_id, slot, label_id) VALUES (1, 'other', ?)", (label,))

        with self.conn:  # a second run is a clean replacement, not an addition
            load_grammar.write_grammar(self.conn, self.entries, [])
        for table in ("device_labels", "grammar_explanations"):
            self.assertEqual(self.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0], 0)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM grammar_labels").fetchone()[0], 5)


if __name__ == "__main__":
    unittest.main()
