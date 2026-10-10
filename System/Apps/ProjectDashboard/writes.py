"""The ONLY module that changes a file (the writes spec).

Five edits, one cell at a time, behind four guards. 1 Status, 2 Due, 3 Owner
and 4 Kind are each one cell in one existing Next Actions row of a project's
`registry.md`; 5 is a note appended under a named section of that project's
`notes.md`. Two operations are built on the same guards: a reorder of one
Next Actions table block, and a one-level undo of the latest `set_cell` (which
is why `set_cell` logs the cell's previous text as `prev=` in this app's `edits.log`).

The four guards, in order, on every call: the **fence** resolves the
target path and refuses anything outside `Memory/Medium-Term/`; the
**mtime guard** refuses a write against a file that moved on since the
caller read it; the **re-parse guard** builds the new content in
memory and re-parses it with `stores` before it ever reaches disk, so a
write that would corrupt the table is abandoned instead of committed; the
**record guard** appends one line to this app's `edits.log` and sets
`pending_sweep: true` on the project's `_tracking.yaml` row. A row whose
`🔗 Link` cell is not `—` is refused outright — linked rows sync
through `!ProjectSweep`, never through this module.

Depends on `stores` only to locate a cell and to re-parse it (a
one-way rule): `stores` never imports this module
back, and `model` is never imported here at all. `server` is this module's
only caller.
"""

from __future__ import annotations

import ast
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable

import stores

# ---------------------------------------------------------------------------
# Errors — FenceError, StaleMtimeError and RowNotFoundError are reused by
# name from ProjectDashboard's writes.py so edits.log reads the
# same vocabulary across both apps. LinkedRowError is this module's own
# addition for linked rows, which the earlier Dashboard's writes.py has no equivalent
# of.
# ---------------------------------------------------------------------------


class WritesError(Exception):
    """Base for every error this module raises."""


class FenceError(WritesError):
    """A path resolved outside Memory/Medium-Term/."""


class StaleMtimeError(WritesError):
    """The target file changed since the caller's mtime was read."""


class ProjectNotFoundError(WritesError):
    """`project_id` has no row in `_tracking.yaml`, or that row has no path."""


class RowNotFoundError(WritesError):
    """No Next Actions row matched (or more than one did), the requested
    column does not exist on that row's table, a `notes.md` heading for the
    requested section could not be found, or `registry.md`'s frontmatter has
    no single-line `tags: [...]` field to append to."""


class LinkedRowError(WritesError):
    """The row's `🔗 Link` cell is not `—`. `server` turns this
    into plain words for Luke rather than syncing or half-editing it."""


class TableCorruptionError(WritesError):
    """Re-parsing the rewritten file (before it is committed) did not
    confirm the intended edit — the write is abandoned; nothing is
    committed, so a crash mid-write cannot leave a half-written registry."""


class ReorderMismatchError(WritesError):
    """No single Next Actions table block's row-id set exactly matches the
    given row_order — a stale client, a multi-stream project, or a row that
    has since gone done/deleted/renumbered. Nothing is written."""


class UndoUnavailableError(WritesError):
    """There is nothing the undo button may honestly restore: no logged write,
    the latest write is a note / reorder / undo, it predates `prev=` logging,
    it belongs to a different project, or its old value cannot be written
    back safely. Carries a plain reason for `undo_state`. Nothing is written."""


class UndoConflictError(WritesError):
    """The cell no longer holds the value the log says it was set to —
    someone (or !ProjectSweep) changed it since. Undoing now would silently
    discard that change, so nothing is written."""


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


@dataclass(frozen=True)
class ReorderResult:
    ok: bool
    project_id: str
    row_order: list[str]
    mtime: float  # the file's new mtime, so the caller's next edit doesn't 409 needlessly


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Edits 1-4. "state" (the lane colour) is deliberately absent: it is
# a `model`-derived roll-up in this app, not one of the five edits (contrast
# ProjectDashboard, where state was directly editable).
_EDIT_COLUMNS = ("status", "due", "owner", "kind")

# The fixed set edit 5 may name, mapped to the heading fragment each
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

_EDITS_LOG_RELATIVE = ("System", "Apps", "ProjectDashboard", "edits.log")


