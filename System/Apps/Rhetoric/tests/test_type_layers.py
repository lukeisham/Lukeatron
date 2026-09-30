"""Smoke tests for seed/type_layers.py against in-memory databases, plus the shipped templates."""
import sqlite3
import sys
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_DIR))
from seed import category_roots, type_layers  # noqa: E402
from seed.type_outline import parse_outline  # noqa: E402

ROOTS = {name for _, _, name in category_roots.ROOTS}


def seeded_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript((APP_DIR / "schema.sql").read_text())
    category_roots.seed_roots(conn, category_roots.read_root_definitions())
    return conn


def load(conn, hierarchy, text):
    entries = parse_outline(text)
    with conn:
        type_layers.load_hierarchy(conn, hierarchy, entries)
    return entries


class TypeLayersTest(unittest.TestCase):
    def test_form_outline_loads_exactly_as_authored(self):
        conn = seeded_db()
        entries = load(conn, "form", "- Substitution — swaps\n  - Comparison — likens\n- Repetition — again\n")
        self.assertEqual(type_layers.unlisted_nodes(conn, "form", entries), [])
        self.assertEqual(type_layers.db_paths(conn, "form"),
                         {("Substitution",), ("Substitution", "Comparison"), ("Repetition",)})
        parent = conn.execute("SELECT parent_id FROM nodes WHERE name = 'Comparison'").fetchone()[0]
        self.assertEqual(conn.execute("SELECT name FROM nodes WHERE id = ?", (parent,)).fetchone()[0], "Substitution")

    def test_category_types_nest_under_seeded_roots_and_keep_source_definition(self):
        conn = seeded_db()
        before = conn.execute("SELECT definition FROM nodes WHERE name = 'Resemblance'").fetchone()[0]
        entries = load(conn, "category", "- Resemblance\n  - Metaphor — a comparison\n")
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM nodes WHERE hierarchy = 'category'").fetchone()[0], 9)
        self.assertEqual(conn.execute("SELECT definition FROM nodes WHERE name = 'Resemblance'").fetchone()[0], before)
        self.assertEqual(type_layers.unlisted_nodes(conn, "category", entries), [])

    def test_reload_is_idempotent_and_applies_an_edited_definition(self):
        conn = seeded_db()
        load(conn, "function", "- Clarity — makes plain\n")
        load(conn, "function", "- Clarity — makes things plain\n")
        rows = conn.execute("SELECT definition FROM nodes WHERE hierarchy = 'function'").fetchall()
        self.assertEqual(rows, [("makes things plain",)])

    def test_node_removed_from_the_outline_is_reported_not_deleted(self):
        conn = seeded_db()
        load(conn, "form", "- A — a\n- B — b\n")
        entries = load(conn, "form", "- A — a\n")
        self.assertEqual(type_layers.unlisted_nodes(conn, "form", entries), [("B",)])
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM nodes WHERE hierarchy = 'form'").fetchone()[0], 2)

    def test_validate_flags_unknown_root_missing_definition_and_duplicates(self):
        problems = type_layers.validate("category", parse_outline("- Bogus\n- Naming — nope\n"), ROOTS)
        self.assertEqual(len(problems), 2)
        problems = type_layers.validate("form", parse_outline("- A\n- B — b\n- B — b\n"), ROOTS)
        self.assertEqual(len(problems), 2)
        self.assertEqual(type_layers.validate("form", parse_outline("- A — a\n  - B — b\n"), ROOTS), [])

    def test_category_accepts_an_extra_root_that_carries_a_definition(self):
        conn = seeded_db()
        entries = load(conn, "category", "- Resemblance\n- Elocutio — style and language choice\n")
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM nodes WHERE hierarchy = 'category' AND parent_id IS NULL").fetchone()[0], 9)
        self.assertEqual(type_layers.unlisted_nodes(conn, "category", entries), [])

    def test_shipped_templates_parse_and_validate_clean(self):
        for hierarchy in type_layers.HIERARCHIES:
            entries = parse_outline(type_layers.outline_path(hierarchy).read_text())
            self.assertEqual(type_layers.validate(hierarchy, entries, ROOTS), [])
        category = parse_outline(type_layers.outline_path("category").read_text())
        self.assertTrue(ROOTS <= {e.name for e in category})


if __name__ == "__main__":
    unittest.main()
