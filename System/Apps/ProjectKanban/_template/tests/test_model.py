"""Smoke tests for model.py, against hand-built fixtures — no filesystem, no
clock (AC-4). Fixtures are plain dataclasses that structurally match the
`*Like` protocols in model.py; they are never `stores` objects and this file
never imports `stores`, matching FR-15's one-way rule from the other side.

One test per acceptance criterion in model.spec.md that a fixture can
exercise, plus TEST-2's module-level smoke coverage (imports, happy path, a
guard path).
"""

import sys
import unittest
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import model  # noqa: E402  (path must be set up first)

TODAY = date(2026, 9, 11)  # a Friday — fixed so THIS WEEK/NEXT WEEK/OVERDUE are deterministic (AC-2)


# ---------------------------------------------------------------------------
# Fixture builders — plain dataclasses matching model's Protocols by shape
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FakeField:
    value: Any = None
    stated: bool = False


def stated(value: Any) -> FakeField:
    return FakeField(value, True)


NOT_STATED = FakeField(None, False)


@dataclass(frozen=True)
class FakeNextActionRow:
    index: FakeField = NOT_STATED
    action: FakeField = NOT_STATED
    owner: FakeField = NOT_STATED
    kind: FakeField = NOT_STATED
    status: FakeField = NOT_STATED
    state: FakeField = NOT_STATED
    due: FakeField = NOT_STATED
    link: FakeField = NOT_STATED
    recurring_if_done: FakeField = NOT_STATED


@dataclass(frozen=True)
class FakePeopleRow:
    person: FakeField = NOT_STATED
    id: FakeField = NOT_STATED
    role: FakeField = NOT_STATED
    link: FakeField = NOT_STATED


@dataclass(frozen=True)
class FakeEventRow:
    date: FakeField = NOT_STATED
    event: FakeField = NOT_STATED
    type: FakeField = NOT_STATED
    link: FakeField = NOT_STATED


@dataclass(frozen=True)
class FakeDocumentRow:
    file: FakeField = NOT_STATED
    description: FakeField = NOT_STATED
    status: FakeField = NOT_STATED
    on_close: FakeField = NOT_STATED


@dataclass(frozen=True)
class FakeTrackingRow:
    id: FakeField = NOT_STATED
    title: FakeField = NOT_STATED
    context: FakeField = NOT_STATED
    wake: FakeField = NOT_STATED
    status: FakeField = NOT_STATED


@dataclass(frozen=True)
class FakeRegistryRecord:
    project_id: str = "PP-00"
    mtime: float = 0.0
    multi_stream: bool = False
    frontmatter: dict = field(default_factory=dict)
    next_actions: list = field(default_factory=list)
    events: list = field(default_factory=list)
    documents: list = field(default_factory=list)
    people: list = field(default_factory=list)
    definition_of_done: list = field(default_factory=list)
    decision_log: list = field(default_factory=list)


@dataclass(frozen=True)
class FakeProjectSource:
    tracking: FakeTrackingRow
    registry: FakeRegistryRecord


def make_project(
    project_id: str,
    actions: list[FakeNextActionRow],
    *,
    wake: FakeField = NOT_STATED,
    context: FakeField = NOT_STATED,
    status: FakeField = NOT_STATED,
    frontmatter: dict | None = None,
    people: list[FakePeopleRow] | None = None,
    events: list[FakeEventRow] | None = None,
    documents: list[FakeDocumentRow] | None = None,
    definition_of_done: list[str] | None = None,
    decision_log: list[str] | None = None,
    mtime: float = 0.0,
    multi_stream: bool = False,
) -> FakeProjectSource:
    return FakeProjectSource(
        tracking=FakeTrackingRow(
            id=stated(project_id), title=stated(f"Project {project_id}"), context=context, wake=wake, status=status
        ),
        registry=FakeRegistryRecord(
            project_id=project_id,
            mtime=mtime,
            multi_stream=multi_stream,
            frontmatter=frontmatter or {},
            next_actions=actions,
            events=events or [],
            documents=documents or [],
            people=people or [],
            definition_of_done=definition_of_done or [],
            decision_log=decision_log or [],
        ),
    )


class TestImport(unittest.TestCase):
    def test_imports_cleanly_and_exposes_the_public_api(self) -> None:
        # PY-3 / AC-4: this module was already imported above, before any
        # fixture existed — if importing it touched a file or the clock, a
        # missing path or a nondeterministic value would surface there.
        for name in ("build_board", "build_project", "resolve_lane", "parse_due_text", "Guessable"):
            self.assertTrue(hasattr(model, name), f"missing public function: {name}")


