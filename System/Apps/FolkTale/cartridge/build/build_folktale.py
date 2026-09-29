#!/usr/bin/env python3
"""Compile FolkTale's item pool + MiniWiki content source from the seed
research file (`_research/seed/folk-tales.md`).

Reads the seed's labelled-bold-field dialect (one tale per `### N. Title`
heading, `**Label:** value` fields, entries separated by `---`), validates
every tale against the 400-word cap (hard build failure over cap, PY-6),
and writes two build-time artefacts beside this script:

  * pool.json            — files.content for the present-mode ENGINE
                            (GeneratorShell.spec.md FR-D2), keyed by id.
  * folktale_content.md  — MiniWiki's labelled-bold-field dialect
                            (_modules/MiniWiki/build/extract_catalogue.py),
                            one block per tale, source/licence/translator/
                            year preserved as their own fields.

`source`, `translator`, and `year` are distinct fields in the seed's
`**source:**` line (e.g. "Vernon Jones translation (1912), Project
Gutenberg") — this script best-effort splits that free-text line into a
translator/editor name and a publication year (or year range) via
regex, since the seed does not carry them as separate labelled fields.
Where no year is present in the source line (the Ashliman/ethnographic
entries), `year` is left empty rather than guessed (PY-6/JS-2 "never
fail silently, but never fabricate" principle applied to data, not just
code paths).

Usage:
  python3 build_folktale.py

Stdlib only (PY-1/SR-2).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SEED_PATH = Path(__file__).resolve().parents[3] / "_research" / "seed" / "folk-tales.md"
BUILD_DIR = Path(__file__).resolve().parent
POOL_OUT = BUILD_DIR / "pool.json"
CONTENT_MD_OUT = BUILD_DIR / "folktale_content.md"

WORD_CAP = 400

HEADING_RE = re.compile(r"^###\s+\d+\.\s+(.+?)\s*$")
LABEL_RE = re.compile(r"^\*\*([^*:]+):\*\*\s*(.*)$")
YEAR_RE = re.compile(r"\((\d{4}(?:-\d{4})?)\)")

# Seed's raw "culture/region" values fold to a fixed set of category ids
# (config.yaml's generator.categories) — a few entries carry a
# parenthetical sub-group (e.g. "Native America (Anishinaabe)") that
# collapses to the broader region for the category filter, while the
# original text is kept verbatim in the tale's own `culture` field.
#
# 2026-08-13 (Luke's instruction): "Turkey/Middle East" removed and its 4
# Nasreddin Hodja tales deleted from the seed; replaced with "Persia
# (Pre-Islamic)" (Shahnameh legendary era, Helen Zimmern's 1883 translation).
# Two new genre categories added alongside the existing culture/region ones:
# "American Gothic" and "Australian Gothic" — these are literary-tradition
# categories, not geographic culture/region ones, but fold through the same
# CATEGORY_OF_CULTURE mechanism since the seed's culture_region field is
# reused as the category-grouping key regardless of whether the grouping is
# geographic or generic.
CATEGORY_OF_CULTURE = {
    "Ancient Greece": "ancient-greece",
    "Germany": "germany",
    "India": "india",
    "Ireland": "ireland",
    "Japan": "japan",
    "Native America": "native-america",
    "Native America (Anishinaabe)": "native-america",
    "Native America (Northeastern tribes)": "native-america",
    "Russia": "russia",
    "Persia (Pre-Islamic)": "persian",
    "American Gothic": "american-gothic",
    "Australian Gothic": "australian-gothic",
}

CATEGORY_LABELS = {
    "ancient-greece": "Ancient Greece",
    "germany": "Germany",
    "india": "India",
    "ireland": "Ireland",
    "japan": "Japan",
    "native-america": "Native America",
    "russia": "Russia",
    "persian": "Persia (Pre-Islamic)",
    "american-gothic": "American Gothic",
    "australian-gothic": "Australian Gothic",
}


class SeedError(Exception):
    """Raised for any malformed seed entry or cap violation (PY-6)."""


def split_blocks(text: str) -> list[list[str]]:
    """Seed file -> per-heading blocks, split at every bare `---` line
    (mirrors extract_catalogue.py's split_blocks(), but this script only
    needs the ### N. Title heading form the seed actually uses)."""
    blocks: list[list[str]] = []
    current: list[str] = []
    for raw_line in text.splitlines():
        if raw_line.strip() == "---":
            if current:
                blocks.append(current)
            current = []
            continue
        current.append(raw_line)
    if current:
        blocks.append(current)
    return blocks


def parse_fields(lines: list[str]) -> tuple[str | None, dict[str, str]]:
    """One block -> (heading title or None, {normalised_label: value})."""
    heading: str | None = None
    fields: dict[str, str] = {}
    current_label: str | None = None
    current_value: list[str] = []

    def flush() -> None:
        nonlocal current_label, current_value
        if current_label is not None:
            joined = " ".join(v.strip() for v in current_value if v.strip()).strip()
            fields[current_label] = joined.strip('"')
        current_label = None
        current_value = []

    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        heading_match = HEADING_RE.match(stripped)
        if heading_match:
            heading = heading_match.group(1).strip()
            continue
        label_match = LABEL_RE.match(stripped)
        if label_match:
            flush()
            current_label = label_match.group(1).strip().lower().replace("/", "_")
            rest = label_match.group(2).strip()
            if rest:
                current_value.append(rest)
            continue
        if current_label is not None:
            current_value.append(stripped)
    flush()
    return heading, fields


def split_source(source: str) -> tuple[str, str]:
    """"Vernon Jones translation (1912), Project Gutenberg" -> ("Vernon
    Jones translation", "1912"). Best-effort: the seed's `source` line is
    free text, not separate translator/year fields (see module docstring).
    """
    year_match = YEAR_RE.search(source)
    year = year_match.group(1) if year_match else ""
    before_year = source[: year_match.start()].strip() if year_match else source
    translator = before_year.split(",")[0].strip().rstrip("(").strip()
    return translator, year


def word_count(text: str) -> int:
    return len(text.split())


def parse_seed(seed_path: Path) -> list[dict]:
    text = seed_path.read_text(encoding="utf-8")
    blocks = split_blocks(text)

    tales: list[dict] = []
    used_ids: set[str] = set()
    for block_index, block in enumerate(blocks, start=1):
        heading, fields = parse_fields(block)
        tale_text = fields.get("tale_text", "")
        source = fields.get("source", "")
        if not tale_text or not source:
            continue  # not a tale entry (group heading, guidance, metadata section)

        tale_id = fields.get("id", "").strip()
        if not tale_id:
            raise SeedError(f"seed block #{block_index} ({heading!r}) has tale_text but no id field")
        if tale_id in used_ids:
            raise SeedError(f"duplicate tale id in seed file: {tale_id}")
        used_ids.add(tale_id)

        culture = fields.get("culture_region", "").strip()
        category = CATEGORY_OF_CULTURE.get(culture)
        if category is None:
            raise SeedError(f"tale {tale_id}: unrecognised culture/region {culture!r} — add it to CATEGORY_OF_CULTURE")

        count = word_count(tale_text)
        if count > WORD_CAP:
            raise SeedError(f"tale {tale_id} ({fields.get('title', heading)!r}) is {count} words — exceeds the {WORD_CAP}-word cap")

        translator, year = split_source(source)

        for required in ("setup_span", "twist_span", "result_span"):
            if not fields.get(required):
                raise SeedError(f"tale {tale_id} is missing required field {required}")

        tales.append(
            {
                "id": tale_id,
                "category": category,
                "title": fields.get("title", heading or tale_id).strip(),
                "culture": culture,
                "tale": tale_text,
                "setupSpan": fields["setup_span"],
                "twistSpan": fields["twist_span"],
                "resultSpan": fields["result_span"],
                "wordCount": count,
                "source": source,
                "translator": translator,
                "year": year,
                "licence": fields.get("licence_note", "").strip(),
            }
        )

    if not tales:
        raise SeedError(f"{seed_path.name} produced zero tale entries — check the labelled-field format")
    return tales


def write_pool_json(tales: list[dict], out_path: Path) -> None:
    pool = {tale["id"]: tale for tale in tales}
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(pool, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def write_content_md(tales: list[dict], out_path: Path) -> None:
    lines: list[str] = ["# FolkTale generator: compiled content", ""]
    for tale in tales:
        lines.append(f"### {tale['title']}")
        lines.append("")
        lines.append(f"**id:** {tale['id']}")
        lines.append(f"**title:** {tale['title']}")
        lines.append(f"**culture/region:** {tale['culture']}")
        lines.append("**tale_text:**")
        lines.append(tale["tale"])
        lines.append("")
        lines.append(f"**setup_span:** {tale['setupSpan']}")
        lines.append("")
        lines.append(f"**twist_span:** {tale['twistSpan']}")
        lines.append("")
        lines.append(f"**result_span:** {tale['resultSpan']}")
        lines.append("")
        lines.append(f"**translator:** {tale['translator'] or 'unattributed'}")
        lines.append(f"**year:** {tale['year'] or 'undated'}")
        lines.append(f"**source:** {tale['source']}")
        lines.append(f"**licence:** {tale['licence']}")
        lines.append("")
        lines.append("---")
        lines.append("")
    with out_path.open("w", encoding="utf-8") as fh:
        fh.write("\n".join(lines).rstrip() + "\n")


def main() -> None:
    if not SEED_PATH.exists():
        raise SeedError(f"seed file not found: {SEED_PATH}")
    tales = parse_seed(SEED_PATH)
    write_pool_json(tales, POOL_OUT)
    write_content_md(tales, CONTENT_MD_OUT)
    by_category: dict[str, int] = {}
    for tale in tales:
        by_category[tale["category"]] = by_category.get(tale["category"], 0) + 1
    print(f"compiled {len(tales)} tales -> {POOL_OUT.name}, {CONTENT_MD_OUT.name}")
    for category_id, count in sorted(by_category.items()):
        print(f"  {CATEGORY_LABELS.get(category_id, category_id)}: {count}")


if __name__ == "__main__":
    try:
        main()
    except SeedError as exc:
        sys.exit(f"build_folktale.py: {exc}")
