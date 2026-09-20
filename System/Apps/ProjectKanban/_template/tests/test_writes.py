"""Acceptance tests for writes.py, ported/adapted from ProjectDashboard's
tests/test_writes.py (writes.spec.md AC-8, PRD Q6): the guard structure,
fixture-copy isolation (TEST-4) and AC-labelled test classes are inherited
as BEHAVIOUR; the assertions are rewritten against this module's own two
functions (`set_cell`, `append_note`) and its own five edits, since
ProjectKanban has no `hand_over`/`append_request` and edits Due/Owner/Kind
rather than Dashboard's State/Kind/scrap/request-row shape.

Every test runs against a fresh `shutil.copytree` of
`tests/fixtures/writes_root/` into a `tempfile.TemporaryDirectory()` — never
the committed fixture itself, and never anything under the real
Memory/Medium-Term/ (TEST-4).

The eight TEST-7 gate tests (two per guard) this module is not "done"
without:
  Guard 1 fence   — TestFenceGuard: blocked / permitted
  Guard 2 mtime   — TestMtimeGuard: blocked / permitted
  Guard 3 reparse — TestReparseGuard: blocked / permitted
  Guard 4 record  — TestRecordGuard: blocked (refusal still logs) / permitted
"""

import inspect
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import stores  # noqa: E402  (path must be set up first)
import writes  # noqa: E402

FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "writes_root"


