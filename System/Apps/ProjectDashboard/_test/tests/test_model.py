"""Smoke tests for model.py, entirely in-memory (AC-7, TEST-4) — no fixture
files, no filesystem, mirroring stores' own convention of building fixtures
in code where a bare record is easier to see than a file on disk.

One test per acceptance criterion in the model spec that a hand-built
record set can exercise. Real-store verification against Memory/Medium-Term/
is a separate, one-off check (never a unit test here — AC-7 forbids a
filesystem in this module's tests), reported alongside this file.
"""

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import model  # noqa: E402
import stores  # noqa: E402

TODAY = date(2026, 9, 6)  # a Sunday; arbitrary, injected (AD-1) — never read from a clock


def f(value, stated=True):
    return stores.Field(value, stated)


def na(action="Do it", owner="Luke", kind="mine", effort=None, tokens=None,
        status="☐ Open", due=None, index="1"):
    return stores.NextActionRow(
        index=f(index), action=f(action), owner=f(owner) if owner is not None else f(None, False),
        kind=f(kind) if kind is not None else f(None, False),
        effort=f(effort) if effort is not None else f(None, False),
        tokens=f(tokens) if tokens is not None else f(None, False),
        status=f(status), state=f(None, False),
        due=f(due) if due is not None else f(None, False), link=f(None, False),
    )


def tracking_row(id="ZZ-01", context="Personal Research", wake=None, updated=None, effort=None):
    return stores.TrackingRow(
        id=f(id), project=f("sample"), title=f("Sample " + id), context=f(context),
        status=f("Active"), state=f("🟢 on track"), waiting_on=f(None, False),
        wake=f(wake) if wake is not None else f(None, False),
        created=f("2026-01-01"), updated=f(updated) if updated is not None else f(None, False),
        path=f("x"), effort=f(effort) if effort is not None else f(None, False),
    )


def registry_record(project_id="ZZ-01", next_actions=(), frontmatter=None):
    return stores.RegistryRecord(
        project_id=project_id, path=Path("x"), mtime=0.0, frontmatter=frontmatter or {},
        footings=f(None, False), next_actions=list(next_actions), malformed_rows=[],
    )


def make_project(rows, project_id="ZZ-01", context="Personal Research", wake=None,
                  updated=None, frontmatter=None):
    return stores.ProjectSource(
        tracking=tracking_row(id=project_id, context=context, wake=wake, updated=updated),
        registry=registry_record(project_id=project_id, next_actions=rows, frontmatter=frontmatter),
    )


def build(rows, **kwargs):
    return model.build_project(make_project(rows, **kwargs), today=TODAY)


class TestImport(unittest.TestCase):
    def test_imports_cleanly(self) -> None:
        self.assertTrue(hasattr(model, "build_board"))


class TestDemandRuleFR2(unittest.TestCase):
    def test_kinds_3_and_4_demand_kinds_1_2_5_do_not(self) -> None:
        self.assertEqual(model.DEMANDS_LUKE, frozenset({3, 4}))
        for kind in ("waiting", "unshaped", "incoming"):
            p = build([na(kind=kind)])
            self.assertFalse(p.has_demand, kind)
        for kind in ("mine", "hand-over"):
            p = build([na(kind=kind)])
            self.assertTrue(p.has_demand, kind)


class TestCrownFR16(unittest.TestCase):
    """FR-16 / AC-1, AC-1a, AC-1b — the crown gets its own tests."""

    def test_ac1_sole_blocker_shared_and_mind_project(self) -> None:
        sole = build([na(kind="mine"), na(kind="unshaped")])
        self.assertEqual(sole.crown, "sole-blocker")

        shared = build([na(kind="mine"), na(kind="waiting")])
        self.assertEqual(shared.crown, "shared")  # even holding a kind 3 too

        mind = build([na(kind="unshaped"), na(kind="incoming", due="2026-10-01")])
        self.assertEqual(mind.crown, "none")
        self.assertTrue(mind.is_mind_project)

    def test_ac1a_handing_over_the_only_kind_3_flips_to_shared(self) -> None:
        before = build([na(kind="mine")])
        self.assertEqual(before.crown, "sole-blocker")
        after = build([na(kind="waiting")])  # handed over: 3 -> 1
        self.assertEqual(after.crown, "shared")

    def test_ac1b_adding_one_open_kind_1_flips_sole_blocker_to_shared(self) -> None:
        before = build([na(kind="mine")])
        self.assertEqual(before.crown, "sole-blocker")
        after = build([na(kind="mine"), na(kind="waiting")])
        self.assertEqual(after.crown, "shared")


