"""Popularity research pass (seed/classification-criteria.md, "Popularity — web frequency"). Fetches the
approved reference sources, counts for every device in seed/devices.json how many distinct sources
mention its name or any alias (the four scraped lists are already counted in `lists_naming`), and
writes seed/popularity.json. It changes nothing else: no database write, no edit to devices.json.
This is the stage's only network use (seed FR-8). Re-runnable.

Run: python3 -m seed.popularity_pass            (from System/Apps/Rhetoric/)
"""

from __future__ import annotations

import html
import json
import math
import re
import urllib.request
from html.parser import HTMLParser

from seed.db import APP_DIR

DEVICES_PATH = APP_DIR / "seed" / "devices.json"
OUT_PATH = APP_DIR / "seed" / "popularity.json"
FALLACY_CATEGORIES = {"Fallacy", "Fallacy Flipside"}
AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"

# (key, label, [urls — text of all is merged into one source], fallacy_only)
SOURCES = [
    ("silva", "Silva Rhetoricae (BYU)", ["https://rhetoric.byu.edu/Figures/flowers.htm"], False),
    ("wikipedia", "Wikipedia (glossary + rhetorical device; candidate-finding only)",
     ["https://en.wikipedia.org/wiki/Glossary_of_rhetorical_terms",
      "https://en.wikipedia.org/wiki/Rhetorical_device"], False),
    ("owl", "Purdue OWL (rhetorical strategies, literary terms)",
     ["https://owl.purdue.edu/owl/general_writing/academic_writing/establishing_arguments/rhetorical_strategies.html",
      "https://owl.purdue.edu/owl/subject_specific_writing/writing_in_literature/literary_terms/index.html"], False),
    ("sep", "Stanford Encyclopedia of Philosophy (Aristotle's Rhetoric, Fallacies)",
     ["https://plato.stanford.edu/entries/aristotle-rhetoric/", "https://plato.stanford.edu/entries/fallacies/"], False),
    ("uky", "Univ. of Kentucky, Glossary of Rhetorical Terms (classroom substitute)",
     ["https://mcl.as.uky.edu/cla-glossary-rhetorical-terms"], False),
    ("lfo", "LogicalFallacies.org (substitute for Your Logical Fallacies)", ["https://www.logicalfallacies.org/"], True),
    ("iep", "Internet Encyclopedia of Philosophy, Fallacies", ["https://iep.utm.edu/fallacy/"], True),
    ("owl_fallacies", "Purdue OWL, Logical Fallacies",
     ["https://owl.purdue.edu/owl/general_writing/academic_writing/logic_in_argumentative_writing/fallacies.html"], True),
]
UNREACHABLE = {  # approved sources the pass could not read, with the reason
    "Encyclopaedia Britannica": "HTTP 403 to automated requests",
    "The Norton Field Guide index": "no index page found",
    "Read Write Think (NCTE)": "site retired (404)",
    "AP Language list (College Board / Fiveable)": "page not found (404)",
    "ThoughtCo glossary": "HTTP 402 paywall",
    "Your Logical Fallacies": "site did not respond",
}


class _Text(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        self.skip += tag in ("script", "style")

    def handle_endtag(self, tag):
        self.skip -= tag in ("script", "style") and self.skip > 0

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=40) as response:
        raw = response.read().decode("utf-8", errors="replace")
    parser = _Text()
    parser.feed(raw)
    return html.unescape(" ".join(parser.parts)).lower()


def pattern(name: str) -> re.Pattern:
    """Whole-word match of a name; spaces/hyphens interchangeable, optional plural."""
    words = re.split(r"[\s\-–—]+", re.sub(r"\(.*?\)", "", name).strip().lower())
    body = r"[\s\-–—]+".join(re.escape(w) for w in words if w)
    return re.compile(rf"(?<![a-z0-9]){body}(?:s|es)?(?![a-z0-9])")


def main() -> None:
    devices = json.loads(DEVICES_PATH.read_text())
    texts, failed = {}, {}
    for key, label, urls, _ in SOURCES:
        try:
            texts[key] = " ".join(fetch_text(u) for u in urls)
            print(f"[pop] {label}: {len(texts[key]):,} chars")
        except Exception as error:  # a dead source is reported, never guessed at
            failed[label] = str(error)
            print(f"[pop] FAILED {label}: {error}")
    patterns = {d["name"]: [pattern(n) for n in [d["name"], *d["aliases"]]] for d in devices}
    rows = []
    for d in devices:
        fallacy = d["category"] in FALLACY_CATEGORIES or (isinstance(d["category"], list) and FALLACY_CATEGORIES & set(d["category"]))
        hits = [key for key, _, _, fal_only in SOURCES if key in texts and (fallacy or not fal_only)
                and any(p.search(texts[key]) for p in patterns[d["name"]])]
        rows.append({"name": d["name"], "scraped_lists": d["lists_naming"], "web_sources": hits,
                     "count": d["lists_naming"] + len(hits)})
    top = max(r["count"] for r in rows)
    for r in rows:
        r["popularity"] = round(100 * math.log(1 + r["count"]) / math.log(1 + top))
    OUT_PATH.write_text(json.dumps({"sources": {k: l for k, l, _, _ in SOURCES if k in texts},
                                    "failed": failed, "unreachable_approved": UNREACHABLE,
                                    "max_count": top, "devices": rows}, indent=1, ensure_ascii=False) + "\n")
    print(f"[pop] wrote {OUT_PATH.name}: {len(rows)} devices, max count {top}")


if __name__ == "__main__":
    main()
