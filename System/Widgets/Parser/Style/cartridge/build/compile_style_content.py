#!/usr/bin/env python3
"""Compile Style's multi-file content source into one CONTENT JSON.

Every other Parser aide has one `<Store>_content.md`; Style's content is
deliberately split across `Genres/*.md` and `Registers/*.md` (one file per
sweep, matching vibe-coding-rules.md SR-1's "one file, one job" and the
existing pattern those files already follow). `_shell/build/assemble.py`'s
own live `.md` compiler (`compile_content_markdown()`) only recognises a
flat `1.1 Title` dialect and cannot parse the `### 1.1 Title` ATX-heading
dialect Style's content uses (StyleParser.spec.md FR-S2) — so this script
compiles ahead of time into a plain CONTENT JSON that `assemble.py` reads
via its `.json` branch, the same approach Grammar's own `CONTENT` already
uses.

Reuses (does not reimplement — SR-4) `_modules/MiniWiki/build/extract_articles.py`'s
outline scanner, already verified correct against every Style content file
(2026-08-10 session: 48 articles extracted cleanly from these same 7 files).

Usage:
  python3 compile_style_content.py [--out Style_content.json]

Stdlib only (PY-1/SR-2).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

STYLE_DIR = Path(__file__).resolve().parents[2]
MINIWIKI_BUILD_DIR = STYLE_DIR.parents[0] / "_modules" / "MiniWiki" / "build"
sys.path.insert(0, str(MINIWIKI_BUILD_DIR))
import extract_articles  # noqa: E402 (import after sys.path edit is intentional)

CONTENT_FILES = [
    STYLE_DIR / "Genres" / "Clarity.md",
    STYLE_DIR / "Genres" / "Brevity.md",
    STYLE_DIR / "Genres" / "Coherence.md",
    STYLE_DIR / "Genres" / "Voice.md",
    STYLE_DIR / "Genres" / "Diction.md",
    STYLE_DIR / "Registers" / "Academic_english.md",
    STYLE_DIR / "Registers" / "Simple-descriptive_english.md",
]


class CompileError(Exception):
    """Raised for any malformed input (PY-6); message is the whole story."""


# The genre rule files (Clarity.md etc.) write Before/After pairs as a bold
# label followed by a blockquote, e.g. "**Before** (passive): > The report
# was reviewed by the committee...". extract_articles.py's scan_nodes()
# has no notion of this pattern — its flush() joins every accumulated line
# for a node into ONE space-joined string (SR-9's own source, read directly:
# `text = " ".join(l.strip() for l in lead_lines if l.strip())`), so the
# Before/After markup survives only as substring noise inside that one
# joined string, not as separate list entries to scan line-by-line. This
# regex-extracts Before/After pairs back out of that joined text (feeding
# CONTENT's `e`) rather than leaving them baked into the definition (`d`).
# Antithesis/register rules use a plain `Example: "..."` line instead
# (already a first-class `examples` field on the scanned node, via
# extract_articles.py's own EXAMPLE_LINE_RE) — this pattern is genre-only.
BEFORE_AFTER_RE = re.compile(
    r"\*\*Before\*\*[^:]*:\s*>\s*(?P<before>.+?)\s*\*\*After\*\*[^:]*:\s*>\s*(?P<after>.+?)"
    r"(?=\s*\*\*Before\*\*|\s*$)"
)


def split_before_after(joined_text: str) -> tuple[str, list[str]]:
    """Splits one node's already-joined lead text into (remaining_prose,
    before_after_pairs) by regex-extracting every Before/After match and
    removing those spans from the text that becomes `d`."""
    pairs = [f"Before: {m['before']} / After: {m['after']}" for m in BEFORE_AFTER_RE.finditer(joined_text)]
    remaining = BEFORE_AFTER_RE.sub("", joined_text).strip()
    return remaining, pairs


def node_definition_and_examples(node: dict) -> tuple[str, str | list[str] | None]:
    joined_text = " ".join(line.strip() for line in node["lead_lines"] if line.strip())
    remaining_text, before_after = split_before_after(joined_text)
    definition = extract_articles.strip_emphasis(remaining_text)

    if before_after:
        return definition, [extract_articles.strip_emphasis(p) for p in before_after]
    if node["examples"]:
        return definition, list(node["examples"])
    if node["worked_example"]:
        return definition, node["worked_example"]
    return definition, None


def compile_file(md_path: Path, content: dict[str, dict]) -> None:
    text = md_path.read_text(encoding="utf-8")
    frontmatter, body = extract_articles.parse_frontmatter(text)
    sweep_id = frontmatter.get("sweep_id", "")
    raw_nodes = extract_articles.scan_nodes(body)
    raw_nodes = extract_articles.fold_category_descriptions(raw_nodes)
    if not raw_nodes:
        raise CompileError(f"{md_path.name} produced zero CONTENT entries — check the outline format")

    for node_id, node in raw_nodes.items():
        if node_id in content:
            raise CompileError(
                f"duplicate CONTENT id '{node_id}' — first seen before {md_path.name}, "
                f"Style's own numbering scheme (Style_content.md) must stay collision-free"
            )
        definition, example = node_definition_and_examples(node)
        entry: dict = {"n": node["title"] or node_id, "l": sweep_id, "d": definition}
        if example is not None:
            entry["e"] = example
        content[node_id] = entry


def compile_style_content() -> dict[str, dict]:
    content: dict[str, dict] = {}
    for md_path in CONTENT_FILES:
        if not md_path.exists():
            raise CompileError(f"expected Style content file not found: {md_path}")
        compile_file(md_path, content)
    return content


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path(__file__).with_name("Style_content.json"))
    args = parser.parse_args()

    try:
        content = compile_style_content()
    except CompileError as exc:
        sys.exit(f"compile_style_content.py: {exc}")

    args.out.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {args.out}: {len(content)} CONTENT entries")


if __name__ == "__main__":
    main()
