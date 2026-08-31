#!/usr/bin/env python3
"""
Curriculum Ingest — Turns a raw curriculum paste into unit.json nodes
========================================================================
Q-1 prototype (see _TestData/vic-f10-v2-history/year10-history.source.md). Parses a flat, un-
indented, un-numbered curriculum paste into a strand/outcome/task tree using
only two structural signals: blank lines (block boundaries) and a trailing
profile-defined code (outcome marker). Everything else — code shape, strand
letters, display labels — is curriculum-specific and lives in profiles.py
(AD-10); this module never hardcodes a real-world curriculum's rules.

Deterministic by construction (AD-2): given the same source text and the
same profile, byte-identical output every run. Ids are derived from the
outcome's code where one exists, or a stable hash of (kind, title, parent
path) where none does — never a random uuid, never a timestamp.

Refuses to write a tree that would violate INV-DM-3 (exactly one root,
every parentId resolves, no cycles) and writes atomically (temp file +
Path.replace), mirroring _template/serve.py's atomic-write approach.

Classification is a first-class, inspectable step: classify_block() names
each block SUMMARY / HEADING / CRITERION (plus the reason it decided that
way) before anything else consumes it — parse_source() and --report both
read off that same classification rather than re-deriving it. SUMMARY
blocks are handed back to the caller as their own list (ParseResult.summary
_blocks); parse_source() itself stays agnostic about where they end up —
routing them is run()'s job (see build_resource_items / merge_resource_
items below), not this function's. That routing is now decided (Decision
1): SUMMARY blocks become ResourceItems on the singular resourcesPage
(kind "text"), never curriculum.description. Likewise every real HEADING
strand also seeds a topics[] entry (Decision 2, see build_topics /
merge_topics), unless --no-topics is passed.

Scope and sequence-gap detection (offline, no network — pure analysis of
the codes actually present):

A pasted source is normally ONE unit, not a whole curriculum — e.g. the
fixture is the unit "Australians at War 1914-1945", which legitimately
omits every code belonging to a parallel Investigation the teacher didn't
paste. Comparing against the full curriculum's code range would flag those
absent codes as false "omissions", which is the failure mode to avoid.

So sequence-gap detection works per-heading (per immediate parent
container), not per code-letter family across the whole document: the K
family here forms two separate runs — K01-K06 under the (untitled)
Overview heading, and K13-K23 under "Investigations: Australians at War
1914-1945" — and treating K as one family end-to-end would make K07-K12
look like a gap between those two runs, when it is really just "a different
Investigation, never pasted". Grouping per-heading instead means a gap is
only ever reported strictly between the lowest and highest ordinal actually
observed under the SAME heading, which is exactly what distinguishes a real
accidental omission (S04 is missing between S01 and S06 under one heading)
from an entire other unit's codes being absent (out of range on this
heading's run — never flagged).

Run:
    python3 ingest.py --source <file.md|file.txt> --unit <unit.json> \\
        --profile vic-f10-v2 [--dry-run] [--report]
"""
import argparse
import hashlib
import json
import logging
import re
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path

from profiles import get_profile

# ============================================================================
# Module-level constants (no I/O at module level per PY-3)
# ============================================================================

# SUMMARY-vs-HEADING is the one genuinely fuzzy call (both lack a code).
# A block seen before the first coded line is SUMMARY prose (the
# achievement standard) rather than a HEADING when it is longer than this
# many characters. The fixture's achievement-standard paragraphs run to
# several hundred characters; its genuine headings never exceed a short
# phrase — 150 sits comfortably between the two with margin either side.
SUMMARY_LENGTH_THRESHOLD_CHARS = 150

# A heading is rarely more than one sentence. More than this many sentences
# is a signal (alongside length) that a code-less block is prose, not a
# structural heading.
HEADING_MAX_SENTENCES = 1

# A heading rarely ends in a full stop/exclamation/question mark; prose
# almost always does. Used alongside length and sentence count.
HEADING_TERMINAL_PUNCTUATION = (".", "!", "?")

# When a block's length falls within this many characters of the length
# threshold, length alone is not a confident signal — classify_block()
# leans on sentence-count/punctuation instead and marks the call "low"
# confidence either way, since it's a genuinely borderline case.
SUMMARY_LENGTH_BORDERLINE_MARGIN_CHARS = 40

_SENTENCE_BOUNDARY_PATTERN = re.compile(r"[.!?]+(?:\s|$)")

# A heading shaped like "Investigations: <name>" (or "Investigation: ...")
# names the unit itself — used to suggest a unit name for --report's "Unit
# scope" section. Case-insensitive since heading capitalisation in a real
# paste is inconsistent (confirmed in the fixture).
_INVESTIGATION_HEADING_PATTERN = re.compile(
    r"^Investigations?:\s*(?P<name>.+)$", re.IGNORECASE
)

# Splits a code into (prefix, letter, ordinal) for sequence-gap detection —
# lexical only, independent of any profile's own code_pattern, since gap
# detection just needs "the last letter+2-digits is the ordinal slot".
_CODE_ORDINAL_PATTERN = re.compile(r"^(?P<prefix>.*)(?P<letter>[A-Z])(?P<ordinal>\d{2})$")

# Paste markers used to extract the fenced raw text out of a .md fixture.
PASTE_START_MARKER = "<<< PASTE BELOW THIS LINE >>>"
PASTE_END_MARKER = "<<< PASTE ABOVE THIS LINE >>>"

ROOT_NODE_ID = "root"

# ResourcesPage is a singular object (INV-DM-18) — a fixed, deterministic id
# is fine (there is only ever one), so no hashing is needed for it. Kept as
# a fallback only: an existing bundle's own resourcesPage.id (even an empty
# string from the _template skeleton) is preferred when present so ingest
# never rewrites an id the app or a teacher may already reference.
DEFAULT_RESOURCES_PAGE_ID = "resources-page"

_logger: logging.Logger | None = None


def _get_logger() -> logging.Logger:
    """Lazy logger init (PY-3: no I/O at module import time)."""
    global _logger
    if _logger is None:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        _logger = logging.getLogger(__name__)
    return _logger


# ============================================================================
# Source extraction
# ============================================================================

