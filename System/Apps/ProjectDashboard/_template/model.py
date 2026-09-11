"""Turn plain records into the board: whose move it is, how much, in what order, what fits.

The derivation layer (the model spec). Every rule that decides whether something
demands Luke lives here and nowhere else (FR-2, the demand rule). This module touches no
file, no clock and no network (FR-11, AD-1) — "today" and the completion log are always
passed in, never read, which is what keeps the burnout rules unit-testable.

Never imports `stores` (or `writes`, or anything else that touches a file) — the
verification checklist below is explicit about that, and it is what makes AC-7 possible.
What crosses the `stores` -> `model` seam (documentation spec D-1) is described here as
`Protocol`s: plain shape contracts an object satisfies by having the right attributes,
never by being a particular class. The objects `stores` actually builds happen to satisfy
these shapes; this module does not know or care that `stores` is where they came from.

Returns ORDERINGS, never coordinates (AD-7) — slot geometry belongs to `monitor`.

Every derived value is wrapped in `Guessable(value, guessed)` (FR-20): a consumer can
always tell a fact from a guess without re-deriving anything.
"""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Generic, Protocol, Sequence, TypeVar

T = TypeVar("T")


# ---------------------------------------------------------------------------
# The stores -> model seam, as shapes rather than an import (FR-11, AC-7)
# ---------------------------------------------------------------------------


class FieldLike(Protocol[T]):
    """Structurally identical to `stores.Field` — a value plus whether the
    source stated it. Declared locally so this module never imports `stores`;
    the real `Field` instances `stores` builds already have this shape."""

    value: T | None
    stated: bool


@dataclass(frozen=True)
class Field(Generic[T]):
    """A concrete `FieldLike`, for the rare case this module needs to hand
    one to itself — e.g. "no such column" when a lookup misses."""

    value: T | None
    stated: bool


_NOT_STATED: Field[Any] = Field(None, False)


class NextActionRowLike(Protocol):
    index: FieldLike[str]
    action: FieldLike[str]
    owner: FieldLike[str]
    kind: FieldLike[str]
    effort: FieldLike[str]
    tokens: FieldLike[str]
    status: FieldLike[str]
    due: FieldLike[str]


class TrackingRowLike(Protocol):
    id: FieldLike[str]
    title: FieldLike[str]
    context: FieldLike[str]
    wake: FieldLike[str]
    updated: FieldLike[str]
    effort: FieldLike[str]
    path: FieldLike[str]  # the registry's own path, relative to the Lukeatron root


class RegistryRecordLike(Protocol):
    project_id: str
    mtime: float  # unblock's write gate (AC-4/AC-5/AC-9) — a filesystem fact, never a Field
    frontmatter: dict[str, FieldLike[Any]]
    next_actions: Sequence[NextActionRowLike]


class ProjectSourceLike(Protocol):
    tracking: TrackingRowLike
    registry: RegistryRecordLike


class QueueRowLike(Protocol):
    index: FieldLike[str]
    task: FieldLike[str]
    source: FieldLike[str]
    impact: FieldLike[str]
    wake_due: FieldLike[str]


class CalendarEntryLike(Protocol):
    date: FieldLike[str]
    project_id: FieldLike[str]
    kind: FieldLike[str]


class CompletionEntryLike(Protocol):
    date: str


class BoardSourcesLike(Protocol):
    projects: Sequence[ProjectSourceLike]
    skipped: Sequence[Any]
    queue: Sequence[QueueRowLike]
    calendar: Sequence[CalendarEntryLike]
    completions: Sequence[CompletionEntryLike]

# ---------------------------------------------------------------------------
# The five kinds and the demand rule (FR-1, FR-2)
# ---------------------------------------------------------------------------

KIND_WAITING = 1
KIND_UNSHAPED = 2
KIND_MINE = 3
KIND_HANDOVER = 4
KIND_INCOMING = 5

KIND_NAMES: dict[int, str] = {
    KIND_WAITING: "waiting",
    KIND_UNSHAPED: "unshaped",
    KIND_MINE: "mine",
    KIND_HANDOVER: "hand-over",
    KIND_INCOMING: "incoming",
}
_KIND_BY_NAME: dict[str, int] = {name: kind for kind, name in KIND_NAMES.items()}

