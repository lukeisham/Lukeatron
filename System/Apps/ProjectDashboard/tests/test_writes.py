"""Acceptance tests for writes.py, ported/adapted from ProjectDashboard's
tests/test_writes.py (writes.spec.md AC-8, PRD Q6): the guard structure,
fixture-copy isolation (TEST-4) and AC-labelled test classes are inherited
as BEHAVIOUR; the assertions are rewritten against this module's own two
functions (`set_cell`, `append_note`) and its own five edits, since
Project Dashboard has no `hand_over`/`append_request` and edits Due/Owner/Kind
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
        path = self.root / "System/Apps/ProjectDashboard/edits.log"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

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
            "set_cell", "append_note", "reorder_next_actions", "undo_last", "undo_state",
            "UndoUnavailableError", "UndoConflictError",
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


# ---------------------------------------------------------------------------
# Undo (wishlist #1) — the log carries the old value, and undo_last uses it.
# ---------------------------------------------------------------------------


class UndoTestCase(WritesTestCase):
    def edit(self, row: str, column: str, value: str, project_id: str = "ZZ-10") -> writes.EditResult:
        path = self.registry_path(project_id)
        return writes.set_cell(self.root, project_id=project_id, row=row, column=column, value=value,
                               mtime=self.mtime_of(path))

    def log_lines(self) -> list[str]:
        return self.edits_log_path().read_text(encoding="utf-8").splitlines()

    def assertRefusedUntouched(self, exc: type, project_id: str = "ZZ-10") -> None:
        """Run undo and require `exc`, with the registry's bytes AND mtime unchanged."""
        path = self.registry_path(project_id)
        before, before_mtime = path.read_bytes(), self.mtime_of(path)
        with self.assertRaises(exc):
            writes.undo_last(self.root, project_id=project_id, mtime=before_mtime)
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(self.mtime_of(path), before_mtime)


class TestUndoLogsPreviousValue(UndoTestCase):
    def test_set_cell_logs_prev_beside_value(self) -> None:
        self.edit("1", "status", "☑ Done")
        self.assertTrue(self.log_lines()[-1].endswith("detail=value='☑ Done' prev='☐ Open'"), self.log_lines()[-1])

    def test_blank_glyph_prev_is_logged_verbatim(self) -> None:
        self.edit("4", "owner", "Luke")
        self.assertTrue(self.log_lines()[-1].endswith("value='Luke' prev='—'"))

    def test_old_format_line_parses_but_is_not_undoable(self) -> None:
        legacy = "[2026-09-15T09:56:30] set_cell project=ZZ-10 row=1 column=owner outcome=ok detail=value='Anthony'"
        self.edits_log_path().write_text(legacy + "\n", encoding="utf-8")
        entry = writes._latest_write_entry(self.root)
        self.assertEqual((entry.value, entry.prev), ("Anthony", None))
        self.assertFalse(writes.undo_state(self.root)["available"])
        self.assertIn("before undo existed", writes.undo_state(self.root)["reason"])
        self.assertRefusedUntouched(writes.UndoUnavailableError)

    def test_parser_ignores_refusals_browser_lines_and_junk(self) -> None:
        for line in (
            "[2026-09-15T09:56:30] set_cell project=ZZ-10 row=1 column=owner outcome=refused:stale_mtime",
            "[BROWSER: wiki] [mode] - on 2026-07-03T08:50:06",
            "not a log line at all",
        ):
            self.assertIsNone(writes._parse_edit_log_line(line), line)

    def test_parser_reads_a_value_containing_both_quote_kinds(self) -> None:
        line = "[t] set_cell project=ZZ-10 row=1 column=owner outcome=ok detail=value=\"O'Neil \\\"Sr\\\"\" prev=''"
        entry = writes._parse_edit_log_line(line)
        self.assertEqual((entry.value, entry.prev), ('O\'Neil "Sr"', ""))