def extract_source_text(source_path: Path) -> str:
    """Return the raw curriculum text to parse.

    A .md file is expected to carry the paste inside a ```text fence between
    PASTE_START_MARKER and PASTE_END_MARKER (the fixture format); a .txt (or
    anything else) is used whole, verbatim.
    """
    raw = source_path.read_text(encoding="utf-8")
    if source_path.suffix.lower() != ".md":
        return raw

    try:
        start = raw.index(PASTE_START_MARKER) + len(PASTE_START_MARKER)
        end = raw.index(PASTE_END_MARKER, start)
    except ValueError as exc:
        raise ValueError(
            f"{source_path}: could not find paste markers "
            f"({PASTE_START_MARKER!r} / {PASTE_END_MARKER!r})"
        ) from exc

    return raw[start:end]


def _prescan_unit_name(blocks: list[str]) -> str | None:
    """Best-effort lookahead for an "Investigations: <name>"-style heading,
    run BEFORE classification/parsing so parse_source() can suppress a
    strand node for the very heading that names the whole unit (rather than
    nesting a duplicate "unit name" container under itself) — see the loop's
    use of _is_unit_name_heading() below.

    detect_unit_scope() (run AFTER the tree is built) is still the
    authoritative source for ParseResult.scope — this is only a same-pass
    hint, so it deliberately uses the same length-based "short enough to be
    a heading, not prose that happens to start this way" guard as
    classify_block() rather than re-deriving one.
    """
    for block in blocks:
        stripped = block.strip()
        if len(stripped) > SUMMARY_LENGTH_THRESHOLD_CHARS:
            continue
        match = _INVESTIGATION_HEADING_PATTERN.match(stripped)
        if match:
            return match.group("name").strip()
    return None


def _is_unit_name_heading(heading_text: str | None, unit_name: str | None) -> bool:
    """True when `heading_text` is (a version of) the heading that names the
    whole unit — matched case-insensitively, both verbatim and with an
    "Investigations:"/"Investigation:" prefix stripped, since the same name
    can appear either way in a real paste."""
    if heading_text is None or unit_name is None:
        return False
    normalized_heading = heading_text.strip().lower()
    normalized_name = unit_name.strip().lower()
    if normalized_heading == normalized_name:
        return True
    match = _INVESTIGATION_HEADING_PATTERN.match(heading_text.strip())
    return bool(match) and match.group("name").strip().lower() == normalized_name


def split_into_blocks(text: str) -> list[str]:
    """Split raw text into blank-line-delimited blocks.

    Each block's consecutive non-blank physical lines are joined with a
    single space so a wrapped title (or a wrapped prose paragraph) is
    treated as one unit; the fixture itself never wraps, but the grammar
    only names blank lines as the boundary signal, so a lone block must
    tolerate more than one physical line.
    """
    blocks: list[str] = []
    current_lines: list[str] = []
    for line in text.split("\n"):
        if line.strip() == "":
            if current_lines:
                blocks.append(" ".join(current_lines))
                current_lines = []
            continue
        current_lines.append(line.strip("\n"))
    if current_lines:
        blocks.append(" ".join(current_lines))
    return blocks


# ============================================================================
# Block classification (first-class, inspectable — feeds parse_source AND
# --report from the same source of truth)
# ============================================================================

class BlockClass(Enum):
    """The three named classes every block in the paste is sorted into."""

    SUMMARY = "summary"     # achievement-standard prose; NOT a node
    HEADING = "heading"     # short, code-less line -> a strand node
    CRITERION = "criterion"  # line ending in a code -> an outcome node


@dataclass
class Classification:
    """The result of classify_block(): what class, how confident, and why —
    kept together so a caller/report never has to re-derive the reasoning."""

    block_class: BlockClass
    confidence: str
    reason: str
    code: str | None = None
    letter: str | None = None


def count_sentences(text: str) -> int:
    """Rough sentence count via terminal punctuation. Good enough to tell a
    single fragment/phrase (0-1) apart from multi-sentence prose (2+); not
    intended as a general-purpose sentence splitter."""
    matches = _SENTENCE_BOUNDARY_PATTERN.findall(text.strip())
    if matches:
        return len(matches)
    return 1 if text.strip() else 0


def classify_block(
    block: str, profile: dict, seen_any_outcome: bool
) -> Classification:
    """Classify one block as SUMMARY, HEADING, or CRITERION.

    This is the single place that decision gets made — parse_source() and
    build_report() both consume this result rather than re-deriving it.
    `seen_any_outcome` disambiguates the SUMMARY/HEADING boundary: per the
    grammar, prose only ever precedes the first CRITERION, so a code-less
    block seen after one is always a HEADING regardless of its length.
    """
    code_pattern = profile["code_pattern"]

    if code_pattern is None:
        # The generic profile recognises no code shape at all — per its own
        # contract, every non-blank block is an outcome, always low
        # confidence since there is no marker to rest a "high" call on.
        return Classification(
            BlockClass.CRITERION, "low",
            "profile defines no code pattern; every line is treated as an "
            "outcome",
        )

    match = code_pattern.search(block)

    if match is not None:
        code = match.group("code")
        letter = match.groupdict().get("letter")
        return Classification(
            BlockClass.CRITERION, "high",
            "line ends in a profile-defined code match", code=code, letter=letter,
        )

    if seen_any_outcome:
        return Classification(
            BlockClass.HEADING, "low",
            "no code, but a criterion has already been seen — the grammar "
            "only allows prose before the first criterion",
        )

    length = len(block)
    sentence_count = count_sentences(block)
    ends_with_terminal_punctuation = block.rstrip().endswith(
        HEADING_TERMINAL_PUNCTUATION
    )
    is_long = length > SUMMARY_LENGTH_THRESHOLD_CHARS
    is_multi_sentence = sentence_count > HEADING_MAX_SENTENCES
    is_borderline_length = (
        abs(length - SUMMARY_LENGTH_THRESHOLD_CHARS)
        <= SUMMARY_LENGTH_BORDERLINE_MARGIN_CHARS
    )

    if is_long and is_multi_sentence:
        return Classification(
            BlockClass.SUMMARY, "high",
            f"long ({length} chars) and multi-sentence "
            f"({sentence_count} sentences) block before the first criterion",
        )

    if not is_long and not is_multi_sentence and not ends_with_terminal_punctuation:
        return Classification(
            BlockClass.HEADING, "high",
            f"short ({length} chars), single-sentence, no terminal "
            f"punctuation before the first criterion",
        )

    # Signals disagree, or length sits right on the threshold — this is the
    # genuinely fuzzy call the brief calls out; always flagged low.
    if is_borderline_length:
        reason = (
            f"length ({length} chars) is within "
            f"{SUMMARY_LENGTH_BORDERLINE_MARGIN_CHARS} chars of the "
            f"{SUMMARY_LENGTH_THRESHOLD_CHARS}-char threshold — borderline"
        )
    else:
        reason = (
            f"length ({length} chars), sentence count ({sentence_count}) "
            f"and terminal punctuation ({ends_with_terminal_punctuation}) "
            "signals disagree"
        )
    leans_summary = is_long or is_multi_sentence or ends_with_terminal_punctuation
    block_class = BlockClass.SUMMARY if leans_summary else BlockClass.HEADING
    return Classification(block_class, "low", reason)


