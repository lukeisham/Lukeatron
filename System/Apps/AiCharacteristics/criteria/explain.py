"""Write the Simple English explainer text for criteria that need one.

Haiku writes it, the readability check judges it, and anything that fails is sent back once with the
reasons. Whatever still fails after that is kept but flagged, so Luke sees it rather than a gap.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from criteria import readability
from criteria.haiku import HaikuError, ask_json
from criteria.transport import Send, send_request

EXPLAIN_MAX_TOKENS = 4000

SYSTEM_PROMPT = """You write short explanations in Simple English for people who are not experts.
You are given a JSON array of criteria, each with an "id", "title" and "description". Reply with a JSON
object only — no prose, no code fence — mapping each id to its explanation.
Rules for every explanation: two to four short sentences; every sentence under 15 words; everyday
words; active voice; if you must use a technical word, explain it in plain words straight away; end
with a tiny example of the sign. Describe the pattern only. Never say a text was written by an AI."""


class ExplainError(RuntimeError):
    """Haiku did not return explanations in the expected shape."""


@dataclass(frozen=True)
class Explanations:
    texts: dict[str, str]
    flagged: list[str]


def write_plain(criteria: list[dict], key: str, send: Send = send_request) -> Explanations:
    if not criteria:
        return Explanations({}, [])
    texts = _ask(criteria, key, send)
    failing = [c for c in criteria if readability.problems(texts.get(c["id"], ""))]
    if failing:
        retry = _ask(failing, key, send, texts)
        texts.update({id_: text for id_, text in retry.items() if text.strip()})
    flagged = [c["id"] for c in criteria if readability.problems(texts.get(c["id"], ""))]
    return Explanations({c["id"]: texts.get(c["id"], "") for c in criteria}, flagged)


def _ask(criteria: list[dict], key: str, send: Send, earlier: dict[str, str] | None = None) -> dict[str, str]:
    items = []
    for criterion in criteria:
        item = {"id": criterion["id"], "title": criterion["title"], "description": criterion["description"]}
        if earlier is not None:
            item["too_hard"] = {"text": earlier.get(criterion["id"], ""),
                                "problems": readability.problems(earlier.get(criterion["id"], ""))}
        items.append(item)
    try:
        reply = ask_json(SYSTEM_PROMPT, json.dumps(items), key, max_tokens=EXPLAIN_MAX_TOKENS, send=send)
    except HaikuError as error:
        raise ExplainError(str(error)) from error
    if not isinstance(reply, dict) or not all(isinstance(v, str) for v in reply.values()):
        raise ExplainError("Haiku did not return one text per criterion")
    return reply
