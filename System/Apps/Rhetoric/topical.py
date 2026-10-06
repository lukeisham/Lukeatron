"""Topical Types — Luke's own labels for the Topical grouping, created and filled from the app.
The only module outside the seed pipeline that writes rhetoric.db (with grammar.py), and it writes only the two
topical_* tables (a granted exception, app-decisions.md). server.py routes to it; items.py reads
the tree through `topical_tree`. Routing holds no SQL (API-1).

Types nest at most five levels deep (a top-level Type, then four more below it), as Grammar's labels do, and each has
an explanation (`definition`) as a Grammar label does.
A device may be filed under any number of Types, at any level."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

import labeltables
import labeltree

# The derived "Unsorted" heading sits beside the real Types; app/state.js mirrors this id.
# Real Type ids start at 1 (AUTOINCREMENT), so 0 can never collide.
UNSORTED_ID = 0
UNSORTED_NAME = "Unsorted"
UNSORTED_DEFINITION = "not yet placed under a Type"
TABLE = "topical_types"
MAX_DEPTH = 5  # levels of Types; mirrors MAX_LABEL_DEPTH in app/state.js and grammar.MAX_DEPTH


class TopicalError(Exception):
    """A refused change; `code` is a server.py error-registry key."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def connect_writable(db_path: Path) -> sqlite3.Connection:
    """`mode=rw` never creates a file, so a missing database stays a clean db_unavailable."""
    conn = sqlite3.connect(f"file:{db_path}?mode=rw", uri=True)
    conn.execute("PRAGMA foreign_keys = ON")  # SQL-8; also what makes deleting a Type cascade
    return conn


def topical_tree(conn: sqlite3.Connection, ordered_device_ids: list[int]) -> list[dict[str, Any]]:
    """Roots in the same shape as the other trees: one node per top-level Type in Luke's order, each with its
    sub-Types (in Luke's order) first, then its devices (in Luke's order), then a derived Unsorted node
    (devices in `ordered_device_ids` order) when any device is unplaced under any Type."""
    built: dict[int, dict[str, Any]] = {}
    parents: list[tuple[int, int | None]] = []
    for type_id, parent_id, name, definition, tables in conn.execute(
        "SELECT id, parent_id, name, definition, tables_json FROM topical_types ORDER BY position, id"
    ):
        built[type_id] = _node(type_id, name, definition, [], labeltables.parse(tables))
        parents.append((type_id, parent_id))
    roots = []
    for type_id, parent_id in parents:
        (built[parent_id]["children"] if parent_id in built else roots).append(built[type_id])
    placed_anywhere: set[int] = set()
    for type_id, device_id in conn.execute(
        "SELECT type_id, device_id FROM topical_placements ORDER BY type_id, position, device_id"
    ):
        built[type_id]["children"].append({"kind": "device", "id": device_id})
        placed_anywhere.add(device_id)

    unsorted = [d for d in ordered_device_ids if d not in placed_anywhere]
    if unsorted:
        roots.append(_node(UNSORTED_ID, UNSORTED_NAME, UNSORTED_DEFINITION, unsorted))
    return roots