class TestMindProjectFR6(unittest.TestCase):
    def test_ac2_mind_project_excluded_from_this_week_no_crown_no_outline(self) -> None:
        rows = [na(kind="unshaped"), na(kind="incoming", due="2026-10-01")]
        p = build(rows)
        self.assertTrue(p.is_mind_project)
        self.assertEqual(p.crown, "none")
        self.assertEqual(p.outline, "none")
        self.assertFalse(p.has_demand)
        board = model.build_board(
            stores.BoardSources(projects=[make_project(rows)], skipped=[], queue=[], links=[], calendar=[], completions=[]),
            today=TODAY,
        )
        self.assertNotIn(p.id, board.this_week.selected)
        self.assertIn(p.id, board.this_week.not_this_week)
        self.assertIn(p.id, board.horizon)

    def test_ac2_unflagged_after_six_months(self) -> None:
        far_future_today = TODAY + timedelta(days=183)
        p = model.build_project(
            make_project([na(kind="unshaped")], updated="2026-01-01"), today=far_future_today
        )
        self.assertFalse(p.stale_handover)  # no open kind 4 at all — FR-6's "never flagged"

    def test_ac3_adding_a_kind_3_gives_a_crown_and_a_stack(self) -> None:
        mind = build([na(kind="unshaped")])
        self.assertEqual(mind.crown, "none")
        with_mine = build([na(kind="unshaped"), na(kind="mine")])
        self.assertEqual(with_mine.crown, "sole-blocker")
        self.assertEqual(len(with_mine.tasks), 2)

    def test_ch04_pp14_pp15_shaped_fixture_is_a_mind_project(self) -> None:
        """The real cases named in the build brief: open tasks only kinds 2
        and 5. This exercises the case that could never fire before the
        Type -> Kind migration."""
        rows = [
            na(kind="unshaped", action="Once scoped, decide build approach"),
            na(kind="incoming", action="Kicks off when the portal opens", due="2026-11-01"),
        ]
        p = build(rows, project_id="CH-04")
        self.assertTrue(p.is_mind_project)
        self.assertEqual(p.crown, "none")
        self.assertEqual(p.outline, "none")


class TestOutlineFR17(unittest.TestCase):
    def test_ac8_this_week_overdue_and_none(self) -> None:
        soon = build([na(kind="mine", due=(TODAY + timedelta(days=3)).isoformat())])
        self.assertEqual(soon.outline, "this-week")

        late = build([na(kind="mine", due=(TODAY - timedelta(days=1)).isoformat())])
        self.assertEqual(late.outline, "overdue")

        far = build([na(kind="mine", due=(TODAY + timedelta(days=30)).isoformat())])
        self.assertEqual(far.outline, "none")

    def test_ac8a_overdue_kind_1_does_not_light_the_outline(self) -> None:
        p = build([na(kind="waiting", due=(TODAY - timedelta(days=10)).isoformat())])
        self.assertEqual(p.outline, "none")


class TestKindResolutionFR1(unittest.TestCase):
    def test_stated_kind_wins_over_any_derivation(self) -> None:
        row = na(kind="waiting", owner="Luke")  # owner would derive "mine" — stated wins
        resolved = model.resolve_kind(row.kind, row.owner)
        self.assertEqual(resolved, model.Guessable(model.KIND_WAITING, False))

    def test_legacy_human_agent_values_are_derived_not_taken_literally(self) -> None:
        human = model.resolve_kind(f("Human"), f("Luke"))
        self.assertEqual(human, model.Guessable(model.KIND_MINE, True))
        agent = model.resolve_kind(f("Agent"), f("Some Agent"))
        self.assertEqual(agent, model.Guessable(model.KIND_HANDOVER, True))

    def test_no_owner_at_all_derives_unshaped(self) -> None:
        resolved = model.resolve_kind(f(None, False), f(None, False))
        self.assertEqual(resolved, model.Guessable(model.KIND_UNSHAPED, True))


