"""The ONLY module that changes a file (the writes spec).

Five edits, one cell at a time, behind four guards. 1 Status, 2 Due, 3 Owner
and 4 Kind are each one cell in one existing Next Actions row of a project's
`registry.md`; 5 is a note appended under a named section of that project's
`notes.md`.

The four guards, in order, on every call: the **fence** (FR-2) resolves the
target path and refuses anything outside `Memory/Medium-Term/`; the
**mtime guard** (FR-3) refuses a write against a file that moved on since the
caller read it; the **re-parse guard** (FR-4) builds the new content in
memory and re-parses it with `stores` before it ever reaches disk, so a
write that would corrupt the table is abandoned instead of committed; the
**record guard** (FR-5) appends one line to `Logs/edits.log` and sets
`pending_sweep: true` on the project's `_tracking.yaml` row. A row whose
`🔗 Link` cell is not `—` is refused outright (FR-6) — linked rows sync
through `!ProjectSweep`, never through this module.

Depends on `stores` only to locate a cell and to re-parse it (FR-10,
documentation.spec.md's one-way rule): `stores` never imports this module
back, and `model` is never imported here at all. `server` is this module's
only caller.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable

import stores

# ---------------------------------------------------------------------------
# Errors — FenceError, StaleMtimeError and RowNotFoundError are reused by
# name from ProjectDashboard's writes.py (FR-9) so Logs/edits.log reads the
# same vocabulary across both apps. LinkedRowError is this module's own
# addition for FR-6, which ProjectDashboard's writes.py has no equivalent
# of.
# ---------------------------------------------------------------------------


class WritesError(Exception):
    """Base for every error this module raises."""


class FenceError(WritesError):
    """A path resolved outside Memory/Medium-Term/ (FR-2, AC-2)."""


class StaleMtimeError(WritesError):
    """The target file changed since the caller's mtime was read (FR-3, AC-3)."""


class ProjectNotFoundError(WritesError):
    """`project_id` has no row in `_tracking.yaml`, or that row has no path."""


class RowNotFoundError(WritesError):
    """No Next Actions row matched (or more than one did), the requested
    column does not exist on that row's table, a `notes.md` heading for the
    requested section could not be found, or `registry.md`'s frontmatter has
    no single-line `tags: [...]` field to append to."""


class LinkedRowError(WritesError):
    """The row's `🔗 Link` cell is not `—` (FR-6, AC-4). `server` turns this
    into plain words for Luke rather than syncing or half-editing it."""


class TableCorruptionError(WritesError):
    """Re-parsing the rewritten file (before it is committed) did not
    confirm the intended edit — the write is abandoned; nothing is
    committed (FR-4, the writes.spec.md Risks-table mitigation)."""


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class EditResult:
    ok: bool
    project_id: str
    row: str
    column: str
    value: str
    mtime: float  # the file's new mtime, so the caller's next edit doesn't 409 needlessly


@dataclass(frozen=True)
class NoteResult:
    ok: bool
    project_id: str
    section: str
    mtime: float


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Edits 1-4 (FR-1). "state" (the lane colour) is deliberately absent: it is
# a `model`-derived roll-up in this app, not one of the five edits (contrast
# ProjectDashboard, where state was directly editable).
_EDIT_COLUMNS = ("status", "due", "owner", "kind")

# FR-8: the fixed set edit 5 may name, mapped to the heading fragment each
# resolves to in Template_ProjectNotes.md. Deliberately a dict literal, not
# derived from the template file, so a template wording change can never
# silently change what this module accepts.
_NOTE_SECTIONS: dict[str, str] = {
    "scraps": "Scraps & ideas",
    "constraints": "Constraints & gotchas",
    "reference": "Reference",
    "guidance": "Agent guidance",
}

# A cell reading one of these is this system's "nothing here" glyph — an
# absent link, same convention stores.py's own _BLANK_CELL_TEXT uses.
_UNLINKED_VALUES = ("", "—", "-")

_MTIME_EPSILON = 1e-6  # JSON float round-trip tolerance, not a real time window

_EDITS_LOG_RELATIVE = ("Memory", "Long-Term", "Logs", "edits.log")


# ---------------------------------------------------------------------------
# The fence (FR-2) — resolved path, checked after symlink/'..' resolution,
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
# mtime guard (FR-3)
# ---------------------------------------------------------------------------


