"""Seeds the Category tree's 8 root nodes from the kept Textual Rhetoric Database
(seed-pipeline FR-1, plan step 2). Reads the JSON only; Ethos/Pathos/Logos and the Visual
database are never opened. Safe to re-run: a root that already exists is left alone.

Run: python3 -m seed.category_roots            (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

from seed.db import DB_PATH, open_database

REPO_ROOT = Path(__file__).resolve().parents[4]
TEXTUAL_DATABASE = (
    REPO_ROOT / "Trash" / "Parser-widgets-2026-09-28" / "Rhetoric"
    / "Textual Rhetoric Database" / "textual_rhetoric_database.json"
)

# (section in the JSON, key within it, root name). The JSON's own `name` fields name each
# section's first device (e.g. "Metaphor/Simile"), not the root, so root names are fixed
# here; only the definitions are read from the file.
ROOTS: tuple[tuple[str, str, str], ...] = (
    ("tropes", "resemblance", "Resemblance"),
    ("tropes", "association", "Association"),
    ("tropes", "naming", "Naming"),
    ("tropes", "invention", "Invention"),
    ("tropes", "extendedmeaning", "Extended Meaning"),
    ("tropes", "ornamentalepithet", "Ornamental Epithet"),
    ("fallacies", "fallacy", "Fallacy"),
    ("fallacies", "fallacy_flipside", "Fallacy Flipside"),
)


def read_root_definitions(source: Path = TEXTUAL_DATABASE) -> list[tuple[str, str]]:
    """(name, definition) for each of the 8 roots, in ROOTS order. Raises KeyError naming a
    missing section rather than seeding a partial tree."""
    data = json.loads(source.read_text())
    return [(name, data[section][key]["definition"]) for section, key, name in ROOTS]


def seed_roots(conn: sqlite3.Connection, roots: list[tuple[str, str]]) -> int:
    """Insert each missing root; returns how many were added."""
    added = 0
    with conn:
        for name, definition in roots:
            exists = conn.execute(
                "SELECT 1 FROM nodes WHERE hierarchy = 'category' AND parent_id IS NULL AND name = ?",
                (name,),
            ).fetchone()
            if exists:
                continue
            conn.execute(
                "INSERT INTO nodes (hierarchy, parent_id, name, definition) "
                "VALUES ('category', NULL, ?, ?)",
                (name, definition),
            )
            added += 1
    return added


def category_root_count(conn: sqlite3.Connection) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM nodes WHERE hierarchy = 'category' AND parent_id IS NULL"
    ).fetchone()[0]


def main() -> None:
    try:
        roots = read_root_definitions()
    except (OSError, KeyError, json.JSONDecodeError) as exc:
        print(f"[seed] could not read the Textual Rhetoric Database: {exc!r}", file=sys.stderr)
        sys.exit(1)
    conn = open_database()
    added = seed_roots(conn, roots)
    print(f"[seed] {DB_PATH.name}: {added} root(s) added, {category_root_count(conn)} category roots total")
    conn.close()


if __name__ == "__main__":
    main()
