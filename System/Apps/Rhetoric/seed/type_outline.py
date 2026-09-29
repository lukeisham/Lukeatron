"""Parses one hierarchy's Type-layer outline (a markdown bullet list) into entries. Pure text
in, data out: no database, so seed/type_layers.py owns every rule about what may be written.

Outline format — one bullet per node, two spaces of indent per level:

    - Root name — definition
      - Nested Type — definition
        - Deeper Type — definition

`#` headings, blank lines and <!-- comments --> are ignored. The separator is " — " (spaced em
dash), so a name may contain hyphens and commas but not " — ".
"""

from __future__ import annotations

import re
from dataclasses import dataclass

SEPARATOR = " — "
INDENT = "  "
_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_BULLET = re.compile(r"^( *)- (.+)$")


class OutlineError(ValueError):
    """A line Luke should fix; the message names the line."""


@dataclass(frozen=True)
class Entry:
    depth: int
    name: str
    definition: str  # "" when the line carries none
    line: int
    path: tuple[str, ...]  # names from the top-level root down to this entry


def parse_outline(text: str) -> list[Entry]:
    # Blank the comment text but keep its newlines, so reported line numbers stay true.
    text = _COMMENT.sub(lambda m: "\n" * m.group(0).count("\n"), text)
    entries: list[Entry] = []
    ancestors: list[str] = []
    for number, raw in enumerate(text.splitlines(), start=1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if "\t" in raw:
            raise OutlineError(f"line {number}: use two spaces per level, not tabs")
        match = _BULLET.match(raw.rstrip())
        if not match:
            raise OutlineError(f"line {number}: expected a bullet ('- Name — definition'), got {raw.strip()!r}")
        spaces, body = match.groups()
        if len(spaces) % len(INDENT):
            raise OutlineError(f"line {number}: indent must be a multiple of {len(INDENT)} spaces")
        depth = len(spaces) // len(INDENT)
        if depth > len(ancestors):
            raise OutlineError(f"line {number}: indented {depth} levels but its parent is only {len(ancestors)} deep")
        name, _, definition = body.partition(SEPARATOR)
        name, definition = name.strip(), definition.strip()
        if not name:
            raise OutlineError(f"line {number}: empty name")
        del ancestors[depth:]
        ancestors.append(name)
        entries.append(Entry(depth, name, definition, number, tuple(ancestors)))
    return entries