# FR-2: every other rule in this module reads only from this set. Widening it
# is the one thing FR-16 explicitly forbids doing to compensate for messy data.
DEMANDS_LUKE = frozenset({KIND_MINE, KIND_HANDOVER})

_MIND_PROJECT_KINDS = frozenset({KIND_UNSHAPED, KIND_INCOMING})


@dataclass(frozen=True)
class Guessable(Generic[T]):
    """A derived value plus whether it was actually derived (FR-20).

    `guessed=False` means the source file stated this value outright; `True`
    means this module worked it out. Every consumer renders the two
    differently — that promise is the reason this type exists instead of a
    bare value.
    """

    value: T
    guessed: bool


def _owner_is_luke(owner: str | None) -> bool:
    return owner is not None and "luke" in owner.lower()


# ---------------------------------------------------------------------------
# Kind resolution (FR-1, FR-12)
# ---------------------------------------------------------------------------


def resolve_kind(kind_field: FieldLike[str], owner_field: FieldLike[str]) -> Guessable[int]:
    """FR-1: the stated value wins; otherwise derive from Owner.

    Two things can be "stated" in the `kind` field depending on the
    registry's vintage: the current five-value vocabulary, or a pre-migration
    `Type: Human|Agent` cell that `stores` aliases onto the same field name
    (same column position, old words). A value that is not one of the five
    current names is therefore read as that legacy cell, not as a typo:
    `Human` -> mine, `Agent` -> hand-over, matching the PRD's own account of
    what the pre-migration derivation did.

    Below that, Owner is the only remaining "whose move" signal FR-1 lists
    that this store actually carries per-action (Status and Due describe the
    task, not who owns it): Luke's name -> mine; a different named owner ->
    waiting, since work already sitting with a named person has already been
    asked of them; no owner at all -> unshaped, since nobody's move is the
    definition of not-yet-a-move. This heuristic is this module's own design
    (the spec names the inputs, not a formula) and is flagged as such in the
    build report.
    """
    if kind_field.stated:
        name = (kind_field.value or "").strip().lower()
        if name in _KIND_BY_NAME:
            return Guessable(_KIND_BY_NAME[name], False)
        if name == "human":
            return Guessable(KIND_MINE, True)
        if name == "agent":
            return Guessable(KIND_HANDOVER, True)
    if owner_field.stated and owner_field.value:
        if _owner_is_luke(owner_field.value):
            return Guessable(KIND_MINE, True)
        return Guessable(KIND_WAITING, True)
    return Guessable(KIND_UNSHAPED, True)


def resolve_arrival_kind(owner_field: FieldLike[str]) -> Guessable[int]:
    """FR-12: what a kind-5 wrapper becomes on its date.

    No column anywhere states this directly — it is always read off Owner,
    so it is always guessed. Luke's own -> mine (3); anyone else's -> waiting
    (1). No other kind is a valid arrival (AC-9).
    """
    if _owner_is_luke(owner_field.value if owner_field.stated else None):
        return Guessable(KIND_MINE, True)
    return Guessable(KIND_WAITING, True)


def _is_open(status: FieldLike[str]) -> bool:
    """A row is open unless it is explicitly marked done (☑). Matches the
    convention `stores.read_queue` already uses for the minor queue."""
    return not (status.stated and "☑" in (status.value or ""))


# ---------------------------------------------------------------------------
# Effort and tokens — action-level, three values each (FR-3)
# ---------------------------------------------------------------------------

EFFORT_MINUTES = "⚡ minutes"
EFFORT_HOUR = "🔨 an hour"
EFFORT_SESSION = "🏔️ a session"
_EFFORT_WEIGHT: dict[str, int] = {EFFORT_MINUTES: 1, EFFORT_HOUR: 2, EFFORT_SESSION: 3}

