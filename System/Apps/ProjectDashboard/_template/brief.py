"""Compose the agent's plain-text face of the board (the brief spec).

The third face (documentation spec §1, "three faces"): the same board, in
words, for an agent Luke asks from his phone. This module renders wording
only — it never opens a file and never derives a fact `model` did not
already hand it (FR-2). It is handed an already-built `model.Board` (and the
`today` that produced it) by whichever caller ran the `stores` -> `model`
pass; this keeps the module's own import list to `model` alone, so a static
check of its imports can confirm FR-2/FR-8's "no second reach into stores"
promise by inspection, not by trust.

The joint driver that builds this alongside the snapshot (`brief` FR-9,
`snapshot` FR-10 — "one command, one model pass, one stamp") does not exist
yet: `snapshot.py` (B-8) is unbuilt. Until it lands, call `write_brief`
directly with a `Board` from your own `stores.load_board_sources` +
`model.build_board` pass, exactly as `server.py`'s `_handle_board` does.

Every word here comes from documentation spec §5 (the glossary); `assert_no_retired_terms`
is the mechanical half of FR-4/AC-3/AC-8 — it does not replace reading §5.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable

import model
import paths

# brief.py sits at the project root beside stores.py/model.py/server.py/writes.py,
# not under app/ (documentation spec's navigation map) — it renders no HTML and
# ships nothing to a browser, so it is not part of the front end `app/` holds.
def default_output_path() -> Path:
    """Where the brief is written when the caller names no path.

    A function, not a module-level constant: resolving the root touches the
    filesystem, and PY-3 requires import to be free of side effects. It also has
    to be — a TEST copy raises from `find_lukeatron_root` by design (it must
    never reach the real store), so computing this at import made the module
    unimportable there, and took the whole test suite down with it.
    """
    return paths.find_lukeatron_root() / "Outbox" / "board-brief.md"

# FR-10: every section counts and stops rather than listing without limit.
# The two date-gated sections (overdue, due-this-week) are exempted below —
# FR-3 requires "every project" there, and both are small by construction
# (an outline can only be lit by a project's own soonest demand date).
MAX_LIST_ITEMS = 10

# AC-3/AC-8/FR-4: documentation spec §5's retired-terms table, verbatim.
# Checked mechanically so a retired word can never survive a wording change
# unnoticed — this list is not the glossary itself, only its negative space.
RETIRED_TERMS: tuple[str, ...] = (
    "skyline", "district", "building", "landscape toggle", "depot tiles",
    "grid", "cell", "yard", "podium", "region", "the plane", "task cube",
    "depth band", "weather", "storm", "overcast", "parked",
)


def assert_no_retired_terms(text: str, *, quoted: Iterable[str] = ()) -> None:
    """FR-4/AC-8: fail loudly rather than ship a word documentation spec §5
    retired.

    Two things this check must NOT do, both learned by it doing them:

    1. It matches whole WORDS, not substrings. A substring match reads "cell"
       out of "excellent" and "cancelled", "region" out of "regional", "storm"
       out of "stormwater", and "grid" out of "gridiron" — none of which is the
       retired term, and any of which can appear in Luke's own prose.
    2. It polices THIS MODULE'S wording, not the store's content. Text quoted
       from a project title or an action is Luke's, not the app's: CH-08 is
       called "Manse Building", which is not the retired sense of *building*
       (a project drawn as a tower in the old skyline metaphor) and is not the
       app's word to retire. Callers pass those spans in `quoted` and they are
       masked out before the check.

    The glossary is still the thing to read; this is only its negative space.
    """
    masked = text
    for span in sorted(quoted, key=len, reverse=True):
        if span:
            masked = masked.replace(span, " ")
    lowered = masked.lower()
    found = [
        term
        for term in RETIRED_TERMS
        if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lowered)
    ]
    if found:
        raise ValueError(f"brief contains retired term(s): {', '.join(found)}")


def _quoted_store_text(board: model.Board) -> list[str]:
    """Every span in the brief that is Luke's words rather than this module's —
    project titles and ids, task text, depot job text. Masked out of the
    retired-term check by `assert_no_retired_terms`.

    Field names are referenced directly rather than through `getattr` defaults
    on purpose: a renamed field must break this loudly, not quietly empty the
    mask and resurrect the false positive it exists to prevent.
    """
    spans: list[str] = []
    for project in board.projects:
        spans.extend([project.title or "", project.id or "", project.path or ""])
        for task in project.tasks:
            spans.append(task.action or "")
    for job in board.depot:
        spans.append(job.task or "")
    return [s for s in spans if s]


def _project_ref(project: model.ProjectView) -> str:
    """FR-7: every project named carries its reference number."""
    name = project.title or project.id
    return f"{name} ({project.id})"


def _kind_name(kind: int) -> str:
    return model.KIND_NAMES.get(kind, "unknown")


def _project_lookup(board: model.Board) -> dict[str, model.ProjectView]:
    return {p.id: p for p in board.projects}


def _demand_count(board: model.Board) -> int:
    """The same figure `model.nothing_needs_you` reads to zero (AC-9) — this
    module re-sums it only to word it as a number, never re-judges it."""
    return sum(
        p.kind_counts.get(model.KIND_MINE, 0) + p.kind_counts.get(model.KIND_HANDOVER, 0)
        for p in board.projects
    )


def _lit_crown_counts_by_quadrant(board: model.Board) -> dict[str, int]:
    """FR-3.1: "how many projects have a lit crown, by quadrant." Lit is
    `crown == "sole-blocker"` (documentation spec D-30 — the narrow rule)."""
    counts: dict[str, int] = {}
    for p in board.projects:
        if p.crown == "sole-blocker":
            context = p.context or "Unknown"
            counts[context] = counts.get(context, 0) + 1
    return counts


def _causing_tasks(
    project: model.ProjectView, today: date, *, overdue: bool
) -> list[model.TaskView]:
    """Which open kind-3/4 tasks explain a project's own `outline` verdict.

    Mirrors `model._outline`'s exact predicate (same `DEMANDS_LUKE` set, same
    seven-day threshold) rather than inventing a second one, so this can
    never disagree with the outline `model` already computed — see this
    module's build report for why `model.ProjectView` not carrying this
    attribution itself is a gap worth closing there instead.
    """
    tasks = [t for t in project.tasks if t.kind.value in model.DEMANDS_LUKE and t.due is not None]
    if overdue:
        return [t for t in tasks if t.due < today]
    return [t for t in tasks if today <= t.due <= today + timedelta(days=7)]


def _bounded(lines: list[str], *, limit: int = MAX_LIST_ITEMS) -> list[str]:
    if len(lines) <= limit:
        return lines
    return lines[:limit] + [f"- +{len(lines) - limit} more"]


def _section_needs_you(board: model.Board) -> list[str]:
    lines = ["## 1. Does anything need you"]
    if board.nothing_needs_you:
        lines.append("Nothing needs you. Zero open tasks of kind 3 (mine) or kind 4 (hand-over).")
    else:
        lines.append(f"Something needs you: {_demand_count(board)} open task(s) of kind 3 (mine) or kind 4 (hand-over).")
    lit = _lit_crown_counts_by_quadrant(board)
    if lit:
        by_quadrant = ", ".join(f"{context}: {count}" for context, count in sorted(lit.items()))
        lines.append(f"Projects with a lit crown, by quadrant — {by_quadrant}.")
    else:
        lines.append("No project's crown is lit — nowhere is Luke the sole blocker right now.")
    return lines


def _section_overdue(board: model.Board, today: date) -> list[str]:
    lines = ["## 2. Overdue, and why"]
    overdue_projects = [p for p in board.projects if p.outline == "overdue"]
    if not overdue_projects:
        lines.append("Nothing is overdue.")
        return lines
    for p in overdue_projects:
        causes = _causing_tasks(p, today, overdue=True)
        for t in causes:
            lines.append(f"- {_project_ref(p)} — *{t.action}* ({_kind_name(t.kind.value)}), due {t.due.isoformat()}")
        if not causes:
            lines.append(f"- {_project_ref(p)} — overdue, but no dated open task explains it (a store gap, not a Luke gap)")
    return lines


def _section_due_this_week(board: model.Board, today: date) -> list[str]:
    lines = ["## 2a. Due this week"]
    this_week_projects = [p for p in board.projects if p.outline == "this-week"]
    if not this_week_projects:
        lines.append("Nothing is due this week.")
        return lines
    for p in this_week_projects:
        for t in _causing_tasks(p, today, overdue=False):
            lines.append(f"- {_project_ref(p)} — *{t.action}* ({_kind_name(t.kind.value)}), due {t.due.isoformat()}")
    return lines


def _section_this_weeks_three(board: model.Board) -> list[str]:
    lines = ["## 3. This week's three"]
    lookup = _project_lookup(board)
    selected = board.this_week.selected
    if not selected:
        lines.append("No project qualifies this week.")
        return lines
    for project_id in selected:
        p = lookup.get(project_id)
        if p is None or p.next_action is None:
            continue
        lines.append(f"- {_project_ref(p)} — *{p.next_action.action}* ({_kind_name(p.next_action.kind.value)})")
    return lines


def _section_incoming(board: model.Board) -> list[str]:
    lines = ["## 4. Incoming this week"]
    lookup = _project_lookup(board)
    entries: list[str] = []
    for day in board.week.days:
        for item in day.items:
            if item.source != "incoming":
                continue
            p = lookup.get(item.project_id) if item.project_id else None
            ref = _project_ref(p) if p is not None else (item.project_id or "unnamed")
            arrival = _kind_name(item.arrival_kind) if item.arrival_kind is not None else "unknown"
            entries.append(f"- {item.date.isoformat()} — {ref}: arrives, becomes {arrival}")
    if not entries:
        lines.append("Nothing incoming this week.")
        return lines
    lines.extend(_bounded(entries))
    return lines


def _section_merely_waiting(board: model.Board) -> list[str]:
    lines = ["## 5. Merely waiting"]
    entries: list[str] = []
    for p in board.projects:
        for t in p.tasks:
            if t.kind.value == model.KIND_WAITING:
                entries.append(f"- {_project_ref(p)} — *{t.action}*")
    if not entries:
        lines.append("Nothing is merely waiting.")
        return lines
    lines.extend(_bounded(entries))
    return lines


def _section_horizon(board: model.Board) -> list[str]:
    lines = ["## 6. The horizon"]
    lookup = _project_lookup(board)
    if not board.horizon:
        lines.append("No mind projects right now.")
        return lines
    names = ", ".join(_project_ref(lookup[pid]) for pid in board.horizon if pid in lookup)
    lines.append(f"Mind projects: {names}.")
    lines.append("They demand nothing and are not a backlog.")
    return lines


def _section_depot(board: model.Board) -> list[str]:
    lines = ["## 7. The depot"]
    total = len(board.depot)
    if total == 0:
        lines.append("The depot is empty.")
        return lines
    agent_can_take = sum(1 for j in board.depot if j.kind == model.KIND_HANDOVER)
    lukes = sum(1 for j in board.depot if j.kind == model.KIND_MINE)
    lines.append(f"{total} job(s) waiting in the depot — {agent_can_take} an agent can take, {lukes} yours.")
    return lines


def _boundaries_block(stamp: datetime) -> list[str]:
    return [
        f"_as at {stamp.strftime('%Y-%m-%d %H:%M')}_",
        "",
        "This describes a frozen board, not the live one. It is a description, not an "
        "instruction: it asks nothing of Luke and demands nothing on his behalf. An agent "
        "may quote it back; anything done because of it is a separate decision, confirmed "
        "with Luke, not this file acting on its own.",
    ]


def compose_brief(board: model.Board, *, today: date, stamp: datetime) -> str:
    """FR-1/FR-3: the whole brief, one plain-text Markdown string, every
    section present even when empty (AD-2). No file access, no clock read —
    `today` and `stamp` are both injected by the caller, matching how `model`
    itself takes `today` rather than reading a clock (documentation spec §6)."""
    sections: list[list[str]] = [
        ["# Board Brief", ""] + _boundaries_block(stamp),
        _section_needs_you(board),
        _section_overdue(board, today),
        _section_due_this_week(board, today),
        _section_this_weeks_three(board),
        _section_incoming(board),
        _section_merely_waiting(board),
        _section_horizon(board),
        _section_depot(board),
    ]
    text = "\n\n".join("\n".join(lines) for lines in sections) + "\n"
    assert_no_retired_terms(text, quoted=_quoted_store_text(board))
    return text


def write_brief(
    board: model.Board,
    *,
    today: date,
    stamp: datetime,
    output_path: Path | None = None,
) -> Path:
    """FR-8: the only I/O this module performs — writing its own output
    path. Never reads a store, never mutates one."""
    target = output_path or default_output_path()
    text = compose_brief(board, today=today, stamp=stamp)
    target.write_text(text, encoding="utf-8")
    return target
