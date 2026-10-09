"""labeltables.py (the shape and limits of a label's tables) and the two set_tables writers, over throwaway databases."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import labels  # noqa: E402
import items  # noqa: E402
import labeltables  # noqa: E402
from test_items import build_db  # noqa: E402


def table(**changes):
    return {"caption": "Cases", "colHeads": True, "rowHeads": True,
            "cells": [["", "Singular", "Plural"], ["Nominative", "puella", "puellae"]]} | changes


class CleanTest(unittest.TestCase):
    def test_a_good_list_comes_back_trimmed_with_only_the_known_keys(self):
        raw = table(caption="  Cases  ", cells=[[" a ", "b"]], extra="dropped")
        self.assertEqual(labeltables.clean([raw]),
                         [{"caption": "Cases", "colHeads": True, "rowHeads": True, "cells": [["a", "b"]]}])

    def test_an_empty_list_is_valid_and_so_is_a_missing_caption(self):
        self.assertEqual(labeltables.clean([]), [])
        raw = table()
        del raw["caption"]
        self.assertEqual(labeltables.clean([raw])[0]["caption"], "")

    def test_a_malformed_table_or_list_is_refused(self):
        bad = [
            "text", {}, [table()] * (labeltables.MAX_TABLES + 1), [None], [table(colHeads="yes")], [table(rowHeads=1)],
            [table(caption=5)], [table(caption="x" * (labeltables.MAX_CAPTION + 1))],
            [table(cells=[])], [table(cells=[[]])], [table(cells="ab")], [table(cells=["ab"])],
            [table(cells=[["a", "b"], ["c"]])],  # ragged
            [table(cells=[["a", 1]])],
            [table(cells=[["x" * (labeltables.MAX_CELL + 1)]])],
            [table(cells=[["a"]] * (labeltables.MAX_ROWS + 1))],
            [table(cells=[["a"] * (labeltables.MAX_COLS + 1)])],
        ]
        for value in bad:
            self.assertIsNone(labeltables.clean(value), value)

    def test_the_limits_themselves_are_allowed(self):
        edge = table(cells=[["x" * labeltables.MAX_CELL] * labeltables.MAX_COLS] * labeltables.MAX_ROWS)
        self.assertIsNotNone(labeltables.clean([edge] * labeltables.MAX_TABLES))

    def test_unreadable_stored_text_reads_as_no_tables(self):
        for stored in (None, "", "not json", '{"a": 1}', '[{"cells": 3}]'):
            self.assertEqual(labeltables.parse(stored), [])


class SetTablesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "grammar.db"
        build_db(self.db_path)
        labels.create_label(self.db_path, "Clause", "d")

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_labels_tables_are_saved_replaced_and_travel_in_the_tree(self):
        self.assertEqual(items.load_labels(self.db_path)[0]["tables"], [])
        labels.set_tables(self.db_path, 1, labeltables.clean([table()]))
        self.assertEqual(items.load_labels(self.db_path)[0]["tables"][0]["cells"][1][1], "puella")
        labels.set_tables(self.db_path, 1, [])
        self.assertEqual(items.load_labels(self.db_path)[0]["tables"], [])

    def test_an_unknown_label_is_not_found(self):
        with self.assertRaises(labels.LabelError) as caught:
            labels.set_tables(self.db_path, 99, [])
        self.assertEqual(caught.exception.code, "not_found")

    def test_tables_stay_with_their_label_through_an_edit_and_a_move_and_go_with_a_delete(self):
        labels.create_label(self.db_path, "Phrase", "d")
        labels.set_tables(self.db_path, 1, labeltables.clean([table()]))
        labels.edit_label(self.db_path, 1, "Clause", "new")
        labels.move_label(self.db_path, 1, 1)
        self.assertEqual([len(n["tables"]) for n in items.load_labels(self.db_path)], [0, 1])
        labels.delete_label(self.db_path, 1)
        self.assertEqual([n["name"] for n in items.load_labels(self.db_path)], ["Phrase"])


if __name__ == "__main__":
    unittest.main()