class TestKind5ArrivalFR12AC9(unittest.TestCase):
    def test_lukes_incoming_becomes_mine_someone_elses_becomes_waiting(self) -> None:
        mine_soon = model.resolve_arrival_kind(f("Luke"))
        self.assertEqual(mine_soon, model.Guessable(model.KIND_MINE, True))
        theirs_soon = model.resolve_arrival_kind(f("James Cox"))
        self.assertEqual(theirs_soon, model.Guessable(model.KIND_WAITING, True))

    def test_incoming_never_counts_toward_demand_or_this_week(self) -> None:
        p = build([na(kind="incoming", owner="Luke", due=(TODAY + timedelta(days=1)).isoformat())])
        self.assertFalse(p.has_demand)


class TestTaskListFR15AC13(unittest.TestCase):
    def test_uncapped_kind_ascending_with_per_kind_counts(self) -> None:
        rows = [na(kind="mine", index=str(i)) for i in range(4)] + [
            na(kind="waiting", index=str(i)) for i in range(4, 15)
        ]
        p = build(rows)
        self.assertEqual(len(p.tasks), 15)  # uncapped
        self.assertEqual([t.kind.value for t in p.tasks], sorted(t.kind.value for t in p.tasks))
        self.assertEqual(p.kind_counts, {3: 4, 1: 11})


class TestDepotFR7AC5(unittest.TestCase):
    def test_depot_maps_impact_to_kind_and_never_touches_a_project(self) -> None:
        queue = [
            stores.QueueRow(index=f(str(i)), task=f("job"), source=f("Luke"), impact=f("Low" if i % 2 else "High"),
                             status=f("☐ Open"), state=f(None, False), wake_due=f(None, False), notes=f(None, False))
            for i in range(40)
        ]
        jobs = model.build_depot(queue)
        self.assertEqual(len(jobs), 40)
        self.assertEqual({j.kind for j in jobs}, {model.KIND_MINE, model.KIND_HANDOVER})

        p_before = build([na(kind="mine")])
        board = model.build_board(
            stores.BoardSources(projects=[make_project([na(kind="mine")])], skipped=[], queue=queue, links=[], calendar=[], completions=[]),
            today=TODAY,
        )
        p_after = board.projects[0]
        self.assertEqual(p_before.crown, p_after.crown)
        self.assertEqual(p_before.outline, p_after.outline)


class TestGuessedFR20AC6(unittest.TestCase):
    def test_every_derived_value_is_marked_guessed(self) -> None:
        p = build([na(kind=None, effort=None, tokens=None, owner="Luke")])
        task = p.tasks[0]
        self.assertTrue(task.kind.guessed)
        self.assertTrue(task.effort.guessed)
        self.assertTrue(task.tokens.guessed)

    def test_stated_values_are_not_guessed(self) -> None:
        p = build([na(kind="mine", effort="⚡ minutes", tokens="little")])
        task = p.tasks[0]
        self.assertFalse(task.kind.guessed)
        self.assertFalse(task.effort.guessed)
        self.assertFalse(task.tokens.guessed)


class TestNoImportanceAC6a(unittest.TestCase):
    def test_grep_finds_no_importance_or_leverage_numerator(self) -> None:
        source = Path(model.__file__).read_text()
        self.assertNotIn("importance", source)
        self.assertNotIn("leverage_numerator", source)

    def test_unblock_ordering_is_effort_ascending_overdue_does_not_jump_the_queue(self) -> None:
        cheap_but_overdue = make_project(
            [na(kind="mine", effort="⚡ minutes", due=(TODAY - timedelta(days=5)).isoformat())],
            project_id="ZZ-CHEAP-OVERDUE",
        )
        heavy_due_soon = make_project(
            [na(kind="mine", effort="🏔️ a session", due=(TODAY + timedelta(days=1)).isoformat())],
            project_id="ZZ-HEAVY-SOON",
        )
        board = model.build_board(
            stores.BoardSources(projects=[heavy_due_soon, cheap_but_overdue], skipped=[], queue=[], links=[], calendar=[], completions=[]),
            today=TODAY,
        )
        cheap = next(p for p in board.projects if p.id == "ZZ-CHEAP-OVERDUE")
        heavy = next(p for p in board.projects if p.id == "ZZ-HEAVY-SOON")
        ranked = sorted(board.projects, key=model._leverage_sort_key)
        self.assertEqual(ranked[0].id, cheap.id)  # cheapest first, despite being overdue vs. merely due soon
        self.assertLess(model._effort_weight(cheap), model._effort_weight(heavy))