# ============================================================================
# Id derivation (AD-2: deterministic, no randomness, no timestamps)
# ============================================================================

def derive_outcome_id(code: str) -> str:
    """Outcome ids are simply their verbatim code — the natural business key
    re-ingest also matches on (AD-CIB-4)."""
    return code


def derive_hash_id(kind: str, title: str | None, parent_path: str) -> str:
    """Stable id for a node with no code (a strand/heading), derived from a
    hash of (kind, title, parent path). Same inputs always hash the same —
    that is what makes re-running the parser on unchanged input produce a
    byte-identical tree (AD-2)."""
    basis = f"{kind}\x1f{title!r}\x1f{parent_path}"
    digest = hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]
    return f"strand-{digest}"


def derive_topic_id(title: str) -> str:
    """Stable id for a seeded Topic, hashed from its title alone — titles are
    the business key re-ingest matches topics on (see merge_topics), so two
    runs over unchanged input always mint the same id (AD-2)."""
    digest = hashlib.sha256(title.encode("utf-8")).hexdigest()[:16]
    return f"topic-{digest}"


def derive_resource_item_id(text: str, note: str | None) -> str:
    """Stable id for a seeded ResourceItem, hashed from (text, note) — the
    same pair merge_resource_items() matches on — so re-ingest over
    unchanged input mints the same id rather than a fresh uuid/timestamp
    (AD-2)."""
    basis = f"resource\x1f{text!r}\x1f{note!r}"
    digest = hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]
    return f"resource-{digest}"


# ============================================================================
# Node construction
# ============================================================================

def _make_node(
    node_id: str,
    code: str | None,
    title: str | None,
    text: str | None,
    kind: str,
    parent_id: str | None,
    confidence: str,
    domain: str | None,
) -> dict:
    """Build a node dict with exactly the required fields (INV per spec)."""
    return {
        "id": node_id,
        "code": code,
        "title": title,
        "text": text,
        "kind": kind,
        "parentId": parent_id,
        "confidence": confidence,
        "edited": False,
        "original": None,
        "domain": domain,
    }


# ============================================================================
# Parser
# ============================================================================

@dataclass
class ParseResult:
    """Everything parse_source() produces. `summary_blocks` is handed back
    verbatim rather than folded into `nodes` or written anywhere — routing
    SUMMARY text (e.g. into curriculum.description) is the caller's
    decision, not this module's (see module docstring)."""

    nodes: list[dict]
    summary_blocks: list[str] = field(default_factory=list)
    classifications: list[Classification] = field(default_factory=list)
    sequence_gaps: list[str] = field(default_factory=list)
    scope: dict = field(default_factory=dict)


