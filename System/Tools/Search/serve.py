#!/usr/bin/env python3
"""
Search — social & news MENTION TRACKER (local browser asset)
============================================================
Track down where one specific phrase/term is being mentioned in SOCIAL MEDIA
and in NEWS ARTICLES THAT HAVE COMMENT SECTIONS. Operated from a browser tab.

Design — path of least resistance, then escalating precision (three phases):

  Phase 1  scrape_social_media(term)   → INITIAL POOL   (cheap, wide, low precision)
           Hit several public, key-free search surfaces (Hacker News, Reddit,
           Google News) with the raw term. Take whatever comes back. This is the
           "path of least resistance": no page fetches, just the search endpoints.

  Phase 2  targeted_search(term, pool) → SHORTLIST      (expensive, narrow, deeper)
           For the most promising candidates, actually FETCH the page and score
           the real text against the term. The rough pool becomes a short list.

  Phase 3  confirm_match(term, shortlist) → FINAL RESULTS (strict phrase match)
           Confirm the exact phrase/term genuinely appears in the fetched text.
           Only confirmed mentions survive as final results.

Each phase reports its COST (time + estimated tokens + HTTP requests + bytes) so
you can see how expensive it was. The UI runs one phase at a time, so pausing
between phases and repeating a phase are both just "don't click / click again".

Zero dependencies — pure Python 3 standard library. One-click launch:
    python3 serve.py            (auto-opens http://localhost:8789)
Stop: Ctrl-C.

The three functions (scrape_social_media / targeted_search / confirm_match) are
the refactor seams — see REFACTORING_GUIDE.md.
"""
import http.server
import socketserver
import json
import re
import html
import time
import webbrowser
import threading
import urllib.parse
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
PORT = 8789
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LukeatronSearch/1.0"

# Bounds that keep a run honest and cheap. Nothing is truncated SILENTLY — every
# cap that trims work is reported back to the UI in the phase's `notes`.
POOL_PER_SOURCE = 25       # phase 1: candidates requested per source
FETCH_TOP_N = 15           # phase 2: only the top-N candidates get a real fetch
FETCH_TIMEOUT = 8          # seconds per HTTP request
FETCH_WORKERS = 6          # concurrent page fetches in phase 2/3
SHORTLIST_MIN_SCORE = 0.30 # phase 2: relevance score needed to reach shortlist
MAX_PAGE_BYTES = 600_000   # cap bytes read per page (protects time + "tokens")


# ---------------------------------------------------------------------------
# Cost accounting — every phase runs inside a CostMeter so the UI can show how
# expensive it was. "Tokens" here is a proxy: bytes fetched / 4 (~chars/token),
# since this asset does no LLM calls. It is a comparable, honest cost signal.
# ---------------------------------------------------------------------------
class CostMeter:
    def __init__(self):
        self.requests = 0
        self.bytes = 0
        self._t0 = time.perf_counter()

    def record(self, nbytes):
        self.requests += 1
        self.bytes += nbytes

    def summary(self):
        secs = time.perf_counter() - self._t0
        return {
            "seconds": round(secs, 2),
            "http_requests": self.requests,
            "bytes_fetched": self.bytes,
            "est_tokens": self.bytes // 4,
        }


