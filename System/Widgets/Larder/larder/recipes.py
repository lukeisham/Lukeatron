"""Read saved recipes from the Recipes folder: parse one file, list them all, fetch one with its SVG.

Home's Larder route is the only caller and treats an `OSError` from the folder itself as a 500.
Read only (PY-12): nothing here creates, changes or removes a file.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

log = logging.getLogger("larder")

MAX_BYTES = 256 * 1024
MAX_RECIPES = 500
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
IGNORED_STEMS = frozenset({"recipes"})

LIST_FIELDS = ("slug", "title", "source", "mode", "time_total", "serves", "saved", "based_on",
               "ingredients", "has_svg")

_LABEL_LINE = re.compile(r"^\*\*([^*]+?)(?::\*\*|\*\*:)(.*)$")
_BULLET = re.compile(r"^(?:[-*+]|\d+\.)\s+")
_LABELS = {"ingredients": "ingredients", "method": "method", "notes": "notes"}


def _unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1].strip()
    return value


def _front_matter(lines: list[str]) -> tuple[dict[str, str | list[str]], list[str]]:
    """Split off the block between the first two `---` lines; return its fields and the body lines."""
    if not lines or lines[0].strip() != "---":
        return {}, lines
    closing = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if closing is None:
        return {}, lines
    fields: dict[str, str | list[str]] = {}
    for line in lines[1:closing]:
        key, colon, value = line.partition(":")
        if not colon or not key.strip():
            continue
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            items = [_unquote(part) for part in value[1:-1].split(",")]
            fields[key.strip().lower()] = [item for item in items if item]
        else:
            fields[key.strip().lower()] = _unquote(value)
    return fields, lines[closing + 1:]


def _paragraphs(body: list[str]) -> dict[str, list[str]]:
    """Map ingredients/method/notes to the lines of their bold-labelled paragraph (first one wins)."""
    found: dict[str, list[str]] = {}
    current: list[str] | None = None
    for line in body:
        stripped = line.strip()
        label = _LABEL_LINE.match(stripped)
        if label:
            name = next((v for k, v in _LABELS.items() if label.group(1).strip().lower().startswith(k)), None)
            current = found.setdefault(name, []) if name and name not in found else None
            if current is not None and label.group(2).strip():
                current.append(label.group(2).strip())
        elif not stripped:
            current = None
        elif current is not None:
            current.append(stripped)
    return found


def _ingredients(lines: list[str]) -> list[str]:
    """One-line `a; b; c` and one-per-line (bulleted or not) forms both give the same list."""
    items: list[str] = []
    for line in lines:
        cleaned = _BULLET.sub("", line)
        items.extend(part.strip() for part in cleaned.split(";"))
    if items and items[-1].endswith("."):
        items[-1] = items[-1][:-1].rstrip()
    return [item for item in items if item]


def _text(value: str | list[str] | None) -> str:
    if isinstance(value, list):
        return ", ".join(value)
    return value or ""


def parse_recipe(text: str) -> dict:
    """Turn a saved recipe's text into fields; anything missing is `""` or `[]`, never an error.

    The record has no `slug`, `has_svg` or `svg`: those come from the file name and folder.
    """
    fields, body = _front_matter(text.replace("\r\n", "\n").replace("\r", "\n").split("\n"))
    paragraphs = _paragraphs(body)
    heading = next((line[2:].strip() for line in body if line.startswith("# ")), "")
    equipment = fields.get("equipment", [])
    if isinstance(equipment, str):
        equipment = [equipment] if equipment else []
    mode = _text(fields.get("mode")) or (
        "thermomix" if any("thermomix" in item.lower() for item in equipment) else "conventional")
    return {
        "title": _text(fields.get("title")) or heading,
        "source": _text(fields.get("source")),
        "mode": mode,
        "serves": _text(fields.get("serves")),
        "time_total": _text(fields.get("time_total")),
        "time_hands_on": _text(fields.get("time_hands_on")),
        "equipment": equipment,
        "saved": _text(fields.get("saved")),
        "based_on": _text(fields.get("based_on")),
        "ingredients": _ingredients(paragraphs.get("ingredients", [])),
        "method": "\n".join(paragraphs.get("method", [])).strip(),
        "notes": "\n".join(paragraphs.get("notes", [])).strip(),
    }


def _read_limited(path: Path) -> str | None:
    """Return the file's text, or None (logged) when it is too big, unreadable or not UTF-8."""
    try:
        if path.stat().st_size > MAX_BYTES:
            log.warning("larder: skipping %s: over %d bytes", path.name, MAX_BYTES)
            return None
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as error:
        log.warning("larder: skipping %s: %s", path.name, error)
        return None


def _recipe_path(recipes_dir: Path, slug: str) -> Path | None:
    """The `<slug>.md` file directly inside the folder, or None when the slug or path is not safe."""
    if not SLUG_PATTERN.fullmatch(slug):
        return None
    candidate = recipes_dir / f"{slug}.md"
    if candidate.resolve().parent != recipes_dir.resolve():
        return None
    return candidate if candidate.is_file() else None


def _record(recipes_dir: Path, slug: str, text: str) -> dict:
    record = parse_recipe(text)
    record["title"] = record["title"] or slug
    record["slug"] = slug
    record["has_svg"] = (recipes_dir / f"{slug}.svg").is_file()
    return record


def list_recipes(recipes_dir: Path) -> list[dict]:
    """Search fields of every readable recipe, newest `saved` first then title, at most MAX_RECIPES."""
    records: list[dict] = []
    for path in recipes_dir.iterdir():
        slug = path.stem
        if (path.suffix != ".md" or slug in IGNORED_STEMS or not SLUG_PATTERN.fullmatch(slug)
                or _recipe_path(recipes_dir, slug) is None):
            continue
        text = _read_limited(path)
        if text is not None:
            full = _record(recipes_dir, slug, text)
            records.append({field: full[field] for field in LIST_FIELDS})
    records.sort(key=lambda record: record["title"].casefold())
    records.sort(key=lambda record: record["saved"], reverse=True)
    return records[:MAX_RECIPES]


def read_recipe(recipes_dir: Path, slug: str) -> dict | None:
    """Every field of one recipe plus its `svg` text, or None when it is absent, unsafe or unreadable."""
    path = _recipe_path(recipes_dir, slug)
    if path is None or slug in IGNORED_STEMS:
        return None
    text = _read_limited(path)
    if text is None:
        return None
    record = _record(recipes_dir, slug, text)
    record["svg"] = (_read_limited(recipes_dir / f"{slug}.svg") or "") if record["has_svg"] else ""
    return record
