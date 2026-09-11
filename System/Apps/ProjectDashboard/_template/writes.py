"""The ONLY module that mutates anything (the writes spec).

Narrow writes only: one Next Actions cell, one hand-over (a cell plus a
recorded recipient), one appended scrap, one appended request row — never a
whole-file rewrite (FR-1). Every write is fenced to `Memory/Medium-Term/`
on the resolved path (FR-3, AD-2) and guarded by the caller's mtime of the
file it is editing (FR-2, AD-1): a stale write raises `StaleMtimeError`
before anything is touched.

Depends on `stores` (writes.spec.md §4 "Required first") for two things
only: locating the current cell (via its own trusted parser, so this
module never re-implements FR-2a's backtick-aware pipe split) and
re-parse-verifying an edit before it is committed (writes.spec.md's own
Risks-table mitigation). `stores` never imports this module back — the
documentation spec's one-way rule.

`model` and `monitor` are never imported here. `server.py` is the only
caller (documentation spec's cross-boundary table); its own module
docstring names the exact call shapes this file implements.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Callable

import stores

# ---------------------------------------------------------------------------
# Errors — StaleMtimeError and FenceError are the two server.py imports by
# name (see its module docstring); the rest are this module's own detail
# and reach the caller as a generic 500 today (API-6's blanket except in
# server.py) — flagged in the build report as a place the error registry
# could grow a dedicated code once B-4/B-5 are wired end to end.
# ---------------------------------------------------------------------------


class WritesError(Exception):
    """Base for every error this module raises."""


class FenceError(WritesError):
    """A path resolved outside Memory/Medium-Term/ (FR-3, AC-3)."""


class StaleMtimeError(WritesError):
    """The target file changed since the caller's mtime was read (FR-2, AC-2)."""


class ProjectNotFoundError(WritesError):
    """`project_id` has no row in `_tracking.yaml`, or that row has no path."""


class RowNotFoundError(WritesError):
    """No Next Actions row matched, more than one matched, or the requested
    column does not exist in that row's table."""


class TableCorruptionError(WritesError):
    """Re-parsing the rewritten file (before it is committed) did not
    confirm the intended edit — the write is abandoned, nothing is
    committed (writes.spec.md Risks table)."""


# ---------------------------------------------------------------------------
# Results — plain dataclasses; server.py's `_prepare_payload` already knows
# how to turn any dataclass into JSON (`dataclasses.asdict`).
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class EditResult:
    ok: bool
    project_id: str
    row: str
    column: str
    value: str
    mtime: float  # the file's new mtime, so the caller's next edit doesn't 409 needlessly
    completion_logged: bool


@dataclass(frozen=True)
class HandOverResult:
    ok: bool
    project_id: str
    row: str
    recipient: str
    mtime: float


@dataclass(frozen=True)
class ScrapResult:
    ok: bool
    project_id: str
    mtime: float


@dataclass(frozen=True)
class RequestResult:
    ok: bool
    source: str
    text: str
    requested: str  # ISO timestamp stamped here, never supplied by the caller


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Mirrors server.py's own _EDIT_COLUMNS (server.spec.md's contract). Kept as
# a separate constant, not a shared import, because a write function must
# hold its own gate regardless of what any particular caller validated —
# API-4's "handlers validate, data functions assume valid input" describes
# server.py's layer, not a defence-in-depth check at the layer that actually
# touches disk.
_EDIT_COLUMNS = ("status", "state", "kind")

# The literal Kind-column cell text for kind 1 (model.KIND_NAMES[1]).
# Duplicated as a bare string rather than importing `model`, because `writes`
# has no dependency on `model` anywhere else and one constant is not worth
# creating one (TEST-9: this is the one place that mirrors model.py's
# vocabulary; model.py's own KIND_NAMES dict is the source of truth).
_KIND_WAITING = "waiting"

_MTIME_EPSILON = 1e-6  # JSON float round-trip tolerance, not a real time window

