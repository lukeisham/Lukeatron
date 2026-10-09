"""Labels — Luke's own labels, created and filled from the app.
The only module outside the seed pipeline that writes research.db, and it writes only its own two tables (`labels`,
`label_placements`; a label's tables are a column of the first), a granted exception (app-decisions.md); server.py routes to
it and items.py reads the tree through `labels_tree`. Routing holds no SQL (API-1).

A label is a name with an optional explanation (`definition`, blank when none). A link label (`about_section` set) is a
leaf that links to its own section of the About page and holds no entries, tables or sub-labels. Labels nest at most five
levels deep (a top-level label, then four more below it). An entry may be filed under any number of labels, at any level,
so it can sit under a label and under one of that label's sub-labels too."""

from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

import aboutpage
import labeltables
import labeltree

HIERARCHY = "labels"  # the Labels group files entries under the label tree
TABLE = "labels"
MAX_DEPTH = 5  # levels: top-level, then four below; mirrors MAX_LABEL_DEPTH in app/state.js


class LabelError(Exception):
    """A refused change; `code` is a server.py error-registry key."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def connect_writable(db_path: Path) -> sqlite3.Connection:
    """`mode=rw` never creates a file, so a missing database stays a clean db_unavailable."""
    conn = sqlite3.connect(f"file:{db_path}?mode=rw", uri=True)
    conn.execute("PRAGMA foreign_keys = ON")  # SQL-8; also what makes deleting a label remove its placements
    return conn


def labels_tree(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Roots in the same shape as the other trees: each label's sub-labels (in Luke's order) first,
    then its entries (in Luke's order). Every label is kept, empty or not, so it can be filled."""
    built: dict[int, dict[str, Any]] = {}
    parents: list[tuple[int, int | None]] = []
    for label_id, parent_id, name, definition, tables, about in conn.execute(
        "SELECT id, parent_id, name, definition, tables_json, about_section FROM labels ORDER BY position, id"
    ):
        built[label_id] = {"kind": "node", "id": label_id, "name": name, "definition": definition,
                           "tables": labeltables.parse(tables), "about": about, "children": []}
        parents.append((label_id, parent_id))
    roots = []
    for label_id, parent_id in parents:
        (built[parent_id]["children"] if parent_id in built else roots).append(built[label_id])
    for label_id, entry_id in conn.execute(
        "SELECT label_id, entry_id FROM label_placements ORDER BY label_id, position, entry_id"
    ):
        built[label_id]["children"].append({"kind": "entry", "id": entry_id})
    return roots


def create_label(db_path: Path, name: str, definition: str | None, parent_id: int | None = None) -> None:
    """The new label goes last among its siblings, under `parent_id` or at the top. The explanation is optional (None or blank)."""
    with closing(connect_writable(db_path)) as conn, conn:
        if labeltree.depth(conn, TABLE, parent_id, LabelError) >= MAX_DEPTH:
            raise LabelError("bad_request")  # a sixth level is refused
        if parent_id is not None:
            labeltree.require_plain(conn, TABLE, parent_id, LabelError)  # a link label has nothing under it
        conn.execute(
            "INSERT INTO labels (parent_id, name, definition, position) VALUES "
            "(?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM labels WHERE parent_id IS ?))",
            (parent_id, name, definition or "", parent_id),
        )


def create_link(db_path: Path, name: str, parent_id: int | None = None, about_path: Path = aboutpage.ABOUT_PATH) -> None:
    """A link label: a leaf that shows its name as a link to its own new, empty section of the About page (labeltree.create_link)."""
    with closing(connect_writable(db_path)) as conn, conn:
        labeltree.create_link(conn, TABLE, name, parent_id, MAX_DEPTH, LabelError, about_path)


def edit_label(db_path: Path, label_id: int, name: str, definition: str | None = None) -> None:
    """Renames the label and, unless `definition` is None, replaces its explanation (blank clears it). A link label has no
    explanation, so only its name changes; its About section keeps the heading it was made with."""
    with closing(connect_writable(db_path)) as conn, conn:
        row = conn.execute("SELECT about_section FROM labels WHERE id = ?", (label_id,)).fetchone()
        if row is None:
            raise LabelError("not_found")
        if definition is None or row[0] is not None:
            conn.execute("UPDATE labels SET name = ? WHERE id = ?", (name, label_id))
        else:
            conn.execute("UPDATE labels SET name = ?, definition = ? WHERE id = ?", (name, definition, label_id))


def set_tables(db_path: Path, label_id: int, tables: list[dict[str, Any]]) -> None:
    """Replaces the label's tables with `tables` (already `labeltables.clean`ed; the server does that)."""
    with closing(connect_writable(db_path)) as conn, conn:
        labeltree.require_plain(conn, TABLE, label_id, LabelError)  # a link label holds no tables
        labeltables.save(conn, TABLE, label_id, tables, LabelError)


def delete_label(db_path: Path, label_id: int) -> None:
    """Refused while the label has sub-labels (they would be lost with it); its entry placements go with it."""
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("SELECT 1 FROM labels WHERE id = ?", (label_id,)).fetchone() is None:
            raise LabelError("not_found")
        if conn.execute("SELECT 1 FROM labels WHERE parent_id = ?", (label_id,)).fetchone() is not None:
            raise LabelError("conflict")
        conn.execute("DELETE FROM labels WHERE id = ?", (label_id,))


def move_label(db_path: Path, label_id: int, index: int, parent_id: int | None = None) -> None:
    """Puts the label at `index` among its siblings (0 = first; past the end = last). `parent_id` None keeps its
    parent, 0 moves it (with everything beneath it) to the top level, any other id moves it under that label
    (see labeltree.move for what is refused)."""
    with closing(connect_writable(db_path)) as conn, conn:
        labeltree.move(conn, TABLE, label_id, index, MAX_DEPTH, LabelError, parent_id)


def add_placement(db_path: Path, label_id: int, entry_id: int, index: int | None = None) -> None:
    """Files the entry under the label, last by default. An entry already there stays put unless
    `index` is given, which puts it at that spot among the label's entries (so this is also the move)."""
    with closing(connect_writable(db_path)) as conn, conn:
        labeltree.require_plain(conn, TABLE, label_id, LabelError)  # a link label holds no entries
        try:
            conn.execute(
                "INSERT OR IGNORE INTO label_placements (label_id, entry_id, position) VALUES "
                "(?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM label_placements WHERE label_id = ?))",
                (label_id, entry_id, label_id),
            )
        except sqlite3.IntegrityError as exc:  # foreign key: unknown label or entry
            raise LabelError("not_found") from exc
        if index is None:
            return
        ordered = [row[0] for row in conn.execute(
            "SELECT entry_id FROM label_placements WHERE label_id = ? ORDER BY position, entry_id", (label_id,))]
        ordered.remove(entry_id)
        ordered.insert(index, entry_id)
        conn.executemany("UPDATE label_placements SET position = ? WHERE label_id = ? AND entry_id = ?",
                         [(position, label_id, moved) for position, moved in enumerate(ordered)])


def remove_placement(db_path: Path, label_id: int, entry_id: int) -> None:
    """Idempotent, but an unknown label is still an error so a stale page learns it is stale."""
    with closing(connect_writable(db_path)) as conn, conn:
        if conn.execute("SELECT 1 FROM labels WHERE id = ?", (label_id,)).fetchone() is None:
            raise LabelError("not_found")
        conn.execute("DELETE FROM label_placements WHERE label_id = ? AND entry_id = ?", (label_id, entry_id))
