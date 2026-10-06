"""The tree rules Grammar's labels and Topical's Types share: both are rows of (id, parent_id, name, position)
nested to a fixed depth, with names unique among siblings (case-blind) and a `position` ordering the siblings.
grammar.py and topical.py own their tables and error classes and call these with their table name (a constant in
each, never user input) and their own error class, which is built from a server.py error-registry code."""

from __future__ import annotations

import sqlite3
from typing import Callable


def depth(conn: sqlite3.Connection, table: str, node_id: int | None, error: Callable[[str], Exception]) -> int:
    """Levels from the top down to and including this row; 0 for no row (the top of the tree)."""
    levels = 0
    while node_id is not None:
        row = conn.execute(f"SELECT parent_id FROM {table} WHERE id = ?", (node_id,)).fetchone()
        if row is None:
            raise error("not_found")
        levels += 1
        node_id = row[0]
    return levels


def taken(conn: sqlite3.Connection, table: str, parent_id: int | None, name: str, except_id: int | None = None) -> bool:
    """Whether a sibling already has this name (case-blind)."""
    return conn.execute(
        f"SELECT 1 FROM {table} WHERE parent_id IS ? AND lower(name) = lower(?) AND id IS NOT ?",
        (parent_id, name, except_id),
    ).fetchone() is not None


def _height(children: dict[int, list[int]], node_id: int) -> int:
    """Levels in the subtree under and including this row."""
    return 1 + max((_height(children, child) for child in children.get(node_id, [])), default=0)


def _renumber(conn: sqlite3.Connection, table: str, ordered: list[int]) -> None:
    conn.executemany(f"UPDATE {table} SET position = ? WHERE id = ?", [(position, moved) for position, moved in enumerate(ordered)])


def move(conn: sqlite3.Connection, table: str, node_id: int, index: int, max_depth: int,
         error: Callable[[str], Exception], parent_id: int | None = None) -> None:
    """Puts the row at `index` among the siblings under its new parent (0 = first; past the end = last).
    `parent_id` None keeps its parent, 0 moves it to the top level, any other id moves it (with everything
    beneath it) under that row. Refused with `bad_request` when it would go under itself or one of its own
    sub-rows, or push its deepest sub-row past `max_depth`; with `conflict` when a sibling there already has its
    name; with `not_found` for an unknown row or parent."""
    parents = {row_id: row_parent for row_id, row_parent in conn.execute(f"SELECT id, parent_id FROM {table}")}
    if node_id not in parents:
        raise error("not_found")
    old_parent = parents[node_id]
    new_parent = old_parent if parent_id is None else (None if parent_id == 0 else parent_id)
    if new_parent != old_parent:
        if new_parent is not None and new_parent not in parents:
            raise error("not_found")
        levels = 0
        above = new_parent
        while above is not None:
            if above == node_id:
                raise error("bad_request")  # under itself or one of its own sub-rows
            levels += 1
            above = parents[above]
        children: dict[int, list[int]] = {}
        for row_id, row_parent in parents.items():
            if row_parent is not None:
                children.setdefault(row_parent, []).append(row_id)
        if levels + _height(children, node_id) > max_depth:
            raise error("bad_request")
        (name,) = conn.execute(f"SELECT name FROM {table} WHERE id = ?", (node_id,)).fetchone()
        if taken(conn, table, new_parent, name, except_id=node_id):
            raise error("conflict")
        conn.execute(f"UPDATE {table} SET parent_id = ? WHERE id = ?", (new_parent, node_id))
    siblings = [row[0] for row in conn.execute(
        f"SELECT id FROM {table} WHERE parent_id IS ? AND id != ? ORDER BY position, id", (new_parent, node_id))]
    siblings.insert(index, node_id)
    _renumber(conn, table, siblings)
    if new_parent != old_parent:  # close the gap it left
        _renumber(conn, table, [row[0] for row in conn.execute(
            f"SELECT id FROM {table} WHERE parent_id IS ? ORDER BY position, id", (old_parent,))])
