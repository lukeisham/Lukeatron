"""Parses the recovered scraped-device-lists.md into one name set per source list, and counts
how many of the four lists name a device. Names are matched after
normalisation (case, punctuation, a trailing parenthetical), never by fuzzy guess; a device the
lists spell differently is reconciled by listing the variant in its `aliases`.
"""

from __future__ import annotations

import re
from pathlib import Path

_SECTION = re.compile(r"^## (.+)$", re.MULTILINE)
_NOT_A_LIST = ("Scraped device/term lists", "Triage note")
_NOTE = re.compile(r"\((?:[^)]*(?:verify|truncated|source pull)[^)]*)\)", re.IGNORECASE)
_LABEL = re.compile(r"^(?:Top \d+ figures|Full index \(\d+\)):\s*")


def normalise(name: str) -> str:
    """Comparison key: lowercase, parenthetical dropped, non-letters removed."""
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", name).lower())


def _list_names(body: str) -> list[str]:
    """Names in a section body. Skips the Source line, multi-line parenthetical notes,
    and the American Rhetoric 'Top 10' subset (its 'Full index' line is the whole list)."""
    lines: list[str] = []
    in_note = False  # a "(...)" note may span several lines
    in_top = False  # the "Top N" subset wraps onto following lines until a blank line
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped:
            in_top = False
            continue
        if in_note or stripped.startswith("("):
            in_note = ")" not in stripped
            continue
        if stripped.startswith("Top "):
            in_top = True
        if in_top or stripped.startswith("Source:"):
            continue
        lines.append(_LABEL.sub("", stripped))
    text = _NOTE.sub("", " ".join(lines))
    return [part.strip() for part in text.split(",") if part.strip()]


def parse_lists(markdown: str) -> dict[str, list[str]]:
    """{source title: names in the order listed}."""
    headings = list(_SECTION.finditer(markdown))
    lists: dict[str, list[str]] = {}
    for index, heading in enumerate(headings):
        title = heading.group(1).strip()
        if title.startswith(_NOT_A_LIST):
            continue
        end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
        lists[title] = _list_names(markdown[heading.end():end])
    return lists


def count_lists_naming(names: list[str], lists: dict[str, list[str]]) -> int:
    """How many source lists contain any of `names` (a device's name plus its aliases)."""
    keys = {normalise(name) for name in names}
    return sum(1 for entries in lists.values() if keys & {normalise(e) for e in entries})


def union_with_counts(lists: dict[str, list[str]]) -> list[dict]:
    """Every distinct name across the lists with the number of lists naming it, most-named first."""
    first_spelling: dict[str, str] = {}
    for entries in lists.values():
        for entry in entries:
            first_spelling.setdefault(normalise(entry), entry)
    rows = [{"name": spelling, "lists_naming": count_lists_naming([spelling], lists)}
            for spelling in first_spelling.values()]
    return sorted(rows, key=lambda row: (-row["lists_naming"], row["name"].lower()))


def read_lists(path: Path) -> dict[str, list[str]]:
    return parse_lists(path.read_text())
