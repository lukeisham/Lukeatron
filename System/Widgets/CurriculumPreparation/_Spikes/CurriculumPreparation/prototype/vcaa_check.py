#!/usr/bin/env python3
"""
VCAA Curriculum Verification — Authoring-Time Paste Checker
=============================================================
Compares a teacher's pasted curriculum text against the live VCAA F-10
source and reports what is missing, mismatched, structurally off, or
unrecognised. This is an AUTHORING-TIME tool: it lives only in
`_Spikes/CurriculumPreparation/prototype/` and is never imported by, or
copied into, `_template/` — AD-2 forbids the shipped bundle from ever
calling a curriculum authority at runtime, and AC-BT-4 forbids
curriculum-specific strings there.

It PROPOSES corrections; it never writes to unit.json. Applying an
approved correction is a separate, human-reviewed step.

Verified empirically against the live site on 2026-08-30:
    Page   : https://f10.vcaa.vic.edu.au/learning-areas/humanities/history/curriculum
    buildId: embedded in that page's <script id="__NEXT_DATA__"> JSON blob,
             and it DOES rotate across rebuilds, so it is never hardcoded.
    Data   : https://f10.vcaa.vic.edu.au/_next/data/<buildId>/learning-areas/
             humanities/history/curriculum.json
             -> pageProps.additionalContent.curriculum.pathways[0]
                .curriculum[<band>].contentDescriptionsContent
             is a list of strands, each with `subStrands`, each with
             `contentDescriptions` (the {code, contentDescription, ...}
             leaves). This matches the brief's description closely enough
             that no HTML-scrape fallback was needed for this endpoint, but
             fetch_html_fallback() below exists in case a future rebuild
             changes the shape and the JSON route stops returning usable
             data.

    NOT found anywhere in the fetched JSON: an explicit licence string or
    attribution statement. A "Copyright statement" page is linked from the
    curriculum page's `links`, but its own _next/data payload has a null
    `field_block` (content lives in a CMS component this tool doesn't
    decode). Per the CRITICAL ACCURACY RULE ("never fabricate"), licence
    and attribution are reported as None with an explicit "not found in
    fetched source" flag rather than guessed.

    The band/level structure is coarser than a single school year: History
    content descriptions are published per two-year band (e.g. "9-10"),
    shared by both year levels in that band. There is no separate "Year 10
    only" list to fetch — this is a property of the source, not a
    limitation of this script.

CRITICAL ACCURACY RULE: every code and every piece of curriculum text this
script emits comes from the fetched source. Nothing curriculum-specific is
hardcoded, guessed, or paraphrased from memory.
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# ============================================================================
# Constants (no I/O at module level, per PY-3)
# ============================================================================

SCRIPT_ROOT = Path(__file__).resolve().parent

BASE_URL = "https://f10.vcaa.vic.edu.au"
USER_AGENT = "Lukeatron-CurriculumVerifier/1.0 (authoring-time tool; contact: luke.isham@gmail.com)"
REQUEST_TIMEOUT_SECONDS = 20

# Trailing code shape observed on the live site (also matches the profile
# in prototype/profiles.py, but re-declared here rather than imported —
# this tool must keep working even if profiles.py's shape changes, and it
# is deliberately import-independent per the "don't edit ingest.py/
# profiles.py" instruction).
#   VC2                  fixed curriculum-version prefix
#   [A-Z]{2}\d{2}         learning-area + level, e.g. HH10
#   (?P<letter>[A-Z])     strand letter (K = Knowledge, S = Skills)
#   \d{2}                 sequence number
CODE_PATTERN = re.compile(r"(?P<code>VC2[A-Z]{2}\d{2}(?P<letter>[A-Z])\d{2})\s*$")

# Headings in the paste are short lines ("concepts and skills",
# "Investigations: Australians at War 1914-1945"); the achievement-standard
# and level-description prose are long single-line paragraphs. This length
# split is an OBSERVED HEURISTIC from the fixture, not a documented VCAA
# convention — flagged as such wherever it drives a result.
HEADING_MAX_CHARS = 90

# Below this difflib ratio, a heading-vs-official-name match is not worth
# reporting (too much noise from unrelated prose lines).
STRUCTURAL_MATCH_THRESHOLD = 0.35

# Normalisation map for classifying a text difference as "trivial" rather
# than substantive: curly vs straight quotes, en/em-dash vs hyphen, and
# whitespace collapsing. This is about PUNCTUATION EQUIVALENCE, not
# curriculum content, so it is safe to hardcode.
_TRIVIAL_CHAR_MAP = {
    "‘": "'", "’": "'",
    "“": '"', "”": '"',
    "–": "-", "—": "-",
}

_logger_lines: list[str] = []


def _log(message: str) -> None:
    """Collect a diagnostic line for --report output (lazy, no I/O until flush)."""
    _logger_lines.append(message)


# ============================================================================
# Network fetch (isolated so comparison logic below never touches sockets)
# ============================================================================


def fetch_html(path: str, timeout: int = REQUEST_TIMEOUT_SECONDS) -> str:
    """Fetch a page's raw HTML. Raises urllib.error.URLError/HTTPError on failure."""
    request = urllib.request.Request(
        BASE_URL + path, headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8")


def extract_build_id(html: str) -> str:
    """Pull the rotating Next.js buildId out of an embedded __NEXT_DATA__ blob.

    Raises ValueError if the script tag or buildId field is not found, so a
    site redesign fails loudly instead of silently returning garbage.
    """
    match = re.search(
        r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S
    )
    if match is None:
        raise ValueError("__NEXT_DATA__ script tag not found in fetched HTML")
    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise ValueError(f"__NEXT_DATA__ blob is not valid JSON: {exc}") from exc
    build_id = payload.get("buildId")
    if not build_id:
        raise ValueError("__NEXT_DATA__ blob has no 'buildId' field")
    return build_id


def fetch_authoritative_json(
    curriculum_path: str, timeout: int = REQUEST_TIMEOUT_SECONDS
) -> dict[str, Any]:
    """Fetch the live curriculum JSON for e.g. 'humanities/history'.

    Two network round trips: the rendered page (to read the current
    buildId), then the _next/data JSON endpoint built from it. Falls back
    to raising a clear error rather than guessing if either step fails —
    PY-6.
    """
    page_html = fetch_html(f"/learning-areas/{curriculum_path}/curriculum", timeout)
    build_id = extract_build_id(page_html)
    data_url = (
        f"/_next/data/{build_id}/learning-areas/{curriculum_path}/curriculum.json"
    )
    request = urllib.request.Request(
        BASE_URL + data_url, headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


# ============================================================================
# Authoritative-data parsing (pure — takes already-fetched JSON)
# ============================================================================


def parse_authoritative(raw_json: dict[str, Any], band_id: str) -> dict[str, Any]:
    """Turn the fetched _next/data payload into a flat, comparison-friendly shape.

    Returns:
        {
          "curriculum": {name, jurisdiction, version, sourceRef, licence,
                         attribution, licence_found, attribution_found},
          "band_id": str,
          "strands": [
            {"name": str,
             "sub_strands": [
                {"name": str, "band_shared": bool | None (None = unknown),
                 "band_shared_inferred": bool,
                 "codes": [{"code": str, "text": str}]}
             ]}
          ],
        }

    Raises KeyError/TypeError if the payload's shape doesn't match what was
    verified empirically — callers should catch that and report the failure
    rather than silently returning an empty/partial tree.
    """
    page_props = raw_json["pageProps"]
    curriculum_block = page_props["additionalContent"]["curriculum"]
    discipline_title = page_props["additionalContent"].get("disciplineTitle")
    learning_area_title = curriculum_block.get("learningAreaTitle")

    bands = curriculum_block["pathways"][0]["curriculum"]
    matching_bands = [b for b in bands if b["id"] == band_id]
    if not matching_bands:
        known = ", ".join(sorted(b["id"] for b in bands))
        raise KeyError(f"Band '{band_id}' not found in fetched data. Known bands: {known}")
    band = matching_bands[0]

    # Version string: observed only inside a free-text "headerBanner" note
    # elsewhere on the site, not as a structured field on this endpoint, so
    # it is NOT extracted here — reported as not-found rather than guessed
    # from this payload alone.
    strands: list[dict[str, Any]] = []
    for strand in band["contentDescriptionsContent"]:
        sub_strands = []
        for sub in strand["subStrands"]:
            name = sub["title"]
            # INFERRED, not sourced: the site names shared content
            # "Overview: ..." and unit-specific alternatives
            # "Investigation: ...". A strand with no "Investigation:"
            # sub-strand at all (e.g. Concepts and Skills) is fully shared.
            band_shared_inferred = True
            if name.strip().lower().startswith("investigation"):
                band_shared = False
            elif any(
                s["title"].strip().lower().startswith("investigation")
                for s in strand["subStrands"]
            ):
                # This strand has investigation sub-strands; a non-investigation
                # sub-strand within it (e.g. "Overview: ...") is band-shared.
                band_shared = True
            else:
                # No investigation sub-strands in this strand at all -> the
                # whole strand (e.g. Concepts and Skills) is band-shared.
                band_shared = True
            codes = [
                {"code": cd["code"], "text": cd["contentDescription"]}
                for cd in sub["contentDescriptions"]
            ]
            sub_strands.append(
                {
                    "name": name,
                    "band_shared": band_shared,
                    "band_shared_inferred": band_shared_inferred,
                    "codes": codes,
                }
            )
        strands.append({"name": strand["title"], "sub_strands": sub_strands})

    curriculum_meta = {
        "name": f"{learning_area_title} — {discipline_title}".strip(" —")
        if (learning_area_title or discipline_title)
        else None,
        "jurisdiction": None,
        "jurisdiction_found": False,
        "version": None,
        "version_found": False,
        "sourceRef": f"{BASE_URL}/learning-areas/{{path}}/curriculum",
        "licence": None,
        "licence_found": False,
        "attribution": None,
        "attribution_found": False,
    }

    return {"curriculum": curriculum_meta, "band_id": band_id, "strands": strands}


def build_code_index(parsed: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Map code -> {strand, sub_strand, text, band_shared} for O(1) lookups."""
    index: dict[str, dict[str, Any]] = {}
    for strand in parsed["strands"]:
        for sub in strand["sub_strands"]:
            for entry in sub["codes"]:
                index[entry["code"]] = {
                    "strand": strand["name"],
                    "sub_strand": sub["name"],
                    "text": entry["text"],
                    "band_shared": sub["band_shared"],
                }
    return index


def all_sub_strand_names(parsed: dict[str, Any]) -> list[str]:
    """Flat list of every official sub-strand name, for structural fuzzy-matching.

    Includes STRAND names too (e.g. "Historical Concepts and Skills"), not
    just sub-strand names — a paste heading can be a truncated/mangled
    strand name (observed in the fixture: "concepts and skills") rather
    than a sub-strand name, so both pools are searched together.
    """
    names = [strand["name"] for strand in parsed["strands"]]
    names.extend(
        sub["name"] for strand in parsed["strands"] for sub in strand["sub_strands"]
    )
    return names


# ============================================================================
# Paste parsing (pure — takes paste text, returns structured entries)
# ============================================================================


def extract_paste_block(raw_text: str) -> str:
    """Pull the fenced paste out of a .md file between the marker lines.

    Falls back to the whole text unchanged for a plain .txt paste (no
    markers present).
    """
    start_marker = "<<< PASTE BELOW THIS LINE >>>"
    end_marker = "<<< PASTE ABOVE THIS LINE >>>"
    if start_marker not in raw_text:
        return raw_text
    after_start = raw_text.split(start_marker, 1)[1]
    if end_marker in after_start:
        return after_start.split(end_marker, 1)[0]
    return after_start


def parse_paste(paste_text: str) -> dict[str, Any]:
    """Parse a raw paste into codes (with text) and heading candidates.

    Returns:
        {"codes": [{"code": str, "text": str, "line_no": int}],
         "headings": [{"text": str, "line_no": int}]}

    A "heading candidate" is any non-blank line that does not itself carry
    a trailing code and is short enough (HEADING_MAX_CHARS) to plausibly be
    a sub-strand label rather than achievement-standard prose. This is an
    observed heuristic (see module docstring), not a general paste grammar.
    """
    codes: list[dict[str, Any]] = []
    headings: list[dict[str, Any]] = []
    for line_no, raw_line in enumerate(paste_text.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        match = CODE_PATTERN.search(line)
        if match:
            code = match.group("code")
            text = line[: match.start()].strip()
            codes.append({"code": code, "text": text, "line_no": line_no})
            continue
        if len(line) <= HEADING_MAX_CHARS:
            headings.append({"text": line, "line_no": line_no})
    return {"codes": codes, "headings": headings}


# ============================================================================
# Comparison logic (pure functions — the part the tests exercise directly)
# ============================================================================


def normalise_for_trivial_check(text: str) -> str:
    """Collapse whitespace and fold punctuation variants for equivalence checks."""
    folded = text
    for fancy, plain in _TRIVIAL_CHAR_MAP.items():
        folded = folded.replace(fancy, plain)
    return " ".join(folded.split())


def classify_text_difference(official_text: str, paste_text: str) -> dict[str, Any]:
    """Compare one code's official text against the paste's text for that code.

    Returns {"identical": bool, "trivial": bool, "diff": list[str] | None}.
    "trivial" means the only differences are whitespace/quote/dash style;
    anything else is substantive.
    """
    if official_text == paste_text:
        return {"identical": True, "trivial": False, "diff": None}
    is_trivial = normalise_for_trivial_check(official_text) == normalise_for_trivial_check(
        paste_text
    )
    diff = list(
        difflib.unified_diff(
            [official_text],
            [paste_text],
            fromfile="official",
            tofile="paste",
            lineterm="",
        )
    )
    return {"identical": False, "trivial": is_trivial, "diff": diff}


def determine_scope(
    parsed: dict[str, Any], paste_codes: set[str]
) -> dict[str, Any]:
    """Work out which official sub-strands the paste touches at all.

    A sub-strand is "covered" if at least one of its official codes appears
    in the paste. Returns per-sub-strand coverage plus the band-shared flag,
    so Tier A / Tier B and the completeness figure can all be derived from
    one pass.
    """
    coverage = []
    for strand in parsed["strands"]:
        for sub in strand["sub_strands"]:
            official_codes = {c["code"] for c in sub["codes"]}
            present = official_codes & paste_codes
            coverage.append(
                {
                    "strand": strand["name"],
                    "sub_strand": sub["name"],
                    "band_shared": sub["band_shared"],
                    "band_shared_inferred": sub["band_shared_inferred"],
                    "official_codes": official_codes,
                    "present_codes": present,
                    "covered": bool(present),
                }
            )
    return coverage


def build_report(
    parsed: dict[str, Any], paste_parsed: dict[str, Any]
) -> dict[str, Any]:
    """Run every comparison category and return one findings dict.

    Categories:
      tier_a_gaps       — missing codes inside a covered sub-strand
      tier_b_not_selected — sub-strands with zero paste codes (name + count only)
      text_mismatches   — codes present in both, with differing text
      structural        — paste headings that don't match an official name
      unknown_codes     — paste codes absent from the authoritative source
      scope             — coverage list + completeness figure
    """
    code_index = build_code_index(parsed)
    paste_code_entries = {c["code"]: c["text"] for c in paste_parsed["codes"]}
    paste_codes = set(paste_code_entries)
    coverage = determine_scope(parsed, paste_codes)

    tier_a_gaps = []
    tier_b_not_selected = []
    for row in coverage:
        missing = sorted(row["official_codes"] - row["present_codes"])
        if row["covered"]:
            if missing:
                tier_a_gaps.append(
                    {
                        "strand": row["strand"],
                        "sub_strand": row["sub_strand"],
                        "band_shared": row["band_shared"],
                        "missing_codes": [
                            {"code": code, "text": code_index[code]["text"]}
                            for code in missing
                        ],
                    }
                )
        else:
            tier_b_not_selected.append(
                {
                    "strand": row["strand"],
                    "sub_strand": row["sub_strand"],
                    "code_count": len(row["official_codes"]),
                }
            )

    text_mismatches = []
    for code, paste_text in paste_code_entries.items():
        if code not in code_index:
            continue
        result = classify_text_difference(code_index[code]["text"], paste_text)
        if not result["identical"]:
            text_mismatches.append(
                {
                    "code": code,
                    "sub_strand": code_index[code]["sub_strand"],
                    "trivial": result["trivial"],
                    "official_text": code_index[code]["text"],
                    "paste_text": paste_text,
                    "diff": result["diff"],
                }
            )

    official_names = all_sub_strand_names(parsed)
    structural = []
    seen_headings = set()
    for heading in paste_parsed["headings"]:
        text = heading["text"]
        if text in seen_headings:
            continue
        seen_headings.add(text)
        exact = [n for n in official_names if n.lower() == text.lower()]
        if exact:
            continue
        best_name, best_ratio = None, 0.0
        for name in official_names:
            ratio = difflib.SequenceMatcher(None, text.lower(), name.lower()).ratio()
            if ratio > best_ratio:
                best_name, best_ratio = name, ratio
        if best_ratio >= STRUCTURAL_MATCH_THRESHOLD:
            structural.append(
                {
                    "paste_heading": text,
                    "line_no": heading["line_no"],
                    "closest_official": best_name,
                    "similarity": round(best_ratio, 3),
                }
            )

    unknown_codes = sorted(paste_codes - set(code_index))

    covered_rows = [row for row in coverage if row["covered"]]
    expected_codes = sum(len(row["official_codes"]) for row in covered_rows)
    present_codes = sum(len(row["present_codes"]) for row in covered_rows)

    scope = {
        "covered_sub_strands": [
            {
                "strand": row["strand"],
                "sub_strand": row["sub_strand"],
                "band_shared": row["band_shared"],
                "band_shared_inferred": row["band_shared_inferred"],
            }
            for row in covered_rows
        ],
        "expected_codes_for_unit_scope": expected_codes,
        "present_codes_for_unit_scope": present_codes,
    }

    return {
        "tier_a_gaps": tier_a_gaps,
        "tier_b_not_selected": tier_b_not_selected,
        "text_mismatches": text_mismatches,
        "structural": structural,
        "unknown_codes": unknown_codes,
        "scope": scope,
    }


# ============================================================================
# Report rendering
# ============================================================================


def render_report(parsed: dict[str, Any], report: dict[str, Any]) -> str:
    lines: list[str] = []
    meta = parsed["curriculum"]
    lines.append("=" * 78)
    lines.append("VCAA CURRICULUM VERIFICATION REPORT")
    lines.append("=" * 78)
    lines.append(f"Curriculum: {meta.get('name') or '(not found in fetched source)'}")
    lines.append(
        "Version:    "
        + (meta["version"] if meta["version_found"] else "not found in fetched source")
    )
    lines.append(
        "Licence:    "
        + (meta["licence"] if meta["licence_found"] else "not found in fetched source")
    )
    lines.append(
        "Attribution:"
        + (
            " " + meta["attribution"]
            if meta["attribution_found"]
            else " not found in fetched source"
        )
    )
    lines.append("")

    scope = report["scope"]
    lines.append(
        f"Counts — Tier A gaps: {sum(len(g['missing_codes']) for g in report['tier_a_gaps'])} "
        f"| Tier B sub-strands not selected: {len(report['tier_b_not_selected'])} "
        f"| text mismatches: {len(report['text_mismatches'])} "
        f"| structural: {len(report['structural'])} "
        f"| unknown codes: {len(report['unknown_codes'])}"
    )
    lines.append(
        f"Completeness for this unit's own scope: "
        f"{scope['present_codes_for_unit_scope']}/{scope['expected_codes_for_unit_scope']}"
    )
    lines.append("")

    lines.append("-" * 78)
    lines.append("UNIT SCOPE (sub-strands this paste covers)")
    lines.append("-" * 78)
    for row in scope["covered_sub_strands"]:
        kind = "band-shared" if row["band_shared"] else "unit-specific"
        inferred = " (inferred from naming convention)" if row["band_shared_inferred"] else ""
        lines.append(f"  [{kind}{inferred}] {row['strand']} > {row['sub_strand']}")
    lines.append("")

    lines.append("-" * 78)
    lines.append("TIER A — IN-SCOPE GAPS (codes missing from a covered sub-strand)")
    lines.append("-" * 78)
    if not report["tier_a_gaps"]:
        lines.append("  (none)")
    for gap in report["tier_a_gaps"]:
        lines.append(f"  {gap['strand']} > {gap['sub_strand']}:")
        for code_entry in gap["missing_codes"]:
            lines.append(f"    {code_entry['code']}: {code_entry['text']}")
    lines.append("")

    lines.append("-" * 78)
    lines.append("TIER B — NOT SELECTED (sub-strands this unit does not cover)")
    lines.append("-" * 78)
    if not report["tier_b_not_selected"]:
        lines.append("  (none — every official sub-strand has at least one code present)")
    for entry in report["tier_b_not_selected"]:
        lines.append(
            f"  this unit does not cover: {entry['strand']} > {entry['sub_strand']} "
            f"({entry['code_count']} codes)"
        )
    lines.append("")

    lines.append("-" * 78)
    lines.append("TEXT MISMATCHES")
    lines.append("-" * 78)
    if not report["text_mismatches"]:
        lines.append("  (none)")
    for mismatch in report["text_mismatches"]:
        kind = "trivial" if mismatch["trivial"] else "SUBSTANTIVE"
        lines.append(f"  [{kind}] {mismatch['code']} ({mismatch['sub_strand']})")
        lines.append(f"    official: {mismatch['official_text']}")
        lines.append(f"    paste:    {mismatch['paste_text']}")
    lines.append("")

    lines.append("-" * 78)
    lines.append("STRUCTURAL (heading mismatches)")
    lines.append("-" * 78)
    if not report["structural"]:
        lines.append("  (none)")
    for entry in report["structural"]:
        lines.append(
            f"  line {entry['line_no']}: '{entry['paste_heading']}' "
            f"-> closest official: '{entry['closest_official']}' "
            f"(similarity {entry['similarity']})"
        )
    lines.append("")

    lines.append("-" * 78)
    lines.append("UNKNOWN CODES (in paste, not in authoritative source)")
    lines.append("-" * 78)
    if not report["unknown_codes"]:
        lines.append("  (none)")
    for code in report["unknown_codes"]:
        lines.append(f"  {code}")

    return "\n".join(lines)


def report_to_json_safe(parsed: dict[str, Any], report: dict[str, Any]) -> dict[str, Any]:
    """Convert sets etc. to JSON-serialisable structures for --json output."""
    return {
        "curriculum": parsed["curriculum"],
        "band_id": parsed["band_id"],
        "tier_a_gaps": report["tier_a_gaps"],
        "tier_b_not_selected": report["tier_b_not_selected"],
        "text_mismatches": report["text_mismatches"],
        "structural": report["structural"],
        "unknown_codes": report["unknown_codes"],
        "scope": report["scope"],
    }


# ============================================================================
# CLI
# ============================================================================


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Compare a pasted VCAA curriculum excerpt against the live source."
    )
    parser.add_argument("paste_file", type=Path, help="Path to the .md or .txt paste file")
    parser.add_argument(
        "--curriculum-path",
        default="humanities/history",
        help="Learning-area/subject path segment, e.g. 'humanities/history' "
        "(only this one has been verified against the live site)",
    )
    parser.add_argument(
        "--band",
        default="9–10",
        help="Curriculum band id as published by the source, e.g. '9–10' "
        "(note the en-dash; History publishes per two-year band, not per year)",
    )
    parser.add_argument("--report", action="store_true", help="Print human-readable report to stdout")
    parser.add_argument("--json", type=Path, default=None, help="Write machine-readable findings to this path")
    parser.add_argument(
        "--cache", type=Path, default=None, help="Cache path for the fetched authoritative JSON"
    )
    return parser


def load_or_fetch_authoritative(
    curriculum_path: str, cache_path: Path | None
) -> dict[str, Any]:
    """Reuse a cached fetch if present (be a good citizen); else fetch live."""
    if cache_path is not None and cache_path.exists():
        with cache_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    raw_json = fetch_authoritative_json(curriculum_path)
    if cache_path is not None:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with cache_path.open("w", encoding="utf-8") as handle:
            json.dump(raw_json, handle)
    return raw_json


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)

    try:
        with args.paste_file.open("r", encoding="utf-8") as handle:
            raw_text = handle.read()
    except OSError as exc:
        print(f"ERROR: could not read paste file {args.paste_file}: {exc}", file=sys.stderr)
        return 1

    try:
        raw_json = load_or_fetch_authoritative(args.curriculum_path, args.cache)
    except urllib.error.HTTPError as exc:
        print(f"ERROR: VCAA site returned HTTP {exc.code} for '{args.curriculum_path}'", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"ERROR: could not reach VCAA site: {exc.reason}", file=sys.stderr)
        return 1
    except TimeoutError:
        print("ERROR: request to VCAA site timed out", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"ERROR: VCAA site returned unparsable JSON: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"ERROR: could not extract buildId from VCAA page: {exc}", file=sys.stderr)
        return 1

    try:
        parsed = parse_authoritative(raw_json, args.band)
    except (KeyError, TypeError) as exc:
        print(f"ERROR: fetched JSON did not have the expected shape: {exc}", file=sys.stderr)
        return 1

    paste_block = extract_paste_block(raw_text)
    paste_parsed = parse_paste(paste_block)
    report = build_report(parsed, paste_parsed)

    if args.report or not args.json:
        print(render_report(parsed, report))

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        with args.json.open("w", encoding="utf-8") as handle:
            json.dump(report_to_json_safe(parsed, report), handle, indent=2)

    return 0


if __name__ == "__main__":
    sys.exit(main())