class TestResolveLane(unittest.TestCase):
    """FR-1: stated Kind wins; otherwise Owner decides."""

    def test_stated_kind_wins_over_owner(self) -> None:
        result = model.resolve_lane(stated("waiting"), stated("Luke"))
        self.assertEqual(result, model.Guessable(model.LANE_WAITING, False))

    def test_legacy_type_alias_human_means_mine(self) -> None:
        # stores.py aliases the older "Type" column onto this same field;
        # "Human"/"Agent" are that vintage's words, not typos.
        self.assertEqual(model.resolve_lane(stated("Human"), NOT_STATED), model.Guessable(model.LANE_MINE, True))
        self.assertEqual(model.resolve_lane(stated("Agent"), NOT_STATED), model.Guessable(model.LANE_DELEGATE, True))

    def test_owner_fallback_luke_named_and_absent(self) -> None:
        self.assertEqual(model.resolve_lane(NOT_STATED, stated("Luke Isham")), model.Guessable(model.LANE_MINE, True))
        self.assertEqual(model.resolve_lane(NOT_STATED, stated("Keith")), model.Guessable(model.LANE_WAITING, True))
        self.assertEqual(model.resolve_lane(NOT_STATED, NOT_STATED), model.Guessable(model.LANE_UNSHAPED, True))


class TestDateParsing(unittest.TestCase):
    """FR-3: the seven shapes, plus a leading ISO date inside prose."""

    def test_all_seven_shapes_parse_to_the_same_date(self) -> None:
        expected = date(2026, 8, 1)
        for text in ("2026-08-01", "1 Aug 2026", "1 August 2026", "01/08/2026", "01-08-2026"):
            self.assertEqual(model.parse_due_text(text), expected, msg=text)
        self.assertEqual(model.parse_due_text("Aug 2026"), date(2026, 8, 1))
        self.assertEqual(model.parse_due_text("August 2026"), date(2026, 8, 1))

    def test_leading_iso_date_extracted_from_prose(self) -> None:
        self.assertEqual(model.parse_due_text("2026-08-01 pending Keith's reply"), date(2026, 8, 1))

    def test_unparseable_text_returns_none(self) -> None:
        self.assertIsNone(model.parse_due_text("on Keith's reply"))


class TestColumnPlacement(unittest.TestCase):
    """AC-2: a Due cell lands in the expected column, with a fixed today."""

    def test_a_date_this_week_lands_in_this_week(self) -> None:
        action = FakeNextActionRow(action=stated("chase the quote"), due=stated("1 Aug 2026"))
        project = make_project("PP-01", [action])
        view = model.build_project(project, today=date(2026, 8, 1))
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_THIS_WEEK, False))

    def test_slash_date_lands_in_the_expected_column(self) -> None:
        action = FakeNextActionRow(action=stated("chase the quote"), due=stated("01/08/2026"))
        project = make_project("PP-01", [action])
        view = model.build_project(project, today=date(2026, 7, 20))
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_NEXT_WEEK, False))

    def test_asap_is_always_overdue(self) -> None:
        # FR-4: ASAP is a date, not an absence.
        action = FakeNextActionRow(action=stated("call the bank"), due=stated("ASAP"))
        project = make_project("PP-01", [action])
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_OVERDUE, False))
        self.assertEqual(view.due_text, "ASAP")

    def test_unparseable_due_text_lands_in_no_date_and_carries_the_raw_text(self) -> None:
        # FR-5: the raw text must survive even though it couldn't be read as a date.
        action = FakeNextActionRow(action=stated("chase the quote"), due=stated("on Keith's reply"))
        project = make_project("PP-01", [action])
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_NO_DATE, True))
        self.assertEqual(view.due_text, "on Keith's reply")


class TestWakeIncoming(unittest.TestCase):
    """AC-3: a dated wake with no dated actions places the project in INCOMING."""

    def test_dated_wake_with_no_dated_actions_is_incoming(self) -> None:
        undated_action = FakeNextActionRow(action=stated("wait it out"))  # no due at all
        project = make_project("PP-01", [undated_action], wake=stated("1 Aug 2026"))
        view = model.build_project(project, today=date(2026, 7, 20))
        self.assertEqual(view.lane, model.Guessable(model.LANE_INCOMING, True))
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_NEXT_WEEK, False))

    def test_wake_naming_a_trigger_is_no_date_with_trigger_text_carried(self) -> None:
        undated_action = FakeNextActionRow(action=stated("wait it out"))
        project = make_project("PP-01", [undated_action], wake=stated("on council decision"))
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.lane, model.Guessable(model.LANE_INCOMING, True))
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_NO_DATE, True))
        self.assertEqual(view.due_text, "on council decision")

    def test_a_dated_action_overrides_the_wake_entirely(self) -> None:
        # Not "all undated" -> FR-6's override never fires, even with a wake present.
        dated_action = FakeNextActionRow(action=stated("chase the quote"), owner=stated("Luke"), due=stated("ASAP"))
        project = make_project("PP-01", [dated_action], wake=stated("1 Aug 2026"))
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.lane, model.Guessable(model.LANE_MINE, True))
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_OVERDUE, False))


