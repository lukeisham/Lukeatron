"""Topical Types — Luke's own labels for the Topical grouping, created and filled from the app.
The only module outside the seed pipeline that writes rhetoric.db, and it writes only the two
topical_* tables (a granted exception, app-decisions.md). server.py routes to it; items.py reads
the tree through `topical_tree`. Routing holds no SQL (API-1)."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

# The derived "Unsorted" heading sits beside the real Types; app/state.js mirrors this id.
# Real Type ids start at 1 (AUTOINCREMENT), so 0 can never collide.
UNSORTED_ID = 0
UNSORTED_NAME = "Unsorted"
UNSORTED_DEFINITION = "not yet placed under a Type"


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
    """Roots in the same shape as the other trees: one node per Type in Luke's order, each with its
    devices in Luke's order, then a derived Unsorted node (devices in `ordered_device_ids` order)
    when any device is unplaced."""
    types = conn.execute("SELECT id, name FROM topical_types ORDER BY position, id").fetchall()
    placed: dict[int, list[int]] = {type_id: [] for type_id, _ in types}
    for type_id, device_id in conn.execute(
        "SELECT type_id, device_id FROM topical_placements ORDER BY type_id, position, device_id"
    ):
        placed[type_id].append(device_id)

    roots = [_node(type_id, name, "", placed[type_id]) for type_id, name in types]
    placed_anywhere = {device_id for devices in placed.values() for device_id in devices}
    unsorted = [d for d in ordered_device_ids if d not in placed_anywhere]
    if unsorted:
        roots.append(_node(UNSORTED_ID, UNSORTED_NAME, UNSORTED_DEFINITION, unsorted))
    return roots


def _node(node_id: int, name: str, definition: str, device_ids: list[int]) -> dict[str, Any]:
    return {
        "kind": "node", "id": node_id, "name": name, "definition": definition,
        "children": [{"kind": "device", "id": device_id} for device_id in device_ids],
    }


def create_type(db_path: Path, name: str) -> None:
    """The new Type goes last."""
    with closing(connect_writable(db_path)) as conn, conn:
        try:
            conn.execute(
                "INSERT INTO topical_types (name, position) "
                "VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM topical_types))",
                (name,),
            )
        except sqlite3.IntegrityError as exc:
            raise TopicalError("conflict") from exc


def rename_type(db_path: Path, type_id: int, name: str) -> None:
    with closing(connect_writable(db_path)) as conn, conn:
        try:
            renamed = conn.execute("UPDATE topical_types SET name = ? WHERE id = ?", (name, type_id)).rowcount
        except sqlite3.IntegrityError as exc:
            raise TopicalError("conflict") from exc
        if renamed == 0:
            raise TopicalError("not_found")


def delete_type(db_path: Path, type_id: int) -> None:
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("DELETE FROM topical_types WHERE id = ?", (type_id,)).rowcount == 0:
            raise TopicalError("not_found")


def move_type(db_path: Path, type_id: int, index: int) -> None:
    """Puts the Type at `index` among the Types (0 = first); an index past the end means last."""
    with closing(connect_writable(db_path)) as conn, conn:
        ordered = [row[0] for row in conn.execute("SELECT id FROM topical_types ORDER BY position, id")]
        if type_id not in ordered:
            raise TopicalError("not_found")
        ordered.remove(type_id)
        ordered.insert(index, type_id)
        conn.executemany("UPDATE topical_types SET position = ? WHERE id = ?",
                         [(position, moved) for position, moved in enumerate(ordered)])


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