def _check_mtime(path: Path, given_mtime: float) -> None:
    try:
        actual = path.stat().st_mtime
    except FileNotFoundError as exc:
        raise StaleMtimeError(f"{path} no longer exists") from exc
    if abs(actual - float(given_mtime)) > _MTIME_EPSILON:
        raise StaleMtimeError(f"{path}: expected mtime {given_mtime}, found {actual}")


# ---------------------------------------------------------------------------
# Locating a project's registry.md from its _tracking.yaml row (fenced)
# ---------------------------------------------------------------------------


def _find_project_registry_path(root: Path, project_id: str) -> Path:
    medium_term = _medium_term_root(root)
    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    tracking_rows = stores.read_tracking(tracking_path)
    row = next((r for r in tracking_rows if r.id.value == project_id), None)
    if row is None or not row.path.value:
        raise ProjectNotFoundError(f"no _tracking.yaml row (with a path) for id {project_id!r}")
    # `root / row.path.value` is not trusted just because it came from our
    # own tracking file — the fence guards against a corrupted or
    # hand-edited row exactly as it would an untrusted one.
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
    """Write to a same-directory temp file, re-parse-verify THAT file (never
    the live one) when a verifier is given, then atomically replace the
    target. This is Guard 3 (FR-4) — `os.replace` also makes the commit
    crash-safe, which is why a stale write is a refusal rather than
    something a crash could leave half-applied.
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
# Next Actions — locating and rewriting one row's one cell (FR-1, FR-6)
#
# Reuses stores' own heading/table/cell primitives (stores._HEADING_RE,
# stores._split_row, stores._resolve_columns, stores._NEXT_ACTION_ALIASES)
# so the backtick-aware pipe split (stores.spec.md FR-2) is handled by
# exactly one implementation. What is added here is purely positional:
# stores' readers hand back parsed values, never line numbers, because
# `model` and `server` never need them — this is the one caller that does,
# to splice a single line back into the file.
# ---------------------------------------------------------------------------


def _find_section_bounds(lines: list[str], name_fragment: str) -> tuple[int, int] | None:
    """Mirrors stores._find_section, returning line indices instead of a
    copied sub-list — this module needs the index to splice a line back in."""
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
    for each run of consecutive '|'-led lines, so a stream sub-heading
    inside "# Next Actions" never merges two tables into one search."""
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


def _expected_field_value(value: str) -> str | None:
    """A written cell value that is itself one of the "nothing here" glyphs
    reads back from `stores` as `None` (its own _field convention), not as
    the literal glyph text — so verification must expect the same."""
    return None if value.strip() in _UNLINKED_VALUES else value


def _locate_next_action_row(lines: list[str], row_id: str) -> tuple[int, list[str], list[str | None]]:
    """Find the Next Actions row whose '#' cell equals `row_id` — unique
    across every stream in the registry by the house convention of
    suffixing the index per stream (1A/1B, ...). Raises RowNotFoundError if
    zero or more than one row matches — never guesses and never addresses a
    row positionally (mirrors stores.spec.md's own FR-2a rule)."""
    bounds = _find_section_bounds(lines, "next actions")
    if bounds is None:
        raise RowNotFoundError("registry.md has no '# ... Next Actions' section")
    section_start, section_end = bounds

    matches: list[tuple[int, list[str], list[str | None]]] = []
    for block_start, block_end in _find_table_block_bounds(lines, section_start, section_end):
        if block_end - block_start < 2:
            continue  # header + separator with no data rows
        header_cells = stores._split_row(lines[block_start].rstrip("\n"))
        columns = stores._resolve_columns(header_cells, stores._NEXT_ACTION_ALIASES, has_index_column=True)
        if "index" not in columns:
            continue
        index_pos = columns.index("index")
        for data_idx in range(block_start + 2, block_end):
            cells = stores._split_row(lines[data_idx].rstrip("\n"))
            if len(cells) != len(columns):
                continue  # malformed row: skipped, never addressed positionally
            if cells[index_pos].strip() == row_id:
                matches.append((data_idx, cells, columns))

    if not matches:
        raise RowNotFoundError(f"no Next Actions row with # = {row_id!r}")
    if len(matches) > 1:
        raise RowNotFoundError(f"ambiguous row id {row_id!r}: matched {len(matches)} rows across streams")
    return matches[0]


def _row_link_value(cells: list[str], columns: list[str | None]) -> str:
    if "link" not in columns:
        return ""
    return cells[columns.index("link")].strip()