_EDITS_LOG_RELATIVE = ("Memory", "Long-Term", "Logs", "edits.log")

_SCRAPS_SECTION_FRAGMENT = "scraps"  # matches "## \U0001f4a1 Scraps & ideas" (Template_ProjectNotes.md)

_REQUESTS_HEADER = (
    '# Pending requests appended by the dashboard\'s "ask an agent" and depot\n'
    '# "dispatch" controls (documentation spec\'s cross-boundary table). Read by\n'
    "# !Initiative / !ProjectSweep; the dashboard only asks, it never runs the work\n"
    "# (writes.spec.md FR-7: queue.md is never written).\n"
    "requests:\n"
)


# ---------------------------------------------------------------------------
# The fence (FR-3, AD-2) — resolved path, checked after symlink resolution,
# never a string prefix match.
# ---------------------------------------------------------------------------


def _medium_term_root(root: Path) -> Path:
    return (root / "Memory" / "Medium-Term").resolve()


def _ensure_within(path: Path, fence_root: Path) -> Path:
    resolved = path.resolve()
    try:
        resolved.relative_to(fence_root)
    except ValueError as exc:
        raise FenceError(f"{path} resolves outside {fence_root}") from exc
    return resolved


# ---------------------------------------------------------------------------
# mtime guard (FR-2, AD-1)
# ---------------------------------------------------------------------------


def _check_mtime(path: Path, given_mtime: float) -> None:
    try:
        actual = path.stat().st_mtime
    except FileNotFoundError as exc:
        raise StaleMtimeError(f"{path} no longer exists") from exc
    if abs(actual - float(given_mtime)) > _MTIME_EPSILON:
        raise StaleMtimeError(f"{path}: expected mtime {given_mtime}, found {actual}")


# ---------------------------------------------------------------------------
# Locating a project's registry.md from its tracking row (fenced)
# ---------------------------------------------------------------------------


def _find_project_registry_path(root: Path, project_id: str) -> Path:
    medium_term = _medium_term_root(root)
    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    tracking_rows = stores.read_tracking(tracking_path)
    row = next((r for r in tracking_rows if r.id.value == project_id), None)
    if row is None or not row.path.value:
        raise ProjectNotFoundError(f"no _tracking.yaml row (with a path) for id {project_id!r}")
    # `root / row.path.value` is deliberately not trusted just because it
    # came from our own tracking file — FR-3 fences "regardless of how [a
    # path] was constructed", which includes a corrupted or hand-edited row.
    return _ensure_within(root / row.path.value, medium_term)


# ---------------------------------------------------------------------------
# Line-level file plumbing shared by every text edit below
# ---------------------------------------------------------------------------


def _read_lines(path: Path) -> list[str]:
    with open(path, "r", encoding="utf-8", newline="") as f:
        return f.readlines()


def _line_ending(raw_line: str) -> str:
    if raw_line.endswith("\r\n"):
        return "\r\n"
    if raw_line.endswith("\n"):
        return "\n"
    return ""


