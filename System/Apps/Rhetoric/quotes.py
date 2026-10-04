"""Real quotes: tells a real quote from a constructed example, and shapes the quotes the Index group lists.

A real quote is an example that has a credit (attribution other than 'Unattributed') OR whose closing
parenthesis cites a work: an italic title, a date or locator (any digit) or 'trans.'. The second test
catches real quotes with anonymous authors (the Rhetorica ad Herennium). A constructed example's
parenthesis only explains it ("(hang: cooperate / execute)") and carries none of these.

Every real quote reads `"words" (credit)`: the quote, then one closing parenthesis naming who said it
and where. items.py sends each quote as {id, device_id, text, source, author, date}; the Index group
sorts and groups them in the browser. Read-only; seed/quote_status.py reuses the classification."""

from __future__ import annotations

import re
import sqlite3
from typing import Any

CITES_A_WORK = re.compile(r"\*[^*]+\*|\d|trans\.")


def closing_parenthesis(body: str) -> str:
    """The text inside the last top-level parenthesis if the example ends with one, else ''."""
    text = body.rstrip()
    if not text.endswith(")"):
        return ""
    depth = 0
    for i in range(len(text) - 1, -1, -1):
        if text[i] == ")":
            depth += 1
        elif text[i] == "(":
            depth -= 1
            if depth == 0:
                return text[i + 1:-1]
    return ""


def is_real_quote(attribution: str, body: str) -> bool:
    return attribution != "Unattributed" or bool(CITES_A_WORK.search(closing_parenthesis(body)))


def split_quote(body: str) -> tuple[str, str]:
    """(the quoted words, the source line): the body without its closing parenthesis, and that parenthesis's text."""
    source = closing_parenthesis(body)
    if not source:
        return body.strip(), ""
    text = body.rstrip()
    return text[: len(text) - len(source) - 2].strip(), source


def quotes(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Every real quote, in the order the examples were added. `author` is None for an
    unattributed quote; `date` is 'YYYY', 'YYYY-MM-DD' or None."""
    out = []
    for example_id, device_id, body, attribution, quote_date in conn.execute(
        "SELECT id, device_id, body, attribution, quote_date FROM examples ORDER BY id"
    ):
        if not is_real_quote(attribution, body):
            continue
        text, source = split_quote(body)
        out.append({
            "id": example_id, "device_id": device_id, "text": text, "source": source,
            "author": None if attribution == "Unattributed" else attribution, "date": quote_date,
        })
    return out
