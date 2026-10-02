"""The Scrape: fetch the article, extract criteria, merge, explain what is new, save criteria.json.

Every failure leaves the saved files exactly as they were (see `criteria.store.save`).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from aichar_scrape.article import ArticleError, fetch_article
from aichar_scrape.explain import ExplainError, write_plain
from aichar_scrape.extract import ExtractError, extract_criteria
from aichar_scrape.merge import MergeError, merge_criteria
from criteria import store
from criteria.llm import DEEPSEEK, Provider
from criteria.transport import Send, send_request


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


def run_scrape(data_dir: Path, key: str, send: Send = send_request, clock: Callable[[], datetime] = _utc_now,
               provider: Provider = DEEPSEEK) -> ScrapeSummary:
    if not key.strip():
        raise ScrapeFailed(f"no {provider.label} key is set up")
    try:
        existing = store.load_criteria(data_dir)
        article = fetch_article(send)
        proposed = extract_criteria(article, existing, key, send, provider)
        merged = merge_criteria(existing, proposed)
        needing = [c for c in merged.criteria
                   if c["status"] != "retired" and (c["status"] in ("new", "changed") or not c["plain"])]
        explained = write_plain(needing, key, send, provider)
    except (store.StoreError, ArticleError, ExtractError, MergeError, ExplainError) as error:
        raise ScrapeFailed(str(error)) from error

    criteria = [{**c, "plain": explained.texts.get(c["id"]) or c["plain"]} for c in merged.criteria]
    document = {"scraped_at": clock().isoformat(timespec="seconds"), "article_title": article.title,
                "article_revision": article.revision, "criteria": criteria}
    try:
        store.save(data_dir, document, article.text)
    except store.StoreError as error:
        raise ScrapeFailed(str(error)) from error
    return ScrapeSummary(article.revision, len(criteria), merged.new, merged.changed, merged.retired,
                         explained.flagged)
