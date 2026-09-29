#!/usr/bin/env python3
"""Compile the Psychometric cartridge's item pool from the seed research
doc (``_research/seed/psychometrics.md``, "### Item <ID>" dialect: entries
separated by ATX headings, each carrying ``**field:** value`` lines).

Four of the five categories (SJT, VCR, DAR, DIR) parse straight out of the
seed's labelled fields. The fifth, Abstract/Diagrammatic Reasoning, is
**structured data hand-authored in ``abstract_specs.py``**
(DECISIONS.md D-3) — its stimulus is a grid/sequence/odd-one-out rule spec,
never literal SVG or a hand-recorded answer letter; only its clue,
explainer prose, and difficulty are pulled from the same seed parse as
everything else, so that prose can't drift from the shared source.

Writes two build outputs, both derived from one parse (SR-4):
  * ``pool.json``               — present-mode ENGINE's item pool.
  * ``psychometric_content.md`` — the same items re-serialised in the
    labelled-bold-field dialect ``extract_catalogue.py`` expects, for the
    MiniWiki catalogue.

Usage:
  python3 build_psychometric.py <seed.md> <pool.json> <content.md>

Stdlib only (PY-1/SR-2).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from abstract_specs import ABSTRACT_SPECS  # noqa: E402

ITEM_HEADING_RE = re.compile(r"^###\s+Item\s+(\S+)\s*$")
ANY_HEADING_RE = re.compile(r"^#{1,6}\s+")
FIELD_RE = re.compile(r"^\*\*([A-Za-z_ ]+):\*\*\s?(.*)$")
OPTION_RE = re.compile(r"^-\s*([A-E]):\s*(.*)$")
RATE_ENTRY_RE = re.compile(r"^([A-E]):(\d+)$")
BOLD_RE = re.compile(r"\*\*(.+?)\*\*")

CATEGORY_BY_PREFIX: dict[str, str] = {
    "SJT": "situational-judgement",
    "VCR": "verbal-critical-reasoning",
    "AR": "abstract-reasoning",
    "DAR": "deductive-analytical",
    "DIR": "data-interpretation",
}


class CompileError(Exception):
    """Raised for any malformed seed input (PY-6); message is the whole story."""


def strip_markdown(text: str) -> str:
    return BOLD_RE.sub(r"\1", text).strip()


def split_item_blocks(text: str) -> list[list[str]]:
    """Split the seed doc into per-item line-groups, each starting at its
    own ``### Item <ID>`` heading and running to (but not past) the next
    Markdown heading of any level — mirrors compile_riddle_pool.py's
    split_riddle_blocks() for the same reason: a trailing field can sit
    directly above the next section heading with no ``---`` between."""
    blocks: list[list[str]] = []
    current: list[str] | None = None
    for line in text.splitlines():
        stripped = line.strip()
        if ITEM_HEADING_RE.match(stripped):
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
    """``**field:** value`` lines, continuation lines folded in with a
    newline (needed so ``**stimulus:**``'s fenced code blocks and
    ``**options:**``'s bullet list keep their internal line breaks)."""
    fields: dict[str, list[str]] = {}
    current: str | None = None

    def flush() -> None:
        if current is not None:
            fields[current] = fields.get(current, [])

    for raw in lines:
        if raw.strip() == "---":
            continue
        match = FIELD_RE.match(raw)
        if match:
            current = match.group(1).strip().lower()
            fields.setdefault(current, [])
            rest = match.group(2)
            if rest:
                fields[current].append(rest)
            continue
        if current is not None:
            fields[current].append(raw)
    flush()
    return {k: "\n".join(v).strip() for k, v in fields.items()}


def parse_options(raw: str) -> dict[str, str]:
    options: dict[str, str] = {}
    for line in raw.splitlines():
        match = OPTION_RE.match(line.strip())
        if match:
            options[match.group(1)] = strip_markdown(match.group(2))
    return options


def parse_sjt_order(raw: str) -> list[str]:
    """Both SJT answer-key dialects reduce to one best-to-worst ordering:
    rank format is already that ordering (``"B, D, A, E, C"``); rate
    format (``"A:1, C:2, B:3, D:4, E:5"``) sorts by its rating ascending
    (1 = most appropriate)."""
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if not parts:
        raise CompileError(f"empty SJT correct_answer: {raw!r}")
    if RATE_ENTRY_RE.match(parts[0]):
        rated: list[tuple[str, int]] = []
        for part in parts:
            match = RATE_ENTRY_RE.match(part)
            if not match:
                raise CompileError(f"malformed SJT rate entry: {part!r}")
            rated.append((match.group(1), int(match.group(2))))
        rated.sort(key=lambda pair: pair[1])
        return [letter for letter, _rank in rated]
    return parts


NUMBER_RE = re.compile(r"([£$]?)(\d[\d,]*(?:\.\d+)?)\s*(%?)")


def extract_numeric_target(option_text: str) -> dict | None:
    """First number in the correct option's own text (DIR's numeric-
    tolerance check compares a free-typed number against this), e.g.
    "1,440 units (120 x 12)" -> {value: 1440, isPercent: false}."""
    match = NUMBER_RE.search(option_text)
    if not match:
        return None
    value = float(match.group(2).replace(",", ""))
    return {"value": value, "isPercent": bool(match.group(3))}


def parse_table(stimulus: str) -> dict | None:
    """DIR stimuli embed a fenced ``TABLE:``/``CHART:`` block. Pipe-delimited
    lines become an HTML-renderable table (header + rows); any non-pipe
    lines (title, trailing totals/notes) are kept as plain caption lines.
    Returns None if the stimulus has no pipe-delimited table to extract."""
    fence_match = re.search(r"```(.*?)```", stimulus, re.DOTALL)
    body = fence_match.group(1) if fence_match else stimulus
    lines = [l for l in body.splitlines() if l.strip()]
    pipe_lines = [l for l in lines if "|" in l]
    if not pipe_lines:
        return None
    notes = [l.strip() for l in lines if "|" not in l]
    rows = [[cell.strip() for cell in l.split("|")] for l in pipe_lines]
    return {"header": rows[0], "rows": rows[1:], "notes": notes}


def build_generic_item(item_id: str, category: str, fields: dict[str, str]) -> dict:
    required = ("stimulus", "question", "options", "correct_answer", "clue", "explainer", "difficulty")
    missing = [key for key in required if not fields.get(key)]
    if missing:
        raise CompileError(f"item {item_id} is missing field(s): {missing}")

    options = parse_options(fields["options"])
    if len(options) != 5:
        raise CompileError(f"item {item_id} does not have exactly 5 lettered options")

    item: dict = {
        "id": item_id,
        "category": category,
        "stimulus": strip_markdown(fields["stimulus"]),
        "question": strip_markdown(fields["question"]),
        "options": options,
        "clue": strip_markdown(fields["clue"]),
        "explainerText": strip_markdown(fields["explainer"]),
        "difficulty": fields["difficulty"].strip().lower(),
    }

    if category == "situational-judgement":
        item["correctOrder"] = parse_sjt_order(fields["correct_answer"])
    else:
        letter = fields["correct_answer"].strip().upper()
        if letter not in options:
            raise CompileError(f"item {item_id} correct_answer '{letter}' is not one of its options")
        item["correctLetter"] = letter
        if category == "data-interpretation":
            item["numericTarget"] = extract_numeric_target(options[letter])
            table = parse_table(fields["stimulus"])
            if table:
                item["table"] = table

    return item


def build_abstract_item(item_id: str, fields: dict[str, str]) -> dict:
    spec = ABSTRACT_SPECS.get(item_id)
    if spec is None:
        raise CompileError(f"abstract item {item_id} has no hand-authored rule spec in abstract_specs.py")
    required = ("clue", "explainer", "difficulty")
    missing = [key for key in required if not fields.get(key)]
    if missing:
        raise CompileError(f"item {item_id} is missing field(s): {missing}")

    item = dict(spec)
    item["id"] = item_id
    item["category"] = "abstract-reasoning"
    item["clue"] = strip_markdown(fields["clue"])
    item["explainerText"] = strip_markdown(fields["explainer"])
    item["difficulty"] = fields["difficulty"].strip().lower()
    return item


def compile_pool(seed_path: Path) -> dict[str, dict]:
    text = seed_path.read_text(encoding="utf-8")
    blocks = split_item_blocks(text)
    if not blocks:
        raise CompileError(f"{seed_path.name}: no '### Item <ID>' headings found")

    pool: dict[str, dict] = {}
    for block in blocks:
        heading_match = ITEM_HEADING_RE.match(block[0].strip())
        assert heading_match is not None  # split_item_blocks guarantees this
        item_id = heading_match.group(1)
        prefix = item_id.split("-")[0]
        category = CATEGORY_BY_PREFIX.get(prefix)
        if category is None:
            raise CompileError(f"item id '{item_id}' has an unrecognised prefix '{prefix}'")
        fields = parse_fields(block[1:])
        if item_id in pool:
            raise CompileError(f"duplicate item id: {item_id}")
        if category == "abstract-reasoning":
            pool[item_id] = build_abstract_item(item_id, fields)
        else:
            pool[item_id] = build_generic_item(item_id, category, fields)

    missing_abstract = set(ABSTRACT_SPECS) - set(pool)
    if missing_abstract:
        raise CompileError(f"abstract_specs.py declares items absent from the seed doc: {sorted(missing_abstract)}")
    return pool


def render_content_md(pool: dict[str, dict]) -> str:
    """Re-serialise the compiled pool as a MiniWiki-catalogue-dialect
    markdown file (extract_catalogue.py's labelled-field format)."""
    lines: list[str] = []
    for item_id, item in pool.items():
        title = f"{item_id} ({item['category']}, {item['difficulty']})"
        lines.append(f"#### {title}")
        lines.append("")
        lines.append(f"**id:** {item_id}")
        lines.append(f"**title:** {title}")
        stimulus = item.get("stimulus") or item.get("clue") or item["id"]
        question = item.get("question") or ""
        text = (stimulus + " " + question).strip() if question else stimulus
        lines.append(f"**text:** {text}")
        lines.append(f"**category:** {item['category']}")
        lines.append(f"**difficulty:** {item['difficulty']}")
        lines.append(f"**clue:** {item['clue']}")
        lines.append("**source:** Original — Lukeatron Psychometric seed content")
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
        sys.exit(f"build_psychometric.py: not found: {args.seed_md}")

    try:
        pool = compile_pool(args.seed_md)
    except CompileError as exc:
        sys.exit(f"build_psychometric.py: {exc}")

    args.pool_json.write_text(json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8")
    args.content_md.write_text(render_content_md(pool), encoding="utf-8")
    print(f"wrote {args.pool_json}: {len(pool)} items")
    print(f"wrote {args.content_md}: {len(pool)} entries")


if __name__ == "__main__":
    main()