TOKENS_LITTLE = "little"
TOKENS_SOME = "some"
TOKENS_PLENTY = "plenty"
_TOKEN_RANK: dict[str, int] = {TOKENS_LITTLE: 0, TOKENS_SOME: 1, TOKENS_PLENTY: 2}

# Keyword scan used only for the last-resort derivation tier (FR-3's third
# step). Deliberately small and named, not a hidden magic list — the PRD's
# own warning about project-level effort ("a guess wearing a rule's clothes")
# applies here too, just at the safer action-level granularity.
_HEAVY_KEYWORDS = (
    "audit", "migrat", "overhaul", "rebuild", "redesign", "sweep", "survey",
    "rewrite", "every registry", "across all", "all 40",
)
_LIGHT_KEYWORDS = (
    "email", "reply", "confirm", "check", "ask ", "send", "note", "remind",
    "follow up", "call ",
)


def _derive_effort(kind: int, action_text: str) -> str:
    text = action_text.lower()
    if any(k in text for k in _HEAVY_KEYWORDS):
        return EFFORT_SESSION
    if kind == KIND_HANDOVER or any(k in text for k in _LIGHT_KEYWORDS):
        return EFFORT_MINUTES
    return EFFORT_HOUR


def _derive_tokens(kind: int, action_text: str) -> str:
    text = action_text.lower()
    if any(k in text for k in _HEAVY_KEYWORDS):
        return TOKENS_PLENTY
    if kind == KIND_HANDOVER:
        return TOKENS_LITTLE
    return TOKENS_SOME


def resolve_effort(
    action_effort: FieldLike[str],
    project_fallbacks: Sequence[FieldLike[str]],
    kind: int,
    action_text: str,
) -> Guessable[str]:
    """FR-3: action column -> project's `effort:` key -> derived from kind + text."""
    if action_effort.stated and (action_effort.value or "").strip() in _EFFORT_WEIGHT:
        return Guessable(action_effort.value.strip(), False)
    for candidate in project_fallbacks:
        if candidate.stated and (candidate.value or "").strip() in _EFFORT_WEIGHT:
            return Guessable(candidate.value.strip(), True)
    return Guessable(_derive_effort(kind, action_text), True)


def resolve_tokens(
    action_tokens: FieldLike[str],
    project_fallback: FieldLike[str],
    kind: int,
    action_text: str,
) -> Guessable[str]:
    """FR-3: the same resolution order as effort, for token cost."""
    if action_tokens.stated and (action_tokens.value or "").strip().lower() in _TOKEN_RANK:
        return Guessable(action_tokens.value.strip().lower(), False)
    if project_fallback.stated and (project_fallback.value or "").strip().lower() in _TOKEN_RANK:
        return Guessable(project_fallback.value.strip().lower(), True)
    return Guessable(_derive_tokens(kind, action_text), True)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Task and project views
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TaskView:
    index: str | None
    action: str
    owner: str | None
    kind: Guessable[int]
    due: date | None
    effort: Guessable[str]
    tokens: Guessable[str]
    arrival_kind: Guessable[int] | None  # only set when kind.value == KIND_INCOMING (FR-12)


def _build_task(
    row: NextActionRowLike,
    project_effort_fallbacks: Sequence[FieldLike[str]],
    project_tokens_fallback: FieldLike[str],
) -> TaskView:
    kind = resolve_kind(row.kind, row.owner)
    action_text = row.action.value or ""
    arrival = resolve_arrival_kind(row.owner) if kind.value == KIND_INCOMING else None
    return TaskView(
        index=row.index.value,
        action=action_text,
        owner=row.owner.value,
        kind=kind,
        due=_parse_date(row.due.value if row.due.stated else None),
        effort=resolve_effort(row.effort, project_effort_fallbacks, kind.value, action_text),
        tokens=resolve_tokens(row.tokens, project_tokens_fallback, kind.value, action_text),
        arrival_kind=arrival,
    )