def parse_source(text: str, profile: dict) -> ParseResult:
    """Parse raw curriculum text into a node tree using `profile`'s rules.

    Every block is run through classify_block() first; the loop below
    dispatches purely on that result rather than re-inspecting the block.
    """
    blocks = split_into_blocks(text)
    strand_map: dict[str, tuple[str, str]] = profile["strand_map"]
    # Lookahead so the loop below can recognise the unit-name heading the
    # moment it sees it, rather than only after the fact (detect_unit_scope
    # runs after the tree exists — see _prescan_unit_name's docstring).
    prescanned_unit_name = _prescan_unit_name(blocks)

    nodes: list[dict] = []
    # The synthetic root is a real node with a parentId of None (INV-DM-3's
    # root marker), not a fourth node "kind" — the data model permits only
    # "outcome" | "task" | "strand" (CurriculumPreparation-datamodel.spec.md,
    # Node entity), so the root is emitted as kind "strand" like any other
    # container node; it is distinguished from real strands purely by
    # parentId being None, exactly as INV-DM-3 already requires.
    root = _make_node(ROOT_NODE_ID, None, "Unit", None, "strand", None, "high", None)
    nodes.append(root)

    summary_blocks: list[str] = []
    classifications: list[Classification] = []
    code_groups: dict[str, list[str]] = {}  # container node id -> its codes
    seen_any_outcome = False
    pending_heading: str | None = None  # heading text awaiting a coded line
    top_strand_by_letter: dict[str, dict] = {}
    current_container: dict = root  # node new outcomes attach under

    for block in blocks:
        classification = classify_block(block, profile, seen_any_outcome)
        classifications.append(classification)

        if classification.block_class is BlockClass.SUMMARY:
            summary_blocks.append(block)
            continue

        if classification.block_class is BlockClass.HEADING:
            # A second heading before the first is consumed overwrites it
            # with a warning rather than silently dropping it — this parser
            # flags guesses, it doesn't hide them (AD-16).
            if pending_heading is not None:
                _get_logger().warning(
                    "Orphan heading discarded (no coded line followed "
                    "it before the next heading): %r",
                    pending_heading,
                )
                _emit_orphan_heading(nodes, root, pending_heading)
            pending_heading = block
            continue

        # CRITERION -> outcome node.
        code = classification.code
        letter = classification.letter
        if profile["code_pattern"] is not None:
            match = profile["code_pattern"].search(block)
            title = (block[: match.start()] + block[match.end():]).strip()
        else:
            # Generic profile: no code to strip out, the whole line is title.
            title = block.strip()
        seen_any_outcome = True

        if letter is not None and letter in strand_map:
            strand_name, domain = strand_map[letter]
        else:
            strand_name, domain = (None, None)

        # Resolve which container this outcome (and any pending heading)
        # attaches under: a brand-new top-level strand per code letter, a
        # nested sub-strand when a heading intervened, or the existing
        # container when nothing changed.
        if letter is not None:
            if letter not in top_strand_by_letter:
                # A heading that just renames the unit itself isn't a real
                # heading for this container — treat it the same as "no
                # heading seen yet" (item 2: no duplicate "unit name"
                # strand).
                effective_heading = pending_heading
                if _is_unit_name_heading(pending_heading, prescanned_unit_name):
                    effective_heading = None

                if effective_heading is None and strand_name is not None:
                    # No real heading preceded this code, but the profile
                    # already has a name for this letter's strand (e.g.
                    # "Knowledge"/"Skills") — use that instead of a null
                    # title (was: a title:null container). This still
                    # creates a real node so `domain` has somewhere to live
                    # for domain resolution downstream (AC-CG / resolveDomain).
                    strand_title = strand_name
                    confidence = "high"  # profile-defined mapping, not a guess
                    strand_id = derive_hash_id("strand", strand_title, root["id"])
                    strand_node = _make_node(
                        strand_id, None, strand_title, None,
                        "strand", root["id"], confidence, domain,
                    )
                    nodes.append(strand_node)
                    top_strand_by_letter[letter] = strand_node
                    current_container = strand_node
                    pending_heading = None
                elif effective_heading is None:
                    # No heading AND no profile name for this letter
                    # (generic profile) — nothing worth a container for;
                    # attach straight to root instead of synthesising a
                    # nameless strand.
                    top_strand_by_letter[letter] = root
                    current_container = root
                    pending_heading = None
                else:
                    strand_title = effective_heading
                    confidence = "low"  # heading-vs-prose / inferred-strand guess
                    strand_id = derive_hash_id("strand", strand_title, root["id"])
                    strand_node = _make_node(
                        strand_id, None, strand_title, effective_heading,
                        "strand", root["id"], confidence, domain,
                    )
                    nodes.append(strand_node)
                    top_strand_by_letter[letter] = strand_node
                    current_container = strand_node
                    pending_heading = None
            elif pending_heading is not None:
                parent_strand = top_strand_by_letter[letter]
                if _is_unit_name_heading(pending_heading, prescanned_unit_name):
                    # This heading only renames the unit — reparent its
                    # children onto the existing container instead of
                    # nesting a duplicate "unit name" strand under it.
                    current_container = parent_strand
                    pending_heading = None
                else:
                    sub_id = derive_hash_id(
                        "strand", pending_heading, parent_strand["id"]
                    )
                    sub_node = _make_node(
                        sub_id, None, pending_heading, pending_heading,
                        "strand", parent_strand["id"], "low", None,
                    )
                    nodes.append(sub_node)
                    current_container = sub_node
                    pending_heading = None
            # else: no letter change, no new heading -> keep current_container
        elif pending_heading is not None:
            if _is_unit_name_heading(pending_heading, prescanned_unit_name):
                current_container = root
                pending_heading = None
            else:
                # Generic-profile style: no strand letters at all, but a
                # heading still creates a container for what follows.
                sub_id = derive_hash_id("strand", pending_heading, root["id"])
                sub_node = _make_node(
                    sub_id, None, pending_heading, pending_heading,
                    "strand", root["id"], "low", None,
                )
                nodes.append(sub_node)
                current_container = sub_node
                pending_heading = None

        if code is not None:
            outcome_id = derive_outcome_id(code)
            code_groups.setdefault(current_container["id"], []).append(code)
        else:
            # Generic profile: no code at all, fall back to the same
            # deterministic hash strategy used for code-less strand nodes.
            outcome_id = derive_hash_id("outcome", title, current_container["id"])
        outcome_node = _make_node(
            outcome_id, code, title, block, "outcome",
            current_container["id"], classification.confidence, None,
        )
        nodes.append(outcome_node)

    # A heading with nothing after it (end of input) is an orphan.
    if pending_heading is not None:
        _emit_orphan_heading(nodes, root, pending_heading)

    return ParseResult(
        nodes=nodes,
        summary_blocks=summary_blocks,
        classifications=classifications,
        sequence_gaps=detect_sequence_gaps(code_groups),
        scope=detect_unit_scope(nodes, prescanned_unit_name),
    )


def _emit_orphan_heading(nodes: list[dict], root: dict, heading_text: str) -> None:
    """A heading that never got a coded child: keep it, flagged low-confidence
    and childless, rather than silently dropping information (AD-16)."""
    orphan_id = derive_hash_id("strand", heading_text, root["id"])
    if any(n["id"] == orphan_id for n in nodes):
        return  # already emitted (defensive; blocks are deduped by content)
    nodes.append(
        _make_node(
            orphan_id, None, heading_text, heading_text,
            "strand", root["id"], "low", None,
        )
    )


# ============================================================================
# Sequence-gap detection (offline, no network — analysis of codes present)
# ============================================================================

def detect_sequence_gaps(code_groups: dict[str, list[str]]) -> list[str]:
    """Flag ordinals missing strictly between the lowest and highest code
    observed under each heading (see module docstring for why per-heading,
    not per-letter-family across the whole document).

    `code_groups` maps a container node id -> the codes attached directly
    under it. Never extrapolates beyond a group's own observed min/max, so
    codes belonging to a different, unpasted heading are never flagged.
    """
    gaps: set[str] = set()
    for codes in code_groups.values():
        parsed: list[tuple[str, str, int]] = []
        for code in codes:
            match = _CODE_ORDINAL_PATTERN.match(code)
            if match is None:
                continue  # code shape without a trailing ordinal: skip
            parsed.append(
                (match.group("prefix"), match.group("letter"), int(match.group("ordinal")))
            )

        by_family: dict[tuple[str, str], list[int]] = {}
        for prefix, letter, ordinal in parsed:
            by_family.setdefault((prefix, letter), []).append(ordinal)

        for (prefix, letter), ordinals in by_family.items():
            if len(ordinals) < 2:
                continue  # a single code has no "between" to check
            lowest, highest = min(ordinals), max(ordinals)
            present = set(ordinals)
            width = len(str(highest))  # preserve the observed digit width
            for candidate in range(lowest + 1, highest):
                if candidate not in present:
                    gaps.add(f"{prefix}{letter}{candidate:0{max(width, 2)}d}")

    return sorted(gaps)