def _mutate_next_action_cell(lines: list[str], row_id: str, column: str, value: str) -> tuple[list[str], str]:
    """Returns the new line list and the row's current `🔗 Link` cell text,
    so the caller can refuse a linked row (FR-6) before anything is written
    — this function only builds the replacement in memory."""
    data_idx, cells, columns = _locate_next_action_row(lines, row_id)
    link_value = _row_link_value(cells, columns)

    if column not in columns:
        raise RowNotFoundError(f"row {row_id!r}'s table has no {column!r} column")
    col_pos = columns.index(column)

    new_cells = list(cells)
    new_cells[col_pos] = value
    ending = _line_ending(lines[data_idx])
    new_row_line = "| " + " | ".join(new_cells) + " |" + ending

    new_lines = list(lines)
    new_lines[data_idx] = new_row_line
    return new_lines, link_value


def _verify_cell_written(
    tmp_path: Path, project_id: str, row_id: str, column: str, expected_value: str, baseline_skipped: int
) -> None:
    registry = stores.read_registry(tmp_path, project_id)
    if len(registry.skipped_rows) > baseline_skipped:
        raise TableCorruptionError(f"{tmp_path}: the edit produced a malformed Next Actions row")
    match = next((r for r in registry.next_actions if (r.index.value or "") == row_id), None)
    if match is None:
        raise TableCorruptionError(f"{tmp_path}: row {row_id!r} did not survive the rewrite")
    actual = getattr(match, column).value
    expected = _expected_field_value(expected_value)
    if actual != expected:
        raise TableCorruptionError(
            f"{tmp_path}: row {row_id!r} column {column!r} reads {actual!r}, expected {expected!r}"
        )


def _reject_unsafe_cell_value(value: str) -> None:
    if "\n" in value or "\r" in value:
        raise ValueError("a Next Actions cell value cannot contain a newline")
    if "|" in value:
        # Status/Due/Owner/Kind are short controlled-vocabulary cells, never
        # free prose (unlike Action) — an unescaped pipe here has no
        # legitimate case and would silently add a cell on the next read.
        raise ValueError("a Next Actions cell value cannot contain '|'")


# ---------------------------------------------------------------------------
# notes.md — appending one line under a named section (FR-8, AC-6)
# ---------------------------------------------------------------------------

_HEADING_ANY_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def _find_markdown_section_bounds(lines: list[str], fragment: str, max_level: int) -> tuple[int, int] | None:
    """Generalises _find_section_bounds to notes.md's '##' sections
    (Template_ProjectNotes.md), which sit one level deeper than registry.md's
    '#' Next Actions heading, and stop at the next heading of the same or
    shallower level so a later section can never be mistaken for this one."""
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


def _append_note_line(notes_path: Path, fragment: str, line_text: str) -> str:
    lines = _read_lines(notes_path)
    bounds = _find_markdown_section_bounds(lines, fragment, max_level=2)
    if bounds is None:
        raise RowNotFoundError(f"{notes_path} has no heading matching {fragment!r}")
    start, end = bounds
    insertion_idx = end
    while insertion_idx > start and lines[insertion_idx - 1].strip() == "":
        insertion_idx -= 1
    ending = _line_ending(lines[insertion_idx - 1]) if insertion_idx > start else "\n"
    new_line = f"- {line_text}{ending or chr(10)}"
    new_lines = lines[:insertion_idx] + [new_line] + lines[insertion_idx:]
    _atomic_write_verified(notes_path, "".join(new_lines), verify=lambda p: _verify_line_present(p, new_line))
    return new_line


def _verify_line_present(tmp_path: Path, expected_line: str) -> None:
    if expected_line not in tmp_path.read_text(encoding="utf-8"):
        raise TableCorruptionError(f"{tmp_path}: appended line did not survive the write")


# ---------------------------------------------------------------------------
# _tracking.yaml — stamping pending_sweep: true on one project's row (FR-5)
#
# Text surgery, not a YAML load+dump: _tracking.yaml opens with a long
# comment header a round-trip through a generic dumper would discard, and
# every edit in this module is one cell or one line, never a whole file.
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
# Logs/edits.log — one line per mutation, success or refusal (FR-5, AC-7).
# ---------------------------------------------------------------------------