class TestRollup(unittest.TestCase):
    """AC-1: every open action lands in exactly one lane and one column;
    FR-7: the project rolls up to the highest-demand lane and soonest column."""

    def test_every_open_action_has_exactly_one_lane_and_column(self) -> None:
        actions = [
            FakeNextActionRow(action=stated("a"), owner=stated("Luke"), status=NOT_STATED, due=stated("ASAP")),
            FakeNextActionRow(action=stated("b"), owner=stated("Keith"), status=NOT_STATED, due=NOT_STATED),
            FakeNextActionRow(action=stated("c"), owner=NOT_STATED, status=stated("☑ done"), due=stated("ASAP")),
        ]
        project = make_project("PP-01", actions)
        view = model.build_project(project, today=TODAY)
        # the done row is excluded from the open set entirely
        self.assertEqual(len(view.tasks), 2)
        for task in view.tasks:
            self.assertIn(task.lane.value, model._LANE_DEMAND_ORDER)
            self.assertIn(task.due_column.value, model._COLUMN_ORDER)

    def test_project_rolls_up_to_highest_demand_lane_and_soonest_column(self) -> None:
        mine_action = FakeNextActionRow(action=stated("urgent"), owner=stated("Luke"), due=stated("Aug 2026"))
        waiting_action = FakeNextActionRow(action=stated("with Keith"), owner=stated("Keith"), due=stated("ASAP"))
        project = make_project("PP-01", [waiting_action, mine_action])
        view = model.build_project(project, today=TODAY)
        # mine outranks waiting regardless of file order
        self.assertEqual(view.lane, model.Guessable(model.LANE_MINE, True))
        # OVERDUE (from the waiting action's ASAP) is still the soonest column present
        self.assertEqual(view.due_column, model.Guessable(model.COLUMN_OVERDUE, False))

    def test_lane_source_marks_the_one_row_that_actually_drove_the_lane(self) -> None:
        # same fixture as above: the second row (Luke's) outranks the first
        # (Keith's) — the UI cue must land on that row, not the first one.
        waiting_action = FakeNextActionRow(action=stated("with Keith"), owner=stated("Keith"), due=stated("ASAP"))
        mine_action = FakeNextActionRow(action=stated("urgent"), owner=stated("Luke"), due=stated("Aug 2026"))
        project = make_project("PP-01", [waiting_action, mine_action])
        view = model.build_project(project, today=TODAY)
        self.assertFalse(view.tasks[0].lane_source)
        self.assertTrue(view.tasks[1].lane_source)

    def test_lane_source_is_unmarked_everywhere_under_the_wake_override(self) -> None:
        # FR-6: an all-undated project with a dated wake rolls up to INCOMING
        # off the wake, bypassing every task — no row drove that answer, so
        # none should claim to.
        undated_action = FakeNextActionRow(action=stated("someday"), owner=stated("Luke"))
        project = make_project("PP-01", [undated_action], wake=stated("2026-10-01"))
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.lane, model.Guessable(model.LANE_INCOMING, True))
        self.assertFalse(view.tasks[0].lane_source)

    def test_lane_source_is_none_with_no_open_tasks(self) -> None:
        project = make_project("PP-01", [])
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.tasks, [])
        self.assertEqual(view.lane, model.Guessable(model.LANE_UNSHAPED, True))


