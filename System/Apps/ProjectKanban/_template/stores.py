"""Turn the four source files into plain records, interpreting nothing.

The read layer (the stores spec, ProjectKanban). Every field comes back as a
`Field` — its value plus whether the source file actually stated it (FR-3) —
so `model` can tell a fact from a gap without re-reading anything. This
module never derives (AD-2): no lane, no column, no date meaning.
It only parses.

Sources read: `Memory/Medium-Term/Projects/_tracking.yaml`, each project's
`registry.md` (frontmatter, Next Actions, Events, Documents, People), and a
listing of `System/Plans/New/`. Never `_links.yaml`, a calendar snapshot, or a
completion log — those are ProjectDashboard's own concerns, not this app's
(AD-1's salvage keeps the parsing engine, not the Dashboard's reader set).

One-way dependency (FR-9): this module is never allowed to import `writes`
or `model`, so it cannot be enforced here — it is enforced by never writing
that import in the first place.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Generic, TypeVar

T = TypeVar("T")
RowT = TypeVar("RowT")


class StoresError(Exception):
    """A source file could not be read or parsed at all.

    Raised for the top-level manifests (`_tracking.yaml`) that have no
    fallback, and for a registry whose frontmatter itself is unreadable.
    A single project's `registry.md` failing this way is NOT surfaced by
    raising past the caller — `load_projects` catches it and turns it into
    a `SkippedItem` (FR-4, AC-5): one bad project must never take the
    others down.
    """


# ---------------------------------------------------------------------------
# Field — every value paired with whether the source stated it (FR-3)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Field(Generic[T]):
    """A value plus whether the source stated it.

    A blank cell and an absent column both come back `Field(None, False)` —
    indistinguishable from each other, but never confusable with a real
    value (FR-3, AC-3). Downstream, `model` marks anything derived from a
    `stated=False` field as guessed (documentation.spec.md D-3).
    """

    value: T | None
    stated: bool


# Cells written as an em dash (or bare hyphen) are this system's own "nothing
# here" glyph, used throughout the registries. A cell reading
# "—" is not a stated value called "—"; it is the file's way of stating
# nothing, same as leaving the cell blank (AC-3).
_BLANK_CELL_TEXT = ("", "—", "-")


def _field(raw: str | None) -> Field[str]:
    if raw is None:
        return Field(None, False)
    text = raw.strip()
    if text in _BLANK_CELL_TEXT:
        return Field(None, False)
    return Field(text, True)


def _field_any(raw: Any) -> Field[Any]:
    if raw is None:
        return Field(None, False)
    if isinstance(raw, str):
        return _field(raw)
    return Field(raw, True)  # a stated non-string (list, bool, int-as-str, ...) is never "blank"


# ---------------------------------------------------------------------------
# YAML — hand-rolled stdlib subset only (PY-1, FR-1). No PyYAML: not even as
# an optional accelerator, so the module's behaviour never depends on what
# happens to be installed.
# ---------------------------------------------------------------------------
#
# Handles: block mappings and sequences by indentation, compact sequence
# items ("- key: value" starting a nested mapping), quoted and bare scalars,
# inline flow lists ("[a, b]") and flow mappings ("{a: b}"), and full-line
# "#" comments. Deliberately does not handle block scalars ("|", ">"),
# anchors/aliases, or multi-document streams — none of `_tracking.yaml` or a
# registry's frontmatter use them (checked against all 42 live projects).
# Because nothing here ever converts a bare scalar to int/float/date, FR-7's
# "dates pass through as raw strings" holds for every value, not just dates.

_MAPPING_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_ ]*:(\s|$)")


def _fb_prepare_lines(text: str) -> list[tuple[int, str]]:
    lines: list[tuple[int, str]] = []
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        lines.append((indent, raw_line[indent:].rstrip()))
    return lines


def yaml_load(text: str) -> Any:
    lines = _fb_prepare_lines(text)
    if not lines:
        return None
    value, _consumed = _fb_parse_block(lines, 0, lines[0][0])
    return value


def _fb_parse_block(lines: list[tuple[int, str]], i: int, indent: int) -> tuple[Any, int]:
    if i >= len(lines):
        return None, i
    _, content = lines[i]
    if content == "-" or content.startswith("- "):
        return _fb_parse_sequence(lines, i, indent)
    return _fb_parse_mapping(lines, i, indent)


def _fb_parse_mapping(lines: list[tuple[int, str]], i: int, indent: int) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    while i < len(lines):
        cur_indent, content = lines[i]
        if cur_indent != indent or content.startswith("- "):
            break
        key_part, sep, rest = content.partition(":")
        if not sep:
            raise StoresError(f"malformed YAML mapping line: {content!r}")
        key = _fb_unquote(key_part.strip())
        rest = rest.strip()
        i += 1
        if rest == "":
            if i < len(lines) and lines[i][0] > indent:
                value, i = _fb_parse_block(lines, i, lines[i][0])
            else:
                value = None
        else:
            value = _fb_parse_scalar(rest)
        result[key] = value
    return result, i


def _fb_parse_sequence(lines: list[tuple[int, str]], i: int, indent: int) -> tuple[list[Any], int]:
    result: list[Any] = []
    while i < len(lines):
        cur_indent, content = lines[i]
        if cur_indent != indent or not (content == "-" or content.startswith("- ")):
            break
        after_dash = content[1:].strip()
        if after_dash == "":
            i += 1
            if i < len(lines) and lines[i][0] > indent:
                value, i = _fb_parse_block(lines, i, lines[i][0])
            else:
                value = None
        elif _MAPPING_KEY_RE.match(after_dash):
            # "- id: PP-01" starts a mapping whose later keys are the
            # following, more deeply indented lines. Splice a synthetic
            # first line at that inner indent so `_fb_parse_mapping` reads
            # it as one item; `consumed` still lines up 1:1 with `lines`
            # because the splice replaces exactly line `i`.
            nested_indent = indent + 2
            synthetic = [(nested_indent, after_dash)]
            j = i + 1
            while j < len(lines) and lines[j][0] > indent:
                synthetic.append(lines[j])
                j += 1
            value, consumed = _fb_parse_mapping(synthetic, 0, nested_indent)
            i += consumed
        else:
            value = _fb_parse_scalar(after_dash)
            i += 1
        result.append(value)
    return result, i


def _fb_parse_scalar(raw: str) -> Any:
    s = raw.strip()
    if s in ("", "null", "~"):
        return None
    if s == "true":
        return True
    if s == "false":
        return False
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        return _fb_unquote(s)
    if s.startswith("[") and s.endswith("]"):
        return [_fb_parse_scalar(part) for part in _fb_split_top_level(s[1:-1], ",")]
    if s.startswith("{") and s.endswith("}"):
        return _fb_parse_flow_mapping(s[1:-1])
    return s


def _fb_parse_flow_mapping(inner: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for part in _fb_split_top_level(inner, ","):
        part = part.strip()
        if not part:
            continue
        key_part, sep, rest = part.partition(":")
        if not sep:
            raise StoresError(f"malformed flow mapping entry: {part!r}")
        result[_fb_unquote(key_part.strip())] = _fb_parse_scalar(rest.strip())
    return result


def _fb_split_top_level(s: str, sep: str) -> list[str]:
    if s.strip() == "":
        return []
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    in_quote = ""
    for ch in s:
        if in_quote:
            buf.append(ch)
            if ch == in_quote:
                in_quote = ""
            continue
        if ch in "\"'":
            in_quote = ch
            buf.append(ch)
        elif ch in "[{":
            depth += 1
            buf.append(ch)
        elif ch in "]}":
            depth -= 1
            buf.append(ch)
        elif ch == sep and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    parts.append("".join(buf))
    return parts


def _fb_unquote(s: str) -> str:
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        inner = s[1:-1]
        if s[0] == '"':
            inner = inner.replace('\\"', '"').replace("\\\\", "\\")
        return inner
    return s


# ---------------------------------------------------------------------------
# Markdown table plumbing shared by every registry table.
# Lines carry their absolute 1-indexed file line number throughout, so a
# malformed row can be reported at the exact line it lives on (FR-4).
# ---------------------------------------------------------------------------

_Line = tuple[int, str]

_HEADING_RE = re.compile(r"^#(?!#)\s+(.*)$")


def _find_section(body: list[_Line], name_fragment: str) -> list[_Line]:
    """Lines strictly between a level-1 heading containing `name_fragment`
    and the next level-1 heading (or end of file). `[]` if no such heading
    exists. Stopping at the next single-`#` heading is what keeps a search
    for "events" from reading into a later section that happens to share a
    word, and lets sub-headings (`##`) freely group multiple table streams
    (registry_multi_stream.md's two Next Actions streams; a People section
    split into sub-groups) under the one section without ending it early."""
    start = None
    for i, (_lineno, line) in enumerate(body):
        m = _HEADING_RE.match(line)
        if m and name_fragment.lower() in m.group(1).lower():
            start = i + 1
            break
    if start is None:
        return []
    end = len(body)
    for i in range(start, len(body)):
        if _HEADING_RE.match(body[i][1]):
            end = i
            break
    return body[start:end]


def _find_table_blocks(lines: list[_Line]) -> list[list[_Line]]:
    """Every run of consecutive `|`-led lines, in order. A multi-stream
    section has more than one such block under one heading."""
    blocks: list[list[_Line]] = []
    current: list[_Line] = []
    for lineno, text in lines:
        if text.strip().startswith("|"):
            current.append((lineno, text))
        else:
            if current:
                blocks.append(current)
                current = []
    if current:
        blocks.append(current)
    return blocks


def _split_row(line: str) -> list[str]:
    """Split a table row on TOP-LEVEL pipes only (FR-2). A `|` inside a
    backtick span is cell text, not a boundary — CH-15-biblical-commentary-
    app's Action column carries a backticked, pipe-separated list (AC-2)
    that a naive split would shred, shifting every later column."""
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    cells: list[str] = []
    buf: list[str] = []
    in_tick = False
    for ch in s:
        if ch == "`":
            in_tick = not in_tick
            buf.append(ch)
        elif ch == "|" and not in_tick:
            cells.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    cells.append("".join(buf))
    return [c.strip() for c in cells]


def _normalize_header_cell(cell: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", cell).lower()


def _resolve_columns(header_cells: list[str], aliases: dict[str, str], *, has_index_column: bool) -> list[str | None]:
    """Map each header cell to a canonical field name, by NAME not position
    (the spec's own risk: a registry that adds a column must not shift Owner
    or Due into the wrong cell). An unrecognised header resolves to `None`
    and its column's cells are dropped, not misfiled under a neighbour."""
    columns: list[str | None] = []
    for cell in header_cells:
        if has_index_column and cell.strip() == "#":
            columns.append("index")
            continue
        columns.append(aliases.get(_normalize_header_cell(cell)))
    return columns