class TestOrderingsFR14AC11(unittest.TestCase):
    def test_ac11a_due_and_short_orderings(self) -> None:
        overdue = make_project([na(kind="mine", due=(TODAY - timedelta(days=1)).isoformat())], project_id="A")
        fortnight = make_project([na(kind="mine", due=(TODAY + timedelta(days=14)).isoformat())], project_id="B")
        nothing_due = make_project([na(kind="waiting")], project_id="C")
        one_task = make_project([na(kind="mine")] , project_id="D")
        twelve_tasks = make_project([na(kind="mine", index=str(i)) for i in range(12)], project_id="E")

        sources = stores.BoardSources(
            projects=[overdue, fortnight, nothing_due, one_task, twelve_tasks],
            skipped=[], queue=[], links=[], calendar=[], completions=[],
        )
        board = model.build_board(sources, today=TODAY)
        due_order = board.orderings["Personal Research"].due
        self.assertLess(due_order.index("A"), due_order.index("B"))
        self.assertLess(due_order.index("B"), due_order.index("C"))

        short_order = board.orderings["Personal Research"].short
        self.assertLess(short_order.index("D"), short_order.index("E"))

    def test_ac11b_effort_ordering_ignores_the_front_toggle(self) -> None:
        heavy = make_project([na(kind="mine", effort="🏔️ a session")], project_id="HEAVY")
        light = make_project([na(kind="mine", effort="⚡ minutes")], project_id="LIGHT")
        board = model.build_board(
            stores.BoardSources(projects=[heavy, light], skipped=[], queue=[], links=[], calendar=[], completions=[]),
            today=TODAY,
        )
        effort_order = board.orderings["Personal Research"].effort
        self.assertEqual(effort_order.index("HEAVY"), 0)
        self.assertEqual(effort_order.index("LIGHT"), 1)
        # unaffected by which front toggle (due/short) is in play — independent axis
        self.assertIn("HEAVY", board.orderings["Personal Research"].due)

    def test_ac11c_next_action_not_the_sum(self) -> None:
        rows = [na(index="1", kind="mine", effort="⚡ minutes"),
                na(index="2", kind="mine", effort="🏔️ a session"),
                na(index="3", kind="mine", effort="🏔️ a session")]
        p = build(rows)
        self.assertEqual(p.next_action.effort.value, "⚡ minutes")


class TestThisWeekFR8AC4(unittest.TestCase):
    def test_exactly_three_selected_the_rest_labelled(self) -> None:
        projects = [
            make_project([na(kind="mine", due=(TODAY + timedelta(days=i)).isoformat())], project_id=f"P{i}",
                         context=["Personal Productivity", "Church", "Teaching", "Personal Research"][i % 4])
            for i in range(6)
        ]
        board = model.build_board(
            stores.BoardSources(projects=projects, skipped=[], queue=[], links=[], calendar=[], completions=[]),
            today=TODAY,
        )
        self.assertEqual(len(board.this_week.selected), 3)
        self.assertEqual(len(board.this_week.selected) + len(board.this_week.not_this_week), 6)
        for pid in board.this_week.selected:
            self.assertTrue(any(p.id == pid and p.has_demand for p in board.projects))


class TestDeterminismAC14(unittest.TestCase):
    def test_two_runs_over_identical_records_agree(self) -> None:
        rows = [na(kind="mine"), na(kind="waiting"), na(kind="hand-over")]
        src = make_project(rows)
        first = model.build_project(src, today=TODAY)
        second = model.build_project(src, today=TODAY)
        self.assertEqual(first, second)


