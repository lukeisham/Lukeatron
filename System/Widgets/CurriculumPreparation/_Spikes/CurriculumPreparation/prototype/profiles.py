#!/usr/bin/env python3
"""
Curriculum Profiles — Declarative per-curriculum ingest rules
===============================================================
Holds the curriculum-agnostic contract (AD-10) that ingest.py depends on.
Nothing curriculum-specific lives in ingest.py itself — every jurisdiction's
quirks (code shape, strand-letter meaning, display labels) live here as a
plain dict, so a new curriculum is a new profile, not a code change.

Each profile is a dict with these keys:
    id            str   — the profile's identifier (matches --profile)
    code_pattern  re.Pattern | None
                        — compiled regex matched against the END of a line.
                          Must expose two named groups: "code" (the full
                          token to preserve verbatim) and "letter" (the
                          single character used to classify the strand).
                          None means "this curriculum has no codes" — every
                          non-blank line becomes a low-confidence outcome.
    strand_map    dict[str, tuple[str, str]]
                        — letter -> (strand display name, domain value).
                          Empty dict is valid (e.g. the generic profile).
    labels        dict[str, str]
                        — canonical kind name -> this curriculum's own word
                          for it. Always carries "strand", "outcome", "task".

No I/O happens here (PY-3) — this module is just data plus a lookup.
"""
import re

# ============================================================================
# vic-f10-v2 — Victorian Curriculum F-10 Version 2
# ============================================================================
# Code shape observed in the Year 10 History fixture: VC2HH10K01. Written
# generally so it also covers other learning areas (any two letters) and
# levels (any two digits), not just "HH10" — per the brief's instruction not
# to over-fit to the one fixture.
#
#   VC2                 fixed curriculum-version prefix
#   [A-Z]{2}             learning-area code, e.g. HH
#   \d{2}                level, e.g. 10
#   (?P<letter>[A-Z])    strand letter, e.g. K or S
#   \d{2}                sequence number within the strand
_VIC_F10_V2_CODE_PATTERN = re.compile(
    r"(?P<code>VC2[A-Z]{2}\d{2}(?P<letter>[A-Z])\d{2})$"
)

VIC_F10_V2 = {
    "id": "vic-f10-v2",
    "code_pattern": _VIC_F10_V2_CODE_PATTERN,
    "strand_map": {
        "K": ("Knowledge", "knowledge"),
        "S": ("Skills", "skill"),
    },
    "labels": {
        "strand": "Strand",
        "outcome": "Content Description",
        "task": "Task",
    },
}

# ============================================================================
# generic — no codes at all
# ============================================================================
# Fallback profile for a curriculum with no recognisable code token. Every
# non-blank line becomes an outcome, always low-confidence (there is no
# unambiguous signal to rest a "high" call on) and unassigned to any strand
# domain (strand_map is empty, so the letter lookup always misses).
GENERIC = {
    "id": "generic",
    "code_pattern": None,
    "strand_map": {},
    "labels": {
        "strand": "Strand",
        "outcome": "Outcome",
        "task": "Task",
    },
}

# Registry of shipped profiles, keyed by id (matches the --profile CLI flag).
PROFILES: dict[str, dict] = {
    VIC_F10_V2["id"]: VIC_F10_V2,
    GENERIC["id"]: GENERIC,
}


def get_profile(profile_id: str) -> dict:
    """Look up a shipped profile by id. Raises KeyError if unknown (PY-6 callers
    should catch this and exit non-zero rather than guessing a default)."""
    if profile_id not in PROFILES:
        known = ", ".join(sorted(PROFILES))
        raise KeyError(f"Unknown profile '{profile_id}'. Known profiles: {known}")
    return PROFILES[profile_id]
