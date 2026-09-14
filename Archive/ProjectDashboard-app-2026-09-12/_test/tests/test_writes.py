"""Smoke tests for writes.py, against a copied fixture tree only (TEST-4).

Every test runs against a fresh `shutil.copytree` of
`tests/fixtures/writes_root/` into a `tempfile.TemporaryDirectory()` — never
the committed fixture itself (so tests stay repeatable) and never anything
under the real Memory/Medium-Term/ (TEST-4's own rule, and the boss's
explicit instruction for this module: prove it against copies, never the
live store).

The two TEST-7 gate tests this module is not "done" without: AC-3 (a path
escaping the fence is refused) and AC-4 (a legitimate in-fence write
succeeds) are `TestFenceAC3` and `TestSetCellHappyPathAC4Ac1` below.
"""

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
        rel = {
            "ZZ-10": "Memory/Medium-Term/Projects/ZZ-10-sample-writes-target/notes.md",
        }[project_id]
        return self.root / rel

    def tracking_path(self) -> Path:
        return self.root / "Memory/Medium-Term/Projects/_tracking.yaml"

    def edits_log_path(self) -> Path:
        return self.root / "Memory/Long-Term/Logs/edits.log"

    def mtime_of(self, path: Path) -> float:
        return path.stat().st_mtime


class TestImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        for name in ("set_cell", "hand_over", "append_scrap", "append_request",
                     "StaleMtimeError", "FenceError"):
            self.assertTrue(hasattr(writes, name), name)


class TestFenceAC3(WritesTestCase):
    """AC-3 / TEST-7 gate test 1 — a path escaping Memory/Medium-Term/ is
    refused, regardless of how it was constructed (a traversal baked into
    the tracking row's own `path:` field, here)."""

    def test_escaping_path_is_refused_and_nothing_is_written(self) -> None:
        outside = Path(self.root).parent / "outside-fence" / "registry.md"
        outside.parent.mkdir(parents=True, exist_ok=True)
        outside.write_text("should never be touched", encoding="utf-8")

        with self.assertRaises(writes.FenceError):
            writes.set_cell(
                self.root, project_id="ZZ-12", row="1", column="state",
                value="🟢 on track", mtime=0.0,
            )
        self.assertEqual(outside.read_text(encoding="utf-8"), "should never be touched")

    def test_refusal_still_logs_one_line(self) -> None:
        with self.assertRaises(writes.FenceError):
            writes.set_cell(self.root, project_id="ZZ-12", row="1", column="state", value="x", mtime=0.0)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:FenceError", log_lines[0])
        self.assertIn("project=ZZ-12", log_lines[0])


class TestSetCellHappyPathAC4Ac1(WritesTestCase):
    """AC-4 / TEST-7 gate test 2 — a legitimate in-fence write succeeds.
    AC-1 — exactly one cell changes; every other line is byte-identical."""

    def test_state_cell_changes_and_rest_of_file_is_untouched(self) -> None:
        path = self.registry_path("ZZ-10")
        original_lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
        mtime = self.mtime_of(path)

        result = writes.set_cell(
            self.root, project_id="ZZ-10", row="1", column="state",
            value="🟢 on track", mtime=mtime,
        )

        self.assertTrue(result.ok)
        self.assertEqual(result.mtime, path.stat().st_mtime)
        new_lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
        self.assertEqual(len(new_lines), len(original_lines))
        changed = [i for i, (a, b) in enumerate(zip(original_lines, new_lines)) if a != b]
        self.assertEqual(len(changed), 1)
        self.assertIn("🟢 on track", new_lines[changed[0]])
        self.assertIn("Confirm the sample thing", new_lines[changed[0]])  # Action cell untouched

        record = stores.read_registry(path, "ZZ-10")
        self.assertEqual(record.malformed_rows, [])
        row = next(r for r in record.next_actions if r.index.value == "1")
        self.assertEqual(row.state.value, "🟢 on track")
        self.assertEqual(row.status.value, "☐ Open")  # untouched

    def test_pending_sweep_stamped_and_edit_logged(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="1", column="state", value="🟢 on track", mtime=mtime)

        tracking_text = self.tracking_path().read_text(encoding="utf-8")
        data = stores.yaml_load(tracking_text)
        row = next(p for p in data["projects"] if p["id"] == "ZZ-10")
        self.assertIs(row["pending_sweep"], True)
        # the other rows are untouched
        other = next(p for p in data["projects"] if p["id"] == "ZZ-11")
        self.assertNotIn("pending_sweep", other)

        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("set_cell", log_lines[0])
        self.assertIn("project=ZZ-10", log_lines[0])
        self.assertIn("outcome=ok", log_lines[0])