@dataclass(frozen=True)
class ProjectView:
    id: str
    title: str | None
    context: str | None
    path: str | None                  # the registry's path, relative to the Lukeatron root — Monitor's second copy target (FR-7)
    mtime: float | None                # the registry file's mtime as just read — Unblock's write gate (AC-4/AC-5/AC-9)
    tasks: list[TaskView]              # FR-15: open only, kind-ascending, uncapped
    kind_counts: dict[int, int]
    crown: str                         # "sole-blocker" | "shared" | "none"          (FR-16)
    outline: str                       # "overdue" | "this-week" | "none"           (FR-17)
    is_mind_project: bool              # FR-6
    next_action: TaskView | None       # first open task in file order
    has_demand: bool                   # any open kind 3/4 — the input every rule below reads (FR-2)
    urgency_days: int | None           # FR-14: soonest due on open 3/4, days from today
    depth_label: str | None            # "7-day" | "30-day" | None                  (FR-14a, OQ-4)
    stale_handover: bool               # FR-10


def _is_mind_project(open_tasks: Sequence[TaskView]) -> bool:
    """FR-6: open tasks are only kinds 2 and 5. True (vacuously) for a project
    with no open tasks at all — the glossary calls that same case a plate,
    "a stack of height zero", and FR-16's three-value crown has no fourth slot
    for it, so it falls into `none` alongside a genuine mind project."""
    return all(t.kind.value in _MIND_PROJECT_KINDS for t in open_tasks)


def _crown(open_tasks: Sequence[TaskView]) -> str:
    """FR-16. Order matters: a mind project (or an empty one) can never also
    hold a kind 1, so checking mind-ness first and demand-kinds last is a
    plain if/elif/else, not three independent checks that could disagree."""
    kinds = {t.kind.value for t in open_tasks}
    if kinds <= _MIND_PROJECT_KINDS:
        return "none"
    if KIND_WAITING in kinds:
        return "shared"
    return "sole-blocker"


def _outline(open_tasks: Sequence[TaskView], today: date) -> str:
    """FR-17: computed only from open kinds 3 and 4 — a project whose every
    open task is a 1, 2 or 5 returns `none` however its dates fall."""
    demand_dates = [t.due for t in open_tasks if t.kind.value in DEMANDS_LUKE and t.due is not None]
    if any(d < today for d in demand_dates):
        return "overdue"
    if any(d <= today + timedelta(days=7) for d in demand_dates):
        return "this-week"
    return "none"


def _urgency_days(open_tasks: Sequence[TaskView], today: date) -> int | None:
    demand_dates = [t.due for t in open_tasks if t.kind.value in DEMANDS_LUKE and t.due is not None]
    if not demand_dates:
        return None
    return (min(demand_dates) - today).days


def _depth_label(urgency_days: int | None) -> str | None:
    """FR-14a / OQ-4: seven is load-bearing (FR-17's outline threshold);
    thirty is a label only, kept for the week view and the brief."""
    if urgency_days is None:
        return None
    if urgency_days <= 7:
        return "7-day"
    if urgency_days <= 30:
        return "30-day"
    return None


def _stale_handover(open_tasks: Sequence[TaskView], project_updated: date | None, today: date) -> bool:
    """FR-10: a kind 4 un-handed-over for more than 14 days.

    No file in this store timestamps *when* a task became a kind 4 — the
    nearest available signal is the project's own `updated` date in
    `_tracking.yaml`. That is a proxy, not the thing FR-10 actually asks for,
    and is called out as a store gap in the build report rather than fixed
    here (this module derives from what stores hands it; it does not invent
    a field stores does not carry).
    """
    if project_updated is None:
        return False
    if not any(t.kind.value == KIND_HANDOVER for t in open_tasks):
        return False
    return (today - project_updated).days > 14


