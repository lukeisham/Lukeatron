"""Turn the five source files into plain records, interpreting nothing.

The read layer (the stores spec). Every field comes back as a `Field` —
its value plus whether the source file actually stated it (FR-3) — so `model`
can tell a fact from a gap without re-reading anything. This module never
derives (AD-2): no "overdue", no kind semantics, no ordering. It only parses.

Sources read: `Projects/_tracking.yaml`, each project's `registry.md`
(frontmatter + every Next Actions stream), `Projects/_links.yaml`,
`MinorTasks/queue.md`, the calendar snapshot, and the completion log.
`LukeatronWiki/` is never read (out of scope, PRD *Boundaries*).
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Generic, TypeVar

try:
    import yaml as _pyyaml
except ImportError:  # FR-6: PyYAML is an accelerator, never a requirement.
    _pyyaml = None

import datetime

T = TypeVar("T")


class StoresError(Exception):
    """A source file could not be read or parsed at all.

    Raised for the top-level manifests (`_tracking.yaml`) that have no
    fallback. A single project's `registry.md` failing is NOT this — that
    path is caught by `load_projects` and turned into a `SkipReport`
    (FR-7, AC-3): one bad project must never take the other 39 down.
    """


# ---------------------------------------------------------------------------
# Field — every value paired with whether the file stated it (FR-3, AD-1)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Field(Generic[T]):
    """A value plus whether the source stated it.

    A blank cell and an absent column both come back `Field(None, False)` —
    indistinguishable from each other, but never confusable with a real
    value (FR-3). Downstream, `model` marks anything derived from a
    `stated=False` field as guessed.
    """

    value: T | None
    stated: bool


# Cells written as an em dash (or bare hyphen) are this system's own "nothing
# here" glyph, used throughout the registries and the queue. A cell reading
# "—" is not a stated value called "—"; it is the file's way of stating
# nothing, same as leaving the cell blank.
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
    return Field(raw, True)


# ---------------------------------------------------------------------------
# YAML — PyYAML when present, otherwise a stdlib fallback (FR-6)
# ---------------------------------------------------------------------------


def _normalize_dates(value: Any) -> Any:
    """PyYAML turns unquoted dates into date/datetime objects; the fallback
    parser never does. Collapsing both to ISO strings keeps every caller's
    behaviour identical regardless of which engine read the file."""
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalize_dates(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize_dates(v) for v in value]
    return value


def yaml_load(text: str) -> Any:
    if _pyyaml is not None:
        return _normalize_dates(_pyyaml.safe_load(text))
    return _fb_yaml_load(text)


# -- stdlib fallback: a subset parser for exactly what these files use ------
#
# Handles: block mappings and sequences by indentation, compact sequence
# items ("- key: value" starting a nested mapping), quoted and bare scalars,
# inline flow lists ("[a, b]") and flow mappings ("{a: b}"), and full-line
# "#" comments. Deliberately does not handle block scalars ("|", ">"),
# anchors/aliases, or multi-document streams — none of `_tracking.yaml`,
# `_links.yaml`, or a registry's frontmatter use them (FR-6's risk mitigation:
# raise on anything outside the subset, rather than mis-parse it).

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


def _fb_yaml_load(text: str) -> Any:
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
# Markdown table plumbing shared by the Next Actions and queue readers
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r"^#(?!#)\s+(.*)$")


def _find_section(body: list[str], name_fragment: str) -> list[str]:
    """Lines strictly between a level-1 heading containing `name_fragment`
    and the next level-1 heading (or end of file). `[]` if no such heading
    exists. Stopping at the next single-`#` heading is what keeps this from
    ever reading into the Events table, which carries its own unrelated
    `Type` column (Milestone/Meeting) — never to be read as Kind."""
    start = None
    for idx, line in enumerate(body):
        m = _HEADING_RE.match(line)
        if m and name_fragment.lower() in m.group(1).lower():
            start = idx + 1
            break
    if start is None:
        return []
    end = len(body)
    for idx in range(start, len(body)):
        if _HEADING_RE.match(body[idx]):
            end = idx
            break
    return body[start:end]


def _find_table_blocks(lines: Iterable[str]) -> list[list[str]]:
    """Every run of consecutive `|`-led lines, in order. A multi-stream
    registry (AC-1) has more than one such block under one heading."""
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in lines:
        if line.strip().startswith("|"):
            current.append(line)
        else:
            if current:
                blocks.append(current)
                current = []
    if current:
        blocks.append(current)
    return blocks


def _split_row(line: str) -> list[str]:
    """Split a table row on TOP-LEVEL pipes only (FR-2a). A `|` inside a
    backtick span is cell text, not a boundary — CH-15-biblical-commentary-
    app's Action column carries a backticked, pipe-separated list (AC-2c)
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


