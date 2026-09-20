"""Turn plain records into the board: which lane, which column.

The derivation layer (the model spec). This is the only place a fact is
derived — if the board, the project view and the print sheet each worked out
"overdue" for themselves they would disagree within a week (model.spec.md
§1). This module touches no file, no clock and no network (FR-14): `today`
is always passed in, never read, which is what keeps every date rule
testable with no filesystem (AD-2).

Never imports `stores` (FR-15) — the seam is described here as `Protocol`s:
plain shape contracts an object satisfies by having the right attributes,
never by being a particular class. The objects `stores` actually builds
happen to satisfy these shapes; this module does not know or care that
`stores` is where they came from.

Every derived value is wrapped in `Guessable(value, guessed)` (FR-13): a
consumer can always tell a fact from a guess without re-deriving anything.

Scope note: `stores.BoardSources` also carries a listing of orphaned plans
(the PRD's fifth "Lukeatron" view). No FR or AC in model.spec.md gives a
placement rule for it, so this module places only projects and their open
actions — the thing every acceptance criterion here actually tests. Folding
the plans into the same lane x column grid is a separate, not-yet-specified
piece of work.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import date, timedelta
from typing import Any, Generic, Protocol, TypeVar

T = TypeVar("T")

# ---------------------------------------------------------------------------
# The stores -> model seam, as shapes rather than an import (FR-15)
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
    itself one — e.g. "no such frontmatter key" when a lookup misses."""

    value: T | None
    stated: bool


_NOT_STATED: Field[Any] = Field(None, False)


class NextActionRowLike(Protocol):
    index: FieldLike[str]
    action: FieldLike[str]
    owner: FieldLike[str]
    kind: FieldLike[str]
    status: FieldLike[str]
    state: FieldLike[str]
    due: FieldLike[str]
    link: FieldLike[str]
    recurring_if_done: FieldLike[str]


class PeopleRowLike(Protocol):
    person: FieldLike[str]
    id: FieldLike[str]
    role: FieldLike[str]
    link: FieldLike[str]


class EventRowLike(Protocol):
    date: FieldLike[str]
    event: FieldLike[str]
    type: FieldLike[str]
    link: FieldLike[str]


class DocumentRowLike(Protocol):
    file: FieldLike[str]
    description: FieldLike[str]
    status: FieldLike[str]
    on_close: FieldLike[str]


class TrackingRowLike(Protocol):
    id: FieldLike[str]
    title: FieldLike[str]
    context: FieldLike[str]
    wake: FieldLike[str]


class RegistryRecordLike(Protocol):
    project_id: str
    mtime: float  # a filesystem fact, not a Field — writes' concurrency gate (documentation.spec.md)
    multi_stream: bool  # true if Next Actions section has more than one table block
    frontmatter: dict[str, FieldLike[Any]]
    next_actions: Sequence[NextActionRowLike]
    events: Sequence[EventRowLike]
    documents: Sequence[DocumentRowLike]
    people: Sequence[PeopleRowLike]
    definition_of_done: Sequence[str]
    decision_log: Sequence[str]


class ProjectSourceLike(Protocol):
    tracking: TrackingRowLike
    registry: RegistryRecordLike


@dataclass(frozen=True)
class Guessable(Generic[T]):
    """A derived value plus whether it was actually derived (FR-13).

    `guessed=False` means a source file stated this outright, or the
    placement follows deterministically from a value it stated (e.g. a real
    parsed due date's column). `guessed=True` means this module worked it
    out or fell back in the absence of anything stated. Every consumer
    renders the two differently — that promise is the reason this type
    exists instead of a bare value.
    """

    value: T
    guessed: bool


# ---------------------------------------------------------------------------
# Lanes and the demand order (FR-1, FR-7)
# ---------------------------------------------------------------------------

LANE_MINE = "mine"
LANE_DELEGATE = "delegate"
LANE_WAITING = "waiting"
LANE_INCOMING = "incoming"
LANE_UNSHAPED = "unshaped"

# FR-7: highest demand first. Used both to roll a project up to its
# highest-demand open action and to rank two lanes against each other.
_LANE_DEMAND_ORDER: tuple[str, ...] = (LANE_MINE, LANE_DELEGATE, LANE_WAITING, LANE_INCOMING, LANE_UNSHAPED)
_LANE_DEMAND_RANK: dict[str, int] = {lane: i for i, lane in enumerate(_LANE_DEMAND_ORDER)}
_LANE_NAMES = frozenset(_LANE_DEMAND_ORDER)