def build_project(source: ProjectSourceLike, *, today: date) -> ProjectView:
    reg = source.registry
    tracking = source.tracking
    project_effort_fallbacks = [
        reg.frontmatter.get("effort", _NOT_STATED),
        tracking.effort,
    ]
    project_tokens_fallback = reg.frontmatter.get("tokens", _NOT_STATED)

    ordered_open = [
        _build_task(row, project_effort_fallbacks, project_tokens_fallback)
        for row in reg.next_actions
        if _is_open(row.status)
    ]
    tasks_kind_sorted = sorted(ordered_open, key=lambda t: t.kind.value)  # FR-15, stable
    kind_counts = dict(Counter(t.kind.value for t in ordered_open))
    project_updated = _parse_date(tracking.updated.value if tracking.updated.stated else None)

    return ProjectView(
        id=tracking.id.value or reg.project_id,
        title=tracking.title.value,
        context=tracking.context.value,
        path=tracking.path.value,
        mtime=reg.mtime,
        tasks=tasks_kind_sorted,
        kind_counts=kind_counts,
        crown=_crown(ordered_open),
        outline=_outline(ordered_open, today),
        is_mind_project=_is_mind_project(ordered_open),
        next_action=ordered_open[0] if ordered_open else None,
        has_demand=any(t.kind.value in DEMANDS_LUKE for t in ordered_open),
        urgency_days=_urgency_days(ordered_open, today),
        depth_label=_depth_label(_urgency_days(ordered_open, today)),
        stale_handover=_stale_handover(ordered_open, project_updated, today),
    )


# ---------------------------------------------------------------------------
# The depot (FR-7)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DepotJob:
    index: str | None
    task: str
    source: str | None
    kind: int  # always KIND_MINE or KIND_HANDOVER — a direct mapping, never guessed
    tokens: Guessable[str]  # queue.md carries no Tokens column, so always derived
    wake_due: date | None


def build_depot(queue_rows: Sequence[QueueRowLike]) -> list[DepotJob]:
    """FR-7: `Impact: Low` -> kind 4 (an agent can take it), `Impact: High` ->
    kind 3 (it stays Luke's). Contributes no outline, no crown, no *This
    week* entry anywhere below — it is never folded into `projects`."""
    jobs: list[DepotJob] = []
    for row in queue_rows:
        impact = (row.impact.value or "").strip().lower()
        kind = KIND_MINE if impact == "high" else KIND_HANDOVER
        task_text = row.task.value or ""
        jobs.append(
            DepotJob(
                index=row.index.value,
                task=task_text,
                source=row.source.value,
                kind=kind,
                tokens=Guessable(_derive_tokens(kind, task_text), True),
                wake_due=_parse_date(row.wake_due.value if row.wake_due.stated else None),
            )
        )
    return jobs


# ---------------------------------------------------------------------------
# Orderings — due/short (FR-14), effort (FR-14a), leverage (FR-4)
# ---------------------------------------------------------------------------


def _effort_weight(project: ProjectView) -> int:
    """-1 for "no next action to weigh" (a mind project or an empty one) so
    it always sorts as the lightest thing on the effort axis, never mixed in
    among real weights 1-3."""
    if project.next_action is None:
        return -1
    return _EFFORT_WEIGHT.get(project.next_action.effort.value, -1)


def _urgency_key(project: ProjectView) -> float:
    return project.urgency_days if project.urgency_days is not None else math.inf


def _due_sort_key(p: ProjectView) -> tuple[float, int, str]:
    return (_urgency_key(p), -len(p.tasks), p.id)


def _short_sort_key(p: ProjectView) -> tuple[int, float, str]:
    return (len(p.tasks), _urgency_key(p), p.id)


def _effort_sort_key(p: ProjectView) -> tuple[int, str]:
    return (-_effort_weight(p), p.id)


def _leverage_sort_key(p: ProjectView) -> tuple[int, float, str]:
    """FR-4: with the leverage numerator cut from the app (AC-6a), what is
    left reduces to 1/effort — cheapest first. Urgency breaks ties but never
    drives the order."""
    return (_effort_weight(p), _urgency_key(p), p.id)


def _group_by_context(projects: Sequence[ProjectView]) -> dict[str, list[ProjectView]]:
    groups: dict[str, list[ProjectView]] = defaultdict(list)
    for p in projects:
        groups[p.context or "Unknown"].append(p)
    return dict(groups)


@dataclass(frozen=True)
class QuadrantOrderings:
    due: list[str]
    short: list[str]
    effort: list[str]


