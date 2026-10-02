"""The Scrape: fetch the article, extract criteria, merge, explain what is new, write criteria.json.

Every failure leaves the saved files exactly as they were. criteria.json is written last and
atomically, after the previous copy and the article snapshot, so a half-finished run can never show
Luke a list that does not match its source.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from criteria.article import ArticleError, fetch_article
from criteria.explain import ExplainError, write_plain
from criteria.extract import ExtractError, extract_criteria
from criteria.merge import MergeError, merge_criteria
from criteria.transport import Send, send_request

CRITERIA_FILE = "criteria.json"
PREVIOUS_FILE = "criteria.previous.json"
SNAPSHOT_FILE = Path("source") / "article.txt"


class ScrapeFailed(RuntimeError):
    """The Scrape stopped and changed nothing; the message is safe to show Luke."""


@dataclass(frozen=True)
class ScrapeSummary:
    article_revision: str
    total: int
    new: list[str]
    changed: list[str]
    retired: list[str]
    explainer_flags: list[str]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def run_scrape(data_dir: Path, key: str, send: Send = send_request,
               clock: Callable[[], datetime] = _utc_now) -> ScrapeSummary:
    if not key.strip():
        raise ScrapeFailed("no Haiku key is set up")
    existing = load_criteria(data_dir)
    try:
        article = fetch_article(send)
        proposed = extract_criteria(article, existing, key, send)
        merged = merge_criteria(existing, proposed)
        needing = [c for c in merged.criteria
                   if c["status"] != "retired" and (c["status"] in ("new", "changed") or not c["plain"])]
        explained = write_plain(needing, key, send)
    except (ArticleError, ExtractError, MergeError, ExplainError) as error:
        raise ScrapeFailed(str(error)) from error

    criteria = [{**c, "plain": explained.texts.get(c["id"]) or c["plain"]} for c in merged.criteria]
    document = {"scraped_at": clock().isoformat(timespec="seconds"), "article_title": article.title,
                "article_revision": article.revision, "criteria": criteria}
    _save(data_dir, document, article.text)
    return ScrapeSummary(article.revision, len(criteria), merged.new, merged.changed, merged.retired,
                         explained.flagged)


def load_criteria(data_dir: Path) -> list[dict]:
    path = data_dir / CRITERIA_FILE
    if not path.exists():
        return []
    try:
        criteria = json.loads(path.read_text(encoding="utf-8"))["criteria"]
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        raise ScrapeFailed(f"the saved {CRITERIA_FILE} cannot be read, so it was left alone") from error
    if not isinstance(criteria, list):
        raise ScrapeFailed(f"the saved {CRITERIA_FILE} has no criteria list, so it was left alone")
    return criteria


def _save(data_dir: Path, document: dict, article_text: str) -> None:
    path = data_dir / CRITERIA_FILE
    try:
        if path.exists():
            _write_atomic(data_dir / PREVIOUS_FILE, path.read_text(encoding="utf-8"))
        _write_atomic(data_dir / SNAPSHOT_FILE, article_text + "\n")
        _write_atomic(path, json.dumps(document, indent=2, ensure_ascii=False) + "\n")
    except OSError as error:
        raise ScrapeFailed(f"could not write the results: {error.strerror or error}") from error


def _write_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    with open(temp, "w", encoding="utf-8") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    temp.replace(path)
