"""A plain Simple English check on one explainer text: short sentences, few long words.

The limits are Simple English norms, not measured from the old explainer — that one averaged 20-29
words a sentence, which is exactly what this check exists to refuse.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

MAX_AVERAGE_SENTENCE_WORDS = 15
MAX_SENTENCE_WORDS = 25
MAX_LONG_WORD_SHARE = 0.10
LONG_WORD_LETTERS = 9

_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
_WORD = re.compile(r"[A-Za-z][A-Za-z'-]*")


@dataclass(frozen=True)
class Readability:
    average_sentence_words: float
    longest_sentence_words: int
    long_word_share: float


def measure(text: str) -> Readability:
    sentences = [s for s in _SENTENCE_END.split(text.strip()) if _WORD.search(s)]
    counts = [len(_WORD.findall(s)) for s in sentences]
    words = _WORD.findall(text)
    if not counts:
        return Readability(0.0, 0, 0.0)
    long_words = sum(len(w) >= LONG_WORD_LETTERS for w in words)
    return Readability(sum(counts) / len(counts), max(counts), long_words / len(words))


def problems(text: str) -> list[str]:
    """Why the text is not simple enough, in words a rewrite prompt can use; empty means it passes."""
    if not text.strip():
        return ["the text is empty"]
    found = measure(text)
    reasons = []
    if found.average_sentence_words > MAX_AVERAGE_SENTENCE_WORDS:
        reasons.append(f"sentences average {found.average_sentence_words:.0f} words; keep the average under "
                       f"{MAX_AVERAGE_SENTENCE_WORDS}")
    if found.longest_sentence_words > MAX_SENTENCE_WORDS:
        reasons.append(f"one sentence has {found.longest_sentence_words} words; keep every sentence under "
                       f"{MAX_SENTENCE_WORDS}")
    if found.long_word_share > MAX_LONG_WORD_SHARE:
        reasons.append(f"{found.long_word_share:.0%} of the words are long; use shorter, everyday words")
    return reasons


def is_simple(text: str) -> bool:
    return not problems(text)
