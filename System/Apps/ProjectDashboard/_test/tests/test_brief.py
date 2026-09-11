"""Smoke tests for brief.py, entirely in-memory (TEST-4) — a hand-built
`model.Board` via the real `stores` -> `model` pipeline (TEST-9: the real
pipeline, not a duplicate of its logic), no fixture files, no filesystem.

One test per section of the brief spec's FR-3 that a small board can
exercise, plus the glossary/retired-term guard (FR-4, AC-3, AC-8).
"""

import sys
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import brief  # noqa: E402
import model  # noqa: E402
import stores  # noqa: E402

TODAY = date(2026, 9, 7)  # arbitrary, injected — never read from a clock


def f(value, stated=True):
    return stores.Field(value, stated)


def na(action="Do it", owner="Luke", kind="mine", due=None, index="1", status="☐ Open"):
    return stores.NextActionRow(
        index=f(index), action=f(action), owner=f(owner) if owner is not None else f(None, False),
        kind=f(kind) if kind is not None else f(None, False),
        effort=f(None, False), tokens=f(None, False),
        status=f(status), state=f(None, False),
        due=f(due) if due is not None else f(None, False), link=f(None, False),
    )


def tracking_row(id, context, title=None):
    return stores.TrackingRow(
        id=f(id), project=f(id), title=f(title or f"Project {id}"), context=f(context),
        status=f("Active"), state=f("🟢 on track"), waiting_on=f(None, False),
        wake=f(None, False), created=f("2026-01-01"), updated=f(None, False),
        path=f("x"), effort=f(None, False),
    )


def registry_record(project_id, next_actions):
    return stores.RegistryRecord(
        project_id=project_id, path=Path("x"), mtime=0.0, frontmatter={},
        footings=f(None, False), next_actions=list(next_actions), malformed_rows=[],
    )


def project_source(project_id, context, rows, title=None):
    return stores.ProjectSource(
        tracking=tracking_row(project_id, context, title=title),
        registry=registry_record(project_id, rows),
    )


def build_board(projects, queue=(), calendar=()):
    sources = stores.BoardSources(
        projects=list(projects), skipped=[], queue=list(queue), links=[],
        calendar=list(calendar), completions=[],
    )
    return model.build_board(sources, today=TODAY)


class TestImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        self.assertTrue(hasattr(brief, "compose_brief"))


class TestSectionsAllPresentOnAnEmptyBoard(unittest.TestCase):
    """AC-2: every one of FR-3's sections present, plainly empty."""

    def test_empty_board_states_every_section_as_empty(self) -> None:
        board = build_board([])
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        for header in (
            "## 1. Does anything need you", "## 2. Overdue, and why",
            "## 2a. Due this week", "## 3. This week's three",
            "## 4. Incoming this week", "## 5. Merely waiting",
            "## 6. The horizon", "## 7. The depot",
        ):
            self.assertIn(header, text)
        self.assertIn("Nothing needs you", text)
        self.assertIn("Nothing is overdue", text)
        self.assertIn("Nothing is due this week", text)
        self.assertIn("No project qualifies this week", text)
        self.assertIn("Nothing incoming this week", text)
        self.assertIn("Nothing is merely waiting", text)
        self.assertIn("No mind projects", text)
        self.assertIn("The depot is empty", text)


class TestOverdueNamesProjectAndTask(unittest.TestCase):
    """AC-7: an overdue project is named with the task causing it, never
    merely a state."""

    def test_overdue_project_names_task_and_due_date(self) -> None:
        overdue_due = (TODAY - timedelta(days=3)).isoformat()
        rows = [na(action="File the return", kind="mine", due=overdue_due)]
        board = build_board([project_source("PP-01", "Personal Productivity", rows)])
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        self.assertIn("PP-01", text)
        self.assertIn("File the return", text)
        self.assertIn(overdue_due, text)
        self.assertNotIn("Nothing is overdue", text)


class TestIncomingNamesArrivalKind(unittest.TestCase):
    """AC-4: a kind 5 in the incoming section says whether it becomes a
    kind 3 or a kind 1."""

    def test_incoming_owned_by_luke_arrives_as_mine(self) -> None:
        soon = (TODAY + timedelta(days=2)).isoformat()
        rows = [na(action="Conference opens", owner="Luke", kind="incoming", due=soon)]
        board = build_board([project_source("CH-01", "Church", rows)])
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        self.assertIn("becomes mine", text)

    def test_incoming_owned_by_someone_else_arrives_as_waiting(self) -> None:
        soon = (TODAY + timedelta(days=2)).isoformat()
        rows = [na(action="Reply is due back", owner="James Cox", kind="incoming", due=soon)]
        board = build_board([project_source("CH-02", "Church", rows)])
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        self.assertIn("becomes waiting", text)