# ============================================================================
# Unit-scope detection (offline — what grouping(s) this paste actually covers)
# ============================================================================

def detect_unit_scope(
    nodes: list[dict], prescanned_unit_name: str | None = None
) -> dict:
    """Report which heading(s) the paste covers and the codes under each,
    plus a suggested unit name lifted from an "Investigations: ..."-style
    heading where one exists. Tells the teacher what the parser thinks the
    pasted unit IS — distinct from, and orthogonal to, sequence-gap
    detection.

    `prescanned_unit_name` is the same lookahead parse_source() already used
    to suppress a strand node for the heading that names the unit (see
    _is_unit_name_heading) — since that heading is deliberately never
    emitted as a node anymore, scanning `nodes` alone can no longer find it.
    Passed through as a fallback so scope.suggested_unit_name doesn't regress
    to None just because the parser got better at not duplicating it.
    """
    headings: list[dict] = []
    suggested_unit_name: str | None = None

    for node in nodes:
        if node["kind"] != "strand" or node["id"] == ROOT_NODE_ID:
            continue
        codes = [
            n["code"] for n in nodes
            if n["parentId"] == node["id"] and n["kind"] == "outcome"
        ]
        if not codes:
            continue  # an orphan heading with nothing under it isn't "scope"
        headings.append({"title": node["title"], "codes": codes})

        if suggested_unit_name is None and node["title"]:
            match = _INVESTIGATION_HEADING_PATTERN.match(node["title"])
            if match:
                suggested_unit_name = match.group("name").strip()

    if suggested_unit_name is None:
        suggested_unit_name = prescanned_unit_name

    return {"headings": headings, "suggested_unit_name": suggested_unit_name}


# ============================================================================
# Tree validation (AD-CIB-2 hard safety rule — INV-DM-3)
# ============================================================================

class TreeInvariantError(ValueError):
    """Raised when a parsed tree would violate INV-DM-3. Carries which
    invariant broke and which node ids caused it, for a precise report."""

    def __init__(self, invariant: str, node_ids: list[str], detail: str):
        self.invariant = invariant
        self.node_ids = node_ids
        super().__init__(f"{invariant}: {detail} (nodes: {node_ids})")


def validate_tree(nodes: list[dict]) -> None:
    """Enforce INV-DM-3: exactly one root, every non-root parentId resolves,
    no cycles. Raises TreeInvariantError on the first violation found."""
    roots = [n for n in nodes if n["parentId"] is None]
    if len(roots) != 1:
        raise TreeInvariantError(
            "INV-DM-3", [n["id"] for n in roots],
            f"expected exactly one root, found {len(roots)}",
        )

    by_id = {n["id"]: n for n in nodes}
    duplicate_ids = [nid for nid in by_id if [n["id"] for n in nodes].count(nid) > 1]
    if duplicate_ids:
        raise TreeInvariantError(
            "INV-DM-3", duplicate_ids, "duplicate node ids",
        )

    for node in nodes:
        parent_id = node["parentId"]
        if parent_id is None:
            continue
        if parent_id not in by_id:
            raise TreeInvariantError(
                "INV-DM-3", [node["id"]],
                f"parentId {parent_id!r} does not resolve to any node",
            )

    # Cycle detection: walk each node's ancestor chain; if we revisit a node
    # already on the current chain, that's a cycle.
    for node in nodes:
        visited: set[str] = set()
        current: dict | None = node
        while current is not None:
            if current["id"] in visited:
                raise TreeInvariantError(
                    "INV-DM-3", sorted(visited), "cycle detected in parent chain",
                )
            visited.add(current["id"])
            parent_id = current["parentId"]
            current = by_id.get(parent_id) if parent_id is not None else None


# ============================================================================
# Re-ingest merge (AD-CIB-3 / AD-CIB-4)
# ============================================================================

def merge_nodes(existing_nodes: list[dict], new_nodes: list[dict]) -> list[dict]:
    """Merge a fresh parse into an existing node list.

    Matching key: a node's `code` when it has one (the natural business key
    re-ingest is specified to match on) — outcomes always have a code, so
    this is unambiguous for them. Strand/root nodes carry no code at all, so
    for those we fall back to their id, which is itself a deterministic hash
    of (kind, title, parent path) rather than anything random — re-running
    the same source reproduces the same id, which is what makes the fallback
    safe (documented limitation: if a strand's title changes between runs
    its hash changes too, so it will be treated as a new node rather than an
    update — acceptable for this prototype).

    edited=True nodes are left completely untouched. edited=False nodes may
    have their guessed fields (title/text/confidence/domain) refreshed from
    the new parse. New nodes are appended. Existing nodes that no longer
    appear in the new parse are kept as-is (never deleted here) since this
    prototype has no visibility into lesson/topic/assessment references
    that might point at them — deleting on re-ingest is out of scope.
    """
    def key_of(node: dict) -> str:
        return node["code"] if node["code"] else node["id"]

    existing_by_key = {key_of(n): n for n in existing_nodes}
    merged: list[dict] = []
    seen_keys: set[str] = set()

    for new_node in new_nodes:
        key = key_of(new_node)
        seen_keys.add(key)
        existing = existing_by_key.get(key)
        if existing is None:
            merged.append(new_node)
        elif existing.get("edited"):
            merged.append(existing)  # untouched, per AD-CIB-3
        else:
            refreshed = dict(existing)
            refreshed["title"] = new_node["title"]
            refreshed["text"] = new_node["text"]
            refreshed["confidence"] = new_node["confidence"]
            refreshed["domain"] = new_node["domain"]
            # Reparenting is real information from the new parse, not a
            # "guessed field" to leave stale — an unedited node whose code
            # moved under a different heading between pastes should follow
            # that move. Safe because new_node["parentId"] always points at
            # a node this same merge is emitting (either fresh or refreshed
            # from new_nodes), so referential integrity holds and
            # validate_tree() still runs on the merged result before write.
            refreshed["parentId"] = new_node["parentId"]
            merged.append(refreshed)

    for key, existing in existing_by_key.items():
        if key not in seen_keys:
            merged.append(existing)  # preserved, not deleted (see docstring)

    return merged


# ============================================================================
# Topic seeding (Decision 2: every real HEADING strand also seeds a Topic)
# ============================================================================