def _append_edit_log(root: Path, *, action: str, project_id: str, row: str, column: str, outcome: str, detail: str = "") -> None:
    """Deliberately outside the Memory/Medium-Term/ fence FR-2 otherwise
    enforces: this path is fixed in source (never built from `project_id`,
    `row`, or any other caller-supplied value), so the class of attack the
    fence guards against — an escaping path — cannot reach it. FR-5 names
    this exact, non-configurable Long-Term destination.
    """
    path = root.joinpath(*_EDITS_LOG_RELATIVE)
    path.parent.mkdir(parents=True, exist_ok=True)
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {action} project={project_id} row={row} column={column} outcome={outcome}"
    if detail:
        line += f" detail={detail}"
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _log_refusal(root: Path, **kwargs: str) -> None:
    """A logging failure must never mask the refusal it is trying to
    record (a disk-full edits.log turning a clean refusal into a crash
    would be worse than the missing log line) — swallowed here, unlike
    every other call site in this module."""
    try:
        _append_edit_log(root, **kwargs)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Public API — the three calls that cover the six edits (AD-2: named
# fields only, no positional API, which is also why there is no drag).
# ---------------------------------------------------------------------------


def set_cell(root: Path, *, project_id: str, row: str | int, column: str, value: str, mtime: float) -> EditResult:
    """Edits 1-4: Status, Due, Owner or Kind on one existing Next Actions row."""
    if column not in _EDIT_COLUMNS:
        raise ValueError(f"unknown column {column!r}; must be one of {_EDIT_COLUMNS}")
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
    baseline_skipped = len(baseline.skipped_rows)

    lines = _read_lines(registry_path)
    try:
        new_lines, link_value = _mutate_next_action_cell(lines, row_id, column, value)
    except RowNotFoundError:
        _log_refusal(root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome="refused:row_not_found")
        raise

    if link_value not in _UNLINKED_VALUES:
        _log_refusal(root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome="refused:linked_row")
        raise LinkedRowError(f"row {row_id!r} is linked ({link_value!r}); it is edited through its canonical copy")

    _atomic_write_verified(
        registry_path, "".join(new_lines),
        verify=lambda p: _verify_cell_written(p, project_id, row_id, column, value, baseline_skipped),
    )

    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    _stamp_pending_sweep(tracking_path, project_id)

    new_mtime = registry_path.stat().st_mtime
    _append_edit_log(root, action="set_cell", project_id=project_id, row=row_id, column=column, outcome="ok", detail=f"value={value!r}")
    return EditResult(ok=True, project_id=project_id, row=row_id, column=column, value=value, mtime=new_mtime)


def append_note(root: Path, *, project_id: str, section: str, text: str, mtime: float) -> NoteResult:
    """Edit 5: append one line under a named notes.md section. `section`
    must be one of exactly scraps/constraints/reference/guidance (FR-8) —
    an unknown section is a ValueError, never a silent default; defaulting
    to Scraps & ideas is the interface layer's job, not this module's."""
    if section not in _NOTE_SECTIONS:
        raise ValueError(f"unknown notes.md section {section!r}; must be one of {sorted(_NOTE_SECTIONS)}")
    single_line = " ".join(text.split())
    if not single_line:
        raise ValueError("note text must not be empty")

    medium_term = _medium_term_root(root)
    try:
        registry_path = _find_project_registry_path(root, project_id)
    except (FenceError, ProjectNotFoundError) as exc:
        _log_refusal(root, action="append_note", project_id=project_id, row="-", column=section, outcome=f"refused:{type(exc).__name__}")
        raise
    notes_path = _ensure_within(registry_path.parent / "notes.md", medium_term)

    try:
        _check_mtime(notes_path, mtime)
    except StaleMtimeError:
        _log_refusal(root, action="append_note", project_id=project_id, row="-", column=section, outcome="refused:stale_mtime")
        raise

    fragment = _NOTE_SECTIONS[section]
    try:
        _append_note_line(notes_path, fragment, single_line)
    except RowNotFoundError:
        _log_refusal(root, action="append_note", project_id=project_id, row="-", column=section, outcome="refused:section_not_found")
        raise

    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    _stamp_pending_sweep(tracking_path, project_id)

    new_mtime = notes_path.stat().st_mtime
    _append_edit_log(root, action="append_note", project_id=project_id, row="-", column=section, outcome="ok", detail=f"text={single_line[:80]!r}")
    return NoteResult(ok=True, project_id=project_id, section=section, mtime=new_mtime)
