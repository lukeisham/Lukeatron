"""Smoke tests for stores.py, against in-repo fixtures (TEST-4) plus one
real-tree integration test for AC-1 (this app's own board, not a fixture).

One test per acceptance criterion in stores.spec.md that a fixture can
exercise, the module-level smoke tests TEST-2 asks for (imports, happy path,
one guard path), and the read-only gate test TEST-7 requires.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import paths  # noqa: E402  (path must be set up first)
import stores  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class TestImport(unittest.TestCase):
    def test_imports_cleanly_and_exposes_the_public_api(self) -> None:
        # AC-4 / PY-3: this module was already imported at the top of this
        # file, before any fixture path was constructed — if importing it
        # touched the filesystem, a wrong or missing path would have raised
        # there instead of inside a test. Reaching this line is the proof.
        for name in ("load_board_sources", "read_tracking", "load_projects", "read_registry"):
            self.assertTrue(hasattr(stores, name), f"missing public function: {name}")


class TestYamlLoad(unittest.TestCase):
    def test_happy_path_mapping_sequence_and_flow_forms(self) -> None:
        text = """
projects:
  - id: PP-01
    title: "Quoted Title"
    secondary_contexts: [Coding, Personal Research]
    waiting_on: ""
  - id: PP-02
    title: Bare Title
