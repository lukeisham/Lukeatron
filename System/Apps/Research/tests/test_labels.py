"""Smoke tests for labels.py over throwaway databases built from schema.sql."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import labels  # noqa: E402
import items  # noqa: E402
from test_items import build_db  # noqa: E402


def names(nodes: list[dict]) -> list[str]:
    return [n["name"] for n in nodes if n["kind"] == "node"]


def entry_ids(node: dict) -> list[int]:
    return [c["id"] for c in node["children"] if c["kind"] == "entry"]


class LabelsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "research.db"
        build_db(self.db_path)  # entries 1 (Metaphor) and 2 (Anaphora)

    def tearDown(self):
        self.tmp.cleanup()

    def tree(self) -> list[dict]:
        return items.load_labels(self.db_path)

    def test_a_label_carries_its_explanation_and_a_new_one_goes_last(self):
        labels.create_label(self.db_path, "Clause", "a group of words with a subject and a verb")
        labels.create_label(self.db_path, "Phrase", "a group of words without one")
        self.assertEqual(names(self.tree()), ["Clause", "Phrase"])
        self.assertEqual(self.tree()[0]["definition"], "a group of words with a subject and a verb")

    def test_labels_nest_five_levels_and_a_sixth_is_refused(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.create_label(self.db_path, "Subordinate", "d", 1)
        labels.create_label(self.db_path, "Relative", "d", 2)
        labels.create_label(self.db_path, "Restrictive", "d", 3)
        labels.create_label(self.db_path, "Reduced", "d", 4)
        self.assertEqual(names(self.tree()[0]["children"][0]["children"]), ["Relative"])
        self.assertEqual(names(self.tree()[0]["children"][0]["children"][0]["children"]), ["Restrictive"])
        with self.assertRaises(labels.LabelError) as refused:
            labels.create_label(self.db_path, "Too deep", "d", 5)
        self.assertEqual(refused.exception.code, "bad_request")
        with self.assertRaises(labels.LabelError) as unknown:
            labels.create_label(self.db_path, "Orphan", "d", 99)
        self.assertEqual(unknown.exception.code, "not_found")

    def test_names_may_repeat_among_siblings_and_elsewhere(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.create_label(self.db_path, "Phrase", "d")
        labels.create_label(self.db_path, "CLAUSE", "d")  # a sibling with the same name, case apart
        labels.create_label(self.db_path, "Clause", "d", 2)  # and under another label
        labels.edit_label(self.db_path, 2, "clause", "d")  # renaming Phrase onto Clause
        labels.edit_label(self.db_path, 1, "CLAUSE", "new explanation")
        self.assertEqual((self.tree()[0]["name"], self.tree()[0]["definition"]), ("CLAUSE", "new explanation"))

    def test_a_label_needs_no_explanation_and_editing_can_leave_or_clear_it(self):
        labels.create_label(self.db_path, "Clause", None)
        labels.create_label(self.db_path, "Phrase", "")
        self.assertEqual([n["definition"] for n in self.tree()], ["", ""])
        labels.edit_label(self.db_path, 1, "Clause", "a group of words with a verb")
        labels.edit_label(self.db_path, 1, "Main clause")  # no explanation given: the saved one stays
        self.assertEqual((self.tree()[0]["name"], self.tree()[0]["definition"]), ("Main clause", "a group of words with a verb"))
        labels.edit_label(self.db_path, 1, "Main clause", "")  # blank clears it
        self.assertEqual(self.tree()[0]["definition"], "")

    def test_moving_a_label_reorders_its_siblings_only(self):
        for name in ("A", "B", "C"):
            labels.create_label(self.db_path, name, "d")
        labels.create_label(self.db_path, "Child", "d", 1)
        labels.move_label(self.db_path, 3, 0)
        self.assertEqual(names(self.tree()), ["C", "A", "B"])
        labels.move_label(self.db_path, 3, 99)
        self.assertEqual(names(self.tree()), ["A", "B", "C"])
        self.assertEqual(names(self.tree()[0]["children"]), ["Child"])

    def test_a_label_can_move_to_another_parent_with_what_is_beneath_it(self):
        for name in ("A", "B"):
            labels.create_label(self.db_path, name, "d")
        labels.create_label(self.db_path, "Sub", "d", 1)
        labels.create_label(self.db_path, "Leaf", "d", 3)
        labels.add_placement(self.db_path, 3, 1)
        labels.move_label(self.db_path, 3, 0, 2)  # Sub (with Leaf and its entry) goes under B
        a, b = self.tree()
        self.assertEqual((names(a["children"]), names(b["children"])), ([], ["Sub"]))
        self.assertEqual(names(b["children"][0]["children"]), ["Leaf"])
        self.assertEqual(entry_ids(b["children"][0]), [1])  # Sub keeps its own entry
        labels.move_label(self.db_path, 3, 1, 0)  # to the top level, after A
        self.assertEqual(names(self.tree()), ["A", "Sub", "B"])
        labels.move_label(self.db_path, 3, 0)  # no parent given: stays where it is
        self.assertEqual(names(self.tree()), ["Sub", "A", "B"])

    def test_moving_a_label_closes_the_gap_it_leaves_and_inserts_at_the_index(self):
        for name in ("A", "B"):
            labels.create_label(self.db_path, name, "d")
        for name in ("x", "y", "z"):
            labels.create_label(self.db_path, name, "d", 1)
        labels.create_label(self.db_path, "p", "d", 2)
        labels.move_label(self.db_path, 4, 0, 2)  # y goes first under B
        a, b = self.tree()
        self.assertEqual((names(a["children"]), names(b["children"])), (["x", "z"], ["y", "p"]))
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual(conn.execute("SELECT position FROM labels WHERE parent_id = 1 ORDER BY position").fetchall(), [(0,), (1,)])

    def test_a_move_is_refused_into_itself_past_the_depth_or_onto_a_name(self):
        labels.create_label(self.db_path, "A", "d")           # 1
        labels.create_label(self.db_path, "B", "d", 1)        # 2
        labels.create_label(self.db_path, "C", "d", 2)        # 3
        labels.create_label(self.db_path, "D", "d", 3)        # 4
        labels.create_label(self.db_path, "E", "d", 4)        # 5  (five levels)
        labels.create_label(self.db_path, "Other", "d")       # 6
        labels.create_label(self.db_path, "Other2", "d", 6)   # 7
        cases = [
            (lambda: labels.move_label(self.db_path, 1, 0, 1), "bad_request"),   # under itself
            (lambda: labels.move_label(self.db_path, 1, 0, 3), "bad_request"),   # under its own descendant
            (lambda: labels.move_label(self.db_path, 6, 0, 5), "bad_request"),   # Other under E would be a sixth level
            (lambda: labels.move_label(self.db_path, 6, 0, 4), "bad_request"),   # Other plus Other2 under D: sixth level
            (lambda: labels.move_label(self.db_path, 7, 0, 99), "not_found"),
            (lambda: labels.move_label(self.db_path, 99, 0, 1), "not_found"),
        ]
        for attempt, code in cases:
            with self.assertRaises(labels.LabelError) as caught:
                attempt()
            self.assertEqual(caught.exception.code, code)
        labels.move_label(self.db_path, 7, 0, 4)  # a single label under D is a fifth level: allowed
        labels.create_label(self.db_path, "B", "d", 6)  # "B" now also under Other
        labels.move_label(self.db_path, 2, 0, 6)  # B (under A) onto Other, which has a B: allowed now

    def test_an_entry_can_sit_under_several_labels_at_different_levels(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.create_label(self.db_path, "Relative", "d", 1)
        labels.add_placement(self.db_path, 1, 2)
        labels.add_placement(self.db_path, 2, 2)
        clause = self.tree()[0]
        self.assertEqual(entry_ids(clause), [2])
        self.assertEqual(entry_ids(clause["children"][0]), [2])
        labels.add_placement(self.db_path, 1, 2)  # already there: nothing changes
        self.assertEqual(entry_ids(self.tree()[0]), [2])

    def test_entries_keep_the_order_they_were_placed_and_can_be_inserted_or_moved(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.add_placement(self.db_path, 1, 1)
        labels.add_placement(self.db_path, 1, 2)
        self.assertEqual(entry_ids(self.tree()[0]), [1, 2])
        labels.add_placement(self.db_path, 1, 2, 0)
        self.assertEqual(entry_ids(self.tree()[0]), [2, 1])

    def test_removing_a_placement_keeps_the_entry_and_a_stale_label_is_an_error(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.add_placement(self.db_path, 1, 1)
        labels.remove_placement(self.db_path, 1, 1)
        labels.remove_placement(self.db_path, 1, 1)  # idempotent
        self.assertEqual(entry_ids(self.tree()[0]), [])
        self.assertEqual(len(items.load_items(self.db_path)["entries"]), 2)
        with self.assertRaises(labels.LabelError):
            labels.remove_placement(self.db_path, 99, 1)
        with self.assertRaises(labels.LabelError):
            labels.add_placement(self.db_path, 1, 99)
        with self.assertRaises(labels.LabelError):
            labels.add_placement(self.db_path, 99, 1)

    def test_deleting_a_label_takes_its_placements_but_is_refused_while_it_has_sub_labels(self):
        labels.create_label(self.db_path, "Clause", "d")
        labels.create_label(self.db_path, "Relative", "d", 1)
        labels.add_placement(self.db_path, 2, 1)
        with self.assertRaises(labels.LabelError) as refused:
            labels.delete_label(self.db_path, 1)
        self.assertEqual(refused.exception.code, "conflict")
        labels.delete_label(self.db_path, 2)
        self.assertEqual(names(self.tree()), ["Clause"])
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM label_placements").fetchone()[0], 0)
        with self.assertRaises(labels.LabelError):
            labels.delete_label(self.db_path, 2)


if __name__ == "__main__":
    unittest.main()