def build_orderings(projects: Sequence[ProjectView]) -> dict[str, QuadrantOrderings]:
    """FR-14/FR-14a: two independent total orders per quadrant, over the same
    set of projects (AC-11) — switching between `due` and `short` moves no
    project between quadrants, and neither touches the effort axis."""
    result: dict[str, QuadrantOrderings] = {}
    for context, group in _group_by_context(projects).items():
        result[context] = QuadrantOrderings(
            due=[p.id for p in sorted(group, key=_due_sort_key)],
            short=[p.id for p in sorted(group, key=_short_sort_key)],
            effort=[p.id for p in sorted(group, key=_effort_sort_key)],
        )
    return result


# ---------------------------------------------------------------------------
# This week (FR-8) and nothing-needs-you (FR-9)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ThisWeek:
    selected: list[str]       # exactly three, when three qualify (AC-4)
    not_this_week: list[str]  # every other project, explicit, never omitted (AD-2)


def build_this_week(all_projects: Sequence[ProjectView]) -> ThisWeek:
    """FR-8: drawn only from projects holding an open kind 3 or 4.

    OQ-2's stated default picks the selection: rank eligible projects by
    leverage (FR-4 — cheapest first, per AC-6a), and take the
    best from a quadrant that hasn't contributed yet before a quadrant gets a
    second pick. This is the one open question in the module with a stated
    default rather than a settled answer; flagged as such in the build
    report.
    """
    eligible = [p for p in all_projects if p.has_demand and not p.is_mind_project]
    ranked = sorted(eligible, key=_leverage_sort_key)

    selected: list[str] = []
    quadrants_used: set[str] = set()
    remaining = list(ranked)
    while remaining and len(selected) < 3:
        pick_index = next((i for i, p in enumerate(remaining) if p.context not in quadrants_used), None)
        if pick_index is None:
            pick_index = 0
        chosen = remaining.pop(pick_index)
        quadrants_used.add(chosen.context or "Unknown")
        selected.append(chosen.id)

    not_this_week = sorted({p.id for p in all_projects} - set(selected))
    return ThisWeek(selected=selected, not_this_week=not_this_week)


def nothing_needs_you(projects: Sequence[ProjectView]) -> bool:
    """FR-9, in the PRD's own words: "does anything need me?" is a count of
    open 3s and 4s. Zero means nothing does. Scoped to projects only — the
    depot is discretionary by design (D-5) and never asked to answer this."""
    total_demand = sum(
        p.kind_counts.get(KIND_MINE, 0) + p.kind_counts.get(KIND_HANDOVER, 0) for p in projects
    )
    return total_demand == 0


# ---------------------------------------------------------------------------
# The week and day sets (FR-13, FR-13a)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DatedItem:
    date: date
    source: str  # "due" | "wake" | "incoming" | "event"
    project_id: str | None
    kind: int | None
    arrival_kind: int | None = None  # set only for an "incoming" item (FR-12)


@dataclass(frozen=True)
class DaySet:
    date: date
    items: list[DatedItem]  # FR-13a: kind-ascending; sourceless items sort last


@dataclass(frozen=True)
class WeekSet:
    days: list[DaySet]
    overdue: list[DatedItem]  # the rail's left-end cap: demand items already past today


def _item_sort_key(item: DatedItem) -> int:
    return item.kind if item.kind is not None else 99


