"""Reads style.db and assembles the `/api/items` payload: nested trees (the four classification hierarchies and
Labels) whose type headings carry their own entry id and whose element leaves are references, one flat `entries` map, and the flat list of real `quotes` the Index group
lists. Called only by server.py (API-1: routing holds no SQL); tree wiring is a plain O(n) pass, not recursive SQL."""

from __future__ import annotations

import sqlite3
import sys
from contextlib import closing
from pathlib import Path
from typing import Any

import labels
import quotes

HIERARCHIES = ("templates", "brainstorming", "research", "topical")

# Entries are listed by the label they are shown under, so a Counterpart files under its base.
_ENTRY_ORDER = (
    "ORDER BY COALESCE((SELECT f.name || '/' FROM entries f WHERE f.id = entries.counterpart_of), '') || name, id"
)


def connect_readonly(db_path: Path) -> sqlite3.Connection:
    """Read-only connection (PY-8). Raises sqlite3.OperationalError if the file is missing —
    `mode=ro` never creates one, which is what lets server.py report a clean db_unavailable."""
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.execute("PRAGMA foreign_keys = ON")  # SQL-8
    return conn


def load_items(db_path: Path) -> dict[str, Any]:
    with closing(connect_readonly(db_path)) as conn:
        entries = conn.execute(
            "SELECT id, name, definition, ai_confidence_rating, counterpart_of, kind FROM entries " + _ENTRY_ORDER
        ).fetchall()
        placements = conn.execute("SELECT hierarchy, parent_id, member_id FROM placements").fetchall()
        examples = conn.execute(
            "SELECT entry_id, body, attribution FROM examples ORDER BY id"
        ).fetchall()
        images = conn.execute(
            "SELECT entry_id, file, role, caption, width, height FROM entry_images ORDER BY entry_id, position, id"
        ).fetchall()
        labels_roots = labels.labels_tree(conn)
        quote_list = quotes.quotes(conn)

    entry_map = _entry_map(entries, examples, images)
    trees = {h: _build_tree(h, entries, placements) for h in HIERARCHIES}
    trees[labels.HIERARCHY] = labels_roots
    return {"trees": trees, "entries": entry_map, "quotes": quote_list}


def load_labels(db_path: Path) -> list[dict[str, Any]]:
    """Just the Labels tree, for the response to a Labels change."""
    with closing(connect_readonly(db_path)) as conn:
        return labels.labels_tree(conn)


def _entry_map(entries: list[tuple], examples: list[tuple], images: list[tuple]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {
        str(row[0]): {
            "name": row[1],
            "definition": row[2],
            "kind": row[5],
            "ai_confidence_rating": row[3],
            "counterpart_of": row[4],
            "examples": [],
            "images": [],
        }
        for row in entries
    }
    for entry_id, file, role, caption, width, height in images:
        by_id[str(entry_id)]["images"].append({"file": file, "role": role, "caption": caption, "width": width, "height": height})
    # An entry shows its name, description, AI example, then real quote (Luke's standing display
    # order): the AI example goes first whatever the row ids, ties keep id order (sort is stable).
    for entry_id, body, attribution in sorted(examples, key=lambda row: quotes.is_real_quote(row[2], row[1])):
        by_id[str(entry_id)]["examples"].append(body)
    return by_id


def _build_tree(hierarchy: str, entries: list[tuple], placements: list[tuple]) -> list[dict[str, Any]]:
    """The top level of one hierarchy. A type becomes a heading `{kind: node, type: true, id: the type's entry id, name,
    definition, children}`; a element becomes a leaf `{kind: entry, id}`. A heading lists its types first, then its
    elements, each in the order entries are shown. What a type holds in a hierarchy does not depend on where it is
    placed, so every copy of it is the same. A type met again below itself (the schema forbids it) is left empty with a
    warning rather than failing the whole payload."""
    shown = {row[0]: place for place, row in enumerate(entries)}
    by_id = {row[0]: row for row in entries}
    held: dict[int | None, list[int]] = {}
    for placed_in, parent_id, member_id in placements:
        if placed_in == hierarchy:
            held.setdefault(parent_id, []).append(member_id)

    def build(member_id: int, path: tuple[int, ...]) -> dict[str, Any]:
        row = by_id[member_id]
        if row[5] != "type":
            return {"kind": "entry", "id": member_id}
        node = {"kind": "node", "type": True, "id": member_id, "name": row[1], "definition": row[2], "children": []}
        if member_id in path:
            _warn(f"type {member_id} holds itself in {hierarchy}; its inner copy is left empty")
        else:
            node["children"] = [build(member, path + (member_id,)) for member in _in_order(held.get(member_id, []), by_id, shown)]
        return node

    return [build(member, ()) for member in _in_order(held.get(None, []), by_id, shown)]


def _in_order(members: list[int], by_id: dict[int, tuple], shown: dict[int, int]) -> list[int]:
    return sorted(members, key=lambda member: (by_id[member][5] != "type", shown[member]))


def _warn(message: str) -> None:
    print(f"[items] {message}", file=sys.stderr)