@dataclass(frozen=True)
class SkippedItem:
    """FR-4: a malformed row, or a whole registry that could not be read,
    reported rather than dropped or raised. `line` is `None` for a
    whole-file failure, where no single line is at fault."""

    file: Path
    line: int | None
    reason: str
    project_id: str | None = None


def _parse_section_rows(
    body: list[_Line],
    heading_fragment: str,
    aliases: dict[str, str],
    fields: tuple[str, ...],
    row_type: Callable[..., RowT],
    file_path: Path,
    project_id: str,
    skipped: list[SkippedItem],
    *,
    has_index_column: bool = False,
) -> list[RowT]:
    """Shared engine behind Next Actions, Events, Documents and People: find
    the section, resolve each table block's header by name, and turn every
    structurally sound row into `row_type`. A row whose cell count does not
    match its own header is reported into `skipped` and skipped — never
    parsed positionally, which is how a shifted row would otherwise return a
    plausible but wrong value in every later column."""
    section = _find_section(body, heading_fragment)
    rows: list[RowT] = []
    for block in _find_table_blocks(section):
        if len(block) < 2:  # a header with no separator/data is not a table
            continue
        header_lineno, header_text = block[0]
        data_lines = block[2:]  # block[1] is the "---|---" separator
        columns = _resolve_columns(_split_row(header_text), aliases, has_index_column=has_index_column)
        for lineno, line in data_lines:
            cells = _split_row(line)
            if len(cells) != len(columns):
                skipped.append(
                    SkippedItem(
                        file=file_path,
                        line=lineno,
                        reason=(
                            f"row has {len(cells)} cell(s), header at line {header_lineno} "
                            f"has {len(columns)}"
                        ),
                        project_id=project_id,
                    )
                )
                continue
            by_key = {key: cell for key, cell in zip(columns, cells) if key is not None}
            rows.append(row_type(**{name: _field(by_key.get(name)) for name in fields}))
    return rows


