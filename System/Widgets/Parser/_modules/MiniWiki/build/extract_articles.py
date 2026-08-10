#!/usr/bin/env python3
"""Extract a MiniWiki ARTICLES JSON from a cartridge's outline-numbered
``*_content.md`` source file.

Two source dialects exist across the eleven Parser cartridges (see
``_modules/MiniWiki/mockup/CONTENT-FIT-REPORT.md`` §1/§6), and this
extractor reads both without needing to know in advance which one a
given file uses:

  * **Flat dialect** (Logic, Interpretation, …): a bare outline line
    flush-left, e.g. ``1.1 Affirming the Consequent``, followed by an
    indented body paragraph and an optional ``Example: "..."`` line.
  * **Heading dialect** (Rhetoric, …): a real Markdown ATX heading
    carrying the outline id, e.g. ``### 1.1 Inventio``, with
    ``**Key characteristics:**`` / ``**Worked example:**`` marker
    paragraphs and ``- `` bullet lists for examples.

Both dialects can co-occur in one file (Logic mixes an H2 section
heading with flat sub-entries). A single line-scanner recognises
either node-start pattern and accumulates whatever follows into lead
text, characteristics, examples, or a worked example; a second pass
links parent/children/siblings from the dotted id and decides each
node's ``role``.

Per the fit report's CRITICAL fix #1, Logic's ``2.1.0``-style
"category description" entries (an id ending in a literal ``0``
segment immediately under a section id) are folded into their parent
section's own body rather than kept as a sibling article — there is
no independent UI slot for a description-only node, and the parent
section is exactly where that prose belongs.

Usage:
  python3 extract_articles.py <content.md> [--out articles.json] [--cartridge-id ID]

Stdlib only (PY-1/SR-2).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HEADING_RE = re.compile(r"^(#{1,6})\s+(\d+(?:\.\d+)*)\.?\s+(.+?)\s*$")
FLAT_RE = re.compile(r"^(\d+(?:\.\d+)*)\.\s+(.+?)\s*$|^(\d+(?:\.\d+)*)\s+(.+?)\s*$")
CHAR_RE = re.compile(r"^\*{0,2}Key [Cc]haracteristics:?\*{0,2}\s*(.*)$")
WORKED_RE = re.compile(r"^\*{0,2}Worked [Ee]xample\s*(?:\([^)]*\))?:?\*{0,2}\s*(.*)$")
EXAMPLE_LINE_RE = re.compile(r"^Example:\s*(.+)$", re.IGNORECASE)
BULLET_RE = re.compile(r"^[-*]\s+(.+)$")
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
EMPHASIS_RE = re.compile(r"[*_]{1,3}(.+?)[*_]{1,3}")
CATEGORY_DESCRIPTION_RE = re.compile(r"^(\d+(?:\.\d+)*)\.0$")


class ExtractError(Exception):
    """Raised for any malformed input (PY-6); message is the whole story."""


def strip_emphasis(text: str) -> str:
    return EMPHASIS_RE.sub(r"\1", text).strip()


def normalise_id(raw: str) -> str:
    return raw.rstrip(".")


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Split a leading ``---\\n...\\n---`` YAML block from the rest of the
    file. Only the handful of scalar/block-scalar keys MiniWiki needs
    (title, description, provenance) are parsed — this is not a general
    YAML parser (that already exists at ``_shell/build/miniyaml.py`` for
    the config manifest; content frontmatter is simple enough not to need
    it, per SR-1's "one file, one job")."""
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}, text
    block = match.group(1)
    rest = text[match.end():]
    fields: dict[str, str] = {}
    lines = block.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        kv = re.match(r"^(\w+):\s*(.*)$", line)
        if not kv:
            i += 1
            continue
        key, value = kv.group(1), kv.group(2).strip()
        if value in ("|", ">", "|-", ">-"):
            block_lines: list[str] = []
            i += 1
            while i < len(lines) and (lines[i].startswith("  ") or lines[i].strip() == ""):
                block_lines.append(lines[i].strip())
                i += 1
            fields[key] = " ".join(l for l in block_lines if l).strip()
            continue
        fields[key] = value.strip('"')
        i += 1
    return fields, rest


