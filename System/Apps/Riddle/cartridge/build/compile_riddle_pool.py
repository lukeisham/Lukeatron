#!/usr/bin/env python3
"""Compile the Riddle cartridge's item pool from the seed research doc.

Reads ``_research/seed/riddles.md`` (Luke's harvested riddle collection,
labelled-bold-field dialect: entries separated by a bare ``---`` line, each
a ``#### Riddle <ID>`` heading followed by ``**Label:** value`` lines) and
writes two build outputs, both derived from the same parse so they can
never drift apart (DECISIONS.md's "single source of truth" discipline):

  * ``pool.json``          — the present-mode ENGINE's item pool (PoolItem[]
                              keyed by id), read directly by engine.js.
  * ``riddle_content.md``  — the same 61 entries re-serialised in the exact
                              dialect ``_modules/MiniWiki/build/
                              extract_catalogue.py`` expects, so the MiniWiki
                              catalogue is compiled from this file, not
                              hand-authored separately (SR-4).

Each riddle's id prefix (``EX-``, ``GR-``, ``NO-``, ``EN-``, ``JW-``,
``CH-``, ``AF-``, ``FO-``) already encodes which of the seed doc's eight
tradition sections it belongs to; CATEGORY_BY_PREFIX below is the single
place that mapping is declared (config.yaml's ``generator.categories`` must
list the same eight ids/labels).

Usage:
  python3 compile_riddle_pool.py <seed.md> <pool.json> <content.md>

Stdlib only (PY-1/SR-2).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HEADING_RE = re.compile(r"^####\s+Riddle\s+(\S+)\s*$")
ANY_HEADING_RE = re.compile(r"^#{1,6}\s+")
LABEL_RE = re.compile(r"^\*\*([^*:]+):\*\*\s*(.*)$")
PAREN_RE = re.compile(r"\s*\(.*\)\s*$")
BRACKET_LIST_RE = re.compile(r"^\[(.*)\]$")

CATEGORY_BY_PREFIX: dict[str, tuple[str, str]] = {
    "EX": ("anglo-saxon", "Anglo-Saxon (Exeter Book)"),
    "GR": ("greek", "Greek & Classical"),
    "NO": ("norse", "Norse / Viking"),
    "EN": ("english", "English Nursery Rhymes"),
    "JW": ("biblical", "Biblical & Jewish"),
    "CH": ("chinese", "Chinese (Lantern Festival)"),
    "AF": ("african", "African (Zulu & Swahili)"),
    "FO": ("folk", "Universal Folk"),
}


class CompileError(Exception):
    """Raised for any malformed seed input (PY-6); message is the whole story."""


def split_riddle_blocks(text: str) -> list[list[str]]:
    """Split the seed document into per-riddle line-groups, each starting
    at its own ``#### Riddle <ID>`` heading and running to (but not past)
    the next Markdown heading of ANY level. A riddle's trailing field
    (e.g. its licence note) sits directly above the next tradition-section
    ``###`` heading with no ``---`` between them in the source, so any
    heading — not just the next ``#### Riddle`` — must close the current
    block, or the following section title gets folded into the last
    field's continuation text. Everything before the first riddle heading
    (the collection summary) and everything after the last riddle's own
    section (Answer-Checking Guidance, metadata, sources list) is
    discarded — those runs never start with ``#### Riddle``."""
    blocks: list[list[str]] = []
    current: list[str] | None = None
    for line in text.splitlines():
        stripped = line.strip()
        if HEADING_RE.match(stripped):
            if current is not None:
                blocks.append(current)
            current = [line]
            continue
        if ANY_HEADING_RE.match(stripped):
            if current is not None:
                blocks.append(current)
            current = None
            continue
        if current is not None:
            current.append(line)
    if current is not None:
        blocks.append(current)
    return blocks


def parse_fields(lines: list[str]) -> dict[str, str]:
    """``**Label:** value`` lines (continuation lines folded in with a
    single space), same accumulation rule as extract_catalogue.py's
    parse_block() — this is the same dialect, parsed the same way."""
    fields: dict[str, str] = {}
    current_label: str | None = None
    current_value: list[str] = []

    def flush() -> None:
        if current_label is not None:
            joined = " ".join(v.strip() for v in current_value if v.strip())
            fields[current_label] = joined.strip()

    for raw in lines:
        stripped = raw.strip()
        if not stripped or stripped == "---":
            continue
        match = LABEL_RE.match(stripped)
        if match:
            flush()
            current_label = match.group(1).strip().lower()
            rest = match.group(2).strip()
            current_value = [rest] if rest else []
            continue
        if current_label is not None:
            current_value.append(stripped)
    flush()
    return fields