def week_set(
    start: date,
    span_days: int,
    projects: Sequence[ProjectView],
    project_wakes: dict[str, date | None],
    calendar_entries: Sequence[CalendarEntryLike],
    *,
    today: date | None = None,
) -> WeekSet:
    """FR-13: only four sources — kind 5 dates, due dates on open kinds 3/4,
    project wakes, and calendar events already attached to a project or a
    deadline (trusted as pre-filtered by whatever wrote the snapshot file;
    this module does not re-filter it, matching AD-2's "never derive twice").

    `start` and `span_days` are generic on purpose (AD-1): this function does
    not assume the caller wants a Monday-anchored week. Rendering a rail that
    is always Monday-to-Sunday (documentation spec D-27) is the caller's job
    — pass this Monday's date as `start` for that view, and the actual
    calendar date as `today` for the separate overdue cap.
    """
    reference_today = today if today is not None else start
    items_by_date: dict[date, list[DatedItem]] = defaultdict(list)
    overdue: list[DatedItem] = []

    for p in projects:
        for t in p.tasks:
            if t.due is None:
                continue
            if t.kind.value == KIND_INCOMING:
                item = DatedItem(t.due, "incoming", p.id, KIND_INCOMING, arrival_kind=t.arrival_kind.value if t.arrival_kind else None)
            elif t.kind.value in DEMANDS_LUKE:
                item = DatedItem(t.due, "due", p.id, t.kind.value)
            else:
                continue
            if item.source == "due" and t.due < reference_today:
                overdue.append(item)
            else:
                items_by_date[t.due].append(item)
        wake = project_wakes.get(p.id)
        if wake is not None:
            items_by_date[wake].append(DatedItem(wake, "wake", p.id, None))

    for entry in calendar_entries:
        if not entry.date.stated:
            continue
        d = _parse_date(entry.date.value)
        if d is None:
            continue
        kind = _KIND_BY_NAME.get((entry.kind.value or "").strip().lower()) if entry.kind.stated else None
        items_by_date[d].append(DatedItem(d, "event", entry.project_id.value if entry.project_id.stated else None, kind))

    days = []
    for offset in range(span_days):
        d = start + timedelta(days=offset)
        day_items = sorted(items_by_date.get(d, []), key=_item_sort_key)
        days.append(DaySet(d, day_items))

    overdue.sort(key=lambda it: (it.date, _item_sort_key(it)))
    return WeekSet(days=days, overdue=overdue)


# ---------------------------------------------------------------------------
# Agent capacity — the fit test (FR-18)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TokenBudget:
    value: str | int
    provider: str  # "luke" (three-value control, works today) | "runtime" (not yet available)


# FR-18/AD-8: the one named placeholder that turns a three-value label into a
# comparable count, so a "luke"-provider budget and a future "runtime" number
# are read on one scale. A job's own token cost is always a label (queue.md
# and the Next Actions Tokens column never carry a number), so it always goes
# through this same table regardless of which provider supplies the budget —
# that is what keeps the fit test's shape identical the day the provider
# changes (AD-8).
_TOKEN_LEVEL_ESTIMATE: dict[str, int] = {
    TOKENS_LITTLE: 2_000,
    TOKENS_SOME: 10_000,
    TOKENS_PLENTY: 50_000,
}


def _token_number(level: str | int, provider: str) -> float:
    if provider == "runtime":
        return float(level)
    return float(_TOKEN_LEVEL_ESTIMATE[str(level).strip().lower()])


@dataclass(frozen=True)
class AgentFitResult:
    budget: TokenBudget
    fitting: list[str]
    dropped: list[str]


def agent_fit(jobs: Sequence[tuple[str, Guessable[str]]], budget: TokenBudget) -> AgentFitResult:
    """FR-18: `action.token_cost <= remaining(token_budget)`, reading only
    the one `token_budget` field (AD-8) — nothing here branches on provider
    except the single lookup above. `jobs` is any (id, tokens) sequence the
    caller assembles — a project's kind-4 tasks, the depot's kind-4 jobs, or
    both; this module does not decide which jobs make up "the agent's
    queue", since that selection is Unblock's, not model's."""
    remaining = _token_number(budget.value, budget.provider)
    fitting: list[str] = []
    dropped: list[str] = []
    for job_id, tokens in jobs:
        cost = _token_number(tokens.value, "luke")
        (fitting if cost <= remaining else dropped).append(job_id)
    return AgentFitResult(budget=budget, fitting=fitting, dropped=dropped)


# ---------------------------------------------------------------------------
# Luke's capacity — the structure, not the answer (FR-19)
# ---------------------------------------------------------------------------

# FR-19/AD-9: one named, explicit placeholder — not scattered magic numbers.
# `fitted: false` on every result is what stops this being mistaken for a
# fitted measure (FR-20).
_CAPACITY_COEFFICIENTS: dict[str, float] = {
    "complexity": -10.0,
    "open_count": -2.0,
    "days_to_sunday": 5.0,
    "recent_completions": 3.0,
}
_CAPACITY_BASELINE = 100.0
_COMPLETION_WINDOW_DAYS = 14