def scan_nodes(body: str) -> dict[str, dict]:
    """First pass: recognise node-start lines and accumulate their content.
    Returns raw nodes keyed by normalised id, in first-seen order."""
    nodes: dict[str, dict] = {}
    current_id: str | None = None
    lead_lines: list[str] = []
    in_bullet_run = False

    def new_node(node_id: str, title: str) -> None:
        nonlocal current_id, lead_lines, in_bullet_run
        flush()
        current_id = node_id
        lead_lines = []
        in_bullet_run = False
        if node_id not in nodes:
            nodes[node_id] = {
                "title": strip_emphasis(title),
                "lead_lines": [],
                "characteristics": [],
                "examples": [],
                "worked_example": "",
            }
        elif not nodes[node_id]["title"]:
            nodes[node_id]["title"] = strip_emphasis(title)

    def flush() -> None:
        if current_id is None:
            return
        text = " ".join(l.strip() for l in lead_lines if l.strip())
        if text:
            nodes[current_id]["lead_lines"].append(text)

    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            in_bullet_run = False
            continue

        heading_match = HEADING_RE.match(stripped)
        if heading_match:
            _, node_id, title = heading_match.groups()
            new_node(normalise_id(node_id), title)
            continue

        # Flat outline lines are only node-starts when flush-left (no
        # leading whitespace) — indented lines are body prose, per the
        # flat dialect's own convention.
        if line == stripped:
            flat_match = FLAT_RE.match(stripped)
            if flat_match:
                node_id = flat_match.group(1) or flat_match.group(3)
                title = flat_match.group(2) or flat_match.group(4)
                new_node(normalise_id(node_id), title)
                continue

        if current_id is None:
            continue  # prose before the first node (e.g. a document title) — ignored

        char_match = CHAR_RE.match(stripped)
        if char_match:
            rest = char_match.group(1).strip().rstrip(".")
            if rest:
                nodes[current_id]["characteristics"].extend(
                    part.strip() for part in rest.split(";") if part.strip()
                )
            continue

        worked_match = WORKED_RE.match(stripped)
        if worked_match:
            rest = worked_match.group(1).strip()
            if rest:
                nodes[current_id]["worked_example"] = strip_emphasis(rest)
            continue

        example_match = EXAMPLE_LINE_RE.match(stripped)
        if example_match:
            nodes[current_id]["examples"].append(strip_emphasis(example_match.group(1)).strip('"'))
            continue

        bullet_match = BULLET_RE.match(stripped)
        if bullet_match:
            nodes[current_id]["examples"].append(strip_emphasis(bullet_match.group(1)))
            in_bullet_run = True
            continue

        if in_bullet_run:
            if nodes[current_id]["examples"]:
                nodes[current_id]["examples"][-1] += " " + stripped
            continue

        lead_lines.append(stripped)

    flush()
    return nodes


def fold_category_descriptions(nodes: dict[str, dict]) -> dict[str, dict]:
    """CRITICAL fix #1 (fit report): an id ending in a literal ``.0``
    segment (Logic's ``2.1.0`` pattern) is a category description, not an
    independent article — fold its lead text into the parent section."""
    folded: dict[str, dict] = {}
    for node_id, node in nodes.items():
        match = CATEGORY_DESCRIPTION_RE.match(node_id)
        if match:
            parent_id = match.group(1)
            if parent_id in nodes:
                parent = nodes[parent_id]
                extra = " ".join(node["lead_lines"]) if node["lead_lines"] else ""
                if extra:
                    parent["lead_lines"] = list(parent["lead_lines"]) + [extra]
                continue  # dropped as its own node
        folded[node_id] = node
    return folded


def sort_key(node_id: str) -> tuple[int, ...]:
    return tuple(int(p) for p in node_id.split("."))