# ---------------------------------------------------------------------------
# Next Actions — FR-2, FR-2a, FR-4
# ---------------------------------------------------------------------------

_NEXT_ACTION_FIELDS = (
    "index", "action", "owner", "kind", "effort", "tokens", "status", "state", "due", "link",
)

_NEXT_ACTION_HEADER_ALIASES = {
    "action": "action",
    "owner": "owner",
    "kind": "kind",
    "type": "kind",  # legacy pre-migration column name for the same cell (FR-2)
    "effort": "effort",
    "tokens": "tokens",
    "status": "status",
    "state": "state",
    "due": "due",
    "link": "link",
}


def _normalize_next_action_header(cell: str) -> str | None:
    if cell.strip() == "#":
        return "index"
    key = re.sub(r"[^A-Za-z0-9]", "", cell).lower()
    return _NEXT_ACTION_HEADER_ALIASES.get(key)


@dataclass(frozen=True)
class NextActionRow:
    index: Field[str]
    action: Field[str]
    owner: Field[str]
    kind: Field[str]
    effort: Field[str]
    tokens: Field[str]
    status: Field[str]
    state: Field[str]
    due: Field[str]
    link: Field[str]


@dataclass(frozen=True)
class MalformedRow:
    """A Next Actions row whose top-level cell count does not match its
    header. Skipped and reported, never parsed positionally (FR-2a) — a
    positional parse of a shifted row returns a plausible but wrong Kind,
    Status and Due rather than a visible error."""

    project_id: str
    raw_line: str
    expected_cells: int
    got_cells: int


def _parse_next_action_table(
    header_line: str, data_lines: list[str], project_id: str, malformed: list[MalformedRow]
) -> list[NextActionRow]:
    columns = [_normalize_next_action_header(c) for c in _split_row(header_line)]
    rows: list[NextActionRow] = []
    for line in data_lines:
        cells = _split_row(line)
        if len(cells) != len(columns):
            malformed.append(MalformedRow(project_id, line, len(columns), len(cells)))
            continue
        by_key = {key: cell for key, cell in zip(columns, cells) if key is not None}
        rows.append(NextActionRow(**{name: _field(by_key.get(name)) for name in _NEXT_ACTION_FIELDS}))
    return rows


def _parse_next_actions_section(
    body: list[str], project_id: str, malformed: list[MalformedRow]
) -> list[NextActionRow]:
    section = _find_section(body, "next actions")
    rows: list[NextActionRow] = []
    for block in _find_table_blocks(section):
        if len(block) < 2:
            continue
        header_line, _separator, *data_lines = block
        rows.extend(_parse_next_action_table(header_line, data_lines, project_id, malformed))
    return rows


# ---------------------------------------------------------------------------
# registry.md — frontmatter (incl. footings) + Next Actions (FR-2)
# ---------------------------------------------------------------------------


def _split_frontmatter(text: str) -> tuple[str, list[str]]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise StoresError("registry.md missing opening frontmatter fence")
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "\n".join(lines[1:idx]), lines[idx + 1 :]
    raise StoresError("registry.md missing closing frontmatter fence")


@dataclass(frozen=True)
class RegistryRecord:
    project_id: str
    path: Path
    mtime: float  # unblock.spec.md AC-4/AC-5/AC-9's write gate: the value `writes.py`
    # checks a caller's `mtime` against (FR-2). Stated here as a plain float, never a
    # `Field` — this is a filesystem fact `stores` observed just now, not something a
    # source file could state or omit.
    frontmatter: dict[str, Field[Any]]
    footings: Field[list[str]]
    next_actions: list[NextActionRow]
    malformed_rows: list[MalformedRow]


