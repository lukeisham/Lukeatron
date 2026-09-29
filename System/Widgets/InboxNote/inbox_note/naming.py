"""A note's filename stem: `YYYY-MM-DD-HHMM-<slug>`, the slug drawn from the note's first words."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime

SLUG_WORDS = 5
SLUG_MAX = 40
FALLBACK_SLUG = "note"

MARKDOWN_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
BARE_URL = re.compile(r"https?://\S+")
WORD = re.compile(r"[a-z0-9]+")


def slug(text: str) -> str:
    plain = BARE_URL.sub(" ", MARKDOWN_LINK.sub(r"\1", text))
    ascii_text = "".join(c for c in unicodedata.normalize("NFKD", plain) if not unicodedata.combining(c))
    words = WORD.findall(ascii_text.lower())[:SLUG_WORDS]
    if not words:
        return FALLBACK_SLUG
    joined = words[0][:SLUG_MAX]
    for word in words[1:]:
        if len(joined) + 1 + len(word) > SLUG_MAX:
            break
        joined = f"{joined}-{word}"
    return joined


def note_stem(text: str, now: datetime) -> str:
    return f"{now:%Y-%m-%d-%H%M}-{slug(text)}"
