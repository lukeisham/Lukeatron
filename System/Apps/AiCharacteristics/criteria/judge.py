"""The Check's rules in code: the text limits, and a strict validator for what the Check skill replies.

The Check itself is the Skillbank skill `!CheckAiCharacteristics`, run headless by Home. Its reply is untrusted
until it passes here: yes/no and a confidence per live criterion, nothing else. Anything else fails closed — a
half-trusted verdict is worse than none. The pasted text is never logged or stored here.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

MAX_WORDS = 700
MAX_CHARACTERS = 8000


class JudgeError(RuntimeError):
    """The check could not be completed; nothing partial is returned."""


class TextRejected(JudgeError):
    """The pasted text cannot be checked; `reason` is "empty" or "too_long"."""

    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason


class NoCriteria(JudgeError):
    """There is nothing to check against yet; a Scrape has to run first."""


class VerdictError(ValueError):
    """The judge's reply did not have the required shape."""


@dataclass(frozen=True)
class Verdict:
    id: str
    answer: str
    confidence: float


def parse_verdicts(reply: str, criteria: list[dict]) -> list[Verdict]:
    """Turn the Check skill's reply into verdicts, or fail closed. `reply` is the skill's raw output."""
    live_ids = [c["id"] for c in criteria if c.get("status") != "retired"]
    if not live_ids:
        raise NoCriteria("there are no criteria to check against; run a Scrape first")
    try:
        parsed = json.loads(reply.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip())
    except ValueError as error:
        raise JudgeError("the check did not give a usable answer: the reply is not JSON") from error
    if isinstance(parsed, dict) and parsed.get("error") == "no_criteria":
        raise NoCriteria("there are no criteria to check against; run a Scrape first")
    try:
        return validate_verdicts(parsed, live_ids)
    except VerdictError as error:
        raise JudgeError(f"the check did not give a usable answer: {error}") from error


def validate_verdicts(reply: Any, expected_ids: list[str]) -> list[Verdict]:
    if not isinstance(reply, list):
        raise VerdictError("the reply is not a list")
    found: dict[str, Verdict] = {}
    for position, item in enumerate(reply):
        verdict = _verdict(item, position)
        if verdict.id not in expected_ids:
            raise VerdictError(f"item {position} answers an unknown id {verdict.id!r}")
        if verdict.id in found:
            raise VerdictError(f"id {verdict.id!r} is answered twice")
        found[verdict.id] = verdict
    missing = [id_ for id_ in expected_ids if id_ not in found]
    if missing:
        raise VerdictError(f"no answer for {', '.join(missing)}")
    return [found[id_] for id_ in expected_ids]


def _verdict(item: Any, position: int) -> Verdict:
    if not isinstance(item, dict) or not isinstance(item.get("id"), str):
        raise VerdictError(f"item {position} has no id")
    answer = item.get("answer")
    if not isinstance(answer, str) or answer.strip().lower() not in ("yes", "no"):
        raise VerdictError(f"item {position} answer is not yes or no")
    confidence = item.get("confidence")
    if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        raise VerdictError(f"item {position} confidence is not a number from 0 to 1")
    return Verdict(item["id"], answer.strip().lower(), float(confidence))


def require_checkable(text: str) -> None:
    if not text.strip():
        raise TextRejected("empty", "there is no text to check")
    if len(text.split()) > MAX_WORDS or len(text) > MAX_CHARACTERS:
        raise TextRejected("too_long", f"the text is over the limit of {MAX_WORDS} words")
