# Search — Refactoring Guide

How this asset is put together and where to change it. Read this before
extending. The whole app is two files plus a launcher; the spec-driven history
lives in `_Builds/`.

```
System/Tools/Search/
├── serve.py              # backend: HTTP server + the THREE phase functions
├── index.html            # frontend: one page, three phase panels
├── Start Search.command  # one-click launcher → python3 serve.py
├── REFACTORING_GUIDE.md  # this file
├── README.md             # quick start
└── _Builds/ _Spikes/ _Refactors/ _Changes/   # !TechSpecFullProject spec history
```

## The one idea to hold onto

**Path of least resistance, then escalating precision.** Three phases, each more
expensive and more precise than the last:

| Phase | Function | Input → Output | Cost | Precision |
|---|---|---|---|---|
| 1 | `scrape_social_media(term, meter)` | term → **pool** | cheap (search endpoints only, no page fetches) | low |
| 2 | `targeted_search(term, pool, meter)` | pool → **shortlist** | expensive (fetches top-N pages, deep-scores) | medium |
| 3 | `confirm_match(term, shortlist, meter)` | shortlist → **results** | medium (re-fetches, exact-phrase check) | high |

These three functions are the **refactor seams**. Each is pure-ish: `(term,
data, meter) → (list, notes)`. Swap the body of any one without touching the
others or the frontend, as long as the return shape holds.

## The API contract (change serve.py and index.html together)

Stateless server. The browser holds `pool` and `shortlist` between phases and
passes them back — that is what makes **pause** (don't click) and **repeat**
(click again) free, with no server-side session.

| Endpoint | Request JSON | Response JSON |
|---|---|---|
| `POST /api/phase1` | `{term}` | `{pool:[item], notes:[str], cost:{}}` |
| `POST /api/phase2` | `{term, pool:[item]}` | `{shortlist:[item], notes:[str], cost:{}}` |
| `POST /api/phase3` | `{term, shortlist:[item]}` | `{results:[item], notes:[str], cost:{}}` |

`item` = `{title, url, source, snippet, score?, confirmed?, excerpt?}`.
`cost` = `{seconds, http_requests, bytes_fetched, est_tokens}`.

If you change `item` or `cost` keys, update the renderer in `index.html`
(`renderList`, `costText`) in the same change.

## Common changes

### Add a social/news source (Phase 1)
Edit `scrape_social_media`. Add one block that fetches a **key-free** search
surface and appends `{title, url, source, snippet}` dicts to `pool`. Wrap it in
`try/except` and push a human note to `notes` on failure — never let one dead
source break the phase. De-dupe by URL is already handled at the end.
> Sources needing OAuth/API keys (X, Instagram, TikTok) are deliberately **out
> of v1**. They need a credentials story first — that's a new `_Builds/` subtask,
> not a drop-in here.

### Tune precision / cost
Constants at the top of `serve.py`:
- `POOL_PER_SOURCE` — how wide Phase 1 casts.
- `FETCH_TOP_N` — how many candidates Phase 2 actually fetches (the main cost knob).
- `SHORTLIST_MIN_SCORE` — the bar to reach the shortlist.
- `FETCH_TIMEOUT`, `FETCH_WORKERS`, `MAX_PAGE_BYTES` — per-fetch time/size limits.

Every cap that trims work is reported in `notes` — keep that honesty if you add
new caps (no silent truncation).

### Change how matching works
`relevance(term, text)` (0..1, used by Phase 2) and `phrase_present(term, text)`
(bool, used by Phase 3) are the scoring core. To go semantic, replace their
bodies with an embedding/LLM call — but that turns "est_tokens" from a proxy
into a real number, so update `CostMeter` accordingly. This is a **Refactor**
(behaviour-changing quality of results) → record it under `_Refactors/`.

### Add a live cancel / true pause-mid-phase
v1 pauses *between* phases. For mid-phase cancel you'd need server-side run IDs
and a cancel endpoint the fetch loop polls — a bigger change; spec it as a new
subtask before coding.

### Change the port
`PORT` at the top of `serve.py` (default `8789`; `8787` wiki-viewer and `8788`
dashboard are taken). Update the number in `README.md` if you do.

## Guardrails to preserve

1. **Zero dependencies.** Stdlib only, so one-click launch stays true. Don't
   `import requests`/`bs4`; `urllib` + `xml.etree` + `json` already cover it.
2. **A phase never crashes.** `do_POST` catches everything and returns the error
   with a cost summary; each source is independently `try/except`'d. Keep that.
3. **Cost is always reported.** Every phase runs inside a `CostMeter`. A new code
   path that fetches must call `meter.record(nbytes)` (via `_fetch`, which does).
4. **Read-only to the wider system.** This tool touches nothing in `Memory/`; it
   only reads the public web and serves its own two files. Keep it self-contained.
