"""Reads rhetoric.db and assembles the `/api/items` payload: three nested trees whose device
leaves are references, plus one flat `devices` map. Called only by server.py (API-1: routing
holds no SQL); tree wiring is a plain O(n) pass, not recursive SQL (server.spec AD-3)."""

from __future__ import annotations

import sqlite3
import sys
from contextlib import closing
from pathlib import Path
from typing import Any

HIERARCHIES = ("category", "form", "function")

# Column on `devices` that links into each hierarchy — fixed constants, never user input (SQL-4).
_LINK_COLUMN = {
    "category": "category_node_id",
    "form": "form_node_id",
    "function": "function_node_id",
}


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
            "SELECT id, name, definition, category_node_id, form_node_id, function_node_id, "
            "popularity, topical_rank FROM devices ORDER BY name, id"
        ).fetchall()
        examples = conn.execute(
            "SELECT device_id, body FROM examples ORDER BY id"
        ).fetchall()

    device_map = _device_map(devices, examples)
    trees = {h: _build_tree(h, nodes, devices) for h in HIERARCHIES}
    return {"trees": trees, "devices": device_map}


def _device_map(devices: list[tuple], examples: list[tuple]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {
        str(row[0]): {
            "name": row[1],
            "definition": row[2],
            "popularity": row[6],
            "topical_rank": row[7],
            "examples": [],
        }
        for row in devices
    }
    for device_id, body in examples:
        by_id[str(device_id)]["examples"].append(body)
    return by_id


def _build_tree(hierarchy: str, nodes: list[tuple], devices: list[tuple]) -> list[dict[str, Any]]:
    """Roots of one hierarchy, each with nested `children` (nodes first, then device leaves).

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

    link_index = ("category", "form", "function").index(hierarchy) + 3
    for row in devices:
        node_id = row[link_index]
        if node_id in built:
            built[node_id]["children"].append({"kind": "device", "id": row[0]})
        else:
            _warn(f"device {row[0]} links to node {node_id}, not in {hierarchy}; left out of that tree")
    return roots


def _warn(message: str) -> None:
    print(f"[items] {message}", file=sys.stderr)