def _is_topic_candidate(node: dict) -> bool:
    """A strand node becomes a Topic candidate iff it is a REAL heading from
    the paste: not the synthetic root ("Unit", INV-DM-3's root marker) and
    not the un-headed group whose title is None (no heading ever preceded
    it in the source)."""
    return (
        node["kind"] == "strand"
        and node["id"] != ROOT_NODE_ID
        and node["title"] is not None
    )


def build_topics(nodes: list[dict]) -> list[dict]:
    """Seed a flat topics[] list (no parentId/nesting, per the Topic entity)
    from every real heading strand in `nodes`, in document order.

    Each topic's coverage[] is that heading's own DIRECT outcome children
    (not descendants under a nested sub-heading, which get their own Topic),
    coverage="full" and note=None for every one, ready for the teacher to
    edit down to "partial" or add a note. `text` stays None — elaboration is
    left for the teacher, this module only ever seeds structure it can infer
    from the paste.
    """
    by_id = {n["id"]: n for n in nodes}
    topics: list[dict] = []
    order = 0
    for node in nodes:
        if not _is_topic_candidate(node):
            continue
        coverage = [
            {"nodeId": child["id"], "coverage": "full", "note": None}
            for child in nodes
            if child["parentId"] == node["id"] and child["kind"] == "outcome"
        ]
        # INV-DM-35 / INV-DM-36 sanity: every nodeId just came straight from
        # `nodes` (so it resolves by construction) and each outcome id is
        # only ever a direct child of one parent, so no duplicates arise.
        topics.append({
            "id": derive_topic_id(node["title"]),
            "title": node["title"],
            "text": None,
            "order": order,
            "coverage": coverage,
        })
        order += 1
    return topics


def _topic_matches_fresh_shape(existing: dict, fresh: dict) -> bool:
    """True iff `existing` is still exactly the shape a fresh seed would
    produce for the same id — i.e. untouched since ingest last wrote it.

    There is no `edited` flag on Topic (the schema doesn't define one, and
    this rule deliberately does not invent one). Instead: compare every
    field ingest seeds (title/text/order/coverage) against what a fresh
    parse would produce right now. Identical on every field -> still
    "just seeded", safe to refresh/no-op. Different on ANY field — a
    renamed title, a changed order, a filled-in text, an added or edited
    coverage entry -> treat the whole topic as teacher-edited and leave it
    completely alone, per the "never clobber user edits" rule.

    `title` is compared here rather than used as the match key: renaming a
    topic is an edit to protect, not a reason to stop recognising it.
    """
    return (
        existing.get("title") == fresh["title"]
        and existing.get("text") == fresh["text"]
        and existing.get("order") == fresh["order"]
        and existing.get("coverage") == fresh["coverage"]
    )


def merge_topics(existing_topics: list[dict], new_topics: list[dict]) -> list[dict]:
    """Merge freshly-seeded topics into an existing topics[] list.

    Matching key: `id`. The id is derived deterministically from the source
    heading, so it survives the teacher renaming a topic — which is the
    single most likely edit they will make. Matching on `title` instead
    looks natural but is wrong: a renamed topic stops matching, a second
    topic is appended, and because both carry the same derived id the unit
    ends up with two topics sharing one id, which breaks `bigIdea.topicId`
    resolution. Guard against that with a regression test, not a comment.

    For each freshly-seeded topic:
      - no existing topic with that id -> append the new one.
      - an existing topic with that id, still in "just seeded" shape
        (see _topic_matches_fresh_shape) -> replace with the fresh version
        (a no-op in the idempotent case; a real refresh if the underlying
        node tree changed coverage while the topic itself was untouched).
      - an existing topic with that id that has been hand-edited in ANY
        way, renames included -> left completely untouched, never
        overwritten, never duplicated.
    Existing topics whose ids no longer come up in a fresh parse (e.g. a
    heading was removed from the source) are preserved as-is — deleting on
    re-ingest is out of scope, matching merge_nodes()'s own policy.
    """
    existing_by_id = {t["id"]: t for t in existing_topics}
    seen_ids: set[str] = set()
    merged: list[dict] = []

    for fresh in new_topics:
        topic_id = fresh["id"]
        seen_ids.add(topic_id)
        existing = existing_by_id.get(topic_id)
        if existing is None:
            merged.append(fresh)
        elif _topic_matches_fresh_shape(existing, fresh):
            merged.append(fresh)
        else:
            merged.append(existing)  # teacher-edited: untouched

    for topic_id, existing in existing_by_id.items():
        if topic_id not in seen_ids:
            merged.append(existing)  # preserved, not deleted

    return merged


# ============================================================================
# Resource item seeding (Decision 1: SUMMARY blocks route to resourcesPage)
# ============================================================================

def build_resource_items(summary_blocks: list[str]) -> list[dict]:
    """Turn parsed SUMMARY blocks into ResourceItems (kind "text"), one per
    block, in paste order. Only the fields kind "text" needs are populated;
    url/label/imageId stay None (INV-DM-29). `order` is left as the item's
    position within THIS batch — merge_resource_items() renumbers relative
    to whatever is already on the page so a re-ingest never reuses an order
    another item already holds.

    `note` is a short, deterministic descriptor of what the block is: the
    first SUMMARY block in a paste is, per the grammar (module docstring),
    the achievement-standard paragraph that always precedes the first coded
    line, so it is labelled as such; any further SUMMARY block (the grammar
    allows more than one blank-line-delimited paragraph before the first
    criterion) is labelled generically, since nothing in the parse gives it
    a more specific identity.
    """
    items: list[dict] = []
    for index, block in enumerate(summary_blocks):
        note = "Achievement standard" if index == 0 else f"Summary text {index + 1}"
        items.append({
            "id": derive_resource_item_id(block, note),
            "kind": "text",
            "order": index,
            "url": None,
            "label": None,
            "imageId": None,
            "text": block,
            "note": note,
        })
    return items


def _resource_item_matches_fresh_shape(existing: dict, fresh: dict) -> bool:
    """True iff `existing` (already matched to `fresh` on text+note) still
    has every other field exactly as a fresh seed would set it — i.e. it was
    never hand-edited into a different kind/url/label/imageId since ingest
    last wrote it. Matching itself is on (text, note) rather than id,
    because id is only deterministic once (text, note) are fixed."""
    return (
        existing.get("kind") == fresh["kind"]
        and existing.get("url") == fresh["url"]
        and existing.get("label") == fresh["label"]
        and existing.get("imageId") == fresh["imageId"]
    )