class WritesTestCase(unittest.TestCase):
    """Copies the fixture tree fresh for every test (TEST-5: deterministic,
    no shared state between tests)."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name) / "root"
        shutil.copytree(FIXTURE_ROOT, self.root)
        self.addCleanup(self._tmp.cleanup)

    def registry_path(self, project_id: str) -> Path:
        rel = {
            "ZZ-10": "Memory/Medium-Term/Projects/ZZ-10-sample-writes-target/registry.md",
            "ZZ-11": "Memory/Medium-Term/Projects/ZZ-11-sample-writes-streams/registry.md",
        }[project_id]
        return self.root / rel

    def notes_path(self, project_id: str) -> Path:
        rel = {"ZZ-10": "Memory/Medium-Term/Projects/ZZ-10-sample-writes-target/notes.md"}[project_id]
        return self.root / rel

    def tracking_path(self) -> Path:
        return self.root / "Memory/Medium-Term/Projects/_tracking.yaml"

    def edits_log_path(self) -> Path:
        return self.root / "Memory/Long-Term/Logs/edits.log"

    def mtime_of(self, path: Path) -> float:
        return path.stat().st_mtime

    def assertOneLineChanged(self, before: list[str], after: list[str]) -> int:
        """AC-1: exactly one line differs; returns its index."""
        self.assertEqual(len(before), len(after), "a cell/tag edit must never add or remove a line")
        changed = [i for i, (a, b) in enumerate(zip(before, after)) if a != b]
        self.assertEqual(len(changed), 1, f"expected exactly one changed line, got {len(changed)}")
        return changed[0]


class TestImport(unittest.TestCase):
    def test_imports_cleanly_and_exposes_the_public_api(self) -> None:
        for name in (
            "set_cell", "append_note", "reorder_next_actions",
            "FenceError", "StaleMtimeError", "RowNotFoundError", "LinkedRowError", "ReorderMismatchError",
        ):
            self.assertTrue(hasattr(writes, name), name)

    def test_never_imports_model(self) -> None:
        source = Path(writes.__file__).read_text(encoding="utf-8")
        self.assertNotIn("import model", source)


# ---------------------------------------------------------------------------
# Guard 1 — the fence (FR-2, AC-2)
# ---------------------------------------------------------------------------


class TestFenceGuard(WritesTestCase):
    def test_blocked_escaping_path_raises_fence_error_and_touches_nothing(self) -> None:
        outside = Path(self.root).parent / "outside-fence" / "registry.md"
        outside.parent.mkdir(parents=True, exist_ok=True)
        outside.write_text("should never be touched", encoding="utf-8")

        with self.assertRaises(writes.FenceError):
            writes.set_cell(self.root, project_id="ZZ-12", row="1", column="status", value="☑ Done", mtime=0.0)

        self.assertEqual(outside.read_text(encoding="utf-8"), "should never be touched")
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:FenceError", log_lines[0])
        self.assertIn("project=ZZ-12", log_lines[0])

    def test_permitted_in_tree_path_succeeds(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="☑ Done", mtime=mtime)
        self.assertTrue(result.ok)


# ---------------------------------------------------------------------------
# Guard 2 — mtime (FR-3, AC-3)
# ---------------------------------------------------------------------------


class TestMtimeGuard(WritesTestCase):
    def test_blocked_stale_mtime_refused_and_file_byte_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        stale = self.mtime_of(path) - 999

        with self.assertRaises(writes.StaleMtimeError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="☑ Done", mtime=stale)

        self.assertEqual(path.read_bytes(), original)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:stale_mtime", log_lines[0])

    def test_permitted_two_callers_first_wins_second_is_stale(self) -> None:
        """AC-3's own scenario: two callers read the same mtime; the first
        write succeeds and the second (holding the now-stale mtime) is
        refused, never merged."""
        path = self.registry_path("ZZ-10")
        shared_mtime = self.mtime_of(path)

        first = writes.set_cell(self.root, project_id="ZZ-10", row="1", column="due", value="2026-10-01", mtime=shared_mtime)
        self.assertTrue(first.ok)

        with self.assertRaises(writes.StaleMtimeError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="owner", value="Someone Else", mtime=shared_mtime)


# ---------------------------------------------------------------------------
# Guard 3 — re-parse before commit (FR-4)
# ---------------------------------------------------------------------------


class TestReparseGuard(WritesTestCase):
    def test_blocked_a_value_that_would_corrupt_the_row_is_abandoned(self) -> None:
        """Row 2's Action cell carries a paired-backtick, pipe-bearing span
        ("`Alpha|Beta|Gamma`"). A single unmatched backtick in another cell
        of the SAME row flips the tick-parity for the rest of that line, so
        the row's own 🔗 Link pipe stops being a cell boundary on re-parse —
        exactly the corruption Guard 3 exists to catch. `_reject_unsafe_cell_value`
        does not block a lone backtick, so this reaches the re-parse guard
        genuinely, not a shallow input check."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)

        with self.assertRaises(writes.TableCorruptionError):
            writes.set_cell(self.root, project_id="ZZ-10", row="2", column="due", value="oops`", mtime=mtime)

        self.assertEqual(path.read_bytes(), original, "an abandoned write must leave the file byte-unchanged")
        # no temp file left behind either
        leftovers = list(path.parent.glob(f"{path.name}.tmp*"))
        self.assertEqual(leftovers, [])

    def test_permitted_a_normal_edit_re_parses_clean_and_commits(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.set_cell(self.root, project_id="ZZ-10", row="2", column="due", value="2026-09-30", mtime=mtime)
        self.assertTrue(result.ok)
        record = stores.read_registry(path, "ZZ-10")
        self.assertEqual(record.skipped_rows, [])
        row = next(r for r in record.next_actions if r.index.value == "2")
        self.assertEqual(row.due.value, "2026-09-30")
        self.assertIn("Alpha|Beta|Gamma", row.action.value)  # untouched, still intact


# ---------------------------------------------------------------------------
# Guard 4 — record: edits.log + pending_sweep (FR-5, AC-7)
# ---------------------------------------------------------------------------


class TestRecordGuard(WritesTestCase):
    def test_blocked_path_a_refusal_still_produces_exactly_one_log_line(self) -> None:
        """Even when the write itself is refused, the record guard still
        fires — the log never silently misses an attempted mutation."""
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        with self.assertRaises(writes.RowNotFoundError):
            writes.set_cell(self.root, project_id="ZZ-10", row="99", column="status", value="☑ Done", mtime=mtime)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:row_not_found", log_lines[0])
        # and pending_sweep was never touched
        data = stores.yaml_load(self.tracking_path().read_text(encoding="utf-8"))
        row = next(p for p in data["projects"] if p["id"] == "ZZ-10")
        self.assertNotIn("pending_sweep", row)

    def test_permitted_a_success_logs_one_ok_line_and_stamps_pending_sweep(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="☑ Done", mtime=mtime)

        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("set_cell", log_lines[0])
        self.assertIn("project=ZZ-10", log_lines[0])
        self.assertIn("outcome=ok", log_lines[0])

        data = stores.yaml_load(self.tracking_path().read_text(encoding="utf-8"))
        row = next(p for p in data["projects"] if p["id"] == "ZZ-10")
        self.assertIs(row["pending_sweep"], True)
        other = next(p for p in data["projects"] if p["id"] == "ZZ-11")
        self.assertNotIn("pending_sweep", other)


# ---------------------------------------------------------------------------
# AC-1 — each of the six edits changes the intended bytes and nothing else.
# ---------------------------------------------------------------------------


class TestSixEditsAC1(WritesTestCase):
    def test_edit_1_status(self) -> None:
        path = self.registry_path("ZZ-10")
        before = path.read_text(encoding="utf-8").splitlines(keepends=True)
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="☑ Done", mtime=mtime)
        after = path.read_text(encoding="utf-8").splitlines(keepends=True)
        idx = self.assertOneLineChanged(before, after)
        self.assertIn("☑ Done", after[idx])
        self.assertIn("Confirm the sample thing", after[idx])  # Action cell untouched

    def test_edit_2_due(self) -> None:
        path = self.registry_path("ZZ-10")
        before = path.read_text(encoding="utf-8").splitlines(keepends=True)
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="1", column="due", value="2026-12-25", mtime=mtime)
        after = path.read_text(encoding="utf-8").splitlines(keepends=True)
        idx = self.assertOneLineChanged(before, after)
        self.assertIn("2026-12-25", after[idx])

    def test_edit_3_owner(self) -> None:
        path = self.registry_path("ZZ-10")
        before = path.read_text(encoding="utf-8").splitlines(keepends=True)
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="4", column="owner", value="Luke", mtime=mtime)
        after = path.read_text(encoding="utf-8").splitlines(keepends=True)
        idx = self.assertOneLineChanged(before, after)
        self.assertIn("Luke", after[idx])
        record = stores.read_registry(path, "ZZ-10")
        row = next(r for r in record.next_actions if r.index.value == "4")
        self.assertEqual(row.owner.value, "Luke")

    def test_edit_4_kind(self) -> None:
        path = self.registry_path("ZZ-10")
        before = path.read_text(encoding="utf-8").splitlines(keepends=True)
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="4", column="kind", value="mine", mtime=mtime)
        after = path.read_text(encoding="utf-8").splitlines(keepends=True)
        idx = self.assertOneLineChanged(before, after)
        self.assertIn("mine", after[idx])

    def test_edit_5_note(self) -> None:
        notes_path = self.notes_path("ZZ-10")
        before = notes_path.read_text(encoding="utf-8")
        mtime = self.mtime_of(notes_path)
        writes.append_note(self.root, project_id="ZZ-10", section="scraps", text="a fresh scrap", mtime=mtime)
        after = notes_path.read_text(encoding="utf-8")
        self.assertEqual(after.count("\n"), before.count("\n") + 1)
        self.assertIn("- a fresh scrap", after)
        self.assertIn("- an existing scrap, already here before any test runs", after)