# ---------------------------------------------------------------------------
# The fence — resolved path, checked after symlink/'..' resolution,
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
# mtime guard
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
    target. This is Guard 3 — `os.replace` also makes the commit
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
# Next Actions — locating and rewriting one row's one cell
#
# Reuses stores' own heading/table/cell primitives (stores._HEADING_RE,
# stores._split_row, stores._resolve_columns, stores._NEXT_ACTION_ALIASES)
# so the backtick-aware pipe split is handled by
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
    row positionally, the same rule `stores` uses."""
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


def _locate_reorder_block(lines: list[str], row_order: list[str]) -> tuple[int, int]:
    """Returns (data_start, data_end) — the exclusive-end line-index bounds
    of the data rows (not the header/separator) of the ONE Next Actions
    table block whose rows' '#' cell values, as a SET, exactly equal
    set(row_order), with no duplicates and the same count. Raises
    ReorderMismatchError if zero or more than one block qualifies — never
    guesses and never reorders a partial match."""
    bounds = _find_section_bounds(lines, "next actions")
    if bounds is None:
        raise ReorderMismatchError("registry.md has no '# ... Next Actions' section")
    section_start, section_end = bounds

    wanted = set(row_order)
    matches: list[tuple[int, int]] = []
    for block_start, block_end in _find_table_block_bounds(lines, section_start, section_end):
        if block_end - block_start < 2:
            continue  # header + separator with no data rows
        header_cells = stores._split_row(lines[block_start].rstrip("\n"))
        columns = stores._resolve_columns(header_cells, stores._NEXT_ACTION_ALIASES, has_index_column=True)
        if "index" not in columns:
            continue
        index_pos = columns.index("index")
        data_start = block_start + 2
        ids: list[str] = []
        malformed = False
        for idx in range(data_start, block_end):
            cells = stores._split_row(lines[idx].rstrip("\n"))
            if len(cells) != len(columns):
                malformed = True
                break
            ids.append(cells[index_pos].strip())
        if malformed:
            continue
        if len(ids) == len(row_order) and set(ids) == wanted:
            matches.append((data_start, block_end))

    if not matches:
        raise ReorderMismatchError(f"no single Next Actions table block's rows match {row_order!r}")
    if len(matches) > 1:
        raise ReorderMismatchError(f"ambiguous: {len(matches)} blocks match {row_order!r}")
    return matches[0]


def _row_link_value(cells: list[str], columns: list[str | None]) -> str:
    if "link" not in columns:
        return ""
    return cells[columns.index("link")].strip()


def _mutate_next_action_cell(lines: list[str], row_id: str, column: str, value: str) -> tuple[list[str], str, str]:
    """Returns the new line list, the row's current `🔗 Link` cell text (so
    the caller can refuse a linked row before anything is written) and
    the cell's raw text before the edit (logged as `prev=` so undo can restore
    it) — this function only builds the replacement in memory."""
    data_idx, cells, columns = _locate_next_action_row(lines, row_id)
    link_value = _row_link_value(cells, columns)

    if column not in columns:
        raise RowNotFoundError(f"row {row_id!r}'s table has no {column!r} column")
    col_pos = columns.index(column)

    prev_value = cells[col_pos]
    new_cells = list(cells)
    new_cells[col_pos] = value
    ending = _line_ending(lines[data_idx])
    new_row_line = "| " + " | ".join(new_cells) + " |" + ending

    new_lines = list(lines)
    new_lines[data_idx] = new_row_line
    return new_lines, link_value, prev_value


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


def _verify_reorder_written(tmp_path: Path, project_id: str, row_order: list[str], baseline_skipped: int) -> None:
    registry = stores.read_registry(tmp_path, project_id)
    if len(registry.skipped_rows) > baseline_skipped:
        raise TableCorruptionError(f"{tmp_path}: the reorder produced a malformed Next Actions row")
    actual_order = [r.index.value for r in registry.next_actions if r.index.value in row_order]
    if actual_order != row_order:
        raise TableCorruptionError(f"{tmp_path}: reorder did not land in the intended sequence (got {actual_order!r})")


def _reject_unsafe_cell_value(value: str) -> None:
    if "\n" in value or "\r" in value:
        raise ValueError("a Next Actions cell value cannot contain a newline")
    if "|" in value:
        # Status/Due/Owner/Kind are short controlled-vocabulary cells, never
        # free prose (unlike Action) — an unescaped pipe here has no
        # legitimate case and would silently add a cell on the next read.
        raise ValueError("a Next Actions cell value cannot contain '|'")


# ---------------------------------------------------------------------------
# notes.md — appending one line under a named section
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
# _tracking.yaml — stamping pending_sweep: true on one project's row
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
# edits.log (this app's folder) — one line per mutation, success or refusal.
# ---------------------------------------------------------------------------


def _append_edit_log(root: Path, *, action: str, project_id: str, row: str, column: str, outcome: str, detail: str = "") -> None:
    """Deliberately outside the Memory/Medium-Term/ fence that every other
    write obeys: this path is fixed in source (never built from `project_id`,
    `row`, or any other caller-supplied value), so the class of attack the
    fence guards against — an escaping path — cannot reach it. This is one
    exact, non-configurable destination: the app's own undo record.
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
# Public API — three calls covering six edits, a reorder operation and a
# one-level undo. The four cell edits and the note are named fields only (no
# positional API); reorder moves whole Next Actions lines without changing any
# cell; undo re-issues `set_cell` with the value the log recorded.
# ---------------------------------------------------------------------------