def merge_resource_items(existing_items: list[dict], new_items: list[dict]) -> list[dict]:
    """Merge freshly-seeded resource items into resourcesPage.items[].

    Matching key: (`text`, `note`) — the pair a teacher is least likely to
    both leave untouched AND expect to mean something different (AD-CIB-4's
    "natural business key" discipline, applied here since ResourceItem
    carries no code of its own). For each freshly-seeded item:
      - no existing item with that (text, note) -> append it, with `order`
        continuing on from the highest order already on the page (curated
        ordering is never renumbered out from under a teacher's own items).
      - a match exists and every other field (kind/url/label/imageId) is
        still exactly what a fresh seed would set -> leave the existing
        item's `order` as-is and otherwise no-op (this is what makes a
        second identical run byte-for-byte idempotent: matched, unchanged,
        already in the list, nothing appended).
      - a match exists but some other field has been hand-edited (e.g. the
        teacher retyped it as a link) -> leave the existing item completely
        untouched, never overwritten, never duplicated.
    Existing items with no match in the fresh batch are preserved verbatim.
    """
    def match_key(item: dict) -> tuple[str, str | None]:
        return (item.get("text"), item.get("note"))

    existing_by_key = {match_key(i): i for i in existing_items}
    seen_keys: set[tuple[str, str | None]] = set()
    merged: list[dict] = list(existing_items)
    next_order = (max((i.get("order", -1) for i in existing_items), default=-1) + 1)

    for fresh in new_items:
        key = match_key(fresh)
        seen_keys.add(key)
        existing = existing_by_key.get(key)
        if existing is None:
            appended = dict(fresh)
            appended["order"] = next_order
            next_order += 1
            merged.append(appended)
        elif _resource_item_matches_fresh_shape(existing, fresh):
            pass  # already present, identical in every field that matters
        else:
            pass  # hand-edited: leave the existing item untouched

    return merged


# ============================================================================
# unit.json read/write
# ============================================================================