def _node(node_id: int, name: str, definition: str, device_ids: list[int], tables: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {
        "kind": "node", "id": node_id, "name": name, "definition": definition, "tables": tables or [],
        "children": [{"kind": "device", "id": device_id} for device_id in device_ids],
    }


def create_type(db_path: Path, name: str, parent_id: int | None = None, definition: str = "") -> None:
    """The new Type goes last among its siblings, under `parent_id` or at the top. (server.py always requires an
    explanation; the default here is only for callers that build Types without one.)"""
    with closing(connect_writable(db_path)) as conn, conn:
        if labeltree.depth(conn, TABLE, parent_id, TopicalError) >= MAX_DEPTH:
            raise TopicalError("bad_request")  # a sixth level is refused
        if labeltree.taken(conn, TABLE, parent_id, name):
            raise TopicalError("conflict")
        conn.execute(
            "INSERT INTO topical_types (parent_id, name, definition, position) VALUES "
            "(?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM topical_types WHERE parent_id IS ?))",
            (parent_id, name, definition, parent_id),
        )


def edit_type(db_path: Path, type_id: int, name: str, definition: str | None = None) -> None:
    """Renames the Type and, unless `definition` is None, replaces its explanation."""
    with closing(connect_writable(db_path)) as conn, conn:
        row = conn.execute("SELECT parent_id FROM topical_types WHERE id = ?", (type_id,)).fetchone()
        if row is None:
            raise TopicalError("not_found")
        if labeltree.taken(conn, TABLE, row[0], name, except_id=type_id):
            raise TopicalError("conflict")
        if definition is None:
            conn.execute("UPDATE topical_types SET name = ? WHERE id = ?", (name, type_id))
        else:
            conn.execute("UPDATE topical_types SET name = ?, definition = ? WHERE id = ?", (name, definition, type_id))


def set_tables(db_path: Path, type_id: int, tables: list[dict[str, Any]]) -> None:
    """Replaces the Type's tables with `tables` (already `labeltables.clean`ed; the server does that)."""
    with closing(connect_writable(db_path)) as conn, conn:
        labeltables.save(conn, TABLE, type_id, tables, TopicalError)


def delete_type(db_path: Path, type_id: int) -> None:
    """Refused while the Type has sub-Types (they would be lost with it); its device placements go with it."""
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("SELECT 1 FROM topical_types WHERE id = ?", (type_id,)).fetchone() is None:
            raise TopicalError("not_found")
        if conn.execute("SELECT 1 FROM topical_types WHERE parent_id = ?", (type_id,)).fetchone() is not None:
            raise TopicalError("conflict")
        conn.execute("DELETE FROM topical_types WHERE id = ?", (type_id,))


def move_type(db_path: Path, type_id: int, index: int, parent_id: int | None = None) -> None:
    """Puts the Type at `index` among its siblings (0 = first; past the end = last). `parent_id` None keeps its
    parent, 0 moves it (with everything beneath it) to the top level, any other id moves it under that Type
    (see labeltree.move for what is refused)."""
    with closing(connect_writable(db_path)) as conn, conn:
        labeltree.move(conn, TABLE, type_id, index, MAX_DEPTH, TopicalError, parent_id)


def add_placement(db_path: Path, type_id: int, device_id: int, index: int | None = None) -> None:
    """Places the device under the Type, last by default. A device already there stays put unless
    `index` is given, which puts it at that spot among the Type's devices (so this is also the move)."""
    with closing(connect_writable(db_path)) as conn, conn:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO topical_placements (type_id, device_id, position) VALUES "
                "(?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM topical_placements WHERE type_id = ?))",
                (type_id, device_id, type_id),
            )
        except sqlite3.IntegrityError as exc:  # foreign key: unknown Type or device
            raise TopicalError("not_found") from exc
        if index is None:
            return
        ordered = [row[0] for row in conn.execute(
            "SELECT device_id FROM topical_placements WHERE type_id = ? ORDER BY position, device_id", (type_id,))]
        ordered.remove(device_id)
        ordered.insert(index, device_id)
        conn.executemany("UPDATE topical_placements SET position = ? WHERE type_id = ? AND device_id = ?",
                         [(position, type_id, moved) for position, moved in enumerate(ordered)])


def remove_placement(db_path: Path, type_id: int, device_id: int) -> None:
    """Idempotent, but an unknown Type is still an error so a stale page learns it is stale."""
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("SELECT 1 FROM topical_types WHERE id = ?", (type_id,)).fetchone() is None:
            raise TopicalError("not_found")
        conn.execute(
            "DELETE FROM topical_placements WHERE type_id = ? AND device_id = ?", (type_id, device_id)
        )
