"""Reopen a Done recurring Next Action on its own cadence.

A Next Actions row carrying a stated `recurring_if_done` cadence
("weekly-tue" | "monthly-1st") that is currently marked Done is reset back
to Open the moment this script runs WITH that matching cadence, and its Due
cell rolls forward to the next occurrence of that cadence. This script never
guesses which cadence "now" is — the caller (a cron-scheduled task, one per
cadence) says which one fired, the same way `writes.set_cell` never guesses
which column an edit means (writes.py FR-1).

Reuses `stores.load_board_sources` (read) and, for the write itself,
`server.set_cell_for_script` — a thin pass-through to the same
`writes.set_cell` the browser's own "tick done" edit calls (README.md
D-15/D-16). This module never imports `writes` directly: `writes` is
imported by `server.py` alone, on the whole Python side (FR-9,
`test_server.TestImport.test_imports_writes_and_no_other_module_does`), and
`set_cell_for_script` is the one exception server.py grants a second
caller. Kept as its own script, not a sixth in-app edit path, because a
cadence firing later is a different kind of write than the five edits the
browser already owns (README.md D-16).
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import paths
import server
import stores

CADENCE_WEEKLY_TUE = "weekly-tue"
CADENCE_MONTHLY_1ST = "monthly-1st"
_KNOWN_CADENCES = (CADENCE_WEEKLY_TUE, CADENCE_MONTHLY_1ST)


def _next_occurrence(cadence: str, today: date) -> date:
    """The next date this cadence fires ON OR AFTER `today` — "on" so a
    reset that runs on the cadence's own day doesn't skip straight past it
    to the following cycle."""
    if cadence == CADENCE_WEEKLY_TUE:
        days_ahead = (1 - today.weekday()) % 7  # Monday=0 ... Tuesday=1
        return today + timedelta(days=days_ahead)
    if cadence == CADENCE_MONTHLY_1ST:
        if today.day == 1:
            return today
        if today.month == 12:
            return date(today.year + 1, 1, 1)
        return date(today.year, today.month + 1, 1)
    raise ValueError(f"unknown cadence {cadence!r}; must be one of {_KNOWN_CADENCES}")


@dataclass(frozen=True)
class ResetOutcome:
    project_id: str
    row_id: str
    action: str
    new_due: date


def reset_recurring(root: Path, cadence: str, today: date) -> list[ResetOutcome]:
    """Reset every Done row whose `recurring_if_done` matches `cadence`,
    across every tracked project, rolling its Due to the next occurrence.
    A row that is still Open, or whose cadence doesn't match, is untouched —
    this only ever reopens, never closes or reschedules a live row."""
    if cadence not in _KNOWN_CADENCES:
        raise ValueError(f"unknown cadence {cadence!r}; must be one of {_KNOWN_CADENCES}")

    sources = stores.load_board_sources(root)
    next_due = _next_occurrence(cadence, today)
    outcomes: list[ResetOutcome] = []

    for source in sources.projects:
        registry = source.registry
        project_id = source.tracking.id.value or registry.project_id
        current_mtime = registry.mtime
        for row in registry.next_actions:
            if not row.recurring_if_done.stated or row.recurring_if_done.value != cadence:
                continue
            if not (row.status.stated and "☑" in (row.status.value or "")):
                continue  # still open — nothing to reopen
            row_id = row.index.value or ""
            status_result = server.set_cell_for_script(
                root, project_id=project_id, row=row_id, column="status", value="☐ Open", mtime=current_mtime,
            )
            current_mtime = status_result.mtime
            due_result = server.set_cell_for_script(
                root, project_id=project_id, row=row_id, column="due", value=next_due.isoformat(), mtime=current_mtime,
            )
            current_mtime = due_result.mtime
            outcomes.append(
                ResetOutcome(project_id=project_id, row_id=row_id, action=row.action.value or "", new_due=next_due)
            )

    return outcomes


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in _KNOWN_CADENCES:
        print(f"usage: python3 recur.py <{'|'.join(_KNOWN_CADENCES)}>", file=sys.stderr)
        return 2
    root = paths.find_lukeatron_root()
    outcomes = reset_recurring(root, argv[1], date.today())
    if not outcomes:
        print(f"recur.py {argv[1]}: nothing to reset")
        return 0
    for outcome in outcomes:
        print(
            f"recur.py {argv[1]}: reopened {outcome.project_id} #{outcome.row_id} "
            f'"{outcome.action}" — due {outcome.new_due.isoformat()}'
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
