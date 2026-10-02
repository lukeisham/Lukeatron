"""The saved criteria: what criteria.json looks like, and how it is read and written.

criteria.json contract (written by the Scrape skill; read by the page and the judge):
    {"scraped_at": "<ISO 8601>", "article_title": "<page title>", "article_revision": "<id>", "criteria": [...]}

Criterion:
    id           permanent "c-NNN" — never reused, never changed
    title, description, question, source
                 taken from the article; replaced by a Scrape unless the criterion is locked.
                 `question` is the yes/no question the judge is asked.
    plain        the Simple English explainer text, filled in by the Scrape
    status       what the latest Scrape did to it: new | changed | kept | retired
    locked       true = Luke's own edit; a Scrape neither rewrites nor retires it

Retired criteria are kept so ids stay stable. `save` writes criteria.json last and atomically, after the
previous copy and the article snapshot, so a half-finished run can never leave a list that does not match its source.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

CRITERIA_FILE = "criteria.json"
PREVIOUS_FILE = "criteria.previous.json"
SNAPSHOT_FILE = Path("source") / "article.txt"


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


def save(data_dir: Path, document: dict, article_text: str) -> None:
    path = data_dir / CRITERIA_FILE
    try:
        if path.exists():
            _write_atomic(data_dir / PREVIOUS_FILE, path.read_text(encoding="utf-8"))
        _write_atomic(data_dir / SNAPSHOT_FILE, article_text + "\n")
        _write_atomic(path, json.dumps(document, indent=2, ensure_ascii=False) + "\n")
    except OSError as error:
        raise StoreError(f"could not write the results: {error.strerror or error}") from error


def _write_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    with open(temp, "w", encoding="utf-8") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    temp.replace(path)