"""
        data = stores.yaml_load(text)
        self.assertEqual(data["projects"][0]["id"], "PP-01")
        self.assertEqual(data["projects"][0]["title"], "Quoted Title")
        self.assertEqual(data["projects"][0]["secondary_contexts"], ["Coding", "Personal Research"])
        self.assertEqual(data["projects"][0]["waiting_on"], "")
        self.assertEqual(data["projects"][1]["title"], "Bare Title")

    def test_dates_pass_through_as_raw_strings(self) -> None:
        # FR-7: no engine here ever promotes a bare scalar to a date object,
        # so this holds for every value, not just the ones named "date".
        data = stores.yaml_load("created: 2026-06-22\nwake: ASAP\n")
        self.assertEqual(data["created"], "2026-06-22")
        self.assertEqual(data["wake"], "ASAP")
        self.assertIsInstance(data["created"], str)


class TestField(unittest.TestCase):
    def test_blank_cell_and_absent_column_both_not_stated_but_distinct_from_a_value(self) -> None:
        # AC-3's actual requirement: blank and absent must not be mistaken
        # for a value. They needn't be distinguishable from each other.
        self.assertEqual(stores._field(None), stores.Field(None, False))
        self.assertEqual(stores._field(""), stores.Field(None, False))
        self.assertEqual(stores._field("—"), stores.Field(None, False))
        self.assertEqual(stores._field("mine"), stores.Field("mine", True))
        self.assertNotEqual(stores._field("mine").stated, stores._field("").stated)


class TestRegistryMultiStream(unittest.TestCase):
    """Two Next Actions streams under one heading return every row, and the
    Events table's Type column never leaks in as Kind."""

    def test_both_streams_returned_and_kind_never_confused_with_events_type(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_multi_stream.md", "ZZ-01")
        self.assertEqual(len(record.next_actions), 2)
        actions = {row.action.value for row in record.next_actions}
        self.assertEqual(actions, {"Do alpha thing", "Do beta thing"})
        kinds = {row.kind.value for row in record.next_actions}
        self.assertEqual(kinds, {"mine", "delegate"})  # never "Milestone"
        self.assertEqual(len(record.events), 1)
        self.assertEqual(record.events[0].type, stores.Field("Milestone", True))


class TestRegistryLegacyColumns(unittest.TestCase):
    """AC-3 (this app's numbering) — a Next Actions table missing optional
    columns returns them as not-stated; the columns that DO exist still
    parse correctly, resolved by name."""

    def test_missing_columns_are_not_stated(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_legacy_no_columns.md", "ZZ-02")
        self.assertEqual(len(record.next_actions), 1)
        row = record.next_actions[0]
        self.assertEqual(row.action.value, "Legacy action with no kind or state column")
        self.assertEqual(row.owner, stores.Field("Luke", True))
        self.assertEqual(row.kind, stores.Field(None, False))
        self.assertEqual(row.state, stores.Field(None, False))
        self.assertEqual(row.status, stores.Field("☐ Open", True))
        self.assertEqual(row.due, stores.Field(None, False))  # "—" is the blank glyph, not a value


class TestNextActionKindTypeAlias(unittest.TestCase):
    """FR-8 — the older `Type: Human|Agent`-era column name aliases onto the
    same `kind` field as the modern `Kind` header (real registries CH-16 and
    CH-17 still carry the old header)."""

    def test_legacy_type_header_aliases_to_kind(self) -> None:
        header = "| # | Action | Owner | Type | Status | State | 🔗 Link | Due |"
        row_line = "| 1 | Confirm access | Agent | delegate | ☐ Open | 🟢 on track | — |  |"
        skipped: list[stores.SkippedItem] = []
        columns = stores._resolve_columns(stores._split_row(header), stores._NEXT_ACTION_ALIASES, has_index_column=True)
        cells = stores._split_row(row_line)
        by_key = {key: cell for key, cell in zip(columns, cells) if key is not None}
        row = stores.NextActionRow(**{name: stores._field(by_key.get(name)) for name in stores._NEXT_ACTION_FIELDS})
        self.assertEqual(row.kind, stores.Field("delegate", True))
        self.assertEqual(skipped, [])


class TestRegistryPipeHazard(unittest.TestCase):
    """AC-2 — a row with a backticked pipe (CH-15's Action column carries a
    real one) parses into the header's cell count, not a shredded one."""

    def test_backticked_pipes_are_not_cell_boundaries(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_pipe_hazard.md", "ZZ-04")
        self.assertEqual(record.skipped_rows, [])
        self.assertEqual(len(record.next_actions), 3)
        row = record.next_actions[1]
        self.assertIn("CalvinCommentaries|Clarke|DTN|KingComments|RWP|Scofield", row.action.value)
        self.assertEqual(row.owner, stores.Field("Luke / Agent", True))
        self.assertEqual(row.kind, stores.Field("delegate", True))
        self.assertEqual(row.status, stores.Field("☑ Done", True))
        self.assertEqual(row.due, stores.Field(None, False))

    def test_a_genuinely_shifted_row_is_reported_with_file_and_line_not_guessed(self) -> None:
        path = FIXTURES / "registry_full_sections.md"
        record = stores.read_registry(path, "ZZ-06")
        # The Events table's third row is missing a cell (FR-4 fixture).
        self.assertEqual(len(record.events), 2)  # the two well-formed rows, not the shifted one
        self.assertEqual(len(record.skipped_rows), 1)
        skipped = record.skipped_rows[0]
        self.assertEqual(skipped.file, path)
        self.assertIsInstance(skipped.line, int)
        self.assertIn("3 cell", skipped.reason)
        self.assertIn("4", skipped.reason)
        self.assertEqual(skipped.project_id, "ZZ-06")


class TestRegistryFullSections(unittest.TestCase):
    """Events, Documents and People all resolve columns by header name, and
    tolerate the People table's several real header spellings (Link vs
    Contact vs Notes; a combined "Person (ID)" cell vs separate columns)."""

    def setUp(self) -> None:
        self.record = stores.read_registry(FIXTURES / "registry_full_sections.md", "ZZ-06")

    def test_documents_on_close_arrow_column_resolves_by_name(self) -> None:
        self.assertEqual(len(self.record.documents), 1)
        doc = self.record.documents[0]
        self.assertEqual(doc.file, stores.Field("documents/notes.md", True))
        self.assertEqual(doc.description, stores.Field("working notes", True))
        self.assertEqual(doc.on_close, stores.Field("Archive/", True))

    def test_people_both_header_spellings_land_on_the_same_fields(self) -> None:
        self.assertEqual(len(self.record.people), 2)
        combined, legacy = self.record.people
        self.assertEqual(combined.person, stores.Field("Sara Edwards (SE26)", True))
        self.assertEqual(combined.link, stores.Field("Memory/Long-Term/People/SE26-sara-edwards/", True))
        self.assertEqual(legacy.person, stores.Field("Robert Cole", True))
        self.assertEqual(legacy.role, stores.Field("Treasurer", True))
        self.assertEqual(legacy.link, stores.Field("no People/ record yet", True))  # Notes aliases to link

    def test_definition_of_done_bullets_read_verbatim_in_file_order(self) -> None:
        self.assertEqual(
            self.record.definition_of_done,
            ["meets the Personal Research charter", "the full-sections thing is done"],
        )

    def test_decision_log_bullets_read_verbatim_in_file_order(self) -> None:
        self.assertEqual(
            self.record.decision_log,
            [
                "2026-09-10 — chose the full-sections fixture shape — needed one file covering every table plus prose",
                "2026-09-11 — added Definition of Done and Decision Log — outline-print FR-2 needs both",
            ],
        )


class TestProjectIsolation(unittest.TestCase):
    """AC-5 — a corrupt registry is reported in `skipped`, and the other
    fixture projects still load."""

    def test_one_corrupt_project_does_not_block_the_rest(self) -> None:
        root = FIXTURES.parents[1]  # build/ — fixture paths are relative to it
        tracking = stores.read_tracking(FIXTURES / "tracking_sample.yaml")
        projects, skipped = stores.load_projects(root, tracking)
        loaded_ids = {p.tracking.id.value for p in projects}
        self.assertEqual(loaded_ids, {"ZZ-01", "ZZ-02", "ZZ-06"})
        self.assertEqual(len(skipped), 1)
        self.assertEqual(skipped[0].project_id, "ZZ-05")
        self.assertIn("frontmatter", skipped[0].reason.lower())


class TestWriteGuard(unittest.TestCase):
    """TEST-7 — this module's read-only promise gets an explicit gate test:
    no function anywhere in the source opens a file for writing."""

    def test_no_write_mode_anywhere_in_source(self) -> None:
        source = Path(stores.__file__).read_text(encoding="utf-8")
        self.assertNotIn('"w"', source)
        self.assertNotIn("'w'", source)
        self.assertNotIn("write_text", source)
        self.assertNotIn(".write(", source)

    def test_never_imports_writes_or_model(self) -> None:
        source = Path(stores.__file__).read_text(encoding="utf-8")
        self.assertNotIn("import writes", source)
        self.assertNotIn("import model", source)
        self.assertNotIn("from writes", source)
        self.assertNotIn("from model", source)


class TestPlansNew(unittest.TestCase):
    def test_missing_plans_folder_is_empty_not_an_error(self) -> None:
        self.assertEqual(stores.read_plans_new(FIXTURES / "no-such-plans-folder"), [])

    def test_lists_files_with_mtime(self) -> None:
        entries = stores.read_plans_new(FIXTURES)
        names = {entry.name for entry in entries}
        self.assertIn("tracking_sample.yaml", names)
        for entry in entries:
            self.assertIsInstance(entry.mtime, float)


class TestLatestMtime(unittest.TestCase):
    """wishlist #5 — a stat-only change check. Every assertion here sets
    mtimes explicitly with os.utime (fixed values, no real clock/sleep —
    AC-4's own no-clock discipline applied to a filesystem timestamp) so
    the tests are deterministic and fast."""

    def _make_project_tree(self, root: Path, *, project_id: str, registry_mtime: float, notes_mtime: float | None = None) -> None:
        project_dir = root / "Memory" / "Medium-Term" / "Projects" / project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        registry_path = project_dir / "registry.md"
        registry_path.write_text("---\nid: x\n---\n", encoding="utf-8")
        os.utime(registry_path, (registry_mtime, registry_mtime))
        if notes_mtime is not None:
            notes_path = project_dir / "notes.md"
            notes_path.write_text("notes", encoding="utf-8")
            os.utime(notes_path, (notes_mtime, notes_mtime))

    def _write_tracking(self, root: Path, project_ids: list[str], *, mtime: float) -> None:
        tracking_dir = root / "Memory" / "Medium-Term" / "Projects"
        tracking_dir.mkdir(parents=True, exist_ok=True)
        tracking_path = tracking_dir / "_tracking.yaml"
        lines = ["projects:"]
        for pid in project_ids:
            rel = f"Memory/Medium-Term/Projects/{pid}/registry.md"
            lines.append(f"  - id: {pid}\n    path: {rel}")
        tracking_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        os.utime(tracking_path, (mtime, mtime))

    def test_latest_mtime_for_tracking_returns_the_max_across_multiple_project_dirs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._make_project_tree(root, project_id="PP-01", registry_mtime=1000.0)
            self._make_project_tree(root, project_id="PP-02", registry_mtime=3000.0, notes_mtime=2000.0)
            tracking_rows = stores.read_tracking(self._write_tracking_and_return_path(root, ["PP-01", "PP-02"], mtime=500.0))
            self.assertEqual(stores.latest_mtime_for_tracking(root, tracking_rows), 3000.0)

    def _write_tracking_and_return_path(self, root: Path, project_ids: list[str], *, mtime: float) -> Path:
        self._write_tracking(root, project_ids, mtime=mtime)
        return root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml"

    def test_latest_registry_mtime_reflects_a_touched_registry_file_on_the_next_call(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._make_project_tree(root, project_id="PP-01", registry_mtime=1000.0)
            self._write_tracking(root, ["PP-01"], mtime=500.0)
            first = stores.latest_registry_mtime(root)
            self.assertEqual(first, 1000.0)

            registry_path = root / "Memory" / "Medium-Term" / "Projects" / "PP-01" / "registry.md"
            os.utime(registry_path, (9000.0, 9000.0))
            second = stores.latest_registry_mtime(root)
            self.assertEqual(second, 9000.0)
            self.assertGreater(second, first)

    def test_unaffected_by_touching_a_file_outside_any_tracked_project(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._make_project_tree(root, project_id="PP-01", registry_mtime=1000.0)
            self._write_tracking(root, ["PP-01"], mtime=500.0)
            baseline = stores.latest_registry_mtime(root)

            stray = root / "Memory" / "Medium-Term" / "Projects" / "PP-01" / "some-other-file.md"
            stray.write_text("not tracked", encoding="utf-8")
            os.utime(stray, (9999.0, 9999.0))
            self.assertEqual(stores.latest_registry_mtime(root), baseline)

    def test_missing_tracking_file_returns_zero_not_an_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(stores.latest_registry_mtime(Path(tmp)), 0.0)

    def test_never_parses_registry_content_only_stats_it(self) -> None:
        # A registry.md with no frontmatter fence at all would raise
        # StoresError out of read_registry — latest_mtime_for_tracking must
        # never call it, so this must not raise, and must still return a
        # real timestamp from the stat alone.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project_dir = root / "Memory" / "Medium-Term" / "Projects" / "PP-01"
            project_dir.mkdir(parents=True)
            registry_path = project_dir / "registry.md"
            registry_path.write_text("not even frontmatter", encoding="utf-8")
            os.utime(registry_path, (4242.0, 4242.0))
            tracking_path = self._write_tracking_and_return_path(root, ["PP-01"], mtime=500.0)
            tracking_rows = stores.read_tracking(tracking_path)
            self.assertEqual(stores.latest_mtime_for_tracking(root, tracking_rows), 4242.0)


class TestRealTreeAC1(unittest.TestCase):
    """AC-1 — against the real Lukeatron board (not a fixture): every live
    project loads, with zero unexplained skips. `find_lukeatron_root()` runs
    with no override, exactly as the shipped app will call it."""

    def test_reads_all_live_projects_with_zero_skips(self) -> None:
        root = paths.find_lukeatron_root()
        tracking_path = root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml"
        tracking_rows = stores.read_tracking(tracking_path)
        projects, skipped = stores.load_projects(root, tracking_rows)

        self.assertEqual(skipped, [], f"unexplained skips against the real tree: {skipped}")
        self.assertEqual(len(projects), len(tracking_rows))
        # Sanity floor so this test cannot pass vacuously against an empty
        # or wrongly-resolved root — the real board carries dozens of
        # projects today; a near-zero count would mean the root resolved
        # somewhere it shouldn't have.
        self.assertGreaterEqual(len(projects), 30)


if __name__ == "__main__":
    unittest.main()