def parse_variants(raw: str) -> list[str]:
    inner_match = BRACKET_LIST_RE.match(raw.strip())
    inner = inner_match.group(1) if inner_match else raw
    variants = [v.strip() for v in inner.split(",") if v.strip()]
    seen: set[str] = set()
    ordered: list[str] = []
    for v in variants:
        key = v.lower()
        if key not in seen:
            seen.add(key)
            ordered.append(v)
    return ordered


def canonical_answer(raw_answer: str) -> str:
    """Strip a trailing parenthetical ("Bookworm (or book-eating moth)" ->
    "Bookworm") to get the single form Levenshtein tolerance is measured
    against (Answer-Checking Guidance: "fuzzy match against canonical
    only")."""
    stripped = PAREN_RE.sub("", raw_answer).strip()
    return stripped or raw_answer.strip()


def build_item(riddle_id: str, fields: dict[str, str]) -> dict:
    prefix = riddle_id.split("-")[0]
    category = CATEGORY_BY_PREFIX.get(prefix)
    if category is None:
        raise CompileError(f"riddle id '{riddle_id}' has an unrecognised prefix '{prefix}'")

    required = ("text", "answer", "accepted variants", "clue", "difficulty", "tradition/origin", "source")
    missing = [key for key in required if not fields.get(key)]
    if missing:
        raise CompileError(f"riddle {riddle_id} is missing field(s): {missing}")

    display_answer = fields["answer"]
    licence = fields.get("licence/public-domain note", "")

    return {
        "id": riddle_id,
        "category": category[0],
        "text": fields["text"],
        "canonicalAnswer": canonical_answer(display_answer),
        "displayAnswer": display_answer,
        "variants": parse_variants(fields["accepted variants"]),
        "clue": fields["clue"],
        "difficulty": fields["difficulty"].lower(),
        "tradition": fields["tradition/origin"],
        "source": fields["source"],
        "licence": licence,
    }


def compile_pool(seed_path: Path) -> dict[str, dict]:
    text = seed_path.read_text(encoding="utf-8")
    blocks = split_riddle_blocks(text)
    if not blocks:
        raise CompileError(f"{seed_path.name}: no '#### Riddle <ID>' headings found")

    pool: dict[str, dict] = {}
    for block in blocks:
        heading_match = HEADING_RE.match(block[0].strip())
        assert heading_match is not None  # split_riddle_blocks guarantees this
        riddle_id = heading_match.group(1)
        fields = parse_fields(block[1:])
        if riddle_id in pool:
            raise CompileError(f"duplicate riddle id: {riddle_id}")
        pool[riddle_id] = build_item(riddle_id, fields)
    return pool


def render_content_md(pool: dict[str, dict]) -> str:
    """Re-serialise the compiled pool as a MiniWiki-catalogue-dialect
    markdown file (extract_catalogue.py's labelled-field format): one
    heading + labelled-field block per riddle, separated by ``---``. The
    catalogue is a *reference* view (all 61 riddles readable with their
    answers, source, and licence), not the play interface — so the title
    names the answer, unlike the pool's own withheld-answer presentation."""
    lines: list[str] = []
    for riddle_id, item in pool.items():
        title = f"{riddle_id} — {item['canonicalAnswer']}"
        lines.append(f"#### {title}")
        lines.append("")
        lines.append(f"**id:** {riddle_id}")
        lines.append(f"**title:** {title}")
        lines.append(f"**text:** {item['text']}")
        lines.append(f"**answer:** {item['displayAnswer']}")
        lines.append(f"**accepted variants:** [{', '.join(item['variants'])}]")
        lines.append(f"**clue:** {item['clue']}")
        lines.append(f"**difficulty:** {item['difficulty']}")
        lines.append(f"**tradition/origin:** {item['tradition']}")
        lines.append(f"**source:** {item['source']}")
        if item["licence"]:
            lines.append(f"**licence/public-domain note:** {item['licence']}")
        lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("seed_md", type=Path)
    parser.add_argument("pool_json", type=Path)
    parser.add_argument("content_md", type=Path)
    args = parser.parse_args()

    if not args.seed_md.exists():
        sys.exit(f"compile_riddle_pool.py: not found: {args.seed_md}")

    try:
        pool = compile_pool(args.seed_md)
    except CompileError as exc:
        sys.exit(f"compile_riddle_pool.py: {exc}")

    args.pool_json.write_text(json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8")
    args.content_md.write_text(render_content_md(pool), encoding="utf-8")
    print(f"wrote {args.pool_json}: {len(pool)} riddles")
    print(f"wrote {args.content_md}: {len(pool)} entries")


if __name__ == "__main__":
    main()