_BULLET_RE = re.compile(r"^\s*-\s+(.*)$")


def _parse_bullet_section(body: list[_Line], heading_fragment: str) -> list[str]:
    """Every top-level bullet line under a level-1 heading (Definition of
    Done, Decision Log), verbatim text after the leading '- '. Reuses
    `_find_section`'s own heading-to-next-heading boundary, so a heading
    further down the file never bleeds into this one. Blank lines and any
    non-bullet line (a sub-note, an HTML comment) are simply not bullets and
    are skipped rather than raising — these sections have no table shape to
    validate against (FR-4's row-count guard does not apply to prose)."""
    lines = _find_section(body, heading_fragment)
    items: list[str] = []
    for _lineno, text in lines:
        match = _BULLET_RE.match(text)
        if not match:
            continue
        item = match.group(1).strip()
        if item:
            items.append(item)
    return items


# ---------------------------------------------------------------------------
# Next Actions
# ---------------------------------------------------------------------------

_NEXT_ACTION_FIELDS = ("index", "action", "owner", "kind", "status", "state", "due", "link")

_NEXT_ACTION_ALIASES = {
    "action": "action",
    "owner": "owner",
    "kind": "kind",
    "type": "kind",  # older column name for the same cell (FR-8); CH-16/CH-17 still carry it
    "status": "status",
    "state": "state",
    "due": "due",
    "link": "link",
}


