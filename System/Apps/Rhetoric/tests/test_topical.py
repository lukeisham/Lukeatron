"""Smoke tests for topical.py over throwaway databases built from schema.sql."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import items  # noqa: E402
import topical  # noqa: E402
from test_items import build_db  # noqa: E402


def device_ids(node: dict) -> list[int]:
    return [child["id"] for child in node["children"]]


class TopicalTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "rhetoric.db"
        build_db(self.db_path)  # devices 1 (Metaphor) and 2 (Anaphora)

    def tearDown(self):
        self.tmp.cleanup()

    def tree(self) -> list[dict]:
        return items.load_topical(self.db_path)

    def test_fresh_database_has_only_unsorted_holding_every_device(self):
        [unsorted] = self.tree()
        self.assertEqual((unsorted["id"], unsorted["name"]), (topical.UNSORTED_ID, "Unsorted"))
        self.assertEqual(device_ids(unsorted), [2, 1])  # label order: Anaphora, Metaphor

    def test_moving_a_type_reorders_the_types_and_unsorted_stays_last(self):
        for name in ("A", "B", "C"):
            topical.create_type(self.db_path, name)
        names = lambda: [n["name"] for n in self.tree()]  # noqa: E731
        topical.move_type(self.db_path, 3, 0)
        self.assertEqual(names(), ["C", "A", "B", "Unsorted"])
        topical.move_type(self.db_path, 3, 2)
        self.assertEqual(names(), ["A", "B", "C", "Unsorted"])
        topical.move_type(self.db_path, 1, 99)  # past the end means last
        self.assertEqual(names(), ["B", "C", "A", "Unsorted"])
        topical.create_type(self.db_path, "D")  # a new Type goes last, after a reorder
        self.assertEqual(names(), ["B", "C", "A", "D", "Unsorted"])

    def test_devices_keep_the_order_they_were_placed_and_can_be_inserted_or_moved(self):
        topical.create_type(self.db_path, "A")
        topical.add_placement(self.db_path, 1, 1)
        topical.add_placement(self.db_path, 1, 2)
        self.assertEqual(device_ids(self.tree()[0]), [1, 2])  # placement order, not alphabetical
        topical.add_placement(self.db_path, 1, 2, 0)  # already there: this moves it
        self.assertEqual(device_ids(self.tree()[0]), [2, 1])
        topical.add_placement(self.db_path, 1, 2)  # no index on a present device changes nothing
        self.assertEqual(device_ids(self.tree()[0]), [2, 1])
        topical.remove_placement(self.db_path, 1, 2)
        topical.add_placement(self.db_path, 1, 2, 0)  # absent + index: inserted at that spot
        self.assertEqual(device_ids(self.tree()[0]), [2, 1])

    def test_types_keep_creation_order_and_unsorted_comes_last(self):
        topical.create_type(self.db_path, "Zeal")
        topical.create_type(self.db_path, "Irony")
        self.assertEqual([n["name"] for n in self.tree()], ["Zeal", "Irony", "Unsorted"])

    def test_placing_a_device_removes_it_from_unsorted_and_may_repeat_across_types(self):
        topical.create_type(self.db_path, "A")
        topical.create_type(self.db_path, "B")
        topical.add_placement(self.db_path, 1, 1)
        topical.add_placement(self.db_path, 2, 1)
        topical.add_placement(self.db_path, 2, 1)  # idempotent
        a, b, unsorted = self.tree()
        self.assertEqual((device_ids(a), device_ids(b), device_ids(unsorted)), ([1], [1], [2]))

    def test_unsorted_disappears_when_every_device_is_placed(self):
        topical.create_type(self.db_path, "All")
        for device in (1, 2):
            topical.add_placement(self.db_path, 1, device)
        self.assertEqual([n["name"] for n in self.tree()], ["All"])

    def test_removing_a_placement_returns_the_device_to_unsorted(self):
        topical.create_type(self.db_path, "A")
        topical.add_placement(self.db_path, 1, 1)
        topical.remove_placement(self.db_path, 1, 1)
        [a, unsorted] = self.tree()
        self.assertEqual((device_ids(a), device_ids(unsorted)), ([], [2, 1]))

    def test_deleting_a_type_deletes_its_placements_but_never_a_device(self):
        topical.create_type(self.db_path, "A")
        topical.add_placement(self.db_path, 1, 1)
        topical.delete_type(self.db_path, 1)
        [unsorted] = self.tree()
        self.assertEqual(device_ids(unsorted), [2, 1])
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0], 2)

    def test_rename_changes_the_name_only(self):
        topical.create_type(self.db_path, "Old")
        topical.add_placement(self.db_path, 1, 1)
        topical.rename_type(self.db_path, 1, "New")
        self.assertEqual(self.tree()[0]["name"], "New")
        self.assertEqual(device_ids(self.tree()[0]), [1])

    def test_types_nest_four_levels_and_a_fifth_is_refused(self):
        topical.create_type(self.db_path, "Place")
        topical.create_type(self.db_path, "Sound", 1)
        topical.create_type(self.db_path, "Rhythm", 2)
        topical.create_type(self.db_path, "Meter", 3)
        node = self.tree()[0]
        for expected in ("Sound", "Rhythm", "Meter"):
            [node] = [c for c in node["children"] if c["kind"] == "node"]
            self.assertEqual(node["name"], expected)
        with self.assertRaises(topical.TopicalError) as refused:
            topical.create_type(self.db_path, "Too deep", 4)
        self.assertEqual(refused.exception.code, "bad_request")
        with self.assertRaises(topical.TopicalError) as unknown:
            topical.create_type(self.db_path, "Orphan", 99)
        self.assertEqual(unknown.exception.code, "not_found")

    def test_a_sub_type_lists_before_its_devices_and_a_device_under_it_is_not_unsorted(self):
        topical.create_type(self.db_path, "Place")
        topical.add_placement(self.db_path, 1, 1)
        topical.create_type(self.db_path, "Sub", 1)
        topical.add_placement(self.db_path, 2, 2)
        [place] = self.tree()  # both devices are placed, so there is no Unsorted
        self.assertEqual([(c["kind"], c["id"]) for c in place["children"]], [("node", 2), ("device", 1)])
        self.assertEqual(device_ids(place["children"][0]), [2])

    def test_a_sibling_name_is_unique_case_blind_but_free_under_another_parent(self):
        topical.create_type(self.db_path, "A")
        topical.create_type(self.db_path, "B")
        topical.create_type(self.db_path, "Same", 1)
        with self.assertRaises(topical.TopicalError) as clash:
            topical.create_type(self.db_path, "SAME", 1)
        self.assertEqual(clash.exception.code, "conflict")
        topical.create_type(self.db_path, "Same", 2)  # another parent: a different sibling set
        with self.assertRaises(topical.TopicalError):
            topical.rename_type(self.db_path, 2, "a")  # B onto A at the top level
        topical.rename_type(self.db_path, 3, "SAME")  # its own name is not a clash

    def test_moving_a_type_reorders_its_siblings_only(self):
        for name in ("A", "B"):
            topical.create_type(self.db_path, name)
        for name in ("x", "y", "z"):
            topical.create_type(self.db_path, name, 1)
        topical.move_type(self.db_path, 5, 0)  # z first among A's sub-Types
        [a, b, _] = self.tree()
        self.assertEqual([c["name"] for c in a["children"]], ["z", "x", "y"])
        self.assertEqual([n["name"] for n in (a, b)], ["A", "B"])

    def test_a_type_with_sub_types_cannot_be_deleted_until_they_go(self):
        topical.create_type(self.db_path, "A")
        topical.create_type(self.db_path, "Sub", 1)
        with self.assertRaises(topical.TopicalError) as refused:
            topical.delete_type(self.db_path, 1)
        self.assertEqual(refused.exception.code, "conflict")
        topical.delete_type(self.db_path, 2)
        topical.delete_type(self.db_path, 1)
        self.assertEqual([n["name"] for n in self.tree()], ["Unsorted"])

    def test_refusals_carry_registry_codes(self):
        topical.create_type(self.db_path, "Irony")
        topical.create_type(self.db_path, "Other")
        cases = [
            (lambda: topical.create_type(self.db_path, "irony"), "conflict"),  # names are case-blind
            (lambda: topical.rename_type(self.db_path, 2, "IRONY"), "conflict"),
            (lambda: topical.rename_type(self.db_path, 99, "X"), "not_found"),
            (lambda: topical.delete_type(self.db_path, 99), "not_found"),
            (lambda: topical.add_placement(self.db_path, 99, 1), "not_found"),
            (lambda: topical.add_placement(self.db_path, 1, 99), "not_found"),
            (lambda: topical.remove_placement(self.db_path, 99, 1), "not_found"),
            (lambda: topical.move_type(self.db_path, 99, 0), "not_found"),
        ]
        for attempt, code in cases:
            with self.assertRaises(topical.TopicalError) as caught:
                attempt()
            self.assertEqual(caught.exception.code, code)

    def test_missing_database_is_not_created_by_a_write(self):
        self.db_path.unlink()
        with self.assertRaises(sqlite3.OperationalError):
            topical.create_type(self.db_path, "A")
        self.assertFalse(self.db_path.exists())

    def test_writes_leave_the_seeded_tables_untouched(self):
        def snapshot() -> list:
            with sqlite3.connect(self.db_path) as conn:
                return [conn.execute(f"SELECT * FROM {t} ORDER BY 1, 2").fetchall()
                        for t in ("nodes", "devices", "device_categories", "examples")]
        before = snapshot()
        topical.create_type(self.db_path, "A")
        topical.add_placement(self.db_path, 1, 1)
        topical.delete_type(self.db_path, 1)
        self.assertEqual(snapshot(), before)


if __name__ == "__main__":
    unittest.main()