def _owner_is_luke(owner: str | None) -> bool:
    return owner is not None and "luke" in owner.lower()


def resolve_lane(kind_field: FieldLike[str], owner_field: FieldLike[str]) -> Guessable[str]:
    """FR-1, AD-1: ported from ProjectDashboard's `resolve_kind`.

    A stated Kind cell wins outright. `stores` aliases the registry's older
    `Type` column onto this same `kind` field (see
    `stores._NEXT_ACTION_ALIASES`), so a pre-migration `Human`/`Agent` value
    can still arrive here — read as what that vintage's column meant, not as
    a typo of today's five lane names.

    Otherwise fall back to Owner, the only per-action "whose move" signal
    this store carries (Status and Due describe the task, not who owns it):
    Luke's name -> mine; a different named owner -> waiting, since work
    already sitting with a named person has already been asked of them; no
    owner at all -> unshaped, since nobody's move is the definition of
    not-yet-a-move. `delegate` and `incoming` are never reached by this
    fallback — nothing in this store names either of them per-action short
    of a stated Kind cell.
    """
    if kind_field.stated:
        name = (kind_field.value or "").strip().lower()
        if name in _LANE_NAMES:
            return Guessable(name, False)
        if name == "human":
            return Guessable(LANE_MINE, True)
        if name == "agent":
            return Guessable(LANE_DELEGATE, True)
    if owner_field.stated and owner_field.value:
        if _owner_is_luke(owner_field.value):
            return Guessable(LANE_MINE, True)
        return Guessable(LANE_WAITING, True)
    return Guessable(LANE_UNSHAPED, True)


def _is_open(status_field: FieldLike[str]) -> bool:
    """A row is open unless it is explicitly marked done (checked box glyph)."""
    return not (status_field.stated and "☑" in (status_field.value or ""))


def _is_archived(status_field: FieldLike[str]) -> bool:
    """A tracking row is archived once `!ArchiveMemory` sets its top-level
    `status:` to Archived — distinct from `_is_open`, which reads a Next
    Action row's own Status column. An unstated field is never archived."""
    return status_field.stated and (status_field.value or "").strip().lower() == "archived"


# ---------------------------------------------------------------------------
# Columns and date parsing (FR-2, FR-3, FR-4, FR-5)
# ---------------------------------------------------------------------------

COLUMN_OVERDUE = "OVERDUE"
COLUMN_THIS_WEEK = "THIS WEEK"
COLUMN_NEXT_WEEK = "NEXT WEEK"
COLUMN_LATER = "LATER"
COLUMN_NO_DATE = "NO DATE"

_COLUMN_ORDER: tuple[str, ...] = (COLUMN_OVERDUE, COLUMN_THIS_WEEK, COLUMN_NEXT_WEEK, COLUMN_LATER, COLUMN_NO_DATE)
_COLUMN_RANK: dict[str, int] = {column: i for i, column in enumerate(_COLUMN_ORDER)}

_MONTH_NAMES: dict[str, int] = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

