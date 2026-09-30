"""Writes the researched, classified devices from seed/devices.json into `devices` and `examples`
(seed-pipeline FR-6). One transaction, and nothing is written unless every device is valid.

A device is valid when its Category, Form and Function paths each name an existing node of that
hierarchy (a path is the node names from the root joined with " > "), so a device with a null
placement is held back, never forced (AD-2). Popularity is the number of the four scraped lists
naming the device times 25. Topical rank is left NULL (AD-4). A Flipside device points at its
fallacy through `flipside_of`.

Run: python3 -m seed.load_devices            (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

from seed.db import APP_DIR, DB_PATH, open_database
from seed.type_layers import db_paths

DEVICES_PATH = APP_DIR / "seed" / "devices.json"
POPULARITY_PER_LIST = 25
TREES = ("category", "form", "function")


def node_ids(conn: sqlite3.Connection, hierarchy: str) -> dict[str, int]:
    """{"Root > Type": node id} for one hierarchy."""
    rows = conn.execute("SELECT id, parent_id, name FROM nodes WHERE hierarchy = ?", (hierarchy,)).fetchall()
    by_id = {node_id: (parent_id, name) for node_id, parent_id, name in rows}

    def path(node_id: int) -> str:
        parent_id, name = by_id[node_id]
        return f"{path(parent_id)} > {name}" if parent_id is not None else name

    return {path(node_id): node_id for node_id in by_id}


def _placements(device: dict, tree: str) -> list[str]:
    """Node names a device is tagged with in one tree. Category may be several (a JSON list, or
    one string); Form and Function are exactly one."""
    value = device[tree]
    return [v for v in value if v] if isinstance(value, list) else ([value] if value else [])


def split_devices(devices: list[dict], ids: dict[str, dict[str, int]]) -> tuple[list[dict], list[tuple[str, str]]]:
    """(devices ready to write, [(name, why held back)])."""
    ready, held = [], []
    names = {d["name"] for d in devices}
    for device in devices:
        problems = [f"{tree}: {place!r}" if place else f"{tree}: no placement"
                    for tree in TREES for place in _placements(device, tree)
                    if place not in ids[tree]] + [f"{tree}: no placement" for tree in TREES
                                                  if not _placements(device, tree)]
        if device["flipside_of"] and device["flipside_of"] not in names:
            problems.append(f"flipside_of: {device['flipside_of']!r} is not a device")
        if problems:
            held.append((device["name"], "; ".join(problems)))
        else:
            ready.append(device)
    heldnames = {name for name, _ in held}
    still_ready = []
    for device in ready:  # a Flipside whose fallacy was held back cannot be linked
        if device["flipside_of"] in heldnames:
            held.append((device["name"], f"its fallacy {device['flipside_of']!r} is held back"))
        else:
            still_ready.append(device)
    return still_ready, held


def write_devices(conn: sqlite3.Connection, devices: list[dict], ids: dict[str, dict[str, int]]) -> None:
    """Insert every device, then link Flipside devices to their fallacy. Caller owns the transaction."""
    row_ids: dict[str, int] = {}
    for device in devices:
        row_ids[device["name"]] = conn.execute(
            "INSERT INTO devices (name, definition, form_node_id, function_node_id, popularity) "
            "VALUES (?, ?, ?, ?, ?)",
            (device["name"], device["definition"], ids["form"][_placements(device, "form")[0]],
             ids["function"][_placements(device, "function")[0]],
             device["lists_naming"] * POPULARITY_PER_LIST),
        ).lastrowid
        for place in dict.fromkeys(_placements(device, "category")):
            conn.execute("INSERT INTO device_categories (device_id, node_id) VALUES (?, ?)",
                         (row_ids[device["name"]], ids["category"][place]))
        for body in device["examples"]:
            conn.execute("INSERT INTO examples (device_id, body) VALUES (?, ?)", (row_ids[device["name"]], body))
    for device in devices:
        if device["flipside_of"]:
            conn.execute("UPDATE devices SET flipside_of = ? WHERE id = ?",
                         (row_ids[device["flipside_of"]], row_ids[device["name"]]))


def wrong_hierarchy_links(conn: sqlite3.Connection) -> int:
    """database.spec AC-4 across all three links; 0 means every device sits in the right trees."""
    wrong = conn.execute(
        "SELECT COUNT(*) FROM device_categories dc JOIN nodes n ON dc.node_id = n.id "
        "WHERE n.hierarchy != 'category'").fetchone()[0]
    return wrong + sum(conn.execute(
        f"SELECT COUNT(*) FROM devices d JOIN nodes n ON d.{column} = n.id WHERE n.hierarchy != ?",
        (hierarchy,)).fetchone()[0] for column, hierarchy in
        (("form_node_id", "form"), ("function_node_id", "function")))


def main() -> None:
    conn = open_database()
    if conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0]:
        print(f"[seed] {DB_PATH.name} already has devices; refusing to write twice", file=sys.stderr)
        sys.exit(1)
    devices = json.loads(DEVICES_PATH.read_text())
    ids = {tree: node_ids(conn, tree) for tree in TREES}
    ready, held = split_devices(devices, ids)
    with conn:
        write_devices(conn, ready, ids)
    total = conn.execute("SELECT COUNT(*) FROM devices").fetchone()[0]
    print(f"[seed] {total} devices written; wrong-hierarchy links: {wrong_hierarchy_links(conn)}")
    for name, why in held:
        print(f"[seed] held back — {name}: {why}", file=sys.stderr)
    conn.close()


if __name__ == "__main__":
    main()