class TestUndoHappyPath(UndoTestCase):
    def test_undo_restores_the_file_byte_for_byte(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        self.edit("1", "status", "☑ Done")
        self.assertNotEqual(path.read_bytes(), original)
        result = writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path))
        self.assertTrue(result.ok)
        self.assertEqual((result.row, result.column, result.value), ("1", "status", "☐ Open"))
        self.assertEqual(path.read_bytes(), original)
        self.assertEqual(result.mtime, self.mtime_of(path))

    def test_undo_is_logged_as_undo_set_cell_and_stamps_pending_sweep(self) -> None:
        self.edit("1", "due", "2026-12-25")
        writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(self.registry_path("ZZ-10")))
        last = self.log_lines()[-1]
        self.assertIn(" undo_set_cell project=ZZ-10 row=1 column=due outcome=ok", last)
        self.assertIn("value='2026-09-10' prev='2026-12-25'", last)
        self.assertIn("pending_sweep: true", self.tracking_path().read_text(encoding="utf-8"))

    def test_nothing_here_glyph_round_trips(self) -> None:
        """`—` reads back from stores as None; the verify step must still accept restoring it."""
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        self.edit("4", "owner", "Luke")
        writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path))
        self.assertEqual(path.read_bytes(), original)

    def test_blank_cell_round_trips_semantically(self) -> None:
        path = self.registry_path("ZZ-10")
        text = path.read_text(encoding="utf-8").replace("| 2026-09-10 | — |", "|  | — |", 1)
        path.write_text(text, encoding="utf-8")
        self.edit("1", "due", "2026-12-25")
        self.assertTrue(self.log_lines()[-1].endswith("prev=''"))
        writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path))
        row = next(r for r in stores.read_registry(path, "ZZ-10").next_actions if r.index.value == "1")
        self.assertIsNone(row.due.value)

    def test_state_names_what_undo_would_do(self) -> None:
        self.edit("1", "status", "☑ Done")
        state = writes.undo_state(self.root)
        self.assertTrue(state["available"])
        self.assertEqual((state["project_id"], state["row"], state["column"], state["value"], state["prev"]),
                         ("ZZ-10", "1", "status", "☑ Done", "☐ Open"))
        self.assertRegex(state["at"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$")
        self.assertIsNone(state["reason"])


class TestUndoRefusals(UndoTestCase):
    def test_no_log_at_all(self) -> None:
        self.assertFalse(writes.undo_state(self.root)["available"])
        self.assertRefusedUntouched(writes.UndoUnavailableError)

    def test_latest_write_is_a_note(self) -> None:
        self.edit("1", "status", "☑ Done")
        writes.append_note(self.root, project_id="ZZ-10", section="scraps", text="hello",
                           mtime=self.mtime_of(self.notes_path("ZZ-10")))
        self.assertIn("note", writes.undo_state(self.root)["reason"])
        self.assertRefusedUntouched(writes.UndoUnavailableError)

    def test_latest_write_is_a_reorder(self) -> None:
        path = self.registry_path("ZZ-10")
        writes.reorder_next_actions(self.root, project_id="ZZ-10", row_order=["2", "1", "3", "4"],
                                    mtime=self.mtime_of(path))
        self.assertIn("reorder", writes.undo_state(self.root)["reason"])
        self.assertRefusedUntouched(writes.UndoUnavailableError)

    def test_a_second_undo_is_refused_so_it_cannot_ping_pong(self) -> None:
        path = self.registry_path("ZZ-10")
        self.edit("1", "status", "☑ Done")
        writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path))
        self.assertFalse(writes.undo_state(self.root)["available"])
        self.assertRefusedUntouched(writes.UndoUnavailableError)

    def test_refusals_are_ignored_when_finding_the_last_write(self) -> None:
        path = self.registry_path("ZZ-10")
        self.edit("1", "status", "☑ Done")
        with self.assertRaises(writes.StaleMtimeError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="due", value="2027-01-01", mtime=1.0)
        result = writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path))
        self.assertEqual((result.column, result.value), ("status", "☐ Open"))

    def test_wrong_project_is_refused(self) -> None:
        self.edit("1", "status", "☑ Done")
        path = self.registry_path("ZZ-11")
        before = path.read_bytes()
        with self.assertRaises(writes.UndoUnavailableError):
            writes.undo_last(self.root, project_id="ZZ-11", mtime=self.mtime_of(path))
        self.assertEqual(path.read_bytes(), before)

    def test_unsafe_prev_is_refused_not_half_written(self) -> None:
        line = "[2026-09-21T10:00:00] set_cell project=ZZ-10 row=1 column=owner outcome=ok detail=value='Luke' prev='a|b'"
        self.edits_log_path().write_text(line + "\n", encoding="utf-8")
        self.assertRefusedUntouched(writes.UndoUnavailableError)

    def test_refusals_are_logged_but_never_become_the_latest_write(self) -> None:
        self.edit("1", "status", "☑ Done")
        path = self.registry_path("ZZ-10")
        with self.assertRaises(writes.StaleMtimeError):
            writes.undo_last(self.root, project_id="ZZ-10", mtime=1.0)
        self.assertIn("undo_set_cell project=ZZ-10 row=1 column=status outcome=refused:stale_mtime", self.log_lines()[-1])
        self.assertEqual(writes._latest_write_entry(self.root).action, "set_cell")