def set_cell(
    root: Path, *, project_id: str, row: str | int, column: str, value: str, mtime: float, _log_action: str = "set_cell"
) -> EditResult:
    """Edits 1-4: Status, Due, Owner or Kind on one existing Next Actions row.

    `_log_action` is private to this module: `undo_last` passes "undo_set_cell"
    so an undo is its own log action (and so is never itself undoable) while
    sharing every guard below rather than copying them."""
    if column not in _EDIT_COLUMNS:
        raise ValueError(f"unknown column {column!r}; must be one of {_EDIT_COLUMNS}")
    _reject_unsafe_cell_value(value)

    row_id = str(row)
    medium_term = _medium_term_root(root)
    try:
        registry_path = _find_project_registry_path(root, project_id)
    except (FenceError, ProjectNotFoundError) as exc:
        _log_refusal(root, action=_log_action, project_id=project_id, row=row_id, column=column, outcome=f"refused:{type(exc).__name__}")
        raise

    try:
        _check_mtime(registry_path, mtime)
    except StaleMtimeError:
        _log_refusal(root, action=_log_action, project_id=project_id, row=row_id, column=column, outcome="refused:stale_mtime")
        raise

    baseline = stores.read_registry(registry_path, project_id)
    baseline_skipped = len(baseline.skipped_rows)

    lines = _read_lines(registry_path)
    try:
        new_lines, link_value, prev_value = _mutate_next_action_cell(lines, row_id, column, value)
    except RowNotFoundError:
        _log_refusal(root, action=_log_action, project_id=project_id, row=row_id, column=column, outcome="refused:row_not_found")
        raise

    if link_value not in _UNLINKED_VALUES:
        _log_refusal(root, action=_log_action, project_id=project_id, row=row_id, column=column, outcome="refused:linked_row")
        raise LinkedRowError(f"row {row_id!r} is linked ({link_value!r}); it is edited through its canonical copy")

    _atomic_write_verified(
        registry_path, "".join(new_lines),
        verify=lambda p: _verify_cell_written(p, project_id, row_id, column, value, baseline_skipped),
    )

    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    _stamp_pending_sweep(tracking_path, project_id)

    new_mtime = registry_path.stat().st_mtime
    _append_edit_log(root, action=_log_action, project_id=project_id, row=row_id, column=column, outcome="ok", detail=f"value={value!r} prev={prev_value!r}")
    return EditResult(ok=True, project_id=project_id, row=row_id, column=column, value=value, mtime=new_mtime)


