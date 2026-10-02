"""The saved criteria: what criteria.json looks like, and how it is read and written.

criteria.json contract (written by the Scrape skill; read by the page and the Check):
    {"scraped_at": "<ISO 8601>", "article_title": "<page title>", "article_revision": "<id>", "criteria": [...]}

Criterion:
    id           permanent "c-NNN" — never reused, never changed
    title, description, question, source
                 taken from the article; replaced by a Scrape unless the criterion is locked.
                 `question` is the yes/no question the judge is asked.
    plain        the Simple English explainer text, filled in by the Scrape
    status       what the latest Scrape did to it: new | changed | kept | retired
    locked       true = Luke's own edit; a Scrape neither rewrites nor retires it

Retired criteria are kept so ids stay stable. The skill saves criteria.previous.json and source/article.txt first and
criteria.json last, and puts the previous copy back if its read-back check fails.
"""

from __future__ import annotations

import json
from pathlib import Path

CRITERIA_FILE = "criteria.json"


class StoreError(RuntimeError):
    """The saved criteria cannot be read or written; the message is safe to show Luke."""


def load_criteria(data_dir: Path) -> list[dict]:
    path = data_dir / CRITERIA_FILE
    if not path.exists():
        return []
    try:
        criteria = json.loads(path.read_text(encoding="utf-8"))["criteria"]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        raise StoreError(f"the saved {CRITERIA_FILE} cannot be read, so it was left alone") from error
    if not isinstance(criteria, list):
        raise StoreError(f"the saved {CRITERIA_FILE} has no criteria list, so it was left alone")
    return criteria