def load_unit(unit_path: Path) -> dict:
    """Read an existing unit.json, or return a minimal skeleton if absent.

    The skeleton must satisfy INV-DM-18 on its own (cribSheet,
    unitAssessment, resourcesPage, matrixTemplate are singular objects that
    must be *present*) even though ingest.py never populates their
    contents — this script only ever writes `nodes[]` and `curriculum`.
    In the normal flow `bundle-template` has already scaffolded unit.json
    with these before ingest ever runs, so this path is rarely exercised;
    but ingest.py is also invocable standalone (its own CLI contract), and
    the existing skeleton without them produced a unit.json the app's own
    validateUnit() rejects outright (INV-DM-18: "cribSheet/unitAssessment/
    resourcesPage/matrixTemplate must be present") — i.e. the very first
    real run of this script, with no unit.json yet on disk, wrote a file
    the app could not open. Matching bundle-template's empty-state values
    keeps this skeleton in sync with what validateUnit / INV-DM-7's
    documented empty-state reading both already treat as valid: an empty
    cribSheet.sections / matrixTemplate.criteria list, no unitAssessment
    sub-fields yet, no resourcesPage.items yet.
    """
    if not unit_path.exists():
        return {
            "nodes": [],
            "curriculum": {},
            "cribSheet": {"sections": []},
            "unitAssessment": {},
            "resourcesPage": {"items": []},
            "matrixTemplate": {"criteria": []},
        }
    with unit_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _utc_now_iso() -> str:
    """Current UTC time as an ISO-8601 string (seconds precision, explicit
    'Z' suffix) for curriculum.ingestedAt. Kept as its own function so a
    test can monkeypatch it rather than freezing real time."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_unit_atomic(unit_path: Path, unit: dict) -> None:
    """Write unit.json atomically: temp file in the same directory, then
    Path.replace (mirrors _template/serve.py's os.replace approach) so a
    crash mid-write can never leave a partial file (AD-CIB-2)."""
    unit_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        dir=unit_path.parent, prefix=".unit-", suffix=".json.tmp"
    )
    tmp_path = Path(tmp_name)
    replaced = False
    try:
        with open(fd, "w", encoding="utf-8") as handle:
            json.dump(unit, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
        tmp_path.replace(unit_path)
        replaced = True
    finally:
        # Clean up the temp file on ANY failure, not just OSError — e.g.
        # json.dump raises TypeError/ValueError on non-serializable data,
        # not OSError, and an except-OSError-only guard here left that temp
        # file orphaned in the bundle directory. The original unit.json was
        # never at risk either way (tmp_path.replace() is the only step
        # that touches it, and it only runs after json.dump succeeds), but
        # a stray .unit-*.json.tmp file next to a real bundle is still a
        # cleanup bug worth closing.
        if not replaced:
            tmp_path.unlink(missing_ok=True)


# ============================================================================
# Reporting
# ============================================================================

def build_report(parse_result: "ParseResult") -> str:
    """Per-kind node counts, the three-way block classification breakdown
    (the diagnostic that matters most for the Q-1 accuracy measurement),
    unit scope, possible omissions, and every low-confidence node — for
    --report."""
    nodes = parse_result.nodes
    classifications = parse_result.classifications
    counts: dict[str, int] = {}
    low_confidence: list[dict] = []
    for node in nodes:
        counts[node["kind"]] = counts.get(node["kind"], 0) + 1
        if node["confidence"] == "low":
            low_confidence.append(node)

    lines = ["Per-kind node counts:"]
    for kind in sorted(counts):
        lines.append(f"  {kind}: {counts[kind]}")

    class_counts: dict[str, int] = {}
    for classification in classifications:
        key = classification.block_class.value
        class_counts[key] = class_counts.get(key, 0) + 1

    lines.append("")
    lines.append("Block classification breakdown:")
    for block_class in BlockClass:
        lines.append(f"  {block_class.value}: {class_counts.get(block_class.value, 0)}")

    lines.append("")
    lines.append("Per-block classification (eyeball misclassification here):")
    for index, classification in enumerate(classifications):
        lines.append(
            f"  [{index}] {classification.block_class.value} "
            f"({classification.confidence}) — {classification.reason}"
        )

    lines.append("")
    lines.append("Unit scope (what the parser thinks this paste covers):")
    suggested_name = parse_result.scope.get("suggested_unit_name")
    lines.append(f"  Suggested unit name: {suggested_name!r}")
    for heading in parse_result.scope.get("headings", []):
        lines.append(
            f"  Heading {heading['title']!r}: {len(heading['codes'])} code(s) "
            f"({heading['codes'][0]}..{heading['codes'][-1]})"
        )

    lines.append("")
    lines.append(
        "Possible omissions — codes missing between the lowest and highest "
        "seen under the same heading. The parser cannot tell whether these "
        "were left out on purpose; worth asking the teacher:"
    )
    if parse_result.sequence_gaps:
        for code in parse_result.sequence_gaps:
            lines.append(f"  Was {code} meant to be included?")
    else:
        lines.append("  (none found)")

    lines.append("")
    lines.append(f"Low-confidence nodes ({len(low_confidence)}):")
    for node in low_confidence:
        lines.append(
            f"  [{node['kind']}] id={node['id']} code={node['code']} "
            f"title={node['title']!r}"
        )
    return "\n".join(lines)


# ============================================================================
# CLI
# ============================================================================

def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest a raw curriculum paste into unit.json nodes."
    )
    parser.add_argument(
        "--source", required=True, type=Path,
        help="Path to a .md fixture (fenced paste) or a plain .txt source.",
    )
    parser.add_argument(
        "--unit", required=True, type=Path,
        help="Path to the unit.json to read/write.",
    )
    parser.add_argument(
        "--profile", required=True,
        help="Profile id, e.g. vic-f10-v2 or generic.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would happen; write nothing.",
    )
    parser.add_argument(
        "--report", action="store_true",
        help="Print per-kind counts and every low-confidence node.",
    )
    parser.add_argument(
        "--no-topics", action="store_true",
        help="Skip seeding topics[] from HEADING strands (Decision 2 is on "
             "by default). Does not affect resourcesPage routing.",
    )
    return parser.parse_args(argv)


def run(argv: list[str]) -> int:
    """Do the actual work; returns a process exit code (PY-6: never a bare
    exception escapes to the caller)."""
    args = parse_args(argv)
    logger = _get_logger()

    try:
        profile = get_profile(args.profile)
    except KeyError as exc:
        logger.error(str(exc))
        return 1

    try:
        source_text = extract_source_text(args.source)
    except (OSError, ValueError) as exc:
        logger.error(f"Could not read source: {exc}")
        return 1

    parse_result = parse_source(source_text, profile)

    existing_unit = load_unit(args.unit)
    existing_nodes = existing_unit.get("nodes", [])
    merged_nodes = (
        merge_nodes(existing_nodes, parse_result.nodes)
        if existing_nodes else parse_result.nodes
    )

    try:
        validate_tree(merged_nodes)
    except TreeInvariantError as exc:
        logger.error(f"Refusing to write: {exc}")
        return 1

    if args.report:
        reported_result = ParseResult(
            nodes=merged_nodes,
            summary_blocks=parse_result.summary_blocks,
            classifications=parse_result.classifications,
            sequence_gaps=parse_result.sequence_gaps,
            scope=parse_result.scope,
        )
        print(build_report(reported_result))

    if args.dry_run:
        print(f"[dry-run] would write {len(merged_nodes)} nodes to {args.unit}")
        return 0

    # SUMMARY routing (Decision 1, superseding the module docstring's older
    # "caller's job, still undecided" note — it has since been decided by
    # the project owner): SUMMARY blocks become ResourceItems on the
    # singular resourcesPage, never curriculum.description.
    curriculum = dict(existing_unit.get("curriculum") or {})
    curriculum["profileId"] = profile["id"]
    curriculum.setdefault("labels", {})
    curriculum["labels"].update(profile["labels"])

    # Provenance (previously left empty — see module docstring / AD-CIB
    # note): populate from the profile's own static metadata where the
    # profile carries it, and stamp every run's own ingestedAt
    # unconditionally, so a teacher can tell when a bundle was last ingested
    # even if nothing else about the profile changed.
    curriculum["name"] = profile.get("name", curriculum.get("name", ""))
    curriculum["jurisdiction"] = profile.get(
        "jurisdiction", curriculum.get("jurisdiction", "")
    )
    curriculum["version"] = profile.get("version", curriculum.get("version", ""))
    curriculum["ingestedAt"] = _utc_now_iso()

    # meta.unitName (if present) is teacher-entered at unit creation (see
    # !NewUnit) and is authoritative — ingest must never overwrite it.
    # suggestedName is offered alongside it, low-confidence, purely as a
    # hint for a teacher who left the name blank or wants to double-check it.
    suggested_name = parse_result.scope.get("suggested_unit_name")
    if suggested_name:
        curriculum["suggestedName"] = suggested_name

    existing_resources_page = existing_unit.get("resourcesPage") or {}
    existing_resource_items = existing_resources_page.get("items") or []
    new_resource_items = build_resource_items(parse_result.summary_blocks)
    merged_resource_items = merge_resource_items(
        existing_resource_items, new_resource_items
    )
    resources_page = {
        "id": existing_resources_page.get("id") or DEFAULT_RESOURCES_PAGE_ID,
        "items": merged_resource_items,
    }

    # Decision 2: every real HEADING strand also seeds a topics[] entry,
    # unless --no-topics was passed (in which case topics[] is left exactly
    # as it was on disk — no seeding, no merging).
    if args.no_topics:
        merged_topics = existing_unit.get("topics", [])
    else:
        new_topics = build_topics(merged_nodes)
        merged_topics = merge_topics(existing_unit.get("topics", []), new_topics)

    updated_unit = dict(existing_unit)
    updated_unit["nodes"] = merged_nodes
    updated_unit["curriculum"] = curriculum
    updated_unit["resourcesPage"] = resources_page
    updated_unit["topics"] = merged_topics

    try:
        write_unit_atomic(args.unit, updated_unit)
    except OSError as exc:
        logger.error(f"Failed to write {args.unit}: {exc}")
        return 1

    logger.info(f"Wrote {len(merged_nodes)} nodes to {args.unit}")
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
