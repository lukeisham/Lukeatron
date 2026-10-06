"""Grammar labels — Luke's own labels for the Grammar group, created and filled from the app.
Like topical.py it writes only its own two tables (`grammar_labels`, `grammar_placements`), a granted
exception (app-decisions.md); server.py routes to it and items.py reads the tree through `grammar_tree`.
Routing holds no SQL (API-1).

A label is a grammatical term with an explanation (`definition`). Labels nest at most four levels
deep (a top-level label, then three more below it). A device may be filed under any number
of labels, at any level, so it can sit under a label and under one of that label's sub-labels too."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

HIERARCHY = "grammar"  # the Grammar group files devices under the grammar-label tree
MAX_DEPTH = 4  # levels: top-level, then three below; mirrors MAX_LABEL_DEPTH in app/state.js


class GrammarError(Exception):
    """A refused change; `code` is a server.py error-registry key."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def connect_writable(db_path: Path) -> sqlite3.Connection:
    """`mode=rw` never creates a file, so a missing database stays a clean db_unavailable."""
    conn = sqlite3.connect(f"file:{db_path}?mode=rw", uri=True)
    conn.execute("PRAGMA foreign_keys = ON")  # SQL-8; also what makes deleting a label remove its placements
    return conn


def grammar_tree(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Roots in the same shape as the other trees: each label's sub-labels (in Luke's order) first,
    then its devices (in Luke's order). Every label is kept, empty or not, so it can be filled."""
    built: dict[int, dict[str, Any]] = {}
    parents: list[tuple[int, int | None]] = []
    for label_id, parent_id, name, definition in conn.execute(
        "SELECT id, parent_id, name, definition FROM grammar_labels ORDER BY position, id"
    ):
        built[label_id] = {"kind": "node", "id": label_id, "name": name, "definition": definition, "children": []}
        parents.append((label_id, parent_id))
    roots = []
    for label_id, parent_id in parents:
        (built[parent_id]["children"] if parent_id in built else roots).append(built[label_id])
    for label_id, device_id in conn.execute(
        "SELECT label_id, device_id FROM grammar_placements ORDER BY label_id, position, device_id"
    ):
        built[label_id]["children"].append({"kind": "device", "id": device_id})
    return roots


def _depth(conn: sqlite3.Connection, label_id: int | None) -> int:
    """Levels from the top down to and including this label; 0 for no label (the top of the tree)."""
    depth = 0
    while label_id is not None:
        row = conn.execute("SELECT parent_id FROM grammar_labels WHERE id = ?", (label_id,)).fetchone()
        if row is None:
            raise GrammarError("not_found")
        depth += 1
        label_id = row[0]
    return depth


def _taken(conn: sqlite3.Connection, parent_id: int | None, name: str, except_id: int | None = None) -> bool:
    """Whether a sibling already has this name (case-blind), as Types do."""
    return conn.execute(
        "SELECT 1 FROM grammar_labels WHERE parent_id IS ? AND lower(name) = lower(?) AND id IS NOT ?",
        (parent_id, name, except_id),
    ).fetchone() is not None


def create_label(db_path: Path, name: str, definition: str, parent_id: int | None = None) -> None:
    """The new label goes last among its siblings, under `parent_id` or at the top."""
    with closing(connect_writable(db_path)) as conn, conn:
        if _depth(conn, parent_id) >= MAX_DEPTH:
            raise GrammarError("bad_request")  # a fifth level is refused
        if _taken(conn, parent_id, name):
            raise GrammarError("conflict")
        conn.execute(
            "INSERT INTO grammar_labels (parent_id, name, definition, position) VALUES "
            "(?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM grammar_labels WHERE parent_id IS ?))",
            (parent_id, name, definition, parent_id),
        )


def edit_label(db_path: Path, label_id: int, name: str, definition: str) -> None:
    with closing(connect_writable(db_path)) as conn, conn:
        row = conn.execute("SELECT parent_id FROM grammar_labels WHERE id = ?", (label_id,)).fetchone()
        if row is None:
            raise GrammarError("not_found")
        if _taken(conn, row[0], name, except_id=label_id):
            raise GrammarError("conflict")
        conn.execute("UPDATE grammar_labels SET name = ?, definition = ? WHERE id = ?", (name, definition, label_id))


def delete_label(db_path: Path, label_id: int) -> None:
    """Refused while the label has sub-labels (they would be lost with it); its device placements go with it."""
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("SELECT 1 FROM grammar_labels WHERE id = ?", (label_id,)).fetchone() is None:
            raise GrammarError("not_found")
        if conn.execute("SELECT 1 FROM grammar_labels WHERE parent_id = ?", (label_id,)).fetchone() is not None:
            raise GrammarError("conflict")
        conn.execute("DELETE FROM grammar_labels WHERE id = ?", (label_id,))


def move_label(db_path: Path, label_id: int, index: int) -> None:
    """Puts the label at `index` among its siblings (0 = first); an index past the end means last."""
    with closing(connect_writable(db_path)) as conn, conn:
        row = conn.execute("SELECT parent_id FROM grammar_labels WHERE id = ?", (label_id,)).fetchone()
        if row is None:
            raise GrammarError("not_found")
        ordered = [r[0] for r in conn.execute(
            "SELECT id FROM grammar_labels WHERE parent_id IS ? ORDER BY position, id", (row[0],))]
        ordered.remove(label_id)
        ordered.insert(index, label_id)
        conn.executemany("UPDATE grammar_labels SET position = ? WHERE id = ?",
                         [(position, moved) for position, moved in enumerate(ordered)])


def add_placement(db_path: Path, label_id: int, device_id: int, index: int | None = None) -> None:
    """Files the device under the label, last by default. A device already there stays put unless
    `index` is given, which puts it at that spot among the label's devices (so this is also the move)."""
    with closing(connect_writable(db_path)) as conn, conn:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO grammar_placements (label_id, device_id, position) VALUES "
                "(?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM grammar_placements WHERE label_id = ?))",
                (label_id, device_id, label_id),
            )
        except sqlite3.IntegrityError as exc:  # foreign key: unknown label or device
            raise GrammarError("not_found") from exc
        if index is None:
            return
        ordered = [row[0] for row in conn.execute(
            "SELECT device_id FROM grammar_placements WHERE label_id = ? ORDER BY position, device_id", (label_id,))]
        ordered.remove(device_id)
        ordered.insert(index, device_id)
        conn.executemany("UPDATE grammar_placements SET position = ? WHERE label_id = ? AND device_id = ?",
                         [(position, label_id, moved) for position, moved in enumerate(ordered)])


def remove_placement(db_path: Path, label_id: int, device_id: int) -> None:
    """Idempotent, but an unknown label is still an error so a stale page learns it is stale."""
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("SELECT 1 FROM grammar_labels WHERE id = ?", (label_id,)).fetchone() is None:
            raise GrammarError("not_found")
        conn.execute("DELETE FROM grammar_placements WHERE label_id = ? AND device_id = ?", (label_id, device_id))
