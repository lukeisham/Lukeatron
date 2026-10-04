"""Grammar data for the Grammar group: reads the grammar tables and shapes the pieces items.py
wires into trees. Read-only; seed/load_grammar.py is the only writer. Routing holds no SQL (API-1), so server.py never reaches this module directly.

Each grammar-bearing device has two GRAMMAR SLOTS (see schema.sql): "function" holds the grammar
labels used to achieve the device's function, "form" the labels that represent the device, each
with an example. The payload sends them as `explanation.function` and `explanation.form`; an empty
slot is None."""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from typing import Any

# The derived heading holding every device with no grammatical term, last in the group;
# app/state.js mirrors this id. Real label and node ids start at 1, so 0 cannot collide.
NO_GRAMMAR_ID = 0
NO_GRAMMAR_NAME = "No grammatical term"
NO_GRAMMAR_DEFINITION = "devices that turn on no grammatical term"

HIERARCHY = "grammar"  # the Grammar group files devices under the grammar-label tree


def explanations(conn: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    """{device id: {summary, function, form}}; each slot is {labels: [names], example} or None when empty."""
    names: dict[int, dict[str, list[str]]] = defaultdict(lambda: {"function": [], "form": []})
    for device_id, slot, name in conn.execute(
        "SELECT d.device_id, d.slot, l.name FROM device_labels d JOIN grammar_labels l ON l.id = d.label_id "
        "ORDER BY d.device_id, l.id"
    ):
        names[device_id][slot].append(name)
    out: dict[int, dict[str, Any]] = {}
    for device_id, summary, function_example, form_example in conn.execute(
        "SELECT device_id, summary, function_example, form_example FROM grammar_explanations"
    ):
        out[device_id] = {
            "summary": summary,
            "function": _slot(names[device_id]["function"], function_example),
            "form": _slot(names[device_id]["form"], form_example),
        }
    return out


def _slot(labels: list[str], example: str | None) -> dict[str, Any] | None:
    return {"labels": labels, "example": example} if labels or example else None


def label_rows(conn: sqlite3.Connection) -> list[tuple]:
    """Label rows shaped like `nodes` rows (id, hierarchy, parent_id, name, definition), so
    items._build_tree wires them exactly as it wires a seeded hierarchy."""
    return [
        (label_id, HIERARCHY, parent_id, name, definition)
        for label_id, parent_id, name, definition in conn.execute(
            "SELECT id, parent_id, name, definition FROM grammar_labels ORDER BY id"
        )
    ]


def label_links(conn: sqlite3.Connection) -> list[tuple[int, int]]:
    """(device id, label id) pairs; a device with several labels is a leaf under each, once, even
    when the same label sits in both its function and form slots."""
    return conn.execute("SELECT DISTINCT device_id, label_id FROM device_labels ORDER BY device_id, label_id").fetchall()


def without_empty(roots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The label tree keeps every label; the Grammar group keeps only those that still hold a device."""
    kept = []
    for node in roots:
        children: list[dict[str, Any]] = []
        for child in node["children"]:
            children.extend([child] if child["kind"] == "device" else without_empty([child]))
        if children:
            kept.append({**node, "children": children})
    return kept


def with_ungrammatical(
    roots: list[dict[str, Any]], ordered_device_ids: list[int], grammatical: set[int]
) -> list[dict[str, Any]]:
    """Adds the derived heading for devices outside the grammar. A group with no grammatical
    device at all stays empty, so the screen can say nothing is loaded rather than list everything."""
    if not roots:
        return roots
    outside = [d for d in ordered_device_ids if d not in grammatical]
    if not outside:
        return roots
    return [*roots, {
        "kind": "node", "id": NO_GRAMMAR_ID, "name": NO_GRAMMAR_NAME, "definition": NO_GRAMMAR_DEFINITION,
        "children": [{"kind": "device", "id": device_id} for device_id in outside],
    }]