@dataclass(frozen=True)
class CapacityInputs:
    complexity: int
    open_count: int
    days_to_sunday: int
    recent_completions: int | None


@dataclass(frozen=True)
class LukesCapacity:
    inputs: CapacityInputs
    capacity: float
    fitted: bool


def _days_to_sunday(today: date) -> int:
    return (6 - today.weekday()) % 7  # Monday=0 .. Sunday=6


def _recent_completions(
    completions: Sequence[CompletionEntryLike], today: date, window_days: int = _COMPLETION_WINDOW_DAYS
) -> int | None:
    """FR-19: `null` when the log is absent, empty, or doesn't yet cover a
    full window — "too short" is read here as fewer days of history than the
    window itself, since a three-day-old log cannot say anything about a
    fortnight's rhythm."""
    dates = [d for d in (_parse_date(c.date) for c in completions) if d is not None]
    if not dates:
        return None
    if (max(dates) - min(dates)).days < window_days:
        return None
    cutoff = today - timedelta(days=window_days)
    return sum(1 for d in dates if d >= cutoff)


def lukes_capacity(
    *, next_action_effort_weight: int, open_count: int, today: date, completions: Sequence[CompletionEntryLike]
) -> LukesCapacity:
    """FR-19: all four inputs computed and returned every time, `fitted`
    always `false` today (AD-9). This is deliberately a per-candidate-action
    query — "complexity" is *the action's* effort (FR-19's own wording) — not
    a single whole-board figure, so the caller (Unblock, considering one
    project's next action) supplies the two inputs that are per-action."""
    inputs = CapacityInputs(
        complexity=next_action_effort_weight,
        open_count=open_count,
        days_to_sunday=_days_to_sunday(today),
        recent_completions=_recent_completions(completions, today),
    )
    score = _CAPACITY_BASELINE
    score += _CAPACITY_COEFFICIENTS["complexity"] * inputs.complexity
    score += _CAPACITY_COEFFICIENTS["open_count"] * inputs.open_count
    score += _CAPACITY_COEFFICIENTS["days_to_sunday"] * inputs.days_to_sunday
    if inputs.recent_completions is not None:
        score += _CAPACITY_COEFFICIENTS["recent_completions"] * inputs.recent_completions
    return LukesCapacity(inputs=inputs, capacity=score, fitted=False)


# ---------------------------------------------------------------------------
# The board — one call, every derived fact (documentation spec D-1)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Board:
    projects: list[ProjectView]
    skipped: list[Any]
    depot: list[DepotJob]
    horizon: list[str]             # mind-project ids (glossary: "the horizon")
    this_week: ThisWeek
    nothing_needs_you: bool
    orderings: dict[str, QuadrantOrderings]
    week: WeekSet


def build_board(
    sources: BoardSourcesLike,
    *,
    today: date,
    week_start: date | None = None,
    week_span_days: int = 7,
) -> Board:
    """The one function every face (`server`, `snapshot`, `brief`) calls.

    `week_start` defaults to `today` but can be set separately so a caller
    drawing the fixed Monday-Sunday rail (documentation spec D-27) can pass
    this week's Monday here while still passing the real calendar date as
    `today` for every overdue/staleness rule above.
    """
    projects = [build_project(src, today=today) for src in sources.projects]
    wakes = {
        src.tracking.id.value: _parse_date(src.tracking.wake.value if src.tracking.wake.stated else None)
        for src in sources.projects
    }
    week = week_set(
        week_start or today, week_span_days, projects, wakes, sources.calendar, today=today
    )
    return Board(
        projects=projects,
        skipped=sources.skipped,
        depot=build_depot(sources.queue),
        horizon=[p.id for p in projects if p.is_mind_project],
        this_week=build_this_week(projects),
        nothing_needs_you=nothing_needs_you(projects),
        orderings=build_orderings(projects),
        week=week,
    )
