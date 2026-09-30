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
            "popularity, topical_rank FROM devices ORDER BY name, id"
        ).fetchall()
        tags = conn.execute(
            "SELECT device_id, node_id FROM device_categories ORDER BY device_id, node_id"
        ).fetchall()
        examples = conn.execute(
            "SELECT device_id, body FROM examples ORDER BY id"
        ).fetchall()

    device_map = _device_map(devices, examples)
    links = _links(devices, tags)
    trees = {h: _build_tree(h, nodes, links[h]) for h in HIERARCHIES}
    return {"trees": trees, "devices": device_map}


def _device_map(devices: list[tuple], examples: list[tuple]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {
        str(row[0]): {
            "name": row[1],
            "definition": row[2],
            "popularity": row[5],
            "topical_rank": row[6],
            "examples": [],
        }
        for row in devices
    }
    for device_id, body in examples:
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