class TestDoneTasks(unittest.TestCase):
    """wishlist #4b: done rows are built into their own `done_tasks` list,
    in file order, without perturbing any open-side derivation (`tasks`,
    `open_count`, `lane`, `due_*`) — those must come out byte-identical
    whether or not the done rows are present at all."""

    def test_done_tasks_contains_exactly_the_done_rows_in_file_order(self) -> None:
        actions = [
            FakeNextActionRow(action=stated("a open"), owner=stated("Luke"), status=NOT_STATED, due=stated("ASAP")),
            FakeNextActionRow(action=stated("b done first"), owner=stated("Keith"), status=stated("☑ done"), due=NOT_STATED),
            FakeNextActionRow(action=stated("c open"), owner=stated("Luke"), status=NOT_STATED, due=NOT_STATED),
            FakeNextActionRow(action=stated("d done second"), owner=NOT_STATED, status=stated("☑ Done"), due=stated("ASAP")),
        ]
        project = make_project("PP-01", actions)
        view = model.build_project(project, today=TODAY)
        self.assertEqual([t.action for t in view.done_tasks], ["b done first", "d done second"])
        self.assertEqual([t.action for t in view.tasks], ["a open", "c open"])

    def test_done_rows_never_perturb_open_side_derivation(self) -> None:
        open_only = [
            FakeNextActionRow(action=stated("urgent"), owner=stated("Luke"), due=stated("Aug 2026")),
            FakeNextActionRow(action=stated("with Keith"), owner=stated("Keith"), due=stated("ASAP")),
        ]
        with_done_rows = [
            *open_only,
            FakeNextActionRow(action=stated("finished"), owner=stated("Luke"), status=stated("☑ done"), due=stated("ASAP")),
        ]
        baseline = model.build_project(make_project("PP-01", open_only), today=TODAY)
        with_done = model.build_project(make_project("PP-01", with_done_rows), today=TODAY)
        self.assertEqual(with_done.tasks, baseline.tasks)
        self.assertEqual(with_done.open_count, baseline.open_count)
        self.assertEqual(with_done.lane, baseline.lane)
        self.assertEqual(with_done.due_column, baseline.due_column)
        self.assertEqual(with_done.due_date, baseline.due_date)
        self.assertEqual(with_done.due_text, baseline.due_text)
        self.assertEqual(len(with_done.done_tasks), 1)

    def test_no_done_rows_means_an_empty_list_not_none(self) -> None:
        project = make_project("PP-01", [FakeNextActionRow(action=stated("a"), owner=stated("Luke"))])
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.done_tasks, [])


class TestContextPassthrough(unittest.TestCase):
    """controls.spec.md FR-1/FR-2's view filter reads ProjectView.context; it
    must arrive verbatim from _tracking.yaml, stated, never derived."""

    def test_stated_context_passes_through_unchanged(self) -> None:
        project = make_project("CH-01", [], context=stated("Church"))
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.context, "Church")

    def test_absent_context_is_none_not_a_guess(self) -> None:
        project = make_project("PP-01", [])
        view = model.build_project(project, today=TODAY)
        self.assertIsNone(view.context)


class TestLinkedRows(unittest.TestCase):
    """AC-7: a linked action is marked linked and carries its key."""

    def test_linked_action_carries_its_key(self) -> None:
        linked = FakeNextActionRow(action=stated("shared task"), link=stated("LK-04"))
        # stores._field already turns a "—"/blank cell into Field(None, False)
        # before model ever sees it, so the unlinked case is simply not stated.
        unlinked = FakeNextActionRow(action=stated("own task"), link=NOT_STATED)
        project = make_project("PP-01", [linked, unlinked])
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.tasks[0].link_key, "LK-04")
        self.assertIsNone(view.tasks[1].link_key)

    def test_a_stated_link_cell_that_is_not_a_real_key_is_not_linked(self) -> None:
        """A Link cell can carry something other than a _links.yaml key — a
        markdown pointer to a Sandbox dev registry, say. That text is stated
        but is not a kebab-slug key, so it must not trigger the linked-row
        treatment (regression: TE-11 rebuild-rhetoric-app false-flagged as
        shared with another project when its Link cell held a Sandbox link)."""
        markdown_link = FakeNextActionRow(
            action=stated("own task"),
            link=stated("[Sandbox/Rhetoric](../../../System/Sandbox/Rhetoric/registry.md)"),
        )
        project = make_project("TE-11", [markdown_link])
        view = model.build_project(project, today=TODAY)
        self.assertIsNone(view.tasks[0].link_key)


