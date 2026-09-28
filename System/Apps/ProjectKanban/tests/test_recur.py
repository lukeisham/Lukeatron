"""Acceptance tests for recur.py: resetting a Done recurring Next Action
back to Open and rolling its Due forward, one cadence at a time.

Every test runs against a fresh `shutil.copytree` of
`tests/fixtures/recur_root/` into a `tempfile.TemporaryDirectory()` — never
the committed fixture itself, and never anything under the real
Memory/Medium-Term/ (writes.py's own TEST-4 isolation rule, reused here).
"""

import shutil
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import stores  # noqa: E402  (path must be set up first)
import recur  # noqa: E402  (imports `server`, never `writes`, directly — see recur.py's own docstring)

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "recur_root"


class RecurTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name) / "root"
        shutil.copytree(FIXTURE_ROOT, self.root)
        self.addCleanup(self._tmp.cleanup)

    def registry_path(self) -> Path:
        return self.root / "Memory/Medium-Term/Projects/ZZ-20-sample-recur-target/registry.md"

    def row(self, row_id: str):
        registry = stores.read_registry(self.registry_path(), "ZZ-20")
        return next(r for r in registry.next_actions if r.index.value == row_id)


class TestNextOccurrence(unittest.TestCase):
    def test_weekly_tue_on_a_tuesday_stays_that_day(self) -> None:
        self.assertEqual(recur._next_occurrence("weekly-tue", date(2026, 9, 15)), date(2026, 9, 15))

    def test_weekly_tue_rolls_forward_to_next_tuesday(self) -> None:
        self.assertEqual(recur._next_occurrence("weekly-tue", date(2026, 9, 16)), date(2026, 9, 22))

    def test_monthly_1st_on_the_1st_stays_that_day(self) -> None:
        self.assertEqual(recur._next_occurrence("monthly-1st", date(2026, 10, 1)), date(2026, 10, 1))

    def test_monthly_1st_rolls_to_next_month(self) -> None:
        self.assertEqual(recur._next_occurrence("monthly-1st", date(2026, 9, 15)), date(2026, 10, 1))

    def test_monthly_1st_rolls_across_a_year_boundary(self) -> None:
        self.assertEqual(recur._next_occurrence("monthly-1st", date(2026, 12, 15)), date(2027, 1, 1))

    def test_unknown_cadence_raises(self) -> None:
        with self.assertRaises(ValueError):
            recur._next_occurrence("daily", date(2026, 9, 15))


class TestResetRecurring(RecurTestCase):
    def test_a_done_matching_row_reopens_and_due_rolls_forward(self) -> None:
        outcomes = recur.reset_recurring(self.root, "weekly-tue", date(2026, 9, 15))
        self.assertEqual(len(outcomes), 1)
        self.assertEqual(outcomes[0].row_id, "1")
        self.assertEqual(outcomes[0].new_due, date(2026, 9, 15))

        row = self.row("1")
        self.assertEqual(row.status.value, "☐ Open")
        self.assertEqual(row.due.value, "2026-09-15")

    def test_a_done_other_cadence_row_is_untouched(self) -> None:
        recur.reset_recurring(self.root, "weekly-tue", date(2026, 9, 15))
        row = self.row("2")  # monthly-1st, not weekly-tue
        self.assertEqual(row.status.value, "☑ Done")
        self.assertEqual(row.due.value, "2026-09-01")

    def test_an_open_matching_row_is_untouched(self) -> None:
        recur.reset_recurring(self.root, "weekly-tue", date(2026, 9, 15))
        row = self.row("3")
        self.assertEqual(row.status.value, "☐ Open")
        self.assertEqual(row.due.value, "2026-09-15")

    def test_a_done_non_recurring_row_is_untouched(self) -> None:
        recur.reset_recurring(self.root, "weekly-tue", date(2026, 9, 15))
        row = self.row("4")
        self.assertEqual(row.status.value, "☑ Done")

    def test_monthly_cadence_only_resets_its_own_rows(self) -> None:
        outcomes = recur.reset_recurring(self.root, "monthly-1st", date(2026, 9, 15))
        self.assertEqual(len(outcomes), 1)
        self.assertEqual(outcomes[0].row_id, "2")
        self.assertEqual(outcomes[0].new_due, date(2026, 10, 1))

        row = self.row("2")
        self.assertEqual(row.status.value, "☐ Open")
        self.assertEqual(row.due.value, "2026-10-01")

        untouched = self.row("1")
        self.assertEqual(untouched.status.value, "☑ Done")

    def test_unknown_cadence_raises_and_writes_nothing(self) -> None:
        before = self.registry_path().read_text(encoding="utf-8")
        with self.assertRaises(ValueError):
            recur.reset_recurring(self.root, "daily", date(2026, 9, 15))
        after = self.registry_path().read_text(encoding="utf-8")
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