def read_registry(path: Path, project_id: str) -> RegistryRecord:
    text = path.read_text(encoding="utf-8")
    mtime = path.stat().st_mtime
    frontmatter_text, body = _split_frontmatter(text)
    raw_frontmatter = yaml_load(frontmatter_text) or {}
    if not isinstance(raw_frontmatter, dict):
        raise StoresError(f"{path}: frontmatter is not a mapping")

    footings_raw = raw_frontmatter.get("footings")
    footings: Field[list[str]] = Field(footings_raw, True) if footings_raw else Field(None, False)
    frontmatter = {k: _field_any(v) for k, v in raw_frontmatter.items() if k != "footings"}

    malformed: list[MalformedRow] = []
    next_actions = _parse_next_actions_section(body, project_id, malformed)

    return RegistryRecord(
        project_id=project_id,
        path=path,
        mtime=mtime,
        frontmatter=frontmatter,
        footings=footings,
        next_actions=next_actions,
        malformed_rows=malformed,
    )


# ---------------------------------------------------------------------------
# _tracking.yaml (FR-1) + per-project error isolation (FR-7, AC-3)
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
    effort: Field[str]  # FR-1: optional project-level fallback. No `importance` key is ever read.


def read_tracking(path: Path) -> list[TrackingRow]:
    data = yaml_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
        raise StoresError(f"{path}: expected a top-level 'projects' list")
    return [
        TrackingRow(**{name: _field_any(raw.get(name)) for name in _TRACKING_FIELDS})
        for raw in data["projects"]
    ]


@dataclass(frozen=True)
class SkipReport:
    """FR-7: one unreadable/malformed project, and why. The board renders
    without it and says so — this is that "says so"."""

    project_id: str
    path: Path
    reason: str


@dataclass(frozen=True)
class ProjectSource:
    tracking: TrackingRow
    registry: RegistryRecord


def load_projects(
    lukeatron_root: Path, tracking_rows: list[TrackingRow]
) -> tuple[list[ProjectSource], list[SkipReport]]:
    projects: list[ProjectSource] = []
    skipped: list[SkipReport] = []
    for row in tracking_rows:
        project_id = row.id.value or "<unknown>"
        rel_path = row.path.value
        if rel_path is None:
            skipped.append(SkipReport(project_id, Path("<no path stated>"), "tracking row has no path"))
            continue
        registry_path = lukeatron_root / rel_path
        try:
            registry = read_registry(registry_path, project_id)
        except (OSError, StoresError) as exc:
            skipped.append(SkipReport(project_id, registry_path, str(exc)))
            continue
        projects.append(ProjectSource(tracking=row, registry=registry))
    return projects, skipped


# ---------------------------------------------------------------------------
# MinorTasks/queue.md — open rows only (FR-5)
# ---------------------------------------------------------------------------

_QUEUE_FIELDS = ("index", "task", "source", "impact", "status", "state", "wake_due", "notes")

_QUEUE_HEADER_ALIASES = {
    "task": "task",
    "source": "source",
    "impact": "impact",
    "status": "status",
    "state": "state",
    "wakedue": "wake_due",
    "notes": "notes",
}

_OPEN_STATUS_GLYPHS = ("☐", "◐")


def _normalize_queue_header(cell: str) -> str | None:
    if cell.strip() == "#":
        return "index"
    key = re.sub(r"[^A-Za-z0-9]", "", cell).lower()
    return _QUEUE_HEADER_ALIASES.get(key)


@dataclass(frozen=True)
class QueueRow:
    index: Field[str]
    task: Field[str]
    source: Field[str]
    impact: Field[str]
    status: Field[str]
    state: Field[str]
    wake_due: Field[str]
    notes: Field[str]


def read_queue(path: Path) -> list[QueueRow]:
    if not path.exists():
        return []
    rows: list[QueueRow] = []
    with path.open(encoding="utf-8") as fh:  # PY-9: streamed, never a whole-file .read()
        for block in _find_table_blocks(fh):
            if len(block) < 2:
                continue
            header_line, _separator, *data_lines = block
            columns = [_normalize_queue_header(c) for c in _split_row(header_line)]
            if "task" not in columns:
                continue  # some other pipe-table (e.g. a comment's example row), not the queue
            for line in data_lines:
                cells = _split_row(line)
                if len(cells) != len(columns):
                    continue  # malformed row: skipped, never parsed positionally (FR-2a's own rule)
                by_key = {key: cell for key, cell in zip(columns, cells) if key is not None}
                if not any(glyph in by_key.get("status", "") for glyph in _OPEN_STATUS_GLYPHS):
                    continue  # FR-5: open rows (☐ / ◐) only
                rows.append(QueueRow(**{name: _field(by_key.get(name)) for name in _QUEUE_FIELDS}))
    return rows


