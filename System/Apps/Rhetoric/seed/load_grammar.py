"""Loads the grammatical-label tree (seed/grammar-labels.md) and each grammar-bearing device's
grammar slots (seed/grammar.json) into `grammar_labels`, `device_labels` and `grammar_explanations`.
These three tables have no other writer, so every run replaces them whole, in one transaction, and
only after every line of both files has been checked.

GRAMMAR SLOTS — what they are for. Each device has two, and either may be left out:
  function  the grammar labels used to ACHIEVE this device's function (the grammar that does the work),
            with an example of it;
  form      the grammar labels that REPRESENT this device (its grammatical shape on the page),
            with an example of it.
A slot may name several labels. A slot that names labels needs an example, and the reverse. The full
rules and the label tree are in seed/grammar-label-schema.md.

grammar.json is a list of
    {"device": "Asyndeton",
     "summary": "one precise sentence",
     "function": {"labels": ["Conjunction"], "example": "*He came, he saw* [independent clause] ..."},
     "form":     {"labels": ["Clause > Independent clause"], "example": "..."}}
A label is its names from the root joined with " > ". An example must italicise its key parts
(*like this*) and give each term's definition in [brackets].

Run: python3 -m seed.load_grammar            (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

from seed.db import APP_DIR, open_database
from seed.type_outline import Entry, OutlineError, parse_outline

LABELS_PATH = APP_DIR / "seed" / "grammar-labels.md"
DEVICES_PATH = APP_DIR / "seed" / "grammar.json"
MAX_DEPTH = 3
SLOTS = ("function", "form")
_ITALIC = re.compile(r"\*[^*]+\*")
_BRACKET = re.compile(r"\[[^\]]+\]")


def label_path(entry: Entry) -> str:
    return " > ".join(entry.path)


def validate_labels(entries: list[Entry]) -> list[str]:
    problems: list[str] = []
    seen: set[tuple[str, ...]] = set()
    for entry in entries:
        where = f"grammar-labels.md line {entry.line}"
        if entry.depth >= MAX_DEPTH:
            problems.append(f"{where}: {entry.name!r} is {entry.depth + 1} levels deep; labels nest {MAX_DEPTH} deep at most")
        if entry.path in seen:
            problems.append(f"{where}: {entry.name!r} appears twice under the same parent")
        seen.add(entry.path)
        if not entry.definition:
            problems.append(f"{where}: {entry.name!r} needs a definition ('- Name — definition')")
    return problems


def validate_slot(where: str, slot: str, data: object, label_paths: set[str]) -> tuple[list[str], bool]:
    """(problems, whether the slot is filled). A slot is all-or-nothing: labels and an example together."""
    if data is None:
        return [], False
    if not isinstance(data, dict):
        return [f"{where}: '{slot}' must be an object with 'labels' and 'example'"], False
    labels = data.get("labels") or []
    example = str(data.get("example") or "").strip()
    if not labels and not example:
        return [], False
    problems: list[str] = []
    if not labels:
        problems.append(f"{where}: '{slot}' has an example but no labels")
    if len(set(labels)) != len(labels):
        problems.append(f"{where}: '{slot}' lists a label twice")
    problems += [f"{where}: '{slot}' label {label!r} is not in grammar-labels.md" for label in labels if label not in label_paths]
    if not example:
        problems.append(f"{where}: '{slot}' has labels but no example")
    elif not (_ITALIC.search(example) and _BRACKET.search(example)):
        problems.append(f"{where}: the '{slot}' example needs *italic* key parts and [bracketed] definitions")
    return problems, True


def validate_devices(records: list[dict], label_paths: set[str], device_names: set[str]) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for number, record in enumerate(records, start=1):
        name = record.get("device", "")
        where = f"grammar.json entry {number} ({name!r})"
        if name not in device_names:
            problems.append(f"{where}: no such device")
        if name in seen:
            problems.append(f"{where}: listed twice")
        seen.add(name)
        if not str(record.get("summary", "")).strip():
            problems.append(f"{where}: needs a summary")
        slot_problems: list[str] = []
        filled = False
        for slot in SLOTS:
            found, is_filled = validate_slot(where, slot, record.get(slot), label_paths)
            slot_problems += found
            filled = filled or is_filled
        problems += slot_problems
        if not filled and not slot_problems:  # both slots empty, rather than one half-filled
            problems.append(f"{where}: fill at least one grammar slot ('function' or 'form')")
    return problems


def write_grammar(conn: sqlite3.Connection, entries: list[Entry], records: list[dict]) -> None:
    """Replace all three tables. Caller owns the transaction."""
    conn.execute("DELETE FROM device_labels")
    conn.execute("DELETE FROM grammar_explanations")
    conn.execute("DELETE FROM grammar_labels")
    label_ids: dict[tuple[str, ...], int] = {}
    for entry in entries:  # an outline lists parents before children
        parent_id = label_ids[entry.path[:-1]] if entry.depth else None
        label_ids[entry.path] = conn.execute(
            "INSERT INTO grammar_labels (parent_id, name, definition) VALUES (?, ?, ?)",
            (parent_id, entry.name, entry.definition),
        ).lastrowid
    device_ids = dict(conn.execute("SELECT name, id FROM devices").fetchall())
    for record in records:
        device_id = device_ids[record["device"]]
        examples = {slot: (record.get(slot) or {}).get("example", "").strip() or None for slot in SLOTS}
        conn.execute(
            "INSERT INTO grammar_explanations (device_id, summary, function_example, form_example) VALUES (?, ?, ?, ?)",
            (device_id, record["summary"].strip(), examples["function"], examples["form"]),
        )
        for slot in SLOTS:
            for label in (record.get(slot) or {}).get("labels") or []:
                conn.execute(
                    "INSERT INTO device_labels (device_id, slot, label_id) VALUES (?, ?, ?)",
                    (device_id, slot, label_ids[tuple(label.split(" > "))]),
                )


def main() -> None:
    try:
        entries = parse_outline(LABELS_PATH.read_text())
        records = json.loads(DEVICES_PATH.read_text())
    except (OSError, OutlineError, json.JSONDecodeError) as exc:
        print(f"[seed] {exc}", file=sys.stderr)
        sys.exit(1)
    conn = open_database()
    device_names = {row[0] for row in conn.execute("SELECT name FROM devices")}
    problems = validate_labels(entries) + validate_devices(records, {label_path(e) for e in entries}, device_names)
    if problems:
        print("[seed] nothing written — fix these first:", *problems, sep="\n  ", file=sys.stderr)
        sys.exit(1)
    with conn:
        write_grammar(conn, entries, records)
    print(f"[seed] grammar: {len(entries)} labels, {len(records)} devices")
    conn.close()


if __name__ == "__main__":
    main()
