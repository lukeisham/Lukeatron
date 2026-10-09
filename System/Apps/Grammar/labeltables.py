"""The tables Luke attaches to a label. Like labeltree.py this is called by labels.py, which passes its table name
(a constant there, never user input) and its error class.

A label's tables live in its `tables_json` column as a JSON list, so they are written, read and deleted
with the label and nothing ever queries inside a cell. One table is

    {"caption": "", "colHeads": true, "rowHeads": false, "cells": [["a", "b"], ["c", "d"]]}

`cells` is the whole grid as drawn, rectangular. When `colHeads` is true its first row is the column
headings; when `rowHeads` is true its first column is the row headings (both true: the top-left cell is
the corner). The limits below mirror MAX_* in app/tablegrid.js, which enforces them in the editor."""

from __future__ import annotations

import json
import sqlite3
import sys
from typing import Any, Callable

MAX_TABLES = 5  # per label
MAX_ROWS = 20
MAX_COLS = 8
MAX_CELL = 200  # characters in one cell
MAX_CAPTION = 120


def clean(value: Any) -> list[dict[str, Any]] | None:
    """The list of tables in canonical form (text trimmed, only the known keys), or None when `value` is not
    a list of at most MAX_TABLES well-formed tables. Pure: the server uses it to judge a request body."""
    if not isinstance(value, list) or len(value) > MAX_TABLES:
        return None
    tables = []
    for raw in value:
        table = _clean_table(raw)
        if table is None:
            return None
        tables.append(table)
    return tables


def _clean_table(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    caption, col_heads, row_heads, cells = raw.get("caption", ""), raw.get("colHeads"), raw.get("rowHeads"), raw.get("cells")
    if not isinstance(caption, str) or len(caption.strip()) > MAX_CAPTION:
        return None
    if not isinstance(col_heads, bool) or not isinstance(row_heads, bool):
        return None
    if not isinstance(cells, list) or not 1 <= len(cells) <= MAX_ROWS:
        return None
    width = len(cells[0]) if isinstance(cells[0], list) else 0
    if not 1 <= width <= MAX_COLS:
        return None
    grid = []
    for row in cells:
        if not isinstance(row, list) or len(row) != width:
            return None
        if not all(isinstance(cell, str) and len(cell.strip()) <= MAX_CELL for cell in row):
            return None
        grid.append([cell.strip() for cell in row])
    return {"caption": caption.strip(), "colHeads": col_heads, "rowHeads": row_heads, "cells": grid}


def parse(raw: str | None) -> list[dict[str, Any]]:
    """A label's stored tables, for the tree. An unreadable or invalid value (the column is only ever written
    through `save`, so this is a hand edit) reads as no tables rather than failing the whole payload."""
    if not raw:
        return []
    try:
        tables = clean(json.loads(raw))
    except ValueError:
        tables = None
    if tables is None:
        print(f"[labeltables] ignored an unreadable tables_json value: {raw[:60]!r}", file=sys.stderr)
        return []
    return tables


def save(conn: sqlite3.Connection, table: str, node_id: int, tables: list[dict[str, Any]],
         error: Callable[[str], Exception]) -> None:
    """Replaces the row's tables with `tables` (already `clean`). An unknown row is `not_found`."""
    cursor = conn.execute(f"UPDATE {table} SET tables_json = ? WHERE id = ?", (json.dumps(tables, ensure_ascii=False), node_id))
    if cursor.rowcount == 0:
        raise error("not_found")
