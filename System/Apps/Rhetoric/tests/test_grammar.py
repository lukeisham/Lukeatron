"""Smoke tests for grammar.py over throwaway databases built from schema.sql."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import grammar  # noqa: E402
import items  # noqa: E402
from test_items import build_db  # noqa: E402


def names(nodes: list[dict]) -> list[str]:
    return [n["name"] for n in nodes if n["kind"] == "node"]


def device_ids(node: dict) -> list[int]:
    return [c["id"] for c in node["children"] if c["kind"] == "device"]


class GrammarTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "rhetoric.db"
        build_db(self.db_path)  # devices 1 (Metaphor) and 2 (Anaphora)

    def tearDown(self):
        self.tmp.cleanup()

    def tree(self) -> list[dict]:
        return items.load_grammar(self.db_path)

    def test_a_label_carries_its_explanation_and_a_new_one_goes_last(self):
        grammar.create_label(self.db_path, "Clause", "a group of words with a subject and a verb")
        grammar.create_label(self.db_path, "Phrase", "a group of words without one")
        self.assertEqual(names(self.tree()), ["Clause", "Phrase"])
        self.assertEqual(self.tree()[0]["definition"], "a group of words with a subject and a verb")

    def test_labels_nest_four_levels_and_a_fifth_is_refused(self):
        grammar.create_label(self.db_path, "Clause", "d")
        grammar.create_label(self.db_path, "Subordinate", "d", 1)
        grammar.create_label(self.db_path, "Relative", "d", 2)
        grammar.create_label(self.db_path, "Restrictive", "d", 3)
        self.assertEqual(names(self.tree()[0]["children"][0]["children"]), ["Relative"])
        self.assertEqual(names(self.tree()[0]["children"][0]["children"][0]["children"]), ["Restrictive"])
        with self.assertRaises(grammar.GrammarError) as refused:
            grammar.create_label(self.db_path, "Too deep", "d", 4)
        self.assertEqual(refused.exception.code, "bad_request")
        with self.assertRaises(grammar.GrammarError) as unknown:
            grammar.create_label(self.db_path, "Orphan", "d", 99)
        self.assertEqual(unknown.exception.code, "not_found")

    def test_a_sibling_name_is_unique_case_blind_but_free_elsewhere(self):
        grammar.create_label(self.db_path, "Clause", "d")
        grammar.create_label(self.db_path, "Phrase", "d")
        with self.assertRaises(grammar.GrammarError) as clash:
            grammar.create_label(self.db_path, "CLAUSE", "d")
        self.assertEqual(clash.exception.code, "conflict")
        grammar.create_label(self.db_path, "Clause", "d", 2)  # under another label it is a different sibling set
        with self.assertRaises(grammar.GrammarError):
            grammar.edit_label(self.db_path, 2, "clause", "d")  # renaming Phrase onto Clause
        grammar.edit_label(self.db_path, 1, "CLAUSE", "new explanation")  # its own name is not a clash
        self.assertEqual((self.tree()[0]["name"], self.tree()[0]["definition"]), ("CLAUSE", "new explanation"))

    def test_moving_a_label_reorders_its_siblings_only(self):
        for name in ("A", "B", "C"):
            grammar.create_label(self.db_path, name, "d")
        grammar.create_label(self.db_path, "Child", "d", 1)
        grammar.move_label(self.db_path, 3, 0)
        self.assertEqual(names(self.tree()), ["C", "A", "B"])
        grammar.move_label(self.db_path, 3, 99)
        self.assertEqual(names(self.tree()), ["A", "B", "C"])
        self.assertEqual(names(self.tree()[0]["children"]), ["Child"])

    def test_a_device_can_sit_under_several_labels_at_different_levels(self):
        grammar.create_label(self.db_path, "Clause", "d")
        grammar.create_label(self.db_path, "Relative", "d", 1)
        grammar.add_placement(self.db_path, 1, 2)
        grammar.add_placement(self.db_path, 2, 2)
        clause = self.tree()[0]
        self.assertEqual(device_ids(clause), [2])
        self.assertEqual(device_ids(clause["children"][0]), [2])
        grammar.add_placement(self.db_path, 1, 2)  # already there: nothing changes
        self.assertEqual(device_ids(self.tree()[0]), [2])

    def test_devices_keep_the_order_they_were_placed_and_can_be_inserted_or_moved(self):
        grammar.create_label(self.db_path, "Clause", "d")
        grammar.add_placement(self.db_path, 1, 1)
        grammar.add_placement(self.db_path, 1, 2)
        self.assertEqual(device_ids(self.tree()[0]), [1, 2])
        grammar.add_placement(self.db_path, 1, 2, 0)
        self.assertEqual(device_ids(self.tree()[0]), [2, 1])

    def test_removing_a_placement_keeps_the_device_and_a_stale_label_is_an_error(self):
        grammar.create_label(self.db_path, "Clause", "d")
        grammar.add_placement(self.db_path, 1, 1)
        grammar.remove_placement(self.db_path, 1, 1)
        grammar.remove_placement(self.db_path, 1, 1)  # idempotent
        self.assertEqual(device_ids(self.tree()[0]), [])
        self.assertEqual(len(items.load_items(self.db_path)["devices"]), 2)
        with self.assertRaises(grammar.GrammarError):
            grammar.remove_placement(self.db_path, 99, 1)
        with self.assertRaises(grammar.GrammarError):
            grammar.add_placement(self.db_path, 1, 99)
        with self.assertRaises(grammar.GrammarError):
            grammar.add_placement(self.db_path, 99, 1)

    def test_deleting_a_label_takes_its_placements_but_is_refused_while_it_has_sub_labels(self):
        grammar.create_label(self.db_path, "Clause", "d")
        grammar.create_label(self.db_path, "Relative", "d", 1)
        grammar.add_placement(self.db_path, 2, 1)
        with self.assertRaises(grammar.GrammarError) as refused:
            grammar.delete_label(self.db_path, 1)
        self.assertEqual(refused.exception.code, "conflict")
        grammar.delete_label(self.db_path, 2)
        self.assertEqual(names(self.tree()), ["Clause"])
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM grammar_placements").fetchone()[0], 0)
        with self.assertRaises(grammar.GrammarError):
            grammar.delete_label(self.db_path, 2)


if __name__ == "__main__":
    unittest.main()
