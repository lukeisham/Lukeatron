#!/usr/bin/env python3
"""Shared text-shaping helpers for MiniWiki's content extractors
(extract_articles.py's outline dialect, extract_catalogue.py's
labelled-field dialect). Factored out per SR-4 ("share, don't
copy-paste") once a second extractor needed the same three
primitives — HTML escaping, emphasis stripping, first-sentence
extraction — that extract_articles.py already implemented.

Stdlib only (PY-1/SR-2). Import is free (PY-3): no I/O at module load.
"""
from __future__ import annotations

import re

EMPHASIS_RE = re.compile(r"[*_]{1,3}(.+?)[*_]{1,3}")


def strip_emphasis(text: str) -> str:
    """Remove `**bold**` / `*italic*` markers, keeping their inner text."""
    return EMPHASIS_RE.sub(r"\1", text).strip()


def escape_html(text: str) -> str:
    """Escape the five characters that matter inside a text node or
    quoted attribute (HTML-6). Order matters: `&` first."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def first_sentence(text: str) -> str:
    """First sentence of `text` (post-emphasis-stripping), capped at 240
    characters when no sentence boundary is found early enough."""
    stripped = strip_emphasis(text).strip()
    if not stripped:
        return ""
    match = re.search(r"^(.{1,240}?[.!?])(\s|$)", stripped)
    if match:
        return match.group(1)
    return stripped[:240]