@dataclass(frozen=True)
class NextActionRow:
    index: Field[str]
    action: Field[str]
    owner: Field[str]
    kind: Field[str]
    status: Field[str]
    state: Field[str]
    due: Field[str]
    link: Field[str]


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

_EVENT_FIELDS = ("date", "event", "type", "link")

_EVENT_ALIASES = {
    "date": "date",
    "event": "event",
    "type": "type",  # Milestone/Meeting/Deadline — a different namespace to Next Actions' Kind
    "link": "link",
}


@dataclass(frozen=True)
class EventRow:
    date: Field[str]
    event: Field[str]
    type: Field[str]
    link: Field[str]


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

_DOCUMENT_FIELDS = ("file", "description", "status", "on_close")

_DOCUMENT_ALIASES = {
    "file": "file",
    "whatitis": "description",
    "status": "status",
    "onclose": "on_close",
}


@dataclass(frozen=True)
class DocumentRow:
    file: Field[str]
    description: Field[str]
    status: Field[str]
    on_close: Field[str]


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------

_PEOPLE_FIELDS = ("person", "id", "role", "link")

_PEOPLE_ALIASES = {
    "person": "person",
    "personid": "person",  # "Person (ID)" folds the id into the same cell as the name
    "id": "id",
    "role": "role",
    "link": "link",
    "contact": "link",  # older column names for the same supplementary cell
    "notes": "link",
}


@dataclass(frozen=True)
class PeopleRow:
    person: Field[str]
    id: Field[str]
    role: Field[str]
    link: Field[str]