class TestWeekSetFR13(unittest.TestCase):
    def test_ac10_seven_days_including_empty_ones(self) -> None:
        p = build([na(kind="mine", due=(TODAY + timedelta(days=2)).isoformat())])
        ws = model.week_set(TODAY, 7, [p], {p.id: None}, [], today=TODAY)
        self.assertEqual(len(ws.days), 7)
        non_empty = [d for d in ws.days if d.items]
        self.assertEqual(len(non_empty), 1)

    def test_ac10a_kind_ascending_within_a_day(self) -> None:
        due_day = TODAY + timedelta(days=3)
        p = make_project([
            na(index="1", kind="incoming", due=due_day.isoformat(), owner="Luke"),
            na(index="2", kind="mine", due=due_day.isoformat()),
        ], project_id="ZZ-DAY")
        pv = model.build_project(p, today=TODAY)
        ws = model.week_set(TODAY, 7, [pv], {"ZZ-DAY": due_day}, [], today=TODAY)
        day = next(d for d in ws.days if d.date == due_day)
        kinds = [model._item_sort_key(it) for it in day.items]
        self.assertEqual(kinds, sorted(kinds))

    def test_overdue_lands_in_the_cap_not_a_day(self) -> None:
        p = build([na(kind="mine", due=(TODAY - timedelta(days=2)).isoformat())])
        ws = model.week_set(TODAY, 7, [p], {p.id: None}, [], today=TODAY)
        self.assertEqual(len(ws.overdue), 1)
        self.assertTrue(all(not d.items for d in ws.days))


class TestEffortResolutionFR3AC15(unittest.TestCase):
    def test_action_column_then_project_key_then_derived(self) -> None:
        stated = model.resolve_effort(f("⚡ minutes"), [f(None, False)], model.KIND_MINE, "whatever")
        self.assertEqual(stated, model.Guessable("⚡ minutes", False))

        project_fallback = model.resolve_effort(f(None, False), [f("🔨 an hour")], model.KIND_MINE, "whatever")
        self.assertEqual(project_fallback, model.Guessable("🔨 an hour", True))

        derived = model.resolve_effort(f(None, False), [f(None, False)], model.KIND_HANDOVER, "send an email")
        self.assertEqual(derived, model.Guessable(model.EFFORT_MINUTES, True))


class TestCapacityFR19AC16AC17(unittest.TestCase):
    def test_ac16_all_four_inputs_present_and_fitted_false(self) -> None:
        result = model.lukes_capacity(next_action_effort_weight=2, open_count=5, today=TODAY, completions=[])
        self.assertEqual(result.inputs.complexity, 2)
        self.assertEqual(result.inputs.open_count, 5)
        self.assertIsInstance(result.inputs.days_to_sunday, int)
        self.assertIsNone(result.inputs.recent_completions)
        self.assertFalse(result.fitted)
        self.assertIn("complexity", model._CAPACITY_COEFFICIENTS)

    def test_ac17_no_completion_log_still_returns(self) -> None:
        result = model.lukes_capacity(next_action_effort_weight=1, open_count=0, today=TODAY, completions=[])
        self.assertIsNone(result.inputs.recent_completions)
        self.assertIsInstance(result.capacity, float)


class TestAgentFitFR18AC18(unittest.TestCase):
    def test_ac18_little_budget_keeps_small_jobs_drops_large_ones(self) -> None:
        jobs = [
            ("small", model.Guessable("little", False)),
            ("medium", model.Guessable("some", False)),
            ("large", model.Guessable("plenty", False)),
        ]
        result = model.agent_fit(jobs, model.TokenBudget("little", "luke"))
        self.assertIn("small", result.fitting)
        self.assertNotIn("large", result.fitting)
        self.assertNotEqual(result.fitting, [])

    def test_runtime_provider_reads_the_same_field(self) -> None:
        jobs = [("small", model.Guessable("little", False)), ("large", model.Guessable("plenty", False))]
        result = model.agent_fit(jobs, model.TokenBudget(3_000, "runtime"))
        self.assertIn("small", result.fitting)
        self.assertNotIn("large", result.fitting)


if __name__ == "__main__":
    unittest.main()