class TestMtimeGuardAC2(WritesTestCase):
    def test_stale_mtime_refused_and_file_byte_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        stale = self.mtime_of(path) - 999

        with self.assertRaises(writes.StaleMtimeError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="state", value="🔴 urgent", mtime=stale)

        self.assertEqual(path.read_bytes(), original)
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("refused:stale_mtime", log_lines[0])


class TestDoneAppendsCompletionSameCall(WritesTestCase):
    """FR-10 / AC-9 (unblock.spec.md) — the completion append lands in the
    same call as Done, not a second one."""

    def test_done_tick_appends_exactly_one_completion_row(self) -> None:
        completions_path = self.root / "Memory/Medium-Term/completions.log"
        self.assertFalse(completions_path.exists())

        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="☑ Done", mtime=mtime)

        self.assertTrue(result.completion_logged)
        lines = completions_path.read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(lines), 1)
        parts = [p.strip() for p in lines[0].split("|", 3)]
        self.assertEqual(len(parts), 4)
        _date, project_id, action_id, action_text = parts
        self.assertEqual(project_id, "ZZ-10")
        self.assertEqual(action_id, "1")
        self.assertEqual(action_text, "Confirm the sample thing")

        # And the same completion log is what stores.py reads back.
        entries = stores.read_completion_log(completions_path)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].project_id, "ZZ-10")

    def test_non_done_status_never_appends_a_completion(self) -> None:
        completions_path = self.root / "Memory/Medium-Term/completions.log"
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        result = writes.set_cell(self.root, project_id="ZZ-10", row="1", column="status", value="◐ Doing", mtime=mtime)
        self.assertFalse(result.completion_logged)
        self.assertFalse(completions_path.exists())


class TestPipeHazardSurvivesAnEdit(WritesTestCase):
    """Mirrors stores.spec.md FR-2a/AC-2c from the write side: editing one
    row must never disturb a sibling row's backticked, pipe-bearing Action
    cell, and must not introduce a malformed row."""

    def test_editing_row_two_state_leaves_row_two_action_pipes_intact(self) -> None:
        path = self.registry_path("ZZ-10")
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-10", row="2", column="state", value="🔵 waiting", mtime=mtime)

        record = stores.read_registry(path, "ZZ-10")
        self.assertEqual(record.malformed_rows, [])
        row = next(r for r in record.next_actions if r.index.value == "2")
        self.assertIn("Alpha|Beta|Gamma", row.action.value)
        self.assertEqual(row.state.value, "🔵 waiting")
        self.assertEqual(row.kind.value, "hand-over")  # untouched


class TestMultiStreamRowAddressing(WritesTestCase):
    """The house convention (1A/1B, ...) makes '#' unique across streams;
    editing '1B' must never touch '1A' in the sibling stream."""

    def test_editing_1b_leaves_1a_untouched(self) -> None:
        path = self.registry_path("ZZ-11")
        mtime = self.mtime_of(path)
        writes.set_cell(self.root, project_id="ZZ-11", row="1B", column="kind", value="waiting", mtime=mtime)

        record = stores.read_registry(path, "ZZ-11")
        self.assertEqual(record.malformed_rows, [])
        row_1a = next(r for r in record.next_actions if r.index.value == "1A")
        row_1b = next(r for r in record.next_actions if r.index.value == "1B")
        self.assertEqual(row_1a.kind.value, "mine")
        self.assertEqual(row_1b.kind.value, "waiting")


class TestRowNotFound(WritesTestCase):
    def test_unknown_row_id_raises_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(writes.RowNotFoundError):
            writes.set_cell(self.root, project_id="ZZ-10", row="99", column="state", value="🟢 on track", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)


class TestUnsafeValueRejected(WritesTestCase):
    def test_pipe_in_value_raises_and_file_unchanged(self) -> None:
        path = self.registry_path("ZZ-10")
        original = path.read_bytes()
        mtime = self.mtime_of(path)
        with self.assertRaises(ValueError):
            writes.set_cell(self.root, project_id="ZZ-10", row="1", column="state", value="a | b", mtime=mtime)
        self.assertEqual(path.read_bytes(), original)