def append_note(root: Path, *, project_id: str, section: str, text: str, mtime: float) -> NoteResult:
    """Edit 5: append one line under a named notes.md section. `section`
    must be one of exactly scraps/constraints/reference/guidance —
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


def reorder_next_actions(root: Path, *, project_id: str, row_order: list[str], mtime: float) -> ReorderResult:
    """Reorders the data rows of ONE Next Actions table block to match
    row_order exactly. Every row's own cells are carried through unchanged —
    only line position moves. Reuses the same fence / mtime / re-parse-verify
    / record guards set_cell already uses."""
    if len(row_order) < 2:
        raise ValueError("row_order must name at least 2 rows")
    row_order = [str(r) for r in row_order]
    if len(set(row_order)) != len(row_order):
        raise ValueError("row_order must not contain duplicate row ids")

    medium_term = _medium_term_root(root)
    row_label = ",".join(row_order)
    try:
        registry_path = _find_project_registry_path(root, project_id)
    except (FenceError, ProjectNotFoundError) as exc:
        _log_refusal(root, action="reorder_next_actions", project_id=project_id, row=row_label, column="-", outcome=f"refused:{type(exc).__name__}")
        raise

    try:
        _check_mtime(registry_path, mtime)
    except StaleMtimeError:
        _log_refusal(root, action="reorder_next_actions", project_id=project_id, row=row_label, column="-", outcome="refused:stale_mtime")
        raise

    baseline = stores.read_registry(registry_path, project_id)
    baseline_skipped = len(baseline.skipped_rows)

    lines = _read_lines(registry_path)
    try:
        data_start, data_end = _locate_reorder_block(lines, row_order)
    except ReorderMismatchError:
        _log_refusal(root, action="reorder_next_actions", project_id=project_id, row=row_label, column="-", outcome="refused:reorder_mismatch")
        raise

    header_cells = stores._split_row(lines[data_start - 2].rstrip("\n"))
    columns = stores._resolve_columns(header_cells, stores._NEXT_ACTION_ALIASES, has_index_column=True)
    index_pos = columns.index("index")

    id_to_line: dict[str, str] = {}
    for idx in range(data_start, data_end):
        cells = stores._split_row(lines[idx].rstrip("\n"))
        id_to_line[cells[index_pos].strip()] = lines[idx]

    new_block_lines = [id_to_line[row_id] for row_id in row_order]
    new_lines = lines[:data_start] + new_block_lines + lines[data_end:]

    _atomic_write_verified(
        registry_path, "".join(new_lines),
        verify=lambda p: _verify_reorder_written(p, project_id, row_order, baseline_skipped),
    )

    tracking_path = _ensure_within(root / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml", medium_term)
    _stamp_pending_sweep(tracking_path, project_id)

    new_mtime = registry_path.stat().st_mtime
    _append_edit_log(root, action="reorder_next_actions", project_id=project_id, row=row_label, column="-", outcome="ok")
    return ReorderResult(ok=True, project_id=project_id, row_order=row_order, mtime=new_mtime)


# ---------------------------------------------------------------------------
# Undo — one level, `set_cell` only (wishlist #1).
#
# The log is the only record of what was written, so `set_cell` records the
# cell's old text (`prev=`) and this section reads it back. Undo never has a
# write path of its own: it calls `set_cell`, so the fence, mtime guard,
# re-parse guard, pending-sweep stamp and log line all come along. The client
# names only a project and an mtime; WHAT is undone is re-derived here from the
# log, never trusted from the request.
# ---------------------------------------------------------------------------

_WRITE_ACTIONS = ("set_cell", "append_note", "reorder_next_actions", "undo_set_cell")

_QUOTED = r"""(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")"""
_LOG_LINE_RE = re.compile(
    r"^\[(?P<at>[^\]]+)\] (?P<action>\w+) project=(?P<project>\S+) row=(?P<row>\S*) "
    r"column=(?P<column>\S+) outcome=(?P<outcome>\S+)(?: detail=(?P<detail>.*))?$"
)
_SET_DETAIL_RE = re.compile(rf"^value=(?P<value>{_QUOTED})(?: prev=(?P<prev>{_QUOTED}))?$")


@dataclass(frozen=True)
class WriteEntry:
    """One successful write line from `edits.log`. `value` and `prev` are only
    ever set for `set_cell` / `undo_set_cell`; `prev` is None on a line written
    before `prev=` was logged."""

    at: str
    action: str
    project_id: str
    row: str
    column: str
    value: str | None
    prev: str | None


def _literal(quoted: str | None) -> str | None:
    # `ast.literal_eval` on a repr we wrote ourselves — never `eval`.
    if quoted is None:
        return None
    try:
        out = ast.literal_eval(quoted)
    except (ValueError, SyntaxError):
        return None
    return out if isinstance(out, str) else None


def _parse_edit_log_line(line: str) -> WriteEntry | None:
    """A successful write line as a WriteEntry, or None for anything else:
    a refusal, a legacy `[BROWSER: ...]` line, a non-write action, junk."""
    m = _LOG_LINE_RE.match(line.rstrip("\n"))
    if not m or m.group("outcome") != "ok" or m.group("action") not in _WRITE_ACTIONS:
        return None
    value = prev = None
    if m.group("action") in ("set_cell", "undo_set_cell") and m.group("detail"):
        d = _SET_DETAIL_RE.match(m.group("detail"))
        if d:
            value, prev = _literal(d.group("value")), _literal(d.group("prev"))
    return WriteEntry(
        at=m.group("at"), action=m.group("action"), project_id=m.group("project"),
        row=m.group("row"), column=m.group("column"), value=value, prev=prev,
    )


def _latest_write_entry(root: Path) -> WriteEntry | None:
    path = root.joinpath(*_EDITS_LOG_RELATIVE)
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return None
    for line in reversed(lines):
        entry = _parse_edit_log_line(line)
        if entry is not None:
            return entry
    return None


def _undo_block_reason(entry: WriteEntry | None) -> str | None:
    """Why `entry` cannot be undone, in plain words — None when it can."""
    if entry is None:
        return "No edit has been logged yet."
    if entry.action == "append_note":
        return "The last change was a note, and notes can't be undone."
    if entry.action == "reorder_next_actions":
        return "The last change was a reorder, and reorders can't be undone."
    if entry.action == "undo_set_cell":
        return "The last change was an undo, and undo only goes back one step."
    if entry.prev is None or entry.value is None:
        return "The last change was made before undo existed, so its old value wasn't recorded."
    if "|" in entry.prev or "\n" in entry.prev or "\r" in entry.prev:
        return "The old value can't be written back safely."
    return None


def _current_cell_text(registry_path: Path, row_id: str, column: str) -> str:
    lines = _read_lines(registry_path)
    _idx, cells, columns = _locate_next_action_row(lines, row_id)
    if column not in columns:
        raise RowNotFoundError(f"row {row_id!r}'s table has no {column!r} column")
    return cells[columns.index(column)]


def undo_state(root: Path) -> dict:
    """Read-only: what an undo would do right now, for the button's label.
    `available` is False whenever `undo_last` would refuse for a reason that
    can be seen without writing (nothing to undo, or the cell has since
    changed); the stale-mtime and linked-row refusals are left to the call."""
    entry = _latest_write_entry(root)
    state: dict = {"available": False, "project_id": None, "row": None, "column": None,
                   "value": None, "prev": None, "at": None, "reason": None}
    if entry is not None:
        state.update(project_id=entry.project_id, row=entry.row, column=entry.column,
                     value=entry.value, prev=entry.prev, at=entry.at)
    reason = _undo_block_reason(entry)
    if reason is None:
        try:
            current = _current_cell_text(_find_project_registry_path(root, entry.project_id), entry.row, entry.column)
        except WritesError:
            reason = "That row can no longer be found."
        else:
            if current.strip() != entry.value.strip():
                reason = "That cell has changed since, so there is nothing safe to undo."
    state["reason"] = reason
    state["available"] = reason is None
    return state


def undo_last(root: Path, *, project_id: str, mtime: float) -> EditResult:
    """Restore the cell changed by the most recent successful write, if that
    write was a `set_cell` whose old value was logged and the cell still holds
    what that write put there. Every refusal writes nothing."""
    entry = _latest_write_entry(root)

    def refuse(exc: WritesError, outcome: str) -> WritesError:
        _log_refusal(root, action="undo_set_cell", project_id=project_id,
                     row=entry.row if entry else "-", column=entry.column if entry else "-", outcome=outcome)
        return exc

    reason = _undo_block_reason(entry)
    if reason is not None:
        raise refuse(UndoUnavailableError(reason), "refused:UndoUnavailableError")
    if entry.project_id != project_id:
        raise refuse(UndoUnavailableError(f"The last change was in {entry.project_id}, not {project_id}."),
                     "refused:UndoUnavailableError")

    try:
        registry_path = _find_project_registry_path(root, project_id)
    except (FenceError, ProjectNotFoundError) as exc:
        raise refuse(exc, f"refused:{type(exc).__name__}")
    try:
        _check_mtime(registry_path, mtime)
    except StaleMtimeError as exc:
        raise refuse(exc, "refused:stale_mtime")

    try:
        current = _current_cell_text(registry_path, entry.row, entry.column)
    except RowNotFoundError as exc:
        raise refuse(exc, "refused:row_not_found")
    if current.strip() != entry.value.strip():
        raise refuse(UndoConflictError(f"row {entry.row!r} {entry.column!r} now reads {current!r}, not {entry.value!r}"),
                     "refused:UndoConflictError")

    return set_cell(root, project_id=project_id, row=entry.row, column=entry.column,
                    value=entry.prev, mtime=mtime, _log_action="undo_set_cell")