# ---------------------------------------------------------------------------
# AC-4 — a linked row is refused with a distinct error (FR-6)
# ---------------------------------------------------------------------------


class TestLinkedRowAC4(WritesTestCase):
    def test_linked_row_refused_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(writes.LinkedRowError):
            writes.set_cell(self.root, project_id="ZZ-10", row="3", column="status", value="☑ Done", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertIn("refused:linked_row", log_lines[-1])

    def test_unlinked_row_is_not_refused(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="☑ Done", mtime=mtime)
        self.assertTrue(result.ok)


# ---------------------------------------------------------------------------
# AC-6 — notes.md gains the line under the requested heading; no other
# heading moves or changes.
# ---------------------------------------------------------------------------


class TestNoteSectionsAC6(WritesTestCase):
    def test_appends_under_the_requested_heading_only(self) -> None:
        notes_path = self.notes_path("ZZ-10")
        before = notes_path.read_text(encoding="utf-8")
        mtime = self.mtime_of(notes_path)
        writes.append_note(self.root, project_id="ZZ-10", section="constraints", text="watch the API quota", mtime=mtime)
        after = notes_path.read_text(encoding="utf-8")

        self.assertIn("- watch the API quota", after)
        # every OTHER section's existing line is untouched, byte for byte
        for untouched in (
            "- an existing guidance note, already here before any test runs",
            "- an existing scrap, already here before any test runs",
            "- an existing reference, already here before any test runs",
        ):
            self.assertIn(untouched, after)
        # the new line lands after the Constraints heading, before Reference
        constraints_idx = after.index("## ⚠️ Constraints & gotchas")
        reference_idx = after.index("## 🔗 Reference")
        new_line_idx = after.index("- watch the API quota")
        self.assertTrue(constraints_idx < new_line_idx < reference_idx)

    def test_each_of_the_four_named_sections_is_reachable(self) -> None:
        for section, heading in (
            ("scraps", "## 💡 Scraps & ideas"),
            ("constraints", "## ⚠️ Constraints & gotchas"),
            ("reference", "## 🔗 Reference"),
            ("guidance", "## 🧭 Agent guidance"),
        ):
            notes_path = self.notes_path("ZZ-10")
            mtime = self.mtime_of(notes_path)
            marker = f"marker-for-{section}"
            writes.append_note(self.root, project_id="ZZ-10", section=section, text=marker, mtime=mtime)
            after = notes_path.read_text(encoding="utf-8")
            section_start = after.index(heading)
            next_heading = after.find("\n## ", section_start + 1)
            section_body = after[section_start: next_heading if next_heading != -1 else len(after)]
            self.assertIn(marker, section_body)

    def test_unknown_section_is_a_value_error_never_a_default(self) -> None:
        notes_path = self.notes_path("ZZ-10")
        before = notes_path.read_bytes()
        mtime = self.mtime_of(notes_path)
        with self.assertRaises(ValueError):
            writes.append_note(self.root, project_id="ZZ-10", section="misc", text="should never land", mtime=mtime)
        self.assertEqual(notes_path.read_bytes(), before)


# ---------------------------------------------------------------------------
# Row addressing — by header name and row identity, never by position
# (writes.spec.md's own Risks-table mitigation).
# ---------------------------------------------------------------------------


class TestPipeHazardSurvivesAnEdit(WritesTestCase):
    def test_editing_row_two_owner_leaves_its_own_backticked_action_intact(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="2", column="owner", value="Luke", mtime=mtime)
        record = stores.read_registry(path, "ZZ-10")
        self.assertEqual(record.skipped_rows, [])
        row = next(r for r in record.next_actions if r.index.value == "2")
        self.assertIn("Alpha|Beta|Gamma", row.action.value)
        self.assertEqual(row.owner.value, "Luke")


class TestMultiStreamRowAddressing(WritesTestCase):
    def test_editing_1b_leaves_1a_untouched(self) -> None:
        path = self.registry_path("ZZ-11")
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-11", row="1B", column="kind", value="mine", mtime=mtime)
        record = stores.read_registry(path, "ZZ-11")
        self.assertEqual(record.skipped_rows, [])
        row_1a = next(r for r in record.next_actions if r.index.value == "1A")
        row_1b = next(r for r in record.next_actions if r.index.value == "1B")
        self.assertEqual(row_1a.kind.value, "mine")  # already was mine — untouched
        self.assertEqual(row_1a.owner.value, "Luke")
        self.assertEqual(row_1b.kind.value, "mine")  # just flipped from delegate


class TestRowNotFound(WritesTestCase):
    def test_unknown_row_id_raises_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(writes.RowNotFoundError):
            writes.set_cell(self.root, project_id="ZZ-10", row="99", column="status", value="☑ Done", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)

    def test_unknown_column_raises_value_error_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(ValueError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="state", value="🔴 urgent", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)


class TestUnsafeValueRejected(WritesTestCase):
    def test_pipe_in_value_raises_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(ValueError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="owner", value="a | b", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)

    def test_newline_in_value_raises_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(ValueError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="owner", value="a\nb", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)


class TestProjectNotFound(WritesTestCase):
    def test_unknown_project_id_raises_and_logs_refusal(self) -> None:
        with self.assertRaises(writes.ProjectNotFoundError):
            writes.set_cell(self.root, project_id="ZZ-99", row="1", column="status", value="☑ Done", mtime=0.0)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertIn("refused:ProjectNotFoundError", log_lines[-1])


# ---------------------------------------------------------------------------
# reorder_next_actions — testing the new reorder operation
# ---------------------------------------------------------------------------


class TestReorderNextActionsHappyPath(WritesTestCase):
    def test_reorders_rows_in_correct_sequence_with_cells_unchanged(self) -> None:
        """Happy path: reorder 4 rows, verify new order and all cells intact."""
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        before_text = path.read_text(encoding="utf-8")
        before_record = stores.read_registry(path, "ZZ-10")

        # Get the action text and other cell values before reorder
        row_1_before = next(r for r in before_record.next_actions if r.index.value == "1")
        row_2_before = next(r for r in before_record.next_actions if r.index.value == "2")
        row_3_before = next(r for r in before_record.next_actions if r.index.value == "3")
        row_4_before = next(r for r in before_record.next_actions if r.index.value == "4")
        action_1_before = row_1_before.action.value
        action_2_before = row_2_before.action.value
        action_3_before = row_3_before.action.value
        action_4_before = row_4_before.action.value
        due_1_before = row_1_before.due.value
        due_2_before = row_2_before.due.value
        due_3_before = row_3_before.due.value
        due_4_before = row_4_before.due.value

        # Reorder: 4, 2, 3, 1 (reverse-ish of 1, 2, 3, 4)
        result = writes.reorder_next_actions(
            self.root, project_id="ZZ-10", row_order=["4", "2", "3", "1"], mtime=mtime
        )

        self.assertTrue(result.ok)
        self.assertEqual(result.project_id, "ZZ-10")
        self.assertEqual(result.row_order, ["4", "2", "3", "1"])

        # Re-read the file and verify order
        after_record = stores.read_registry(path, "ZZ-10")
        after_order = [r.index.value for r in after_record.next_actions]
        self.assertEqual(after_order, ["4", "2", "3", "1"])

        # Verify all cells are byte-identical (untouched)
        row_1_after = next(r for r in after_record.next_actions if r.index.value == "1")
        row_2_after = next(r for r in after_record.next_actions if r.index.value == "2")
        row_3_after = next(r for r in after_record.next_actions if r.index.value == "3")
        row_4_after = next(r for r in after_record.next_actions if r.index.value == "4")
        self.assertEqual(row_1_after.action.value, action_1_before)
        self.assertEqual(row_2_after.action.value, action_2_before)
        self.assertEqual(row_3_after.action.value, action_3_before)
        self.assertEqual(row_4_after.action.value, action_4_before)
        self.assertEqual(row_1_after.due.value, due_1_before)
        self.assertEqual(row_2_after.due.value, due_2_before)
        self.assertEqual(row_3_after.due.value, due_3_before)
        self.assertEqual(row_4_after.due.value, due_4_before)

        # Verify the special Action cell with pipes is still intact
        self.assertIn("Alpha|Beta|Gamma", row_2_after.action.value)


class TestReorderNextActionsFenceGuard(WritesTestCase):
    def test_blocked_escaping_path_raises_fence_error_and_touches_nothing(self) -> None:
        """Project ID that resolves outside the fence is refused like set_cell."""
        outside = Path(self.root).parent / "outside-fence" / "registry.md"
        outside.parent.mkdir(parents=True, exist_ok=True)
        outside.write_text("should never be touched", encoding="utf-8")

        with self.assertRaises(writes.FenceError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-12", row_order=["1", "2"], mtime=0.0
            )

        self.assertEqual(outside.read_text(encoding="utf-8"), "should never be touched")
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:FenceError", log_lines[0])

    def test_permitted_in_tree_path_succeeds(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.reorder_next_actions(
            self.root, project_id="ZZ-10", row_order=["4", "2", "3", "1"], mtime=mtime
        )
        self.assertTrue(result.ok)


class TestReorderNextActionsMtimeGuard(WritesTestCase):
    def test_blocked_stale_mtime_refused_and_file_byte_unchanged(self) -> None:
        """Stale mtime raises StaleMtimeError before any write."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        stale = self.mtime_of(path) - 999

        with self.assertRaises(writes.StaleMtimeError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-10", row_order=["2", "1", "4"], mtime=stale
            )

        self.assertEqual(path.read_bytes(), original)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:stale_mtime", log_lines[0])

    def test_permitted_current_mtime_with_valid_rows_succeeds(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.reorder_next_actions(
            self.root, project_id="ZZ-10", row_order=["4", "2", "3", "1"], mtime=mtime
        )
        self.assertTrue(result.ok)


class TestReorderNextActionsMismatch(WritesTestCase):
    def test_blocked_row_order_with_nonexistent_id_raises_reorder_mismatch(self) -> None:
        """A row_order that doesn't match any block's actual rows is refused."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)

        # Try to reorder with a row ID that doesn't exist
        with self.assertRaises(writes.ReorderMismatchError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-10", row_order=["1", "99"], mtime=mtime
            )

        self.assertEqual(path.read_bytes(), original)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertIn("refused:reorder_mismatch", log_lines[-1])

    def test_blocked_row_order_partial_subset_raises_reorder_mismatch(self) -> None:
        """A row_order that is a proper subset of a block's rows is refused."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)

        # Try to reorder only 2 rows when the block has more
        with self.assertRaises(writes.ReorderMismatchError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-10", row_order=["1", "2"], mtime=mtime
            )

        self.assertEqual(path.read_bytes(), original)


class TestReorderNextActionsValidation(WritesTestCase):
    def test_row_order_too_short_raises_value_error(self) -> None:
        """row_order must have at least 2 rows."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)

        with self.assertRaises(ValueError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-10", row_order=["1"], mtime=mtime
            )

        self.assertEqual(path.read_bytes(), original)

    def test_row_order_with_duplicates_raises_value_error(self) -> None:
        """row_order must not contain duplicates."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)

        with self.assertRaises(ValueError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-10", row_order=["1", "2", "1"], mtime=mtime
            )

        self.assertEqual(path.read_bytes(), original)


class TestReorderNextActionsRecordGuard(WritesTestCase):
    def test_permitted_success_logs_one_ok_line_and_stamps_pending_sweep(self) -> None:
        """Successful reorder logs an ok line and stamps pending_sweep."""
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        writes.reorder_next_actions(
            self.root, project_id="ZZ-10", row_order=["4", "2", "3", "1"], mtime=mtime
        )

        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("reorder_next_actions", log_lines[0])
        self.assertIn("project=ZZ-10", log_lines[0])
        self.assertIn("outcome=ok", log_lines[0])

        data = stores.yaml_load(self.tracking_path().read_text(encoding="utf-8"))
        row = next(p for p in data["projects"] if p["id"] == "ZZ-10")
        self.assertIs(row["pending_sweep"], True)
        other = next(p for p in data["projects"] if p["id"] == "ZZ-11")
        self.assertNotIn("pending_sweep", other)

    def test_refusal_still_produces_log_line(self) -> None:
        """Even when the reorder is refused, a log line is recorded."""
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        with self.assertRaises(writes.ReorderMismatchError):
            writes.reorder_next_actions(
                self.root, project_id="ZZ-10", row_order=["1", "99"], mtime=mtime
            )
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:reorder_mismatch", log_lines[0])
        # and pending_sweep was never touched
        data = stores.yaml_load(self.tracking_path().read_text(encoding="utf-8"))
        row = next(p for p in data["projects"] if p["id"] == "ZZ-10")
        self.assertNotIn("pending_sweep", row)


if __name__ == "__main__":
    unittest.main()
