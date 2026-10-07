"""Reads style.db and assembles the `/api/items` payload: nested trees (the three classification hierarchies and
Labels) whose entry leaves are references, one flat `entries` map, and the flat list of real `quotes` the Index group
lists. Called only by server.py (API-1: routing holds no SQL); tree wiring is a plain O(n) pass, not recursive SQL."""

from __future__ import annotations

import sqlite3
import sys
from contextlib import closing
from pathlib import Path
from typing import Any

import labels
import quotes

HIERARCHIES = ("category", "form", "function")

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
        nodes = conn.execute(
            "SELECT id, hierarchy, parent_id, name, definition FROM nodes ORDER BY id"
        ).fetchall()
        entries = conn.execute(
            "SELECT id, name, definition, form_node_id, function_node_id, "
            "popularity, ai_confidence_rating, counterpart_of FROM entries " + _ENTRY_ORDER
        ).fetchall()
        tags = conn.execute(
            "SELECT entry_id, node_id FROM entry_categories ORDER BY entry_id, node_id"
        ).fetchall()
        examples = conn.execute(
            "SELECT entry_id, body, attribution FROM examples ORDER BY id"
        ).fetchall()
        images = conn.execute(
            "SELECT entry_id, file, role, caption, width, height FROM entry_images ORDER BY entry_id, position, id"
        ).fetchall()
        labels_roots = labels.labels_tree(conn)
        quote_list = quotes.quotes(conn)

    entry_map = _entry_map(entries, examples, images)
    links = _links(entries, tags)
    trees = {h: _build_tree(h, nodes, links[h]) for h in HIERARCHIES}
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
            "popularity": row[5],
            "ai_confidence_rating": row[6],
            "counterpart_of": row[7],
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


def _links(entries: list[tuple], tags: list[tuple]) -> dict[str, list[tuple[int, int]]]:
    """(entry id, node id) pairs per hierarchy. Category has one pair per tag, so an entry with several Category tags
    appears under each; Form and Function have at most one, and an entry not yet given one has no pair there."""
    return {
        "category": list(tags),
        "form": [(row[0], row[3]) for row in entries if row[3] is not None],
        "function": [(row[0], row[4]) for row in entries if row[4] is not None],
    }


def _build_tree(hierarchy: str, nodes: list[tuple], links: list[tuple[int, int]]) -> list[dict[str, Any]]:
    """Roots of one hierarchy, each with nested `children` (nodes first, then entry leaves; an entry with several Category tags is a leaf under each).

    A node whose parent is missing or in another hierarchy, and an entry whose link points
    outside this hierarchy, are skipped with a warning rather than failing the whole payload —
    keeping the hierarchies consistent is the job of whatever writes the entries."""
    own = {row[0]: row for row in nodes if row[1] == hierarchy}
    built: dict[int, dict[str, Any]] = {
        node_id: {"kind": "node", "id": node_id, "name": row[3], "definition": row[4], "children": []}
        for node_id, row in own.items()
    }

    roots: list[dict[str, Any]] = []
    for node_id, row in own.items():
        parent_id = row[2]
        if parent_id is None:
            roots.append(built[node_id])
        elif parent_id in built:
            built[parent_id]["children"].append(built[node_id])
        else:
            _warn(f"node {node_id} in {hierarchy} has parent {parent_id} outside that hierarchy; skipped")

    for entry_id, node_id in links:
        if node_id in built:
            built[node_id]["children"].append({"kind": "entry", "id": entry_id})
        else:
            _warn(f"entry {entry_id} links to node {node_id}, not in {hierarchy}; left out of that tree")
    return roots


def _warn(message: str) -> None:
    print(f"[items] {message}", file=sys.stderr)
