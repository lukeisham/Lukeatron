"""Smoke tests for stores.py, against in-repo fixtures only (TEST-4).

One test per acceptance criterion in the stores spec that a fixture can
exercise, plus the module-level smoke tests TEST-2 asks for (imports, happy
path, one guard path). Real-store verification against Memory/Medium-Term/
is a separate, one-off check (never a unit test — TEST-4 forbids touching a
real store from here) reported alongside this file.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import stores  # noqa: E402  (path must be set up first)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class TestImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        # PY-3: importing stores must never touch the filesystem. If it did,
        # a bad path baked into the module would fail here rather than at
        # call time.
        self.assertTrue(hasattr(stores, "load_board_sources"))


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

    def test_dates_normalize_to_iso_strings_either_engine(self) -> None:
        data = stores.yaml_load("created: 2026-06-22\n")
        self.assertEqual(data["created"], "2026-06-22")

    def test_flow_mapping_inside_sequence(self) -> None:
        data = stores.yaml_load(FIXTURES.joinpath("links_sample.yaml").read_text())
        member = data["links"][0]["members"][0]
        self.assertEqual(member["project"], "ZZ-01")
        self.assertEqual(member["text"], "Do alpha thing")


class TestField(unittest.TestCase):
    def test_blank_cell_and_absent_column_both_not_stated_but_distinct_from_a_value(self) -> None:
        # FR-3's actual requirement: blank and absent must not be mistaken
        # for a value. They needn't be distinguishable from each other.
        self.assertEqual(stores._field(None), stores.Field(None, False))
        self.assertEqual(stores._field(""), stores.Field(None, False))
        self.assertEqual(stores._field("—"), stores.Field(None, False))
        self.assertEqual(stores._field("mine"), stores.Field("mine", True))
        self.assertNotEqual(stores._field("mine").stated, stores._field("").stated)


class TestRegistryAC1(unittest.TestCase):
    """AC-1 — a registry with two Next Actions streams returns every row
    from both, and the Events table's Type column never leaks in as Kind."""

    def test_both_streams_returned(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_multi_stream.md", "ZZ-01")
        self.assertEqual(len(record.next_actions), 2)
        actions = {row.action.value for row in record.next_actions}
        self.assertEqual(actions, {"Do alpha thing", "Do beta thing"})
        kinds = {row.kind.value for row in record.next_actions}
        self.assertEqual(kinds, {"mine", "hand-over"})  # never "Milestone"


class TestRegistryAC2(unittest.TestCase):
    """AC-2 — no State/Kind/Effort/Tokens column parses, everything comes
    back not-stated, and the columns that DO exist still parse correctly."""

    def test_legacy_registry_parses_with_optional_columns_not_stated(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_legacy_no_columns.md", "ZZ-02")
        self.assertEqual(len(record.next_actions), 1)
        row = record.next_actions[0]
        self.assertEqual(row.action.value, "Legacy action with no kind, effort, tokens or state column")
        self.assertEqual(row.owner, stores.Field("Luke", True))
        self.assertEqual(row.kind, stores.Field(None, False))
        self.assertEqual(row.effort, stores.Field(None, False))
        self.assertEqual(row.tokens, stores.Field(None, False))
        self.assertEqual(row.state, stores.Field(None, False))
        self.assertEqual(row.status, stores.Field("☐ Open", True))
        self.assertEqual(row.due, stores.Field(None, False))  # "—" is the blank glyph, not a value


class TestRegistryAC2a(unittest.TestCase):
    """AC-2a — action-level Effort is distinct from the project's own
    `effort:` key; both come back, and stores picks neither as the winner."""

    def test_action_and_project_effort_both_returned_distinctly(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_effort_tokens.md", "ZZ-03")
        self.assertEqual(record.frontmatter["effort"], stores.Field("🔨 an hour", True))
        row = record.next_actions[0]
        self.assertEqual(row.effort, stores.Field("⚡ minutes", True))
        self.assertEqual(row.tokens, stores.Field("some", True))
        self.assertNotEqual(row.effort.value, record.frontmatter["effort"].value)


class TestCompletionLogAC2b(unittest.TestCase):
    """AC-2b — no completion log on disk returns an empty list, no error."""

    def test_missing_log_is_empty_not_an_error(self) -> None:
        entries = stores.read_completion_log(FIXTURES / "no-such-completions.log")
        self.assertEqual(entries, [])


class TestRegistryAC2c(unittest.TestCase):
    """AC-2c — CH-15's row whose Action carries a backticked, pipe-separated
    list parses to exactly its header's cell count, every other column
    read correctly (mirrors the real store's row verbatim)."""

    def test_backticked_pipes_are_not_cell_boundaries(self) -> None:
        record = stores.read_registry(FIXTURES / "registry_pipe_hazard.md", "ZZ-04")
        self.assertEqual(record.malformed_rows, [])
        self.assertEqual(len(record.next_actions), 3)
        row = record.next_actions[1]
        self.assertIn("CalvinCommentaries|Clarke|DTN|KingComments|RWP|Scofield", row.action.value)
        self.assertEqual(row.owner, stores.Field("Luke / Agent", True))
        self.assertEqual(row.kind, stores.Field("hand-over", True))
        self.assertEqual(row.status, stores.Field("☑ Done", True))
        self.assertEqual(row.state, stores.Field("⚪ undefined", True))
        self.assertEqual(row.due, stores.Field(None, False))

    def test_a_genuinely_shifted_row_is_reported_not_guessed(self) -> None:
        header = "| # | Action | Owner | Kind | Status | State | Due |"
        shifted = "| 9 | Missing a cell | Luke | mine | ☐ Open | 🟠 your move |"
        malformed: list[stores.MalformedRow] = []
        rows = stores._parse_next_action_table(header, [shifted], "ZZ-99", malformed)
        self.assertEqual(rows, [])
        self.assertEqual(len(malformed), 1)
        self.assertEqual(malformed[0].expected_cells, 7)
        self.assertEqual(malformed[0].got_cells, 6)


class TestProjectIsolationAC3(unittest.TestCase):
    """AC-3 — a corrupt registry does not prevent the others from loading."""

    def test_one_corrupt_project_does_not_block_the_rest(self) -> None:
        root = FIXTURES.parents[1]  # ProjectDashboard/ — fixture paths are relative to it
        tracking = stores.read_tracking(FIXTURES / "tracking_sample.yaml")
        projects, skipped = stores.load_projects(root, tracking)
        loaded_ids = {p.tracking.id.value for p in projects}
        self.assertEqual(loaded_ids, {"ZZ-01", "ZZ-02"})
        self.assertEqual([s.project_id for s in skipped], ["ZZ-05"])


class TestWriteGuardAC4(unittest.TestCase):
    """AC-4 — no function in this module opens a file for writing."""

    def test_no_write_mode_anywhere_in_source(self) -> None:
        source = Path(stores.__file__).read_text()
        self.assertNotIn('"w"', source)
        self.assertNotIn("'w'", source)
        self.assertNotIn("write_text", source)
        self.assertNotIn(".write(", source)


class TestQueue(unittest.TestCase):
    def test_open_rows_only_impact_state_wake_due(self) -> None:
        rows = stores.read_queue(FIXTURES / "queue_sample.md")
        self.assertEqual(len(rows), 2)  # the ☑ Done row is excluded
        self.assertEqual(rows[0].impact, stores.Field("Low", True))
        self.assertEqual(rows[0].wake_due, stores.Field(None, False))  # "—"
        self.assertEqual(rows[1].state, stores.Field("🟠 your move", True))
        self.assertEqual(rows[1].wake_due, stores.Field("2026-09-10", True))


class TestLinks(unittest.TestCase):
    def test_members_and_canonical_parsed(self) -> None:
        records = stores.read_links(FIXTURES / "links_sample.yaml")
        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(record.key, stores.Field("sample-link", True))
        self.assertEqual(record.canonical_state, stores.Field("🔵 waiting", True))
        self.assertEqual(len(record.members), 2)
        self.assertEqual(record.members[0].project, stores.Field("ZZ-01", True))


class TestCalendarSnapshotMissing(unittest.TestCase):
    def test_missing_snapshot_is_empty(self) -> None:
        self.assertEqual(stores.read_calendar_snapshot(FIXTURES / "no-such-calendar.yaml"), [])


if __name__ == "__main__":
    unittest.main()