# ---------------------------------------------------------------------------
# _links.yaml (FR-5)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LinkMember:
    project: Field[str]
    action: Field[str]
    text: Field[str]


@dataclass(frozen=True)
class LinkRecord:
    key: Field[str]
    canonical_status: Field[str]
    canonical_state: Field[str]
    updated: Field[str]
    members: list[LinkMember]


def read_links(path: Path) -> list[LinkRecord]:
    if not path.exists():
        return []
    data = yaml_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("links"), list):
        return []
    records: list[LinkRecord] = []
    for raw in data["links"]:
        canonical = raw.get("canonical") or {}
        members = [
            LinkMember(
                project=_field_any(m.get("project")),
                action=_field_any(m.get("action")),
                text=_field_any(m.get("text")),
            )
            for m in (raw.get("members") or [])
        ]
        records.append(
            LinkRecord(
                key=_field_any(raw.get("key")),
                canonical_status=_field_any(canonical.get("status")),
                canonical_state=_field_any(canonical.get("state")),
                updated=_field_any(raw.get("updated")),
                members=members,
            )
        )
    return records


# ---------------------------------------------------------------------------
# Calendar snapshot (FR-5, OQ-1: default path + shape)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CalendarEntry:
    date: Field[str]
    title: Field[str]
    project_id: Field[str]
    kind: Field[str]


def read_calendar_snapshot(path: Path) -> list[CalendarEntry]:
    if not path.exists():
        return []
    data = yaml_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return []
    entries: list[CalendarEntry] = []
    for raw in data:
        if not isinstance(raw, dict):
            continue
        entries.append(
            CalendarEntry(
                date=_field_any(raw.get("date")),
                title=_field_any(raw.get("title")),
                project_id=_field_any(raw.get("project_id")),
                kind=_field_any(raw.get("kind")),
            )
        )
    return entries


# ---------------------------------------------------------------------------
# Completion log (FR-4a) — missing or empty is normal, not an error
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CompletionEntry:
    date: str
    project_id: str
    action_id: str
    action_text: str


def read_completion_log(path: Path) -> list[CompletionEntry]:
    """FR-4a: it will be missing on day one by definition, and the capacity
    matrix degrades on a `null` (an empty list here) rather than failing.

    Line format assumed (writes.spec.md OQ-2's own default, since nothing
    has been written yet to read back): one pipe-delimited line per
    completion — `date | project_id | action_id | action text`. If `writes`
    lands a different format, this reader's format must move to match it —
    flagged in the build report as the one place this module guesses at a
    sibling module's shape rather than reading a decided one.
    """
    if not path.exists():
        return []
    entries: list[CompletionEntry] = []
    with path.open(encoding="utf-8") as fh:  # PY-9: this log only ever grows, never streamed before
        for line in fh:
            if not line.strip():
                continue
            parts = [p.strip() for p in line.split("|", 3)]
            if len(parts) != 4:
                continue
            date, project_id, action_id, action_text = parts
            entries.append(CompletionEntry(date, project_id, action_id, action_text))
    return entries


# ---------------------------------------------------------------------------
# Orchestrator — one call, every source
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BoardSources:
    projects: list[ProjectSource]
    skipped: list[SkipReport]
    queue: list[QueueRow]
    links: list[LinkRecord]
    calendar: list[CalendarEntry]
    completions: list[CompletionEntry]


def load_board_sources(
    lukeatron_root: Path,
    *,
    calendar_snapshot_path: Path | None = None,
    completion_log_path: Path | None = None,
) -> BoardSources:
    medium_term = lukeatron_root / "Memory" / "Medium-Term"
    tracking_rows = read_tracking(medium_term / "Projects" / "_tracking.yaml")
    projects, skipped = load_projects(lukeatron_root, tracking_rows)
    return BoardSources(
        projects=projects,
        skipped=skipped,
        queue=read_queue(medium_term / "MinorTasks" / "queue.md"),
        links=read_links(medium_term / "Projects" / "_links.yaml"),
        calendar=read_calendar_snapshot(calendar_snapshot_path or (medium_term / "calendar-snapshot.yaml")),
        completions=read_completion_log(completion_log_path or (medium_term / "completions.log")),
    )