def build_tree(node_ids: list[str]) -> dict[str, dict]:
    tree: dict[str, dict] = {nid: {"parent": None, "children": []} for nid in node_ids}
    id_set = set(node_ids)
    for nid in node_ids:
        parts = nid.split(".")
        for cut in range(len(parts) - 1, 0, -1):
            candidate = ".".join(parts[:cut])
            if candidate in id_set:
                tree[nid]["parent"] = candidate
                tree[candidate]["children"].append(nid)
                break
    for nid in tree:
        tree[nid]["children"].sort(key=sort_key)
    return tree


def render_body_html(lead_lines: list[str]) -> str:
    """Minimal markdown -> HTML: paragraphs only (bullet examples and
    characteristics are already split out into their own fields by
    scan_nodes, so what remains here is prose). Escaped per HTML-6."""
    paragraphs = [p for p in lead_lines if p.strip()]
    return "".join(f"<p>{escape_html(strip_emphasis(p))}</p>" for p in paragraphs)


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def first_sentence(text: str) -> str:
    text = strip_emphasis(text).strip()
    if not text:
        return ""
    match = re.search(r"^(.{1,240}?[.!?])(\s|$)", text)
    if match:
        return match.group(1)
    return text[:240]


def build_reference(frontmatter: dict[str, str], cartridge_title: str) -> dict | None:
    description = frontmatter.get("description", "").strip()
    provenance = frontmatter.get("provenance", "").strip()
    title = frontmatter.get("title", cartridge_title).strip().strip('"')
    if not description and not provenance:
        return None
    container = description or provenance
    note = provenance if (provenance and provenance != container) else ""
    return {"title": title, "container": container, "note": note}


def extract(md_path: Path, cartridge_id: str) -> dict[str, dict]:
    text = md_path.read_text(encoding="utf-8")
    frontmatter, body = parse_frontmatter(text)
    raw_nodes = scan_nodes(body)
    raw_nodes = fold_category_descriptions(raw_nodes)
    if not raw_nodes:
        raise ExtractError(f"{md_path.name} produced zero articles — check the outline format")

    node_ids = sorted(raw_nodes.keys(), key=sort_key)
    tree = build_tree(node_ids)
    reference = build_reference(frontmatter, frontmatter.get("title", cartridge_id))
    root_ids = [i for i in node_ids if tree[i]["parent"] is None]

    articles: dict[str, dict] = {}
    for nid in node_ids:
        raw = raw_nodes[nid]
        children = tree[nid]["children"]
        parent = tree[nid]["parent"]
        sibling_pool = tree[parent]["children"] if parent else root_ids
        siblings = [s for s in sibling_pool if s != nid]
        lead_lines = raw["lead_lines"]
        lead_text = first_sentence(" ".join(lead_lines)) if lead_lines else ""
        body_html = render_body_html(lead_lines)
        has_body = bool(body_html.strip())
        role = "section" if (children and not has_body) else "article"

        article: dict = {
            "id": nid,
            "title": raw["title"] or nid,
            "level": len(nid.split(".")),
            "role": role,
            "lead": lead_text,
            "body_html": body_html,
            "parent": parent,
            "children": children,
            "siblings": siblings,
        }
        if raw["characteristics"]:
            article["characteristics"] = raw["characteristics"]
        if raw["examples"]:
            article["examples"] = raw["examples"]
        if raw["worked_example"]:
            article["worked_example"] = raw["worked_example"]
        if reference:
            article["references"] = [reference]
        articles[nid] = article

    return articles


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("content_md", type=Path)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--cartridge-id", type=str, default=None)
    args = parser.parse_args()

    if not args.content_md.exists():
        sys.exit(f"extract_articles.py: not found: {args.content_md}")

    cartridge_id = args.cartridge_id or args.content_md.stem.replace("_content", "")
    try:
        articles = extract(args.content_md, cartridge_id)
    except ExtractError as exc:
        sys.exit(f"extract_articles.py: {exc}")

    out_path = args.out or args.content_md.with_suffix(".miniwiki.json")
    out_path.write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out_path}: {len(articles)} articles")


if __name__ == "__main__":
    main()
