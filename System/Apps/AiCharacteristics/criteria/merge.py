"""Merge a Scrape's proposed criteria into the saved list.

criteria.json contract (written by the Scrape pipeline; read by the page and the judge):
    {"scraped_at": "<ISO 8601>", "article_title": "<page title>", "article_revision": "<id>", "criteria": [...]}

Criterion:
    id           permanent "c-NNN" — never reused, never changed
    title, description, question, source
                 taken from the article; replaced by a Scrape unless the criterion is locked.
                 `question` is the yes/no question the judge is asked.
    plain        the Simple English explainer text, filled in by the explainer step
    status       what the latest Scrape did to it: new | changed | kept | retired
    locked       true = Luke's own edit; a Scrape neither rewrites nor retires it

Pure functions: no files, no network (PY-3). Retired criteria are kept so ids stay stable.
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from typing import Any

Criterion = dict[str, Any]

CONTENT_FIELDS = ("title", "description", "question", "source")
REQUIRED_PROPOSED = ("title", "description", "question")
REQUIRED_EXISTING = ("id", "status", "locked") + CONTENT_FIELDS
TITLE_MATCH_THRESHOLD = 0.85

_ID_PATTERN = re.compile(r"^c-(\d+)$")


class MergeError(ValueError):
    """The proposed or saved criteria cannot be merged; the saved list must be left as it is."""


@dataclass(frozen=True)
class MergeResult:
    criteria: list[Criterion]
    new: list[str]
    changed: list[str]
    retired: list[str]


def merge_criteria(existing: list[Criterion], proposed: list[Criterion]) -> MergeResult:
    items = _validated_proposed(proposed)
    merged = [dict(criterion) for criterion in _validated_existing(existing)]
    claimed: set[str] = set()
    additions: list[Criterion] = []
    new_ids: list[str] = []
    changed_ids: list[str] = []
    next_number = _next_number(merged)

    for item in items:
        match = _find_match(item, merged, claimed)
        if match is None:
            addition = _new_criterion(item, next_number)
            next_number += 1
            additions.append(addition)
            claimed.add(addition["id"])
            new_ids.append(addition["id"])
            continue
        claimed.add(match["id"])
        if match["locked"]:
            match["status"] = "kept"
        elif _content(match) != _content(item) or match["status"] == "retired":
            match.update(_content(item))
            match["status"] = "changed"
            changed_ids.append(match["id"])
        else:
            match["status"] = "kept"

    retired_ids: list[str] = []
    for criterion in merged:
        if criterion["id"] in claimed:
            continue
        if criterion["locked"]:
            criterion["status"] = "kept"
        elif criterion["status"] != "retired":
            criterion["status"] = "retired"
            retired_ids.append(criterion["id"])

    return MergeResult(merged + additions, new_ids, changed_ids, retired_ids)


def _validated_proposed(proposed: list[Criterion]) -> list[Criterion]:
    if not proposed:
        raise MergeError("the Scrape proposed no criteria; an empty list would retire everything")
    items = []
    for position, raw in enumerate(proposed):
        if not isinstance(raw, dict):
            raise MergeError(f"proposed criterion {position} is not an object")
        for field in REQUIRED_PROPOSED:
            if not isinstance(raw.get(field), str) or not raw[field].strip():
                raise MergeError(f"proposed criterion {position} has no {field}")
        item = {field: raw.get(field, "").strip() for field in CONTENT_FIELDS}
        if isinstance(raw.get("id"), str):
            item["id"] = raw["id"]
        items.append(item)
    return items


def _validated_existing(existing: list[Criterion]) -> list[Criterion]:
    for position, criterion in enumerate(existing):
        missing = [field for field in REQUIRED_EXISTING if field not in criterion]
        if missing:
            raise MergeError(f"saved criterion {position} is missing {', '.join(missing)}")
    return existing


def _content(criterion: Criterion) -> dict[str, str]:
    return {field: criterion[field] for field in CONTENT_FIELDS}


def _normalised(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def _find_match(item: Criterion, merged: list[Criterion], claimed: set[str]) -> Criterion | None:
    open_criteria = [criterion for criterion in merged if criterion["id"] not in claimed]
    for criterion in open_criteria:
        if criterion["id"] == item.get("id"):
            return criterion
    title = _normalised(item["title"])
    for criterion in open_criteria:
        if _normalised(criterion["title"]) == title:
            return criterion
    best, best_ratio = None, TITLE_MATCH_THRESHOLD
    for criterion in open_criteria:
        ratio = difflib.SequenceMatcher(None, title, _normalised(criterion["title"])).ratio()
        if ratio >= best_ratio:
            best, best_ratio = criterion, ratio
    return best


def _next_number(criteria: list[Criterion]) -> int:
    numbers = [int(found.group(1)) for criterion in criteria if (found := _ID_PATTERN.match(criterion["id"]))]
    return max(numbers, default=0) + 1


def _new_criterion(item: Criterion, number: int) -> Criterion:
    return {"id": f"c-{number:03d}", **_content(item), "plain": "", "status": "new", "locked": False}