class TestUndoConflictGuard(UndoTestCase):
    """TEST-7 blocked/permitted pair for the conflict guard."""

    def test_blocked_when_the_cell_changed_out_of_band(self) -> None:
        path = self.registry_path("ZZ-10")
        self.edit("1", "status", "☑ Done")
        path.write_text(path.read_text(encoding="utf-8").replace("☑ Done", "🚫 Blocked", 1), encoding="utf-8")
        self.assertFalse(writes.undo_state(self.root)["available"])
        self.assertRefusedUntouched(writes.UndoConflictError)
        self.assertIn("refused:UndoConflictError", self.log_lines()[-1])

    def test_permitted_when_the_cell_still_holds_the_logged_value(self) -> None:
        path = self.registry_path("ZZ-10")
        self.edit("1", "status", "☑ Done")
        self.assertTrue(writes.undo_state(self.root)["available"])
        self.assertTrue(writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path)).ok)


class TestUndoInheritsTheGuards(UndoTestCase):
    def test_stale_mtime_refuses_before_any_write(self) -> None:
        self.edit("1", "status", "☑ Done")
        path = self.registry_path("ZZ-10")
        before = path.read_bytes()
        with self.assertRaises(writes.StaleMtimeError):
            writes.undo_last(self.root, project_id="ZZ-10", mtime=self.mtime_of(path) - 5)
        self.assertEqual(path.read_bytes(), before)

    def test_row_that_became_linked_is_refused(self) -> None:
        path = self.registry_path("ZZ-10")
        self.edit("1", "status", "☑ Done")
        path.write_text(path.read_text(encoding="utf-8").replace(
            "| ☑ Done | 🟠 your move | 2026-09-10 | — |", "| ☑ Done | 🟠 your move | 2026-09-10 | bas-2026-q1 |", 1), encoding="utf-8")
        self.assertRefusedUntouched(writes.LinkedRowError)

    def test_fence_refuses_a_tracking_row_pointing_outside(self) -> None:
        self.edit("1", "status", "☑ Done")
        t = self.tracking_path()
        t.write_text(t.read_text(encoding="utf-8").replace("Memory/Medium-Term/Projects/ZZ-10", "../../../outside/ZZ-10", 1),
                     encoding="utf-8")
        with self.assertRaises(writes.FenceError):
            writes.undo_last(self.root, project_id="ZZ-10", mtime=0.0)