class TestProjectDetailPassthrough(unittest.TestCase):
    """outline-print.spec.md FR-2's project-page fields: purpose, definition
    of done, decision log, events, documents and people all cross model
    unchanged — this module derives none of them, it only carries them
    (D-2's "only model derives a fact" does not apply to plain passthrough).
    Also RegistryRecord's own `mtime` (writes' concurrency gate, `writes` ->
    the files row in documentation.spec.md's cross-boundary table), and each
    task's raw kind/status/state — the current value outline-print's edit
    controls need before Luke changes anything."""

    def test_purpose_definition_of_done_and_decision_log_pass_through_verbatim(self) -> None:
        project = make_project(
            "PP-03",
            [],
            frontmatter={"purpose": stated("Keep the lights on")},
            definition_of_done=["criterion one", "criterion two"],
            decision_log=["2026-09-10 — decided X — because Y"],
        )
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.purpose, "Keep the lights on")
        self.assertEqual(view.definition_of_done, ["criterion one", "criterion two"])
        self.assertEqual(view.decision_log, ["2026-09-10 — decided X — because Y"])

    def test_unstated_purpose_is_none_not_a_guess(self) -> None:
        project = make_project("PP-03", [])
        view = model.build_project(project, today=TODAY)
        self.assertIsNone(view.purpose)

    def test_events_documents_and_people_pass_through_as_views(self) -> None:
        project = make_project(
            "PP-03",
            [],
            events=[FakeEventRow(date=stated("2026-09-20"), event=stated("Committee meeting"), type=stated("Meeting"))],
            documents=[FakeDocumentRow(file=stated("documents/notes.md"), status=stated("Draft"))],
            people=[FakePeopleRow(person=stated("Sara Edwards"), role=stated("Committee member"))],
        )
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.events, [model.EventView(date="2026-09-20", event="Committee meeting", type="Meeting", link=None)])
        self.assertEqual(view.documents, [model.DocumentView(file="documents/notes.md", description=None, status="Draft", on_close=None)])
        self.assertEqual(view.people, [model.PersonView(person="Sara Edwards", id=None, role="Committee member", link=None)])

    def test_mtime_carries_through_unchanged(self) -> None:
        project = make_project("PP-03", [], mtime=1234.5)
        view = model.build_project(project, today=TODAY)
        self.assertEqual(view.mtime, 1234.5)

    def test_task_carries_raw_kind_status_and_state_for_the_edit_controls(self) -> None:
        row = FakeNextActionRow(
            action=stated("do the thing"), kind=stated("mine"), status=stated("◐ Doing"), state=stated("🟢 on track")
        )
        project = make_project("PP-03", [row])
        view = model.build_project(project, today=TODAY)
        task = view.tasks[0]
        self.assertEqual(task.kind, "mine")
        self.assertEqual(task.status, "◐ Doing")
        self.assertEqual(task.state, "🟢 on track")

    def test_multi_stream_passes_through_unchanged(self) -> None:
        project_single = make_project("PP-03", [], multi_stream=False)
        view_single = model.build_project(project_single, today=TODAY)
        self.assertFalse(view_single.multi_stream)

        project_multi = make_project("PP-03", [], multi_stream=True)
        view_multi = model.build_project(project_multi, today=TODAY)
        self.assertTrue(view_multi.multi_stream)


class TestBoardCounts(unittest.TestCase):
    """FR-12: lane and column counts for the whole board."""

    def test_lane_and_column_counts_reflect_every_project(self) -> None:
        mine = make_project("PP-01", [FakeNextActionRow(action=stated("x"), owner=stated("Luke"), due=stated("ASAP"))])
        unshaped = make_project("PP-02", [])
        board = model.build_board([mine, unshaped], today=TODAY)
        self.assertEqual(board.lane_counts, {model.LANE_MINE: 1, model.LANE_UNSHAPED: 1})
        self.assertEqual(board.column_counts, {model.COLUMN_OVERDUE: 1, model.COLUMN_NO_DATE: 1})

    def test_archived_tracking_row_is_dropped_from_the_board(self) -> None:
        """`!ArchiveMemory` sets a project's top-level tracking `status:` to
        Archived and moves its registry into Archive/ rather than deleting
        the row — the board must not render it as if it were still active."""
        live = make_project("PP-01", [])
        archived = make_project("TE-10", [], status=stated("Archived"))
        board = model.build_board([live, archived], today=TODAY)
        self.assertEqual([p.id for p in board.projects], ["PP-01"])

    def test_status_field_unstated_or_non_archived_still_shows(self) -> None:
        unstated = make_project("PP-01", [])
        active = make_project("PP-02", [], status=stated("Active"))
        board = model.build_board([unstated, active], today=TODAY)
        self.assertEqual({p.id for p in board.projects}, {"PP-01", "PP-02"})


class TestNoFilesystemNoClock(unittest.TestCase):
    """FR-14, AC-4: this whole suite already never touches a disk or the
    clock — `today` is always a literal passed by the test. This test just
    asserts the one guard path TEST-7 asks for: no import of the modules
    FR-15 forbids."""

    def test_never_imports_stores_or_writes(self) -> None:
        source = Path(__file__).resolve().parents[1] / "model.py"
        text = source.read_text(encoding="utf-8")
        for forbidden in ("import stores", "import writes", "from stores", "from writes"):
            self.assertNotIn(forbidden, text)


if __name__ == "__main__":
    unittest.main()