def _atomic_write_verified(path: Path, new_text: str, verify: Callable[[Path], None] | None = None) -> None:
    """Write to a same-directory temp file, optionally re-parse-verify that
    file (never the live one), then atomically replace the target.

    This is the writes.spec.md Risks-table mitigation ("re-parse before
    committing the write") — `os.replace` also happens to make the commit
    crash-safe, which is AD-1's own rationale for preferring a stale-write
    failure over a lock a crash could leave behind.
    """
    tmp_path = path.with_name(path.name + f".tmp{os.getpid()}")
    try:
        with open(tmp_path, "w", encoding="utf-8", newline="") as f:
            f.write(new_text)
        if verify is not None:
            verify(tmp_path)
        os.replace(tmp_path, path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


# ---------------------------------------------------------------------------
# Next Actions — locating and rewriting one row's one cell
#
# Reuses stores' own heading/table/cell primitives (stores._HEADING_RE,
# stores._split_row, stores._normalize_next_action_header) so the pipe
# hazard (FR-2a) is handled by exactly one implementation. What is added
# here is purely positional: stores.py's readers hand back parsed values,
# never line numbers, because model and server never need them — writes is
# the one caller that does, to splice a single line back into the file.
# ---------------------------------------------------------------------------


def _find_section_bounds(lines: list[str], name_fragment: str) -> tuple[int, int] | None:
    """Mirrors stores._find_section, returning line indices instead of a
    copied sub-list."""
    start = None
    for idx, line in enumerate(lines):
        m = stores._HEADING_RE.match(line.rstrip("\n"))
        if m and name_fragment.lower() in m.group(1).lower():
            start = idx + 1
            break
    if start is None:
        return None
    end = len(lines)
    for idx in range(start, len(lines)):
        if stores._HEADING_RE.match(lines[idx].rstrip("\n")):
            end = idx
            break
    return start, end


def _find_table_block_bounds(lines: list[str], start: int, end: int) -> list[tuple[int, int]]:
    """Mirrors stores._find_table_blocks, returning (start, end) index pairs
    for each run of consecutive '|'-led lines."""
    blocks: list[tuple[int, int]] = []
    block_start: int | None = None
    for idx in range(start, end):
        if lines[idx].strip().startswith("|"):
            if block_start is None:
                block_start = idx
        elif block_start is not None:
            blocks.append((block_start, idx))
            block_start = None
    if block_start is not None:
        blocks.append((block_start, end))
    return blocks


def _mutate_next_action_cell(
    lines: list[str], row_id: str, column: str, value: str
) -> tuple[list[str], str]:
    """Find the Next Actions row whose '#' cell equals `row_id` — unique
    across every stream in the registry by the house convention of
    suffixing the index per stream (1A/1B, ...; see PP-02's fixture and the
    real store) — and replace its `column` cell with `value`. Returns the
    new line list and the row's Action text (used by the completion log).

    Raises RowNotFoundError if zero or more than one row matches, or if the
    matched row's own table has no such column — never guesses and never
    edits positionally (writes.spec.md mirrors stores' own FR-2a rule here).
    """
    bounds = _find_section_bounds(lines, "next actions")
    if bounds is None:
        raise RowNotFoundError("registry.md has no '# ... Next Actions' section")
    section_start, section_end = bounds

    matches: list[tuple[int, list[str], list[str | None]]] = []
    for block_start, block_end in _find_table_block_bounds(lines, section_start, section_end):
        if block_end - block_start < 2:
            continue  # header + separator with no data rows
        columns = [stores._normalize_next_action_header(c) for c in stores._split_row(lines[block_start].rstrip("\n"))]
        if "index" not in columns:
            continue
        index_pos = columns.index("index")
        for data_idx in range(block_start + 2, block_end):
            cells = stores._split_row(lines[data_idx].rstrip("\n"))
            if len(cells) != len(columns):
                continue  # malformed row (FR-2a): skipped, never addressed positionally
            if cells[index_pos].strip() == row_id:
                matches.append((data_idx, cells, columns))

    if not matches:
        raise RowNotFoundError(f"no Next Actions row with # = {row_id!r}")
    if len(matches) > 1:
        raise RowNotFoundError(f"ambiguous row id {row_id!r}: ties {len(matches)} rows across streams")

    data_idx, cells, columns = matches[0]
    if column not in columns:
        raise RowNotFoundError(f"row {row_id!r}'s table has no {column!r} column")
    col_pos = columns.index(column)
    action_pos = columns.index("action") if "action" in columns else None
    action_text = cells[action_pos] if action_pos is not None else ""

    new_cells = list(cells)
    new_cells[col_pos] = value
    ending = _line_ending(lines[data_idx])
    new_row_line = "| " + " | ".join(new_cells) + " |" + ending

    new_lines = list(lines)
    new_lines[data_idx] = new_row_line
    return new_lines, action_text


def _verify_cell_written(
    tmp_path: Path, project_id: str, row_id: str, column: str, expected_value: str, baseline_malformed: int
) -> None:
    registry = stores.read_registry(tmp_path, project_id)
    if len(registry.malformed_rows) > baseline_malformed:
        raise TableCorruptionError(f"{tmp_path}: the edit produced a malformed Next Actions row")
    match = next((t for t in registry.next_actions if (t.index.value or "") == row_id), None)
    if match is None:
        raise TableCorruptionError(f"{tmp_path}: row {row_id!r} did not survive the rewrite")
    actual = getattr(match, column).value
    if actual != expected_value:
        raise TableCorruptionError(
            f"{tmp_path}: row {row_id!r} column {column!r} reads {actual!r}, expected {expected_value!r}"
        )


def _reject_unsafe_cell_value(value: str) -> None:
    if "\n" in value or "\r" in value:
        raise ValueError("a Next Actions cell value cannot contain a newline")
    if "|" in value:
        # Status/State/Kind are short controlled-vocabulary glyphs, never
        # free prose (unlike Action, which is why FR-2a's backtick escape
        # exists there) — an unescaped pipe here has no legitimate case and
        # would silently add a cell on the next read.
        raise ValueError("a Next Actions cell value cannot contain '|'")


# ---------------------------------------------------------------------------
# _tracking.yaml — stamping pending_sweep: true on one project's row (FR-4)
#
# Text surgery, not a YAML load+dump: _tracking.yaml opens with a long
# comment header (see the file itself) that a round-trip through PyYAML's
# dumper would discard, and FR-1 forbids a whole-file rewrite regardless.
# ---------------------------------------------------------------------------


def _stamp_pending_sweep(tracking_path: Path, project_id: str) -> None:
    lines = _read_lines(tracking_path)
    id_re = re.compile(r'^(\s*)-\s+id:\s*["\']?' + re.escape(project_id) + r'["\']?\s*$')
    next_item_re = re.compile(r"^\s*-\s+id:\s*")
    pending_re = re.compile(r"^(\s*)pending_sweep:\s*(\S+)\s*$")

    block_start = next((i for i, line in enumerate(lines) if id_re.match(line.rstrip("\n"))), None)
    if block_start is None:
        raise ProjectNotFoundError(f"no _tracking.yaml row for id {project_id!r}")

    block_end = len(lines)
    for i in range(block_start + 1, len(lines)):
        if next_item_re.match(lines[i].rstrip("\n")):
            block_end = i
            break

    child_indent = "    "
    last_content_idx = block_start
    for i in range(block_start, block_end):
        stripped = lines[i].rstrip("\n")
        m = pending_re.match(stripped)
        if m:
            if m.group(2) == "true":
                return  # already stamped — idempotent, no unnecessary write
            lines[i] = f"{m.group(1)}pending_sweep: true{_line_ending(lines[i])}"
            _atomic_write_verified(
                tracking_path, "".join(lines),
                verify=lambda p: _verify_pending_sweep(p, project_id),
            )
            return
        if stripped.strip():
            last_content_idx = i
            if i > block_start:
                indent_match = re.match(r"^(\s*)\S", stripped)
                if indent_match:
                    child_indent = indent_match.group(1)

    lines.insert(last_content_idx + 1, f"{child_indent}pending_sweep: true{_line_ending(lines[last_content_idx])}")
    _atomic_write_verified(
        tracking_path, "".join(lines),
        verify=lambda p: _verify_pending_sweep(p, project_id),
    )


def _verify_pending_sweep(tmp_path: Path, project_id: str) -> None:
    data = stores.yaml_load(tmp_path.read_text(encoding="utf-8")) or {}
    projects = data.get("projects") or []
    row = next((p for p in projects if isinstance(p, dict) and p.get("id") == project_id), None)
    if row is None or row.get("pending_sweep") is not True:
        raise TableCorruptionError(f"{tmp_path}: pending_sweep did not land as true for {project_id!r}")


# ---------------------------------------------------------------------------
# notes.md — appending one scrap line (FR-1's "append exactly one line")
# ---------------------------------------------------------------------------

_HEADING_ANY_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def _find_markdown_section_bounds(lines: list[str], fragment: str, max_level: int) -> tuple[int, int] | None:
    """Generalises _find_section_bounds to notes.md's '##' sections
    (Template_ProjectNotes.md), which sit one level deeper than registry.md's
    '#' Next Actions heading."""
    start = None
    start_level = None
    for idx, line in enumerate(lines):
        m = _HEADING_ANY_RE.match(line.rstrip("\n"))
        if not m:
            continue
        level = len(m.group(1))
        if start is None and level <= max_level and fragment.lower() in m.group(2).lower():
            start, start_level = idx + 1, level
            continue
        if start is not None and level <= start_level:
            return start, idx
    if start is None:
        return None
    return start, len(lines)


def _append_scrap_line(notes_path: Path, line_text: str) -> None:
    lines = _read_lines(notes_path)
    bounds = _find_markdown_section_bounds(lines, _SCRAPS_SECTION_FRAGMENT, max_level=2)
    if bounds is None:
        raise RowNotFoundError(f"{notes_path} has no '## ... Scraps ...' section to append to")
    start, end = bounds
    insertion_idx = end
    while insertion_idx > start and lines[insertion_idx - 1].strip() == "":
        insertion_idx -= 1
    ending = _line_ending(lines[insertion_idx - 1]) if insertion_idx > start else "\n"
    new_line = f"- {line_text}{ending or chr(10)}"
    new_lines = lines[:insertion_idx] + [new_line] + lines[insertion_idx:]
    _atomic_write_verified(notes_path, "".join(new_lines), verify=lambda p: _verify_line_present(p, new_line))


def _verify_line_present(tmp_path: Path, expected_line: str) -> None:
    if expected_line not in tmp_path.read_text(encoding="utf-8"):
        raise TableCorruptionError(f"{tmp_path}: appended scrap line did not survive the write")


# ---------------------------------------------------------------------------
# The completion log — FR-10: appended in the SAME call as Done, never a
# second request. Nothing reads it today; see the module-level note below
# on why it must not be deleted as unused.
# ---------------------------------------------------------------------------

# The failure mode this function exists to prevent: an agent greps for a
# reader of completions.log, finds none, and "cleans up" this call as dead
# code. It is not dead — it is the only way the capacity matrix's fourth
# input (recent completions, model FR-26/documentation D-26) will ever have
# real history to be fitted against. Leave it. (writes.spec.md FR-10.)


def _append_completion(completions_path: Path, project_id: str, row_id: str, action_text: str) -> None:
    single_line = " ".join(action_text.split())
    line = f"{date.today().isoformat()} | {project_id} | {row_id} | {single_line}\n"
    with open(completions_path, "a", encoding="utf-8") as f:
        f.write(line)


# ---------------------------------------------------------------------------
# _requests.yaml — "ask an agent" and depot "dispatch" both land here
# (FR-7); queue.md is never opened by this module at all.
# ---------------------------------------------------------------------------


def _yaml_flow_string(value: str) -> str:
    single_line = " ".join(value.split())
    escaped = single_line.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _verify_requests_yaml(tmp_path: Path) -> None:
    data = stores.yaml_load(tmp_path.read_text(encoding="utf-8")) or {}
    requests = data.get("requests")
    if not isinstance(requests, list) or not requests:
        raise TableCorruptionError(f"{tmp_path}: 'requests' list missing or empty after append")
    if not isinstance(requests[-1], dict) or "text" not in requests[-1]:
        raise TableCorruptionError(f"{tmp_path}: appended row did not parse back as a request")


def _append_request_row(requests_path: Path, source: str, text: str, timestamp: str) -> None:
    entry = (
        f"  - {{source: {_yaml_flow_string(source)}, "
        f"text: {_yaml_flow_string(text)}, "
        f"requested: {_yaml_flow_string(timestamp)}}}\n"
    )
    if not requests_path.exists():
        _atomic_write_verified(requests_path, _REQUESTS_HEADER + entry, verify=_verify_requests_yaml)
        return
    existing = requests_path.read_text(encoding="utf-8")
    if existing and not existing.endswith("\n"):
        existing += "\n"
    _atomic_write_verified(requests_path, existing + entry, verify=_verify_requests_yaml)


# ---------------------------------------------------------------------------
# Logs/edits.log — one line per mutation, success or refusal (FR-5, AC-6).
# ---------------------------------------------------------------------------


def _append_edit_log(root: Path, *, action: str, project_id: str, row: str, column: str, outcome: str, detail: str = "") -> None:
    """Deliberately outside the Memory/Medium-Term/ fence FR-3 otherwise
    enforces: this path is fixed in source (never built from `project_id`,
    `row`, or any other caller-supplied value), so the class of attack the
    fence guards against — an escaping path — cannot reach it. FR-5 names
    this exact, non-configurable Long-Term destination.
    """
    path = root.joinpath(*_EDITS_LOG_RELATIVE)
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {action} project={project_id} row={row} column={column} outcome={outcome}"
    if detail:
        line += f" detail={detail}"
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _log_refusal(root: Path, **kwargs: str) -> None:
    """A logging failure must never mask the refusal it is trying to
    record (a disk-full edits.log turning a 409 into a 500 would be worse
    than the missing log line) — swallowed here, unlike every other call
    site in this module."""
    try:
        _append_edit_log(root, **kwargs)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Public API — the four calls server.py's module docstring names.
# ---------------------------------------------------------------------------


def set_cell(root: Path, *, project_id: str, row: str | int, column: str, value: str, mtime: float) -> EditResult:
    if column not in _EDIT_COLUMNS:
        raise ValueError(f"unknown column {column!r}")
    _reject_unsafe_cell_value(value)

    row_id = str(row)
    medium_term = _medium_term_root(root)
    try:
        registry_path = _find_project_registry_path(root, project_id)
    except (FenceError, ProjectNotFoundError) as exc:
        _log_refusal(root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome=f"refused:{type(exc).__name__}")
        raise

    try:
        _check_mtime(registry_path, mtime)
    except StaleMtimeError:
        _log_refusal(root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome="refused:stale_mtime")
        raise

    baseline = stores.read_registry(registry_path, project_id)
    baseline_malformed = len(baseline.malformed_rows)

    lines = _read_lines(registry_path)
    try:
        new_lines, action_text = _mutate_next_action_cell(lines, row_id, column, value)
    except RowNotFoundError:
        _log_refusal(root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome="refused:row_not_found")
        raise

    _atomic_write_verified(
        registry_path, "".join(new_lines),
        verify=lambda p: _verify_cell_written(p, project_id, row_id, column, value, baseline_malformed),
    )

    completion_logged = False
    if column == "status" and "☑" in value:  # Done glyph — mirrors model._is_open's own check
        completions_path = _ensure_within(root / "Memory" / "Medium-Term" / "completions.log", medium_term)
        _append_completion(completions_path, project_id, row_id, action_text)
        completion_logged = True

    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    _stamp_pending_sweep(tracking_path, project_id)

    new_mtime = registry_path.stat().st_mtime
    _append_edit_log(
        root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome="ok",
        detail=f"value={value!r} completion_logged={completion_logged}",
    )
    return EditResult(ok=True, project_id=project_id, row=row_id, column=column, value=value, mtime=new_mtime, completion_logged=completion_logged)


def hand_over(root: Path, *, project_id: str, row: str | int, recipient: str, mtime: float) -> HandOverResult:
    row_id = str(row)
    medium_term = _medium_term_root(root)
    try:
        registry_path = _find_project_registry_path(root, project_id)
    except (FenceError, ProjectNotFoundError) as exc:
        _log_refusal(root, action="hand_over", project_id=project_id, row=row_id, column="kind", outcome=f"refused:{type(exc).__name__}")
        raise

    try:
        _check_mtime(registry_path, mtime)
    except StaleMtimeError:
        _log_refusal(root, action="hand_over", project_id=project_id, row=row_id, column="kind", outcome="refused:stale_mtime")
        raise

    baseline = stores.read_registry(registry_path, project_id)
    baseline_malformed = len(baseline.malformed_rows)

    lines = _read_lines(registry_path)
    try:
        new_lines, _action_text = _mutate_next_action_cell(lines, row_id, "kind", _KIND_WAITING)
    except RowNotFoundError:
        _log_refusal(root, action="hand_over", project_id=project_id, row=row_id, column="kind", outcome="refused:row_not_found")
        raise

    _atomic_write_verified(
        registry_path, "".join(new_lines),
        verify=lambda p: _verify_cell_written(p, project_id, row_id, "kind", _KIND_WAITING, baseline_malformed),
    )

    # FR-6: "records the recipient in the same operation" — the notes.md
    # scrap append is the in-scope append primitive this maps to (writes.spec.md
    # §2); there is no other in-scope place to put free text about a hand-over.
    notes_path = _ensure_within(registry_path.parent / "notes.md", medium_term)
    scrap = f"{date.today().isoformat()} — Handed over row {row_id} to {recipient}."
    _append_scrap_line(notes_path, scrap)

    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    _stamp_pending_sweep(tracking_path, project_id)

    new_mtime = registry_path.stat().st_mtime
    _append_edit_log(
        root, action="hand_over", project_id=project_id, row=row_id, column="kind", outcome="ok",
        detail=f"recipient={recipient!r}",
    )
    return HandOverResult(ok=True, project_id=project_id, row=row_id, recipient=recipient, mtime=new_mtime)


def append_scrap(root: Path, *, project_id: str, text: str, mtime: float | None = None) -> ScrapResult:
    """unblock.spec.md FR-5's third write control. Not yet reachable through
    any `server.py` route (its docstring lists only set_cell/hand_over under
    `/api/edit`) — flagged in the build report, not fixed here: adding a
    route is server.py's seam, not this module's.
    """
    medium_term = _medium_term_root(root)
    registry_path = _find_project_registry_path(root, project_id)
    notes_path = _ensure_within(registry_path.parent / "notes.md", medium_term)

    if mtime is not None:
        try:
            _check_mtime(notes_path, mtime)
        except StaleMtimeError:
            _log_refusal(root, action="append_scrap", project_id=project_id, row="-", column="-", outcome="refused:stale_mtime")
            raise

    single_line = " ".join(text.split())
    _append_scrap_line(notes_path, single_line)
    new_mtime = notes_path.stat().st_mtime
    _append_edit_log(root, action="append_scrap", project_id=project_id, row="-", column="-", outcome="ok", detail=f"text={single_line[:60]!r}")
    return ScrapResult(ok=True, project_id=project_id, mtime=new_mtime)


def append_request(root: Path, *, source: str, text: str) -> RequestResult:
    medium_term = _medium_term_root(root)
    requests_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_requests.yaml", medium_term)
    timestamp = datetime.now().isoformat(timespec="seconds")
    _append_request_row(requests_path, source, text, timestamp)
    _append_edit_log(root, action="append_request", project_id=source, row="-", column="-", outcome="ok", detail=f"text={text[:60]!r}")
    return RequestResult(ok=True, source=source, text=text, requested=timestamp)
