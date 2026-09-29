"""Loads Luke's three hand-authored Type-layer outlines into `nodes` (seed-pipeline FR-2).

The pipeline reads this content and never generates it: a node exists only because a line of
an outline names it. Category's top-level lines must be roots seeded by category_roots.py (they
carry a name only; their definitions come from the source database). Form and Function
top-level lines create their roots.

All three outlines are validated before anything is written, and the write is one transaction.
Re-running applies edited definitions and new lines; a node in the database that an outline no
longer lists is reported and left in place, never deleted.

Run: python3 -m seed.type_layers            (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

from seed.db import APP_DIR, DB_PATH, open_database
from seed.type_outline import Entry, OutlineError, parse_outline

OUTLINE_DIR = APP_DIR / "seed" / "type-layers"
HIERARCHIES = ("category", "form", "function")


def outline_path(hierarchy: str) -> Path:
    return OUTLINE_DIR / f"{hierarchy}.md"


def validate(hierarchy: str, entries: list[Entry], category_roots: set[str]) -> list[str]:
    """Every problem with one outline, as messages; empty means loadable."""
    problems: list[str] = []
    seen: set[tuple[str, ...]] = set()
    for entry in entries:
        where = f"{hierarchy}.md line {entry.line}"
        if entry.path in seen:
            problems.append(f"{where}: {entry.name!r} appears twice under the same parent")
        seen.add(entry.path)
        is_category_root = hierarchy == "category" and entry.depth == 0
        if is_category_root:
            if entry.name not in category_roots:
                problems.append(f"{where}: {entry.name!r} is not one of the 8 seeded Category roots")
            if entry.definition:
                problems.append(f"{where}: a Category root takes its definition from the source database — remove the text after the name")
        elif not entry.definition:
            problems.append(f"{where}: {entry.name!r} needs a definition ('- Name — definition')")
    return problems


def load_hierarchy(conn: sqlite3.Connection, hierarchy: str, entries: list[Entry]) -> None:
    """Upsert each entry under its parent, top-down so parents exist first. Caller owns the transaction."""
    ids: dict[tuple[str, ...], int] = {}
    for entry in entries:
        parent_id = ids[entry.path[:-1]] if entry.depth else None
        row = conn.execute(
            "SELECT id, definition FROM nodes WHERE hierarchy = ? AND name = ? AND parent_id IS ?",
            (hierarchy, entry.name, parent_id),
        ).fetchone()
        if row is None:
            node_id = conn.execute(
                "INSERT INTO nodes (hierarchy, parent_id, name, definition) VALUES (?, ?, ?, ?)",
                (hierarchy, parent_id, entry.name, entry.definition),
            ).lastrowid
        else:
            node_id = row[0]
            keeps_source_definition = hierarchy == "category" and entry.depth == 0
            if not keeps_source_definition and row[1] != entry.definition:
                conn.execute("UPDATE nodes SET definition = ? WHERE id = ?", (entry.definition, node_id))
        ids[entry.path] = node_id


def db_paths(conn: sqlite3.Connection, hierarchy: str) -> set[tuple[str, ...]]:
    """Every node of a hierarchy as a name path from its root."""
    rows = conn.execute("SELECT id, parent_id, name FROM nodes WHERE hierarchy = ?", (hierarchy,)).fetchall()
    by_id = {node_id: (parent_id, name) for node_id, parent_id, name in rows}

    def path(node_id: int) -> tuple[str, ...]:
        parent_id, name = by_id[node_id]
        return (*path(parent_id), name) if parent_id is not None else (name,)

    return {path(node_id) for node_id in by_id}


def unlisted_nodes(conn: sqlite3.Connection, hierarchy: str, entries: list[Entry]) -> list[tuple[str, ...]]:
    """Database nodes the outline no longer lists (AC-2's 'exactly Luke's structure' check).
    Category roots Luke chose not to list are expected, not extra."""
    listed = {entry.path for entry in entries}
    extra = db_paths(conn, hierarchy) - listed
    if hierarchy == "category":
        extra = {path for path in extra if len(path) > 1}
    return sorted(extra)


def read_outlines() -> dict[str, list[Entry]]:
    return {h: parse_outline(outline_path(h).read_text()) for h in HIERARCHIES}


def main() -> None:
    try:
        outlines = read_outlines()
    except (OSError, OutlineError) as exc:
        print(f"[seed] {exc}", file=sys.stderr)
        sys.exit(1)
    conn = open_database()
    roots = {r[0] for r in conn.execute(
        "SELECT name FROM nodes WHERE hierarchy = 'category' AND parent_id IS NULL")}
    problems = [p for h in HIERARCHIES for p in validate(h, outlines[h], roots)]
    if problems:
        print("[seed] nothing written — fix these lines first:", *problems, sep="\n  ", file=sys.stderr)
        sys.exit(1)
    with conn:
        for hierarchy in HIERARCHIES:
            load_hierarchy(conn, hierarchy, outlines[hierarchy])
    extra = {h: unlisted_nodes(conn, h, outlines[h]) for h in HIERARCHIES}
    for hierarchy in HIERARCHIES:
        count = conn.execute("SELECT COUNT(*) FROM nodes WHERE hierarchy = ?", (hierarchy,)).fetchone()[0]
        print(f"[seed] {hierarchy}: {count} nodes in {DB_PATH.name}")
    if any(extra.values()):
        for hierarchy, paths in extra.items():
            for path in paths:
                print(f"[seed] {hierarchy}: in the database but not in the outline (left in place): {' > '.join(path)}", file=sys.stderr)
        sys.exit(1)
    conn.close()


if __name__ == "__main__":
    main()