# FR-3: a leading ISO date is pulled out of prose ("2026-08-01 pending
# Keith's reply") — `.match` anchors at the start only, deliberately not the
# end. Every other shape below is matched whole: FR-3 lists them as complete
# cell values, never as a prefix inside a longer sentence.
_ISO_LEADING_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")
_SLASH_OR_DASH_RE = re.compile(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$")
_DAY_MONTH_YEAR_RE = re.compile(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$")
_MONTH_YEAR_RE = re.compile(r"^([A-Za-z]+)\s+(\d{4})$")


def parse_due_text(text: str) -> date | None:
    """FR-3: the seven recognised shapes, in the order that keeps them from
    shadowing each other (see the regexes' own anchoring). `01/08/2026` and
    `01-08-2026` read day-first (DD/MM/YYYY) — the FR's own worked examples
    only make sense together under that reading: `01/08/2026`, `1 Aug 2026`
    and `Aug 2026` all name the same month, which only holds if the slash
    form's `08` is August, not a US-style day."""
    iso_match = _ISO_LEADING_RE.match(text)
    if iso_match:
        try:
            return date(int(iso_match[1]), int(iso_match[2]), int(iso_match[3]))
        except ValueError:
            return None

    slash_match = _SLASH_OR_DASH_RE.match(text)
    if slash_match:
        day_str, month_str, year_str = slash_match.groups()
        try:
            return date(int(year_str), int(month_str), int(day_str))
        except ValueError:
            return None

    dmy_match = _DAY_MONTH_YEAR_RE.match(text)
    if dmy_match:
        day_str, month_name, year_str = dmy_match.groups()
        month = _MONTH_NAMES.get(month_name.lower())
        if month is None:
            return None
        try:
            return date(int(year_str), month, int(day_str))
        except ValueError:
            return None

    my_match = _MONTH_YEAR_RE.match(text)
    if my_match:
        month_name, year_str = my_match.groups()
        month = _MONTH_NAMES.get(month_name.lower())
        if month is None:
            return None
        # A bare month names no day; the 1st is the earliest date consistent
        # with what was actually stated, which is the safer side to land on
        # for a column boundary than guessing any later day would be.
        return date(int(year_str), month, 1)

    return None


@dataclass(frozen=True)
class DueOutcome:
    column: Guessable[str]
    parsed_date: date | None  # None for ASAP (FR-4) and for NO DATE — there is no single calendar day to report
    raw_text: str | None  # FR-5/FR-6: the cell's own words, carried through whenever something was stated


def _week_end(day: date) -> date:
    """The Sunday on or after `day` — the boundary THIS WEEK/NEXT WEEK are
    measured against. Not pinned down by any FR; a Monday-anchored calendar
    week matches how the rest of Lukeatron already schedules itself
    (`!ProjectSweep` Mon 07:30, `!Review` Mon/Fri)."""
    return day + timedelta(days=6 - day.weekday())


def _classify_due(raw_value: str | None, today: date) -> DueOutcome:
    if raw_value is None:
        return DueOutcome(Guessable(COLUMN_NO_DATE, True), None, None)
    text = raw_value.strip()
    if not text:
        return DueOutcome(Guessable(COLUMN_NO_DATE, True), None, None)
    if text.upper() == "ASAP":
        # FR-4: ASAP is a date, not an absence — always OVERDUE, and always
        # confidently so (guessed=False): the file said exactly this.
        return DueOutcome(Guessable(COLUMN_OVERDUE, False), None, text)

    parsed = parse_due_text(text)
    if parsed is None:
        # FR-5: something was written but this module can't read it as a
        # date. NO DATE is the honest answer, not a confident one.
        return DueOutcome(Guessable(COLUMN_NO_DATE, True), None, text)

    if parsed < today:
        column = COLUMN_OVERDUE
    elif parsed <= _week_end(today):
        column = COLUMN_THIS_WEEK
    elif parsed <= _week_end(today) + timedelta(days=7):
        column = COLUMN_NEXT_WEEK
    else:
        column = COLUMN_LATER
    # A real, parsed date's column is arithmetic on a stated fact, not a
    # guess — guessed=False, same reasoning as ASAP above.
    return DueOutcome(Guessable(column, False), parsed, text)


# ---------------------------------------------------------------------------
# Task and project views (FR-1..FR-12)
# ---------------------------------------------------------------------------

# A real 🔗 Link value is a bare kebab-slug — _links.yaml's own schema for a
# link `key` (e.g. "LK-04"). Some registries reuse the same column for an
# unrelated pointer (a markdown link to a Sandbox dev registry, say); that
# text is stated but never a key, so it must not be treated as one (FR-11).
_LINK_KEY_RE = re.compile(r"^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$")


def _is_link_key(text: str) -> bool:
    return bool(_LINK_KEY_RE.fullmatch(text))


@dataclass(frozen=True)
class TaskView:
    index: str | None
    action: str
    owner: str | None
    kind: str | None  # raw Kind/Type cell — outline-print's "lane" edit writes this column, never `lane` below
    status: str | None  # raw Status cell (e.g. "☐ Open", "◐ Doing") — outline-print's "tick done" edit's current value
    state: str | None  # raw State cell (🔴/🟠/🔵/🟢/⚪) — read-only display, !ProjectSweep's own vocabulary
    lane: Guessable[str]
    due_column: Guessable[str]
    due_date: date | None
    due_text: str | None  # FR-5: raw Due cell text, carried through whenever the cell was stated
    link_key: str | None  # FR-11: the 🔗 Link value when it IS a real key (a bare kebab-slug), else None
    recurring_if_done: str | None  # raw 🔁 Recur cell ("weekly-tue"/"monthly-1st"), else None
    lane_source: bool = False  # this row's own lane is the one `_lane_driver` rolled the project's lane up from


def _build_task(row: NextActionRowLike, *, today: date) -> TaskView:
    due = _classify_due(row.due.value if row.due.stated else None, today)
    return TaskView(
        index=row.index.value,
        action=row.action.value or "",
        owner=row.owner.value,
        kind=row.kind.value,
        status=row.status.value,
        state=row.state.value if row.state.stated else None,
        lane=resolve_lane(row.kind, row.owner),
        due_column=due.column,
        due_date=due.parsed_date,
        due_text=due.raw_text,
        link_key=(
            row.link.value
            if row.link.stated and row.link.value and _is_link_key(row.link.value)
            else None
        ),
        recurring_if_done=row.recurring_if_done.value if row.recurring_if_done.stated else None,
    )


@dataclass(frozen=True)
class EventView:
    date: str | None
    event: str | None
    type: str | None
    link: str | None


@dataclass(frozen=True)
class DocumentView:
    file: str | None
    description: str | None
    status: str | None
    on_close: str | None


@dataclass(frozen=True)
class PersonView:
    person: str | None
    id: str | None
    role: str | None
    link: str | None


@dataclass(frozen=True)
class ProjectView:
    id: str
    title: str | None
    context: str | None  # stated directly from _tracking.yaml; controls' view filter reads this, never derived
    lane: Guessable[str]
    due_column: Guessable[str]
    due_date: date | None
    due_text: str | None  # carried through only when the roll-up landed on a wake trigger or an unparseable cell
    open_count: int
    tasks: list[TaskView]  # open actions only, in file order (AC-1 lives here, one lane/column per row)
    done_tasks: list[TaskView]  # wishlist #4b: completed rows, in file order — never feeds lane/due/count
    next_action: TaskView | None  # first open task in file order, for a card's lead line
    mtime: float  # registry.md's mtime as read this pass — outline-print's edits must send this back verbatim
    multi_stream: bool  # true if Next Actions section has more than one table block
    purpose: str | None  # frontmatter `purpose:` — the one-sentence north star, not the body's fuller paragraph
    definition_of_done: list[str]  # outline-print FR-2, read-only
    decision_log: list[str]  # outline-print FR-2, read-only, file order (append-only source)
    events: list[EventView]  # outline-print FR-2, read-only
    documents: list[DocumentView]  # outline-print FR-2, read-only; FR-6/FR-7 copy the `file` path, never `file`'s basename
    people: list[PersonView]  # outline-print FR-2, read-only


def _resolve_incoming_override(tasks: Sequence[TaskView], wake_field: FieldLike[str]) -> bool:
    """FR-6: true exactly when every open action is undated and the project
    itself has a dated wake — the one data pattern that reclassifies both the
    lane and the column, regardless of what the actions would otherwise roll
    up to. `all()` over an empty list is vacuously True, so a project with no
    open actions at all also qualifies, matching FR-6's own wording ("open
    actions are all undated")."""
    all_undated = all(task.due_column.value == COLUMN_NO_DATE for task in tasks)
    return all_undated and wake_field.stated and bool(wake_field.value)


def _lane_driver(tasks: Sequence[TaskView]) -> TaskView | None:
    """FR-7: the single open task whose own lane sets the project's rolled-up
    lane — `min`'s first-of-ties behaviour, so this always names the same
    task `_project_lane` derives its answer from (it calls this too, so the
    two can never disagree about which row it is). None when there is
    nothing to roll up (no open tasks)."""
    if not tasks:
        return None
    return min(tasks, key=lambda task: _LANE_DEMAND_RANK[task.lane.value])


def _project_lane(tasks: Sequence[TaskView], *, incoming: bool) -> Guessable[str]:
    """FR-6/FR-7: the lane of the highest-demand open action, unless the
    wake override applies. A project with no open actions and no override
    has nothing to roll up — unshaped, and guessed, since there is no action
    here that could have stated anything."""
    if incoming:
        return Guessable(LANE_INCOMING, True)
    driver = _lane_driver(tasks)
    return driver.lane if driver is not None else Guessable(LANE_UNSHAPED, True)


def _project_due(
    tasks: Sequence[TaskView], wake_field: FieldLike[str], today: date, *, incoming: bool
) -> tuple[Guessable[str], date | None, str | None]:
    """FR-6/FR-7: the wake override wins outright when it applies. Otherwise
    the soonest column among ALL open actions — ranking over every task
    rather than filtering NO DATE ones out first is what lets a fully
    undated, wake-less project still surface one action's own raw text
    (FR-5) instead of losing it to a bare NO DATE fallback."""
    if incoming:
        wake = _classify_due(wake_field.value, today)
        return wake.column, wake.parsed_date, wake.raw_text

    if tasks:
        soonest = min(tasks, key=lambda task: _COLUMN_RANK[task.due_column.value])
        return soonest.due_column, soonest.due_date, soonest.due_text

    if wake_field.stated and wake_field.value:
        wake = _classify_due(wake_field.value, today)
        return wake.column, wake.parsed_date, wake.raw_text

    return Guessable(COLUMN_NO_DATE, True), None, None


def build_project(source: ProjectSourceLike, *, today: date) -> ProjectView:
    reg = source.registry
    tracking = source.tracking

    tasks = [_build_task(row, today=today) for row in reg.next_actions if _is_open(row.status)]

    # wishlist #4b: completed rows, built the same way as `tasks` but kept
    # entirely separate — nothing below this point (incoming/lane/due)
    # ever reads `done_tasks`, so revealing them client-side can't perturb
    # any of the open-side derivations.
    done_tasks = [_build_task(row, today=today) for row in reg.next_actions if not _is_open(row.status)]

    incoming = _resolve_incoming_override(tasks, tracking.wake)
    lane = _project_lane(tasks, incoming=incoming)
    due_column, due_date, due_text = _project_due(tasks, tracking.wake, today, incoming=incoming)

    # UI cue: mark whichever open task actually drove `lane` above, so the
    # Next Actions list can show which row sets the board lane. The wake
    # override (`incoming`) bypasses every task to reach its answer, so
    # nothing is marked in that case — matching `_project_lane`'s own
    # incoming branch, which never consults `_lane_driver` either.
    if not incoming:
        driver = _lane_driver(tasks)
        if driver is not None:
            tasks = [replace(t, lane_source=True) if t is driver else t for t in tasks]

    purpose_field = reg.frontmatter.get("purpose", _NOT_STATED)

    return ProjectView(
        id=tracking.id.value or reg.project_id,
        title=tracking.title.value,
        context=tracking.context.value,
        lane=lane,
        due_column=due_column,
        due_date=due_date,
        due_text=due_text,
        open_count=len(tasks),
        tasks=tasks,
        done_tasks=done_tasks,
        next_action=tasks[0] if tasks else None,
        mtime=reg.mtime,
        multi_stream=reg.multi_stream,
        purpose=purpose_field.value if purpose_field.stated else None,
        definition_of_done=list(reg.definition_of_done),
        decision_log=list(reg.decision_log),
        events=[EventView(date=e.date.value, event=e.event.value, type=e.type.value, link=e.link.value) for e in reg.events],
        documents=[
            DocumentView(file=d.file.value, description=d.description.value, status=d.status.value, on_close=d.on_close.value)
            for d in reg.documents
        ],
        people=[PersonView(person=p.person.value, id=p.id.value, role=p.role.value, link=p.link.value) for p in reg.people],
    )


# ---------------------------------------------------------------------------
# The board — one call, every derived fact (FR-12)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Board:
    projects: list[ProjectView]
    lane_counts: dict[str, int]
    column_counts: dict[str, int]


def build_board(projects: Sequence[ProjectSourceLike], *, today: date) -> Board:
    """FR-14: `today` is a required argument, never the clock. The one
    function every face (`server`, and whatever else reads this module's
    output) calls to get a whole board from `stores`-shaped records."""
    views = [
        build_project(source, today=today)
        for source in projects
        if not _is_archived(source.tracking.status)
    ]
    return Board(
        projects=views,
        lane_counts=dict(Counter(view.lane.value for view in views)),
        column_counts=dict(Counter(view.due_column.value for view in views)),
    )
