#!/usr/bin/env python3
"""Parse the small YAML subset used by a cartridge's config.yaml manifest.

Why this exists (PY-1 / SR-2): Lukeatron's live baseline is Python standard
library only — no pip, no venv, no requirements.txt. PyYAML is a third-party
package, so GeneratorShell.spec.md's YAML manifest format is served by this
hand-rolled parser instead. It supports exactly the subset the manifest
needs: nested block mappings, block lists of scalars, block lists of
mappings (each list item's first line is "- key: value", further keys of
the same item continue at the item's own indent), quoted and unquoted
scalar strings, ints, floats, booleans, and null. It does NOT support flow
style (`{a: 1}` / `[1, 2]`), anchors, multi-document files, or block
scalars (`|`, `>`) — none of those appear in a cartridge manifest.

Import is free (PY-3): this module performs no I/O; call load_file() or
load() explicitly.
"""
from __future__ import annotations

import re
from pathlib import Path

_INT_RE = re.compile(r"-?\d+")
_FLOAT_RE = re.compile(r"-?\d+\.\d+")


def load_file(path: Path) -> dict:
    """Read and parse a YAML manifest file. Raises ValueError on malformed input."""
    return load(path.read_text(encoding="utf-8"))


def load(text: str) -> dict:
    """Parse a YAML-subset string into a plain dict/list/scalar tree."""
    lines = _tokenize(text)
    if not lines:
        return {}
    value, _next_idx = _parse_block(lines, 0, lines[0][0])
    return value if isinstance(value, dict) else {}


def _tokenize(text: str) -> list[tuple[int, str]]:
    """Strip comments/blank lines/doc markers; return (indent, content) pairs."""
    out: list[tuple[int, str]] = []
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        stripped = line.strip()
        if stripped == "---" or stripped.startswith("#"):
            continue
        indent = len(line) - len(line.lstrip(" "))
        out.append((indent, stripped))
    return out


def _parse_scalar(raw: str):
    s = raw.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    if len(s) >= 2 and s[0] == "'" and s[-1] == "'":
        return s[1:-1]
    if s in ("true", "True"):
        return True
    if s in ("false", "False"):
        return False
    if s in ("null", "~", ""):
        return None
    if _INT_RE.fullmatch(s):
        return int(s)
    if _FLOAT_RE.fullmatch(s):
        return float(s)
    return s


def _split_key_value(content: str) -> tuple[str, str]:
    """Split 'key: value' or 'key:' on the first colon not inside quotes."""
    in_quote = None
    for i, ch in enumerate(content):
        if in_quote:
            if ch == in_quote:
                in_quote = None
            continue
        if ch in ('"', "'"):
            in_quote = ch
            continue
        if ch == ":" and (i + 1 == len(content) or content[i + 1] == " "):
            return content[:i].strip(), content[i + 1:].strip()
    return content.strip(), ""


def _parse_block(lines: list[tuple[int, str]], start: int, indent: int):
    if start >= len(lines) or lines[start][0] != indent:
        return None, start
    if lines[start][1].startswith("- "):
        return _parse_list(lines, start, indent)
    return _parse_map(lines, start, indent)


def _parse_map(lines: list[tuple[int, str]], start: int, indent: int) -> tuple[dict, int]:
    result: dict = {}
    i = start
    while i < len(lines) and lines[i][0] == indent and not lines[i][1].startswith("- "):
        key, rest = _split_key_value(lines[i][1])
        if rest == "":
            i += 1
            if i < len(lines) and lines[i][0] > indent:
                value, i = _parse_block(lines, i, lines[i][0])
            else:
                value = None
        else:
            value = _parse_scalar(rest)
            i += 1
        result[key] = value
    return result, i


def _parse_list(lines: list[tuple[int, str]], start: int, indent: int) -> tuple[list, int]:
    result: list = []
    i = start
    item_indent = indent + 2
    while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
        item_content = lines[i][1][2:]
        if ":" in item_content:
            item: dict = {}
            key, rest = _split_key_value(item_content)
            if rest == "":
                i += 1
                if i < len(lines) and lines[i][0] > indent:
                    value, i = _parse_block(lines, i, lines[i][0])
                else:
                    value = None
            else:
                value = _parse_scalar(rest)
                i += 1
            item[key] = value
            while i < len(lines) and lines[i][0] == item_indent and not lines[i][1].startswith("- "):
                k2, rest2 = _split_key_value(lines[i][1])
                if rest2 == "":
                    i += 1
                    if i < len(lines) and lines[i][0] > item_indent:
                        v2, i = _parse_block(lines, i, lines[i][0])
                    else:
                        v2 = None
                else:
                    v2 = _parse_scalar(rest2)
                    i += 1
                item[k2] = v2
            result.append(item)
        else:
            result.append(_parse_scalar(item_content))
            i += 1
    return result, i
