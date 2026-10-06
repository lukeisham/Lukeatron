"""Reads rhetoric.db and assembles the `/api/items` payload: nested trees (the three seeded
hierarchies, Topical, and Grammar) whose device leaves are references, one flat `devices` map, and
the flat list of real `quotes` the Index group lists. Called only by server.py (API-1: routing holds no SQL); tree wiring is a plain O(n) pass, not recursive SQL (server.spec AD-3)."""

from __future__ import annotations

import sqlite3
import sys
from contextlib import closing
from pathlib import Path
from typing import Any

import grammar
import quotes
import topical

HIERARCHIES = ("category", "form", "function")

# Devices are listed by the label they are shown under, so a Flipside files under its fallacy.
_DEVICE_ORDER = (
    "ORDER BY COALESCE((SELECT f.name || '/' FROM devices f WHERE f.id = devices.flipside_of), '') || name, id"
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
        devices = conn.execute(
            "SELECT id, name, definition, form_node_id, function_node_id, "
            "popularity, topical_rank, ai_confidence_rating, flipside_of FROM devices " + _DEVICE_ORDER
        ).fetchall()
        tags = conn.execute(
            "SELECT device_id, node_id FROM device_categories ORDER BY device_id, node_id"
        ).fetchall()
        examples = conn.execute(
            "SELECT device_id, body, attribution FROM examples ORDER BY id"
        ).fetchall()
        ordered_ids = [row[0] for row in devices]
        topical_roots = topical.topical_tree(conn, ordered_ids)
        grammar_roots = grammar.grammar_tree(conn)
        quote_list = quotes.quotes(conn)

    device_map = _device_map(devices, examples)
    links = _links(devices, tags)
    trees = {h: _build_tree(h, nodes, links[h]) for h in HIERARCHIES}
    trees["topical"] = topical_roots
    trees[grammar.HIERARCHY] = grammar_roots
    return {"trees": trees, "devices": device_map, "quotes": quote_list}


def load_topical(db_path: Path) -> list[dict[str, Any]]:
    """Just the Topical tree, for the response to a Topical change."""
    with closing(connect_readonly(db_path)) as conn:
        return _topical_roots(conn)


def load_grammar(db_path: Path) -> list[dict[str, Any]]:
    """Just the Grammar tree, for the response to a Grammar change."""
    with closing(connect_readonly(db_path)) as conn:
        return grammar.grammar_tree(conn)


def _topical_roots(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    ordered_ids = [row[0] for row in conn.execute("SELECT id FROM devices " + _DEVICE_ORDER)]
    return topical.topical_tree(conn, ordered_ids)


def _device_map(devices: list[tuple], examples: list[tuple]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {
        str(row[0]): {
            "name": row[1],
            "definition": row[2],
            "popularity": row[5],
            "topical_rank": row[6],
            "ai_confidence_rating": row[7],
            "flipside_of": row[8],
            "examples": [],
        }
        for row in devices
    }
    # A device shows its name, description, AI example, then real quote (Luke's standing display
    # order): the AI example goes first whatever the row ids, ties keep id order (sort is stable).
    for device_id, body, attribution in sorted(examples, key=lambda row: quotes.is_real_quote(row[2], row[1])):
        by_id[str(device_id)]["examples"].append(body)
    return by_id


def _links(devices: list[tuple], tags: list[tuple]) -> dict[str, list[tuple[int, int]]]:
    """(device id, node id) pairs per hierarchy. Category has one pair per tag, so a device
    with several Category tags appears under each; Form and Function have exactly one."""
    return {
        "category": list(tags),
        "form": [(row[0], row[3]) for row in devices],
        "function": [(row[0], row[4]) for row in devices],
    }


def _build_tree(hierarchy: str, nodes: list[tuple], links: list[tuple[int, int]]) -> list[dict[str, Any]]:
    """Roots of one hierarchy, each with nested `children` (nodes first, then device leaves; a device with several Category tags is a leaf under each).

    A node whose parent is missing or in another hierarchy, and a device whose link points
    outside this hierarchy, are skipped with a warning rather than failing the whole payload —
    the database invariants (database.spec AC-3/AC-4) are the seed pipeline's job to hold."""
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

    for device_id, node_id in links:
        if node_id in built:
            built[node_id]["children"].append({"kind": "device", "id": device_id})
        else:
            _warn(f"device {device_id} links to node {node_id}, not in {hierarchy}; left out of that tree")
    return roots


def _warn(message: str) -> None:
    print(f"[items] {message}", file=sys.stderr)