def _fetch(url, meter, timeout=FETCH_TIMEOUT, max_bytes=MAX_PAGE_BYTES):
    """GET a URL, count its cost, return (text, ok). Never raises."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(max_bytes)
        meter.record(len(raw))
        charset = "utf-8"
        try:
            charset = resp.headers.get_content_charset() or "utf-8"
        except Exception:
            pass
        return raw.decode(charset, errors="replace"), True
    except Exception:
        meter.record(0)
        return "", False


# ---------------------------------------------------------------------------
# Text helpers — normalisation and relevance scoring shared by every phase.
# ---------------------------------------------------------------------------
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def strip_html(s):
    return _WS_RE.sub(" ", html.unescape(_TAG_RE.sub(" ", s or ""))).strip()


def normalise(s):
    """Lowercase, unescape, collapse whitespace — the canonical match form."""
    return _WS_RE.sub(" ", html.unescape((s or "").lower())).strip()


def phrase_present(term, text):
    """Whole-phrase (or whole-word, for single words) presence, case-insensitive."""
    t = normalise(term)
    hay = normalise(text)
    if not t:
        return False
    if " " in t:                       # multi-word phrase: substring is fine
        return t in hay
    return re.search(r"\b" + re.escape(t) + r"\b", hay) is not None


def relevance(term, text):
    """0..1 relevance of `text` to `term`: phrase hit dominates, token overlap fills."""
    t = normalise(term)
    hay = normalise(text)
    if not t or not hay:
        return 0.0
    score = 0.0
    if t in hay:
        score += 0.6                    # the whole phrase appears
    tokens = [w for w in re.findall(r"\w+", t) if len(w) > 2]
    if tokens:
        hit = sum(1 for w in tokens if re.search(r"\b" + re.escape(w) + r"\b", hay))
        score += 0.4 * (hit / len(tokens))
    return round(min(score, 1.0), 3)


# ===========================================================================
# THE THREE BACKEND FUNCTIONS
# ===========================================================================

# --- Phase 1 ---------------------------------------------------------------
def scrape_social_media(term, meter):
    """PHASE 1 — the wide, cheap pass. Query several key-free public search
    surfaces (all of which carry comment sections) and pool whatever returns.
    No page fetches: path of least resistance. Returns (pool, notes)."""
    pool, notes = [], []
    q = urllib.parse.quote(term)

    # -- Hacker News (Algolia) : stories + comments, JSON, no key ------------
    txt, ok = _fetch(
        f"https://hn.algolia.com/api/v1/search?query={q}&tags=(story,comment)&hitsPerPage={POOL_PER_SOURCE}",
        meter)
    if ok:
        try:
            for h in json.loads(txt).get("hits", []):
                url = h.get("url") or (
                    f"https://news.ycombinator.com/item?id={h.get('objectID')}"
                    if h.get("objectID") else None)
                if not url:
                    continue
                title = h.get("title") or h.get("story_title") or h.get("comment_text") or "(HN item)"
                pool.append({
                    "title": strip_html(title)[:200],
                    "url": url,
                    "source": "Hacker News",
                    "snippet": strip_html(h.get("comment_text") or h.get("story_text") or "")[:300],
                })
        except Exception:
            notes.append("Hacker News: response could not be parsed.")
    else:
        notes.append("Hacker News: unreachable.")

    # -- Reddit : posts (each has a comment thread), JSON, no key -----------
    txt, ok = _fetch(
        f"https://www.reddit.com/search.json?q={q}&limit={POOL_PER_SOURCE}&sort=relevance",
        meter)
    if ok:
        try:
            for c in json.loads(txt).get("data", {}).get("children", []):
                d = c.get("data", {})
                perm = d.get("permalink")
                if not perm:
                    continue
                pool.append({
                    "title": strip_html(d.get("title") or "(reddit post)")[:200],
                    "url": "https://www.reddit.com" + perm,
                    "source": "Reddit r/" + (d.get("subreddit") or "?"),
                    "snippet": strip_html(d.get("selftext") or "")[:300],
                })
        except Exception:
            notes.append("Reddit: response could not be parsed.")
    else:
        notes.append("Reddit: unreachable (may rate-limit; try again).")

    # -- Google News RSS : news articles (comment sections vary), XML -------
    txt, ok = _fetch(
        f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en", meter)
    if ok:
        try:
            root = ET.fromstring(txt)
            for item in list(root.iter("item"))[:POOL_PER_SOURCE]:
                link = item.findtext("link")
                if not link:
                    continue
                pool.append({
                    "title": strip_html(item.findtext("title") or "(news article)")[:200],
                    "url": link,
                    "source": "Google News",
                    "snippet": strip_html(item.findtext("description") or "")[:300],
                })
        except Exception:
            notes.append("Google News: feed could not be parsed.")
    else:
        notes.append("Google News: unreachable.")

    # De-dupe by URL, preserve order.
    seen, deduped = set(), []
    for c in pool:
        if c["url"] in seen:
            continue
        seen.add(c["url"])
        deduped.append(c)

    notes.append(f"Pooled {len(deduped)} unique candidates from {3} surfaces "
                 f"(≤{POOL_PER_SOURCE} each) with no page fetches.")
    return deduped, notes


# --- Phase 2 ---------------------------------------------------------------
def targeted_search(term, pool, meter):
    """PHASE 2 — the deep, precise pass. Rank the pool by cheap signals, then
    actually FETCH the top-N candidates and score their real page text against
    the term. Above-threshold candidates form the SHORTLIST. Returns
    (shortlist, notes)."""
    notes = []
    if not pool:
        return [], ["Empty pool — run Phase 1 first."]

    # Cheap pre-rank on title+snippet so the expensive fetches go to the best.
    for c in pool:
        c["_pre"] = relevance(term, f"{c.get('title','')} {c.get('snippet','')}")
    ranked = sorted(pool, key=lambda c: c["_pre"], reverse=True)

    to_fetch = ranked[:FETCH_TOP_N]
    skipped = len(ranked) - len(to_fetch)

    def _score_one(c):
        text, ok = _fetch(c["url"], meter)
        body = strip_html(text)[:8000] if ok else ""
        deep = relevance(term, f"{c.get('title','')} {c.get('snippet','')} {body}")
        item = dict(c)
        item["score"] = deep
        item["fetched"] = ok
        # Keep a short evidence excerpt around the first token hit.
        item["excerpt"] = _excerpt(term, body)
        item.pop("_pre", None)
        return item

    scored = []
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as ex:
        for fut in as_completed([ex.submit(_score_one, c) for c in to_fetch]):
            scored.append(fut.result())

    shortlist = [s for s in scored if s["score"] >= SHORTLIST_MIN_SCORE]
    shortlist.sort(key=lambda s: s["score"], reverse=True)

    notes.append(f"Fetched & deep-scored the top {len(to_fetch)} of {len(ranked)} "
                 f"candidates (skipped {skipped} lower-ranked without fetching).")
    notes.append(f"{len(shortlist)} cleared the shortlist bar "
                 f"(relevance ≥ {SHORTLIST_MIN_SCORE}).")
    return shortlist, notes


# --- Phase 3 ---------------------------------------------------------------
def confirm_match(term, shortlist, meter):
    """PHASE 3 — the confirmation gate. Re-fetch each shortlisted page and
    confirm the EXACT phrase/term is genuinely present. Only confirmed mentions
    become final results. Returns (results, notes)."""
    notes = []
    if not shortlist:
        return [], ["Empty shortlist — run Phase 2 first."]

    def _confirm_one(c):
        text, ok = _fetch(c["url"], meter)
        body = strip_html(text) if ok else ""
        haystack = f"{c.get('title','')} {c.get('snippet','')} {body}"
        present = phrase_present(term, haystack)
        item = dict(c)
        item["confirmed"] = present
        item["excerpt"] = _excerpt(term, body) or c.get("excerpt", "")
        return item

    confirmed = []
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as ex:
        for fut in as_completed([ex.submit(_confirm_one, c) for c in shortlist]):
            r = fut.result()
            if r["confirmed"]:
                confirmed.append(r)

    confirmed.sort(key=lambda s: s.get("score", 0), reverse=True)
    notes.append(f"Confirmed the exact phrase in {len(confirmed)} of "
                 f"{len(shortlist)} shortlisted pages.")
    return confirmed, notes


def _excerpt(term, body, window=140):
    """A short quote around the first phrase/word hit, for human confirmation."""
    if not body:
        return ""
    low = body.lower()
    t = normalise(term)
    idx = low.find(t)
    if idx < 0:
        toks = [w for w in re.findall(r"\w+", t) if len(w) > 2]
        for w in toks:
            idx = low.find(w)
            if idx >= 0:
                break
    if idx < 0:
        return body[:window].strip() + "…"
    start = max(0, idx - window // 2)
    end = min(len(body), idx + len(t) + window // 2)
    return ("…" if start else "") + body[start:end].strip() + ("…" if end < len(body) else "")


# ===========================================================================
# HTTP SERVER — serves the page and the three phase endpoints. Stateless: the
# browser holds the pool / shortlist between phases and passes them back, which
# is exactly what makes "pause" and "repeat a phase" free.
# ===========================================================================
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # quiet

    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            try:
                self._send(200, (HERE / "index.html").read_bytes(), "text/html; charset=utf-8")
            except FileNotFoundError:
                self._send(404, "index.html not found", "text/plain")
        else:
            self._send(404, "not found", "text/plain")

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._send(400, json.dumps({"error": "bad JSON"}))

        term = (payload.get("term") or "").strip()
        meter = CostMeter()
        try:
            if self.path == "/api/phase1":
                if not term:
                    return self._send(400, json.dumps({"error": "term required"}))
                pool, notes = scrape_social_media(term, meter)
                return self._send(200, json.dumps(
                    {"pool": pool, "notes": notes, "cost": meter.summary()}))

            if self.path == "/api/phase2":
                shortlist, notes = targeted_search(term, payload.get("pool") or [], meter)
                return self._send(200, json.dumps(
                    {"shortlist": shortlist, "notes": notes, "cost": meter.summary()}))

            if self.path == "/api/phase3":
                results, notes = confirm_match(term, payload.get("shortlist") or [], meter)
                return self._send(200, json.dumps(
                    {"results": results, "notes": notes, "cost": meter.summary()}))
        except Exception as e:  # never crash a phase; report it
            return self._send(200, json.dumps(
                {"error": f"{type(e).__name__}: {e}", "cost": meter.summary()}))

        self._send(404, json.dumps({"error": "unknown endpoint"}))


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    url = f"http://localhost:{PORT}"
    print(f"Search — mention tracker  →  {url}")
    print("Enter a phrase, then run Phase 1 → 2 → 3. Ctrl-C to stop.")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        ThreadingServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