class TestMindProjectOnTheHorizon(unittest.TestCase):
    """The registry note: a mind project (only kinds 2/5 open) never fired
    before the Kind migration and needs its own test. Confirms brief never
    puts it in the overdue/this-week/this-week's-three sections, and states
    plainly that it demands nothing."""

    def test_mind_project_lands_only_on_the_horizon(self) -> None:
        rows = [na(action="Someday idea", owner=None, kind="unshaped")]
        board = build_board([project_source("CH-04", "Church", rows, title="Someday Project")])
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        self.assertIn("CH-04", text)
        self.assertIn("demand nothing", text)
        self.assertIn("Nothing is overdue", text)
        self.assertIn("No project qualifies this week", text)


class TestCrownCountsAgreeWithBoard(unittest.TestCase):
    """AC-9: the crown counts in section 1 agree exactly with the board
    object's crown states; the brief computes nothing of its own."""

    def test_lit_crown_counted_only_for_sole_blocker(self) -> None:
        sole_blocker = [na(action="Confirm the filing", kind="mine")]
        shared = [na(action="Confirm the filing", kind="mine"), na(action="Waiting on reply", owner="James Cox", kind="waiting")]
        board = build_board([
            project_source("PP-01", "Personal Productivity", sole_blocker),
            project_source("CH-01", "Church", shared),
        ])
        lit = brief._lit_crown_counts_by_quadrant(board)
        self.assertEqual(lit, {"Personal Productivity": 1})
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        self.assertIn("Personal Productivity: 1", text)


class TestDepotCounts(unittest.TestCase):
    def test_depot_splits_by_impact(self) -> None:
        queue = [
            stores.QueueRow(index=f("1"), task=f("Book the room"), source=f("Luke"), impact=f("High"),
                             status=f("☐ Open"), state=f(None, False), wake_due=f(None, False), notes=f(None, False)),
            stores.QueueRow(index=f("2"), task=f("Draft the reply"), source=f("Luke"), impact=f("Low"),
                             status=f("☐ Open"), state=f(None, False), wake_due=f(None, False), notes=f(None, False)),
        ]
        board = build_board([], queue=queue)
        text = brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))
        self.assertIn("2 job(s) waiting in the depot", text)
        self.assertIn("1 an agent can take", text)
        self.assertIn("1 yours", text)


class TestNoRetiredTerms(unittest.TestCase):
    """FR-4/AC-3/AC-8: no retired term in a produced brief; the checker
    itself is proven to fire before trusting it to guard real output."""

    def test_checker_fires_on_a_retired_term(self) -> None:
        with self.assertRaises(ValueError):
            brief.assert_no_retired_terms("the board shows today's weather as calm")

    def test_produced_brief_carries_no_retired_term(self) -> None:
        board = build_board([project_source("PP-01", "Personal Productivity", [na()])])
        brief.compose_brief(board, today=TODAY, stamp=datetime(2026, 9, 7, 9, 0))  # raises if one slipped in

    def test_matches_whole_words_not_substrings(self) -> None:
        """A substring match reads "cell" out of "excellent", "region" out of
        "regional" and "storm" out of "stormwater". None is the retired term,
        and all three can appear in Luke's own prose."""
        for innocent in (
            "an excellent result",
            "the meeting was cancelled",
            "a regional office",
            "stormwater drainage",
            "gridiron",
        ):
            with self.subTest(innocent):
                brief.assert_no_retired_terms(innocent)  # raises if it false-positives

    def test_quoted_store_text_is_not_policed(self) -> None:
        """The guard polices THIS module's wording, not the store's content.
        CH-08 is called "Manse Building" — Luke's words, and not the retired
        sense of *building* (a project drawn as a tower in the old skyline
        metaphor). Regression: the real store could not build a brief at all
        until this was separated."""
        line = "- Manse Building (CH-08) — needs you"
        with self.assertRaises(ValueError):
            brief.assert_no_retired_terms(line)  # unmasked, it must still fire
        brief.assert_no_retired_terms(line, quoted=["Manse Building"])  # masked, it must not

    def test_the_apps_own_wording_is_still_policed_around_quoted_text(self) -> None:
        """Masking a quoted title must not blind the checker to a retired term
        this module wrote in the same sentence."""
        with self.assertRaises(ValueError):
            brief.assert_no_retired_terms(
                "- Manse Building (CH-08) — this district is overcast",
                quoted=["Manse Building"],
            )


if __name__ == "__main__":
    unittest.main()