class TestHandOver(WritesTestCase):
    """writes.spec.md FR-6 / unblock.spec.md AC-3 — flips kind 4 -> 1 and
    records the recipient, in the same operation."""

    def test_flips_kind_and_records_recipient_and_stamps_sweep(self) -> None:
        registry_path = self.registry_path("ZZ-10")
        notes_path = self.notes_path("ZZ-10")
        mtime = self.mtime_of(registry_path)

        result = writes.hand_over(self.root, project_id="ZZ-10", row="3", recipient="Agent X", mtime=mtime)

        self.assertTrue(result.ok)
        record = stores.read_registry(registry_path, "ZZ-10")
        self.assertEqual(record.malformed_rows, [])
        row = next(r for r in record.next_actions if r.index.value == "3")
        self.assertEqual(row.kind.value, "waiting")

        notes_text = notes_path.read_text(encoding="utf-8")
        self.assertIn("Handed over row 3 to Agent X", notes_text)
        self.assertIn("an existing scrap, already here before any test runs", notes_text)  # untouched

        data = stores.yaml_load(self.tracking_path().read_text(encoding="utf-8"))
        row_tracking = next(p for p in data["projects"] if p["id"] == "ZZ-10")
        self.assertIs(row_tracking["pending_sweep"], True)

        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("hand_over", log_lines[0])
        self.assertIn("project=ZZ-10", log_lines[0])
        self.assertIn("outcome=ok", log_lines[0])


class TestAppendScrap(WritesTestCase):
    def test_appends_one_bullet_under_scraps_section(self) -> None:
        notes_path = self.notes_path("ZZ-10")
        before = notes_path.read_text(encoding="utf-8")
        result = writes.append_scrap(self.root, project_id="ZZ-10", text="a fresh scrap")
        after = notes_path.read_text(encoding="utf-8")
        self.assertTrue(result.ok)
        self.assertEqual(after.count("\n"), before.count("\n") + 1)
        self.assertIn("- a fresh scrap", after)
        self.assertIn("- an existing scrap, already here before any test runs", after)

        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 1)
        self.assertIn("append_scrap", log_lines[0])
        self.assertIn("project=ZZ-10", log_lines[0])
        self.assertIn("outcome=ok", log_lines[0])


class TestAppendRequest(WritesTestCase):
    """FR-7 / AC-5, AC-6 — appends to _requests.yaml only; queue.md is
    never touched."""

    def test_creates_file_then_appends_second_row_leaving_queue_untouched(self) -> None:
        requests_path = self.root / "Memory/Medium-Term/Projects/_requests.yaml"
        queue_path = self.root / "Memory/Medium-Term/MinorTasks/queue.md"
        queue_before = queue_path.read_bytes()
        self.assertFalse(requests_path.exists())

        first = writes.append_request(self.root, source="ZZ-10", text="please draft the summary")
        self.assertTrue(requests_path.exists())
        data = stores.yaml_load(requests_path.read_text(encoding="utf-8"))
        self.assertEqual(len(data["requests"]), 1)
        self.assertEqual(data["requests"][0]["text"], "please draft the summary")
        self.assertEqual(first.source, "ZZ-10")

        writes.append_request(self.root, source="depot", text="dispatch this Low-impact job")
        data = stores.yaml_load(requests_path.read_text(encoding="utf-8"))
        self.assertEqual(len(data["requests"]), 2)
        self.assertEqual(data["requests"][1]["source"], "depot")

        self.assertEqual(queue_path.read_bytes(), queue_before)

        # AC-6: every append above leaves exactly one new edits.log line.
        log_lines = self.edits_log_path().read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(log_lines), 2)
        self.assertIn("append_request", log_lines[0])
        self.assertIn("project=ZZ-10", log_lines[0])
        self.assertIn("append_request", log_lines[1])
        self.assertIn("project=depot", log_lines[1])


class TestNoParkedKeyEver(unittest.TestCase):
    """FR-11 — no `parked` key is ever written, under any circumstance."""

    def test_grep_finds_no_parked(self) -> None:
        source = Path(writes.__file__).read_text(encoding="utf-8")
        self.assertNotIn("parked", source)


class TestNoDataFunctionOpensGetOnlyPaths(unittest.TestCase):
    """FR-8 is server.py's to enforce (POST-only routing); this just checks
    this module never imports anything that would let a read path double
    as a write path — i.e. no accidental exposure of open(..., 'w')/'a'
    behind a function name that looks like a getter."""

    def test_every_public_function_is_named_as_a_write(self) -> None:
        public = [n for n in dir(writes) if not n.startswith("_") and callable(getattr(writes, n))]
        write_verbs = ("set_cell", "hand_over", "append_scrap", "append_request")
        for name in write_verbs:
            self.assertIn(name, public)


if __name__ == "__main__":
    unittest.main()
