"""Fetch the Wikipedia article as plain text, with its revision id, through Wikipedia's own API.

A plain HTTP read: the article is a static page, so no browser is needed.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass

from criteria.transport import Send, TransportError, send_request

ARTICLE_TITLE = "Wikipedia:Signs of AI writing"
API_URL = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "Lukeatron-AiCharacteristics/1.0 (personal research tool)"


class ArticleError(RuntimeError):
    """The article could not be fetched or did not look like an article."""


@dataclass(frozen=True)
class Article:
    title: str
    revision: str
    text: str


def fetch_article(send: Send = send_request, title: str = ARTICLE_TITLE) -> Article:
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": "2", "redirects": "1",
        "prop": "extracts|revisions", "explaintext": "1", "rvprop": "ids", "titles": title,
    })
    request = urllib.request.Request(f"{API_URL}?{query}", headers={"User-Agent": USER_AGENT})
    try:
        body = send(request)
    except TransportError as error:
        raise ArticleError(f"could not fetch the article: {error}") from error
    return _parse(body, title)


def _parse(body: bytes, requested_title: str) -> Article:
    try:
        pages = json.loads(body)["query"]["pages"]
        page = pages[0]
    except (json.JSONDecodeError, KeyError, IndexError, TypeError) as error:
        raise ArticleError("Wikipedia's reply was not in the expected shape") from error
    if page.get("missing"):
        raise ArticleError(f"Wikipedia has no page called {requested_title!r}")
    text = (page.get("extract") or "").strip()
    revisions = page.get("revisions") or []
    if not text or not revisions:
        raise ArticleError("Wikipedia returned the page with no text or no revision")
    return Article(title=page.get("title", requested_title), revision=str(revisions[0]["revid"]), text=text)
