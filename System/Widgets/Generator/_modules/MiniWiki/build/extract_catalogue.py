#!/usr/bin/env python3
"""Extract a flat MiniWiki catalogue JSON from a Generator content file
whose entries carry labelled bold fields (``**Field:** value``), not
Parser's dotted outline (see ``extract_articles.py`` for that dialect).

This is the dialect used by the four Generator cartridges' seed content
(``_research/seed/riddles.md``, ``folk-tales.md``, and their psychometric
/ AiCharacteristics siblings): entries are separated by a bare ``---``
line, each carrying an optional Markdown heading followed by one or more
``**Label:** value`` lines. A value may run onto the following
non-label lines (e.g. ``**tale_text:**`` with the paragraph starting on
the next line) — those continuation lines are folded into the field with
a single space, matching how the source prose wraps.

Only chunks that look like real catalogue entries become articles: a
chunk needs BOTH a body-text field (``text`` or ``tale_text``) and a
``source`` field, which reliably separates riddle/tale entries from the
files' prose sections (collection summaries, answer-checking guidance,
metadata tables) that carry neither.

Every emitted article is a FLAT catalogue entry (MiniWikiModule's
"flat catalogue" shape — see ``_research/miniwiki-module.md`` §6):
``level: 1``, ``role: "article"``, ``parent: null``, ``children: []``.
Any other labelled field the source carries (answer, clue, difficulty,
tradition/origin, culture/region, setup/twist/result spans, …) is folded
into ``characteristics`` as ``"<Human Label>: <value>"`` — visible on the
article page's existing "Key characteristics" section, nothing new to
render. ``source`` and ``licence`` become their own top-level fields
(the two additions this catalogue mode needs beyond extract_articles.py's
shape) so the widget can show attribution without inventing a citation.

Usage:
  python3 extract_catalogue.py <content.md> [--out catalogue.json]

Stdlib only (PY-1/SR-2).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from text_utils import escape_html, first_sentence, strip_emphasis

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
LABEL_RE = re.compile(r"^\*\*([^*:]+):\*\*\s*(.*)$")
LEADING_NUMBER_RE = re.compile(r"^\d+\.\s*")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")

TEXT_KEYS = {"text", "tale_text"}
ID_KEYS = {"id"}
TITLE_KEYS = {"title"}
SOURCE_KEYS = {"source"}
EXCLUDED_FROM_CHARACTERISTICS = TEXT_KEYS | ID_KEYS | TITLE_KEYS | SOURCE_KEYS | {"word_count"}


class CatalogueError(Exception):
    """Raised for any malformed or empty input (PY-6); message is the whole story."""


def norm_key(label: str) -> str:
    """Normalise a raw bold-label (``"Licence/Public-Domain Note"``) to a
    comparison key (``"licence_public_domain_note"``) — case- and
    punctuation-insensitive matching against the known field aliases."""
    return re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")


def is_licence_key(key: str) -> bool:
    return "licence" in key or "license" in key


def humanize_label(label: str) -> str:
    return label.replace("_", " ").strip().title()


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "item"


def strip_markdown_links(text: str) -> str:
    """``[label](url)`` -> ``label``; multiple links stay comma-joined as
    they already are in the source ("[A](u1); [B](u2)")."""
    return MD_LINK_RE.sub(r"\1", text).strip()


def split_blocks(text: str) -> list[list[str]]:
    """Split the whole file into blocks at every Markdown heading (any
    level) and every bare ``---`` line. A heading always starts a new
    block — this is what keeps a document's own intro/group headings
    (``# Title``, ``## Some Culture``) from swallowing the first real
    entry that follows them with no ``---`` in between, and keeps a
    group heading with no fields of its own from picking up its
    following item's fields (that item gets its own block, starting at
    its own heading)."""
    blocks: list[list[str]] = []
    current: list[str] = []

    def flush() -> None:
        if current:
            blocks.append(list(current))
        current.clear()

    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if stripped == "---":
            flush()
            continue
        if HEADING_RE.match(stripped):
            flush()
            current.append(raw_line)
            continue
        current.append(raw_line)
    flush()
    return blocks


def parse_block(lines: list[str]) -> tuple[str | None, list[tuple[str, str]]]:
    """One block (bounded by split_blocks(), so at most one heading, on
    its own first line if present) -> (heading text or None, ordered
    [(raw_label, value), ...]). A value with no inline text (label line
    ends bare) accumulates every following non-label line until the next
    label line, joined with a single space."""
    heading: str | None = None
    fields: list[tuple[str, str]] = []
    current_label: str | None = None
    current_value: list[str] = []
    at_start = True

    def flush() -> None:
        nonlocal current_label, current_value
        if current_label is not None:
            joined = " ".join(v.strip() for v in current_value if v.strip()).strip()
            fields.append((current_label, joined.strip('"')))
        current_label = None
        current_value = []

    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        if at_start:
            heading_match = HEADING_RE.match(stripped)
            at_start = False
            if heading_match:
                heading = heading_match.group(2).strip()
                continue
        label_match = LABEL_RE.match(stripped)
        if label_match:
            flush()
            current_label = label_match.group(1).strip()
            rest = label_match.group(2).strip()
            if rest:
                current_value.append(rest)
            continue
        if current_label is not None:
            current_value.append(stripped)
    flush()
    return heading, fields


def build_article(block_index: int, heading: str | None, fields: list[tuple[str, str]], used_ids: set[str]) -> dict:
    by_key: dict[str, str] = {}
    for raw_label, value in fields:
        by_key.setdefault(norm_key(raw_label), value)

    text_value = next((by_key[k] for k in ("text", "tale_text") if by_key.get(k)), "")
    if not text_value:
        raise CatalogueError(f"catalogue entry #{block_index} has a source field but no text/tale_text field")

    raw_id = by_key.get("id", "").strip()
    if raw_id:
        article_id = raw_id
    else:
        base = slugify(LEADING_NUMBER_RE.sub("", heading) if heading else f"item-{block_index}")
        article_id = base
        suffix = 2
        while article_id in used_ids:
            article_id = f"{base}-{suffix}"
            suffix += 1
    used_ids.add(article_id)

    title = by_key.get("title", "").strip()
    if not title:
        title = LEADING_NUMBER_RE.sub("", heading).strip() if heading else article_id

    source_raw = by_key.get("source", "").strip()
    source = strip_markdown_links(source_raw) if source_raw else ""

    licence = ""
    for raw_label, value in fields:
        if is_licence_key(norm_key(raw_label)) and value.strip():
            licence = value.strip()
            break

    characteristics: list[str] = []
    for raw_label, value in fields:
        key = norm_key(raw_label)
        if key in EXCLUDED_FROM_CHARACTERISTICS or is_licence_key(key):
            continue
        if value.strip():
            characteristics.append(f"{humanize_label(raw_label)}: {value.strip()}")

    body_html = f"<p>{escape_html(strip_emphasis(text_value))}</p>"

    article: dict = {
        "id": article_id,
        "title": title,
        "level": 1,
        "role": "article",
        "lead": first_sentence(text_value),
        "body_html": body_html,
        "parent": None,
        "children": [],
        "siblings": [],
    }
    if characteristics:
        article["characteristics"] = characteristics
    if source:
        article["source"] = source
    if licence:
        article["licence"] = licence
    return article


def extract(md_path: Path) -> dict[str, dict]:
    text = md_path.read_text(encoding="utf-8")
    blocks = [b for b in split_blocks(text) if any(l.strip() for l in b)]

    articles: dict[str, dict] = {}
    used_ids: set[str] = set()
    for index, block in enumerate(blocks, start=1):
        heading, fields = parse_block(block)
        by_key = {norm_key(k): v for k, v in fields}
        has_text = any(by_key.get(k) for k in TEXT_KEYS)
        has_source = bool(by_key.get("source"))
        if not (has_text and has_source):
            continue  # prose section (summary, guidance, metadata) — not a catalogue entry
        article = build_article(index, heading, fields, used_ids)
        articles[article["id"]] = article

    if not articles:
        raise CatalogueError(f"{md_path.name} produced zero catalogue entries — check the labelled-field format")

    return articles


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("content_md", type=Path)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    if not args.content_md.exists():
        sys.exit(f"extract_catalogue.py: not found: {args.content_md}")

    try:
        articles = extract(args.content_md)
    except CatalogueError as exc:
        sys.exit(f"extract_catalogue.py: {exc}")

    out_path = args.out or args.content_md.with_suffix(".miniwiki.json")
    out_path.write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out_path}: {len(articles)} articles")


if __name__ == "__main__":
    main()