# ---------------------------------------------------------------------------
# registry.md — frontmatter + the four tables (FR-2, FR-5)
# ---------------------------------------------------------------------------


def _split_frontmatter(text: str) -> tuple[str, list[_Line]]:
    """Returns the frontmatter YAML text, and the body as (lineno, text)
    pairs numbered from the whole file — so a malformed row further down
    reports the line Luke would actually see if he opened the file."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise StoresError("registry.md missing opening frontmatter fence")
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            frontmatter_text = "\n".join(lines[1:idx])
            body = list(enumerate(lines[idx + 1 :], start=idx + 2))
            return frontmatter_text, body
    raise StoresError("registry.md missing closing frontmatter fence")


@dataclass(frozen=True)
class RegistryRecord:
    project_id: str
    path: Path
    mtime: float  # a filesystem fact observed just now (FR-5) — never a Field, never something a
    # source file could itself state or omit; `writes` needs it as its concurrency gate.
    frontmatter: dict[str, Field[Any]]
    next_actions: list[NextActionRow]
    events: list[EventRow]
    documents: list[DocumentRow]
    people: list[PeopleRow]
    definition_of_done: list[str]  # 🎯 Definition of Done — top-level bullets, verbatim (outline-print FR-2)
    decision_log: list[str]  # 🧾 Decision Log — top-level bullets, verbatim, file order (outline-print FR-2)
    skipped_rows: list[SkippedItem]  # malformed rows found while parsing THIS registry's tables


def read_registry(path: Path, project_id: str) -> RegistryRecord:
    text = path.read_text(encoding="utf-8")
    mtime = path.stat().st_mtime
    frontmatter_text, body = _split_frontmatter(text)
    raw_frontmatter = yaml_load(frontmatter_text) or {}
    if not isinstance(raw_frontmatter, dict):
        raise StoresError(f"{path}: frontmatter is not a mapping")
    frontmatter = {k: _field_any(v) for k, v in raw_frontmatter.items()}

    skipped_rows: list[SkippedItem] = []
    next_actions = _parse_section_rows(
        body, "next actions", _NEXT_ACTION_ALIASES, _NEXT_ACTION_FIELDS, NextActionRow,
        path, project_id, skipped_rows, has_index_column=True,
    )
    events = _parse_section_rows(
        body, "events", _EVENT_ALIASES, _EVENT_FIELDS, EventRow, path, project_id, skipped_rows,
    )
    documents = _parse_section_rows(
        body, "documents", _DOCUMENT_ALIASES, _DOCUMENT_FIELDS, DocumentRow, path, project_id, skipped_rows,
    )
    people = _parse_section_rows(
        body, "people", _PEOPLE_ALIASES, _PEOPLE_FIELDS, PeopleRow, path, project_id, skipped_rows,
    )
    definition_of_done = _parse_bullet_section(body, "definition of done")
    decision_log = _parse_bullet_section(body, "decision log")

    return RegistryRecord(
        project_id=project_id,
        path=path,
        mtime=mtime,
        frontmatter=frontmatter,
        next_actions=next_actions,
        events=events,
        documents=documents,
        people=people,
        definition_of_done=definition_of_done,
        decision_log=decision_log,
        skipped_rows=skipped_rows,
    )


# ---------------------------------------------------------------------------
# _tracking.yaml (FR-1) + per-project error isolation (FR-4, AC-5)
# ---------------------------------------------------------------------------

_TRACKING_FIELDS = (
    "id", "project", "title", "context", "status", "state",
    "waiting_on", "wake", "created", "updated", "path", "effort",
)


@dataclass(frozen=True)
class TrackingRow:
    id: Field[str]
    project: Field[str]
    title: Field[str]
    context: Field[str]
    status: Field[str]
    state: Field[str]
    waiting_on: Field[str]
    wake: Field[str]
    created: Field[str]
    updated: Field[str]
    path: Field[str]
    effort: Field[str]  # optional project-level fallback; no `importance` key is ever read


def read_tracking(path: Path) -> list[TrackingRow]:
    data = yaml_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        raise StoresError(f"{path}: expected a top-level 'projects' list")
    return [
        TrackingRow(**{name: _field_any(raw.get(name)) for name in _TRACKING_FIELDS})
        for raw in data["projects"]
    ]


@dataclass(frozen=True)
class ProjectSource:
    tracking: TrackingRow
    registry: RegistryRecord


def load_projects(
    lukeatron_root: Path, tracking_rows: list[TrackingRow]
) -> tuple[list[ProjectSource], list[SkippedItem]]:
    projects: list[ProjectSource] = []
    skipped: list[SkippedItem] = []
    for row in tracking_rows:
        project_id = row.id.value or "<unknown>"
        rel_path = row.path.value
        if rel_path is None:
            skipped.append(SkippedItem(Path("<no path stated>"), None, "tracking row has no path", project_id))
            continue
        registry_path = lukeatron_root / rel_path
        try:
            registry = read_registry(registry_path, project_id)
        except (OSError, StoresError) as exc:
            skipped.append(SkippedItem(registry_path, None, str(exc), project_id))
            continue
        projects.append(ProjectSource(tracking=row, registry=registry))
    return projects, skipped


# ---------------------------------------------------------------------------
# wishlist #5 — a stat-only change check, deliberately never re-running
# read_registry's own frontmatter/table parse (that's the expensive half of
# a full load_board_sources pass). _tracking.yaml itself is small enough
# (~40 rows, one YAML parse) that resolving each project's on-disk path
# from it stays cheap; server.py polls this on an interval no `/api/
# board.json` GET could sustain at the same frequency.
# ---------------------------------------------------------------------------


def latest_mtime_for_tracking(lukeatron_root: Path, tracking_rows: list[TrackingRow]) -> float:
    """The stat-only half, split out from `latest_registry_mtime` the same
    way `load_projects` is split from `read_tracking` above — so a test can
    exercise this against fixture tracking rows without needing the real
    `Memory/Medium-Term/Projects/_tracking.yaml` layout."""
    mtimes: list[float] = []
    for row in tracking_rows:
        rel_path = row.path.value
        if rel_path is None:
            continue
        registry_path = lukeatron_root / rel_path
        for candidate in (registry_path, registry_path.parent / "notes.md"):
            try:
                mtimes.append(candidate.stat().st_mtime)
            except OSError:
                continue  # a missing/unreadable file simply contributes no timestamp
    return max(mtimes) if mtimes else 0.0


def latest_registry_mtime(lukeatron_root: Path) -> float:
    tracking_path = lukeatron_root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml"
    try:
        tracking_mtime = tracking_path.stat().st_mtime
        tracking_rows = read_tracking(tracking_path)
    except OSError:
        return 0.0
    except StoresError:
        return tracking_mtime
    return max(tracking_mtime, latest_mtime_for_tracking(lukeatron_root, tracking_rows))


# ---------------------------------------------------------------------------
# System/Plans/New/ — a listing only, never opened (FR-5)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PlanFile:
    name: str
    path: Path
    mtime: float


def read_plans_new(path: Path) -> list[PlanFile]:
    if not path.exists():
        return []
    return sorted(
        (PlanFile(name=item.name, path=item, mtime=item.stat().st_mtime) for item in path.iterdir() if item.is_file()),
        key=lambda entry: entry.name,
    )


# ---------------------------------------------------------------------------
# Orchestrator — one call, every source
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BoardSources:
    projects: list[ProjectSource]
    skipped: list[SkippedItem]
    plans_new: list[PlanFile]


def load_board_sources(lukeatron_root: Path) -> BoardSources:
    medium_term = lukeatron_root / "Memory" / "Medium-Term"
    tracking_rows = read_tracking(medium_term / "Projects" / "_tracking.yaml")
    projects, skipped = load_projects(lukeatron_root, tracking_rows)
    return BoardSources(
        projects=projects,
        skipped=skipped,
        plans_new=read_plans_new(lukeatron_root / "System" / "Plans" / "New"),
    )
